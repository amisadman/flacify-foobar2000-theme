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

    # 1. Deezer API
    try {
        $encoded = [System.Uri]::EscapeDataString($art)
        $dUrl = "https://api.deezer.com/search/artist?q=$encoded"
        $dRes = Invoke-RestMethod -Uri $dUrl -TimeoutSec 6 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0" }
        if ($dRes -and $dRes.data -and $dRes.data.Count -gt 0) {
            $top = $dRes.data[0]
            $metaObj.id = $top.id
            $metaObj.name = $top.name
            $metaObj.fans = [int]$top.nb_fan
            $metaObj.fansFormatted = "{0:N0}" -f $metaObj.fans
            $metaObj.albums = [int]$top.nb_album
            $metaObj.link = $top.link
            $fetchedMeta = $true

            $picUrl = $top.picture_xl
            if (-not $picUrl) { $picUrl = $top.picture_big }
            if (-not $picUrl) { $picUrl = $top.picture_medium }

            if ($picUrl) {
                Invoke-WebRequest -Uri $picUrl -OutFile $jpgPath -TimeoutSec 10 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0" } | Out-Null
                $fetchedImage = $true
            }
        }
    } catch {}

    # 2. Wikipedia Summary API
    try {
        $wName = [System.Uri]::EscapeDataString($art)
        $wUrl = "https://en.wikipedia.org/api/rest_v1/page/summary/$wName"
        $wRes = Invoke-RestMethod -Uri $wUrl -TimeoutSec 5 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0" }
        if ($wRes) {
            if ($wRes.extract) { $metaObj.bio = $wRes.extract }
            if ($wRes.description) { $metaObj.desc = $wRes.description }
            $fetchedMeta = $true
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
