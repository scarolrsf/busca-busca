/**
 * Boletins do NUGEPNAC: em qual boletim cada tema apareceu, e o link para ele.
 *
 * O NUGEPNAC publica duas coisas no portal do TJMG, e uma explica a outra:
 *
 * 1. A **lista de boletins** — "Informativo Semanal Nugepnac - 27 (31-08-2026 a
 *    05-09-2026)" —, um PDF por semana, com o período no próprio título.
 * 2. As **notícias** de precedentes, uma a uma, em HTML, cada qual com data,
 *    categoria ("Suspensão Nacional", "Prorrogação de Suspensão", "Tema
 *    Cancelado"…) e o tema entre parênteses, com o tribunal dito por extenso:
 *    "(Tema 1376 - STJ)". É o material que o boletim da semana reúne.
 *
 * Daí o casamento: a notícia diz o tema e o dia; o boletim cuja semana contém
 * aquele dia é o boletim em que o tema consta. Nada de adivinhação e nada de
 * ler PDF — a data está escrita nos dois lugares.
 *
 * As duas páginas são um portal Lumis: a lista só aparece depois que o
 * formulário é enviado. Mas é POST comum, de formulário, sem navegador — os
 * campos estão aqui, e o servidor devolve a página inteira já montada.
 *
 * Fase atual: AUDITORIA E ANOTAÇÃO. Grava dois campos no registro — o boletim e
 * o endereço dele —, fora do fluxo da coleta, do mesmo jeito que
 * `corte-aberta.mjs --anotar`: são publicações antigas, e passá-las pelo fluxo
 * faria a aba "Novidades" anunciar hoje boletim de 2025.
 *
 * Uso:
 *   node coleta/boletins-nugepnac.mjs --autoteste          (sem rede)
 *   node coleta/boletins-nugepnac.mjs --anotar --ensaio    (lê e mostra, não grava)
 *   node coleta/boletins-nugepnac.mjs --anotar [--desde 01/01/2025]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const NAVEGADOR_REAL = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/* Os dois formulários do portal. O `lumII` identifica a interface dentro da
   página e vai no endereço e no corpo; o `form` é o que o Lumis chama de
   "doui_fromForm". Valores lidos das próprias páginas em 12/09/2026. */
export const NOTICIAS = {
  pagina: 'https://www.tjmg.jus.br/portal-tjmg/jurisprudencia/precedentes-qualificados-e-acoes-coletivas/',
  acao: 'https://www.tjmg.jus.br/main.jsp?lumPageId=4028A1815A04B4CD015A04F5AC340A7D&lumA=1&lumII=4028AA155A5CBF05015A5DB56A2C0B57',
  form: 'Form_4028AA155A5CBF05015A5DB56A2C0B57',
  lumII: '4028AA155A5CBF05015A5DB56A2C0B57'
};

export const BOLETINS = {
  pagina: 'https://www.tjmg.jus.br/portal-tjmg/jurisprudencia/recurso-repetitivo-e-repercussao-geral/lista-de-boletins.htm',
  acao: 'https://www.tjmg.jus.br/main.jsp?lumPageId=4028A1815A04B4CD015A04F5AC3F0A89&lumA=1&lumII=4028AA155A5CBF05015A5E3B98570E90',
  form: 'Form_4028AA155A5CBF05015A5E3B98570E90',
  lumII: '4028AA155A5CBF05015A5E3B98570E90'
};

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "11 de setembro - 2026" → "2026-09-11". Vazio se não for isso. */
export function dataDoSubtitulo(texto) {
  const m = String(texto || '').trim().toLowerCase()
    .match(/^(\d{1,2})\s+de\s+([a-zçãé]+)\s*[-–]\s*(\d{4})$/);
  if (!m) return '';
  const mes = MESES.indexOf(m[2]);
  if (mes < 0) return '';
  return m[3] + '-' + String(mes + 1).padStart(2, '0') + '-' + m[1].padStart(2, '0');
}

