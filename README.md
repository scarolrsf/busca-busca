# Busca Busca

Precedentes / incidentes / informativos

Buscador de precedentes qualificados para os Juizados Especiais Cíveis, Criminais
e da Fazenda Pública do TJMG: IRDR, IUJ, IAC, grupos de representativos, temas
repetitivos do STJ, repercussão geral do STF e os informativos dos dois
tribunais superiores.

O objetivo prático é responder rápido a uma pergunta: **este tema tem ordem de
suspensão que alcança o processo que estou para sentenciar?**

## Como funciona

Quatro peças, todas gratuitas:

| Peça | Onde roda | Quando |
| --- | --- | --- |
| Coleta nas fontes oficiais | GitHub Actions | 6h07 e 18h07, horário de Brasília |
| Vigia da coleta | GitHub Actions | 9h e 21h, horário de Brasília |
| Base de dados | arquivos JSON no próprio repositório | a cada coleta |
| Site | GitHub Pages | publica a cada alteração |

A coleta roda no GitHub Actions, e não num serviço menor, por um motivo
concreto: a lista de temas do STF tem 7,7 MB e a planilha de informativos tem
9 MB que viram 62 MB ao descompactar. Isso não cabe no Google Apps Script
(6 minutos por execução) nem num Cloudflare Worker (128 MB de memória).

O site é estático — um HTML e um JSON. O Pages serve por CDN e comprime o
`dados.json` de 8,5 MB para 1,4 MB na transferência, então o número de pessoas
acessando ao mesmo tempo não é problema.

O endereço é **https://scarolrsf.github.io/busca-busca/**.

```
site/            o que o GitHub Pages publica
   index.html     o portal inteiro: CSS e JS embutidos, sem dependências
   icone.svg      o logotipo reduzido ao que se lê a 16 pixels
   fontes/        IBM Plex Sans, IBM Plex Mono e Source Serif 4 em woff2,
                  servidas daqui para não requisitar ao Google (LGPD)
   dados.json     derivado de dados/ na publicação; não versionado

coleta/
  executar.mjs       orquestra a coleta
  regras.js          uma regra de leitura por fonte oficial
  ambiente.mjs       rede, leitura de xlsx e armazenamento
  publicar.mjs       monta site/dados.json a partir da base
  conferir-regra.mjs confere a regra de suspensão contra a base inteira
  conferir-fontes.mjs mostra, no resumo da execução, quais fontes responderam
  conferir-cadeia.mjs prova que o remendo do certificado do STF funciona
  jurisprudencia-stf.mjs segunda via do STF pelo navegador (desligada por padrão)

espelho/         segunda via para o STJ, publicada na Cloudflare
  worker.js      refaz o pedido, só GET, só os dois endereços do STJ
  wrangler.toml  como publicar e quais segredos o repositório espera

dados/           a base entre uma coleta e outra, versionada
  temas-do-portal.json         precedentes e incidentes
  informativos-do-portal.json  julgados divulgados em informativo
  alteracoes.json              o que mudou, linha a linha
  fontes.json                  situação da última consulta a cada fonte
  conferencia.json             quando cada origem foi lida pela última vez
work/            apoio local, fora do repositório (ver .gitignore)
.claude/
  launch.json    atalho de prévia local: sobe `serve site` na porta 4173
```

### No telefone

O portal é consultado no meio do expediente, e às vezes da tela do celular. O
desenho parte da mesma folha em qualquer largura — não há versão reduzida do
conteúdo, nem página separada —, mas abaixo de 700 px três coisas mudam:

- **A faixa do topo quebra em duas linhas.** Marca e preferências dividem a
  primeira; a busca, que é o que mais se usa no telefone, ocupa a segunda
  inteira. Em uma linha só ela pedia 503 px de largura mínima, e o excedente
  empurrava a página para o lado: o texto saía pela direita e era preciso
  arrastar na horizontal para ler cada linha.
- **O texto deixa de ser justificado.** Numa coluna de 350 px a justificação
  abre rios de espaço branco entre as palavras, e nem a hifenização os fecha.
- **Os campos de digitação vão a 16 px e os alvos de toque a 44 px.** O Safari
  do iPhone dá zoom em qualquer campo com fonte menor que 16 px, e sair do zoom
  depois é manual. Os 44 px são o mínimo confortável para o dedo — mais
  generoso que os 24 px que o WCAG exige do ponteiro.

Abaixo de 540 px o subtítulo da marca sai: ele repete o que as abas já dizem. E
com o telefone deitado a faixa do topo deixa de ser fixa, porque ali ela comeria
dois quintos da altura da tela.

## Rodar a coleta à mão

```bash
node coleta/executar.mjs
```

Consulta as seis fontes, atualiza `dados/` e gera `site/dados.json`. Depois:

```bash
npx --yes serve site
```

## As seis fontes

| Fonte | Como é lida |
| --- | --- |
| STJ — temas e processos | CSV de dados abertos |
| STJ — informativos | HTML da edição corrente |
| TJMG — IRDR, IAC e GR | consulta paginada no RUPE, com cookie e POST |
| TJMG — IUJ | planilha de acompanhamento da Turma Recursal |
| STF — repercussão geral | tabela "Todos os temas" + lista com a marca de suspensão |
| STF — informativos | planilha oficial de dados do Informativo |

Quando uma fonte não responde, **nada é apagado**: os registros dela continuam
sendo os da última consulta bem-sucedida, a falha é anotada, e a aba "Fontes e
atualização" mostra um ponto vermelho. O portal nunca apresenta dado velho como
recém-conferido.

### Quando o tribunal oscila

Os portais oscilam, e nem toda oscilação se parece com erro. O do STF, quando
está sobrecarregado, responde **200 com uma página de erro sem a tabela**, em
meio segundo: para o curl é sucesso; só o leitor percebe que não veio o que foi
pedido. Por isso a repetição acontece em dois níveis:

- Em `ambiente.mjs`, na requisição: três tentativas para erro de rede, tempo
  esgotado, 429 e 5xx, com pausa crescente. Um 403 ou 404 não é repetido — é
  resposta, não soluço.
- Em `regras.js`, em volta da fonte inteira: três tentativas de buscar,
  reconhecer e comparar. É esse nível que salva o caso do 200 com página errada,
  e vale para as seis fontes. Aqui também um 403 ou 404 encerra a fonte na
  primeira tentativa: o código HTTP viaja junto do erro, e só 408, 429 e 5xx
  são repetidos.

Uma falha sem código — rede, tempo esgotado, página irreconhecível — só é dada
como falha depois das três tentativas. Uma resposta de recusa é registrada na
hora. O que fica anotado é o último erro, e o detalhe da fonte diz quantas
tentativas houve.

Insistir em quem recusa não é neutro: o portal com firewall conta as batidas.
Em 11/09/2026, três fontes bloqueadas vezes três tentativas, em duas execuções
seguidas, derrubaram também a quarta, que até então respondia.

### Espelho para o STJ

O STJ nega o endereço de saída do GitHub Actions — ora com desafio anti-robô,
ora com 403 seco. Medido em 11/09/2026, o mesmo pedido feito da rede da
Cloudflare passa e devolve o arquivo inteiro. Daí o espelho: um Worker gratuito
que refaz o pedido.

**O direto vem sempre primeiro.** O espelho não é rota alternativa nem contorno
preventivo: ele só entra depois de um 403 já recebido, e só para
`processo.stj.jus.br` e `dadosabertos.web.stj.jus.br`. Quando a fonte responde,
o Worker nem é tocado.

O STF não está na lista, e não é esquecimento: pela Cloudflare ele devolve 526,
porque omite o intermediário da cadeia (ver adiante). O remendo que resolve isso
mora no `ambiente.mjs`, e um Worker não tem como reproduzi-lo — `fetch` ali não
aceita âncora própria.

Não é um proxy aberto: só GET, só aqueles dois endereços, e só com a chave
combinada. Sem as duas variáveis configuradas — `ESPELHO_URL` e
`ESPELHO_CHAVE`, ambas segredos do repositório — a coleta se comporta
exatamente como se o espelho não existisse. É o caso de quem roda à mão e o de
um fork. Para publicar ou trocar a chave, ver `espelho/wrangler.toml`.

Se o espelho também não trouxer, o que fica registrado em `dados/fontes.json` é
a recusa **da fonte**, com uma nota de que a segunda via também falhou. A
mensagem do espelho nunca toma o lugar da resposta do tribunal.

### Segunda via do STF: a jurisprudência pelo navegador

O portal antigo do STF nega o endereço do GitHub Actions com 403, e aí nem o
remendo de certificado nem o espelho alcançam: o obstáculo é o firewall, não a
cadeia (o espelho devolveria 526). A saída, medida em 11/09/2026, é outra porta
do mesmo tribunal — a pesquisa de jurisprudência
(`jurisprudencia.stf.jus.br/pages/search`) — aberta num Chromium de verdade,
onde o desafio do WAF se resolve sozinho como num navegador comum. Com o tema
"fornecimento de medicamentos" vieram 961 resultados, com os três primeiros
extraídos por inteiro (RE 605533/Tema 262, RE 657718/Tema 500 e RE
1366243/Tema 1234).

