# Busca Busca — mapa para migração de servidor

Documento de transferência operacional: o que o portal faz, com quais
ferramentas, de onde vêm os dados e o que é preciso para colocá-lo no ar em
outro servidor. Ordenado pela navegação do site (seção 5, aba por aba), para
que cada tela possa ser conferida contra este texto depois da mudança.

**Regra de convivência com o README.** O `README.md`, na raiz, continua sendo
o documento único do estado atual do projeto: requisitos, arquitetura, dados,
operação, pendências e histórico datado. Este arquivo não o duplica nem o
substitui — descreve o sistema parado numa fotografia e o caminho para
reinstalá-lo. Em caso de divergência, vale o README e, depois dele, o código.

## 1. O que é, em um parágrafo

Buscador de precedentes qualificados para Juizados Especiais (cíveis,
criminais e Fazenda Pública) e varas cíveis do TJMG: IRDR, IUJ, IAC, grupos de
representativos, repetitivos do STJ, repercussão geral do STF e informativos
dos dois tribunais superiores. A pergunta que ele responde é uma só — **este
tema tem ordem de suspensão que alcança o processo que estou para
sentenciar?** — e cada resultado mostra em que situação está o precedente e
até onde alcança a suspensão, com a fonte oficial linkada. Endereço atual:
**https://scarolrsf.github.io/busca-busca/**.

## 2. Como as peças se ligam

```
Fontes oficiais (6)
   │  GitHub Actions, 6h07 e 18h07 (horário de Brasília)
   ▼
coleta/executar.mjs ──regras em──▶ coleta/regras.js ──rede/armazenamento──▶ coleta/ambiente.mjs
   │                                                              (curl, certificado STF, espelho STJ)
   ▼
dados/*.json  (a base versionada — a única coisa que o repositório guarda)
   │  coleta/publicar.mjs (+ conferência da regra de suspensão)
   ▼
site/dados.json  (derivado, minificado, NÃO versionado — nasce na publicação)
   │  GitHub Pages, a cada alteração no repositório
   ▼
site/index.html  (o portal inteiro: CSS e JS embutidos, sem dependências)
```

O vigia (`coleta/monitorar.mjs`, às 9h e 21h) confere se a janela rodou e se
alguma fonte falha há ~12h; com problema, abre issue (e o e-mail do GitHub
segue a falha). Em paralelo corre a coleta local da máquina da Sarah
(`coletar-aqui.cmd` → `coleta/complemento.mjs`, mais a tarefa diária das 9h):
mesmas regras, mesmo `executar.mjs`, commits no mesmo formato — é por ela que
o STF fica em dia, já que do Actions ele nega. Detalhes de horários,
tentativas e segredos estão nas seções 8 e 9 e no README.

## 3. Ferramentas

| Ferramenta | Versão / plano | Onde roda | Para quê |
| --- | --- | --- | --- |
| Node.js | 22 (Actions) / qualquer LTS recente (local) | coleta e publicação | toda a coleta, sem dependências npm |
| curl | o do runner Ubuntu | dentro da coleta, via `ambiente.mjs` | as 6 fontes (GET, POST, cookie, compressão) |
| GitHub Actions | plano gratuito | `coletar.yml`, `monitorar.yml` | coleta 2×/dia, vigia 2×/dia |
| GitHub Pages | plano gratuito (repositório público) | `publicar.yml` | publica a pasta `site` a cada alteração |
| Playwright + Chromium | só onde a prova for rodada | manual, `jurisprudencia-stf.mjs` e `corte-aberta.mjs` | segunda via do STF pelo navegador e auditoria Corte Aberta (ambas desligadas da coleta agendada) |
| Agendador do Windows | tarefa `BuscaBusca-ColetaSTF`, todo dia às 9h | máquina da Sarah | coleta local diária (ver seção 8) |
| Cloudflare Worker | plano gratuito, publicado | `espelho/` | segunda via do STJ no 403 (só entra com os segredos do repositório) |
| `serve` (npm) | qualquer | prévia local (`npx --yes serve site`, porta 4173, ver `.claude/launch.json`) | conferir o portal antes de publicar |
| Git | qualquer | tudo | versiona a base `dados/`; o histórico útil de mudanças está em `dados/alteracoes.json` |

