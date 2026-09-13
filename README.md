# Busca Busca

Precedentes / incidentes / informativos

Buscador de precedentes qualificados para os Juizados Especiais Cíveis, Criminais
e da Fazenda Pública do TJMG: IRDR, IUJ, IAC, grupos de representativos, temas
repetitivos do STJ, repercussão geral do STF e os informativos dos dois
tribunais superiores.

O objetivo prático é responder rápido a uma pergunta: **este tema tem ordem de
suspensão que alcança o processo que estou para sentenciar?**

Endereço: **https://scarolrsf.github.io/busca-busca/**

Este arquivo descreve o projeto **como está hoje**, em regras. O porquê de cada
decisão — medições, episódios, alternativas descartadas — está no
[HISTORICO.md](HISTORICO.md); as remissões "(histórico: …)" dão o título da
entrada.

## Sumário

- [Antes de alterar](#antes-de-alterar) — o que não fazer, onde mexer, como validar
- [Como funciona](#como-funciona) — peças e inventário de arquivos
- [Coleta](#coleta) — agendada, à mão e na máquina da Sarah
- [As fontes](#as-fontes) — como cada tribunal é lido e o que fazer quando falha
- [O que é base e o que é derivado](#o-que-é-base-e-o-que-é-derivado)
- [Regra de suspensão](#regra-de-suspensão) — a partir de quando e até quando
- [Publicar](#publicar)
- [Conferências](#conferências)
- [Pendências em aberto](#pendências-em-aberto)
- [Regra permanente de atualização](#regra-permanente-de-atualização)

## Antes de alterar

### Não faça

- **Não versione `site/dados.json`.** É derivado de `dados/` na publicação e
  está no `.gitignore`.
- **Não crie a variável `JURISPRUDENCIA_STF` no repositório.** Ela ligaria a
  segunda via do STF nas coletas agendadas, que não têm navegador e cujo
  endereço o STF nega: falha e commit de ruído duas vezes por dia.
- **Não repita pedido que recebeu 403 ou 404.** Recusa encerra a fonte na
  primeira tentativa; firewall conta as batidas e passa a bloquear as outras
  fontes. Só rede, tempo esgotado, 408, 429 e 5xx são repetidos.
- **Não mude o início "Coleta de DD/MM/AAAA"** das mensagens de commit de
  coleta: é por ele que o vigia (`monitorar.mjs`) sabe que a base foi
  atualizada no dia.
- **Não apague registro que sumiu da fonte nem corrija a fonte em silêncio.**
  Falha de fonte mantém os registros da última leitura; erro do tribunal fica
  visível e sinalizado (ver [Quando a fonte erra](#quando-a-fonte-erra)).
- **Não grave na base por fora da coleta sem conferir `ALTERACOES`.** Campo
  novo preenchido à mão faz a aba "Novidades" anunciar mudanças que não
  houve. A prova usada até aqui: rodar o coletor contra uma cópia da base e
  confirmar que `dados/alteracoes.json` não ganhou entradas.
- **Não afirme fase, data ou alcance que a fonte não afirmou.** Campo vazio é
  resposta melhor que data errada.
- **Não use o espelho da Cloudflare para o STF** (devolve 526) nem para
  endereços além dos dois do STJ.
- **Não inclua credenciais, cookies ou tokens** em código ou documentação.

### Onde mexer

| Para mudar… | Arquivo |
| --- | --- |
| A regra de suspensão (encerrado, risco, alcance, fase) | funções expostas em `module.exports` no `<script>` de `site/index.html` (`prepararRegistro`, `encerrado`, `risco`…) |
| As invariantes que protegem essa regra | `coleta/conferir-regra.mjs` |
| Como uma fonte é lida | `coleta/regras.js`, uma função por fonte (`coletarIUJ_`…); limites em `PILOTO` |
| Como um registro novo se compara ao antigo e vira novidade | `atualizarRegistros_` em `coleta/regras.js` |
| Rede, repetição, certificado do STF, espelho | `coleta/ambiente.mjs` |
| O que o site recebe | `coleta/publicar.mjs` |
| Horários e segredos | `.github/workflows/` |

O repositório usa LF (`.gitattributes`); é editado no Windows e roda no Linux.

### Como validar

No mínimo `node coleta/publicar.mjs`, que roda as doze invariantes da regra de
suspensão sobre a base inteira. Mexeu num módulo com `--autoteste`, rode-o. Os
comandos estão em [Conferências](#conferências).

## Como funciona

| Peça | Onde roda | Quando |
| --- | --- | --- |
| Coleta nas fontes oficiais | GitHub Actions | 6h07 e 18h07, horário de Brasília |
| Vigia da coleta | GitHub Actions | 9h e 21h, horário de Brasília |
| Complemento com o STF | Agendador do Windows, na máquina da Sarah | 9h |
| Base de dados | JSON versionado em `dados/` | a cada coleta |
| Site | GitHub Pages | a cada envio e ao fim de cada coleta com êxito |

Tudo gratuito. A coleta está no GitHub Actions porque as planilhas do STF (até
62 MB descompactadas) não cabem no Apps Script nem num Worker. O site é
estático — um HTML e um JSON — servido por CDN (histórico: "Saída do Apps
Script para GitHub Actions e Cloudflare Pages").

O portal usa o mesmo desenho em qualquer largura; abaixo de 700 px a faixa do
topo quebra em duas linhas, o texto deixa de ser justificado, campos vão a
16 px e alvos de toque a 44 px (histórico: "O portal passa a caber no
telefone").

### Arquivos

```
site/                    o que o GitHub Pages publica
  index.html             o portal inteiro: CSS e JS embutidos, sem dependências
  icone.svg              o logotipo reduzido ao que se lê a 16 pixels
  fontes/                IBM Plex Sans, IBM Plex Mono e Source Serif 4 em woff2,
                         servidas daqui para não requisitar ao Google (LGPD)
  dados.json             derivado de dados/ na publicação; não versionado

coleta/
  executar.mjs           orquestra a coleta
  regras.js              uma regra de leitura por fonte oficial
  ambiente.mjs           rede, leitura de xlsx e armazenamento
  publicar.mjs           monta site/dados.json a partir da base e confere a regra
  conferir-regra.mjs     confere a regra de suspensão contra a base inteira
  conferir-fontes.mjs    mostra, no resumo da execução, quais fontes responderam
  conferir-cadeia.mjs    prova que o remendo do certificado do STF funciona
  monitorar.mjs          o vigia: abre issue quando a coleta pula ou uma fonte falha seguida
  jurisprudencia-stf.mjs segunda via do STF pelo navegador (desligada por padrão)
  corte-aberta.mjs       baixa as 3 bases de RG do Corte Aberta e anota a data da suspensão nacional
  boletins-nugepnac.mjs  casa as notícias do NUGEPNAC com o boletim da semana
  complemento.mjs        a coleta feita daqui: atualiza, coleta e envia
  servir.mjs             servidor local na porta 8777, só para conferir o site
  agendado.cmd           o que o Agendador do Windows executa todo dia, sem pause

.github/workflows/
  coletar.yml            a coleta das 6h07 e 18h07
  monitorar.yml          o vigia das 9h e 21h
  publicar.yml           gera o dados.json e publica site/ no GitHub Pages

dados/                   a base entre uma coleta e outra, versionada
  temas-do-portal.json         precedentes e incidentes
  informativos-do-portal.json  julgados divulgados em informativo
  alteracoes.json              o que mudou, linha a linha
  fontes.json                  situação da última consulta a cada fonte
  conferencia.json             quando cada origem foi lida pela última vez
  jurisprudencia-stf.json      só a prova de vida da segunda via do STF

espelho/                 segunda via para o STJ, publicada na Cloudflare
  worker.js              refaz o pedido, só GET, só os dois endereços do STJ
  wrangler.toml          como publicar e quais segredos o repositório espera

coletar-aqui.cmd         dois cliques para rodar o complemento no Windows

README.md                este documento: o estado atual
HISTORICO.md             o registro datado de cada alteração
MIGRACAO.md              mapa para migração de servidor, aba por aba
AGENTS.md, CLAUDE.md     instruções de manutenção para os colaboradores
LICENSE                  todos os direitos reservados

work/                    apoio local, fora do repositório (ver .gitignore)
.claude/
  launch.json            atalho de prévia local: sobe `serve site` na porta 4173
```

## Coleta

### Agendada

`coletar.yml` roda às 6h07 e 18h07 e traz o que o GitHub alcança: TJMG sempre,
STJ pelo espelho quando ele recusa. O STF nega o endereço do GitHub Actions, e
por isso vem do complemento abaixo. `monitorar.yml`, às 9h e 21h, abre issue
(e o GitHub manda e-mail) se não houver commit de coleta no dia ou se a mesma
fonte falhar nos dois últimos commits; fecha a issue sozinho quando normaliza.

### À mão

```bash
node coleta/executar.mjs
```

Consulta as seis fontes, atualiza `dados/` e gera `site/dados.json`. Para ver o
site: `npx --yes serve site`.

### Coleta na máquina da Sarah

É daqui que o STF responde. Dois cliques em **`coletar-aqui.cmd`**: atualiza a
pasta com o GitHub, consulta os seis tribunais, mostra o que mudou e envia. Se
nada mudou, não envia. Se o envio esbarrar numa coleta agendada, reencaixa e
tenta uma vez; não dando, para e avisa, com a coleta gravada aqui.

- Ver o que mudaria sem enviar: `node coleta/complemento.mjs --sem-enviar`.
- O commit começa com "Coleta de DD/MM/AAAA", como o da agendada; a origem vai
  no fim da mensagem.
- Não substitui a coleta agendada: acrescenta o STF.

#### Todo dia, sozinho

A tarefa **`BuscaBusca-ColetaSTF`** do Agendador do Windows roda
`coleta/agendado.cmd` **todo dia às 9h**, e roda assim que possível se o
horário foi perdido. Antes da coleta, anota Corte Aberta e boletins do
NUGEPNAC. Registro em `work/coleta-agendada.log`, fora do Git. Roda só com a
Sarah conectada, para não guardar a senha dela no Windows.

```powershell
Disable-ScheduledTask -TaskName "BuscaBusca-ColetaSTF"
Enable-ScheduledTask  -TaskName "BuscaBusca-ColetaSTF"
Unregister-ScheduledTask -TaskName "BuscaBusca-ColetaSTF"
```

Desligá-la não quebra nada: a coleta agendada continua, e `coletar-aqui.cmd`
continua valendo.

## As fontes

| Fonte | Como é lida | Via |
| --- | --- | --- |
| STJ — temas e processos | CSV de dados abertos; endereço e data de publicação perguntados à API CKAN do catálogo, nunca presumidos | arquivo oficial |
| STJ — informativos | HTML da edição corrente | leitura de página |
| TJMG — IRDR, IAC e GR | consulta paginada no RUPE, com cookie e POST | leitura de página |
| TJMG — IUJ | planilha de acompanhamento da Turma Recursal; a coleta exige a coluna ADMISSÃO no cabeçalho | arquivo oficial |
| STF — repercussão geral | tabela "Todos os temas" + lista com a marca de suspensão | leitura de página |
| STF — informativos | planilha oficial `Dados_InformativosSTF.xlsx` | arquivo oficial |

A leitura de página existe porque esses tribunais não publicam o dado de outro
jeito. O STF não tem API para temas e suspensão; a API interna da
jurisprudência e o DataJud foram avaliados e não servem (histórico: "Espelho
publicado; e o STF não tem API para o que precisamos"). O que sustenta a
leitura é a conduta: dado público sem dado pessoal, duas consultas por dia, uma
requisição por vez, recusa respeitada, nada forjado — nenhum token falsificado,
nenhum desafio anti-robô resolvido por programa.

**Fontes complementares**, fora do fluxo da coleta:

- **Corte Aberta (STF)** — alimenta só "Suspensão nacional determinada em".
  Baixa pelo navegador na máquina da Sarah (`corte-aberta.mjs --baixar`) e
  grava com `--anotar`. Tema que sai da lista de suspensão nacional tem o campo
  limpo.
- **Boletins do NUGEPNAC (TJMG)** — `boletins-nugepnac.mjs` casa cada notícia
  em HTML ("(Tema 1376 - STJ)", "(Tema 113 IRDR - TJMG)") com o boletim semanal
  daquela data e grava `boletim` e `boletimUrl`. Sem ler PDF. Controvérsias
  ficam de fora de propósito. `--recente` (45 dias), `--desde`, `--ensaio`.

### Quando a fonte falha

- **Nada é apagado.** Os registros ficam os da última leitura com êxito, a
  falha é anotada em `dados/fontes.json` e a aba "Fontes e atualização" mostra
  ponto vermelho.
- **Dois níveis de repetição**, três tentativas com pausa crescente: na
  requisição (`ambiente.mjs`) e em volta da fonte inteira (`regras.js`) — este
  pega o STF sobrecarregado, que responde 200 com página de erro sem a tabela.
  403/404 encerram na primeira; o código HTTP viaja junto do erro (histórico:
  "Quem recusa não é repetido: fim das três batidas no 403").

### Espelho para o STJ

O STJ nega o endereço do GitHub Actions; pela Cloudflare, aceita. O Worker em
`espelho/` refaz o pedido, com estas regras:

- **O direto vem sempre primeiro**; o espelho só entra depois de um 403.
- Só GET, só `processo.stj.jus.br` e `dadosabertos.web.stj.jus.br`, só com a
  chave combinada.
- Sem os segredos `ESPELHO_URL` e `ESPELHO_CHAVE`, a coleta age como se ele não
  existisse (caso da execução à mão e de fork).
- Se o espelho também falhar, o registrado é a recusa **da fonte**, com nota
  da segunda via.
- Não hospeda nada do portal; desligá-lo só volta o STJ a falhar no GitHub.

Publicado em 11/09/2026 em `espelho-busca-busca.sarahcarolina37.workers.dev`,
plano gratuito. Publicar ou trocar a chave: `espelho/wrangler.toml`.

### Certificado do STF

Os endereços do STF omitem o certificado intermediário. Navegador e Windows o
buscam sozinhos; o curl no Linux, não. `ambiente.mjs` busca o elo à mão quando
o curl recusa e repete o pedido. Nenhum certificado fica no repositório.

### Segunda via do STF: a jurisprudência pelo navegador

`coleta/jurisprudencia-stf.mjs` abre `jurisprudencia.stf.jus.br/pages/search`
num Chromium (Playwright), onde o WAF passa como num navegador comum.

- **Desligada por padrão.** Só roda na coleta com `JURISPRUDENCIA_STF=1`, à mão,
  na máquina da Sarah. Não criar a variável no repositório (ver
  [Não faça](#não-faça)).
- Uso manual, sem tocar na base:
  `node coleta/jurisprudencia-stf.mjs --tema "fornecimento de medicamentos"`
  (também `--limite`, `--headless`, `--json-out`, `--autoteste`).
- Ligada, grava só `dados/jurisprudencia-stf.json` (uma busca, 3 fichas). Nunca
  entra em TEMAS, INFORMATIVOS ou FONTES — o grão é acórdão, não tema — e uma
  falha nunca derruba a coleta.
- Parâmetro da busca: `queryString` (não `termo=`). Extração:
  `div.result-container` com `p.jud-text` na ordem ementa, tema, tese.

### Leitura do STF

1. **Temas.** `jurisprudenciaRepercussao/todostemas.asp` traz o cadastro numa
   tabela; descrição e assuntos estão nos atributos `title` dos tooltips.
2. **Teses.** Uma página por tema (`verTeseTema.asp`); cada execução completa no
   máximo `PILOTO.stfTesesPorExecucao` das que faltam.
3. **Informativos.** Planilha oficial, a partir de `PILOTO.stfInfoEdicaoMinima`.
4. **Suspensão nacional.** Da lista `listarProcesso.asp`, que traz a marca e o
   cadastro inteiro numa requisição — a ficha de cada leading case tem 2,6 MB e
   não aceita `Range`.
5. **Datas.** A data da coluna "Situação Atual" é da **apreciação da
   repercussão geral**, não da situação processual. A ficha mostra só:

   | Campo | De onde vem |
   | --- | --- |
   | Repercussão geral apreciada em | a data da coluna "Situação Atual" |
   | Tese firmada em | a coluna "Tese / Data Tese" |
   | Suspensão nacional determinada em | Corte Aberta, por `corte-aberta.mjs --anotar` |

   Trânsito em julgado e publicação do acórdão de mérito **não** são publicados
   pelo STF em forma legível por coleta, nem pelo Corte Aberta; ficam vazios, e
   o link "Fonte oficial" leva à ficha do tribunal (histórico: "As datas do
   STF, e a suspensão que veio depois do acórdão").

### Quando a fonte erra

**Não corrigir a fonte em silêncio, e não apresentar o erro como dado bom.**

- **Mesmo processo com dois números** (ex.: CNJ com três zeros onde cabem
  quatro): o coletor não funde; cria o segundo registro com "identificador
  incompleto", e na publicação os registros de mesmo núcleo apontam um para o
  outro, com aviso nas duas fichas.
- **Registro que some da lista**: não é apagado; `atualizarRegistros_` congela a
  data da última aparição, e a ficha diz se parou a fonte ou só o registro.
- **Não-data em campo de data** ("139" em DATA DO JULGAMENTO): a ficha mostra
  **sem data** e, ao lado, entre aspas, o que a planilha trouxe. Na aba
  "Novidades", o cartão passa a "Admitido em …" com a fase de suspensão.

Esses sinais são **derivados na publicação**, não gravados na base: somem
quando a fonte se corrige e não geram "Novidades" (histórico: "O portal passa a
dizer quando a fonte erra").

## O que é base e o que é derivado

- O repositório guarda **só a base**, em `dados/`. Tudo o que o site lê é
  derivado dela por `coleta/publicar.mjs`. `site/dados.json` é minificado numa
  linha; versioná-lo custaria mais de 1 GB por ano.
- A data de conferência fica em `dados/conferencia.json`, uma linha por origem,
  e não em cada registro. Só volta a um registro quando ele **some da fonte**;
  `publicar.mjs` a devolve a cada registro na montagem.
- `conferencia.json` muda a cada coleta, o que mantém o repositório ativo — o
  GitHub desliga workflow agendado após 60 dias parado.

## Regra de suspensão

Vive num lugar só — as funções de classificação de `site/index.html` — e é
aplicada a todo registro no momento de exibir. `coleta/conferir-regra.mjs`
carrega essas mesmas funções e confere **doze invariantes** sobre a base
inteira, na coleta e na publicação: regra quebrada faz falhar em vez de chegar
à tela. A ficha remete ao documento de origem, cujo texto aqui é extrato e
cuja ressalva prevalece sobre esta leitura.

### A partir de quando suspender

Dimensão independente do alcance: *de que ponto do processo em diante*. Aparece
em bloco destacado na ficha e na pílula da lista.

| Resposta | Quando |
| --- | --- |
| **Só na fase recursal** | a determinação fala apenas de REsp/RE, segunda instância ou admissibilidade, **sem** alcançar o primeiro grau |
| **Após encerrada a instrução probatória** | a determinação ressalva a instrução |
| **Imediata** | a determinação manda suspender de imediato, com todas as letras |
| **Desde a determinação** | há determinação escrita e ela não ressalva fase alguma (art. 314 do CPC) |
| **Fase não especificada** | não há texto de determinação registrado; na prática não chega à tela |

- Classifica-se só o que a determinação diz; silêncio num texto que existe é
  "desde a determinação", nunca outra fase.
- **Imediata** e **desde a determinação** levam a mesma faixa vermelha; só a nota
  distingue quem mandou (o tribunal ou a lei).
- As marcas são expressões inteiras: "não aplicabilidade **imediata** da decisão"
  fala da eficácia do acórdão, não da suspensão.

### Até quando vale a suspensão

Não é o trânsito em julgado que a encerra:

- **Repetitivo e repercussão geral** — cessa com a publicação do acórdão
  paradigma (art. 1.040, III, do CPC).
- **IRDR e correlatos** — cessa se não houver REsp/RE contra o acórdão do
  incidente (art. 982, § 5º); havendo, persiste até o julgamento dele (art. 987,
  § 1º).
- **Embargos de declaração pendentes** contra o acórdão do incidente impedem a
  cessação (art. 1.026). O TJMG os narra no campo de suspensão, e é lá que a
  regra busca.
- **"Acórdão de repercussão geral publicado" não encerra**; só "acórdão de
  mérito publicado" encerra. O primeiro é o reconhecimento da repercussão
  geral, quando a suspensão é determinada (arts. 1.035, § 5º, e 1.037, II).
  Exceção: acórdão que **nega** a repercussão geral encerra o tema.
- **Determinação posterior ao acórdão paradigma** não é encerrada por ele — o
  art. 1.040, III, pressupõe ordem anterior. A data da determinação vem do
  Corte Aberta.
- **Cláusula expressa** em sentido diverso prevalece sobre a regra geral.

### Prazo declarado na prorrogação

Quando o TJMG registra prorrogação com prazo em algarismos ("por mais 180
dias") e o prazo venceu sem notícia posterior, a ficha mostra aviso âmbar com
as datas.

- O aviso **não** muda a classificação: prazo vencido não é ordem levantada.
- Cala-se se houver qualquer data posterior ao início do prazo no mesmo texto.
- Prazo por extenso não é lido.

## Publicar

`publicar.yml` publica `site/` no GitHub Pages a cada envio à `main` e ao fim de
cada Coleta com êxito (`workflow_run`) — o push da coleta, feito com
`GITHUB_TOKEN`, não dispara workflow sozinho.

- Build: `node coleta/publicar.mjs`, que gera `site/dados.json` e confere a
  regra; base que a viole não é publicada.
- Em outra hospedagem estática (Cloudflare Pages, se um dia houver domínio
  próprio): mesmo build, pasta `site`.
- A coleta precisa de `permissions: contents: write`, já declarada.

## Conferências

Não há suíte de testes separada: cada peça traz a própria conferência.

| Comando | O que confere | Rede |
| --- | --- | --- |
| `node coleta/publicar.mjs` | monta o `site/dados.json` e roda as doze invariantes da regra de suspensão sobre a base inteira; é o mesmo passo do `publicar.yml` | não |
| `node coleta/corte-aberta.mjs --autoteste` | leitura dos CSVs do Corte Aberta | não |
| `node coleta/boletins-nugepnac.mjs --autoteste` | os jeitos de citar tema e o casamento notícia–boletim | não |
| `node coleta/jurisprudencia-stf.mjs --autoteste` | endereço, seletores e total da segunda via do STF | não |
| `node coleta/conferir-cadeia.mjs` | o remendo do certificado do STF | sim |
| `node coleta/complemento.mjs --sem-enviar` | a coleta completa, mostrando o que mudaria, sem enviar | sim |
| `node coleta/monitorar.mjs` | o veredito do vigia para hoje (sem `GITHUB_TOKEN`, não abre issue) | não |

Para ver o site localmente: `npx --yes serve site` (porta 3000),
`node coleta/servir.mjs` (porta 8777) ou a configuração de prévia do
`.claude/launch.json` (porta 4173).

## Pendências em aberto

Levantadas das entradas de 12/09/2026 do [HISTORICO.md](HISTORICO.md), que as
dão como ainda abertas. Pendências de entradas anteriores não foram reavaliadas
nesta consolidação: quem fechar ou achar uma, atualiza esta lista.

- **Segredos do espelho** (`ESPELHO_URL` e `ESPELHO_CHAVE`) — com Sarah.
- **Aviso à Turma Recursal** sobre os valores que não são data ("20", "139"…)
  nas colunas de julgamento e trânsito da planilha de IUJ — com Sarah.
- **Trânsito em julgado e publicação do acórdão de mérito do STF** — sem fonte
  automática: nem a tabela de temas nem o Corte Aberta os trazem. Hoje vale o
  link "Fonte oficial".
- **NUGEPNAC, horizonte de um ano** — tema cujo último boletim seja mais antigo
  fica sem o campo até uma varredura com `--desde`.
- **NUGEPNAC, categoria da notícia** ("Suspensão Nacional", "Prorrogação de
  Suspensão") só aparece no relatório da execução; poderia ir para a ficha.

## Regra permanente de atualização

A documentação do projeto fica em dois arquivos:

- **README.md** (este) — o estado atual, em regras: requisitos, arquitetura,
  dados, operação, conferências e pendências em aberto.
- **[HISTORICO.md](HISTORICO.md)** — o registro datado de cada alteração, da
  mais recente para a mais antiga.

A cada alteração, na mesma entrega: atualize as seções afetadas deste README
(inclusive "Antes de alterar", o inventário e as pendências em aberto) e
acrescente uma entrada datada **no topo** do HISTORICO.md, com responsável,
motivo, arquivos, validação, efeito nos dados e na implantação, e pendências.
Medições, episódios e justificativas longas vão para o histórico; aqui fica a
regra que resultou deles, com remissão à entrada.

Distinga sempre implementação local, teste com amostras, consulta real às fontes
e publicação. Não registre resultado simulado como confirmação oficial. Não
inclua credenciais, cookies ou tokens em nenhum dos dois arquivos.
