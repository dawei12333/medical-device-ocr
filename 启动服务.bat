@echo off
chcp 65001 >nul
cd /d "C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026"

echo ========================================
echo    医疗设备铭牌识别 — 一键启动
echo ========================================
echo.

echo [1/3] 启动 OCR 服务...
"C:\Users\txx\.workbuddy\binaries\node\versions\22.22.2\node.exe" server.js
echo 服务已启动在 http://localhost:3000
echo.

pause
