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
set COLETA=%ERRORLEVEL%

REM Auditoria paralela do Corte Aberta: baixa os tres CSVs da repercussao geral
REM pelo navegador e diz se mudaram desde ontem. Nao toca em dados\ nem no site
REM -- e, por isso mesmo, nao pode derrubar a coleta: o codigo de saida guardado
REM acima e o que volta ao Agendador. Se o Playwright nao estiver instalado, ou
REM o WAF do STF recusar, a linha falha sozinha no log e a coleta do dia
REM continua valendo. Ver README, secao "Corte Aberta".
>> work\coleta-agendada.log echo.
>> work\coleta-agendada.log echo ----- Corte Aberta (auditoria paralela) -----
%NODE% coleta\corte-aberta.mjs --baixar >> work\coleta-agendada.log 2>&1

exit /b %COLETA%
