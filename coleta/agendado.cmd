@echo off
REM O que o Agendador de Tarefas do Windows executa todo dia.
REM
REM Diferente do coletar-aqui.cmd em duas coisas: nao tem "pause" (ninguem
REM esta olhando, e a janela nao pode ficar esperando uma tecla para sempre) e
REM guarda o que aconteceu em work\coleta-agendada.log, que fica fora do Git.
REM Assim, se uma coleta falhar de madrugada, o registro esta la de manha.
cd /d "%~dp0.."
if not exist work mkdir work
set NODE=node
if exist "C:\Program Files\nodejs\node.exe" set NODE="C:\Program Files\nodejs\node.exe"
>> work\coleta-agendada.log echo.
>> work\coleta-agendada.log echo ===== %date% %time% =====
%NODE% coleta\complemento.mjs >> work\coleta-agendada.log 2>&1
