param(
  [string]$PlaylistName,
  [string]$CacheDir,
  [string]$Action = "pick",
  [string]$DialogTitle = ""
)

if ([string]::IsNullOrWhiteSpace($PlaylistName) -or [string]::IsNullOrWhiteSpace($CacheDir)) {
  exit 1
}

$safe = ($PlaylistName -replace '[\/\\:\*\?"<>\|]', '_').Trim()
if (-not (Test-Path $CacheDir)) {
  New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null
}
$targetPath = Join-Path $CacheDir "$safe.jpg"

if ($Action -eq "remove") {
  if (Test-Path $targetPath) {
    Remove-Item -Path $targetPath -Force -ErrorAction SilentlyContinue
  }
  exit 0
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Filter = "Image Files (*.jpg;*.jpeg;*.png;*.webp)|*.jpg;*.jpeg;*.png;*.webp|All Files (*.*)|*.*"
$dialog.Title = $(if ($DialogTitle) { $DialogTitle } else { "Choose Cover Photo - $PlaylistName" })
$dialog.Multiselect = $false

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true

$res = $dialog.ShowDialog($form)
if ($res -eq [System.Windows.Forms.DialogResult]::OK -and (Test-Path $dialog.FileName)) {
  try {
    $src = [System.Drawing.Image]::FromFile($dialog.FileName)
    
    # Calculate aspect-fill square crop
    $minDim = [Math]::Min($src.Width, $src.Height)
    $srcX = [Math]::Max(0, [int](($src.Width - $minDim) / 2))
    $srcY = [Math]::Max(0, [int](($src.Height - $minDim) / 2))
    
    $outDim = [Math]::Min(800, [Math]::Max(400, $minDim))
    $bmp = New-Object System.Drawing.Bitmap($outDim, $outDim)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $outDim, $outDim)
    $srcRect = New-Object System.Drawing.Rectangle($srcX, $srcY, $minDim, $minDim)
    $g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]92)
    $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    
    $bmp.Save($targetPath, $jpegCodec, $encoderParams)
    
    $g.Dispose()
    $bmp.Dispose()
    $src.Dispose()
  } catch {
    Copy-Item -Path $dialog.FileName -Destination $targetPath -Force
  }
}
