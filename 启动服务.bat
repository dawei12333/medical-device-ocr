@echo off
chcp 65001 >nul
cd /d "C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026"

echo ========================================
echo    医疗设备铭牌识别 — 服务启动
echo ========================================
echo.
echo 服务地址: http://localhost:3000
echo 关闭此窗口 = 停止服务
echo ========================================
echo.

"C:\Users\txx\.workbuddy\binaries\node\versions\22.22.2\node.exe" server.js

pause
