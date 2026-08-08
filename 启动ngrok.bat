@echo off
chcp 65001 >nul
cd /d "C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026"

echo ========================================
echo    ngrok 公网隧道 — 启动器
echo ========================================
echo.
echo 第一次使用需要 token（在 ngrok dashboard 找）
echo 后续会自动保存配置
echo.

ngrok.exe http 3000

pause
