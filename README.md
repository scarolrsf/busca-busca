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
   corte-aberta.mjs   baixa as 3 bases de RG do Corte Aberta e anota a data da suspensão nacional
   boletins-nugepnac.mjs  casa as notícias do NUGEPNAC com o boletim da semana
   complemento.mjs    a coleta feita daqui: atualiza, coleta e envia
  agendado.cmd       o que o Agendador do Windows executa todo dia, sem pause

coletar-aqui.cmd  dois cliques para rodar o complemento no Windows

MIGRACAO.md    mapa para migração de servidor, aba por aba; o estado atual continua aqui neste README

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
11/09/2026 (ver histórico): a exportação pode ser dirigida por um navegador de
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
sem publicar até o envio seguinte da máquina da Sarah. O `site/dados.json` é versionado pela própria coleta,
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

### 12/09/2026 — O Pages servia a base das 9h depois da coleta das 18h: Publicar agora roda ao término de cada Coleta

**Responsável:** Muse Spark, a pedido de Sarah ("sim", após o diagnóstico de que
a aba Fontes mostrava a última atualização às 9h da manhã).

**Motivo.** O `dados.json` servido pelo Pages tinha `geradoEm` de 12:03 UTC
(base das 09h02), embora a coleta das 18h18 (`0a1b613`) já estivesse no
repositório. Conferido na API de runs: nenhum commit da coleta (`0a1b613`,
`c539366`, `1d4ed9e`) teve run do Publicar; o único Publicar sobre commit de
coleta (`fa22c76`, 10/09) fora disparo manual. Causa: push feito com
`GITHUB_TOKEN` não dispara workflow novo (proteção anti-recursão do GitHub) —
e o `publicar.yml` só ouvia `push`. A coleta agendada nunca publicava; o site
só andava nos envios da máquina da Sarah (que usam credencial própria) ou em
disparo manual.

**O que mudou.**

- `.github/workflows/publicar.yml`: além de `push`, dispara em `workflow_run`
  ao término da Coleta em `main`, e só publica se a conclusão for `success`
  (coleta que falha não commita). Sem segredo novo nem PAT para manter. Seção
  "Publicar" acima ajustada em consequência.
- Nenhuma mudança na coleta nem na base.

**Validação.** `node coleta/publicar.mjs` rodado aqui: base íntegra, regra de
suspensão conferida sem falha (a mesma conferência que o Publicar roda antes
de publicar). Sintaxe do YAML conferida por leitura do diff. A prova em
produção é o run do Publicar disparado por este próprio envio (evento `push`),
acompanhado na API de runs mais o `geradoEm` do `dados.json` no Pages.

**Dados e implantação.** Nenhuma mudança na base. Este envio leva ao Pages a
base das 18h18; as coletas seguintes publicam sozinhas, sem depender do envio
da máquina da Sarah.

**Pendências.** O agendador do GitHub continua de melhor esforço (atraso de
minutos é normal; os sete minutos quebrados de `coletar.yml` seguem valendo).
Janela inteiramente pulada continua coberta pelo Monitor da coleta (issue +
e-mail). Retry de leitura já existia e foi mantido como está: três tentativas
com pausa crescente nos dois níveis — requisição (`ambiente.mjs`) e fonte
inteira (`regras.js`) — só para o que é passageiro (rede, tempo esgotado, 429
e 5xx); 403/404 não repetem, por decisão de 11/09/2026.

### 12/09/2026 — Duas pendências do dia: Corte Aberta não tem as datas, e a frase da marca vira condicional

**Responsável:** Muse Spark, a pedido de Sarah ("vamos fazer como vc sugeriu",
sobre os itens 1 e 2 das pendências da entrega do Claude Code do mesmo dia).