Não há banco de dados, build, backend nem dependência npm versionada. O
`node_modules/` (só existe se alguém instalar o Playwright à mão) já está no
`.gitignore`.

## 4. De onde vêm os dados

Seis fontes oficiais, lidas duas vezes ao dia. Quando uma fonte não responde,
**nada é apagado**: valem os registros da última consulta bem-sucedida, a
falha é anotada e a aba "Fontes e atualização" mostra ponto vermelho.

| # | Fonte no portal | Endereço e método |
| --- | --- | --- |
| 1 | STJ — temas e processos | CSV de dados abertos (`dadosabertos.web.stj.jus.br`), 2 arquivos |
| 2 | STJ — informativos | HTML da edição corrente (`processo.stj.jus.br/.../informativo/`, ISO-8859-1) |
| 3 | TJMG — IRDR, IAC e GR | consulta paginada no RUPE, com cookie de sessão e POST |
| 4 | TJMG — IUJ | planilha de acompanhamento da Turma Recursal (xlsx via Google Drive) |
| 5 | STF — repercussão geral | tabela "Todos os temas" + páginas de tese (1 por tema, em lotes de 200/execução) + lista com a marca de suspensão nacional |
| 6 | STF — informativos | planilha oficial `Dados_InformativosSTF.xlsx` (~9 MB), edições ≥ 1080 |

Segundas vias (desligadas por padrão, só entram em cena quando configuradas):

- **Espelho STJ** (`espelho/worker.js`, Cloudflare, publicado em
  `espelho-busca-busca.sarahcarolina37.workers.dev`): só GET, só os dois hosts
  do STJ, só depois de um 403, só com a chave. O STF não entra (devolveria
  526 pelo defeito de certificado). Os valores dos segredos estão em
  `work/espelho-segredos.txt`, fora do Git, para apagar depois de cadastrados
  nos segredos do repositório.
- **Jurisprudência STF pelo navegador** (`coleta/jurisprudencia-stf.mjs`):
  Chromium real via Playwright, prova de vida limitada (1 busca, 3 fichas),
  resultado bruto em `dados/jurisprudencia-stf.json`, fora da base do portal.
- **A coleta feita daqui** (`coleta/complemento.mjs`, dois cliques em
  `coletar-aqui.cmd`): nem truque de rede — é a mesma coleta de sempre rodada
  de um lugar que o tribunal aceita. Atualiza a pasta com o GitHub, chama
  `executar.mjs`, mostra o que mudou e envia (com `--sem-enviar`, só mostra).
  O commit começa com "Coleta de DD/MM/AAAA" como o agendado, com a origem no
  fim ("máquina da Sarah"), para o vigia reconhecer a janela.

Auditoria paralela (fora da base, sem efeito no portal):

- **Corte Aberta** (`coleta/corte-aberta.mjs`): baixa pelo navegador os 3 CSVs
  da repercussão geral do programa de dados abertos do STF, guarda em
  `work/corte-aberta/` com hash e relata mudança desde ontem. Fase de
  auditoria: compara com a base sem tocar nela — inclusive a suspensão
  "Vigente/Cancelada" com datas, que a marca atual da lista não distingue. A
  troca de fonte (se houver) só depois de mapeadas as 34 colunas e com
  `conferir-regra.mjs` verde. Decisões pendentes no README.

## 5. O site, aba por aba

