<#
.SYNOPSIS
  Cuts a character out of flat-background artwork and saves a tightly cropped transparent PNG.

.DESCRIPTION
  The supplied mascot artwork sits on a flat grey or white background and is wrapped in a
  soft white glow. A plain brightness key would erase the dark eyes and headphones, so this
  script keys on colourfulness instead:
    1. grey background and white glow are both nearly colourless, the character is not,
    2. only colourless pixels that connect to the image border are removed, which protects
       the white highlights and eye whites inside the character,
    3. alpha ramps with colourfulness so the outline stays soft rather than jagged,
    4. the largest remaining blob wins and the export is cropped to it, so a neighbouring
       sprite on the same sheet never leaks in.

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
  [double]$ColorThreshold = 26,
  [double]$EdgeFloor = 6,
  [int]$Padding = 8
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
$buffer = [byte[]]::new($stride * $height)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buffer, 0, $buffer.Length)

# Grey background and white glow are both colourless, so colourfulness separates them
# from the character far more reliably than brightness does.
$colorfulness = [double[]]::new($pixelCount)
$looksLikeBackground = [bool[]]::new($pixelCount)
for ($y = 0; $y -lt $height; $y++) {
  $rowOffset = $y * $stride
  $rowIndex = $y * $width
  for ($x = 0; $x -lt $width; $x++) {
    $offset = $rowOffset + $x * 4
    $b = $buffer[$offset]
    $g = $buffer[$offset + 1]
    $r = $buffer[$offset + 2]

    $max = [Math]::Max($r, [Math]::Max($g, $b))
    $min = [Math]::Min($r, [Math]::Min($g, $b))
    $value = $max - $min

    $colorfulness[$rowIndex + $x] = $value
    $looksLikeBackground[$rowIndex + $x] = $value -lt $ColorThreshold
  }
}

$isBackground = [bool[]]::new($pixelCount)
$queue = [int[]]::new($pixelCount)
$head = 0; $tail = 0

for ($x = 0; $x -lt $width; $x++) {
  foreach ($y in @(0, ($height - 1))) {
    $index = $y * $width + $x
    if (-not $isBackground[$index] -and $looksLikeBackground[$index]) {
      $isBackground[$index] = $true
      $queue[$tail++] = $index
    }
  }
}
for ($y = 0; $y -lt $height; $y++) {
  foreach ($x in @(0, ($width - 1))) {
    $index = $y * $width + $x
    if (-not $isBackground[$index] -and $looksLikeBackground[$index]) {
      $isBackground[$index] = $true
      $queue[$tail++] = $index
    }
  }
}

while ($head -lt $tail) {
  $index = $queue[$head++]
  $x = $index % $width
  $y = ($index - $x) / $width

  if ($x -gt 0) {
    $neighbour = $index - 1
    if (-not $isBackground[$neighbour] -and $looksLikeBackground[$neighbour]) { $isBackground[$neighbour] = $true; $queue[$tail++] = $neighbour }
  }
  if ($x -lt $width - 1) {
    $neighbour = $index + 1
    if (-not $isBackground[$neighbour] -and $looksLikeBackground[$neighbour]) { $isBackground[$neighbour] = $true; $queue[$tail++] = $neighbour }
  }
  if ($y -gt 0) {
    $neighbour = $index - $width
    if (-not $isBackground[$neighbour] -and $looksLikeBackground[$neighbour]) { $isBackground[$neighbour] = $true; $queue[$tail++] = $neighbour }
  }
  if ($y -lt $height - 1) {
    $neighbour = $index + $width
    if (-not $isBackground[$neighbour] -and $looksLikeBackground[$neighbour]) { $isBackground[$neighbour] = $true; $queue[$tail++] = $neighbour }
  }
}

# Border-connected pixels fade out with colourfulness; everything else stays solid.
$alpha = [byte[]]::new($pixelCount)
$range = [Math]::Max(1.0, $ColorThreshold - $EdgeFloor)
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

    $a = [Math]::Min(1.0, [Math]::Max(0.0, ($colorfulness[$index] - $EdgeFloor) / $range))
    $alpha[$index] = [byte][Math]::Round($a * 255)
    $buffer[$offset + 3] = $alpha[$index]
  }
}

# Keep only the largest character blob so sprite-sheet neighbours are discarded.
$label = [int[]]::new($pixelCount)
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
    $y = ($index - $x) / $width

    if ($x -gt 0) {
      $neighbour = $index - 1
      if ($label[$neighbour] -eq 0 -and $alpha[$neighbour] -ge 40) { $label[$neighbour] = $currentLabel; $queue[$tail++] = $neighbour }
    }
    if ($x -lt $width - 1) {
      $neighbour = $index + 1
      if ($label[$neighbour] -eq 0 -and $alpha[$neighbour] -ge 40) { $label[$neighbour] = $currentLabel; $queue[$tail++] = $neighbour }
    }
    if ($y -gt 0) {
      $neighbour = $index - $width
      if ($label[$neighbour] -eq 0 -and $alpha[$neighbour] -ge 40) { $label[$neighbour] = $currentLabel; $queue[$tail++] = $neighbour }
    }
    if ($y -lt $height - 1) {
      $neighbour = $index + $width
      if ($label[$neighbour] -eq 0 -and $alpha[$neighbour] -ge 40) { $label[$neighbour] = $currentLabel; $queue[$tail++] = $neighbour }
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
