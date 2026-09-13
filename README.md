# Busca Busca

Precedentes / incidentes / informativos

Buscador de precedentes qualificados para os Juizados Especiais Cíveis, Criminais
e da Fazenda Pública do TJMG: IRDR, IUJ, IAC, grupos de representativos, temas
repetitivos do STJ, repercussão geral do STF e os informativos dos dois
tribunais superiores.

O objetivo prático é responder rápido a uma pergunta: **este tema tem ordem de
suspensão que alcança o processo que estou para sentenciar?**

Endereço: **https://scarolrsf.github.io/busca-busca/**

Este arquivo descreve o projeto **como está hoje**. O porquê de cada decisão,
entrada por entrada, está no [HISTORICO.md](HISTORICO.md).

## Sumário

- [Como funciona](#como-funciona) — peças, inventário de arquivos, telefone
- [Rodar a coleta à mão](#rodar-a-coleta-à-mão) — inclusive a coleta na máquina da Sarah
- [As seis fontes](#as-seis-fontes) — como cada tribunal é lido, espelho, certificado, erros da fonte
- [O que é base e o que é derivado](#o-que-é-base-e-o-que-é-derivado)
- [A partir de quando suspender](#a-partir-de-quando-suspender)
- [Até quando vale a suspensão](#até-quando-vale-a-suspensão)
- [Publicar](#publicar)
- [Conferências](#conferências) — autotestes e prévia local
- [Pendências em aberto](#pendências-em-aberto)
- [Regra permanente de atualização](#regra-permanente-de-atualização)

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

### Coleta na máquina da Sarah

O STF nega o endereço do GitHub Actions, e nenhuma segunda via de rede o
alcança: o espelho devolve 526 pelo certificado incompleto. Daqui ele responde.
Então a coleta que traz o STF é a de sempre, rodada deste computador — não há
truque nenhum, só um lugar que o tribunal aceita.

Dois cliques em **`coletar-aqui.cmd`**, na raiz do projeto. Ele atualiza a
pasta com o que houver de novo no GitHub, consulta os seis tribunais, mostra o
que mudou e envia. Se nada mudou, não envia nada e diz isso. Se o envio
esbarrar numa coleta agendada que commitou no meio do caminho, ele reencaixa e
tenta uma vez; não dando certo, para e avisa — a coleta fica gravada aqui, sem
risco de perda.

Para ver o que mudaria sem enviar: `node coleta/complemento.mjs --sem-enviar`.

O commit começa com "Coleta de DD/MM/AAAA", igual ao da coleta agendada, de
propósito: é assim que o vigia reconhece que a base foi atualizada no dia. A
origem fica no fim da mensagem.

**Isto não substitui a coleta agendada**, que continua rodando às 6h07 e 18h07
e trazendo o que o GitHub alcança — TJMG sempre, STJ pelo espelho. O
complemento é o que acrescenta o STF.

#### Todo dia, sozinho

Há uma tarefa no Agendador do Windows desta máquina, **`BuscaBusca-ColetaSTF`**,
que roda `coleta/agendado.cmd` **todo dia às 9h**. Ela é marcada como "executar
assim que possível depois de um horário perdido": com o computador desligado às
9h, ela roda quando ele voltar, e não pula o dia.

O que se vê: uma janela minimizada na barra de tarefas por menos de um minuto.
O que fica: `work/coleta-agendada.log`, com data, hora e tudo o que aconteceu —
fora do Git, como o resto de `work/`. Se uma coleta falhar de madrugada, o
registro está lá de manhã.

A tarefa roda só com a Sarah conectada, de propósito: rodar com o computador
bloqueado exigiria guardar a senha dela no Windows, o que este projeto não faz.

Para desligar, ligar de novo ou mudar o horário, é o Agendador de Tarefas do
Windows (`taskschd.msc`), ou, no PowerShell:

```powershell
Disable-ScheduledTask -TaskName "BuscaBusca-ColetaSTF"
Enable-ScheduledTask  -TaskName "BuscaBusca-ColetaSTF"
Unregister-ScheduledTask -TaskName "BuscaBusca-ColetaSTF"
```

Desligar a tarefa não quebra nada: a coleta agendada do GitHub continua, e o
`coletar-aqui.cmd` continua valendo para quando se quiser o STF na hora.

## As seis fontes

| Fonte | Como é lida |
| --- | --- |
| STJ — temas e processos | CSV de dados abertos; endereço e data de publicação pela API do catálogo |
| STJ — informativos | HTML da edição corrente |
| TJMG — IRDR, IAC e GR | consulta paginada no RUPE, com cookie e POST |
| TJMG — IUJ | planilha de acompanhamento da Turma Recursal |
| STF — repercussão geral | tabela "Todos os temas" + lista com a marca de suspensão |
| STF — informativos | planilha oficial de dados do Informativo |

O Corte Aberta, programa de dados abertos do STF, entra como fonte
complementar: não substitui nenhuma das seis, e alimenta um campo só — a data em
que a suspensão nacional foi determinada, que a lista de temas não publica.
Baixa pelo navegador na máquina da Sarah (`corte-aberta.mjs --baixar`) e escreve
na base com `--anotar`, fora do fluxo da coleta. Quem sai da lista de suspensão
nacional do Corte Aberta tem o campo limpo: é assim que o STF diz que a
determinação não vale mais.

Os **boletins do NUGEPNAC** são a segunda fonte complementar. O núcleo publica
um informativo semanal em PDF — "Informativo Semanal Nugepnac - 24 (10-08-2026 a
15-08-2026)" — reunindo o que aconteceu com os precedentes naquela semana, e
publica também, em HTML, cada notícia separada, com data, categoria ("Suspensão
Nacional", "Prorrogação de Suspensão", "IRDR Admitido") e o tema entre
parênteses. `boletins-nugepnac.mjs` casa as duas coisas pela data: a notícia diz
o tema e o dia, e o boletim daquela semana é o boletim em que o tema consta. A
ficha mostra o boletim e leva ao PDF. Não é preciso ler o PDF para saber o que
ele traz — a data está escrita nos dois lugares.

### Arquivo, API ou leitura de página

Pergunta que o projeto precisa saber responder: metade das fontes vem por via
estruturada, metade por leitura da página — e não por preferência, mas porque
três tribunais não publicam aquele dado de outro jeito.

| Via | Fontes | Registros |
| --- | --- | --- |
| API de dados abertos e arquivos oficiais | STJ — temas e processos; STF — informativos; TJMG — IUJ | 2.555 |
| Leitura da página publicada | STF — repercussão geral; TJMG — RUPE; STJ — informativos | 1.669 |

O catálogo de dados abertos do STJ é um CKAN, e a coleta usa a API dele para
perguntar o endereço atual do CSV em vez de presumi-lo — o endereço carrega o
identificador do arquivo publicado, e uma republicação com outro identificador
quebraria a coleta em silêncio. A API também diz **quando o STJ publicou**, que
é outra coisa que quando nós lemos: as duas datas aparecem no painel de fontes.

**O STF não tem API para o que este projeto precisa.** Procurado em 11/09/2026:
`dadosabertos.stf.jus.br` e `api.stf.jus.br` não existem (o nome nem resolve);
`portal.stf.jus.br/dadosabertos/` devolve a casca do portal, não um catálogo. O
programa de dados abertos do tribunal é o **Corte Aberta**, e ele é entregue
como **painéis Qlik Sense** em `transparencia.stf.jus.br` — inclusive o de
repercussão geral, que é onde mora a marca de suspensão nacional. Painel Qlik
se consulta pela tela, com exportação de CSV feita a mão; o que existe por trás
é a interface interna do Qlik, sem contrato público. Serve como **conferência
manual**, não como fonte automática — com um refinamento verificado em
11/09/2026 (ver HISTORICO.md): a exportação pode ser dirigida por um navegador de
verdade na máquina da Sarah, baixando sozinha os CSVs e só lançando no portal
quando houver mudança. Continua não sendo API oficial, e continua fora do
GitHub Actions.

Existe também uma API interna no aplicativo de jurisprudência do STF
(`POST /api/search/search`), usada pelo próprio front-end do site. Ela não é
publicada nem oferecida a terceiros: usá-la seria mais estável que ler a tela,
mas continuaria sendo leitura não contratada — não vira API oficial por
devolver JSON, e trocar uma leitura de página por outra não melhora a posição
do projeto. Fica registrado o achado, não a decisão de usá-la.

O **DataJud, do CNJ**, é API pública de verdade, com chave. Não serve aqui: é
de dados processuais, não de temas de repercussão geral nem de ordens de
suspensão.

O que sustenta a leitura de página aqui não é o meio, é a conduta: dados
públicos por definição legal e sem dado pessoal; duas consultas por dia, uma
requisição por vez; recusa respeitada (um 403 encerra a fonte na primeira
tentativa); e nada forjado — nenhum token falsificado, nenhum desafio
anti-robô resolvido por programa.

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

**Publicado em 11/09/2026** em `espelho-busca-busca.sarahcarolina37.workers.dev`,
no plano gratuito.

**O que a Cloudflare não é.** Ela não hospeda nada do portal e não aparece para
quem consulta. O endereço oficial continua sendo
`https://scarolrsf.github.io/busca-busca/`, servido pelo GitHub Pages; a coleta
oficial continua sendo a do GitHub Actions; a base continua no repositório. O
Worker é um leitor de recado: durante a coleta, e só quando o STJ recusa, ele
busca um arquivo público e devolve os bytes como vieram. Nenhum dado do projeto
passa a morar lá, e desligá-lo faz a coleta voltar ao que era antes — as fontes
do STJ marcadas como falha até que o tribunal volte a aceitar o GitHub.

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

**Não crie essa variável no repositório.** Ela valeria também para as duas
coletas agendadas, que rodam num servidor do GitHub sem navegador: a prova
falharia duas vezes por dia e gravaria "Prova falhou" no arquivo dela,
rendendo um commit de ruído a cada coleta. E, mesmo com navegador instalado
lá, o endereço do GitHub é justamente o que o STF nega — não há motivo para
tentar de lá. O lugar desta via é a máquina da Sarah, à mão:

```bash
node coleta/jurisprudencia-stf.mjs --tema "fornecimento de medicamentos"
```

Esse comando mostra o resultado na tela e **não toca na base** nem no site.
A prova de vida gravada em arquivo (`JURISPRUDENCIA_STF=1 node
coleta/executar.mjs`) só faz sentido quando se quer deixar registro dela.

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

### Quando a fonte erra

Tribunal também digita errado, e o portal precisa de uma posição sobre isso. A
posição é: **não corrigir a fonte em silêncio, e não apresentar o erro como se
fosse dado bom.** O valor fica visível, dizendo o que é.

- **O mesmo processo com dois números.** O TJMG publicou
  `2007816-54.2026.8.13.000` — três zeros onde o padrão CNJ pede quatro — para
  um incidente que já constava com o número completo. Identidade de processo não
  se adivinha: completar o zero acerta hoje e, algum dia, funde dois processos
  distintos. Então o coletor não junta; cria o segundo registro e anota
  "identificador incompleto". O que o portal acrescenta é o encontro entre eles:
  na publicação, registros cujo núcleo do número coincide passam a apontar um
  para o outro, e as duas fichas avisam. Quem lê vê os dois números e decide.
  Isso importa: nesse caso as duas fichas davam respostas opostas sobre
  suspensão — uma dizia que não havia ordem registrada, a outra que havia ordem
  de abrangência ampla.
- **Registro que some da lista.** Quando a fonte deixa de trazer um registro, ele
  não é apagado: `atualizarRegistros_` congela nele a data da última vez em que
  apareceu. Mas data velha, sozinha, não distingue "a fonte inteira está parada"
  de "este registro saiu da lista". A ficha passa a dizer qual dos dois é.
- **Não-data no campo de data.** A planilha do TJMG traz "20", "71", "110",
  "139" na coluna DATA DO JULGAMENTO — 45 campos em 12/09/2026, contando
  julgamento e trânsito. A ficha responde o que é verdade — **sem data** — e
  registra ao lado, entre aspas, o que a planilha trouxe. O valor não é apagado,
  porque é o que o tribunal publicou; o que ele deixou de ser é resposta. Antes,
  ocupava o lugar da data em monoespaçada, e a ficha anunciava "Julgamento 139"
  para só depois desmentir.

Os três sinais são **derivados na publicação**, não gravados na base: somem
sozinhos quando a fonte se corrige, e não geram entrada em "Novidades" — que é
registro do que o tribunal faz, não do que nós passamos a enxergar.

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
4. **Datas.** A tabela prende uma data à situação e não diz o que ela é — mas a
   situação diz: "Trânsito em Julgado … 22/02/2025" é trânsito; "Acórdão de
   mérito publicado … 06/09/2025" é publicação. `datasDaSituacaoSTF_` faz essa
   leitura e preenche o campo correspondente. Onde a situação não disser
   ("Mérito julgado", "Cancelado"), o campo fica vazio — a data continua em
   observações, com a etiqueta literal da fonte, e inventar rótulo seria pior
   que não ter. A data literal permanece em observações mesmo quando mapeada: o
   campo é a nossa leitura, a observação é o que a fonte escreveu.
5. **Suspensão nacional.** O portal do STF só a mostra em painel interativo e na
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

## A partir de quando suspender

O alcance responde *quais* processos a ordem atinge. Esta é outra pergunta:
*de que ponto do processo em diante*. São dimensões independentes — há
determinação nacional que só alcança recurso especial, e determinação estadual
que só vale depois de encerrada a instrução —, e é a segunda que decide o que
fazer com o processo que está na mesa.

A ficha traz isso em bloco destacado, logo abaixo do aviso de risco, e a lista
traz na pílula. Cinco respostas possíveis:

| Resposta | Quando | Em vigor hoje |
| --- | --- | --- |
| **Só na fase recursal** | a determinação fala apenas de recursos especiais e extraordinários, de segunda instância ou de admissibilidade | 88 |
| **Após encerrada a instrução probatória** | a determinação ressalva a instrução | 39 |
| **Imediata** | a determinação manda suspender de imediato, com todas as letras | 2 (ambos já encerrados) |
| **Desde a determinação** | há determinação escrita e ela não ressalva fase alguma | 129 |
| **Fase não especificada** | não há texto de determinação registrado para ler | 0 |

Classifica-se só o que a determinação **diz** — mas silêncio dentro de um texto
que existe também é leitura, não invenção. Determinação registrada que não
ressalva fase vale desde a determinação: suspenso o feito, é vedado praticar
atos processuais, salvo os urgentes (art. 314 do CPC), e não há autorização para
seguir até o fim da instrução — essa espera só se sustenta onde o próprio
tribunal a ressalvou, que é a linha "após encerrada a instrução probatória". O
que não se faz é afirmar *outra* fase que a fonte não afirmou; por isso o bloco
remete ao documento de origem, cujo texto aqui é extrato e cuja ressalva
prevalece sobre esta leitura.

"Fase não especificada" fica reservado ao caso em que não há texto de suspensão
nenhum — ausência de fonte, não silêncio dela. Como registro sem texto de
suspensão também não tem alcance determinado, e o bloco só aparece havendo
alcance, na prática essa resposta não chega à tela; ela existe para que a
ausência tenha nome próprio em vez de virar afirmação.

**Imediata** e **desde a determinação** dizem a mesma coisa ao leitor — para
agora —, e a distinção é de autoria: na primeira quem manda é o tribunal, na
segunda é a lei preenchendo o silêncio. Por isso levam a mesma faixa vermelha no
bloco, e só a nota as separa.

Duas armadilhas que a leitura evita, ambas medidas na base: "não aplicabilidade
**imediata** da decisão do incidente" fala da eficácia do acórdão, não de quando
suspender — por isso as marcas são expressões inteiras, não a palavra solta; e
determinação que cita recurso **e também** primeiro grau não é de fase recursal,
por isso a marca recursal só vale quando o texto não alcança o primeiro grau.

`conferir-regra.mjs` ganhou a invariante 6: todo registro precisa de momento com
rótulo e explicação; fase declarada só se sustenta havendo texto de suspensão
que a ampare; e, na recíproca, "não especificada" não pode conviver com texto de
suspensão existente — havendo determinação escrita, a regra responde.

## Até quando vale a suspensão

Não é o trânsito em julgado que a encerra, e o marco muda conforme o rito:

- **Repetitivo e repercussão geral** — publicado o acórdão paradigma, os
  processos sobrestados retomam o curso (art. 1.040, III, do CPC). A eficácia
  vinculante começa na publicação.
- **IRDR e correlatos** — cessa se não for interposto recurso especial ou
  extraordinário contra o acórdão do incidente (art. 982, § 5º). Interposto, o
  recurso tem efeito suspensivo por lei (art. 987, § 1º) e a suspensão persiste
  até o julgamento desse recurso, também sem aguardar o trânsito.
- **Embargos de declaração vivos** contra o acórdão do incidente impedem a
  cessação: eles interrompem o prazo do especial e do extraordinário (art. 1.026
  do CPC), e enquanto pendentes não se pode afirmar que recurso "não foi
  interposto", que é a condição do art. 982, § 5º. O TJMG narra isso no campo de
  suspensão — não na situação —, e é lá que a regra vai buscar.
- **Acórdão de repercussão geral publicado não é acórdão paradigma.** O STF usa
  as duas expressões na mesma coluna, e elas dizem o contrário uma da outra:
  "acórdão de mérito publicado" encerra a suspensão (art. 1.040, III);
  "acórdão de repercussão geral publicado" é o reconhecimento da repercussão
  geral, com o mérito pendente — o momento em que a suspensão nacional é
  determinada (art. 1.035, § 5º, e art. 1.037, II). Por isso são duas situações
  distintas no portal, e só a primeira encerra. A exceção é o acórdão que
  **nega** a repercussão geral: aí o tema acaba e a matéria volta às instâncias
  ordinárias.
- **Determinação posterior ao acórdão paradigma** não é alcançada pela regra
  acima: o art. 1.040, III, pressupõe ordem anterior ao marco que a encerra. O
  Tema 372 do STF teve o acórdão de mérito publicado em 06/07/2023 e a suspensão
  nacional determinada em 30/08/2024 — treze meses depois. A data da
  determinação não vem na lista de temas; vem do Corte Aberta, e é ela que
  permite ao portal ver a inversão.
- **Cláusula expressa** em sentido diverso prevalece sobre a regra geral.

Essa regra vive num lugar só — as funções de classificação do `site/index.html` —
e é aplicada a todo registro no momento de exibir. A cada coleta,
`coleta/conferir-regra.mjs` carrega essas mesmas funções e as roda sobre a base
inteira, conferindo doze invariantes. Uma atualização que quebre a regra faz a
coleta falhar em vez de chegar à tela.

### As datas que o STF publica, e as que ele não publica

A tabela "Todos os temas" tem uma coluna chamada "Situação Atual" com três
coisas dentro: a apreciação da repercussão geral, **uma** data e a situação
processual. A data pertence à primeira parte — é a da apreciação da repercussão
geral —, e por muito tempo esta coleta a leu como se fosse da situação: em
"Trânsito em Julgado … 12/12/2007", tomava 12/12/2007 por data de trânsito.

O erro era grande e visível: 584 temas ficaram com trânsito em julgado anterior
ao próprio julgamento. Conferido de duas maneiras em 11/09/2026 — na página do
Tema 372, que mostra "Data da Repercussão geral: 04/03/2011", exatamente a data
que estava gravada aqui como publicação do acórdão; e contra o Corte Aberta,
onde 1.299 das 1.397 datas batem com a coluna "Data admissibilidade RG".

O que a tabela publica, então, são duas datas honestas, e é assim que a ficha as
mostra:

| Campo | De onde vem |
| --- | --- |
| **Repercussão geral apreciada em** | a data da coluna "Situação Atual" |
| **Tese firmada em** | a coluna "Tese / Data Tese" |
| **Suspensão nacional determinada em** | Corte Aberta, por `corte-aberta.mjs --anotar` |

Trânsito em julgado e publicação do acórdão de mérito **não** estão nessa
tabela, e por isso não aparecem mais na ficha dos temas do STF: campo vazio é
resposta melhor que data errada. Quem precisa dessas duas datas as encontra na
ficha do tema no portal do STF, para onde o link "Fonte oficial" leva.


### O prazo que a determinação declarou

O TJMG às vezes registra a prorrogação com prazo certo — "pelo prazo máximo de
60 (sessenta) dias", "por mais 180 dias". Vencido o prazo sem notícia posterior,
a ficha traz um aviso âmbar com as três datas: quando foi prorrogada, por
quantos dias e quando venceu.

O aviso **não** muda a classificação, e isso é deliberado: a suspensão do
incidente vale até o julgamento, de modo que prazo vencido não equivale a ordem
levantada — tratá-lo assim seria o erro do IRDR 94 ao contrário, mandando
sentenciar sob ordem viva. E ele se cala quando há qualquer data posterior ao
início do prazo no mesmo texto, porque aí a última palavra não é o prazo: o
IRDR 74 prorrogou por 180 dias e, meses depois, prorrogou de novo "até o
trânsito em julgado da ADI", sem prazo em número. Lê-se prazo em algarismo; por
extenso, não se lê — melhor calar do que adivinhar data em cima de decisão
judicial. Medido em 11/09/2026: 4 registros declaram prazo, e o aviso aparece em
2 deles.

## Publicar

O site é publicado pelo GitHub Pages a cada alteração no repositório, pelo
workflow `publicar.yml`, e ao término de cada coleta com êxito
(`workflow_run`): o push que a coleta faz com `GITHUB_TOKEN` não dispara
workflow novo, então só o gatilho de `push` deixava a base das 6h07 e 18h07
sem publicar até o envio seguinte da máquina da Sarah.

O `site/dados.json` **não** é versionado (ver "O que é base e o que é
derivado"): o `publicar.yml` o gera com `node coleta/publicar.mjs` antes de
publicar, e esse mesmo passo confere a regra de suspensão — base que a viole
não chega ao ar. Em outra hospedagem estática, o build é esse comando, e a
pasta publicada é `site`.

A Cloudflare Pages continua sendo uma alternativa, caso um dia se queira domínio
próprio — build command `node coleta/publicar.mjs`, output directory `site`.
Não está em uso.

A coleta precisa de permissão de escrita no repositório, já declarada no
workflow (`permissions: contents: write`).

## Conferências

Não há suíte de testes separada: cada peça traz a própria conferência, e as que
dispensam rede podem ser rodadas a qualquer momento.

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

- **README.md** (este) — o estado atual: requisitos, arquitetura, dados,
  operação, conferências e pendências em aberto.
- **[HISTORICO.md](HISTORICO.md)** — o registro datado de cada alteração, da
  mais recente para a mais antiga.

A cada alteração, na mesma entrega: atualize as seções afetadas deste README
(inclusive o inventário e as pendências em aberto) e acrescente uma entrada
datada **no topo** do HISTORICO.md, com responsável, motivo, arquivos,
validação, efeito nos dados e na implantação, e pendências.

Distinga sempre implementação local, teste com amostras, consulta real às fontes
e publicação. Não registre resultado simulado como confirmação oficial. Não
inclua credenciais, cookies ou tokens em nenhum dos dois arquivos.
