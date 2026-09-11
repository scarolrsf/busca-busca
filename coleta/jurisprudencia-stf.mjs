/**
 * Segunda via do STF: a jurisprudência pelo navegador real.
 *
 * O portal antigo do STF (portal.stf.jus.br) nega o endereço de saída do
 * GitHub Actions com 403, e o remendo de certificado não alcança esse caso:
 * ali o obstáculo não é a cadeia, é o firewall. A saída validada em
 * 11/09/2026 foi outra porta do mesmo tribunal, a pesquisa de jurisprudência
 * (jurisprudencia.stf.jus.br), aberta num Chromium de verdade: o desafio
 * JavaScript do WAF se resolve sozinho, como num navegador comum, sem forjar
 * token nem treinar resolvedor — o que seria contorno, e não consulta.
 *
 * O que já foi medido com o tema "fornecimento de medicamentos": 961
 * resultados, com os três primeiros extraídos por inteiro (RE 605533/Tema 262,
 * RE 657718/Tema 500 e RE 1366243/Tema 1234). Os seletores abaixo são os
 * mapeados nessa medição; se o front do STF mudar, é aqui que se ajusta.
 *
 * Esta via é opcional e desligada por padrão: exige o Playwright instalado
 * (`npm i playwright` + `npx playwright install chromium`) e um navegador de
 * verdade, que o runner agendado não tem. Liga-se com JURISPRUDENCIA_STF=1,
 * para execução à mão. Volume baixo sempre: uma busca por vez, com espera
 * entre execuções. Se o WAF bloquear, o módulo para e orienta o uso manual —
 * não insiste.
 *
 * O que sai daqui não entra em TEMAS nem em INFORMATIVOS: o grão é outro
 * (acórdãos, não temas de repercussão geral). Quando ligada, a coleta guarda
 * o resultado bruto em dados/jurisprudencia-stf.json como prova de vida da
 * via, e anota a tentativa em FONTES como qualquer outra fonte.
 *
 * Uso:
 *   node coleta/jurisprudencia-stf.mjs --tema "fornecimento de medicamentos" --headless --limite 3 --json-out saida.json
 *   node coleta/jurisprudencia-stf.mjs --autoteste   (sem rede, sem navegador)
 */
import fs from 'node:fs';

export const BUSCA_JURISPRUDENCIA = 'https://jurisprudencia.stf.jus.br/pages/search';
export const SCON_STJ = 'https://scon.stj.jus.br/SCON/';

const NAVEGADOR_REAL = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Endereço de conferência manual. O parâmetro real do aplicativo é
 * `queryString` — não `termo` — e a ordenação padrão é por relevância
 * (`sort=_score`). Um endereço montado com `termo=` abre a página, mas não
 * a busca: parece funcionar e não busca nada.
 */
export function montarUrlBusca(termo, { base = 'acordaos', page = 1, pageSize = 10 } = {}) {
  const params = new URLSearchParams({
    base,
    pesquisa_inteiro_teor: 'false',
    sinonimo: 'true',
    plural: 'true',
    radicais: 'false',
    buscaExata: 'true',
    page: String(page),
    pageSize: String(pageSize),
    queryString: termo,
    sort: '_score',
    sortBy: 'desc'
  });
  return BUSCA_JURISPRUDENCIA + '?' + params.toString();
}

/** Página de conferência manual do SCON/STJ para o mesmo tema. */
export function deeplinkScon(termo) {
  return SCON_STJ + '#q=' + encodeURIComponent(termo);
}

/** Quantos resultados a página diz ter ("961 resultado(s) para: ..."). */
export function extrairTotal(texto) {
  const m = String(texto || '').match(/([\d.]+)\s+resultado\(s\) para:/);
  return m ? m[1] : null;
}

/**
 * Órgão, relator e datas, lidos do cabeçalho de cada ficha
 * (#result-principal-header). Devolve nulos, nunca exceção: ficha sem
 * cabeçalho é ficha incompleta, não motivo para derrubar a extração.
 */
export function analisarCabecalho(texto) {
  const saida = { orgao: null, relator: null, julgamento: null, publicacao: null };
  if (!texto) return saida;
  const t = String(texto).split(/\s+/).join(' ');
  let m = t.match(/[OÓ]rg[ãa]o julgador:\s*(.+?)(?:Relator|Julgamento|Publica|$)/i);
  if (m) saida.orgao = m[1].trim() || null;
  m = t.match(/Relator\(a\):\s*(.+?)(?:Julgamento|Publica|Redator|$)/i);
  if (m) saida.relator = m[1].trim() || null;
  m = t.match(/Julgamento:\s*(\d{2}\/\d{2}\/\d{4})/);
  if (m) saida.julgamento = m[1];
  m = t.match(/Publica[çc][ãa]o:\s*(\d{2}\/\d{2}\/\d{4})/);
  if (m) saida.publicacao = m[1];
  return saida;
}

