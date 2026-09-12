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

/** Lê um CSV inteiro respeitando aspas e devolve objetos por cabeçalho. */
export function lerCsvObjetos(caminho) {
  const t = fs.readFileSync(caminho, 'utf8');
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const cab = linhas.shift() || [];
  return linhas.filter(l => l.length === cab.length)
    .map(l => Object.fromEntries(l.map((v, i) => [cab[i], v])));
}

/** O CSV mais recente de uma base, entre os baixados em work/corte-aberta. */
export function csvMaisRecente(dir, sufixo) {
  const nomes = fs.readdirSync(dir).filter(n => n.endsWith(sufixo)).sort();
  if (!nomes.length) throw new Error('Nenhum ' + sufixo + ' baixado em ' + dir + '. Rode --baixar antes.');
  return path.join(dir, nomes[nomes.length - 1]);
}

/**
 * A primeira ponte do Corte Aberta para a base: a DATA em que a suspensão
 * nacional foi determinada.
 *
 * A lista de temas do STF, que é a fonte corrente, diz que há suspensão
 * nacional e não diz desde quando. A data importa por um motivo prático: o
 * Tema 372 teve a suspensão determinada em 30/08/2024, mais de um ano DEPOIS
 * de publicado o acórdão de mérito (06/07/2023). Sem a data, o portal aplicava
 * o art. 1.040, III, e dava a suspensão por cessada — quando a ordem é
 * posterior ao marco que a encerraria.
 *
 * Escreve direto na base, fora de `atualizarRegistros_`: as datas são
 * históricas, algumas de 2017, e passá-las pelo fluxo da coleta faria a aba
 * "Novidades" anunciar hoje determinações antigas. O campo é preenchido só por
 * aqui; os coletores não o emitem, e por isso sobrevivem a cada coleta
 * (`atualizarRegistros_` só compara o que vem na leitura da fonte).
 *
 * Quem sai do CSV tem o campo limpo: sair da lista de suspensão nacional é o
 * jeito de o STF dizer que a determinação não vale mais.
 */
