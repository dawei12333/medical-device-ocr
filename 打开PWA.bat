@echo off
chcp 65001 >nul

REM 检查服务是否在跑
powershell -Command "try { (Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 2).StatusCode; Write-Host '✅ OCR 服务在跑' } catch { Write-Host '❌ OCR 服务未启动，正在拉起...'; Start-Process -FilePath 'C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026\start_ocr_silent.vbs'; Start-Sleep -Seconds 3 }"

echo.
echo 正在打开 PWA（http://localhost:3000）...
start "" "http://localhost:3000"
