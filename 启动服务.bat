@echo off
chcp 65001 >nul
cd /d "C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026"

echo ========================================
echo    医疗设备铭牌识别 — 一键启动
echo ========================================
echo.

REM 用 PowerShell 启动 server.js（更稳定）
powershell -Command "Start-Process -FilePath 'C:\Users\txx\.workbuddy\binaries\node\versions\22.22.2\node.exe' -ArgumentList 'server.js' -WorkingDirectory 'C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026' -WindowStyle Hidden"

echo 等待服务启动...
timeout /t 5 /nobreak >nul

REM 验证服务是否启动
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 2 | Out-Null; Write-Host '✅ 服务在线' } catch { Write-Host '❌ 服务启动失败' -ForegroundColor Red }"

echo.
echo 打开 PWA...
start "" "C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026\index.html"

echo.
echo ========================================
echo   ✅ 操作完成
echo   PWA 已自动打开
echo   OCR服务在后台运行
echo ========================================
echo.
pause
