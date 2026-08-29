@echo off
chcp 65001 >nul

REM 复制 VBS 到 Windows 启动目录（开机自启 OCR 服务）
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
copy /Y "C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026\start_ocr_silent.vbs" "%STARTUP_DIR%\start_ocr_silent.vbs" >nul

if %errorlevel% equ 0 (
  echo ✅ 已设置开机自启
  echo 启动目录: %STARTUP_DIR%
  echo 以后 Windows 登录时会自动启动 OCR 服务
) else (
  echo ❌ 安装失败，请用管理员身份运行
)

echo.
pause
