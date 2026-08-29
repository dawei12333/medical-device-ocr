' 静默启动 OCR 服务（开机自启）
' 放入: C:\Users\txx\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """C:\Users\txx\.workbuddy\binaries\node\versions\22.22.2\node.exe"" ""C:\Users\txx\WorkBuddy\医疗设备铭牌识别2026\server.js""", 0, False
Set WshShell = Nothing
