@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
"%SCRIPT_DIR%python_win\python.exe" -m maia3.uci %*
endlocal
