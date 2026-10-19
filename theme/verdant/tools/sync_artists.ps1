param(
    [string]$Mode = "missing",
    [string]$CacheDir,
    [string]$ArtistListFile,
    [string]$SingleArtist = "",
    [switch]$Stop
)

if (-not $CacheDir) {
    $CacheDir = Join-Path $PSScriptRoot "..\cache\artists"
}

$progressFile = Join-Path $CacheDir "sync_progress.json"
$indexFile = Join-Path $CacheDir "index.json"

if ($Stop) {
    if (Test-Path $progressFile) {
        try {
            $prog = Get-Content $progressFile -Raw | ConvertFrom-Json
            $prog.running = $false
            $prog.status = "Stopped by user"
            $prog | ConvertTo-Json -Compress | Set-Content $progressFile -Encoding UTF8
        } catch {}
    }
    exit 0
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

if (-not (Test-Path $CacheDir)) {
    New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null
}

# Load or initialize artist index
$indexData = @{
    version = 1
    lastUpdated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    artists = @{}
}

if (Test-Path $indexFile) {
    try {
        $loaded = Get-Content $indexFile -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($loaded -and $loaded.artists) {
            foreach ($prop in $loaded.artists.PSObject.Properties) {
                $indexData.artists[$prop.Name] = $prop.Value
            }
        }
    } catch {}
}

# Determine list of artists to process
$artistNames = @()
if ($SingleArtist) {
    $artistNames = @($SingleArtist)
} elseif ($ArtistListFile -and (Test-Path $ArtistListFile)) {
    try {
        $artistNames = Get-Content $ArtistListFile -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {}
}

# Fallback: scan existing disk cache to update index if no list provided
if (-not $artistNames -or $artistNames.Count -eq 0) {
    $metaFiles = Get-ChildItem -Path $CacheDir -Filter "*_meta.json"
    foreach ($mf in $metaFiles) {
        $base = $mf.BaseName -replace '_meta$', ''
        if ($base -and -not $artistNames.Contains($base)) {
            $artistNames += $base
        }
    }
}

$total = $artistNames.Count
$processed = 0
$downloaded = 0
$skipped = 0
$failed = 0

function Update-Progress([string]$currentArtist, [string]$statusText, [bool]$isRunning) {
    $percent = 0
    if ($total -gt 0) {
        $percent = [math]::Round(($processed / $total) * 100, 1)
    }
    $prog = @{
        running = $isRunning
        total = $total
        processed = $processed
        downloaded = $downloaded
        skipped = $skipped
        failed = $failed
        percent = $percent
        currentArtist = $currentArtist
        status = $statusText
        updated = (Get-Date).ToString("HH:mm:ss")
    }
    try {
        $json = $prog | ConvertTo-Json -Compress
        [System.IO.File]::WriteAllText($progressFile, $json, [System.Text.Encoding]::UTF8)
    } catch {}
}

# Global Spotify Anonymous Token Cache
$script:spotifyToken = $null
$script:spotifyTokenExpires = 0

function Get-SpotifyAnonymousToken {
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    if ($script:spotifyToken -and $now -lt ($script:spotifyTokenExpires - 60000)) {
        return $script:spotifyToken
    }
    try {
        $bootstrapUrl = 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC'
        $html = curl.exe -sL -m 6 -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" $bootstrapUrl
        if ($html -match '<script id="__NEXT_DATA__" type="application/json">(.*?)</script>') {
            $data = $Matches[1] | ConvertFrom-Json
            $sess = $data.props.pageProps.state.settings.session
            if ($sess.accessToken) {
                $script:spotifyToken = $sess.accessToken
                $script:spotifyTokenExpires = $sess.accessTokenExpirationTimestampMs
                return $script:spotifyToken
            }
        }
    } catch {}
    return $null
}

function Query-SpotifyArtist([string]$artistName) {
    $token = Get-SpotifyAnonymousToken
    if (-not $token) { return $null }

    try {
        $variables = @{
            searchTerm = $artistName
            offset = 0
            limit = 5
            numberOfTopResults = 3
            includeAudiobooks = $false
            includePreReleases = $false
            includeAlbumPreReleases = $false
            includeAuthors = $false
            includeEpisodeContentRatingsV2 = $false
        } | ConvertTo-Json -Compress

        $extensions = @{
            persistedQuery = @{
                version = 1
                sha256Hash = "eff59fa0a3d026b88b56fddbcf4bdfa16a186b8175a5c1a358c072e053c2e5b0"
            }
        } | ConvertTo-Json -Compress

        $encVars = [System.Uri]::EscapeDataString($variables)
        $encExts = [System.Uri]::EscapeDataString($extensions)
        $searchUrl = "https://api-partner.spotify.com/pathfinder/v1/query?operationName=searchDesktop&variables=$encVars&extensions=$encExts"

        $resp = curl.exe -sL -m 8 -H "Authorization: Bearer $token" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -H "Origin: https://open.spotify.com" -H "Referer: https://open.spotify.com/" $searchUrl
        if (-not $resp -or $resp.Length -lt 100) { return $null }

        $json = $resp | ConvertFrom-Json
        $items = $json.data.searchV2.artists.items
        if (-not $items -or $items.Count -eq 0) { return $null }

        $best = $items[0]
        foreach ($item in $items) {
            if ($item.data.profile.name -eq $artistName) {
                $best = $item
                break
            }
        }

        $artData = $best.data
        $avatarUrl = $null
        if ($artData.visuals -and $artData.visuals.avatarImage -and $artData.visuals.avatarImage.sources) {
            $avatarUrl = $artData.visuals.avatarImage.sources[0].url
        }

        $spotifyId = ""
        if ($artData.uri -match 'spotify:artist:(.+)') {
            $spotifyId = $Matches[1]
        }

        # Query Artist Overview for official monthly listeners & bio
        $monthlyListeners = 0
        $bioText = ""
        if ($spotifyId) {
            try {
                $ovVars = @{
                    uri = "spotify:artist:$spotifyId"
                    locale = ""
                    includePrerelease = $false
                } | ConvertTo-Json -Compress

                $ovExts = @{
                    persistedQuery = @{
                        version = 1
                        sha256Hash = "ae0e2958a4ab645b35ca19ac04d0495ae12d9c5d7b7286217674801a9aab281a"
                    }
                } | ConvertTo-Json -Compress

                $ovUrl = "https://api-partner.spotify.com/pathfinder/v1/query?operationName=queryArtistOverview&variables=$([System.Uri]::EscapeDataString($ovVars))&extensions=$([System.Uri]::EscapeDataString($ovExts))"
                $ovResp = curl.exe -sL -m 6 -H "Authorization: Bearer $token" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -H "Origin: https://open.spotify.com" -H "Referer: https://open.spotify.com/" $ovUrl
                if ($ovResp -and $ovResp.Length -gt 100) {
                    $ovJson = $ovResp | ConvertFrom-Json
                    $union = $ovJson.data.artistUnion
                    if ($union.stats.monthlyListeners) {
                        $monthlyListeners = [int]$union.stats.monthlyListeners
                    }
                    if ($union.profile.biography.text) {
                        $bioText = $union.profile.biography.text
                    }
                }
            } catch {}
        }

        return @{
            name = $artData.profile.name
            uri = $artData.uri
            avatarUrl = $avatarUrl
            monthlyListeners = $monthlyListeners
            bio = $bioText
        }
    } catch {
        return $null
    }
}

Update-Progress "" "Starting sync ($total artists)..." $true

foreach ($art in $artistNames) {
    # Check if stop requested
    if (Test-Path $progressFile) {
        try {
            $check = Get-Content $progressFile -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($check -and $check.running -eq $false -and $processed -gt 0) {
                Write-Host "Sync stopped by request."
                break
            }
        } catch {}
    }

    $safeName = $art -replace '[\\/:*?"<>|]', '_'
    $jpgPath = Join-Path $CacheDir "$safeName.jpg"
    $metaPath = Join-Path $CacheDir "${safeName}_meta.json"

    $hasJpg = Test-Path $jpgPath
    $hasMeta = Test-Path $metaPath

    if ($Mode -eq "missing" -and $hasJpg -and $hasMeta) {
        $skipped++
        $processed++
        # Ensure it is recorded in index
        if (-not $indexData.artists.ContainsKey($art)) {
            try {
                $mContent = Get-Content $metaPath -Raw -Encoding UTF8 | ConvertFrom-Json
                $indexData.artists[$art] = @{
                    status = "cached"
                    hasImage = $true
                    hasMeta = $true
                    fans = $mContent.fans
                    fansFormatted = $mContent.fansFormatted
                    source = $(if ($mContent.imageSource) { $mContent.imageSource } else { "Cached" })
                    timestamp = (Get-Date).ToString("yyyy-MM-dd")
                }
            } catch {}
        }
        Update-Progress $art "Cached: $art" $true
        continue
    }

    Update-Progress $art "Fetching $art..." $true

    $metaObj = @{
        name = $art
        fans = 0
        fansFormatted = ""
        albums = 0
        link = ""
        bio = ""
        desc = ""
    }

    $fetchedImage = $false
    $fetchedMeta = $false

    # 1. Spotify Pathfinder API (Primary Source - High-Res Artist Avatar + Listeners)
    try {
        $spData = Query-SpotifyArtist $art
        if ($spData) {
            $metaObj.name = $spData.name
            if ($spData.monthlyListeners -gt 0) {
                $metaObj.fans = $spData.monthlyListeners
                $metaObj.fansFormatted = "{0:N0}" -f $metaObj.fans
                $fetchedMeta = $true
            }
            if ($spData.bio) {
                $metaObj.bio = $spData.bio
                $fetchedMeta = $true
            }
            if ($spData.avatarUrl) {
                try {
                    curl.exe -sL -m 12 -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" $spData.avatarUrl -o $jpgPath
                    if (Test-Path $jpgPath) {
                        $fetchedImage = $true
                        $metaObj.imageSource = "Spotify"
                    }
                } catch {}
            }
        }
    } catch {}

    # 2. Deezer API (Secondary Fallback)
    if (-not $fetchedImage -or -not $fetchedMeta) {
        try {
            $encoded = [System.Uri]::EscapeDataString($art)
            $dUrl = "https://api.deezer.com/search/artist?q=$encoded"
            $dRes = Invoke-RestMethod -Uri $dUrl -TimeoutSec 6 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0" }
            if ($dRes -and $dRes.data -and $dRes.data.Count -gt 0) {
                $top = $dRes.data[0]
                if (-not $metaObj.name) { $metaObj.name = $top.name }
                if ($metaObj.fans -eq 0 -and $top.nb_fan) {
                    $metaObj.fans = [int]$top.nb_fan
                    $metaObj.fansFormatted = "{0:N0}" -f $metaObj.fans
                }
                $metaObj.albums = [int]$top.nb_album
                $metaObj.link = $top.link
                $fetchedMeta = $true

                if (-not $fetchedImage) {
                    $picUrl = $top.picture_xl
                    if (-not $picUrl) { $picUrl = $top.picture_big }
                    if (-not $picUrl) { $picUrl = $top.picture_medium }

                    if ($picUrl) {
                        Invoke-WebRequest -Uri $picUrl -OutFile $jpgPath -TimeoutSec 10 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0" } | Out-Null
                        if (Test-Path $jpgPath) {
                            $fetchedImage = $true
                            $metaObj.imageSource = "Deezer HD"
                        }
                    }
                }
            }
        } catch {}
    }

    # 2. Wikipedia Summary API
    try {
        $wName = [System.Uri]::EscapeDataString($art)
        $wUrl = "https://en.wikipedia.org/api/rest_v1/page/summary/$wName"
        $wRes = Invoke-RestMethod -Uri $wUrl -TimeoutSec 5 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0" }
        if ($wRes) {
            if ($wRes.extract) { $metaObj.bio = $wRes.extract }
            if ($wRes.description) { $metaObj.desc = $wRes.description }
            $fetchedMeta = $true

            if (-not $fetchedImage -and $wRes.originalimage -and $wRes.originalimage.source) {
                try {
                    Invoke-WebRequest -Uri $wRes.originalimage.source -OutFile $jpgPath -TimeoutSec 10 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0" } | Out-Null
                    $fetchedImage = $true
                    $metaObj.imageSource = "Wikipedia"
                } catch {}
            }
        }
    } catch {
        # Fallback to base artist name
        try {
            $cleanName = ($art -split '[,;&/]| feat\.| ft\.')[0].Trim()
            if ($cleanName -and $cleanName -ne $art) {
                $wClean = [System.Uri]::EscapeDataString($cleanName)
                $wRes2 = Invoke-RestMethod -Uri "https://en.wikipedia.org/api/rest_v1/page/summary/$wClean" -TimeoutSec 5 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0" }
                if ($wRes2) {
                    if ($wRes2.extract) { $metaObj.bio = $wRes2.extract }
                    if ($wRes2.description) { $metaObj.desc = $wRes2.description }
                    $fetchedMeta = $true

                    if (-not $fetchedImage -and $wRes2.originalimage -and $wRes2.originalimage.source) {
                        try {
                            Invoke-WebRequest -Uri $wRes2.originalimage.source -OutFile $jpgPath -TimeoutSec 10 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0" } | Out-Null
                            $fetchedImage = $true
                            $metaObj.imageSource = "Wikipedia"
                        } catch {}
                    }
                }
            }
        } catch {}
    }

    if ($fetchedMeta -or $fetchedImage) {
        try {
            $jsonStr = $metaObj | ConvertTo-Json -Compress
            [System.IO.File]::WriteAllText($metaPath, $jsonStr, [System.Text.Encoding]::UTF8)
        } catch {}

        $indexData.artists[$art] = @{
            status = "cached"
            hasImage = (Test-Path $jpgPath)
            hasMeta = (Test-Path $metaPath)
            fans = $metaObj.fans
            fansFormatted = $metaObj.fansFormatted
            source = $(if ($metaObj.imageSource) { $metaObj.imageSource } else { "Deezer HD" })
            timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
        $downloaded++
    } else {
        $indexData.artists[$art] = @{
            status = "not_found"
            hasImage = $false
            hasMeta = $false
            timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
        $failed++
    }

    $processed++
    Update-Progress $art "Completed $art" $true

    # Rate limiting sleep between requests
    Start-Sleep -Milliseconds 300
}

# Save final index.json
try {
    $indexData.lastUpdated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $finalIndexJson = $indexData | ConvertTo-Json -Depth 4
    [System.IO.File]::WriteAllText($indexFile, $finalIndexJson, [System.Text.Encoding]::UTF8)
} catch {}

Update-Progress "" "Sync completed! $downloaded downloaded, $skipped already cached, $failed not found." $false
