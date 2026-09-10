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
| Site | Cloudflare Pages | publica a cada alteração |

A coleta roda no GitHub Actions, e não num serviço menor, por um motivo
concreto: a lista de temas do STF tem 7,7 MB e a planilha de informativos tem
9 MB que viram 62 MB ao descompactar. Isso não cabe no Google Apps Script
(6 minutos por execução) nem num Cloudflare Worker (128 MB de memória).

O site é estático — um HTML e um JSON. A Cloudflare serve de cache, então o
número de pessoas acessando ao mesmo tempo não é problema.

```
site/            o que a Cloudflare publica
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

O site é publicado pela Cloudflare Pages a cada alteração no repositório:

- **Build command** — nenhum
- **Build output directory** — `site`

O `site/dados.json` é versionado pela própria coleta, então não há passo de
build: qualquer hospedagem estática publica a pasta `site` como está.

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
