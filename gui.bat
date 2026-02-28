@echo off
REM md2journal Windows GUI Launcher
REM 用法:
REM   gui.bat [--port 3456]

node "%~dp0gui.js" %*
