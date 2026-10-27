# Build script for Electron Windows exe
Write-Host "Starting build process..." -ForegroundColor Green

# Step 1: Generate Prisma Client
Write-Host "`nStep 1: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Prisma generate failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Build Next.js
Write-Host "`nStep 2: Building Next.js..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Next.js build failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Build Electron
Write-Host "`nStep 3: Building Electron app..." -ForegroundColor Yellow
npx electron-builder --win
if ($LASTEXITCODE -ne 0) {
    Write-Host "Electron build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nBuild completed successfully!" -ForegroundColor Green
Write-Host "Check the 'dist' folder for your exe file." -ForegroundColor Cyan





