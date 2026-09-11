/**
 * Corte Aberta: as três bases de repercussão geral pelo navegador real.
 *
 * A página de dados abertos do STF (transparencia.stf.jus.br, programa Corte
 * Aberta) não tem endereço de arquivo para baixar: cada link xlsx/csv dispara
 * a exportação do motor Qlik dentro da página. Então o caminho é abrir a
 * página num Chromium de verdade e acionar os botões oficiais de exportação —
 * o mesmo padrão da segunda via da jurisprudência. Nada é forjado: o desafio
 * do WAF se resolve sozinho como num navegador comum, e o que se clica é o
 * que o tribunal oferece a qualquer visitante.
 *
 * Fase atual: AUDITORIA PARALELA. Baixa os 3 CSVs, guarda em work/ (fora do
 * Git) com hash, e diz se mudaram desde ontem. Não toca em dados/ nem no
 * site: a troca da fonte atual (todostemas.asp + listarProcesso.asp) só vem
 * depois de N dias com os dois batendo.
 *
 * Uso:
 *   node coleta/corte-aberta.mjs --autoteste        (sem rede, sem navegador)
 *   node coleta/corte-aberta.mjs --baixar            (abre o navegador e baixa os 3 CSVs)
 *   node coleta/corte-aberta.mjs --baixar --no-headless   (vendo a página abrir)
 *   node coleta/corte-aberta.mjs --baixar --somente temas
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const CORTE_ABERTA_URL =
  'https://transparencia.stf.jus.br/extensions/dados_abertos/dados_abertos.html';

/* IDs dos links na página e o que cada um baixa. Os data-* vieram do HTML;
   os objetos Qlik de produção, do qliksense.js do próprio tribunal. */
export const BASES_RG = [
  {
    chave: 'temas',
    linkId: 'EXPORT-LINK-RG-TEMAS-CSV',
    objetoId: 'hEKeEY',
    arquivo: 'rg-temas.csv'
  },
  {
    chave: 'suspensao_nacional',
    linkId: 'EXPORT-LINK-RG-SUSPENSAO-NACIONAL-CSV',
    objetoId: 'jVYfQXL',
    arquivo: 'rg-suspensao-nacional.csv'
  },
  {
    chave: 'representativo_controversia',
    linkId: 'EXPORT-LINK-RG-REPRESENTATIVO-CONTROVERSIA-CSV',
    objetoId: 'XJAVRS',
    arquivo: 'rg-representativo-controversia.csv'
  }
];

export const APP_RG_PROD = 'd00163a8-3179-4450-8084-c0e1ca3daf49';

const NAVEGADOR_REAL = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/* Colunas-âncora esperadas no CSV de temas, pelos dicionários oficiais.
   Não é validação rígida: serve para dizer, no relatório, se o arquivo veio
   com o formato conhecido ou se o tribunal mudou o layout. */
export const COLUNAS_ANCONA_TEMAS = [
  'Número tema', 'Título tema', 'Descrição tema', 'Tese',
  'Processo paradigma', 'Relator atual', 'Situação repercussão geral',
  'Situação Suspensão Nacional', 'Data Determinação Suspensão Nacional',
  'Data Revogação Suspensão Nacional', 'Ramos do Direito', 'Assunto'
];

/** sha256 de um arquivo, em hexadecimal. */
export function hashArquivo(caminho) {
  return crypto.createHash('sha256').update(fs.readFileSync(caminho)).digest('hex');
}

/**
 * Lê o cabeçalho de um CSV do Qlik sem presumir o separador: conta `;` e `,`
 * na primeira linha e fica com o mais frequente. Devolve { separador,
 * colunas }. O BOM do UTF-8, se houver, é ignorado.
 */