/** "31-08-2026" → "2026-08-31". */
function dataDoTitulo(texto) {
  const m = String(texto || '').match(/(\d{2})-(\d{2})-(\d{4})/);
  return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
}

/** Texto de um trecho de HTML, sem marcação e sem entidades das que aparecem aqui. */
export function texto(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

function absoluta(href) {
  if (!href) return '';
  if (/^https?:/i.test(href)) return href;
  return 'https://www.tjmg.jus.br/' + String(href).replace(/^\//, '');
}

/** POST de formulário Lumis. Devolve o HTML da página já montada. */
async function postar(alvo, campos) {
  const corpo = new URLSearchParams(Object.assign({
    doui_fromForm: alvo.form,
    lumII: alvo.lumII,
    lumClientRendered: '1',
    doui_processActionId: '',
    doui_renderAction: '',
    doui_renderControlId: '',
    doui_storedValues: ''
  }, campos));
  const r = await fetch(alvo.acao, {
    method: 'POST',
    headers: {
      'user-agent': NAVEGADOR_REAL,
      'content-type': 'application/x-www-form-urlencoded',
      'accept-language': 'pt-BR,pt;q=0.9'
    },
    body: corpo
  });
  if (!r.ok) throw new Error('O portal do TJMG respondeu ' + r.status + ' em ' + alvo.pagina);
  return r.text();
}

/**
 * Os temas citados no fim do título da notícia.
 *
 * O NUGEPNAC escreve de quatro jeitos, e os quatro aparecem na mesma semana:
 *
 *   "(Tema 1376 - STJ)"            um tema do tribunal superior
 *   "(Temas 65, 66 e 67 - STJ)"    vários de uma vez
 *   "(Tema 113 IRDR - TJMG)"       incidente do próprio TJMG, com o tipo junto
 *   "(Controvérsia 827 - STJ)"     controvérsia ainda não afetada — não é tema
 *
 * A controvérsia fica de fora de propósito: ela ainda não tem número de tema, e
 * casá-la com um tema pelo número seria apontar o boletim errado.
 */
export function temasDoTitulo(titulo) {
  const m = String(titulo || '').match(/\(Temas?\s+([^)]+?)\s*-\s*(STJ|STF|TJMG)\)\s*$/i);
  if (!m) return [];
  const tribunal = m[2].toUpperCase();
  const corpo = m[1];
  const tipo = (corpo.match(/\b(IRDR|IAC|GR)\b/i) || [])[1];
  const numeros = (corpo.match(/\d+/g) || []);
  return numeros.map(numero => ({
    numero,
    tribunal,
    tipo: tipo ? tipo.toUpperCase() : ''
  }));
}

/**
 * As notícias de uma página de resultado.
 *
 * A estrutura é estável e simples: um `<p class="subheading">` com a data abre
 * o dia, e cada `<article class="card horizontal">` seguinte é uma notícia,
 * até o próximo subheading. O tema vem no fim do título, entre parênteses, com
 * o tribunal: "(Tema 1376 - STJ)".
 */
export function parseNoticias(html) {
  const pedacos = String(html).split(/<p class="subheading">/).slice(1);
  const noticias = [];
  for (const pedaco of pedacos) {
    const data = dataDoSubtitulo(texto(pedaco.slice(0, pedaco.indexOf('</p>'))));
    if (!data) continue;
    for (const artigo of pedaco.split(/<article\b/).slice(1)) {
      const titulo = texto((artigo.match(/<h3 class="card-title">([\s\S]*?)<\/h3>/) || [])[1] || '');
      if (!titulo) continue;
      const categoria = texto((artigo.match(/class="category"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || '');
      const href = (artigo.match(/<h3 class="card-title">[\s\S]*?href="([^"]+)"/) || [])[1] || '';
      noticias.push({ data, temas: temasDoTitulo(titulo), titulo, categoria, url: absoluta(href) });
    }
  }
  return noticias;
}

/**
 * Os boletins de uma página da lista. O período está no título — é dele que
 * sai a semana que cada boletim cobre.
 */
export function parseBoletins(html) {
  const boletins = [];
  for (const m of String(html).matchAll(/href="([^"]*\.pdf[^"]*)"[^>]*>([\s\S]{0,400}?)<\/a>/gi)) {
    const titulo = texto(m[2]);
    const numero = titulo.match(/Nugepnac\s*-\s*(\d+)/i);
    const periodo = titulo.match(/(\d{2}-\d{2}-\d{4})\s*a\s*(\d{2}-\d{2}-\d{4})/i);
    if (!numero || !periodo) continue;
    boletins.push({
      numero: numero[1],
      inicio: dataDoTitulo(periodo[1]),
      fim: dataDoTitulo(periodo[2]),
      titulo,
      url: absoluta(decodeURI(m[1]).replace(/ /g, '%20'))
    });
  }
  return boletins;
}

/** O boletim cuja semana contém o dia. Nenhum, se a data cair fora de todos. */
export function boletimDaData(boletins, data) {
  return boletins.find(b => b.inicio && b.fim && data >= b.inicio && data <= b.fim) || null;
}

/**
 * O identificador do registro no portal, a partir do que a notícia diz.
 *
 * STJ e STF têm numeração própria de tema, e o portal os guarda como
 * STJ-TEMA-n e STF-TEMA-n. No TJMG a notícia costuma dizer o tipo — "Tema 113
 * IRDR - TJMG" —, e quando não diz procura-se na base, na ordem em que os três
 * tipos aparecem por lá. Não achando, a notícia é ignorada: inventar vínculo
 * entre um boletim e um incidente é pior do que não ter boletim nenhum.
 */
export function idDoTema(citacao, existe) {
  if (!citacao || !citacao.numero || !citacao.tribunal) return '';
  if (citacao.tribunal === 'STJ' || citacao.tribunal === 'STF') {
    const id = citacao.tribunal + '-TEMA-' + citacao.numero;
    return existe(id) ? id : '';
  }
  const tipos = citacao.tipo ? [citacao.tipo] : ['IRDR', 'IAC', 'GR'];
  for (const tipo of tipos) {
    const id = 'TJMG-' + tipo + '-' + citacao.numero;
    if (existe(id)) return id;
  }
  return '';
}

/**
 * Percorre as páginas de uma lista Lumis até ela se repetir ou esvaziar.
 *
 * O portal não diz quantas páginas existem; diz só quais botões desenhar. A
 * saída, então, é por conteúdo: página vazia, ou igual à anterior, encerra. O
 * teto de páginas existe para que um erro de leitura não vire laço infinito
 * contra o servidor do tribunal.
 */
async function percorrer(alvo, campos, parse, { maxPaginas = 40 } = {}) {
  const itens = [];
  let anterior = '';
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const html = await postar(alvo, Object.assign({}, campos, { 'list.pagination': String(pagina) }));
    const lote = parse(html);
    if (!lote.length) break;
    const assinatura = JSON.stringify(lote[0]) + lote.length;
    if (assinatura === anterior) break;
    anterior = assinatura;
    itens.push(...lote);
  }
  return itens;
}

export async function lerBoletins(opcoes) {
  return percorrer(BOLETINS, {}, parseBoletins, opcoes);
}

/**
 * As notícias, da mais nova para trás, até o dia em que se quer parar.
 *
 * O filtro de datas da página é de uso humano: ele reaplica e volta à primeira
 * página a cada envio, e a paginação seguinte depende de sessão no servidor.
 * A lista sem filtro, essa, pagina direto — e vem em ordem cronológica, da mais
 * recente para a mais antiga. Então a leitura é simples: virar página até
 * passar do dia pedido. Uma pausa curta entre as páginas, porque são dezenas
 * de requisições ao portal do tribunal.
 */
export async function lerNoticias({ desde, maxPaginas = 90, pausaMs = 400 } = {}) {
  const limite = desde || '2000-01-01';
  const noticias = [];
  let anterior = '';
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const html = await postar(NOTICIAS, { 'list.pagination': String(pagina) });
    const lote = parseNoticias(html);
    if (!lote.length) break;
    const assinatura = JSON.stringify(lote[0]);
    if (assinatura === anterior) break;
    anterior = assinatura;
    noticias.push(...lote);
    const maisAntiga = lote[lote.length - 1].data;
    if (maisAntiga && maisAntiga < limite) break;
    if (pausaMs) await new Promise(r => setTimeout(r, pausaMs));
  }
  return noticias.filter(n => !n.data || n.data >= limite);
}

/**
 * Casa notícia com boletim e devolve, por tema, o boletim mais recente em que
 * ele apareceu. Mais recente, e não o primeiro: quem consulta quer o último
 * lugar em que o NUGEPNAC falou daquele tema.
 */
export function boletimPorTema(noticias, boletins, existe) {
  const porTema = new Map();
  for (const n of noticias) {
    const b = boletimDaData(boletins, n.data);
    if (!b) continue;
    for (const citacao of (n.temas || [])) {
      const id = idDoTema(citacao, existe);
      if (!id) continue;
      const atual = porTema.get(id);
      if (atual && atual.data >= n.data) continue;
      porTema.set(id, { data: n.data, boletim: b, categoria: n.categoria });
    }
  }
  return porTema;
}

/** Grava `boletim` e `boletimUrl` na base. Fora do fluxo da coleta, de propósito. */
export function anotarBoletins({ porTema, arquivoDaBase, aplicar = false }) {
  const base = JSON.parse(fs.readFileSync(arquivoDaBase, 'utf8'));
  const postos = [];
  for (const r of base) {
    const achado = porTema.get(r.id);
    if (!achado) continue;
    const rotulo = 'Informativo Semanal NUGEPNAC ' + achado.boletim.numero +
      ' (' + achado.boletim.inicio.split('-').reverse().join('/') +
      ' a ' + achado.boletim.fim.split('-').reverse().join('/') + ')';
    if (r.boletim === rotulo && r.boletimUrl === achado.boletim.url) continue;
    postos.push({ id: r.id, boletim: rotulo, quando: achado.data, categoria: achado.categoria });
    r.boletim = rotulo;
    r.boletimUrl = achado.boletim.url;
  }
  if (aplicar && postos.length) fs.writeFileSync(arquivoDaBase, JSON.stringify(base, null, 1));
  return { postos, aplicado: Boolean(aplicar) };
}

/* ------------------------------------------------------------- autoteste */

function autoteste() {
  const falhas = [];
  const confere = (nome, obtido, esperado) => {
    if (JSON.stringify(obtido) !== JSON.stringify(esperado)) {
      falhas.push(nome + ': esperado ' + JSON.stringify(esperado) + ', veio ' + JSON.stringify(obtido));
    }
  };

  confere('data do subtítulo', dataDoSubtitulo('11 de setembro - 2026'), '2026-09-11');
  confere('data com mês acentuado', dataDoSubtitulo('03 de março - 2025'), '2025-03-03');
  confere('subtítulo que não é data', dataDoSubtitulo('Informativos semanais'), '');

  const amostraNoticias =
    '<p class="subheading">11 de setembro - 2026</p>' +
    '<article class="card horizontal"><h3 class="card-title">' +
    '<a href="portal-tjmg/jurisprudencia/detalhes-x-00.htm">Definir se tal coisa (Tema 1376 - STJ)</a></h3>' +
    '<small><a class="category" href="#"><b>Matéria Criminal - Tema Cancelado</b></a></small></article>' +
    '<article class="card horizontal"><h3 class="card-title">' +
    '<a href="detalhes-y-00.htm">Notícia sem tema nenhum</a></h3>' +
    '<small><a class="category" href="#"><b>Ações Coletivas</b></a></small></article>' +
    '<p class="subheading">10 de setembro - 2026</p>' +
    '<article class="card horizontal"><h3 class="card-title">' +
    '<a href="detalhes-z-00.htm">Outra coisa (Tema 94 - TJMG)</a></h3>' +
    '<small><a class="category" href="#"><b>Prorrogação de Suspensão</b></a></small></article>';
  const noticias = parseNoticias(amostraNoticias);
  confere('três notícias lidas', noticias.length, 3);
  confere('tema e tribunal', noticias[0].temas, [{ numero: '1376', tribunal: 'STJ', tipo: '' }]);
  confere('categoria', noticias[0].categoria, 'Matéria Criminal - Tema Cancelado');
  confere('notícia sem tema não inventa', noticias[1].temas, []);
  confere('data do segundo dia', noticias[2].data, '2026-09-10');
  confere('endereço absoluto', noticias[0].url, 'https://www.tjmg.jus.br/portal-tjmg/jurisprudencia/detalhes-x-00.htm');

  const amostraBoletins =
    '<a href="/data/files/49/Informativo%20Semanal%20Nugepnac%20-%2027%20_31-08-2026%20a%2005-09-2026_.pdf">' +
    'Informativo Semanal Nugepnac - 27 (31-08-2026 a 05-09-2026)</a>' +
    '<a href="/data/files/DC/Informativo.pdf">Informativo Semanal Nugepnac - 26 (24-08-2026 a 29-08-2026)</a>' +
    '<a href="/data/files/outro.pdf">Cartilha do RUPE</a>';
  const boletins = parseBoletins(amostraBoletins);
  confere('dois boletins lidos', boletins.length, 2);
  confere('número e período', [boletins[0].numero, boletins[0].inicio, boletins[0].fim],
    ['27', '2026-08-31', '2026-09-05']);
  confere('PDF que não é boletim fica de fora', boletins.every(b => b.numero), true);

  confere('dia dentro da semana', (boletimDaData(boletins, '2026-09-02') || {}).numero, '27');
  confere('dia da outra semana', (boletimDaData(boletins, '2026-08-25') || {}).numero, '26');
  confere('dia fora de todas', boletimDaData(boletins, '2026-07-01'), null);

  const existe = id => ['STJ-TEMA-1376', 'TJMG-IRDR-94'].includes(id);
  confere('id do STJ', idDoTema({ numero: '1376', tribunal: 'STJ' }, existe), 'STJ-TEMA-1376');
  confere('id do TJMG sem tipo procura os três', idDoTema({ numero: '94', tribunal: 'TJMG' }, existe), 'TJMG-IRDR-94');
  confere('id do TJMG com o tipo dito', idDoTema({ numero: '94', tribunal: 'TJMG', tipo: 'IRDR' }, existe), 'TJMG-IRDR-94');
  confere('tipo dito que não existe na base', idDoTema({ numero: '94', tribunal: 'TJMG', tipo: 'IAC' }, existe), '');
  confere('tema que não está na base', idDoTema({ numero: '999', tribunal: 'STJ' }, existe), '');
  confere('citação vazia', idDoTema({ numero: '', tribunal: '' }, existe), '');

  /* Os quatro jeitos de citar que o NUGEPNAC usa, medidos no feed em 12/09/2026. */
  confere('um tema', temasDoTitulo('Coisa qualquer (Tema 1376 - STJ)'),
    [{ numero: '1376', tribunal: 'STJ', tipo: '' }]);
  confere('vários temas de uma vez', temasDoTitulo('Empréstimo compulsório (Temas 65, 66 e 67 - STJ)').map(t => t.numero),
    ['65', '66', '67']);
  confere('incidente do TJMG com o tipo', temasDoTitulo('Abusividade (Tema 113 IRDR - TJMG)'),
    [{ numero: '113', tribunal: 'TJMG', tipo: 'IRDR' }]);
  confere('IAC do TJMG', temasDoTitulo('Cessão de crédito (Tema 7 IAC - TJMG)'),
    [{ numero: '7', tribunal: 'TJMG', tipo: 'IAC' }]);
  confere('controvérsia não é tema', temasDoTitulo('Dosimetria (Controvérsia 827 - STJ)'), []);
  confere('título sem citação', temasDoTitulo('Notícia solta'), []);

  const porTema = boletimPorTema(
    [{ data: '2026-08-25', temas: [{ numero: '1376', tribunal: 'STJ' }], categoria: 'A' },
     { data: '2026-09-02', temas: [{ numero: '1376', tribunal: 'STJ' }], categoria: 'B' }],
    boletins, existe);
  confere('fica o boletim mais recente', porTema.get('STJ-TEMA-1376').boletim.numero, '27');

  if (falhas.length) {
    falhas.forEach(f => console.error('  ' + f));
    throw new Error(falhas.length + ' verificação(ões) falhou(aram).');
  }
  console.log('Boletins do NUGEPNAC: 28 verificações, todas passaram (sem rede).');
}

/* ------------------------------------------------------------------- cli */

function ajuda() {
  console.log([
    'Uso:',
    '  node coleta/boletins-nugepnac.mjs --autoteste             (sem rede)',
    '  node coleta/boletins-nugepnac.mjs --anotar --ensaio       (lê e mostra, não grava)',
    '  node coleta/boletins-nugepnac.mjs --anotar [--desde aaaa-mm-dd]',
    '  node coleta/boletins-nugepnac.mjs --anotar --recente     (45 dias; é o da rotina diária)'
  ].join('\n'));
}

const barra = String.fromCharCode(92);   // o caminho do Windows vem com contrabarra
const ehCli = process.argv[1] && process.argv[1].split(barra).join('/').endsWith('coleta/boletins-nugepnac.mjs');
if (ehCli) {
  const args = process.argv.slice(2);
  const valor = (nome, padrao) => {
    const i = args.indexOf(nome);
    return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
  };
  try {
    if (args.includes('--autoteste')) {
      autoteste();
    } else if (args.includes('--anotar')) {
      const arquivoDaBase = path.join(RAIZ, 'dados', 'temas-do-portal.json');
      const ids = new Set(JSON.parse(fs.readFileSync(arquivoDaBase, 'utf8')).map(r => r.id));
      /* Um ano para trás, por padrão: é o horizonte em que o boletim ainda diz
         algo a quem consulta, e custa umas 50 páginas de lista. --recente
         encurta para 45 dias, que é o que a rotina diária precisa virar: o que
         é mais velho que isso já foi anotado ontem, e o portal do tribunal não
         tem por que receber cinquenta requisições todo dia. */
      const hoje = new Date();
      const diasAtras = n => new Date(hoje.getTime() - n * 86400000).toISOString().slice(0, 10);
      const desde = valor('--desde', args.includes('--recente') ? diasAtras(45) : diasAtras(365));

      const boletins = await lerBoletins();
      console.log('Boletins lidos: ' + boletins.length +
        (boletins.length ? ' (do ' + boletins[boletins.length - 1].numero + ' ao ' + boletins[0].numero + ')' : ''));
      const noticias = await lerNoticias({ desde });
      console.log('Notícias desde ' + desde + ': ' + noticias.length +
        ' — com tema identificado: ' + noticias.filter(n => n.temas.length).length);

      const porTema = boletimPorTema(noticias, boletins, id => ids.has(id));
      console.log('Temas casados com boletim: ' + porTema.size);
      const r = anotarBoletins({ porTema, arquivoDaBase, aplicar: !args.includes('--ensaio') });
      r.postos.slice(0, 12).forEach(p => console.log('  ' + p.id + ' → ' + p.boletim + ' (' + p.categoria + ')'));
      if (r.postos.length > 12) console.log('  … e mais ' + (r.postos.length - 12) + '.');
      console.log('\n' + (r.aplicado
        ? 'Gravados ' + r.postos.length + ' registros em dados/temas-do-portal.json, fora do fluxo da coleta.'
        : 'Ensaio: ' + r.postos.length + ' registros seriam gravados. Nada foi escrito.'));
    } else {
      ajuda();
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
