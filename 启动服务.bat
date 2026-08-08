@echo off
chcp 65001 >nul
cd /d "C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026"

echo ========================================
echo    医疗设备铭牌识别 — 一键启动
echo ========================================
echo.
echo 正在启动OCR服务...

REM 后台启动 server.js
start "OCR-Server" /MIN "C:\Users\txx\.workbuddy\binaries\node\versions\22.22.2\node.exe" server.js

REM 等 server 初始化
timeout /t 3 /nobreak >nul

REM 打开 PWA（file:// 协议，自动连接 localhost:3000）
start "" "C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026\index.html"

echo.
echo ========================================
echo   ✅ OCR 服务已启动
echo   📱 本机测试：PWA 已自动打开
echo   📱 手机访问：需先启动 ngrok
echo   🛑 停止服务：关闭 OCR-Server 窗口
echo ========================================
echo.