export function lerCabecalhoCsv(caminho) {
  const bruto = fs.readFileSync(caminho, 'utf8').replace(/^\uFEFF/, '');
  const primeira = bruto.split(/\r?\n/, 1)[0] || '';
  const pontoVirgulas = (primeira.match(/;/g) || []).length;
  const virgulas = (primeira.match(/,/g) || []).length;
  const separador = pontoVirgulas >= virgulas ? ';' : ',';
  const colunas = primeira.split(separador).map(c => c.trim().replace(/^"|"$/g, ''));
  return { separador, colunas };
}

/** Quantos registros de dados tem o CSV (cabeçalho não conta, vazios não contam).
 *  Conta registros lógicos, não linhas físicas: os campos longos (tese,
 *  decisões) trazem quebras de linha dentro das aspas — partir por \n aqui
 *  contou 43 mil "linhas" num arquivo de 1.483 registros, na medição real. */
export function contarLinhasCsv(caminho, separador = null) {
  const bruto = fs.readFileSync(caminho, 'utf8').replace(/^\uFEFF/, '');
  const sep = separador || lerCabecalhoCsv(caminho).separador;
  const estrutural = new RegExp('[' + sep + '\\s"]', 'g');
  let registros = 0, aspas = false, miolo = '';
  const fechaRegistro = () => {
    if (miolo.replace(estrutural, '')) registros++;
    miolo = '';
  };
  for (let i = 0; i < bruto.length; i++) {
    const ch = bruto[i];
    if (aspas) {
      miolo += ch;
      if (ch === '"') {
        if (bruto[i + 1] === '"') { miolo += '"'; i++; }
        else aspas = false;
      }
    } else if (ch === '"') { aspas = true; miolo += ch; }
    else if (ch === '\n') fechaRegistro();
    else if (ch !== '\r') miolo += ch;
  }
  fechaRegistro();
  return Math.max(0, registros - 1);
}

/**
 * Compara os hashes de hoje com os de ontem (work/corte-aberta/hashes.json).
 * Devolve [{ chave, arquivo, mudou, bytes, linhas, sha256 }]. Sem ontem,
 * tudo conta como "primeira leitura", não como mudança.
 */
export function compararComOntem(dir, resultados) {
  const caminho = path.join(dir, 'hashes.json');
  let ontem = {};
  try { ontem = JSON.parse(fs.readFileSync(caminho, 'utf8')); } catch (e) { /* primeira vez */ }
  const hoje = {};
  const relatorio = resultados.map(r => {
    hoje[r.chave] = { sha256: r.sha256, bytes: r.bytes, linhas: r.linhas, data: r.data };
    const anterior = ontem[r.chave];
    return {
      chave: r.chave, arquivo: r.arquivo, bytes: r.bytes, linhas: r.linhas,
      sha256: r.sha256, mudou: anterior ? anterior.sha256 !== r.sha256 : null
    };
  });
  fs.writeFileSync(caminho, JSON.stringify(hoje, null, 1));
  return relatorio;
}

/**
 * Baixa as bases pelo navegador. Um clique por vez, com espera entre eles:
 * cada exportação abre o aplicativo Qlik da repercussão geral no servidor do
 * tribunal, e pressionar os três juntos é pedir para ser tratado como ataque.
 * Se o WAF bloquear, para e orienta o uso manual — sem insistir.
 */
