# Busca Busca

Precedentes / incidentes / informativos

Buscador de precedentes qualificados para os Juizados Especiais Cíveis, Criminais
e da Fazenda Pública do TJMG: IRDR, IUJ, IAC, grupos de representativos, temas
repetitivos do STJ, repercussão geral do STF e os informativos dos dois
tribunais superiores.

O objetivo prático é responder rápido a uma pergunta: **este tema tem ordem de
suspensão que alcança o processo que estou para sentenciar?**

## Como funciona

Três peças, todas gratuitas:

| Peça | Onde roda | Quando |
| --- | --- | --- |
| Coleta nas fontes oficiais | GitHub Actions | 6h e 18h, horário de Brasília |
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
  dados.json     gerado pela coleta

coleta/
  executar.mjs      orquestra a coleta e grava site/dados.json
  regras.js         uma regra de leitura por fonte oficial
  ambiente.mjs      rede, leitura de xlsx e armazenamento
  conferir-regra.mjs confere a regra de suspensão contra a base inteira

dados/           a base entre uma coleta e outra, versionada
work/            apoio local, fora do repositório (ver .gitignore)
```

## Rodar a coleta à mão

```bash
node coleta/executar.mjs
```

Consulta as seis fontes, atualiza `dados/` e regrava `site/dados.json`. Depois:

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

### 10/09/2026 — Metade das fontes não respondia no GitHub Actions

**Responsável:** Claude Code, a pedido de Sarah (revisão geral do sistema).

**Motivo.** A única execução da coleta no GitHub Actions terminou em verde, mas
**três das seis fontes falharam** — e o site publicado vem dizendo, desde então,
que 3 fontes não responderam. A coleta funcionava na máquina da Sarah, então o
defeito só existia em produção, que é justamente onde ninguém olha.

**Causa 1 — certificado do STF (resolvido).** `portal.stf.jus.br` e
`www.stf.jus.br` enviam só o certificado próprio e omitem o intermediário. O
Windows busca sozinho o elo que falta; o curl no Linux não. Daí
`unable to get local issuer certificate` nas duas fontes do STF. O
`coleta/ambiente.mjs` passou a ler o endereço do intermediário no próprio
certificado, baixá-lo e repetir a requisição. Conferido localmente com o
repositório de certificados esvaziado (`CURL_CA_BUNDLE` apontando para arquivo
vazio), que reproduz a condição do runner: as duas fontes voltaram a responder
200 — 4.920.647 e 9.339.018 bytes. **A confirmação em produção depende da
próxima execução no Actions.**

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
