# Quick Event Setup Script - SIMPLE VERSION
# ngrok free tier = 1 tunnel only
# Solution: Use nginx reverse proxy - no Vercel needed!

Write-Host "🚀 GearShare Event Demo Setup" -ForegroundColor Cyan
Write-Host "==============================`n" -ForegroundColor Cyan

Write-Host "Strategy:" -ForegroundColor Yellow
Write-Host "  ✓ nginx proxy → Combines frontend + backend" -ForegroundColor White
Write-Host "  ✓ ngrok tunnel → 1 tunnel for everything" -ForegroundColor White
Write-Host "  ✓ No external hosting needed!`n" -ForegroundColor White

# Check if Docker is running
Write-Host "⚙️  Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running`n" -ForegroundColor Green

# Check if ngrok is installed
Write-Host "⚙️  Checking ngrok..." -ForegroundColor Yellow
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host "❌ ngrok is not installed." -ForegroundColor Red
    Write-Host "`nInstall ngrok using one of these methods:" -ForegroundColor Yellow
    Write-Host "  1. Chocolatey: choco install ngrok" -ForegroundColor White
    Write-Host "  2. Download: https://ngrok.com/download`n" -ForegroundColor White
    exit 1
}
Write-Host "✅ ngrok is installed`n" -ForegroundColor Green

# Check if ngrok is configured
Write-Host "⚙️  Checking ngrok configuration..." -ForegroundColor Yellow
$ngrokConfig = ngrok config check 2>&1
if ($ngrokConfig -like "*ERR*" -or $ngrokConfig -like "*invalid*") {
    Write-Host "⚠️  ngrok is not configured with an authtoken." -ForegroundColor Yellow
    Write-Host "`nPlease:" -ForegroundColor Yellow
    Write-Host "  1. Sign up at https://ngrok.com/signup" -ForegroundColor White
    Write-Host "  2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
    Write-Host "  3. Run: ngrok config add-authtoken YOUR_TOKEN`n" -ForegroundColor White
    
    $continue = Read-Host "Have you configured ngrok? (y/n)"
    if ($continue -ne 'y') {
        exit 1
    }
}
Write-Host "✅ ngrok is configured`n" -ForegroundColor Green

# Start full stack with Docker Compose
Write-Host "🐳 Starting all services (postgres, backend, frontend, nginx-proxy)..." -ForegroundColor Cyan
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    exit 1
}

Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check container status
Write-Host "`n📡 Checking service status..." -ForegroundColor Cyan
docker-compose ps

Write-Host "`n✅ All services started!`n" -ForegroundColor Green

# Instructions
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "============`n" -ForegroundColor Cyan

Write-Host "1️⃣  Create ngrok Tunnel" -ForegroundColor Green
Write-Host "   Open a new terminal and run:" -ForegroundColor Yellow
Write-Host "     ngrok http 8080" -ForegroundColor White
Write-Host "   Copy the https://xxxx.ngrok.io URL`n" -ForegroundColor Gray

Write-Host "2️⃣  Update Backend CORS" -ForegroundColor Green
Write-Host "   Edit backend/.env and add your ngrok URL:" -ForegroundColor Yellow
Write-Host "     ALLOWED_ORIGINS=http://localhost:5173,https://xxxx.ngrok.io" -ForegroundColor White
Write-Host "   Then restart: docker-compose restart backend`n" -ForegroundColor Gray

Write-Host "3️⃣  (Optional) Update Frontend API URL" -ForegroundColor Green
Write-Host "   If needed, edit root .env:" -ForegroundColor Yellow
Write-Host "     VITE_API_URL=https://xxxx.ngrok.io/api" -ForegroundColor White
Write-Host "   Then rebuild: docker-compose up -d --build frontend`n" -ForegroundColor Gray

Write-Host "4️⃣  Update QR Code" -ForegroundColor Green
Write-Host "   Open qr-codes.html and add your ngrok URL`n" -ForegroundColor Yellow

Write-Host "5️⃣  Test on Your Phone!" -ForegroundColor Green
Write-Host "   Open the ngrok URL in your browser`n" -ForegroundColor Yellow

Write-Host "📖 For detailed step-by-step instructions:" -ForegroundColor Cyan
Write-Host "   See: NGROK_SIMPLE_SETUP.md`n" -ForegroundColor White

Write-Host "✨ Everything is ready! Follow the steps above. Good luck! 🎉`n" -ForegroundColor Green

# Ask if they want to open the guide
$openGuide = Read-Host "Open NGROK_SIMPLE_SETUP.md for detailed instructions? (y/n)"
if ($openGuide -eq 'y') {
    Start-Process "NGROK_SIMPLE_SETUP.md"
}

# Ask if they want to open QR codes page
$openQR = Read-Host "Open qr-codes.html in browser? (y/n)"
if ($openQR -eq 'y') {
    Start-Process "qr-codes.html"
}