export async function baixarBases({ headless = true, dir, somente = null, timeoutMs = 120000 } = {}) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (e) {
    throw new Error('O Playwright não está instalado. Rode `npm i playwright --no-save` e ' +
      '`npx playwright install chromium`. Sem ele, a conferência é manual na página do Corte Aberta.');
  }
  const { chromium } = playwright;
  const alvos = somente ? BASES_RG.filter(b => b.chave === somente) : BASES_RG;
  if (somente && !alvos.length) throw new Error('Base desconhecida: ' + somente + '. Use: temas, suspensao_nacional ou representativo_controversia.');
  fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ headless });
  try {
    const context = await browser.newContext({
      locale: 'pt-BR',
      userAgent: NAVEGADOR_REAL,
      viewport: { width: 1366, height: 900 },
      acceptDownloads: true
    });
    const page = await context.newPage();
    await page.goto(CORTE_ABERTA_URL, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    // O desafio do WAF recarrega sozinho; a pressa aqui só colhe a página de bloqueio.
    await page.waitForTimeout(8000);
    const conteudo = await page.content();
    const cabeca = conteudo.toLowerCase().slice(0, 2000);
    if (conteudo.toLowerCase().includes('not a robot') || cabeca.includes('403 forbidden')) {
      return { bloqueadoWaf: true, resultados: [] };
    }
    // A tabela de dados abertos precisa estar renderizada antes de clicar.
    await page.locator('#tbody-dados-abertos-open').first().waitFor({ timeout: 60000 });
    // Sem filtros, o download é a base completa — é o que o aviso "Saiba mais" exige.
    await page.locator('[data-qcmd="clearAll"]').first().click().catch(() => {});
    await page.waitForTimeout(2000);

    const resultados = [];
    const data = new Date().toISOString().slice(0, 10);
    for (const base of alvos) {
      const destino = path.join(dir, data + '-' + base.arquivo);
      const espera = page.waitForEvent('download', { timeout: timeoutMs }).catch(() => null);
      await page.locator('#' + base.linkId).first().click({ timeout: 30000 });
      const download = await espera;
      if (!download) throw new Error('O tribunal não devolveu o arquivo de ' + base.chave + ' a tempo. Sem insistir: tente de novo mais tarde.');
      await download.saveAs(destino);
      const stat = fs.statSync(destino);
      if (stat.size < 1000) throw new Error('O arquivo de ' + base.chave + ' veio com ' + stat.size + ' bytes — pequeno demais para a base. Nada foi gravado como válido.');
      const { separador, colunas } = lerCabecalhoCsv(destino);
      resultados.push({
        chave: base.chave, arquivo: path.basename(destino), caminho: destino,
        bytes: stat.size, sha256: hashArquivo(destino),
        linhas: contarLinhasCsv(destino), separador,
        colunas, data
      });
      // Intervalo respeitoso entre uma exportação e outra.
      await page.waitForTimeout(5000);
    }
    return { bloqueadoWaf: false, resultados };
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
  confere('são 3 bases de RG', BASES_RG.map(b => b.chave),
    ['temas', 'suspensao_nacional', 'representativo_controversia']);
  confere('links únicos', new Set(BASES_RG.map(b => b.linkId)).size, 3);
  confere('objetos únicos', new Set(BASES_RG.map(b => b.objetoId)).size, 3);
  confere('app RG prod', APP_RG_PROD, 'd00163a8-3179-4450-8084-c0e1ca3daf49');
  confere('url é a do Corte Aberta', CORTE_ABERTA_URL,
    'https://transparencia.stf.jus.br/extensions/dados_abertos/dados_abertos.html');

  const tmp = fs.mkdtempSync(path.join(fs.realpathSync(osTmp()), 'corte-aberta-teste-'));
  const amostraPontoVirgula = '\uFEFF"Número tema";"Título tema";"Situação Suspensão Nacional"\n"1455";"IPTU";"Sem Suspensão Nacional"\n"1443";"Crime ambiental";"Suspensão Nacional Vigente"\n';
  const arq1 = path.join(tmp, 'a.csv');
  fs.writeFileSync(arq1, amostraPontoVirgula);
  const cab1 = lerCabecalhoCsv(arq1);
  confere('separador ; detectado', cab1.separador, ';');
  confere('BOM ignorado', cab1.colunas[0], 'Número tema');
  confere('3 colunas', cab1.colunas.length, 3);
  confere('2 linhas de dados', contarLinhasCsv(arq1), 2);
  const amostraVirgula = 'Numero,Titulo\n1,x\n2,y\n\n';
  const arq2 = path.join(tmp, 'b.csv');
  fs.writeFileSync(arq2, amostraVirgula);
  confere('separador , detectado', lerCabecalhoCsv(arq2).separador, ',');
  confere('linha vazia não conta', contarLinhasCsv(arq2), 2);
  const arq3 = path.join(tmp, 'c.csv');
  fs.writeFileSync(arq3, 'a,b\n"x\ny\nz",2\n3,4\n');
  confere('quebra dentro de aspas não é registro', contarLinhasCsv(arq3), 2);
  confere('hash tem 64 hex', /^[0-9a-f]{64}$/.test(hashArquivo(arq1)), true);

  const r1 = compararComOntem(tmp, [{ chave: 'temas', arquivo: 'x.csv', bytes: 10, linhas: 2, sha256: 'a'.repeat(64), data: '2026-09-11' }]);
  confere('primeira leitura não é mudança', r1[0].mudou, null);
  const r2 = compararComOntem(tmp, [{ chave: 'temas', arquivo: 'x.csv', bytes: 10, linhas: 2, sha256: 'a'.repeat(64), data: '2026-09-12' }]);
  confere('hash igual não mudou', r2[0].mudou, false);
  const r3 = compararComOntem(tmp, [{ chave: 'temas', arquivo: 'x.csv', bytes: 11, linhas: 3, sha256: 'b'.repeat(64), data: '2026-09-13' }]);
  confere('hash diferente mudou', r3[0].mudou, true);
  fs.rmSync(tmp, { recursive: true, force: true });

  if (falhas.length) {
    falhas.forEach(f => console.error('  ' + f));
    throw new Error(falhas.length + ' verificação(ões) falhou(aram).');
  }
  console.log('Corte Aberta: 15 verificações, todas passaram (sem rede, sem navegador).');
}

function osTmp() {
  return process.env.TEMP || process.env.TMP || '/tmp';
}

function ajuda() {
  console.log([
    'Uso:',
    '  node coleta/corte-aberta.mjs --autoteste   (sem rede, sem navegador)',
    '  node coleta/corte-aberta.mjs --baixar       (baixa os 3 CSVs da repercussão geral)',
    '  node coleta/corte-aberta.mjs --baixar --somente temas [--no-headless] [--dir pasta]'
  ].join('\n'));
}

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ehCli = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('coleta/corte-aberta.mjs');
if (ehCli) {
  const args = process.argv.slice(2);
  const valor = (nome, padrao) => {
    const i = args.indexOf(nome);
    return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
  };
  try {
    if (args.includes('--autoteste')) {
      autoteste();
    } else if (args.includes('--baixar')) {
      const dir = valor('--dir', path.join(RAIZ, 'work', 'corte-aberta'));
      const resultado = await baixarBases({
        headless: !args.includes('--no-headless'),
        dir,
        somente: valor('--somente', null)
      });
      if (resultado.bloqueadoWaf) {
        console.log('Bloqueio mantido. Pare e use manualmente. Não tente resolver.');
        process.exit(0);
      }
      const relatorio = compararComOntem(dir, resultado.resultados);
      resultado.resultados.forEach(r => {
        const rel = relatorio.find(x => x.chave === r.chave);
        console.log('\n[' + r.chave + '] ' + r.arquivo + ' — ' + r.bytes + ' bytes, ' + r.linhas + ' linhas');
        console.log('  sha256: ' + r.sha256.slice(0, 16) + '…');
        console.log('  colunas (' + r.colunas.length + '): ' + r.colunas.slice(0, 12).join(' | '));
        const conhecidas = COLUNAS_ANCONA_TEMAS.filter(c => r.colunas.includes(c)).length;
        console.log('  colunas-âncora do dicionário: ' + conhecidas + ' de ' + COLUNAS_ANCONA_TEMAS.length);
        console.log('  mudou desde ontem: ' + (rel.mudou === null ? 'primeira leitura' : rel.mudou ? 'SIM' : 'não'));
      });
      console.log('\nArquivos em ' + dir + ' (fora do Git). Nenhum dado do portal foi tocado.');
    } else {
      ajuda();
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
