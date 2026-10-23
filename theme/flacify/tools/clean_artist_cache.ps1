param(
    [string]$CacheDir = "$PSScriptRoot\..\cache\artists"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Drawing

function Clean-BioText([string]$str) {
    if (-not $str) { return "" }
    $s = $str
    # 1. Decode CP437 Mojibake artifacts (e.g. ΓÇÖ -> ', ΓÇ£/ΓÇ¥ -> ", etc.)
    $gamma = [char]0x0393
    $cedilla = [char]0x00C7
    $pattern = "$gamma$cedilla"
    if ($s.Contains($pattern)) {
        $s = $s.Replace("$gamma$cedilla$([char]0x00D6)", "'")
        $s = $s.Replace("$gamma$cedilla$([char]0x00A3)", '"')
        $s = $s.Replace("$gamma$cedilla$([char]0x00A5)", '"')
        $s = $s.Replace("$gamma$cedilla$([char]0x00F6)", "-")
        $s = $s.Replace("$gamma$cedilla$([char]0x00F3)", "--")
        $s = $s.Replace("$gamma$cedilla$([char]0x00AA)", "...")
        $s = [regex]::Replace($s, [regex]::Escape($pattern) + '.', "'")
    }
    # 2. Unwrap HTML anchors: <a ...>Inner Text</a> -> Inner Text
    $s = [regex]::Replace($s, '<a\b[^>]*>([\s\S]*?)<\/a>', '$1', 'IgnoreCase')
    # 3. Strip remaining HTML tags
    $s = [regex]::Replace($s, '<[^>]+>', '')
    # 3. Decode common named HTML entities
    $s = $s.Replace('&amp;', '&').Replace('&quot;', '"').Replace('&apos;', "'").Replace('&lt;', '<').Replace('&gt;', '>').Replace('&nbsp;', ' ')
    # 4. Decode decimal numeric entities: &#34; -> ", &#39; -> ', etc.
    $s = [regex]::Replace($s, '&#(\d+);', { param($m)
        $code = [int]$m.Groups[1].Value
        if ($code -ge 32 -and $code -le 126) { return [char]$code }
        if ($code -eq 10 -or $code -eq 13) { return "`n" }
        return ''
    })
    # 5. Remove hex entities (e.g. &#x1faf5; emojis)
    $s = [regex]::Replace($s, '&#x[0-9a-fA-F]+;', '')
    # 6. Remove surrogate pairs (emojis)
    $s = [regex]::Replace($s, '[\uD800-\uDBFF][\uDC00-\uDFFF]', '')
    # 7. Remove Unicode line/paragraph separators & non-breaking spaces
    $s = [regex]::Replace($s, '[\u2028\u2029\u00A0]', ' ')
    $s = [regex]::Replace($s, '[\u200B-\u200D\uFEFF]', '')
    # 8. Normalize excessive whitespace
    $s = [regex]::Replace($s, '[ \t]+', ' ')
    $s = [regex]::Replace($s, '\n{3,}', "`n`n")
    $s = [regex]::Replace($s, '^\s+|\s+$', '')
    return $s
}

function Crop-ToSquare([string]$imagePath) {
    if (-not (Test-Path $imagePath)) { return $false }
    try {
        $bytes = [System.IO.File]::ReadAllBytes($imagePath)
        $ms = New-Object System.IO.MemoryStream($bytes, 0, $bytes.Length)
        $src = [System.Drawing.Image]::FromStream($ms)
        $w = $src.Width
        $h = $src.Height
        if ($w -eq $h) {
            $src.Dispose()
            $ms.Dispose()
            return $false
        }

        $sz = [System.Math]::Min($w, $h)
        $x = [System.Math]::Floor(($w - $sz) / 2)
        $y = [System.Math]::Floor(($h - $sz) / 2)

        $cropRect = New-Object System.Drawing.Rectangle($x, $y, $sz, $sz)
        $bmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppRgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($src, 0, 0, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

        $src.Dispose()
        $ms.Dispose()
        $g.Dispose()

        $tempPath = $imagePath + ".tmp.jpg"
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 92)
        $bmp.Save($tempPath, $codec, $encoderParams)
        $bmp.Dispose()

        Move-Item -Path $tempPath -Destination $imagePath -Force
        return $true
    } catch {
        return $false
    }
}

Write-Output "Processing artist cache in: $CacheDir"

# 1. Clean all _meta.json files
$metaFiles = Get-ChildItem -Path $CacheDir -Filter "*_meta.json"
$cleanedMeta = 0
foreach ($mf in $metaFiles) {
    try {
        $raw = Get-Content $mf.FullName -Raw -Encoding UTF8
        $json = $raw | ConvertFrom-Json
        $changed = $false
        if ($json.bio) {
            $newBio = Clean-BioText $json.bio
            if ($newBio -ne $json.bio) {
                $json.bio = $newBio
                $changed = $true
            }
        }
        if ($json.desc) {
            $newDesc = Clean-BioText $json.desc
            if ($newDesc -ne $json.desc) {
                $json.desc = $newDesc
                $changed = $true
            }
        }
        if ($changed) {
            $jsonStr = $json | ConvertTo-Json -Compress
            [System.IO.File]::WriteAllText($mf.FullName, $jsonStr, [System.Text.Encoding]::UTF8)
            $cleanedMeta++
        }
    } catch {}
}
Write-Output "Cleaned $cleanedMeta metadata files of HTML entities, emojis, and unknown characters."

# 2. Crop all non-square images
$jpgFiles = Get-ChildItem -Path $CacheDir -Filter "*.jpg"
$croppedImages = 0
foreach ($jf in $jpgFiles) {
    if (Crop-ToSquare $jf.FullName) {
        $croppedImages++
    }
}
Write-Output "Square-cropped $croppedImages non-square artist images to perfect 1:1 aspect ratio."