**Desligada por padrão.** Exige Playwright com Chromium, que o runner
agendado não tem, e navegador pede volume baixo. Por isso ela só roda com
`JURISPRUDENCIA_STF=1` (variável do repositório, já passada à coleta no
`coletar.yml`), numa execução à mão — em geral a da máquina da Sarah, de onde
o STF responde. Sem a variável, a coleta se comporta exatamente como antes.

Quando ligada, roda uma prova de vida limitada (uma busca, 3 fichas): o
resultado bruto e a situação da tentativa ficam em
`dados/jurisprudencia-stf.json`, e só ali. Nada disso entra em TEMAS, em
INFORMATIVOS nem em FONTES — o grão é outro (acórdãos, não temas de
repercussão geral), e uma sétima linha em FONTES apareceria ao leitor como
fonte do portal com data velha, além de o vigia a ler como fonte falhando há
duas janelas e abrir issue todo dia por causa de uma prova opcional. Uma falha
aqui nunca derruba a coleta: anota-se no arquivo da prova e segue. Se o WAF
bloquear, o módulo para e orienta o uso manual, sem insistir.

Dois detalhes que a medição corrigiu e valem para qualquer uso futuro: o
parâmetro real da busca é `queryString` (um endereço montado com `termo=` abre
a página mas não busca nada), e a extração lê `div.result-container` com
`p.jud-text` na ordem ementa, tema, tese. O `coleta/jurisprudencia-stf.mjs`
também roda sozinho (`--tema`, `--limite`, `--headless`, `--json-out`) e traz
um `--autoteste` sem rede que confere endereço, seletores e total.

### Certificado do STF

Os dois endereços do STF enviam só o certificado deles e omitem o intermediário
que os encadeia a uma autoridade confiável. Navegador e Windows disfarçam o
defeito, porque buscam sozinhos o elo que falta no endereço que o próprio
certificado indica. O curl no Linux não busca — por isso a coleta funcionava na
máquina da Sarah e falhava no GitHub Actions. O `coleta/ambiente.mjs` faz essa
busca à mão quando o curl recusa o certificado, e repete a requisição. Nenhum
certificado fica gravado no repositório, então a troca periódica do
intermediário não cobra manutenção.

### O que foi preciso para o STF

1. **Temas.** `jurisprudenciaRepercussao/todostemas.asp` devolve o cadastro
   inteiro numa única tabela. A descrição da controvérsia e a lista de assuntos
   não aparecem na tela: ficam nos atributos `title` dos tooltips "Ver Descrição"
   e "Ver Assuntos".
2. **Teses.** Não vêm nessa tabela. Cada tema tem uma página curta
   (`verTeseTema.asp`). São cerca de 1.300, então cada execução completa no
   máximo `PILOTO.stfTesesPorExecucao` teses que ainda faltam. Em poucos dias a
   coluna fecha e, depois, só temas novos geram requisição.
3. **Informativos.** O endereço em HTML por edição saiu do ar. O que existe é a
   planilha oficial `Dados_InformativosSTF.xlsx`. São importadas as edições a
   partir de `PILOTO.stfInfoEdicaoMinima`.
4. **Suspensão nacional.** O portal do STF só a mostra em painel interativo e na
   ficha de cada leading case — 2,6 MB por tema, sem suporte a `Range`. A saída
   está na lista de resultados da pesquisa de repercussão geral
   (`listarProcesso.asp`), que traz a mesma marca ao lado da situação de cada
   tema e devolve o cadastro inteiro numa requisição.

## O que é base e o que é derivado

O repositório guarda **uma coisa só**: a base em `dados/`. Tudo que o site lê é
derivado dela por `coleta/publicar.mjs`, no momento de publicar.

Isso não é preciosismo de arquitetura. O `site/dados.json` é minificado numa
linha só; versioná-lo fazia o Git gravar 1,7 MB inteiros a cada coleta, porque
não há como guardar a diferença de uma linha que mudou por inteiro. A duas
coletas por dia, isso é mais de 1 GB por ano de repositório.

Pela mesma razão, a data de conferência não fica em cada registro. Ela é o
instante em que a fonte foi lida — o mesmo para todos os registros daquela
fonte —, e mora em `dados/conferencia.json`, uma linha por origem. O campo só
reaparece dentro de um registro como exceção: quando ele **some da fonte**, a
data dele para ali, em vez de continuar acompanhando uma fonte que já não o
traz. `publicar.mjs` devolve o campo na montagem, então a ficha continua
mostrando quando aquele registro foi conferido pela última vez.

Efeito colateral útil: `conferencia.json` muda a cada coleta, ainda que nada
mais mude. Isso mantém o repositório ativo, e o GitHub desliga workflow agendado
em repositório parado por 60 dias.

## Até quando vale a suspensão

Não é o trânsito em julgado que a encerra, e o marco muda conforme o rito:

- **Repetitivo e repercussão geral** — publicado o acórdão paradigma, os
  processos sobrestados retomam o curso (art. 1.040, III, do CPC). A eficácia
  vinculante começa na publicação.
- **IRDR e correlatos** — cessa se não for interposto recurso especial ou
  extraordinário contra o acórdão do incidente (art. 982, § 5º). Interposto, o
  recurso tem efeito suspensivo por lei (art. 987, § 1º) e a suspensão persiste
  até o julgamento desse recurso, também sem aguardar o trânsito.
- **Cláusula expressa** em sentido diverso prevalece sobre a regra geral.

Essa regra vive num lugar só — as funções de classificação do `site/index.html` —
e é aplicada a todo registro no momento de exibir. A cada coleta,
`coleta/conferir-regra.mjs` carrega essas mesmas funções e as roda sobre a base
inteira, conferindo cinco invariantes. Uma atualização que quebre a regra faz a
coleta falhar em vez de chegar à tela.

## Publicar

O site é publicado pelo GitHub Pages a cada alteração no repositório, pelo
workflow `publicar.yml`. O `site/dados.json` é versionado pela própria coleta,
então não há passo de build: qualquer hospedagem estática publica a pasta
`site` como está.

A Cloudflare Pages continua sendo uma alternativa, caso um dia se queira domínio
próprio — build command vazio, output directory `site`. Não está em uso.

A coleta precisa de permissão de escrita no repositório, já declarada no
workflow (`permissions: contents: write`).

## Regra permanente de atualização deste documento

Este README é o documento único do projeto: requisitos, arquitetura, dados,
operação, pendências e histórico. A cada alteração, atualize na mesma entrega as
seções afetadas e acrescente uma entrada datada abaixo, com responsável, motivo,
arquivos, validação, efeito nos dados e na implantação, e pendências.

Distinga sempre implementação local, teste com amostras, consulta real às fontes
e publicação. Não registre resultado simulado como confirmação oficial. Não
inclua credenciais, cookies ou tokens aqui.

## Histórico

### 11/09/2026 — Segunda via do STF pelo navegador, desligada por padrão

**Responsável:** Muse Spark, a pedido de Sarah (aplicar as mudanças do Claude
Code, já neste repositório, juntamente com o protótipo validado da sessão
compartilhada `opncd.ai/share/J87fpcTn`).

**Motivo.** O STF nega o GitHub Actions com 403 nas duas fontes atuais, e as
duas segundas vias existentes não o alcançam: o remendo de certificado resolve
cadeia, não firewall, e o espelho devolveria 526 pelo mesmo defeito de cadeia.
Na sessão compartilhada foi medida e validada outra porta do mesmo tribunal —
a pesquisa de jurisprudência num Chromium real, onde o WAF se resolve sozinho
— com 961 resultados para "fornecimento de medicamentos" e três fichas
extraídas por inteiro. Esse conhecimento estava num protótipo Python fora do
repositório; precisava morar na coleta oficial, sem mudar o comportamento
agendado.

**O que mudou.**

- `coleta/jurisprudencia-stf.mjs` (novo): a via portada para Node, sem
  dependência nova (o Playwright só é exigido na hora de navegar, via import
  dinâmico). Traz o endereço de conferência manual (`queryString`, não
  `termo=`), os seletores mapeados (`div.result-container`, `p.jud-text` na
  ordem ementa/tema/tese, selo `app-badge`, total por regex), a busca via
  interface com espera ao WAF, o atalho manual do SCON/STJ e um `--autoteste`
  sem rede.
- `coleta/executar.mjs`: quando `JURISPRUDENCIA_STF=1`, roda uma prova de vida
  limitada (uma busca, 3 fichas) e guarda o bruto e a situação da tentativa em
  `dados/jurisprudencia-stf.json`, sem tocar em FONTES (uma sétima linha ali
  confundiria o painel das seis fontes e acionaria o vigia à toa). Sem a
  variável, nada muda. A chamada vem depois das declarações, de propósito:
  `const` não sobe como `function`, e chamar antes derrubou a coleta inteira
  na primeira tentativa — justamente o que este trecho promete nunca fazer.
  Falha aqui nunca derruba a coleta.
- `.github/workflows/coletar.yml`: repassa `JURISPRUDENCIA_STF` (variável do
  repositório; vazia por padrão, logo desligada).
- `README.md`: inventário, nova seção "Segunda via do STF" e esta entrada.

