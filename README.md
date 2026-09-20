# Busca Busca

Precedentes / incidentes / informativos

Buscador de precedentes qualificados para os Juizados Especiais Cíveis, Criminais
e da Fazenda Pública do TJMG: IRDR, IUJ, IAC, grupos de representativos, temas
repetitivos do STJ, repercussão geral do STF e os informativos dos dois
tribunais superiores.

O objetivo prático é responder rápido a uma pergunta: **este tema tem ordem de
suspensão que alcança o processo que estou para sentenciar?**

Endereço: **https://scarolrsf.github.io/busca-busca/**

Este arquivo é a única documentação pública do estado atual do projeto:
requisitos, arquitetura, dados, operação, validações e pendências.

## Sumário

- [Como funciona](#como-funciona) — peças e inventário de arquivos
- [Coleta](#coleta) — agendada e complementar
- [As fontes](#as-fontes) — como cada tribunal é lido e o que fazer quando falha
- [O que é base e o que é derivado](#o-que-é-base-e-o-que-é-derivado)
- [Regra de suspensão](#regra-de-suspensão) — a partir de quando e até quando
- [Publicar](#publicar)
- [Conferências](#conferências)
- [Pendências em aberto](#pendências-em-aberto)

## Como funciona

| Peça | Onde roda | Quando |
| --- | --- | --- |
| Coleta nas fontes oficiais | GitHub Actions | 6h07 e 18h07, horário de Brasília |
| Vigia da coleta | GitHub Actions | 9h e 21h, horário de Brasília |
| Segunda via gerenciada | Zyte, chamada pela coleta | só depois de 403 no acesso direto |
| Base de dados | JSON versionado em `dados/` | a cada coleta |
| Site | GitHub Pages | a cada envio e ao fim de cada coleta com êxito |

A coleta e o site usam a gratuidade do GitHub para repositório público. A
segunda via gerenciada é serviço medido por uso; seu corpo continua sendo lido
e validado no Actions, porque a planilha do STF chega a 62 MB descompactada e
não cabe no Apps Script nem num Worker. O site é estático — um HTML e um JSON —
servido por CDN.

O portal usa o mesmo desenho em qualquer largura; abaixo de 700 px a faixa do
topo quebra em duas linhas, o texto deixa de ser justificado, campos vão a
16 px e alvos de toque a 44 px.

Na listagem, cada resultado é uma caixa fechada por borda plena, separada das
vizinhas por 14 px, com 16/18 px de respiro interno e faixa de 4 px à esquerda
na cor do risco. O contorno é desenho, não sinal: o que alerta é a faixa.

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
  ambiente.mjs           rede, segundas vias, leitura de xlsx e armazenamento
  publicar.mjs           monta site/dados.json a partir da base e confere a regra
  conferir-regra.mjs     confere a regra de suspensão contra a base inteira
  conferir-fontes.mjs    mostra, no resumo da execução, quais fontes responderam
  conferir-cadeia.mjs    prova que o remendo do certificado do STF funciona
  monitorar.mjs          o vigia: abre issue quando a coleta pula ou uma fonte falha seguida
  jurisprudencia-stf.mjs diagnóstico manual da busca de jurisprudência do STF
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
AGENTS.md                instruções públicas de manutenção
LICENSE                  todos os direitos reservados

work/                    apoio, histórico e handoff locais; fora do repositório

.gitignore               exclui credenciais locais e saídas descartáveis de teste
```

## Coleta

### Agendada

`coletar.yml` roda às 6h07 e 18h07 e traz o que o GitHub alcança: TJMG sempre,
temas do STJ pelo espelho quando a fonte recusa, e Informativo do STJ e STF pela
Zyte depois de uma recusa direta.
`monitorar.yml`, às 9h e 21h, abre issue (e o GitHub manda e-mail) se não houver
commit de coleta no dia ou se a mesma fonte falhar nos dois últimos commits;
fecha a issue sozinho quando normaliza.

### À mão

```bash
node coleta/executar.mjs
```

Consulta as seis fontes, atualiza `dados/` e gera `site/dados.json`. Para ver o
site: `npx --yes serve site`.

### Complemento local de contingência

Dois cliques em **`coletar-aqui.cmd`** atualizam a pasta com o GitHub, consultam
os seis tribunais, mostram o que mudou e enviam. É contingência manual; não é
necessário para completar o STF na rotina. Se nada mudou, não envia. Se o envio
esbarrar numa coleta agendada, reencaixa e tenta uma vez; não dando, para e
avisa, com a coleta gravada aqui.

- Ver o que mudaria sem enviar: `node coleta/complemento.mjs --sem-enviar`.
- O commit começa com "Coleta de DD/MM/AAAA", como o da agendada; a origem vai
  no fim da mensagem.
- Não substitui a coleta agendada.

#### Todo dia, sozinho

A tarefa legada **`BuscaBusca-ColetaSTF`** do Agendador do Windows deve ficar
desligada agora que a coleta remota cobre o STF. `coleta/agendado.cmd` continua
disponível para contingência; antes da coleta, anota Corte Aberta e boletins do
NUGEPNAC e escreve o registro em `work/coleta-agendada.log`, fora do Git.

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
| STJ — informativos | HTML da edição corrente no host oficial SCON | direto; Zyte após 403 |
| TJMG — IRDR, IAC e GR | consulta paginada no RUPE, com cookie e POST | leitura de página |
| TJMG — IUJ | planilha de acompanhamento da Turma Recursal; a coleta exige a coluna ADMISSÃO no cabeçalho | arquivo oficial |
| STF — repercussão geral | tabela "Todos os temas" + lista com a marca de suspensão | direto; Zyte após 403 |
| STF — informativos | planilha oficial `Dados_InformativosSTF.xlsx` | direto; Zyte após 403 |

A leitura de página existe porque esses tribunais não publicam o dado de outro
jeito. O STF não tem API para temas e suspensão; a API interna da
jurisprudência e o DataJud foram avaliados e não servem. O que sustenta a
leitura é a conduta: dado público sem dado pessoal, duas consultas por dia, uma
requisição por vez, recusa respeitada, nada forjado — nenhum token falsificado,
nenhum desafio anti-robô resolvido por programa.

**Fontes complementares**, fora do fluxo da coleta:

- **Corte Aberta (STF)** — alimenta só "Suspensão nacional determinada em".
  Baixa pelo navegador local (`corte-aberta.mjs --baixar`) e
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
  403/404 encerram na primeira; o código HTTP viaja junto do erro.

### Espelho para o STJ

O host de dados abertos do STJ pode negar o endereço do GitHub Actions; pela
Cloudflare, aceita. O Worker em `espelho/` refaz esse pedido. O Informativo usa
o outro host oficial, `scon.stj.jus.br`, diretamente e, após 403, pela Zyte: o
antigo `processo.stj.jus.br` passou a negar também a saída da Cloudflare.

O espelho segue estas regras:

- **O direto vem sempre primeiro**; o espelho só entra depois de um 403.
- Só GET, só `processo.stj.jus.br` e `dadosabertos.web.stj.jus.br`, só com a
  chave combinada.
- Sem os segredos `ESPELHO_URL` e `ESPELHO_CHAVE`, a coleta age como se ele não
  existisse (caso da execução à mão e de fork).
- Se o espelho também falhar, o registrado é a recusa **da fonte**, com nota
  da segunda via.
- Não hospeda nada do portal; desligá-lo só volta o STJ a falhar no GitHub.

O endereço publicado fica somente no secret `ESPELHO_URL`. O Worker usa o plano
gratuito; para publicar ou trocar a chave, veja `espelho/wrangler.toml`.

### Segunda via pela Zyte

O runner do GitHub recebe 403 nos recursos do STF e às vezes no Informativo do
STJ. Depois dessa resposta, e só para a página exata do SCON, a tabela de temas,
a lista de suspensão, as fichas individuais de tese e a planilha de
Informativos do STF, `ambiente.mjs` pede o mesmo endereço à Zyte. A resposta
volta como corpo HTTP original: HTML e bytes do XLSX seguem para os mesmos
leitores da consulta direta.

- Sem `ZYTE_CHAVE`, a coleta age como se a segunda via não existisse.
- A Zyte não escreve no repositório e não interpreta o conteúdo jurídico.
- HTTP 200 sem a estrutura esperada continua sendo falha; a base anterior é
  preservada.
- A coleta completa de 13/09/2026 concluiu as seis fontes no runner: 1.482
  temas e 1.012 Informativos do STF, além de 15 Informativos do STJ. Nessa
  execução o SCON respondeu diretamente e a segunda via não foi necessária.

### Certificado do STF

Os endereços do STF omitem o certificado intermediário. Navegador e Windows o
buscam sozinhos; o curl no Linux, não. `ambiente.mjs` busca o elo à mão quando
o curl recusa e repete o pedido. Nenhum certificado fica no repositório.

Mesmo depois da correção da cadeia, o STF ainda responde 403 ao GitHub Actions;
nesse caso entra a segunda via acima. A correção TLS continua necessária para
a consulta direta local e para detectar honestamente se a recusa deixou de
existir.

### Diagnóstico da jurisprudência do STF pelo navegador

`coleta/jurisprudencia-stf.mjs` abre `jurisprudencia.stf.jus.br/pages/search`
num Chromium (Playwright), onde o WAF passa como num navegador comum.

- É uma ferramenta manual numa máquina cuja rede alcance a fonte. Não criar
  `JURISPRUDENCIA_STF` no repositório.
- Uso manual, sem tocar na base:
  `node coleta/jurisprudencia-stf.mjs --tema "fornecimento de medicamentos"`
  (também `--limite`, `--headless`, `--json-out`, `--autoteste`).
- O resultado opcional vai só para `dados/jurisprudencia-stf.json` (uma busca,
  3 fichas). Nunca entra em TEMAS, INFORMATIVOS ou FONTES — o grão é acórdão,
  não tema.
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
   o link "Fonte oficial" leva à ficha do tribunal.

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
quando a fonte se corrige e não geram "Novidades".

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

Para ver o site localmente: `npx --yes serve site` (porta 3000) ou
`node coleta/servir.mjs` (porta 8777).

## Pendências em aberto

Esta lista é a referência pública das pendências. Quem resolver ou encontrar
uma pendência deve atualizá-la no mesmo trabalho.

- **Aviso à Turma Recursal** sobre os valores que não são data ("20", "139"…)
  nas colunas de julgamento e trânsito da planilha de IUJ.
- **Trânsito em julgado e publicação do acórdão de mérito do STF** — sem fonte
  automática: nem a tabela de temas nem o Corte Aberta os trazem. Hoje vale o
  link "Fonte oficial".
- **NUGEPNAC, horizonte de um ano** — tema cujo último boletim seja mais antigo
  fica sem o campo até uma varredura com `--desde`.
- **NUGEPNAC, categoria da notícia** ("Suspensão Nacional", "Prorrogação de
  Suspensão") só aparece no relatório da execução; poderia ir para a ficha.
