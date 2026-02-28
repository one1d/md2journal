@echo off
REM md2journal Windows CLI Launcher
REM 用法:
REM   cli.bat file <input> [output]           单文件/通配符转换
REM   cli.bat build <inputDir> <outputDir>    批量转换
REM   cli.bat watch <inputDir> <outputDir>    监听并自动转换

node "%~dp0cli.js" %*
