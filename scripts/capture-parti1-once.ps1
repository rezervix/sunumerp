$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$outDir = "C:\Users\!\Desktop\Sunum ERP\docs\design-migration\screenshots\parti-1"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir }

$screens = @(
  @{ url = "http://localhost:3000/dashboard/turizm"; name = "turizm-once.png" },
  @{ url = "http://localhost:3000/dashboard/otel"; name = "otel-once.png" },
  @{ url = "http://localhost:3000/dashboard/tur"; name = "tur-once.png" },
  @{ url = "http://localhost:3000/dashboard/b2b"; name = "b2b-once.png" }
)

foreach ($s in $screens) {
  Write-Host "Taking screenshot for $($s.url)..."
  if (Test-Path "screenshot.png") { Remove-Item -Force "screenshot.png" }
  Start-Process -FilePath $chrome -ArgumentList '--headless', '--screenshot', '--window-size=1440,900', $s.url -Wait
  if (Test-Path "screenshot.png") {
    $target = Join-Path $outDir $s.name
    Move-Item -Force "screenshot.png" $target
    Write-Host "[OK] Saved: $target ($((Get-Item $target).Length) bytes)"
  } else {
    Write-Host "[FAIL] Could not capture $($s.name)"
  }
}