O portal é um único `site/index.html` (CSS e JS embutidos, sem chamadas
externas: as fontes tipográficas vêm de `site/fontes/`, e o único dado lido é
o `./dados.json` gerado na publicação). Funciona em qualquer hospedagem
estática. A faixa do topo é comum a tudo: marca, **busca** (atalho `/`,
limpa com ✕), preferências (tamanho do texto A−/A/A+, tema claro/escuro/"do
sistema") e as seis abas. Abaixo de 700 px a faixa quebra em duas linhas e o
texto deixa de ser justificado (desenho de telefone, documentado no README).

O endereço carrega o estado depois de `#` (ex.: `#/r/STF-TEMA-1189?q=plano+de+saude&aba=temas&escopo=comum&ordem=relevancia&dia=2026-09-10&bloco=NACIONAL&favs=...&num=1189&texto=...`; ficha direta em `#/r/<id>`). Ou seja: qualquer tela é linkável e todo link copiado reabre igual para quem recebe.

### 5.1. Temas e incidentes (aba inicial)

A consulta principal, sobre a base de ~3.200 temas. Trilho de filtros à
esquerda: **competência** (Todos / Justiça comum / Juizado Especial — abre em
"Juizado Especial" na primeira visita e depois lembra a escolha neste
navegador), alcance da suspensão, tribunal, espécie, situação, área e o
**filtro detalhado** (número do precedente + palavras na questão ou na tese),
além de ordenar por (relevância, mais novos etc.) e dos blocos de destaque do
topo. Cada cartão mostra a faixa colorida de risco à esquerda (o resumo visual
de "pode sentenciar ou não"), origem, situação e suspensão; abrir revela a
**ficha** com Tese/destaque, Situação e datas, Processos paradigma,
Observações, Atualização e Fontes consultadas, com botões de **copiar** cada
trecho (ementa, despacho, tese) e prévia antes de copiar. Dá para **baixar o
resultado em planilha (CSV)** e **marcar favoritos** (estrela).

### 5.2. Informativos

Os ~1.200 julgados divulgados em informativo (STJ e STF), com os mesmos
filtros e ficha da aba anterior, mais número/edição do informativo e link do
PDF oficial (STF) ou da nota (STJ).

### 5.3. Meus favoritos

**Só existe neste navegador** (guardados em `localStorage`, chave
`bb-favoritos`): nada vai ao servidor, porque não há servidor. A estrela de
qualquer ficha adiciona; aqui dá para revisar, copiar em lote e **gerar link
com os favoritos dentro** (`favs=` no endereço) para mandar a alguém — quem
recebe confere antes de guardar, e pode guardar só alguns.

### 5.4. Novidades

Calendário montado sobre `alteracoes.json`: cada dia com alteração detectada
pela coleta pode ser selecionado, mostrando o que mudou em cada registro
(campo, valor anterior, valor novo) e o significado de cada chamada. É o "o
que mudou desde ontem" do consulente. Atenção ao migrar: `alteracoes.json` é
o registro do que **o tribunal** fez — correções feitas à mão na base (como a
das datas do STF, que saíram de "observações" e viraram campo) são aplicadas
fora do fluxo justamente para não gerar novidade falsa.

### 5.5. Fontes e atualização

O painel de honestidade do portal: as seis fontes, quando cada uma foi lida
pela última vez, quantos registros trouxe e, se falhou, o detalhe. **As que
falharam vêm primeiro e acendem o ponto de alerta na aba.** É esta tela que
diz "dado velho" em vez de fingir que é novo — e é sobre ela que o vigia
automático abre issue quando a falha persiste ~12h.

### 5.6. Como usar (guia)

O guia de leitura, reabrível a qualquer momento (a primeira visita mostra um
resumo em diálogo). Seções, nesta ordem: Legenda; Os blocos do topo; As
chamadas das novidades; Alcance da suspensão; **Até quando vale a suspensão**
(a regra jurídica que o código aplica a cada registro); Situação do
precedente; Competência (inclui "Qual vem marcada"); Textos para copiar;
Atalhos; Antes de aplicar. A regra de suspensão vive nas funções de
classificação deste HTML e é conferida sobre a base inteira a cada coleta
(`conferir-regra.mjs`) — publicação com regra quebrada falha em vez de ir ao ar.

## 6. Estrutura de arquivos (o que é cada coisa)

```
site/            o que se publica (qualquer hospedagem estática serve site/)
  index.html     o portal inteiro; o ÚNICO arquivo que precisa existir
  icone.svg      favicon + logotipo
  fontes/        tipografias woff2 auto-hospedadas (SIL OFL) — sem Google Fonts (LGPD)
  dados.json     GERADO, não versionado — nasce de coleta/publicar.mjs
coleta/          a coleta (Node, sem dependências)
  executar.mjs, regras.js, ambiente.mjs, publicar.mjs, servir.mjs,
  conferir-regra.mjs, conferir-fontes.mjs, conferir-cadeia.mjs,
  monitorar.mjs, jurisprudencia-stf.mjs, corte-aberta.mjs (papéis no inventário do README)
  complemento.mjs  a coleta feita daqui: atualiza, coleta e envia
  agendado.cmd     o que o Agendador do Windows executa todo dia, sem pause
coletar-aqui.cmd dois cliques para rodar o complemento no Windows
dados/           a base versionada (temas, informativos, alterações, fontes, conferência)
espelho/         segunda via STJ na Cloudflare (worker.js + wrangler.toml)
.github/workflows/  coletar.yml (2×/dia), monitorar.yml (2×/dia), publicar.yml (a cada alteração)
work/            APOIO LOCAL, fora do repositório (ver .gitignore) — nunca migrar
.claude/launch.json  atalho de prévia local (serve site, porta 4173)
LICENSE          todos os direitos reservados a Sarah Carolina (exceção: fontes em site/fontes/, SIL OFL)
README.md        o documento do estado atual — ler antes de qualquer migração
AGENTS.md / CLAUDE.md  instruções de manutenção para colaboradores
```

## 7. Segredos e variáveis (tabela completa)

| Nome | Tipo | Onde se configura | Efeito se ausente |
| --- | --- | --- | --- |
| `ESPELHO_URL`, `ESPELHO_CHAVE` | segredos do repositório | GitHub → Settings → Secrets → Actions | coleta roda como se o espelho não existisse |
| `JURISPRUDENCIA_STF` | variável do repositório (valor `1` liga) | GitHub → Settings → Variables → Actions | segunda via do navegador nunca roda |
| `GITHUB_TOKEN` | automático do Actions | `monitorar.yml` (`issues: write`) | monitor só informa, não abre/fecha issues |
| Playwright + Chromium | instalação local | `npm i playwright --no-save` + `npx playwright install chromium` onde a prova for rodada | `jurisprudencia-stf.mjs` informa como instalar e sai |

Nada aqui usa login, cookie fixo ou token de tribunal: as seis fontes são
públicas. Não versionar nem documentar credenciais, cookies ou tokens.

## 8. Rotina (o que roda sozinho)

| Horário (Brasília) | O quê | Sucesso normal |
| --- | --- | --- |
| 6h07 e 18h07 | coleta (`coletar.yml`) | commit "Coleta de DD/MM/AAAA às HHhMM" + publicação |
| 9h | coleta local (`BuscaBusca-ColetaSTF`, Agendador desta máquina) | commit "Coleta de DD/MM/AAAA às HHhMM (máquina da Sarah)" + publicação; log em `work/coleta-agendada.log` |
| 9h e 21h | vigia (`monitorar.yml`) | silencioso; issue + e-mail só com problema |
| a cada alteração | publicação (`publicar.yml`) | portal atualizado minutos depois |

Atraso de minutos no agendador é normal (melhor esforço do GitHub). Janela
pulada sem commit é o caso que o vigia denuncia. A tarefa do Agendador vive
só na máquina onde foi criada: **não está no repositório** — migrar de
computador exige cadastrá-la de novo (o comando está na seção "Todo dia,
sozinho" do README), rodando como o usuário conectado, sem guardar senha.

## 9. Migração para outro servidor — passo a passo

Ordem sugerida; cada passo termina com uma conferência.

1. **Levar o código com história.** Clonar o repositório (a base `dados/`
   viaja junto; são megabytes, não gigabytes, porque o derivado não é
   versionado). Conferir: `git log --oneline -5` mostra as últimas coletas.
2. **Escolher a hospedagem estática.** Qualquer uma publica a pasta `site`
   como está, sem build: GitHub Pages (atual), Cloudflare Pages (build vazio,
   output `site`), Netlify, VPS com nginx. Conferir: abrir o endereço e ver o
   selo da coleta no rodapé com data recente.
3. **Gerar o `site/dados.json`.** Ele não viaja no Git: roda-se
   `node coleta/publicar.mjs` uma vez (exige só Node). Conferir: o portal abre
   sem "Carregando a base…" preso e as abas têm contagem.
4. **Recriar o agendamento.** Duas coletas/dia (6h07/18h07) + vigia (9h/21h)
   + publicação a cada alteração. Fora do GitHub Actions, o equivalente é cron
   + `git commit/push` (papel do `coletar.yml`) e cron + script de issue/e-mail
   (papel do `monitorar.yml`); a permissão de escrita (`contents: write`)
   vira uma chave de deploy com escrita. Conferir: forçar uma execução manual
   e ver o commit e a publicação acontecerem.
5. **Recriar segredos e variáveis** (seção 7) no novo ambiente. Conferir: sem
   eles a coleta deve rodar igual — só sem as segundas vias.
6. **Domínio próprio (se houver).** Apontar o DNS para a hospedagem e emitir
   TLS (quase todas emitem sozinho, inclusive Pages/Cloudflare). Conferir:
   `https://` válido, redirecionamento do www (se configurado) e o portal sem
   chamadas externas (DevTools → Network: só o próprio domínio).
7. **Segundas vias e coleta local (se houver).** Publicar o Worker
   (`espelho/wrangler.toml` tem o passo a passo) e/ou instalar o Playwright
   onde a prova for rodada; cadastrar URL/chave e `JURISPRUDENCIA_STF=1`. Numa
   máquina Windows nova, recriar a tarefa `BuscaBusca-ColetaSTF` (seção "Todo
   dia, sozinho" do README; dois cliques em `coletar-aqui.cmd` para o teste
   manual). Conferir: provocar uma execução e ler `dados/fontes.json`
   (espelho), `dados/jurisprudencia-stf.json` (navegador) e
   `work/coleta-agendada.log` (tarefa local).
8. **Verificação final, aba por aba** (seção 5): busca com termo, ficha,
   copiar, favoritos (marcar, gerar link, abrir em anônimo), novidades do dia,
   fontes sem alerta indevido e guia abrindo. Repetir no telefone (375 px) e
   no computador.
9. **Desligar o antigo** só depois do passo 8 — e manter o repositório antigo
   parado por uma janela de 24h como volta imediata (rollback = voltar o DNS).

## 10. O que NÃO levar

- `site/dados.json` (derivado; regenera no passo 3).
- `work/` inteiro: amostras e rascunhos locais, dezenas de MB, fora do Git —
  incluindo `coleta-agendada.log`, os CSVs da auditoria Corte Aberta e, com
  atenção, `espelho-segredos.txt` (apagar depois de cadastrar os segredos; a
  auditoria recomeça do zero na máquina nova, o que é esperado).
- `node_modules/` (só existe com instalação manual do Playwright).
- Segredos, chaves, cookies ou tokens — viajam por cofre/configuração do novo
  ambiente, nunca em arquivo nem neste documento.
- A tarefa do Agendador do Windows — vive no sistema operacional, não no
  repositório; recriar pelo passo 7.
