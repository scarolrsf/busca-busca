@echo off
REM Dois cliques aqui fazem a coleta dos seis tribunais nesta maquina e enviam
REM o que mudou. O STF so responde daqui, e nao do servidor do GitHub -- por
REM isso esta coleta existe. Ver README, secao "Coleta na maquina da Sarah".
chcp 65001 >nul
cd /d "%~dp0"
node coleta/complemento.mjs
echo.
pause