**Validação.** `node --check` nos dois arquivos tocados e
`node coleta/jurisprudencia-stf.mjs --autoteste`: 9 verificações, todas
passaram, sem rede e sem navegador. Na sequência, dois acertos em trabalho
concorrente: `.first` virou `.first()` (no Playwright JS é método; o
protótipo Python usava propriedade — era esse o erro que a primeira prova
escondia atrás da queda acima) e o registro da prova saiu de FONTES para o
próprio arquivo dela. Com isso, a primeira prova de vida real passou nesta
máquina: WAF liberou, total "961", 3 fichas (RE 605533/sjur418770, RE
657718/sjur436062, RE 1366243/sjur514534), guardadas em
`dados/jurisprudencia-stf.json`.

Depois de conciliado, o resultado publicado foi exercitado de novo, com os
coletores e a publicação neutralizados: desligada, a prova não roda e não
escreve nada; ligada com o navegador indisponível, ela anota "Prova falhou" no
arquivo da prova, a coleta segue e o processo sai com 0; em nenhum dos dois
`fontes.json` é tocado. A queda por ordem de declaração foi reproduzida à parte
antes do conserto, para confirmar que derrubava mesmo o processo inteiro.

**Dados.** A base ganhou `dados/jurisprudencia-stf.json` (bruto da prova, fora
do `publicar.mjs`); TEMAS, INFORMATIVOS e FONTES seguem o regime das seis
fontes, sem linha nova.

**Pendências.** Definir `JURISPRUDENCIA_STF=1` nas variáveis do repositório ou
só na execução manual, para as próximas provas. O Playwright com Chromium já
está instalado nesta máquina (`npm i playwright --no-save`, fora do
versionamento). As mudanças do Claude Code seguem intactas como base — esta
entrega só soma a via nova, com o acerto concorrente conciliado sem
sobrescrever.

### 11/09/2026 — Espelho para o STJ: o direto primeiro, a Cloudflare no 403

**Responsável:** Muse Spark, a pedido de Sarah (escolheu o espelho depois da
medição, para tirar o STJ da dependência de a máquina dela estar ligada).

**Motivo.** Medido na entrega anterior: o STJ responde 200 pela rede da
Cloudflare, inclusive com o desafio anti-robô ausente e o CSV no tamanho certo.
O STF não, e por isso não entra.

**O que mudou.**

- `espelho/worker.js` (novo): Worker que refaz o pedido. Só GET, só
  `processo.stj.jus.br` e `dadosabertos.web.stj.jus.br`, e só com a chave
  combinada no cabeçalho `x-espelho-chave`. O corpo volta como veio — o
  informativo do STJ é ISO-8859-1, e quem decide a codificação é quem lê.
- `espelho/wrangler.toml` (novo): como publicar e quais segredos o repositório
  espera.
- `coleta/ambiente.mjs`: depois de um 403 — e só depois dele —, se o endereço
  estiver na lista e os dois segredos existirem, o pedido é refeito pelo
  espelho. Deu 200, segue a vida; não deu, o que se registra é a recusa da
  fonte, acrescida de uma nota sobre a segunda via.
- `.github/workflows/coletar.yml`: passa `ESPELHO_URL` e `ESPELHO_CHAVE` à
  coleta.

**Validação.** Local, com uma fonte falsa e um espelho falso em outro processo
(a coleta é síncrona e bloquearia servidores no mesmo processo). Cinco casos:
403 na fonte com espelho atendendo → HTTP 200, conteúdo do espelho, 1 batida em
cada e a chave chegando; 403 nos dois → a recusa registrada é a da fonte, com a
nota; fonte respondendo 200 → espelho não tocado; endereço fora da lista →
espelho não tocado; sem segredos → espelho não tocado. Nenhuma consulta real ao
STJ foi feita por esta entrega. O Worker ainda **não está publicado**: enquanto
não estiver, os segredos não existem e a coleta roda como antes.

**Dados.** Nenhuma mudança na base nem no site.

**Pendências.** Publicar o Worker (`npx wrangler login`, `secret put CHAVE`,
`deploy`) e cadastrar `ESPELHO_URL` e `ESPELHO_CHAVE` nos segredos do
repositório. Só então a segunda via passa a valer, e a confirmação real vem na
janela de coleta seguinte. O STF continua sem segunda via.

### 11/09/2026 — Medição: o espelho na Cloudflare cobre o STJ, não o STF

**Responsável:** Muse Spark, a pedido de Sarah (decidiu testar antes de montar).

**Motivo.** Com STF e STJ negando o endereço do GitHub Actions, a pergunta era
se dá para tentar primeiro pelo GitHub e, no 403, cair para uma segunda via.
Entre as candidatas, a única automática era um espelho: um Worker gratuito da
Cloudflare refazendo a requisição, de forma que a saída fosse por IP deles. Em
vez de montar e descobrir depois, foi medido.

**Como foi medido.** Um Worker de teste, no Playground da Cloudflare — que
executa na borda deles sem exigir conta —, buscando as cinco URLs em questão.
Não foi criada conta, nem publicado Worker, nem alterado nada no repositório.

**O que se mediu.**

| Fonte | GitHub Actions | Espelho Cloudflare | Máquina da Sarah |
| --- | --- | --- | --- |
| STJ — temas (CSV) | 403 intermitente | **200**, 2.578.086 bytes | 200 |
| STJ — informativos | 403 (desafio anti-robô) | **200** | 200 |
| STF — repercussão geral | 403 | **526** | 200 |
| STF — informativos (página) | 403 | **526** | 200 |
| STF — informativos (planilha) | — | **526** | 200 |

O CSV do STJ veio pelo espelho com exatamente o mesmo tamanho que vem da
máquina da Sarah, então é conteúdo, não página de erro. E o desafio anti-robô
do STJ, que eu esperava ver de pé, não apareceu.

**Por que o STF não passa.** O 526 da Cloudflare é *certificado inválido* — não
é bloqueio. É o mesmo defeito da seção "Certificado do STF": o portal omite o
intermediário. O `ambiente.mjs` remenda isso buscando o elo que falta e
repetindo a requisição; um Worker não tem como, porque `fetch()` no Workers não
aceita âncora própria nem ignora a verificação. O remendo que salvou o STF no
GitHub Actions é justamente o que um espelho não consegue reproduzir. A
conferência de cadeia do próprio projeto (`conferir-cadeia.mjs`) foi rodada no
mesmo momento e passou nas cinco verificações, confirmando a leitura.

**Conclusão.** O espelho cobriria 2 das 4 fontes caídas, ao custo de conta na
Cloudflare, Worker publicado, segredo no GitHub e uma peça nova para manter — e
o STF continuaria dependendo de outra via. Recomendação registrada: uma via
alternativa só, a da máquina da Sarah, que cobre as quatro e reaproveita o
remendo de certificado que já existe. Decisão de Sarah, ainda em aberto.

**Confirmação em produção da entrega anterior.** A coleta das 6h40 (commit
`671b8b3`) foi a primeira depois da mudança na repetição. As três fontes
bloqueadas registraram "Em 1 tentativa", como desenhado, e o **STJ — temas
voltou a responder** — o que sustenta a hipótese de que eram as batidas
repetidas que o empurravam para dentro do bloqueio.

**Arquivos.** Nenhum alterado além deste README.

**Dados.** Nenhuma mudança na base nem no site.

**Pendências.** Escolher a segunda via. Enquanto não houver, STF (duas fontes)
e STJ — informativos seguem com os registros da última consulta bem-sucedida.

### 11/09/2026 — Quem recusa não é repetido: fim das três batidas no 403

**Responsável:** Muse Spark, a pedido de Sarah (após a leitura dos avisos da
coleta das 6h).

**Motivo.** As duas execuções manuais da manhã terminaram em verde com avisos.
Na primeira (commit `2bf8aa4`), três fontes responderam HTTP 403: STJ —
informativos (desafio de verificação automática), STF — repercussão geral e
STF — informativos (`403 Forbidden` puro). Na segunda, dois minutos depois
(commit `984e7bd`), o STJ — temas e processos, que respondera na primeira,
também passou a 403, com a página "oops! Página não encontrada" do portal —
assinatura de firewall, não de endereço errado. Restaram as duas fontes do
TJMG.

As quatro URLs foram conferidas da máquina da Sarah no mesmo momento e
responderam **200** — inclusive o CSV de dados abertos do STJ, com 2,5 MB. O
bloqueio é do endereço de saída do GitHub Actions, não das fontes nem do
reconhecimento. Duas notas relacionadas: no STF o erro mudou de natureza — era
`curl (60) SSL certificate problem` e passou a 403, ou seja, o remendo de
âncora de certificado funcionou e o obstáculo agora é outro; e a repetição em
volta da fonte batia três vezes mesmo em 403, o que ajuda a explicar por que o
STJ, alvo de nove requisições em três minutos, acabou entrando no bloqueio.

**O que mudou.** A repetição passa a distinguir soluço de recusa.

- `ambiente.mjs`: o erro de resposta não-200 leva junto o código HTTP
  (`erro.codigoHttp`). Sem isso, quem repete só tinha a mensagem em texto.