/* Seletores mapeados na medição de 11/09/2026. Dez fichas por página. */
export const SELETORES = {
  ficha: 'div.result-container',
  numero: '.titulo-result h4',
  detalhe: '.titulo-result a',
  acompanhamento: 'a[href*="listarProcessos.asp"]',
  cabecalho: '#result-principal-header',
  selo: 'app-badge',
  textos: 'p.jud-text',   // na ordem: [ementa, tema, tese, ...]
  espera: 'resultado(s) para:'
};

function detalheAbsoluto(href) {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/')) return 'https://jurisprudencia.stf.jus.br' + href;
  return href;
}

/**
 * Busca usando um Chromium real. O WAF valida sozinho via JavaScript; nada é
 * forjado. Fluxo: abre a página-base, espera o desafio se resolver, digita o
 * tema no campo, confirma com Enter, aguarda o total e extrai.
 */
export async function buscarViaNavegador(termo, { headless = true, limite = 3, timeoutMs = 60000 } = {}) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (e) {
    throw new Error('O Playwright não está instalado. Rode `npm i playwright` e ' +
      '`npx playwright install chromium`, ou use o endereço manual: ' + montarUrlBusca(termo));
  }
  const { chromium } = playwright;
  const browser = await chromium.launch({ headless });
  try {
    const context = await browser.newContext({
      locale: 'pt-BR',
      userAgent: NAVEGADOR_REAL,
      viewport: { width: 1366, height: 900 }
    });
    const page = await context.newPage();
    await page.goto(BUSCA_JURISPRUDENCIA, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    // O desafio do WAF recarrega sozinho; a pressa aqui só colhe a página de bloqueio.
    await page.waitForTimeout(8000);
    const titulo = await page.title();
    const conteudo = await page.content();
    const bloqueado = conteudo.toLowerCase().includes('not a robot') ||
      conteudo.toLowerCase().slice(0, 2000).includes('403 forbidden');
    if (bloqueado) {
      return { termo, url: page.url(), titulo, bloqueadoWaf: true, total: null, itens: [] };
    }
    const campo = page.locator('input').first;
    await campo.click();
    await campo.fill(termo);
    await page.waitForTimeout(800);
    await campo.press('Enter');
    try {
      await page.getByText(SELETORES.espera).first.waitFor({ timeout: 30000 });
    } catch (e) { /* sem o total, extrai-se o que renderizou */ }
    await page.waitForTimeout(4000);

    let total = null;
    try {
      total = extrairTotal(await page.locator('body').innerText({ timeout: 10000 }));
    } catch (e) { /* página sem corpo legível: total fica nulo */ }

    const quantas = await page.locator(SELETORES.ficha).count().catch(() => 0);
    const itens = [];
    for (let i = 0; i < Math.min(quantas, limite); i++) {
      const ficha = page.locator(SELETORES.ficha).nth(i);
      const numero = await ficha.locator(SELETORES.numero).first.innerText({ timeout: 3000 })
        .then(t => t.trim()).catch(() => null);
      const detalhe = await ficha.locator(SELETORES.detalhe).first.getAttribute('href', { timeout: 3000 })
        .then(detalheAbsoluto).catch(() => null);
      const acompanhamento = await ficha.locator(SELETORES.acompanhamento).first
        .getAttribute('href', { timeout: 3000 }).catch(() => null);
      const cabecalho = await ficha.locator(SELETORES.cabecalho).first.innerText({ timeout: 3000 })
        .catch(() => '');
      const selo = await ficha.locator(SELETORES.selo).first.innerText({ timeout: 3000 })
        .then(t => t.trim().slice(0, 200)).catch(() => null);
      const textos = await ficha.locator(SELETORES.textos).allInnerTexts().catch(() => []);
      const campos = analisarCabecalho(cabecalho);
      const sjur = detalhe && (detalhe.match(/(sjur\d+)/) || [])[1];
      itens.push({
        numero, sjur: sjur || null, detalheUrl: detalhe, acompanhamentoUrl: acompanhamento,
        orgao: campos.orgao, relator: campos.relator,
        julgamento: campos.julgamento, publicacao: campos.publicacao,
        selo, ementa: textos[0] || null, tema: textos[1] || null, tese: textos[2] || null
      });
    }
    const urlFinal = page.url();
    await new Promise(r => setTimeout(r, 1000));   // intervalo respeitoso entre execuções
    return {
      termo, url: urlFinal, deeplink: montarUrlBusca(termo),
      titulo, bloqueadoWaf: false, total, itens
    };
  } finally {
    await browser.close();
  }
}

