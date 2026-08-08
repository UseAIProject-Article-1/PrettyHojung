<#
.SYNOPSIS
  Cuts a character out of flat-background artwork and saves a tightly cropped transparent PNG.

.DESCRIPTION
  The supplied mascot artwork sits on a flat background (grey or white) with a soft glow.
  A plain brightness key would erase the dark eyes and headphones, so this script instead:
    1. keys only the background-connected region, which protects dark interior details,
    2. ramps alpha across the glow so edges stay soft,
    3. un-mattes the remaining colour so no background tint is left behind,
    4. keeps the largest character blob and crops to its bounds, so no neighbouring
       sprite from the same sheet leaks into the export.

.EXAMPLE
  ./tools/extract-mascot.ps1 -Source art.png -Destination src/assets/nunchi/bunny.png
#>
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Destination,
  [int]$CropX = 0,
  [int]$CropY = 0,
  [int]$CropWidth = 0,
  [int]$CropHeight = 0,
  [int]$MaxWidth = 420,
  [double]$EdgeSoftness = 70,
  [double]$BackgroundTolerance = 92,
  [int]$Padding = 6
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Get-Bitmap {
  param([string]$Path, [int]$X, [int]$Y, [int]$Width, [int]$Height)

  $original = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Path))
  try {
    if ($Width -le 0) { $Width = $original.Width - $X }
    if ($Height -le 0) { $Height = $original.Height - $Y }

    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.DrawImage(
        $original,
        (New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)),
        (New-Object System.Drawing.Rectangle($X, $Y, $Width, $Height)),
        [System.Drawing.GraphicsUnit]::Pixel)
    } finally {
      $graphics.Dispose()
    }
    return $bitmap
  } finally {
    $original.Dispose()
  }
}

$bitmap = Get-Bitmap -Path $Source -X $CropX -Y $CropY -Width $CropWidth -Height $CropHeight
$width = $bitmap.Width
$height = $bitmap.Height
$pixelCount = $width * $height

$rectangle = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$data = $bitmap.LockBits($rectangle, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $data.Stride
$buffer = New-Object byte[] ($stride * $height)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buffer, 0, $buffer.Length)

# Sample the corners to learn the flat background colour.
$cornerOffsets = @(
  0,
  ($width - 1) * 4,
  ($height - 1) * $stride,
  ($height - 1) * $stride + ($width - 1) * 4
)
$bgB = 0.0; $bgG = 0.0; $bgR = 0.0
foreach ($offset in $cornerOffsets) {
  $bgB += $buffer[$offset]
  $bgG += $buffer[$offset + 1]
  $bgR += $buffer[$offset + 2]
}
$bgB /= $cornerOffsets.Count; $bgG /= $cornerOffsets.Count; $bgR /= $cornerOffsets.Count

# Flood fill from the borders so only background-connected pixels can be keyed out.
$isBackground = New-Object bool[] $pixelCount
$queue = New-Object int[] $pixelCount
$head = 0; $tail = 0

function Test-BackgroundColor {
  param([int]$Index)
  $offset = [int][Math]::Floor($Index / $width) * $stride + ($Index % $width) * 4
  $db = $buffer[$offset] - $bgB
  $dg = $buffer[$offset + 1] - $bgG
  $dr = $buffer[$offset + 2] - $bgR
  return [Math]::Sqrt($db * $db + $dg * $dg + $dr * $dr) -lt $BackgroundTolerance
}

for ($x = 0; $x -lt $width; $x++) {
  foreach ($y in @(0, $height - 1)) {
    $index = $y * $width + $x
    if (-not $isBackground[$index] -and (Test-BackgroundColor -Index $index)) {
      $isBackground[$index] = $true
      $queue[$tail++] = $index
    }
  }
}
for ($y = 0; $y -lt $height; $y++) {
  foreach ($x in @(0, $width - 1)) {
    $index = $y * $width + $x
    if (-not $isBackground[$index] -and (Test-BackgroundColor -Index $index)) {
      $isBackground[$index] = $true
      $queue[$tail++] = $index
    }
  }
}

while ($head -lt $tail) {
  $index = $queue[$head++]
  $x = $index % $width
  $y = [int][Math]::Floor($index / $width)

  foreach ($step in @(@(1, 0), @(-1, 0), @(0, 1), @(0, -1))) {
    $nx = $x + $step[0]
    $ny = $y + $step[1]
    if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $width -or $ny -ge $height) { continue }
    $neighbour = $ny * $width + $nx
    if ($isBackground[$neighbour]) { continue }
    if (-not (Test-BackgroundColor -Index $neighbour)) { continue }
    $isBackground[$neighbour] = $true
    $queue[$tail++] = $neighbour
  }
}

