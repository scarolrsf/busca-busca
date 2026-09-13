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
REM Corte Aberta, antes da coleta e por isso mesmo: o --anotar escreve em
REM dados\, e o complemento.mjs commita a pasta dados inteira. Rodando aqui, a
REM data da suspensao nacional entra no commit do dia; rodando depois, ficaria
REM esperando o dia seguinte. Nenhuma das duas linhas pode derrubar a coleta:
REM falta de Playwright ou recusa do WAF do STF falham sozinhas no log.
>> work\coleta-agendada.log echo.
>> work\coleta-agendada.log echo ----- Corte Aberta (auditoria e anotacao) -----
%NODE% coleta\corte-aberta.mjs --baixar >> work\coleta-agendada.log 2>&1
%NODE% coleta\corte-aberta.mjs --anotar >> work\coleta-agendada.log 2>&1

REM Boletins do NUGEPNAC: em qual informativo semanal cada tema apareceu.
REM --recente le so os ultimos 45 dias, que e o que muda de um dia para o
REM outro; a varredura de um ano inteiro se faz a mao quando precisar.
%NODE% coleta\boletins-nugepnac.mjs --anotar --recente >> work\coleta-agendada.log 2>&1

>> work\coleta-agendada.log echo.
>> work\coleta-agendada.log echo ----- Coleta das seis fontes -----
%NODE% coleta\complemento.mjs >> work\coleta-agendada.log 2>&1
