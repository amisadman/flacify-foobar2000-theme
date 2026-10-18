param(
    [Parameter(Mandatory=$true)]
    [string]$Artist,

    [Parameter(Mandatory=$true)]
    [string]$CacheDir
)

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

if (-not (Test-Path -Path $CacheDir)) {
    New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null
}

$safeName = $Artist -replace '[\\/:*?"<>|]', '_'
$jpgPath = Join-Path -Path $CacheDir -ChildPath "$safeName.jpg"
$metaPath = Join-Path -Path $CacheDir -ChildPath "${safeName}_meta.json"

$meta = @{
    name = $Artist
    fans = 0
    fansFormatted = ""
    albums = 0
    link = ""
    bio = ""
    desc = ""
}

# 1. Deezer API Search
try {
    $encodedArtist = [System.Uri]::EscapeDataString($Artist)
    $dUrl = "https://api.deezer.com/search/artist?q=$encodedArtist"
    $dRes = Invoke-RestMethod -Uri $dUrl -TimeoutSec 5 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0" }
    if ($dRes -and $dRes.data -and $dRes.data.Count -gt 0) {
        $top = $dRes.data[0]
        $meta.id = $top.id
        $meta.name = $top.name
        $meta.fans = [int]$top.nb_fan
        $meta.fansFormatted = "{0:N0}" -f $meta.fans
        $meta.albums = [int]$top.nb_album
        $meta.link = $top.link

        $picUrl = $top.picture_xl
        if (-not $picUrl) { $picUrl = $top.picture_big }
        if (-not $picUrl) { $picUrl = $top.picture_medium }

        if ($picUrl -and -not (Test-Path -Path $jpgPath)) {
            Invoke-WebRequest -Uri $picUrl -OutFile $jpgPath -TimeoutSec 8 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0" } | Out-Null
        }
    }
} catch {
    # Deezer failed or timed out
}

# 2. Wikipedia Summary API for Biography & Description
try {
    # Try exact artist name first, then sanitized name
    $wName = [System.Uri]::EscapeDataString($Artist)
    $wUrl = "https://en.wikipedia.org/api/rest_v1/page/summary/$wName"
    $wRes = Invoke-RestMethod -Uri $wUrl -TimeoutSec 5 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0 (music theme player)" }
    if ($wRes) {
        if ($wRes.extract) { $meta.bio = $wRes.extract }
        if ($wRes.description) { $meta.desc = $wRes.description }
    }
} catch {
    # Wikipedia summary fallback: if failed, try removing featured/collaborators
    try {
        $cleanName = ($Artist -split '[,;&/]| feat\.| ft\.')[0].Trim()
        if ($cleanName -and $cleanName -ne $Artist) {
            $wClean = [System.Uri]::EscapeDataString($cleanName)
            $wRes2 = Invoke-RestMethod -Uri "https://en.wikipedia.org/api/rest_v1/page/summary/$wClean" -TimeoutSec 5 -Headers @{ "User-Agent" = "Verdant-foobar2000/1.2.0" }
            if ($wRes2) {
                if ($wRes2.extract) { $meta.bio = $wRes2.extract }
                if ($wRes2.description) { $meta.desc = $wRes2.description }
            }
        }
    } catch {}
}

# Save metadata JSON file
try {
    $json = $meta | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($metaPath, $json, [System.Text.Encoding]::UTF8)
} catch {}