/* Sem rede e sem navegador: confere o que dá para conferir sem sair da máquina. */
function autoteste() {
  const falhas = [];
  const confere = (nome, obtido, esperado) => {
    if (JSON.stringify(obtido) !== JSON.stringify(esperado)) {
      falhas.push(nome + ': esperado ' + JSON.stringify(esperado) + ', veio ' + JSON.stringify(obtido));
    }
  };
  const url = montarUrlBusca('fornecimento de medicamentos');
  confere('deeplink usa queryString', url.includes('queryString=fornecimento+de+medicamentos'), true);
  confere('deeplink não usa termo=', /[?&]termo=/.test(url), false);
  confere('deeplink ordena por relevância', url.includes('sort=_score'), true);
  confere('total com milhar', extrairTotal('961 resultado(s) para: fornecimento'), '961');
  confere('total pontuado', extrairTotal('1.234 resultado(s) para: x'), '1.234');
  confere('total ausente', extrairTotal('nenhum resultado aqui'), null);
  confere('cabeçalho completo', analisarCabecalho(
    'Órgão julgador: Tribunal Pleno Relator(a): Min. MARCO AURÉLIO Julgamento: 15/08/2018 Publicação: 12/02/2020'),
    { orgao: 'Tribunal Pleno', relator: 'Min. MARCO AURÉLIO', julgamento: '15/08/2018', publicacao: '12/02/2020' });
  confere('cabeçalho vazio', analisarCabecalho(''),
    { orgao: null, relator: null, julgamento: null, publicacao: null });
  confere('scon é conferência manual', deeplinkScon('fornecimento de medicamentos'),
    SCON_STJ + '#q=fornecimento%20de%20medicamentos');
  if (falhas.length) {
    falhas.forEach(f => console.error('  ' + f));
    throw new Error(falhas.length + ' verificação(ões) falhou(aram).');
  }
  console.log('Jurisprudência STF: 9 verificações, todas passaram (sem rede, sem navegador).');
}

function ajuda() {
  console.log([
    'Uso:',
    '  node coleta/jurisprudencia-stf.mjs --tema "fornecimento de medicamentos" --headless --limite 3 --json-out saida.json',
    '  node coleta/jurisprudencia-stf.mjs --autoteste   (sem rede, sem navegador)'
  ].join('\n'));
}

const ehCli = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('coleta/jurisprudencia-stf.mjs');
if (ehCli) {
  const args = process.argv.slice(2);
  const valor = (nome, padrao) => {
    const i = args.indexOf(nome);
    return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
  };
  try {
    if (args.includes('--autoteste')) {
      autoteste();
    } else {
      const tema = valor('--tema', null);
      if (!tema) { ajuda(); process.exit(2); }
      const limite = Math.max(1, Math.min(10, Number(valor('--limite', '3')) || 3));
      const resultado = await buscarViaNavegador(tema, {
        headless: !args.includes('--no-headless'),
        limite
      });
      console.log('Tema: ' + resultado.termo);
      console.log('Deeplink STF: ' + montarUrlBusca(tema));
      console.log('SCON STJ: ' + deeplinkScon(tema));
      console.log('Título: ' + resultado.titulo);
      console.log('WAF bloqueou: ' + resultado.bloqueadoWaf);
      console.log('Total: ' + resultado.total + ' resultado(s)');
      resultado.itens.forEach((it, i) => {
        console.log('\n[' + (i + 1) + '] ' + it.numero + ' | ' + it.orgao + ' | Rel. ' + it.relator);
        console.log('    Julg: ' + it.julgamento + ' Pub: ' + it.publicacao + ' | ' + it.selo);
        console.log('    Detalhe: ' + it.detalheUrl);
      });
      if (resultado.bloqueadoWaf) {
        console.log('Bloqueio mantido. Pare e use manualmente. Não tente resolver.');
      }
      const saida = valor('--json-out', null);
      if (saida) {
        fs.writeFileSync(saida, JSON.stringify(resultado, null, 2));
        console.log('\nSalvo em ' + saida);
      }
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
