' 医疗设备铭牌识别 - 开机自启 Watchdog
' Windows 登录时由启动目录自动调用
' 启动 watchdog.js（永驻进程）→ 它会持续守护 server.js

On Error Resume Next

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

nodeExe = "C:\Users\txx\.workbuddy\binaries\node\versions\22.22.2\node.exe"
watchdogJs = "C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026\watchdog.js"

If Not fso.FileExists(nodeExe) Then
  WScript.Quit
End If

' 检查 watchdog 是否已在跑（避免重复启动）
psCmd = "powershell -NoProfile -Command ""(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count"""
portInUse = WshShell.Exec(psCmd).StdOut.ReadAll

' 检查 watchdog.lock 是否存在
lockFile = "C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026\watchdog.lock"
lockExists = fso.FileExists(lockFile)

If Trim(portInUse) = "0" And Not lockExists Then
  ' 启动 watchdog（隐藏窗口，false=不等待立即返回）
  WshShell.Run """" & nodeExe & """ """ & watchdogJs & """", 0, False
End If

Set fso = Nothing
Set WshShell = Nothing
