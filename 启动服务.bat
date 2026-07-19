@echo off
chcp 65001 >nul
title 医疗设备铭牌识别 — 启动器

cd /d "C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026"

echo ========================================
echo    医疗设备铭牌识别服务
echo ========================================
echo.
echo 正在启动OCR服务...
echo.

REM 在独立窗口启动服务（方便查看日志和 Ctrl+C 停止）
start "OCR-服务" "C:\Users\txx\.workbuddy\binaries\node\versions\22.22.2\node.exe" server.js

REM 等一下服务完全就绪
echo 等待服务初始化...
timeout /t 3 /nobreak >nul

REM 自动打开浏览器
echo 正在打开浏览器...
start http://localhost:3000

echo.
echo ========================================
echo   ✅ 服务已启动！
echo.
echo   📱 浏览器地址: http://localhost:3000
echo   🔍 健康检查:   http://localhost:3000/api/health
echo.
echo   🛑 停止服务: 关闭 "OCR-服务" 窗口即可
echo ========================================
echo.
echo 按任意键关闭此启动器（不影响服务运行）...
pause >nul