- `regras.js`: novo `vaiAdiantarRepetirFonte_`. Erro sem código (rede, tempo
  esgotado, página irreconhecível, 200 com página errada) continua com três
  tentativas; 408, 429 e 5xx também. Um 403 ou 404 encerra a fonte na primeira.
  O detalhe gravado passa a dizer o número real de tentativas ("Em 1
  tentativa:" / "Em 3 tentativas:").

O efeito prático: uma fonte bloqueada custa 1 requisição por execução em vez de
3, e a coleta não gasta 15 s de espera por fonte recusada. A proteção que
existia continua inteira — é ela que salva o caso do STF que responde 200 com
página de erro, e esse caso não traz código.

**Arquivos.** `coleta/ambiente.mjs`, `coleta/regras.js`, `README.md` (seção
"Quando o tribunal oscila").

**Validação.** Local, sem tocar na base. Seis casos exercitados contra
`executarFonte_` com o ambiente simulado: 403 e 404 → 1 tentativa, 0 esperas;
429, 503, "200 com página errada" e falha de rede → 3 tentativas, 2 esperas;
sucesso na 2ª tentativa após falha sem código → "Consulta concluída". Depois,
o caminho real e completo, com o erro nascendo em `ambiente.mjs` e sendo lido
dentro do `vm` de `regras.js`: um 404 verdadeiro (página inexistente no GitHub)
resultou em **1 requisição** e no registro "Em 1 tentativa: A fonte respondeu
HTTP 404". Nenhuma consulta real às seis fontes foi disparada por esta
entrega — a próxima janela de coleta é a primeira confirmação em produção.

**Dados.** Nenhuma mudança na base nem no site. O que muda é quantas vezes uma
fonte recusada é consultada e o texto do detalhe em `dados/fontes.json`.

**Pendências.** O bloqueio em si continua: STF (duas fontes) e STJ —
informativos seguem sem resposta a partir do GitHub Actions, com os registros
da última consulta bem-sucedida preservados. Esta entrega reduz o dano e para
de agravá-lo; não restabelece o acesso. Os caminhos que restam são espaçar as
fontes do mesmo host dentro da execução ou coletar essas fontes de fora do
GitHub — decisão de Sarah.

### 11/09/2026 — Vigia da coleta: issue e e-mail quando a janela pula

**Responsável:** Muse Spark, a pedido de Sarah (a coleta das 6h07 de hoje não
rodou e nada avisou).

**Motivo.** Uma coleta pulada não commita, então é silenciosa: o agendador do
GitHub é de melhor esforço e às vezes atrasa horas ou pula a execução. A
causa de hoje não está no `coletar.yml` (agendamento intacto) nem na plataforma
(status operacional, sem incidentes) — foi o agendador.

**O que mudou.** Novo `coleta/monitorar.mjs` + workflow `monitorar.yml`, às 9h
e às 21h de Brasília (~3h de margem para os atrasos normais). Duas
verificações, sobre a data de hoje em horário de Brasília:

1. Existe commit "Coleta de DD/MM/AAAA"? Se não, a janela pulou — abre issue.
2. Alguma fonte falha nos dois últimos commits de coleta? Uma falha isolada
   é soluço e se resolve sozinha (o resumo da execução já avisa); só vira
   issue quando persiste há ~12h.

Com issue aberta, o trabalho termina em falha — a falha manda também o e-mail
do GitHub. Quando normaliza, a issue fecha sozinha; se já houver issue aberta
para o caso, nada é duplicado. Sem `GITHUB_TOKEN` (rodando à mão), só diz o
veredito; `DATA_ESPERADA` permite testar a detecção contra outro dia.

**Arquivos.** `coleta/monitorar.mjs` (novo), `.github/workflows/monitorar.yml`
(novo), `README.md` (tabela "Como funciona" passa a quatro peças).

**Validação.** Detecção exercitada localmente: hoje (11/09) acusa a falta do
commit (saída 1) e, com `DATA_ESPERADA=10/09/2026`, acusa normalidade (saída
0). Após o rebase, contra o histórico real: commit de hoje encontrado e 3
fontes persistentes detectadas (STJ informativos, STF repercussão geral e STF
informativos — STJ temas falhou só na última e ficou de fora, como desenhado).
A criação de issue só acontece no Actions (`issues: write`) — primeira
confirmação real na próxima janela.

**Dados.** Nenhuma mudança na coleta nem na base.

**Pendências.** A janela das 6h afinal rodou (06h17 e 06h19, com atraso) —
o disparo manual ficou desnecessário. Segue em aberto a confirmação real do
monitor na próxima janela.

### 10/09/2026 — Reversão do limite de 68ch no texto jurídico

**Responsável:** Muse Spark, a pedido de Sarah.

**Motivo.** O `max-width:68ch` do polimento visual deixava os parágrafos do
guia (ex. "Até quando vale a suspensão") terminando antes da borda da seção,
com faixa vazia à direita. O aproveitamento da largura importa mais que a
medida de leitura aqui.

**O que mudou.** Em `site/index.html`: removido o `max-width` do
`.texto-juridico`, voltando a ocupar a seção toda. O restante do polimento
(hovers, seleção, pulso, pop da estrela, scrollbar) continua.

**Arquivos.** `site/index.html`, `README.md`.

**Validação.** `node coleta/publicar.mjs` passa com a base intacta e a
conferência da regra de suspensão verde.

**Dados.** Nenhuma mudança na coleta nem na base.

**Pendências.** Nenhuma nova.

### 10/09/2026 — Arquivo LICENSE: todos os direitos reservados

**Responsável:** Muse Spark, a pedido de Sarah (proteger a autoria, após a
pesquisa sobre registro no INPI).

**Motivo.** O repositório precisa continuar público (exigência do GitHub Pages
gratuito), e público sem licença gera ambiguidade sobre reuso. Sarah escolheu
reter todos os direitos.

**O que mudou.** Novo `LICENSE` na raiz: titularidade exclusiva de Sarah
Carolina (Leis 9.610/98 e 9.609/98), permitindo só visualização e consulta;
qualquer outro uso depende de autorização expressa. Exceção registrada no
próprio arquivo: as fontes em `site/fontes/` seguem a SIL OFL de seus autores.

**Arquivos.** `LICENSE` (novo), `README.md`.

**Validação.** Arquivo texto lido após gravação; nenhuma mudança em código,
coleta ou base — `publicar.mjs` já validado na entrega anterior e o HTML não
foi tocado desta vez.

**Dados.** Nenhuma mudança na coleta nem na base.

**Pendências.** Registro do programa no INPI (e-Software), a cargo de Sarah.

### 10/09/2026 — © no rodapé

**Responsável:** Muse Spark, a pedido de Sarah.

**Motivo.** Assinar a autoria no próprio portal, passo imediato da proteção
decidida na conversa sobre copyright (o registro formal no INPI fica como
passo seguinte, fora do código).

**O que mudou.** Em `site/index.html`: a linha do rodapé passa a
"© 2026 — Projeto por Sarah Carolina". Só texto, na classe `.credito` já
criada.

**Arquivos.** `site/index.html`, `README.md`.

**Validação.** `node coleta/publicar.mjs` passa com a base intacta e a
conferência da regra de suspensão verde.

**Dados.** Nenhuma mudança na coleta nem na base.

**Pendências.** Registro do programa no INPI (e-Software) e decisão sobre
arquivo LICENSE — ambos fora do código, a cargo de Sarah.

### 10/09/2026 — Assinatura no rodapé

**Responsável:** Muse Spark, a pedido de Sarah ("coloque no final da página:
projeto por Sarah Carolina").

**Motivo.** Dar autoria visível ao portal, no rodapé de todas as páginas.

**O que mudou.** Em `site/index.html`: linha "Projeto por Sarah Carolina"
abaixo do selo da coleta, em `.credito` próprio (centralizado, miúdo, no tom
terciário da paleta para não brigar com o selo). Estático no HTML — aparece em
todas as abas sem depender do JavaScript.

**Arquivos.** `site/index.html`, `README.md`.

**Validação.** `node coleta/publicar.mjs` passa com a base intacta e a
conferência da regra de suspensão verde.

**Dados.** Nenhuma mudança na coleta nem na base.

**Pendências.** Nenhuma nova.

### 10/09/2026 — Polimento visual: hovers, seleção, espera e leitura

**Responsável:** Muse Spark, a pedido de Sarah (deixar o sistema mais
convidativo, só no visual, sem alterar elementos).

**Motivo.** A identidade já estava resolvida (papel creme, serifada jurídica,
cores com significado); faltava micro-resposta ao gesto. A verificação antes
de mexer mostrou que quase todos os clicáveis já tinham hover — só o botão de
competência não reagia ao mouse.

**O que mudou.** Tudo em `site/index.html`, só CSS:

- `.escopo button:hover` com wash, mais guarda para o estado pressionado não
  perder o preenchimento no hover.
- `.botao-copiar:hover` passou do wash ao preenchimento cheio — a ação
  primária agora diz "pode clicar". O estado `.copiado` (verde) continua
  vencendo, porque vem depois com a mesma especificidade.
- `::selection` na cor de acento fraca: selecionar tese e ementa para copiar
  não quebra mais a paleta.
- `.carregando` com pulsação suave (`@keyframes pulso`) — a primeira carga
  traz 8,5 MB de JSON, e espera parada parece defeito.
- Estrela com pop (`@keyframes estrela`) ao marcar o favorito.
- `.texto-juridico` limitado a 68 caracteres por linha.
- `.rail` com `scrollbar-width:thin` na cor da borda.
- As duas animações já nascem cobertas pela regra global de
  `prefers-reduced-motion`.

**Arquivos.** `site/index.html`, `README.md`.

**Validação.** Chaves do `<style>` balanceadas (288/288); as 8 marcas
verificadas presentes; `node coleta/publicar.mjs` passa com a base intacta e
a conferência da regra de suspensão verde. Visual conferido por leitura do
CSS — sem captura de tela neste ambiente.

**Dados.** Nenhuma mudança na coleta nem na base.

**Pendências.** Nenhuma nova.

### 10/09/2026 — Alvos de 24 px e toque sem atraso

**Responsável:** Muse Spark, a pedido de Sarah (revisão de ergonomia).

**Motivo.** A auditoria de ergonomia apontou que dois cliques descumpriam a
regra dos 24×24 px que o próprio CSS declara (WCAG 2.2, 2.5.8): o "← Voltar"
da ficha e o ✕ do aviso de erro ficavam em ~20 px de altura. E o toque em
mobile pagava 300 ms de atraso (a espera pelo duplo-toque de zoom).

**O que mudou.** Tudo em `site/index.html`, sem mudar o visual:

- `.voltar` ganhou `min-height:24px` com `inline-flex` — a altura mínima passa
  a valer mesmo em contexto de linha.
- O botão do `.erro-fixo` ganhou `min-width/min-height:24px` com centralização
  — o ✕ continua no mesmo lugar, só com área clicável maior.
- `touch-action:manipulation` no seletor universal — elimina o atraso do toque
  sem tirar o zoom de pinça; a justificativa entrou no comentário da seção
  "ergonomia de base".

**Arquivos.** `site/index.html`, `README.md`.

**Validação.** Chaves do `<style>` balanceadas (275/275); varredura dos
seletores clicáveis sem dimensão mínima: só resta `.marca`, cuja área já é
grande (selo de 44×31 px + texto). `node coleta/publicar.mjs` passa com a base
intacta e a conferência da regra de suspensão verde.

**Dados.** Nenhuma mudança na coleta nem na base.

**Pendências.** Nenhuma nova. O próximo passo de ergonomia, se um dia o mobile
crescer, seria avaliar os 44 px da Apple em vez dos 24 px do WCAG — por ora o
público de cartório é majoritariamente desktop.

### 10/09/2026 — Fontes auto-hospedadas: fim da requisição ao Google

**Responsável:** Muse Spark, a pedido de Sarah (auditoria de credenciais e LGPD).

**Motivo.** A auditoria concluiu que o portal não tem credenciais (as seis fontes
são públicas, sem login nem chave; o cookie do RUPE é de sessão e some com a
execução) e não trata dado pessoal — exceto por um ponto: o `index.html`
carregava IBM Plex Sans/Mono e Source Serif 4 do Google Fonts, e cada visita
entregava IP e User-Agent ao Google. Era a única saída de dado do navegador.

**O que mudou.** Os arquivos woff2 (subconjuntos latin e latin-ext, licenças SIL
OFL) foram baixados do Google uma vez e passam a ser servidos de
`site/fontes/` — 10 arquivos, ~386 KB. A Sans e a Serif vieram como variáveis
(o mesmo arquivo cobre 400–600, confirmado por hash) e são declaradas com
`font-weight: 400 600`; a Mono tem instâncias estáticas por peso. O visual não
muda: mesmas famílias, mesmos pesos. Os três `<link>` ao Google (inclusive os
`preconnect`) foram removidos e viraram 10 blocos `@font-face` no próprio
`<style>`.

**Arquivos.** `site/index.html`, `site/fontes/` (novo, 10 `.woff2`).

**Validação.** `grep` por `googleapis|gstatic` em `site/`: só resta o `xmlns` do
SVG (namespace, não é requisição). As 10 URLs `./fontes/` referenciadas existem
em disco; site servido localmente devolve 200 para o HTML e os woff2.
`node coleta/publicar.mjs` passa com a base intacta (3.204 temas, 1.225
informativos) e a conferência da regra de suspensão continua verde.

**Dados.** Nenhuma mudança na coleta nem na base.

**Implantação.** `site/fontes/` é versionado e o Pages publica a pasta `site`
como está — nada a configurar no workflow.

**Pendências.** Se um dia se quiser zero binário no repositório, a alternativa é
trocar por fontes do sistema; por ora o custo (~386 KB) vale o visual.

### 10/09/2026 (noite) — A coleta agendada rodou; o conserto do STF, não

**Responsável:** Claude Code, a pedido de Sarah.

**A primeira execução agendada aconteceu.** O cron das 18h07 disparou às 21:18
UTC — onze minutos de fila, dentro do esperado para o agendador do GitHub —,
rodou, commitou sozinha e disparou a publicação. Três fontes atualizaram
normalmente. Encerra a pendência de nunca ter havido execução automática.

**Mas as duas fontes do STF falharam com o mesmo erro de antes.** O defeito é
meu, em duas camadas.

No código: a expressão que lê o endereço do intermediário no certificado estava
gravada como `/CA Issuers - URI:(S+)/` em vez de `(\S+)` — a barra invertida foi
comida na edição. Procurava a letra "S" literal, nunca casava, e a âncora nunca
era obtida. Continua sendo sintaxe válida, então nada acusou.

Na conferência, que é o erro mais grave: a entrada de mais cedo deu isso por
conferido apontando `CURL_CA_BUNDLE` para um arquivo vazio, supondo reproduzir o
runner. **Não reproduz.** O curl do Windows usa o Schannel, que ignora essa
variável — medido: com ela vazia, um site de cadeia completa responde 302; com
`--cacert` vazio, sai com erro 60. As requisições passavam porque o Windows
validava normalmente. Um teste que não podia falhar não é teste, e essa entrada
foi corrigida no lugar onde a afirmação falsa estava.

**O que mudou.**

- A busca do intermediário não depende mais do `openssl` nem de casar expressão
  regular contra texto feito para humano ler. Usa o módulo `tls` do Node, que
  devolve a extensão do certificado já estruturada, num subprocesso síncrono. A
  conversão DER→PEM é feita em JavaScript: um PEM é o DER em base64, e só.
- Criado `coleta/conferir-cadeia.mjs`, que exercita o caminho de verdade — busca
  o elo, confere que é certificado, e pede a página usando **só** esse elo como
  âncora, via `--cacert`, que o Schannel respeita. Inclui o controle que faltava
  da outra vez: um host de cadeia completa **precisa recusar** essa âncora; se
  aceitasse, o `--cacert` estaria sendo ignorado e o resto não valeria nada.
- Quando o remendo não dá certo, o motivo passa a viajar junto do erro até o
  painel. Sem isso, cada diagnóstico custa doze horas.
- A pista do corpo nas respostas de erro tinha o mesmo estrago de barra
  invertida (`/s+/`) e não removia `<style>` — o que foi capturado do 403 do STJ
  foi a folha de estilo da página de bloqueio. Corrigido, e agora com 200
  caracteres de texto de verdade.
- Varredura em todo o código atrás de outras regex com barra invertida comida:
  nenhuma outra.

**Validação.** `node coleta/conferir-cadeia.mjs` — cinco verificações, todas
passaram, inclusive o controle. **A confirmação em produção continua dependendo
da próxima execução agendada.** A diferença é que agora o teste local exercita o
caminho, o que antes não acontecia.

**Pendências.** O 403 do STJ segue em aberto: daqui a fonte responde 200, e só a
próxima execução dirá o que a página de bloqueio traz, agora que a pista é
legível.

### 10/09/2026 — O portal passa a caber no telefone

**Responsável:** Claude Code, a pedido de Sarah ("quero um design responsivo,
analisa como fica no celular e ajusta").

**Motivo.** Aberto o portal numa tela de 375 px — um iPhone comum — a página
inteira estava deslocada para o lado. A faixa do topo punha marca, campo de
busca e preferências em uma linha só, e essa linha pedia **503 px de largura
mínima**: 128 px a mais do que a tela. O navegador não corta o excedente, ele
cria rolagem horizontal na página toda, de modo que cada linha de texto acabava
fora da vista à direita e o campo de busca ficava com 80 px úteis. Nada disso
aparece no computador, onde sobra largura.

**O que mudou.**

1. **A faixa do topo quebra em duas linhas abaixo de 700 px.** Marca e
   preferências na primeira, busca na segunda, inteira. Abaixo de 540 px o
   subtítulo da marca sai — ele repete o que as abas já dizem — e o selo encolhe
   de 44 para 38 px. Com o telefone deitado (altura até 520 px) a faixa deixa de
   ser fixa: parada ali, ela comia dois quintos da tela.
2. **O texto deixa de ser justificado no celular.** A justificação foi escolhida
   para a coluna larga; em 350 px ela abre rios de espaço branco entre as
   palavras, e a hifenização não dá conta. Vale para ementa, tese, questão,
   avisos, diffs e o guia.
3. **Campos de digitação a 16 px, alvos de toque a 44 px.** O Safari do iPhone
   dá zoom em qualquer campo com fonte menor que 16 px e não desfaz sozinho; era
   o caso dos filtros, do "ordenar por" e do filtro de dia. Os 44 px valem para
   abas, botões de copiar, link da fonte, "carregar mais" e "voltar".
4. **Menos rolagem antes do primeiro resultado.** O escopo vira três colunas de
   largura igual; os cinco blocos de alcance, duas colunas; e o filtro detalhado
   passa a uma grade com Número e Espécie lado a lado, e só o campo de palavras
   ocupando a linha. São uns 70 px a menos de moldura: medida na base real, a
   primeira ficha começa a 580 px do alto da página, contra 650 px antes.
5. **A ficha aberta e a prévia respiram.** Padding de 24 para 14 px nas seções,
   título de 1,4 para 1,28 rem, e o diálogo de prévia ocupa a largura da tela
   com o botão "Copiar" inteiro, em vez dos 92 vw que sobravam de um desenho de
   computador.
6. **A aba escolhida rola sozinha para dentro da vista.** A barra de abas não
   cabe inteira no telefone e rola na horizontal; sem isto, escolher uma aba
   pelo endereço ou pelo botão do guia mudava a página sem mostrar o que fora
   escolhido.
7. **Três grades de largura mínima fixa** (`minmax(160px|200px|330px,1fr)`)
   passaram a `minmax(min(…,100%),1fr)`. A de 330 px, usada no guia, estourava
   a tela sozinha em qualquer telefone.

**Arquivos.** `site/index.html` (bloco de CSS `celular`, ao fim da folha, e o
trecho das abas em `desenha()`), `.claude/launch.json` (novo, prévia local),
`README.md`.

Enquanto este trabalho corria, o commit `bd12d64` — o das tipografias
auto-hospedadas — gravou a pasta como ela estava e levou junto a primeira
metade do bloco `celular` e as três correções de grade do item 7. Nada se
perdeu, mas as mudanças de celular ficam repartidas entre aquele commit e o
seguinte.

**Validação.** Prévia local (`serve site` na porta 4173), no navegador embutido
do Claude Code, com a base real de 10/09/2026. Conferido em 375×812, 320×700,
740×420 e 1280×800, nos temas claro e escuro, nas seis abas, na ficha aberta e
nos dois diálogos: a largura de rolagem passou a ser igual à da tela em todas
(era 503 px contra 375 px), e nenhum elemento ultrapassa a borda direita. O
desenho de computador em 1280 px continua idêntico — trilho de filtros à
esquerda, faixa em uma linha, texto justificado. **Não houve teste em aparelho
real**: o que se testou foi a emulação de tamanho do Chromium, que não reproduz
a barra do navegador do celular nem o zoom automático do iOS.

**Dados e implantação.** Nada muda na coleta, na base ou no `dados.json`. É
alteração só de apresentação; publica junto com o próximo envio ao repositório.

**Pendências.**

1. Conferir num aparelho de verdade, de preferência num iPhone, se o campo de
   busca deixou mesmo de dar zoom ao receber o toque.
2. A moldura antes do primeiro resultado ainda ocupa 580 px no telefone. Se incomodar no uso, o caminho é recolher o filtro detalhado atrás
   de um botão "Filtrar", o que exige mexer no HTML gerado pelo JS.

### 10/09/2026 — Crescimento do repositório, repetição das fontes e ícone

**Responsável:** Claude Code, a pedido de Sarah ("pode fazer tudo o que falta").

**Motivo.** Fecha as três pendências abertas na revisão desta mesma data.

**1. O repositório crescia sem teto.** Duas causas, medidas antes de mexer:

- `site/dados.json` era versionado. Minificado numa linha só, o Git não consegue
  guardar a diferença: gravava **1,69 MB inteiros por coleta**. Seis versões já
  ocupavam 10 MB — a duas coletas por dia, mais de 1 GB por ano. Ele é derivado
  de `dados/`, e o próprio docstring de `publicar.mjs` sempre disse que a
  intenção era não versioná-lo. Agora nasce no passo de publicação, que de
  quebra passa a rodar a conferência da regra de suspensão antes de publicar.
- `verificadoEm` era o mesmo instante copiado em 3.204 registros e reescrito a
  cada coleta. Passou para `dados/conferencia.json`, uma linha por origem. O
  campo só reaparece no registro como exceção, quando ele some da fonte e a data
  precisa parar. `publicar.mjs` devolve o campo na montagem.

Medido numa coleta real, com alteração de verdade nas fontes: **84 linhas
inseridas e 34 removidas**, contra 1.733/1.733 antes — e o diff agora mostra o
que mudou (o STF publicou as descrições dos temas 1480 e 1481). Conferido que o
`dados.json` gerado é idêntico ao anterior registro a registro, mudando só a
ordem das chaves. As quatro propriedades do registro ausente foram testadas com
armazenamento em memória.

**2. A coleta agendada nunca havia rodado, e não tolerava soluço.** Ao rodar a
coleta completa para medir o item 1, a repercussão geral do STF falhou com
"Tabela não localizada" em 0 segundo. Investigado: o portal do STF, quando está
sobrecarregado, responde **200 com uma página de erro de 54 KB, sem a tabela**.
Para o curl é sucesso. Medido daqui, ele responde duas vezes seguidas e trava na
terceira. Não havia repetição em lugar nenhum: uma oscilação de segundos
derrubava a fonte por doze horas. Acrescentada repetição em dois níveis — na
requisição (rede, tempo esgotado, 429 e 5xx) e em volta da fonte inteira, que é
o nível que resolve o 200 com página errada. Depois disso, coleta real com
**6 de 6 fontes**, zero falhas.

O horário passou de 09:00/21:00 para 09:07/21:07 UTC. O agendador do GitHub é de
melhor esforço e a hora cheia é quando todo mundo agenda; um minuto quebrado cai
fora do pico. Continua sendo 6h e 18h de Brasília, com sete minutos.

**3. O site não tinha ícone.** Criado `site/icone.svg`: o logotipo reduzido ao
que se lê a 16 pixels — os dois aros cruzados de fundo e o B no lugar onde a
lente nasce. Cor fixa nos dois temas, porque a aba tem fundo próprio.
Acrescentada também a `description`, para quando o endereço é compartilhado.

**Arquivos.** `coleta/ambiente.mjs`, `coleta/regras.js`, `coleta/executar.mjs`,
`coleta/publicar.mjs`, `coleta/servir.mjs`, `site/index.html`,
`site/icone.svg` (novo), `dados/conferencia.json` (novo),
`.github/workflows/coletar.yml`, `.github/workflows/publicar.yml`,
`.gitignore`, `README.md`.

**Dados.** A base foi migrada uma vez: `verificadoEm` removido de todos os
registros, `conferencia.json` montado com as datas por origem, sem exceções — as
datas eram uniformes dentro de cada origem. `site/dados.json` deixou de ser
versionado.

**Pendências.**

1. A confirmação em produção continua dependendo da próxima execução no Actions:
   é lá que se vê se o remendo do certificado do STF funciona e o que o corpo do
   403 do STJ revela. Nada disso é observável desta máquina.
2. A primeira execução *agendada* ainda não ocorreu.

### 10/09/2026 — Metade das fontes não respondia no GitHub Actions

**Responsável:** Claude Code, a pedido de Sarah (revisão geral do sistema).

**Motivo.** A única execução da coleta no GitHub Actions terminou em verde, mas
**três das seis fontes falharam** — e o site publicado vem dizendo, desde então,
que 3 fontes não responderam. A coleta funcionava na máquina da Sarah, então o
defeito só existia em produção, que é justamente onde ninguém olha.

**Causa 1 — certificado do STF.** `portal.stf.jus.br` e `www.stf.jus.br` enviam
só o certificado próprio e omitem o intermediário. O Windows busca sozinho o elo
que falta; o curl no Linux não. Daí `unable to get local issuer certificate` nas
duas fontes do STF. O `coleta/ambiente.mjs` passou a ler o endereço do
intermediário no próprio certificado, baixá-lo e repetir a requisição.

> **Correção de 10/09/2026, à noite.** Esta entrada afirmava que o conserto
> fora conferido localmente apontando `CURL_CA_BUNDLE` para um arquivo vazio.
> **Aquela conferência não valia.** O curl do Windows usa o Schannel, que ignora
> essa variável: as requisições passavam porque o Windows validava normalmente,
> e o caminho do remendo nunca chegou a ser exercitado. Ele estava quebrado, e a
> coleta agendada das 18h falhou nas duas fontes do STF pelo mesmo motivo de
> antes. Ver a entrada seguinte.

**Causa 2 — HTTP 403 no informativo do STJ (em aberto).** `processo.stj.jus.br`
responde 200 a partir do Brasil e 403 a partir do runner. Os dados abertos do
STJ, em outro domínio, funcionam no runner — então não é bloqueio ao STJ inteiro,
e sim àquele domínio. A hipótese é filtro por origem da requisição, mas ela não
pode ser testada daqui. O erro passou a registrar um trecho do corpo da
resposta, para que a próxima execução mostre se é página de bloqueio ou outra
coisa.

**Falha silenciosa (resolvido).** Criado `coleta/conferir-fontes.mjs`, chamado
pelo workflow: cada fonte sem resposta vira aviso visível no resumo da execução,
e perder as seis de uma vez derruba o trabalho — seis tribunais não saem do ar
juntos, então isso seria problema da coleta, e merece o e-mail que o GitHub
manda quando um trabalho falha.

**Documentação corrigida.** O README dizia que o site é publicado pela
Cloudflare Pages. Não é: está no GitHub Pages, em
https://scarolrsf.github.io/busca-busca/. A Cloudflare nunca chegou a ser
ligada e segue como alternativa para domínio próprio.

**Arquivos.** `coleta/ambiente.mjs`, `coleta/conferir-fontes.mjs` (novo),
`.github/workflows/coletar.yml`, `README.md`.

**Pendências.**

1. Confirmar, na próxima execução automática, se as fontes do STF voltaram e o
   que o corpo do 403 do STJ revela.
2. A primeira execução *agendada* ainda não ocorreu; até agora só houve
   acionamento manual.
3. Cada coleta reescreve a marca de conferência de todos os registros, o que
   produz commits de ~1.700 linhas mesmo quando nada mudou de fato. Não é
   urgente — o repositório tem 3,1 MB —, mas cresce sem limite e torna o
   `git log -p` inútil para ver o que mudou de verdade. O histórico útil já
   está em `dados/alteracoes.json`.
4. O site não tem ícone próprio (favicon): a aba mostra o ícone genérico e cada
   visita gera um 404 em `/favicon.ico`.

### 10/09/2026 — O portal deixa de ser só dos Juizados

**Responsável:** Claude Code, a pedido de Sarah.

**Motivo.** Sarah vai disponibilizar o buscador também às varas cíveis. O que
começou como um pedido de rótulo — trocar "Área do Juizado" por "Área" na
faceta — é, na verdade, uma troca de público: o portal falava como se todo
consulente fosse dos Juizados.

**O que mudou.**

- A faceta e a coluna da planilha passaram a se chamar apenas "Área".
- A procedência do registro deixou de dizer "Seleção dos Juizados", e passou a
  dizer "Triagem inicial".
- O filtro de competência continua com "Todos", "Justiça comum" e "Juizado
  Especial" — essa distinção fica mais útil, não menos, com dois públicos. O que
  mudou é o padrão: a consulta ainda abre em "Juizado Especial" na primeira
  visita, mas a escolha passa a ser lembrada por navegador (`bb-escopo` no
  localStorage). Quem atua na justiça comum troca uma vez.
- O endereço continua carregando `escopo=` sempre que a competência sai de
  "Juizado Especial", e não quando sai da preferência guardada: um link copiado
  precisa abrir na mesma competência para quem o recebe, seja qual for a
  preferência de quem clica.
- O guia ganhou, na seção Competência, a entrada "Qual vem marcada".

**Corrigido de passagem.** A ficha imprimia `pertinencia` cru, então 356
registros exibiam "Selecionado na planilha inicial" na tela — o vocabulário
interno, que não deve aparecer para o consulente. A função `rotuloPublico`
existia exatamente para isso desde o começo e nunca tinha sido chamada. Agora é.

**Pendências.** Nenhuma nova.

### 10/09/2026 — Saída do Apps Script para GitHub Actions e Cloudflare Pages

**Responsável:** Claude Code, a pedido de Sarah.

**Motivo.** O portal existia como prévia local e como piloto em Google Apps
Script, nunca publicado. Sarah pediu um endereço acessível a todos. O Apps
Script não sustenta a coleta: a lista de temas do STF tem 7,7 MB e a planilha de
informativos, 9 MB que viram 62 MB descompactados — acima do que cabe em 6
minutos de execução. Um Cloudflare Worker também não serve (128 MB de memória).
A coleta passou para o GitHub Actions, e o site para a Cloudflare Pages.

**Arquivos.** Criados `coleta/ambiente.mjs` (rede via curl síncrono, leitor de
zip e xlsx sem dependências, armazenamento em JSON), `coleta/regras.js` (as
regras de leitura das seis fontes, extraídas de Code.gs e Parsers.gs sem
nenhuma API do Apps Script), `coleta/executar.mjs`, `coleta/publicar.mjs`,
`coleta/servir.mjs` e `.github/workflows/coletar.yml`. `conferir-regra.mjs`
passou de `work/` para `coleta/`. A interface foi para `site/index.html` sem
alteração de layout — muda apenas a origem dos dados, de `/api/data` para
`./dados.json`. `outputs/` foi removido para não haver duas cópias da interface.

**Validação.** Consulta real às seis fontes, sem amostras: STJ temas (1.495),
IUJ (48), RUPE (172), informativos STJ (15), temas STF (1.481) e informativos
STF (1.012), em cerca de 60 segundos, nenhuma falha. Base resultante: 3.204
temas, 1.225 julgados, 5.321 alterações registradas. A conferência da regra de
suspensão passou sobre a base inteira. O site foi servido localmente e conferido
lendo `site/dados.json`.

**Dados.** `dados/` foi semeado com a base já conferida, preservando os 158
registros de pertinência selecionada — é o que sustenta o recorte "Juizado
Especial". `site/dados.json` deixou de ser versionado: é derivado de `dados/`
pelo passo de publicação, para não duplicar 8 MB a cada coleta.

**Implantação.** Repositório `scarolrsf/busca-busca` criado como público, e o
código enviado. O workflow foi disparado à mão para validar o caminho inteiro:
consultou as seis fontes reais e gravou o commit `Coleta de 10/09/2026 às 08h41`
em 1 minuto e 1 segundo, com sucesso. A Cloudflare Pages ainda **não** foi
configurada — o painel pediu login, que só Sarah pode fazer.

**Pendências.**

1. Entrar na Cloudflare e conectar o repositório em Pages — build command vazio,
   output directory `site`.
2. Conferir a primeira execução agendada, às 6h ou às 18h, já que até agora só
   houve execução manual.
3. O cron do GitHub é fixo em UTC; se voltar o horário de verão, corrigir os dois
   horários em `.github/workflows/coletar.yml`.
4. Cada coleta reescreve `dados/temas-do-portal.json` inteiro, porque o campo
   `verificadoEm` muda em todo registro — cerca de 1.700 linhas alteradas por
   execução. O Git comprime bem, mas convém observar o crescimento do
   repositório ao longo dos meses.

### 10/09/2026 — Publicação: GitHub Pages preparado, visibilidade e Cloudflare pendentes

**Responsável:** Claude Code, a pedido de Sarah.

**Motivo.** A Cloudflare exige login que só Sarah pode fazer, e o site continuava
sem endereço. O GitHub Pages publica o mesmo repositório e podia ser ligado pela
sessão já autenticada, sem impedir a Cloudflare depois.

**Arquivos.** Criado `.github/workflows/publicar.yml`: envia a pasta `site` como
artefato do Pages a cada alteração em `main` — inclusive as que a coleta grava —,
conferindo antes que `site/index.html` e `site/dados.json` existem, para que o
site não suba vazio. `site/dados.json` voltou a ser versionado e passou a ser
gravado pela coleta: sem isso, qualquer hospedagem precisaria de um passo de
build, e esquecer esse detalhe publicaria o portal sem dados.

**Validação.** Nenhuma publicação ocorreu ainda. O workflow de publicação não
chegou a rodar, porque o Pages não está habilitado.

**Implantação.** O repositório foi criado **privado**, apesar de a tela de criação
mostrar "Public" — erro de leitura meu, confirmado depois pela API, que respondia
404 a consulta anônima. O GitHub Pages, no plano gratuito, exige repositório
público. A troca de visibilidade foi iniciada e parou na etapa "Confirm access":
o GitHub pede reautenticação por código enviado ao e-mail, que não cabe a mim
inserir.

**Pendências.**

1. Concluir a troca de visibilidade para público: em Settings → General → Danger
   Zone, "Change visibility", e confirmar com o código recebido por e-mail.
   Depois, habilitar o Pages em Settings → Pages com a origem "GitHub Actions".
2. Alternativa, se preferir manter o repositório privado: a Cloudflare Pages
   aceita repositório privado — nesse caso, basta entrar na Cloudflare e conectar.
3. Conferir a primeira execução agendada da coleta, às 6h ou às 18h.

### 10/09/2026 — Repositório tornado público e publicação no GitHub Pages

**Responsável:** Sarah concluiu a troca de visibilidade; Claude Code no restante.

**Motivo.** O repositório havia sido criado privado por engano, o que impedia o
GitHub Pages no plano gratuito e fazia o workflow de publicação falhar a cada
alteração.

**Arquivos.** `.github/workflows/publicar.yml` passou a tolerar a ausência do
Pages em vez de falhar — o erro chegava por e-mail duas vezes por dia sem que
houvesse defeito no código — e ganhou `enablement: true`, para habilitar o Pages
por conta própria assim que ele ficasse disponível.

**Validação.** Repositório confirmado público pela API. A publicação foi
disparada em seguida.

**Implantação.** Endereço previsto: `https://scarolrsf.github.io/busca-busca/`.
A coleta continua em `.github/workflows/coletar.yml`, às 6h e às 18h, e cada
coleta dispara uma nova publicação.

**Pendências.**

1. Conferir a primeira execução agendada da coleta, às 6h ou às 18h — até aqui
   só houve execução manual.
2. A Cloudflare Pages continua uma alternativa, caso se prefira domínio próprio
   e cache mais próximo do usuário. Não é necessária para o site funcionar.

**No ar em 10/09/2026:** https://scarolrsf.github.io/busca-busca/ — publicado
pelo workflow, com a base coletada às 08h41. O `enablement` foi removido: o
token do workflow não pode criar o site do Pages, e a origem foi definida à mão
em Settings → Pages como "GitHub Actions".

### 10/09/2026 — Planilha de relatório, prévia antes de copiar, favoritos e convite ao guia

**Responsável:** Claude Code, a pedido de Sarah.

**Motivo.** Quatro pedidos: exportar relatório conforme os filtros, ver o
despacho e as ementas antes de copiar, guardar precedentes numa aba própria e
apontar o guia de leitura a quem chega pela primeira vez.

**Arquivos.** Tudo em `site/index.html`.

- **Planilha.** Botão "Baixar planilha" na barra de resultados. Exporta o recorte
  exato que está na tela — mesma busca, escopo, filtros, bloco e ordem. Formato
  CSV com separador ponto e vírgula e marca de codificação no início: sem os
  dois, o Excel em português abre tudo numa coluna só e com acentos quebrados. O
  nome do arquivo descreve o recorte, para não confundir dois relatórios. A
  coluna do alcance chama-se "Alcance registrado", e não "da suspensão", porque
  aparece também em precedente cuja suspensão já cessou — a coluna seguinte diz
  se está em vigor.
- **Prévia.** Os três botões de texto passaram a abrir o conteúdo por inteiro
  numa janela, com a cópia dentro dela. Despacho vai para dentro de processo;
  copiar às cegas é convite a colar texto errado.
- **Favoritos.** Estrela em cada resultado e na ficha, e aba "Meus favoritos"
  que reaproveita a listagem inteira — busca, filtros, blocos, ordenação e
  planilha valem lá do mesmo jeito. A lista fica no navegador de quem consulta,
  o que a tela diz na mensagem de lista vazia: não acompanha a pessoa em outro
  computador.
- **Convite ao guia.** Janela na primeira visita apontando "Como usar", com o
  essencial em dois parágrafos. Aparece uma vez por navegador, e não aparece
  quando a pessoa chega por link direto para um precedente ou uma busca — nesses
  casos ela veio atrás de algo específico.

**Validação.** Testado no site servido localmente: pop-up abre na primeira
visita e não volta; três favoritos guardados e listados na aba; prévia do
despacho e da ementa com o texto correto; planilha gerada com cabeçalho, aspas e
nome do arquivo refletindo o filtro. A conferência da regra de suspensão passou.

**Dados.** Nenhuma mudança na coleta nem na base.

**Pendências.**

1. A estrela guarda no navegador. Se um dia o portal ganhar login, vale migrar
   os favoritos para a conta.
2. Conferir a primeira execução agendada da coleta, às 6h ou às 18h.

### 10/09/2026 — Chamada de sentido nas novidades

**Responsável:** Claude Code, a partir de sugestão recebida por Sarah.

**Motivo.** O "Antes / Agora" é exato, mas obriga quem lê a traduzir sozinho o
que a mudança significa. A sugestão foi acrescentar uma chamada curta antes do
detalhe, dizendo por que aquela novidade importa.

**Arquivos.** Em `site/index.html`, nova função `significadoDaNovidade`, que
classifica cada linha do registro de alterações a partir do campo alterado e do
valor novo, e reaproveita as mesmas expressões já usadas na regra de suspensão.
O cartão de novidade passa a abrir pela chamada, com a faixa lateral na cor do
nível, e o "Antes / Agora" continua abaixo, para conferência.

Quatro níveis, e a cor acompanha o sentido:

| Chamada | Quando | Nível |
| --- | --- | --- |
| ⚠️ Suspensão determinada / alterada | apareceu ou mudou o registro de suspensão | alerta |
| ⚠️ Precedente sobrestado / Incidente admitido | a situação passou a sobrestar | alerta |
| ✅ Trânsito em julgado, cancelamento, repercussão negada, suspensão encerrada | a suspensão deixou de valer | alívio |
| 📌 Tese publicada, acórdão publicado, mérito julgado | conteúdo novo a ler | atenção |
| 🆕 Novo precedente / novo julgado | entrou na base | atenção |
| ✏️ Questão reescrita, área reclassificada, andamento, cadastro | ajuste sem efeito prático | neutro |

**Validação.** Conferido na tela com as alterações reais da última coleta: as
quatro categorias aparecem com a cor certa, e a chamada de suspensão puxa a
faixa vermelha do cartão. A conferência da regra de suspensão passou.

**Dados.** Nenhuma mudança na coleta nem na base.

**Pendências.** Nenhuma nova. Se as novidades crescerem muito, vale um filtro
por tipo de chamada — mostrar só os alertas, por exemplo.

### 10/09/2026 — Os blocos do topo e as chamadas passam a estar no guia

**Responsável:** Claude Code, a partir de dúvida levantada por Sarah.

**Motivo.** Sarah perguntou qual era a diferença entre "Suspensão nacional",
"Suspensão estadual" e "Suspensos". A pergunta é a prova do defeito: cinco caixas
iguais lado a lado sugerem cinco categorias paralelas, quando as três primeiras
são tipos que se excluem, a quarta é a soma delas e a quinta é de outro eixo.

**Arquivos.** Em `site/index.html`:

- O quarto bloco passou de "Suspensos" para **"Todos os suspensos"**, com borda
  tracejada; o de "Julgados" perdeu a cor de alcance, porque não fala de
  suspensão. Cada bloco ganhou explicação ao passar o cursor.
- Nova seção do guia, **"Os blocos do topo"**, dizendo em uma frase que os três
  primeiros se excluem, o quarto é a soma e o quinto é estágio.
- Nova seção do guia, **"As chamadas das novidades"**, com os selos renderizados
  ao lado do que cada um significa — do mesmo jeito que a legenda faz com as
  faixas coloridas.
- Criado `.gitattributes` com `eol=lf`. O repositório é editado no Windows e a
  coleta roda no Linux; sem isso, cada checkout trocava LF por CRLF, os arquivos
  apareciam inteiros como alterados e qualquer edição que procurasse trecho de
  várias linhas falhava — o que de fato aconteceu nesta sessão.

**Validação.** Conferido na tela: os três tipos somam exatamente o total do
quarto bloco (15 + 57 + 13 = 85). As doze chamadas aparecem no guia com a cor
certa. Uma duplicação da seção "Os blocos do topo", causada por uma tentativa de
edição que falhou pela questão do CRLF, foi encontrada e removida.

**Dados.** Nenhuma mudança na coleta nem na base.

**Pendências.** Nenhuma nova.

### 10/09/2026 — Favoritos: link compartilhável e limpeza da lista

**Responsável:** Claude Code, a pedido de Sarah.

**Motivo.** Sarah perguntou se não seria melhor um login, para que cada pessoa
tivesse os próprios favoritos. A resposta foi que já é assim — a lista fica no
`localStorage` de cada navegador e ninguém mais a vê —, e que login exigiria
servidor, banco e tratamento de dado pessoal, inclusive o registro de quais
temas cada magistrado acompanha, o que muda a natureza do piloto. Ficou
decidido resolver os dois problemas práticos sem cadastro.

**Arquivos.** Em `site/index.html`:

- **"Copiar link da minha lista"** monta um endereço com os identificadores no
  fragmento — a parte depois do `#`, que o navegador não envia a servidor
  nenhum. Serve para levar a lista a outra máquina e para passar uma seleção
  pronta a um colega.
- Quem abre um link desses vê os precedentes **com a estrela vazia**, um aviso
  de que vieram pelo endereço, e o botão "Guardar os N que vieram pelo link".
  Nada é gravado sem ato da pessoa: dá para guardar todos ou escolher um a um.
- **"Limpar meus favoritos"**, com confirmação, para o caso de computador
  compartilhado no cartório — o único em que outra pessoa veria a lista, por
  ser o mesmo perfil do mesmo navegador.
- A mensagem de lista vazia passou a dizer que a lista é só de quem marcou.

**Validação.** Ciclo completo conferido na tela: marcar três, copiar o link,
apagar o armazenamento simulando outra pessoa, abrir o link — os três aparecem
com estrela vazia e aviso —, guardar todos, e o endereço se limpa sozinho. A
limpeza pergunta antes e esvazia a lista. A conferência da regra de suspensão
passou.

**Dados.** Nada é gravado fora do navegador de quem consulta. O portal continua
sem servidor e sem dado pessoal.

**Pendências.** Se o portal for adotado institucionalmente, o login natural é o
SSO do próprio tribunal, com o jurídico ciente do tratamento de dados — e não
uma senha criada por este projeto.
