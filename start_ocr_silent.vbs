' 医疗设备铭牌识别 — OCR 服务静默自启脚本
' 位置: Windows 启动目录（每次登录自动运行）
' 功能: 若 3000 端口未占用，则后台启动 server.js

On Error Resume Next

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

nodeExe = "C:\Users\txx\.workbuddy\binaries\node\versions\22.22.2\node.exe"
serverJs = "C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026\server.js"

' 检查 node.exe 是否存在
If Not fso.FileExists(nodeExe) Then
  WScript.Quit
End If

' 用 PowerShell 检测 3000 端口是否已被占用
psCmd = "powershell -NoProfile -Command ""(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count"""
portInUse = WshShell.Exec(psCmd).StdOut.ReadAll

' 端口未被占用才启动（避免重复启动导致 EADDRINUSE）
If Trim(portInUse) = "0" Then
  WshShell.Run """" & nodeExe & """ """ & serverJs & """", 0, False
End If

Set fso = Nothing
Set WshShell = Nothing