# Alpha ramp + un-matting: interior pixels stay solid, glow fades out cleanly.
$alpha = New-Object byte[] $pixelCount
for ($y = 0; $y -lt $height; $y++) {
  $rowOffset = $y * $stride
  for ($x = 0; $x -lt $width; $x++) {
    $index = $y * $width + $x
    $offset = $rowOffset + $x * 4

    if (-not $isBackground[$index]) {
      $alpha[$index] = 255
      $buffer[$offset + 3] = 255
      continue
    }

    $db = $buffer[$offset] - $bgB
    $dg = $buffer[$offset + 1] - $bgG
    $dr = $buffer[$offset + 2] - $bgR
    $distance = [Math]::Sqrt($db * $db + $dg * $dg + $dr * $dr)
    $a = [Math]::Min(1.0, [Math]::Max(0.0, $distance / $EdgeSoftness))

    $alpha[$index] = [byte][Math]::Round($a * 255)
    $buffer[$offset + 3] = $alpha[$index]

    if ($a -gt 0.004) {
      $buffer[$offset] = [byte][Math]::Min(255, [Math]::Max(0, [Math]::Round(($buffer[$offset] - $bgB * (1 - $a)) / $a)))
      $buffer[$offset + 1] = [byte][Math]::Min(255, [Math]::Max(0, [Math]::Round(($buffer[$offset + 1] - $bgG * (1 - $a)) / $a)))
      $buffer[$offset + 2] = [byte][Math]::Min(255, [Math]::Max(0, [Math]::Round(($buffer[$offset + 2] - $bgR * (1 - $a)) / $a)))
    }
  }
}

# Keep only the largest character blob so sprite-sheet neighbours are discarded.
$label = New-Object int[] $pixelCount
$currentLabel = 0
$bestLabel = 0
$bestSize = 0
for ($start = 0; $start -lt $pixelCount; $start++) {
  if ($label[$start] -ne 0 -or $alpha[$start] -lt 40) { continue }

  $currentLabel++
  $size = 0
  $head = 0; $tail = 0
  $queue[$tail++] = $start
  $label[$start] = $currentLabel

  while ($head -lt $tail) {
    $index = $queue[$head++]
    $size++
    $x = $index % $width
    $y = [int][Math]::Floor($index / $width)

    foreach ($step in @(@(1, 0), @(-1, 0), @(0, 1), @(0, -1))) {
      $nx = $x + $step[0]
      $ny = $y + $step[1]
      if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $width -or $ny -ge $height) { continue }
      $neighbour = $ny * $width + $nx
      if ($label[$neighbour] -ne 0 -or $alpha[$neighbour] -lt 40) { continue }
      $label[$neighbour] = $currentLabel
      $queue[$tail++] = $neighbour
    }
  }

  if ($size -gt $bestSize) {
    $bestSize = $size
    $bestLabel = $currentLabel
  }
}

$minX = $width; $minY = $height; $maxX = -1; $maxY = -1
for ($y = 0; $y -lt $height; $y++) {
  $rowOffset = $y * $stride
  for ($x = 0; $x -lt $width; $x++) {
    $index = $y * $width + $x
    if ($label[$index] -eq $bestLabel -and $bestLabel -ne 0) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    } elseif ($alpha[$index] -gt 0 -and $label[$index] -ne $bestLabel) {
      # Drop glow and fragments that belong to a different sprite on the sheet.
      $buffer[$rowOffset + $x * 4 + 3] = 0
    }
  }
}

[System.Runtime.InteropServices.Marshal]::Copy($buffer, 0, $data.Scan0, $buffer.Length)
$bitmap.UnlockBits($data)

if ($maxX -lt $minX -or $maxY -lt $minY) {
  $bitmap.Dispose()
  throw "No character pixels found in $Source"
}

$minX = [Math]::Max(0, $minX - $Padding)
$minY = [Math]::Max(0, $minY - $Padding)
$maxX = [Math]::Min($width - 1, $maxX + $Padding)
$maxY = [Math]::Min($height - 1, $maxY + $Padding)

$cropWidth = $maxX - $minX + 1
$cropHeight = $maxY - $minY + 1
$scale = if ($cropWidth -gt $MaxWidth) { $MaxWidth / $cropWidth } else { 1.0 }
$outWidth = [int][Math]::Round($cropWidth * $scale)
$outHeight = [int][Math]::Round($cropHeight * $scale)

$output = New-Object System.Drawing.Bitmap($outWidth, $outHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($output)
try {
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage(
    $bitmap,
    (New-Object System.Drawing.Rectangle(0, 0, $outWidth, $outHeight)),
    (New-Object System.Drawing.Rectangle($minX, $minY, $cropWidth, $cropHeight)),
    [System.Drawing.GraphicsUnit]::Pixel)
} finally {
  $graphics.Dispose()
}

$destinationPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Destination))
$destinationDirectory = Split-Path -Parent $destinationPath
if (-not (Test-Path $destinationDirectory)) {
  New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
}

$output.Save($destinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
$output.Dispose()
$bitmap.Dispose()

"{0} -> {1}x{2}" -f (Split-Path -Leaf $destinationPath), $outWidth, $outHeight
