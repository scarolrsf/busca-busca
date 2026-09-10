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

A coleta precisa de permissão de escrita no repositório, já declarada no
workflow (`permissions: contents: write`).
