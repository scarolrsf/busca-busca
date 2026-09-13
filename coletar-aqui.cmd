@echo off
REM Dois cliques aqui fazem a coleta dos seis tribunais nesta maquina e enviam
REM o que mudou. Esta e uma contingencia manual; a rotina normal roda no
REM GitHub Actions. Ver README, secao "Complemento local de contingencia".
chcp 65001 >nul
cd /d "%~dp0"
node coleta/complemento.mjs
echo.
pause