export function anotarSuspensaoNacional({ dir, arquivoDaBase, aplicar = false } = {}) {
  const csv = lerCsvObjetos(csvMaisRecente(dir, 'rg-suspensao-nacional.csv'));
  const soData = s => (String(s || '').match(/\d{2}\/\d{2}\/\d{4}/) || [''])[0];
  const desde = new Map();
  for (const linha of csv) {
    const numero = String(Number(String(linha['Número tema']).trim()));
    if (!/vigente/i.test(linha['Situação Suspensão Nacional'] || '')) continue;
    desde.set(numero, soData(linha['Data Determinação Suspensão Nacional']));
  }
  const base = JSON.parse(fs.readFileSync(arquivoDaBase, 'utf8'));
  const postos = [], limpos = [];
  for (const r of base) {
    if (r.tribunal !== 'STF' || r.tipo !== 'Repercussão geral') continue;
    const nova = desde.get(String(r.numero).trim()) || '';
    const atual = r.suspensaoNacionalDesde || '';
    if (nova === atual) continue;
    if (nova) postos.push({ tema: r.numero, de: atual, para: nova });
    else limpos.push({ tema: r.numero, de: atual });
    r.suspensaoNacionalDesde = nova;
  }
  if (aplicar && (postos.length || limpos.length)) {
    fs.writeFileSync(arquivoDaBase, JSON.stringify(base, null, 1));
  }
  return { vigentesNoCsv: desde.size, postos, limpos, aplicado: Boolean(aplicar) };
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
  /* A anotação escreve data de decisão judicial na base: o CSV precisa ser lido
     com aspas, vírgula dentro de campo e tudo. E o ensaio não pode gravar. */
  const dirAnotar = path.join(tmp, 'anotar');
  fs.mkdirSync(dirAnotar, { recursive: true });
  fs.writeFileSync(path.join(dirAnotar, '2026-01-01-rg-suspensao-nacional.csv'),
    'Número tema,Título tema,Situação Suspensão Nacional,Data Determinação Suspensão Nacional\n' +
    '0372,"PIS/COFINS, receitas financeiras",Suspensão Nacional Vigente,30/08/2024 17:16:08\n' +
    '1455,IPTU,Suspensão Nacional Cancelada,04/05/2026 10:00:00\n');
  const baseFalsa = path.join(tmp, 'temas.json');
  const conteudoOriginal = JSON.stringify([
    { id: 'STF-TEMA-372', tribunal: 'STF', tipo: 'Repercussão geral', numero: '372' },
    { id: 'STF-TEMA-1455', tribunal: 'STF', tipo: 'Repercussão geral', numero: '1455', suspensaoNacionalDesde: '04/05/2026' },
    { id: 'TJMG-IRDR-1', tribunal: 'TJMG', tipo: 'IRDR', numero: '1' }
  ], null, 1);
  fs.writeFileSync(baseFalsa, conteudoOriginal);
  const ensaio = anotarSuspensaoNacional({ dir: dirAnotar, arquivoDaBase: baseFalsa, aplicar: false });
  confere('só a vigente é anotada', ensaio.postos, [{ tema: '372', de: '', para: '30/08/2024' }]);
  confere('a cancelada é limpa', ensaio.limpos, [{ tema: '1455', de: '04/05/2026' }]);
  confere('ensaio não grava', fs.readFileSync(baseFalsa, 'utf8'), conteudoOriginal);
  const aplicado = anotarSuspensaoNacional({ dir: dirAnotar, arquivoDaBase: baseFalsa, aplicar: true });
  confere('aplicar grava', JSON.parse(fs.readFileSync(baseFalsa, 'utf8'))[0].suspensaoNacionalDesde, '30/08/2024');
  confere('nada a fazer na segunda vez',
    anotarSuspensaoNacional({ dir: dirAnotar, arquivoDaBase: baseFalsa, aplicar: true }).postos.length, 0);

  fs.rmSync(tmp, { recursive: true, force: true });

  if (falhas.length) {
    falhas.forEach(f => console.error('  ' + f));
    throw new Error(falhas.length + ' verificação(ões) falhou(aram).');
  }
  console.log('Corte Aberta: 21 verificações, todas passaram (sem rede, sem navegador).');
}

function osTmp() {
  return process.env.TEMP || process.env.TMP || '/tmp';
}

function ajuda() {
  console.log([
    'Uso:',
    '  node coleta/corte-aberta.mjs --autoteste   (sem rede, sem navegador)',
    '  node coleta/corte-aberta.mjs --baixar       (baixa os 3 CSVs da repercussão geral)',
    '  node coleta/corte-aberta.mjs --baixar --somente temas [--no-headless] [--dir pasta]',
    '  node coleta/corte-aberta.mjs --anotar [--ensaio]  (leva a data da suspensão nacional à base)'
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
    } else if (args.includes('--anotar')) {
      const dir = valor('--dir', path.join(RAIZ, 'work', 'corte-aberta'));
      const ensaio = args.includes('--ensaio');
      const r = anotarSuspensaoNacional({
        dir,
        arquivoDaBase: path.join(RAIZ, 'dados', 'temas-do-portal.json'),
        aplicar: !ensaio
      });
      console.log('Suspensão nacional vigente no Corte Aberta: ' + r.vigentesNoCsv + ' tema(s).');
      r.postos.forEach(p => console.log('  Tema ' + p.tema + ': determinada em ' + p.para + (p.de ? ' (antes: ' + p.de + ')' : '')));
      r.limpos.forEach(p => console.log('  Tema ' + p.tema + ': saiu da lista de suspensão nacional (era ' + p.de + ')'));
      if (!r.postos.length && !r.limpos.length) console.log('  Nada a mudar: a base já diz o mesmo que o CSV.');
      console.log(ensaio ? '\nEnsaio: nada foi gravado.' : '\nGravado em dados/temas-do-portal.json, fora do fluxo da coleta.');
    } else {
      ajuda();
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