**Item 1 — trânsito e publicação do acórdão: o Corte Aberta também não os tem.**
Mapeadas as colunas dos três CSVs baixados em 11/09/2026 (`rg-temas`,
`rg-suspensao-nacional`, `rg-representativo-controversia`, 1.483 registros):
nenhum traz data de trânsito em julgado nem data de publicação do acórdão de
mérito. O que há de próximo é **"Data julgamento tema"** — data do julgamento,
não da publicação — e **"Situação Processo Paradigma"** ("Acórdão de mérito
publicado", texto sem data). Usar uma como proxy da outra seria o mesmo erro de
12/09/2026 em outra roupa, então não se usa. De quebra, o mapeamento confirmou
o conserto daquele dia: "Data admissibilidade RG" bate com o que a ficha mostra
como "Repercussão geral apreciada em" (conferido nos temas 372, 966, 1031, 1417
e 1455). Conclusão: a pendência segue aberta, mas estreitada — só as fichas
individuais do portal do STF restam como fonte, ao custo de 1.482 requisições,
com risco ao firewall e para datas que não entram na regra de suspensão. Fica
valendo o link "Fonte oficial", sem raspagem.

**Item 2 — "a marca não informa a data": virou condicional, só na tela.**
Nos 22 temas em que a data da determinação é conhecida, a ficha mostrava
"Suspensão nacional determinada em …" e, logo acima, a frase dizendo que a
marca não informa a data. O ajuste é `textoSuspensao(r)` em `site/index.html`:
havendo `suspensaoNacionalDesde`, troca-se só na exibição "não informa a data
nem as exceções" por "não informa as exceções"; sem a data, o texto sai
idêntico ao gravado. Nada muda na base — e de propósito: o coletor não conhece
a data na hora da coleta (ela entra depois, via `--anotar`), então texto datado
gravado seria revertido na coleta seguinte, além de gerar novidades falsas em
ALTERACOES. A classificação não se move: a regra lê o campo original, e o Tema
372 segue DETERMINACAO, em vigor, NACIONAL, risco ALTO.

- `site/index.html`: `textoSuspensao` na ficha, exportada junto às funções da
  regra para ser conferida.
- `coleta/conferir-regra.mjs`: invariante 12 — com data conhecida, o exibido
  não pode dizer que ela é desconhecida; sem data, o exibido tem de ser o
  gravado.

**Validação.** `conferirRegraDeSuspensao` sobre a base inteira, agora com as
doze invariantes: sem falha, contagens idênticas às de 12/09/2026 (em vigor
1.680; NACIONAL 127, ESTADUAL 101, RECURSAL 44). Conferência funcional: 22
temas com a frase nova, 38 sem data com a antiga intacta (ex.: STF-TEMA-32), e
o momento do 372 inalterado. `corte-aberta.mjs --autoteste`: 21 verificações,
todas passam.

**Dados.** Nenhuma alteração na base nem em ALTERACOES. Tudo é derivado na
exibição.

**Implantação.** Publica com o próximo envio ao GitHub, como qualquer
alteração.

**Pendências.** Seguem com Sarah os segredos do espelho e o aviso à Turma
Recursal; e segue aberta a fonte automática para trânsito e publicação do
acórdão do STF.
### 12/09/2026 — Em qual boletim do NUGEPNAC o tema saiu

**Responsável:** Claude Code, a pedido de Sarah: "no site do tribunal, temos os
boletins do nugepnac que informam os temas suspensos, faça um campo para constar
em qual boletim cada tema consta e coloque um link para direcionamento ao
respectivo boletim".

**O caminho que não foi tomado.** O primeiro palpite era ler os PDFs dos
boletins e pescar "TEMA 1476" dentro deles. Funcionaria, mas exigiria extrator
de PDF — dependência que este projeto não tem — e deixaria a leitura refém do
diagramador: o número do tema aparece lá como título de caixa, e nada garante
que continue assim. Pior: no PDF o tribunal do tema se descobre pelo tipo do
processo ao lado (RE, ARE, REsp), e STF e STJ têm temas com o mesmo número.

**O caminho que foi.** O NUGEPNAC publica, além do PDF semanal, **cada notícia
em HTML**, com data, categoria e o tema entre parênteses — e ali o tribunal vem
dito: "(Tema 1376 - STJ)", "(Tema 113 IRDR - TJMG)". E a lista de boletins traz,
no título de cada um, a semana que ele cobre. O casamento se faz pela data: a
notícia diz o tema e o dia; o boletim daquela semana é o boletim em que o tema
consta. Sem ler PDF, sem adivinhar tribunal.

**O que mudou.**

- `coleta/boletins-nugepnac.mjs` (novo): lê a lista de boletins e as notícias —
  as duas são formulários Lumis, que respondem a POST comum, sem navegador —,
  casa uma coisa com a outra e grava `boletim` e `boletimUrl` no registro, fora
  do fluxo da coleta. `--recente` lê 45 dias, `--desde` um horizonte qualquer,
  `--ensaio` mostra sem gravar, `--autoteste` roda sem rede.
- `coleta/regras.js`: os dois campos entram em `CAMPOS` e `ROTULOS`. Nenhum
  coletor os emite, e é isso que os preserva: `atualizarRegistros_` só compara o
  que vem na leitura da fonte.
- `site/index.html`: a ficha ganha "Boletim do NUGEPNAC", com link para o PDF em
  nova aba.
- `coleta/agendado.cmd`: a rotina diária chama `--anotar --recente` antes da
  coleta, junto do Corte Aberta.

**O que a leitura aprendeu com a fonte.** A primeira versão lia só
"(Tema N - TRIB)" e perdia três formatos que aparecem na mesma semana: vários
temas de uma vez ("Temas 65, 66 e 67 - STJ"), incidente do TJMG com o tipo
colado ("Tema 113 IRDR - TJMG") e **controvérsia** ("Controvérsia 827 - STJ"),
que não é tema e ficou de fora de propósito — casá-la pelo número apontaria o
boletim errado. Com os três, o alcance subiu de 304 para 330 registros, e os
incidentes do próprio TJMG passaram a aparecer.

**Resultado.** 330 registros com boletim: 191 repetitivos do STJ, 116 temas do
STF, 21 IRDR e 2 IAC do TJMG, apontando para 38 boletins distintos. Das 380
notícias do último ano, 30 não citam tema — são controvérsias e informações
gerais — e ficaram sem vínculo, como devem.

**Validação.** `--autoteste`: 28 verificações, sem rede, cobrindo os quatro
jeitos de citar tema, o casamento por semana e a recusa de gravar em ensaio.
Leitura real do portal do TJMG: 140 boletins e as notícias de um ano.
Conferência da regra sobre a base inteira: sem falha. O coletor do STF rodado de
verdade contra uma cópia da base deixou ALTERACOES em 5.331 — zero novidades
falsas — e os 330 boletins continuaram lá depois da coleta. O link de um boletim
foi baixado para conferir: 200, `application/pdf`, 828 KB. Ficha conferida na
prévia, em tema do STF e em IRDR do TJMG.

**Dados e implantação.** 330 registros ganharam dois campos; nenhuma entrada
nova em ALTERACOES. Publica com o envio ao GitHub.

**Pendências.** O horizonte anotado é de um ano — tema cujo último boletim seja
mais antigo fica sem o campo até uma varredura maior ser pedida à mão
(`--desde`). E a categoria da notícia ("Suspensão Nacional", "Prorrogação de
Suspensão") hoje só aparece no relatório da execução; ela diria, na ficha, *por
que* o tema saiu naquele boletim.

### 12/09/2026 — A coluna ADMISSÃO estava na planilha o tempo todo

**Responsável:** Claude Code, a pedido de Sarah, que viu na aba "Novidades"
cartões anunciando "Julgamento realizado" com o número **139** no corpo e
mandou trocar por "Admitido em …", com a fase a partir da qual suspender no
lugar do número — "é mais válido".

**O que estava errado.** O cartão noticiava um julgamento que não houve: a
planilha da Turma Recursal traz "139", "20", "71" nas colunas de julgamento e de
trânsito, e o portal, lendo campo de data, anunciava a chamada correspondente.
Eram 45 cartões, todos de IUJ.

**A descoberta.** A planilha tem uma coluna **ADMISSÃO**, com data de verdade em
formato Excel, e a coleta a ignorava: lia as colunas 1, 4, 5, 6, 7, 8, 9, 10, 11
e 12, pulando a 2. O IUJ 2806132-61.2026.8.13.0000, o da imagem, foi admitido em
**03/09/2026** — e o portal não sabia dizer.

**O que mudou.**

- `coleta/regras.js`: `coletarIUJ_` passa a ler a coluna ADMISSÃO para o campo
  novo `admissao`, que entra em `CAMPOS`, em `ROTULOS` e na consolidação de
  linhas repetidas do mesmo incidente. A conferência de cabeçalho agora exige a
  coluna: se ela sair do lugar, a coleta falha em vez de gravar vazio.
- `dados/temas-do-portal.json`: 48 IUJ com a data de admissão gravada, fora do
  fluxo da coleta — a coluna sempre esteve lá, e passar pelo fluxo faria a aba
  "Novidades" anunciar 48 admissões hoje. Sete IUJ ficam sem: são os da
  "Planilha inicial", que não constam da planilha atual.
- `site/index.html`: a ficha ganha "Admissão do incidente". Na aba "Novidades",
  cartão de campo de data com valor que não é data deixa de anunciar julgamento:
  a chamada passa a ser **"Admitido em dd/mm/aaaa"** quando o incidente está
  admitido, ou o estágio que a situação disser; o corpo mostra **"Suspender a
  partir de: …"** em vez do número; e a etiqueta do campo some, porque o campo
  não é mais o assunto do cartão.
- `site/index.html`: o mapeamento de situação virou `sentidoDaSituacao`, usado
  agora em dois lugares, e `ehData` reúne o teste de data que estava repetido.

**Validação.** A prova de sempre: `coletarIUJ_` rodado de verdade contra uma
cópia da base deixou ALTERACOES em 5.331 — zero novidades falsas sobre 48
registros. Na primeira execução apareceu **uma** diferença, e ela valeu a pena:
o IUJ 1.0000.24.279369-3/000 tem duas linhas na planilha com datas de admissão
diferentes, e `consolidarIUJ_` as junta em "Registro da fonte 1 / 2" — a base
foi alinhada a esse formato, e a segunda execução acusou zero. Conferência da
regra sobre a base inteira: sem falha; nenhuma classificação mudou. Na prévia,
os dois cartões da imagem agora dizem "Admitido em 03/09/2026" com "Suspender a
partir de: Após encerrada a instrução probatória".

**Dados e implantação.** 48 registros ganharam data de admissão; nenhuma entrada
nova em ALTERACOES. Publica com o envio ao GitHub.

**Pendências.** Os 45 valores que não são data continuam na fonte, e o aviso à
Turma Recursal segue pendente. A coluna BOLETIM da mesma planilha está quase
toda vazia — só 3 dos 48 IUJ a trazem —, e é por isso que o boletim do NUGEPNAC
pedido pela Sarah precisa vir da página do tribunal, não daqui.

### 12/09/2026 — "Julgamento 139" deixa de ser resposta

**Responsável:** Claude Code, a pedido de Sarah, que mandou a imagem de uma
ficha: sob o rótulo JULGAMENTO, o número **139** em destaque e, abaixo, um
parágrafo explicando que aquilo não era data.

**Motivo.** O aviso estava certo e o arranjo, errado. O número ocupava o lugar
da data, em monoespaçada, como se fosse a resposta do campo; o desmentido vinha
depois, e quem bate o olho lê "Julgamento 139". Num portal em que a data de
julgamento entra em decisão, parecer data já é dano.

**O que mudou.** Em `site/index.html`, só `campoDeData`: o valor do campo passa
a ser **sem data**, discreto e em itálico, e o que a planilha trouxe fica ao
lado, entre aspas — "A planilha do tribunal traz '139' neste campo". O valor
continua ali, porque este portal não apaga o que o tribunal publicou; o que ele
deixa de fazer é apresentá-lo como aquilo que não é. Uma classe nova, `.sem-data`,
com a cor mais apagada da escala.

**Alcance.** 45 campos em 12/09/2026 — julgamento e trânsito somados, todos em
IUJ do TJMG, todos vindos assim da planilha oficial da Turma Recursal. Os
números são "20", "39", "64", "71", "75", "90", "99", "110", "134", "139".

**Validação.** Conferência da regra sobre a base inteira: sem falha, e nenhuma
classificação mudou — a alteração é de exibição. Ficha do IUJ
2806269-43.2026.8.13.0000, a da imagem, conferida na prévia local: "JULGAMENTO /
sem data / A planilha do tribunal traz '139' neste campo".

**Dados e implantação.** Nenhuma mudança na base. Publica com o envio ao GitHub.

**Pendências.** Segue valendo a de avisar a Turma Recursal: o erro é da planilha
oficial, e o portal só pode sinalizá-lo.

### 12/09/2026 — As datas do STF, e a suspensão que veio depois do acórdão

**Responsável:** Claude Code, a pedido de Sarah ("faça os dois"), depois de ela
conferir na fonte oficial os sete temas que o portal dava por encerrados e o STF
ainda listava como suspensos. A conferência dela fechou um diagnóstico e abriu
outro.

**O que a conferência mostrou.** Dos sete, seis estavam certos: acórdão de
mérito publicado — 1455 em 14/08/2026, 1209 em 04/03/2026, 1031 em 15/02/2024,
1232 em outubro de 2025, e os Temas 966 e 976 com os embargos julgados em
01/07/2026 e o acórdão publicado em 08/09/2026, três dias antes desta leitura. A
marca continua vigente no painel do STF porque o tribunal só a revoga
formalmente; a lei não espera por isso.

O sétimo, não. **O Tema 372 teve o acórdão de mérito publicado em 06/07/2023 e a
suspensão nacional determinada em 30/08/2024** — treze meses depois. Ordem
posterior ao marco que a encerraria não é resquício de cadastro.

E a página que a Sarah colou trazia, de brinde, a prova de um segundo defeito:
"Data da Repercussão geral: 04/03/2011" — exatamente a data que este portal
mostrava como "Publicação do acórdão".

**As datas: o que estava errado.** A coluna "Situação Atual" da tabela do STF
guarda três coisas — a apreciação da repercussão geral, uma data e a situação
processual — e a data pertence à primeira. `datasDaSituacaoSTF_` a tomava pela
data da situação: onde se lia "Trânsito em Julgado", virava data de trânsito.
Resultado medido na base: **584 dos 1.251 temas com "trânsito em julgado"
tinham trânsito anterior ao próprio julgamento**, o que é impossível; e contra o
Corte Aberta, **1.299 das 1.397 datas batem exatamente com "Data admissibilidade
RG"**.

**O que mudou nas datas.**

- `coleta/regras.js`: `datasDaSituacaoSTF_` deu lugar a `datasDoTemaSTF_`, que
  não inventa trânsito nem publicação — o STF não os publica nessa tabela — e
  grava as duas datas que ela de fato traz: `repercussaoGeral`, da coluna de
  situação, e `dataDaTese`, da coluna "Tese / Data Tese". Os dois campos entram
  em `CAMPOS` e `ROTULOS`.
- `dados/temas-do-portal.json`: correção única dos 1.482 temas do STF, **fora do
  fluxo da coleta** — 1.251 datas de trânsito e 146 de publicação esvaziadas,
  1.423 datas de repercussão geral e 1.302 datas de tese gravadas. Passar pelo
  fluxo marcaria milhares de precedentes como alterados hoje, e a aba
  "Novidades" diria que o STF mexeu neles. Não mexeu: nós é que líamos errado.
- `site/index.html`: a ficha mostra os dois campos novos; a ordenação por "mais
  recentes" passa a considerá-los, e com isso 1.426 dos 1.482 temas do STF
  voltam a ter data que ordena.

**A suspensão posterior: o que mudou.**

- `coleta/corte-aberta.mjs`: `--anotar` lê o CSV de suspensão nacional já
  baixado e grava `suspensaoNacionalDesde` nos temas do STF; `--ensaio` mostra
  sem gravar. É a primeira ponte do Corte Aberta para a base, e ela é estreita
  de propósito: um campo, escrito fora do fluxo da coleta. Os coletores não
  emitem esse campo, e por isso ele sobrevive a cada coleta —
  `atualizarRegistros_` só compara o que a leitura da fonte traz. Tema que sai
  da lista de suspensão nacional tem o campo limpo.
- `site/index.html`: `determinacaoPosteriorAoParadigma` compara a data da
  determinação com a data mais recente do julgamento do tema; sendo posterior,
  `encerrado()` não cessa a suspensão, e a ficha explica por quê, citando o
  art. 1.040, III. Sem a data, a função se cala e a regra geral vale como antes.
- `coleta/conferir-regra.mjs`: invariantes 10 e 11 — determinação posterior não
  pode constar como encerrada; datas novas têm de ser datas; e tema do STF não
  pode trazer trânsito nem publicação, que é o guarda contra a volta do erro.
  A invariante 3 passou a admitir a ordem posterior como exceção, ao lado da
  cláusula expressa.
- `coleta/agendado.cmd`: o Corte Aberta passou para **antes** da coleta, com
  `--baixar` e `--anotar`. O `complemento.mjs` commita a pasta `dados` inteira,
  então a data anotada entra no commit do mesmo dia; rodando depois, esperaria
  o dia seguinte.

**Impacto.** Um único registro muda de classificação: o Tema 372, de "sem
suspensão em vigor, risco baixo" para **suspensão nacional em vigor, risco
alto**. A contagem por alcance vai de NACIONAL 126 para 127; ESTADUAL 101 e
RECURSAL 44 seguem iguais. As datas mudam a exibição de 1.482 fichas do STF e
nenhuma classificação — os campos de data não entram na regra de suspensão, o
que já fora conferido quando eles foram criados.

**Validação.** A prova que importava: o coletor do STF **rodado de verdade**
contra uma cópia da base corrigida deixou ALTERACOES em 5.331 entradas — zero
novidades sobre 1.482 registros. Coletor e base dizem a mesma coisa, e a
correção feita fora do fluxo não vira novidade falsa na próxima coleta. Na mesma
execução ficou provado que `suspensaoNacionalDesde` sobrevive à coleta: os 22
temas anotados continuam com a data depois de o STF ser lido de novo.
`corte-aberta.mjs --autoteste`: 21 verificações, incluindo seis novas sobre a
anotação — só a vigente é anotada, a cancelada é limpa, o ensaio não grava, e
rodar duas vezes não muda nada na segunda. Conferência da regra com as onze
invariantes sobre a base inteira: sem falha. No navegador, prévia local: o Tema
372 mostra a pílula "Suspensão nacional", o aviso vermelho e a explicação da
ordem posterior; o Tema 1031 não mostra mais trânsito nenhum e traz
"Repercussão geral apreciada em" e "Tese firmada em"; o Tema 1417 — atraso de
voo, matéria de Juizado — segue com a suspensão nacional que o conserto de
ontem devolveu.

**Dados.** 1.482 temas do STF com datas corrigidas e 22 com a data da suspensão
nacional anotada. Nenhuma entrada nova em ALTERACOES, de propósito. Nenhum dado
do tribunal foi reescrito: o que mudou foi a nossa leitura.

**Implantação.** Publica com o próximo envio ao GitHub, como qualquer alteração.
A anotação diária só vale na máquina da Sarah, onde o Corte Aberta responde.

**Pendências.** (1) Trânsito em julgado e publicação do acórdão de mérito
continuam sem fonte automática — estão na ficha de cada tema no portal do STF,
uma página por tema, e entrariam ao custo de 1.482 requisições; hoje o link
"Fonte oficial" leva até lá. (2) O texto da marca de suspensão do STF ainda diz
"a marca não informa a data" nos 22 temas em que a data agora é conhecida;
corrigir a frase mexe no campo `suspensao` de todos os temas marcados e pede a
mesma cerimônia de correção fora do fluxo. (3) As duas pendências da Sarah
seguem abertas: os segredos do espelho e o aviso à Turma Recursal.

### 11/09/2026 — Acórdão de repercussão geral publicado deixa de encerrar a suspensão

**Responsável:** Claude Code, a pedido de Sarah ("faça o que ainda está
pendente"). O erro apareceu ao fechar uma pendência de outra entrega: a
auditoria do Corte Aberta contra a base.

**O erro, e ele era do mesmo tamanho do IRDR 94.** O CSV de suspensão nacional
do Corte Aberta, baixado nesta máquina em 11/09/2026, lista **22 temas com
"Suspensão Nacional Vigente"**. Conferidos um a um contra o portal, **todos os
22 apareciam como "Sem suspensão em vigor", risco baixo** — a ficha dizia, em
verde, que dava para sentenciar. Em 15 deles isso era simplesmente falso.

**Causa.** O STF escreve duas coisas na mesma coluna de situação: "Acórdão de
mérito publicado" e "Acórdão de Repercussão Geral publicado". `grupoSituacao`
juntava as duas no grupo "Acórdão publicado" — havia até um comentário no
código dizendo que a expressão exata não alcançaria nenhuma delas — e
`encerrado()` aplicava a ambas o art. 1.040, III. Mas elas dizem o contrário
uma da outra: o acórdão de mérito encerra a suspensão; o acórdão de repercussão
geral é o **reconhecimento** da repercussão geral, com o mérito pendente, e é
justamente o momento em que a suspensão nacional é determinada (art. 1.035,
§ 5º, e art. 1.037, II). O portal lia o início da suspensão como se fosse o fim.

**O que mudou.**

- `site/index.html`: `grupoSituacao` separa as duas — "Acórdão publicado" só
  para o mérito, e a situação nova **"Repercussão geral reconhecida"** para o
  acórdão do reconhecimento. O acórdão que *nega* a repercussão geral continua
  encerrando, e a ordem dos testes garante isso (8 temas hoje trazem as duas
  frases: "Acórdão de Repercussão Geral publicado — Não há repercussão geral").
- `site/index.html`: `porqueContinuaSuspenso` explica a situação nova citando os
  artigos, e o guia "Como usar" ganhou a definição dela.
- `site/index.html`: nesses temas, a data que a fonte prende à situação é a
  publicação do acórdão **do reconhecimento** — o rótulo da ficha passa a dizer
  isso, em vez de "Publicação do acórdão", que seria lido como o paradigma que
  ainda não existe.
- `coleta/conferir-regra.mjs`: invariante 9 — acórdão de repercussão geral
  publicado, sem mérito publicado e sem trânsito, cancelamento ou negativa de
  repercussão geral, não pode aparecer como encerrado.

**Impacto, medido registro a registro sobre a base inteira (4.430 registros).**
125 mudam de classificação, e nenhum outro: **15** vão de "encerrado / risco
baixo" para **suspensão nacional em vigor, risco alto** — os temas 843, 1016,
1192, 1198, 1252, 1271, 1290, 1297, 1329, 1389, 1404, 1417, 1423, 1443 e 1467;
**110** vão para "suspensão não determinada", faixa âmbar — temas vivos, sem
ordem registrada, onde convém conferir antes de sentenciar. Contagem por
alcance: NACIONAL de 111 para 126; ESTADUAL 101 e RECURSAL 44, sem mudança; em
vigor, de 1.554 para 1.679.

**Os 7 que continuam encerrados, de propósito.** Dos 22 que o STF lista como
vigentes, 7 já têm acórdão de mérito publicado (temas 372, 966, 976, 1031,
1209, 1232 e 1455). Para esses o art. 1.040, III responde: publicado o
paradigma, os sobrestados retomam o curso. O painel do STF só registra a
revogação quando ela é formalizada; a lei não espera por isso. A divergência
fica anotada aqui, e é conferível tema a tema.

**Validação.** Comparação antes/depois sobre a base inteira, com as duas versões
da regra carregadas lado a lado — 125 mudanças, todas na transição descrita,
nenhuma em outro sentido. A conferência da regra passa com as nove invariantes.
A invariante 9, rodada contra a versão anterior do portal, reprova 125 temas,
entre eles os 15 nacionais: ela teria pegado o erro. No navegador, prévia local
com a base de 11/09/2026 — o Tema 1467 mostra "Repercussão geral reconhecida",
pílula "Suspensão nacional", aviso vermelho e a explicação com os artigos; o
Tema 79, sem determinação, mostra a faixa âmbar; a data aparece como "Publicação
do acórdão de repercussão geral"; e a situação nova entra na lista de filtros
por estágio.

**Dados.** Nenhuma alteração na base nem em ALTERACOES. A classificação é
derivada na exibição, e nada do que o tribunal publicou foi reescrito.

**Pendências.** Conferir, com os 7 temas na mão, se em algum deles a
determinação de suspensão foi mantida por decisão posterior ao acórdão de
mérito — seria cláusula expressa, e a regra já a respeita, mas só quando o texto
a traz. A auditoria do Corte Aberta, agora diária, passa a ser o lugar onde uma
divergência dessas aparece cedo.

### 11/09/2026 — Pendências fechadas: prazo vencido na ficha, Corte Aberta diário e o trabalho que não estava no Git

**Responsável:** Claude Code, a pedido de Sarah ("faça o que ainda está
pendente"), varrendo as pendências registradas nas últimas entregas.

**O trabalho que existia só no disco.** `MIGRACAO.md` e
`coleta/corte-aberta.mjs` estavam descritos em entradas de histórico já
commitadas, mas nunca tinham entrado no Git: viviam como arquivos soltos na
máquina da Sarah, a um `git clean` de sumir, com o README afirmando que
existiam. Foram commitados sem alteração de conteúdo. Junto, commitado também o
trabalho concluído e validado de "Determinação sem ressalva de fase", que
estava na árvore de trabalho com a entrada de histórico pronta — a conferência
da regra foi rodada antes de gravar e bateu com os números daquela entrada.
Nada foi enviado ao GitHub: a publicação continua sendo decisão da Sarah.

**A varredura que o IRDR 94 pediu.** A pendência era conferir se outros
incidentes registram recurso vivo com redação que os padrões não alcançam.
Varridos os 124 incidentes encerrados: 31 mencionam embargos, recurso especial,
extraordinário ou agravo, mas em 28 a situação é trânsito em julgado,
cancelamento ou baixa — ali a suspensão acabou por si, e a menção é histórico do
incidente. Restam 3 em "acórdão publicado", que é onde a inferência do art. 982,
§ 5º, de fato opera: em dois (IRDR 82 e 89) os embargos já foram julgados, e
encerrado está certo; o terceiro, o IRDR 93, registra efeito suspensivo
prorrogado por 60 dias em 28/07/2025, vencido desde 26/09/2025. Nenhum caso novo
do tipo IRDR 94. Registro de método: a primeira varredura acusou seis casos
porque o padrão `embarg` casa com "Des**embarg**ador" — os três falsos positivos
caíram com fronteira de palavra.

**O prazo vencido virou aviso.** Do IRDR 93 saiu a leitura descrita na seção "O
prazo que a determinação declarou": `prazoDaSuspensao` lê prazo em algarismo
preso a uma data e a uma palavra de suspensão, e `avisoDePrazoVencido` põe as
três datas na ficha sem mexer na classificação. `conferir-regra.mjs` ganhou a
invariante 8, que reprova prazo lido pela metade — data ilegível, dias não
positivos, fim antes do início.

**Corte Aberta entra na rotina.** `coleta/agendado.cmd` — o que o Agendador do
Windows roda às 9h — passa a chamar `corte-aberta.mjs --baixar` depois da
coleta, ainda na fase de auditoria paralela: baixa os três CSVs, guarda em
`work/` com hash e diz se mudaram desde ontem, sem tocar em `dados/` nem no
site. O código de saída da coleta é guardado antes e devolvido ao Agendador no
fim, de modo que falta de Playwright ou recusa do WAF do STF não derrubem a
coleta do dia — falham sozinhas no log. Foi essa auditoria, rodada à mão hoje,
que revelou o erro do acórdão de repercussão geral.

**Validação.** `corte-aberta.mjs --autoteste`: 15 verificações, todas passam.
Conferência da regra com as nove invariantes sobre a base inteira: sem falha.
Invariante 8 exercitada por simulação — uma cópia do portal com a leitura de
prazo quebrada de propósito foi reprovada, e a cópia, apagada. Fichas conferidas
no navegador, em prévia local: IRDR 101 (em vigor) e IRDR 93 (encerrado) com o
texto próprio de cada caso, e o IRDR 74 — que tem prorrogação posterior sem
prazo em número — corretamente sem aviso nenhum.

**Dados e implantação.** Nenhuma alteração na base. O `agendado.cmd` só passa a
valer na próxima execução da tarefa, na máquina da Sarah.

**Pendências que continuam, e são da Sarah.** (1) Cadastrar `ESPELHO_URL` e
`ESPELHO_CHAVE` nos segredos do repositório — o `gh` não está instalado nesta
máquina, e segredo não se cadastra a partir daqui de todo modo; feito isso,
apagar `work/espelho-segredos.txt`. (2) Avisar a Turma Recursal sobre os três
defeitos da planilha oficial — o IUJ 1.0000.25.219586-2/000 ausente, o número de
Itaúna com um zero a menos e os 43 campos de julgamento com não-datas; a minuta
do aviso está em `work/aviso-turma-recursal.md`, fora do Git. (3) Decidir,
depois de alguns dias de auditoria batendo, se o Corte Aberta substitui
`todostemas.asp` como fonte do STF.

### 11/09/2026 — Determinação sem ressalva de fase: "desde a determinação", não "não especificada"

**Responsável:** Muse Spark, a pedido de Sarah, que leu uma ficha com aviso de
suspensão persistente logo acima de um bloco dizendo "fase não especificada" e
perguntou se ali não deveria dizer que a suspensão é imediata.

**O erro.** Os dois blocos respondem a perguntas diferentes — o aviso de cima diz
*até quando* a suspensão dura, o bloco de baixo diz *de que fase em diante*
suspender —, então não se contradiziam. Mas a resposta de baixo estava errada por
omissão: `momentoDaSuspensao` só dizia "imediata" quando o texto trazia as
expressões literais ("suspensão imediata", "suspender de imediato"), e jogava
todo o resto em "fase não especificada". Medido na base de 11/09/2026, isso
significava **2** registros classificados como imediatos contra **551** em "não
especificada" — e, entre os que chegam à tela com suspensão em vigor, "não
especificada" era a maioria: 128 de 255. Um bloco em destaque, no alto da ficha,
que na maioria das vezes devolvia ao leitor a pergunta que ele foi lá fazer.

E a omissão tinha consequência prática, que é o que motivou a mudança: Sarah
perguntou se, havendo suspensão determinada, não haveria problema em aguardar
também o fim da instrução probatória. Há. Suspenso o processo, é vedado praticar
atos processuais, salvo os urgentes (art. 314 do CPC) — instrução em curso não é
ato urgente, e prova colhida sob suspensão é ato praticado contra a determinação.
A espera pelo fim da instrução só se sustenta onde o próprio tribunal a ressalvou.
Um bloco que diz "fase não especificada" não desautoriza essa espera; um que diz
"desde a determinação" desautoriza.

**O que mudou.**

- `site/index.html`: novo momento `DETERMINACAO` — rótulo "Desde a determinação",
  com nota que cita o art. 314 do CPC, diz que não se aguarda o fim da instrução
  e remete ao documento de origem, cuja ressalva prevalece. `momentoDaSuspensao`
  passa a devolvê-lo quando há texto de determinação sem ressalva de fase.
- `site/index.html`: `NAO_DITO` fica restrito à ausência de texto de suspensão —
  ausência de fonte, não silêncio dela — e a nota foi reescrita nesse sentido.
  `IMEDIATA` continua existindo para o tribunal que diz com todas as letras; a
  diferença entre os dois é de autoria, e as duas levam a mesma faixa vermelha.
- `site/index.html`: `momentoDaSuspensao` passa a aparar o texto antes de testar
  se existe. A fonte traz célula com um espaço só — o STJ-TEMA-24 é assim —, e
  sem isso um campo em branco viraria "desde a determinação". A invariante 6
  pegou esse caso na primeira execução.
- `coleta/conferir-regra.mjs`: invariante 6 ganhou a recíproca — "não
  especificada" com texto de suspensão presente passa a ser falha de regra.
- `README.md`: seção "A partir de quando suspender" refeita e esta entrada.

**Validação.** Local, sobre a base versionada em `site/dados.json` (3.205
registros, coleta de 11/09/2026): `conferirRegraDeSuspensao` roda sem falha.
Distribuição do momento entre os registros com suspensão em vigor e alcance
determinado — os que exibem o bloco: 129 "desde a determinação", 88 "só na fase
recursal", 39 "após encerrada a instrução probatória", 0 "fase não especificada".
Na base inteira: 557 `DETERMINACAO`, 362 `RECURSAL`, 42 `INSTRUCAO`, 2 `IMEDIATA`,
3.467 `NAO_DITO` (registros sem texto de suspensão, que não exibem o bloco).
Não houve consulta nova às fontes oficiais nem publicação — a mudança é de
classificação e texto, e vale sobre os dados já coletados.

**Dados e implantação.** Nenhuma alteração em `site/dados.json` nem no formato da
coleta. Publica pelo fluxo normal do GitHub Pages ao gravar no repositório.

**Pendências.** Os 129 registros que agora dizem "desde a determinação" derivam
de silêncio do extrato, não de afirmação do tribunal. Se a conferência de algum
documento de origem revelar ressalva de fase que o extrato cortou, é caso de
corrigir o dado na fonte — a nota do bloco já avisa o leitor disso.

### 11/09/2026 — IRDR 94: embargos vivos não deixam a suspensão cessar

**Responsável:** Muse Spark, a pedido de Sarah, que apontou o erro: o IRDR 94
tem determinação de suspensão renovada por causa dos embargos de declaração, e
o portal dizia que não havia.

**O erro, e ele era real.** O portal classificava o IRDR 94 como "Sem suspensão
em vigor", risco baixo. A determinação, no campo de suspensão, diz o contrário
com todas as letras: *"Em 11/03/2026, o relator do incidente, em decisão
monocrática, nos embargos de declaração interpostos, concedeu-lhes efeito
suspensivo, asseverando que 'fica mantida a suspensão de todas as ações em
tramitação no território mineiro, de Primeira e Segunda Instância, na Justiça
Comum e no Juizado Especial'"*. Era o erro mais grave que esta ferramenta pode
cometer: dizer que se pode sentenciar quando há ordem em contrário.

**Causa.** Duas falhas somadas. `pendencias()` lia apenas `situacao` e
`observacoes` — e o TJMG narra a marcha do incidente no campo `suspensao`, que
ela não lia. E o padrão de embargos exigia a palavra "pendentes"; o texto diz
"embargos de declaração **interpostos**". Sem pendência reconhecida,
`encerrado()` aplicava o art. 982, § 5º, e dava a suspensão por cessada.

**O que mudou.** `site/index.html`: `pendencias()` passa a ler também o campo de
suspensão, de forma pontual — dois padrões, "embargos com efeito suspensivo" e
"embargos interpostos/opostos" —, e não o campo inteiro: quase todo texto de
suspensão contém "sobrestado", e jogá-lo no laço geral acenderia pendência em
toda a base. `conferir-regra.mjs` ganhou a invariante 7, que reprova a coleta se
um incidente com embargos vivos e acórdão publicado aparecer como encerrado.

**O que eu quase fiz de errado.** A primeira ideia foi mais ampla: tratar como
vigente toda suspensão cujo texto dissesse "mantida" ou "prorrogada". A medição
antes de aplicar mostrou que isso mudaria **13 registros, e 8 deles estão em
trânsito em julgado** — onde a suspensão de fato acabou, e aquelas frases são
narrativa histórica do incidente. A regra ampla teria ressuscitado suspensões
extintas. Ficou a estreita, que é a que corresponde ao fundamento legal.

**Validação.** Impacto medido registro a registro, comparando a classificação
antes e depois sobre a base inteira: **1 mudança em 3.205** — o IRDR 94, de
"sem suspensão" (risco baixo) para "suspensão estadual em vigor" (risco alto),
com a pendência nomeada na ficha. A contagem por alcance foi de ESTADUAL 100
para 101, e nenhum outro número mudou. A invariante 7 foi testada contra a regra
antiga, simulada: reprovou, apontando o IRDR 94. Ficha conferida no navegador.

**Dados.** Nenhuma alteração na base. A classificação é derivada na exibição.

**Pendências.** Vale conferir se há outros incidentes em que o TJMG registre
recurso vivo com redação que os padrões não alcancem. A varredura de hoje achou
só este, mas a redação do tribunal varia.

### 11/09/2026 — "A partir de quando suspender", em destaque

**Responsável:** Muse Spark, a pedido de Sarah (três pedidos: destacar a fase a
partir da qual suspender, atalho para provimentos do TJMG, e tirar a
hifenização).

**Motivo.** O portal dizia o alcance — quais processos a ordem atinge — e não
dizia a fase. São perguntas diferentes, e a segunda é a que decide o que fazer
com o processo na mesa: há determinação nacional que só alcança recurso
especial, e determinação estadual que só vale depois de encerrada a instrução.
Essa informação existia, perdida no meio do texto corrido da determinação.

**O que mudou.**

- `site/index.html`: `momentoDaSuspensao` classifica a fase a partir do texto da
  determinação; `MOMENTO` guarda rótulo e explicação de cada uma; `avisoDoMomento`
  põe o bloco em destaque na ficha, e a pílula da lista ganhou a fase — suprimida
  quando repetiria o alcance ("apenas em fase recursal" + "só na fase recursal"
  lado a lado era só ruído).
- `site/index.html`: atalho **Provimentos** na faixa do topo, para a Consulta de
  Atos Normativos do TJMG (`www8.tjmg.jus.br/institucional/at/pesquisa.jsf`,
  endereço conferido). Abre em nova aba. Abaixo de 820 px o rótulo some por CSS
  e o botão vira ícone, então o nome acessível vem de `aria-label`, que não
  depende de estar visível.
- `site/index.html`: hifenização automática desligada nos quatro blocos de texto
  que a usavam, a pedido de Sarah — prejudicava a leitura.
- `coleta/conferir-regra.mjs`: invariante 6, sobre o momento.
- `README.md`: seção "A partir de quando suspender" e esta entrada.

**O que não foi feito, e por quê.** Sarah pediu também atalho na ficha para o
provimento citado no texto. Medi antes de construir: de 3.205 registros,
**8** citam provimento, portaria ou resolução — e **nenhum** cita provimento do
TJMG. As citações são de normas que são o *objeto* da controvérsia (Portaria
655/93, Resolução 456/2000 da ANEEL), não de ato que rege a suspensão. Um atalho
assim dispararia em 8 fichas e apontaria para o lugar errado na maioria delas.
Fica o atalho fixo, que serve sempre.

**Validação.** Categorias derivadas do corpus, não inventadas: levantei as
expressões de fase que de fato ocorrem antes de escrever a regra. Distribuição
conferida e auditada — 6 dos 88 "só na fase recursal" lidos um a um, todos
falando apenas de recurso especial, segunda instância ou vice-presidência; e os
8 registros que mencionam "imediat" conferidos um a um, com os 6 casos de "não
aplicabilidade imediata" corretamente **fora** da categoria. Renderização vista
no navegador, em desktop e em 375 px: bloco na ficha, pílula na lista sem
repetir o alcance, atalho com nome acessível correto (`link "Consulta de Atos
Normativos do TJMG (abre em nova aba)"`). A conferência da regra, agora com a
invariante 6, passou sobre a base inteira.

**Dados.** Nenhuma mudança na base. Tudo é derivado na exibição.

**Pendências.** As 128 determinações sem fase declarada continuam remetendo ao
documento de origem — não há o que extrair de um texto que não diz. Se o TJMG
passar a publicar a fase em campo próprio, vale reler.

### 11/09/2026 — O portal passa a dizer quando a fonte erra

**Responsável:** Muse Spark, a pedido de Sarah (perguntou por que o IUJ
1.0000.25.219586-2/000 não aparece; a investigação achou outras três coisas).

**A pergunta, respondida.** O IUJ 1.0000.25.219586-2/000 não consta em nenhum
dos três lugares que o projeto lê: a planilha de acompanhamento da Turma
Recursal (49 linhas válidas), a página da Turma Recursal e o RUPE. Não é
omissão da coleta — o TJMG não o publica ali. Ou ainda não foi admitido, ou a
planilha da Turma Recursal está incompleta; nesse segundo caso, vale avisá-los,
porque a planilha é o instrumento oficial de acompanhamento.

**O que a investigação encontrou.**

1. **Duplicidade por erro de digitação.** `2007816-54.2026.8.13.000` (três
   zeros) e `2007816-54.2026.8.13.0000` são o mesmo incidente — Leis
   Complementares 162/2020 e 167/2021 de Itaúna. E as duas fichas davam
   respostas **opostas** sobre suspensão: uma sem ordem registrada, outra com
   ordem de abrangência ampla.
2. **Sete IUJ com origem "Planilha inicial"**, que nenhuma coleta confirma. O
   portal já dizia "Sem conferência automática registrada" neles; nada a fazer
   além de registrar o entendimento.
3. **Quarenta e três campos de data com não-data** — "20", "71", "110" —, todos
   vindos assim da planilha do TJMG.

**O que mudou.** Nada na coleta nem na base; os três sinais são derivados na
publicação e no portal.

- `coleta/publicar.mjs`: `nucleoDoNumero` agrupa registros cujo número coincide
  no núcleo (padrão CNJ até o ano; ou número do TJMG sem o sufixo do
  instrumento) e marca `duplicidade` em cada um, apontando o outro. Marca também
  `foraDaFonte` quando a data congelada no registro difere da última leitura da
  origem.
- `site/index.html`: `avisoDeDuplicidade` e `avisoDeForaDaFonte` na ficha;
  `campoDeData` exibe valor que não é data sob aviso, em vez de apresentá-lo sob
  o rótulo "Julgamento" como se fosse.
- `README.md`: seção "Quando a fonte erra" e esta entrada.

**Por que derivado e não gravado.** Marcar isso na base geraria entrada em
ALTERACOES e a aba "Novidades" diria que o tribunal mexeu no registro. Não
mexeu. Além disso, sinal derivado some sozinho quando a fonte se corrige.

**Validação.** Detecção medida antes de escrever: sobre os 3.205 registros, 55
têm número de processo reconhecível e **um único grupo** tem mais de um membro —
o de Itaúna. Nenhum falso positivo. Renderização conferida no navegador, na
prévia local: as duas fichas de Itaúna mostram o aviso apontando uma para a
outra; o campo "Julgamento 110" aparece com a ressalva; e o Tema 1373 do STF,
com trânsito real, continua mostrando "22/02/2025" sem aviso nenhum. O sinal
`foraDaFonte` não tem caso real hoje (nenhum registro congelado), então foi
exercitado por simulação: congelei a data de um IUJ, publiquei, vi o aviso na
ficha e reverti a base — `git status` limpo depois. A conferência da regra
passou, e a contagem por alcance ficou idêntica.

**Dados.** Nenhuma alteração na base. Nenhuma entrada nova em ALTERACOES.

**Pendências.** Confirmar no sistema do TJMG se o IUJ 1.0000.25.219586-2/000 é
incidente admitido e, sendo, avisar a Turma Recursal — tanto dele quanto do
número com um zero a menos e das não-datas na coluna de julgamento. São erros da
planilha oficial, e o portal só pode sinalizá-los.

### 11/09/2026 — MIGRACAO.md: o mapa para passar o portal a outro servidor

**Responsável:** Muse Spark, a pedido de Sarah (documento dentro da pasta,
explicando tudo que o site faz, com quais ferramentas, de onde vêm as
informações, em ordem de abas, para a migração sair com as pontas amarradas).

**O que é.** Novo `MIGRACAO.md`, na raiz: fotografia operacional do sistema e
passo a passo de reinstalação — o que o portal faz, pipeline coleta→base→site,
tabela de ferramentas, as seis fontes e as vias paralelas, o site aba por aba
(Temas e incidentes, Informativos, Favoritos, Novidades/calendário, Fontes e
atualização, Como usar), estrutura de arquivos, tabela completa de segredos e
variáveis, rotina, checklist de migração em 9 passos e o que não levar. Não é
documento concorrente de estado: a regra de convivência está escrita no topo
dele — o estado atual, as pendências e a história continuam aqui neste README,
e em divergência vale este README, depois o código.

**Como foi escrito.** Levantado do código, não da memória: abas e ordem em
`site/index.html` (faixa comum, esquema do endereço após `#`, `localStorage`,
seções do guia), papéis em `coleta/complemento.mjs`, horários em
`.github/workflows/`, segredos nos workflows. Inclui o que nasceu em trabalho
concorrente no mesmo dia: coleta local (`complemento.mjs`, `coletar-aqui.cmd`,
tarefa `BuscaBusca-ColetaSTF`), espelho publicado, auditoria Corte Aberta e o
calendário das novidades.

**Arquivos.** `MIGRACAO.md` (novo), `README.md` (inventário e esta entrada).

**Validação.** Releitura do documento contra o código (abas, parâmetros do
endereço, chaves de `localStorage`, nomes de arquivos e horários); nenhuma
mudança em coleta, base ou site.

**Dados e implantação.** Nenhuma mudança. Publica junto com o próximo envio,
como qualquer alteração.

**Pendências.** Manter o mapa acompanhando o projeto: a regra permanente vale
para ele — mudança que altere ferramenta, fonte, aba, segredo ou rotina rende
atualização aqui e lá, na mesma entrega.

### 11/09/2026 — Corte Aberta baixado de verdade: 3 CSVs, auditoria e um acerto de contagem

**Responsável:** Muse Spark, a pedido de Sarah ("faça isso e vamos testar").

**O que mudou.** Novo `coleta/corte-aberta.mjs`, no padrão da segunda via da
jurisprudência (Playwright importado na hora, WAF respeitado, sem insistir):
abre a página do Corte Aberta sem filtros, clica um por vez nos 3 links CSV
da repercussão geral (`EXPORT-LINK-RG-TEMAS-CSV`,
`EXPORT-LINK-RG-SUSPENSAO-NACIONAL-CSV`,
`EXPORT-LINK-RG-REPRESENTATIVO-CONTROVERSIA-CSV`), guarda em
`work/corte-aberta/` com hash em `hashes.json` e relata se mudou desde ontem.
`--autoteste` roda sem rede nem navegador; `--baixar [--somente X]
[--no-headless] [--dir]` faz a prova real. **Fase de auditoria paralela:
não toca em `dados/` nem no site.**

**O que o teste real trouxe.** Os três CSVs desceram nesta máquina:
`rg-temas.csv` (14,5 MB, **1.483 registros**, 34 colunas, 12 de 12
colunas-âncora do dicionário), `rg-suspensao-nacional.csv` (471 KB, 22
registros) e `rg-representativo-controversia.csv` (2,8 MB, 201 registros).
Os dicionários `.ods` oficiais foram lidos antes (Status Tema, Número tema,
Título, Descrição, Tese, paradigma, relatores, situações, datas, ramo,
assunto, **Situação Suspensão Nacional com Vigente/Cancelada + datas de
determinação e revogação**).

**Acerto no caminho.** A primeira contagem partiu por `\n` e achou 43.763
"linhas" num arquivo de 1.483 registros: os campos longos (tese, decisões)
trazem quebras dentro das aspas. `contarLinhasCsv` agora conta registros
lógicos respeitando aspas, com teste dedicado no `--autoteste`.

**Auditoria contra a base atual.** Universo idêntico: 1.482 temas lá e cá,
zero ausentes dos dois lados. Dos 60 com marca de suspensão no portal, os 22
vigentes do Corte Aberta estão todos marcados — **nenhuma suspensão vigente
passa batido**. Os outros 38 são 37 "Cancelada" + 1 tema cancelado: a marca
atual diz que *houve* determinação; o Corte Aberta diz se *continua valendo*,
com datas. É estritamente melhor — e a decisão pendente é como exibir a
suspensão cancelada (texto próprio? só histórico?).

**Arquivos.** `coleta/corte-aberta.mjs` (novo), `README.md` (inventário e
esta entrada). Os CSVs ficam em `work/` (fora do Git, confirmado no
`git status`).

**Validação.** `node --check` + `--autoteste` (15 verificações, todas
passam) + 3 downloads reais + auditoria contra `dados/temas-do-portal.json`.
Teste com amostras e consulta real, sem publicação: nada na base mudou.

**Pendências.** (1) Ligar a rotina ao dia a dia (Agendador ou
`complemento.mjs`) — hoje roda à mão; (2) decidir a exibição da suspensão
cancelada e mapear as 34 colunas para o esquema de TEMAS, com
`conferir-regra.mjs` verde, antes da troca de fonte; (3) repetir amanhã e
conferir o "mudou desde ontem".

### 11/09/2026 — As datas do STF saem de "observações" e viram data

**Responsável:** Muse Spark, a pedido de Sarah (confirmou a leitura do STF por
raspagem; o buraco apareceu ao medir o que a raspagem já trazia).

**Motivo.** Nenhum dos 1.482 temas do STF tinha data preenchida, enquanto os do
STJ tinham. Não era falta na fonte: a data estava sendo raspada e jogada em
`observações`, como texto livre. A prudência de origem se entende — a tabela do
STF prende uma data à situação sem dizer o que ela é —, mas a própria situação
diz: "Trânsito em Julgado … 22/02/2025" é trânsito; "Acórdão de mérito
publicado … 06/09/2025" é publicação. O efeito prático do buraco: ordenar por
"mais recentes" deixava os 1.482 temas do STF de fora, por não terem data que
ordenasse, e as fichas mostravam linhas de data vazias.

**O que mudou.**

- `coleta/regras.js`: `datasDaSituacaoSTF_` lê a situação e devolve a data no
  campo certo — trânsito, publicação, ou nenhum. `parseTemasSTF_` passa a
  gravá-la. A data literal continua em observações com a etiqueta da fonte: o
  campo é a nossa leitura, a observação é o que o tribunal escreveu.
- `dados/temas-do-portal.json`: correção única dos 1.397 registros que já
  existiam — 1.251 com trânsito, 146 com publicação. Feita **fora** do fluxo da
  coleta, de propósito: passar por `atualizarRegistros_` marcaria 1.397
  precedentes como alterados hoje, e a aba "Novidades" diria que os tribunais
  mexeram neles. Não mexeram; nós é que passamos a ler o que já estava na
  página. ALTERACOES é registro do que o tribunal faz.

Ficam sem data 26 temas cuja situação não diz o que a data é ("Mérito julgado",
"Cancelado", "Analisada Preliminar") e 59 que não trazem data na fonte.

**O que não mudou, e foi conferido antes de mexer.** Os campos de data são
usados em quatro lugares do portal — a ordenação por mais recentes, as linhas
da ficha e duas frases descritivas. **Nenhum deles é a regra de suspensão**, que
lê a situação. Depois da correção, a conferência da regra passou e a contagem
por alcance ficou idêntica à de antes: ESTADUAL 100, RECURSAL 44, NÃO
DETERMINADA 1.298, NACIONAL 111. Nenhuma classificação jurídica mudou.

**Validação.** Ensaio da correção antes de gravar (1.397 = 1.251 + 146,
batendo com a medição feita na base). Depois de gravar, `alteracoes.json`
continuou com 5.329 entradas — nenhuma novidade falsa. `publicar.mjs`, que roda
a conferência da regra, passou. E o teste que importava: o coletor do STF
rodado de verdade contra uma cópia da base corrigida deixou `alteracoes` em
5.329 — raspador e base concordam, sem diferença nenhuma. Nessa execução o
portal do STF oscilou duas vezes (0 linhas; depois tabela não localizada) e a
repetição em volta da fonte segurou, entregando os 1.482 na terceira tentativa.

**Dados.** 1.397 registros do STF ganharam data; nenhum campo foi apagado;
nenhuma entrada nova em ALTERACOES.

**Pendências.** Os 197 temas do STF ainda sem tese seguem na fila normal da
coleta, que completa até 200 por execução. Registrada também uma observação de
conduta: várias coletas completas num mesmo dia, somadas às buscas de
jurisprudência, deixaram o portal do STF oscilando — vale espaçar as execuções
à mão.

### 11/09/2026 — Corte Aberta verificado: dá para baixar sozinho todo dia, pelo navegador

**Responsável:** Muse Spark, a pedido de Sarah (verificar a corte aberta do
STF e dizer se dá para conferir todo dia se mudou, baixar sozinho, ler e
lançar no portal quando houver atualização).

**O que foi verificado.** A página
`transparencia.stf.jus.br/extensions/dados_abertos/dados_abertos.html`, aba
"Dados abertos" do programa Corte Aberta. O aviso "Saiba mais" diz que **as
bases são atualizadas diariamente**, exceto Informação à Sociedade (sob
demanda) e Omissão Inconstitucional (mensal) — e que os filtros do painel
refletem no download, de modo que o completo exige remover os filtros. Para
este portal interessam três bases da seção Repercussão Geral: **Temas** (todos,
desde a Emenda Regimental 21/2007), **Suspensão nacional** e
**Representativo da controvérsia** — o mesmo dado que hoje vem de
`todostemas.asp` + `listarProcesso.asp`. Cada base tem dicionário de dados
`.ods` em endereço direto no `www.stf.jus.br`.

**Como o download funciona, por dentro.** Nenhum xlsx/csv tem endereço
próprio: os 80+ links da tabela são `javascript:void(0)` que disparam a
exportação do motor Qlik (`app.getObject(id).exportData({format: OOXML ou
CSV_C, download: true})`), com um aplicativo Qlik por grupo de bases — o da
repercussão geral em produção é `d00163a8-3179-4450-8084-c0e1ca3daf49`, objetos
`hEKeEY` (temas), `jVYfQXL` (suspensão nacional) e `XJAVRS` (representativo),
mapeados em `qliksense.js`/`exportManager.js`. Ou seja: **não há URL de
arquivo para o curl baixar; é preciso um navegador de verdade** que abra a
página, aguarde a conexão ao Qlik e acione os botões oficiais de exportação —
o mesmo padrão da segunda via da jurisprudência (`jurisprudencia-stf.mjs` com
Playwright). Chamar a API interna do motor sem passar pela página seria leitura
não contratada, como já registrado para a API da jurisprudência; o caminho
correto é dirigir os links que o tribunal oferece.

**Rede.** Com UA completo de navegador o `transparencia.stf.jus.br` responde
200 (e entrega cookie de sessão Qlik); com UA curto, 403 — o mesmo gesto de
WAF que bloqueia o GitHub Actions no portal antigo. Conclusão: a rotina diária
mora **na máquina da Sarah, junto à tarefa `BuscaBusca-ColetaSTF` das 9h**,
não no Actions.

**Desenho proposto (não implementado).** Novo `coleta/corte-aberta.mjs`:
abre a página sem filtro, baixa os 3 CSVs da repercussão geral, compara o hash
com o dia anterior em `work/` e, só havendo mudança, converte para o esquema
de TEMAS (o CSV de suspensão nacional vira a marca de suspensão, auditando a
que hoje vem da lista `listarProcesso.asp`), roda `conferir-regra.mjs` e
publica pelo caminho existente. Sem mudança, nada é commitado. Primeira fase
em paralelo como auditoria, sem desligar `todostemas.asp`; a troca de fonte
só depois de N dias batendo.

**Arquivos.** `README.md` (este parágrafo de refinamento e esta entrada).
Nenhum código alterado; JS do tribunal lido, não copiado para o repositório.

**Validação.** Leitura real da página e dos quatro JS do mashup
(`qliksense.js`, `qlikManager.js`, `uiManager.js`, `exportManager.js`),
com os IDs de app e objetos conferidos no código-fonte. Sem download de CSV
ainda — a prova de vida com navegador fica para a implementação.

**Dados.** Nenhuma mudança na base nem no site.

**Pendências.** Decisão de Sarah: (1) implementar o `corte-aberta.mjs` nesta
máquina; (2) se entra como auditoria paralela primeiro (recomendado) ou como
fonte direta; (3) ler os três dicionários `.ods` da repercussão geral antes
de codificar, para mapear as colunas.

### 11/09/2026 — Espelho publicado; e o STF não tem API para o que precisamos

**Responsável:** Muse Spark, a pedido de Sarah (publicar o Worker, mantendo
link e rede oficiais no GitHub; e verificar se o STF oferece API).

**O STF.** Procurado de verdade, não presumido. `dadosabertos.stf.jus.br` e
`api.stf.jus.br` não resolvem; `portal.stf.jus.br/dadosabertos/` devolve a casca
do portal (54 KB, a mesma página genérica que o tribunal serve com 200 quando
não tem o que entregar). O programa de dados abertos é o **Corte Aberta**,
entregue como painéis **Qlik Sense** em `transparencia.stf.jus.br` — inclusive
o de repercussão geral, onde mora a marca de suspensão nacional. Painel Qlik se
lê pela tela, com CSV exportado a mão: serve para conferência manual, não como
fonte automática. Some-se a isso a API interna do aplicativo de jurisprudência
(`POST /api/search/search`), que não é contratada com ninguém, e o **DataJud**
do CNJ, que é API pública de verdade mas de dados processuais. Conclusão: a
leitura da página publicada continua sendo, para o STF, o caminho certo — não
por gosto, por falta de alternativa oferecida pelo tribunal.

**O espelho.** Publicado no plano gratuito da Cloudflare como
`espelho-busca-busca.sarahcarolina37.workers.dev`, com a chave gravada como
segredo do Worker. Faltam os dois segredos do repositório para ele entrar em
uso — enquanto não existirem, a coleta roda como antes.

**O que a Cloudflare não é**, registrado a pedido de Sarah: o endereço oficial
continua sendo o GitHub Pages, a coleta oficial continua sendo a do GitHub
Actions, e a base continua no repositório. O Worker não hospeda nada do portal,
não aparece a quem consulta, e desligá-lo devolve a coleta ao estado anterior.

**Arquivos.** `README.md` (seção "Arquivo, API ou leitura de página", seção do
espelho e esta entrada). Nenhum código alterado: o `worker.js` publicado é o
mesmo já versionado.

**Validação.** Contra o Worker publicado, seis casos: `temas.csv` com chave →
200 com 2.578.086 bytes, exatamente o tamanho do download direto; informativos
do STJ com chave → 200 com 421.167 bytes; sem chave → recusado; chave errada →
recusado; chave certa com endereço do STF → recusado, nomeando o host; e o
endereço montado exatamente como o `ambiente.mjs` o monta (base sem barra,
`?url=` colado) → 200 com o mesmo tamanho e `content-type: text/csv`. A metade
de cá já fora exercitada antes contra um espelho falso, com o mesmo contrato.

**Dados.** Nenhuma mudança na base nem no site.

**Pendências.** Cadastrar `ESPELHO_URL` e `ESPELHO_CHAVE` nos segredos do
repositório — os valores estão em `work/espelho-segredos.txt`, fora do Git, para
apagar depois de usados. A confirmação real vem na primeira coleta agendada do
GitHub que levar 403 do STJ: o registro da execução dirá "403 no direto,
refeito pelo espelho".

### 11/09/2026 — O dia das novidades vira calendário

**Responsável:** Claude Code, a pedido de Sarah ("troque a lista suspensa por um
calendário que me permita selecionar o dia").

**Motivo.** O filtro de dia da aba "Novidades" era um `<select>` com uma opção
por dia coletado. Para chegar a 8 de setembro era preciso abrir a lista e ler
data por data, e nada ali dizia se naquele dia havia alguma coisa: a lista só
tinha os dias com registro, mas sem a forma de um mês não se enxergava o
intervalo, nem os buracos. Com a base crescendo uma coleta a cada doze horas, a
lista só piora.

**O que mudou.** Em `site/index.html`, apenas na interface:

- O `<select class="filtro-dia">` deu lugar a um botão `#abrir-calendario`, que
  mostra o dia em vigor ("todos os dias", ou a data em monoespaçada), e
  a um painel `#calendario` com a grade do mês.
- `diasComAlteracao()` monta, uma vez por desenho, um mapa `dia → { total,
  nivel }`. O nível é o mais grave do dia, pela mesma escala das chamadas
  (ALTO > MEDIO > BAIXO > NEUTRO), e vira um ponto sob o número: vermelho para
  suspensão nova, âmbar para mudança de situação, verde para o que se encerrou,
  cinza para ajuste de cadastro.
- Dias sem registro continuam clicáveis, e não desligados. A tela de vazio já
  existia e passou a nomear o dia — "Sem alterações em 04/09/2026." —, o que
  responde à pergunta que a lista suspensa não deixava nem fazer.
- `‹` e `›` folheiam o mês e só vão até os meses que têm registro; folhear
  redesenha a grade sozinha, sem redesenhar a lista atrás. Esc fecha e devolve o
  foco ao botão; clique fora fecha; setas andam pela grade (a semana são sete
  células), Home e End vão ao primeiro e ao último dia do mês.
- O mês aberto é estado de tela e fica fora do endereço. O parâmetro `dia=`
  continua o mesmo, então links já compartilhados abrem no dia certo.
- No guia ("Como usar"), a seção "As chamadas das novidades" ganhou um parágrafo
  sobre o calendário e o que o ponto significa.
- Abaixo de 700 px o painel desce pela esquerda — encostado na margem direita
  ele sairia da tela —, as células vão a 38 px e as setas de mês a 36 px.

**Validação.** Prévia local em `npx serve site`, com a base real de 11/09/2026
(5.329 alterações, 1.200 exibidas). Conferido: abrir e fechar pelo botão, por
Esc e por clique fora; escolher 10/09 (1.199 registros) e 04/09 (sem registro,
com a mensagem nomeando o dia); "Todos os dias" limpando o filtro; o endereço
`#/?aba=novidades&dia=2026-09-10` abrindo já filtrado e com o dia marcado na
grade; teclado abrindo em hoje e andando com ←, ↑. Como a base real só tem
setembro, o folhear de meses foi conferido numa cópia temporária da página com
duas alterações sintéticas em julho e agosto — julho mostrou o ponto vermelho,
agosto o verde, e `‹` desligou ao chegar no mês mais antigo. A cópia foi
apagada. Tema claro e escuro, e largura de 375 px, conferidos em tela.

**Dados.** Nada. A coleta, a base e `site/dados.json` não foram tocados; a
mudança é de interface e não altera nenhum arquivo de `dados/`.

**Implantação.** Publica com o site, na próxima alteração do repositório.

**Pendências.** O calendário não tem atalho para "últimos 7 dias" nem para um
intervalo — o filtro segue sendo de um dia só, como era. Se a base passar a
cobrir muitos meses, vale um seletor de mês/ano no lugar do folhear de um em um.

### 11/09/2026 — O endereço do CSV do STJ passa a ser perguntado, não presumido

**Responsável:** Muse Spark, a pedido de Sarah (perguntaram a ela se o projeto
lê as fontes por leitura de página ou por API).

**Motivo.** A pergunta expôs um risco silencioso. O endereço do CSV de dados
abertos do STJ estava fixo no código, e ele carrega o identificador do arquivo
publicado: republicado o conjunto com outro identificador, a coleta passaria a
receber 404 e a maior fonte do portal cairia sem que nada no código estivesse
errado. O catálogo do STJ é um CKAN, e CKAN tem API — dava para perguntar.

**O que mudou.** Em `coleta/regras.js`:

- `catalogoStj_()` consulta `package_show` e devolve os endereços de hoje de
  `Temas.csv` e `Processos.csv`, mais a data em que o STJ os publicou. Falhando
  a API, ou vindo diferente do esperado, valem os endereços fixos em `PILOTO` e
  o detalhe da fonte diz isso — o conjunto continua sendo lido.
- `anotarNaFonte_()`: uma fonte pode acrescentar uma frase ao detalhe que o
  painel mostra. O STJ usa para dizer a data de publicação. Zerada a cada
  tentativa, vazia nas demais fontes.
- `README.md`: seção "Arquivo, API ou leitura de página", que responde à
  pergunta com números.

**O que não mudou, de propósito.** A data não serve para pular o download. Ler
de novo é o que garante que a base bate com a fonte, e 2,5 MB duas vezes por dia
não pesam. A ideia de economizar o download foi levantada por mim e descartada
por isso.

**Validação.** Duas execuções reais do coletor do STJ, contra uma cópia isolada
da base. Com a API: 1.495 registros e detalhe "O STJ publicou estes arquivos em
09/09/2026". Com o endereço da API trocado por um método inexistente: os mesmos
1.495 registros pelos endereços fixos, e o detalhe dizendo que o catálogo não
respondeu. Conferido também que o endereço devolvido pela API hoje é idêntico
ao que estava fixo — a mudança é invisível agora e protetora depois.

**Dados.** Sem mudança de conteúdo. O que muda é o detalhe da fonte STJ no
painel, que passa a trazer a data de publicação ao lado da data de consulta.

**Pendências.** As outras cinco fontes continuam com endereço fixo; só o STJ
oferece catálogo com API. O espelho do STJ segue esperando a publicação do
Worker.

### 11/09/2026 — Coleta na máquina da Sarah, em dois cliques

**Responsável:** Muse Spark, a pedido de Sarah (quer os informativos recentes e
os precedentes suspensos do STF, e não uma busca por tema).

**Motivo.** O pedido esclareceu o alvo. A busca por tema, montada mais cedo,
pesquisa acórdão por palavra-chave, um assunto por vez: não varre o que é novo.
O que responde ao pedido são as duas fontes oficiais do STF, que a coleta já
sabe ler — 1.482 temas de repercussão geral, 60 deles com registro de
suspensão, e 1.012 informativos. O problema nunca foi como coletar o STF, e sim
de onde: do GitHub Actions ele nega; desta máquina ele responde. Faltava tornar
isso fácil de rodar, porque quatro comandos na ordem certa não são coisa que se
peça a quem quer só o dado em dia.

**O que mudou.** Nada na coleta: as regras, as fontes e a base seguem as
mesmas.

- `coleta/complemento.mjs` (novo): atualiza a pasta com o que houver de novo no
  GitHub, chama `executar.mjs`, mostra o que mudou e envia. Sem mudança, não
  commita. Empurrão recusado por commit concorrente é reencaixado uma vez; não
  dando certo, para e avisa, com a coleta gravada aqui. Recusa-se a agir quando
  há trabalho dos dois lados que não se encaixa sozinho — isso é conferência à
  mão. `--sem-enviar` mostra o que mudaria e para.
- `coletar-aqui.cmd` (novo): os dois cliques no Windows.
- `coleta/agendado.cmd` (novo): o que o Agendador executa. Sem `pause`, e com
  registro em `work/coleta-agendada.log`, fora do Git.
- Tarefa `BuscaBusca-ColetaSTF` no Agendador desta máquina, todo dia às 9h,
  marcada para executar assim que possível depois de um horário perdido. Roda
  como a Sarah conectada, nível limitado: rodar com o computador bloqueado
  exigiria guardar a senha dela, o que este projeto não faz.
- `README.md`: inventário, seção "Coleta na máquina da Sarah" e esta entrada.

O commit do complemento começa com "Coleta de DD/MM/AAAA", igual ao da coleta
agendada, de propósito: é assim que o vigia reconhece que a base foi atualizada
no dia — e foi mesmo. A origem fica no fim da mensagem.

**Validação.** Execução real das seis fontes desta máquina, com `--sem-enviar`:
todas responderam, o STF inclusive (1.482 temas em 25s, 1.012 informativos em
3s), `fontesComFalha` vazio, 45 segundos no total. Só carimbos de data mudaram,
porque o conteúdo já viera na coleta local das 10h20 UTC — e o passo "nada
mudou" não chegou a ser exercitado, porque sempre há carimbo de data a gravar.
O envio foi exercitado em seguida, em execução
separada: commit `8fea4b9`, enviado. E o ciclo inteiro pelo Agendador, com a
tarefa disparada à mão para testar: coletou, commitou `751fc8a` e enviou
sozinha, com tudo registrado em `work/coleta-agendada.log`.

**Dados.** Sem mudança de conteúdo nesta entrega; o que muda é a frequência com
que o STF fica em dia. Consequência a registrar: como `fontes.json` grava a
hora de cada tentativa, toda coleta produz diferença, e a tarefa diária vai
render um commit por dia mesmo quando nenhum tribunal publicar nada — o mesmo
que a coleta agendada do GitHub já faz duas vezes ao dia.

**Pendências.** O espelho do STJ continua esperando a publicação do Worker.
A tarefa do Agendador vive só nesta máquina: não está no repositório, e uma
instalação em outro computador precisa cadastrá-la de novo (o comando está na
seção "Todo dia, sozinho").

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
