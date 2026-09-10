/**
 * Ambiente de execução da coleta.
 *
 * As regras de leitura das fontes foram escritas para o Google Apps Script, que
 * é síncrono: `buscarTexto_(url)` devolve o texto na hora. Reescrevê-las em
 * torno de Promises significaria mexer em todo o código já testado contra as
 * seis fontes. Em vez disso, este arquivo entrega as mesmas funções com o mesmo
 * comportamento síncrono, apoiadas no curl — que está em qualquer runner do
 * GitHub Actions e foi o que respondeu corretamente a todos os seis tribunais,
 * inclusive aos que exigem cookie, POST e compressão.
 *
 * Também substitui o que a planilha fazia: guardar os registros entre uma
 * coleta e outra. Agora isso são arquivos JSON versionados, o que dá de brinde
 * um histórico legível de cada alteração no próprio repositório.
 */
import { spawnSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'busca-busca-'));
const COOKIES = path.join(TEMP, 'cookies.txt');

/* ------------------------------------------------------------------- rede */

/**
 * Uma requisição, de forma síncrona. Devolve o corpo em Buffer, o código HTTP
 * e os cabeçalhos — o suficiente para o que as regras precisam.
 */
export function buscar(url, opcoes) {
  opcoes = opcoes || {};
  const corpo = path.join(TEMP, 'corpo-' + Math.random().toString(36).slice(2));
  const cabecalhos = path.join(TEMP, 'cab-' + Math.random().toString(36).slice(2));

  const args = [
    '--silent', '--show-error', '--compressed', '--location',
    '--max-time', String(opcoes.segundos || 180),
    '--user-agent', NAVEGADOR,
    '--header', 'Accept-Language: pt-BR,pt;q=0.9',
    '--cookie-jar', COOKIES, '--cookie', COOKIES,
    '--dump-header', cabecalhos,
    '--output', corpo
  ];

  if (opcoes.referer) args.push('--referer', opcoes.referer);
  Object.entries(opcoes.headers || {}).forEach(([k, v]) => args.push('--header', k + ': ' + v));

  if (opcoes.method === 'post') {
    args.push('--request', 'POST');
    const dados = opcoes.payload || {};
    // O corpo vai num arquivo: são formulários com centenas de campos, e a
    // linha de comando do Windows não aguenta isso como argumento.
    const forma = Object.entries(dados)
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v == null ? '' : v))
      .join('&');
    const arquivo = path.join(TEMP, 'post-' + Math.random().toString(36).slice(2));
    fs.writeFileSync(arquivo, forma);
    args.push('--data', '@' + arquivo);
    args.push('--header', 'Content-Type: application/x-www-form-urlencoded');
  }

  args.push(url);

  const r = spawnSync('curl', args, { encoding: 'buffer', maxBuffer: 1024 * 1024 * 256 });
  if (r.error) throw new Error('curl indisponível: ' + r.error.message);
  if (r.status !== 0) {
    throw new Error('Falha de rede ao consultar a fonte: ' + String(r.stderr || '').slice(0, 300));
  }

  const brutos = fs.existsSync(cabecalhos) ? fs.readFileSync(cabecalhos, 'latin1') : '';
  const linhas = brutos.split(/\r?\n/);
  const status = linhas.filter(l => /^HTTP\//.test(l)).pop() || 'HTTP/1.1 000';
  const codigo = Number((status.match(/\s(\d{3})\s?/) || [])[1] || 0);

  const mapa = {};
  linhas.forEach(l => {
    const i = l.indexOf(':');
    if (i < 0) return;
    const nome = l.slice(0, i).trim();
    const valor = l.slice(i + 1).trim();
    const chave = nome.toLowerCase() === 'set-cookie' ? 'Set-Cookie' : nome;
    if (chave === 'Set-Cookie') (mapa[chave] = mapa[chave] || []).push(valor);
    else mapa[chave] = valor;
  });

  return { codigo, cabecalhos: mapa, arquivo: corpo, bytes: fs.statSync(corpo).size };
}

/** O objeto que as regras esperam receber de `buscarResposta_`. */
export function resposta(url, opcoes) {
  const r = buscar(url, opcoes);
  if (r.codigo !== 200) throw new Error('A fonte respondeu HTTP ' + r.codigo + '.');
  return {
    getResponseCode: () => r.codigo,
    getAllHeaders: () => r.cabecalhos,
    getContentText: (codificacao) =>
      fs.readFileSync(r.arquivo).toString(/8859|latin/i.test(codificacao || '') ? 'latin1' : 'utf8'),
    getBlob: () => ({ caminho: r.arquivo, tamanho: r.bytes })
  };
}

/* ------------------------------------------------------------------ zip */

/**
 * Leitor de zip mínimo, sem dependências: percorre o diretório central e
 * infla cada entrada. Um .xlsx é exatamente isso — um zip de XMLs.
 */
export function descompactar(buffer) {
  const fim = (() => {
    for (let i = buffer.length - 22; i >= 0 && i > buffer.length - 66000; i--) {
      if (buffer.readUInt32LE(i) === 0x06054b50) return i;
    }
    throw new Error('Arquivo não é um zip válido.');
  })();

  let entradas = buffer.readUInt16LE(fim + 10);
  let pos = buffer.readUInt32LE(fim + 16);
  const arquivos = {};

  for (let n = 0; n < entradas; n++) {
    if (buffer.readUInt32LE(pos) !== 0x02014b50) break;
    const metodo = buffer.readUInt16LE(pos + 10);
    const tamComprimido = buffer.readUInt32LE(pos + 20);
    const tamNome = buffer.readUInt16LE(pos + 28);
    const tamExtra = buffer.readUInt16LE(pos + 30);
    const tamComentario = buffer.readUInt16LE(pos + 32);
    const inicioLocal = buffer.readUInt32LE(pos + 42);
    const nome = buffer.toString('utf8', pos + 46, pos + 46 + tamNome);

    const nomeLocal = buffer.readUInt16LE(inicioLocal + 26);
    const extraLocal = buffer.readUInt16LE(inicioLocal + 28);
    const dados = inicioLocal + 30 + nomeLocal + extraLocal;
    const bruto = buffer.subarray(dados, dados + tamComprimido);

    arquivos[nome] = metodo === 0 ? bruto : inflateRawSync(bruto);
    pos += 46 + tamNome + tamExtra + tamComentario;
  }
  return arquivos;
}

/* ----------------------------------------------------------------- xlsx */

function textosCompartilhados(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m =>
    [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => entidades(x[1])).join(''));
}

function entidades(s) {
  return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
}

/** Lê a primeira aba de um .xlsx e devolve linhas de células como texto. */
export function lerXlsxDeArquivo(caminho) {
  const arquivos = descompactar(fs.readFileSync(caminho));
  const compartilhados = textosCompartilhados(
    arquivos['xl/sharedStrings.xml'] ? arquivos['xl/sharedStrings.xml'].toString('utf8') : '');

  const nomeAba = Object.keys(arquivos).find(n => /^xl\/worksheets\/sheet1\.xml$/.test(n));
  if (!nomeAba) throw new Error('A planilha não tem a primeira aba no lugar esperado.');
  const xml = arquivos[nomeAba].toString('utf8');

  const linhas = [];
  const reLinha = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  const reCelula = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
  let m;
  while ((m = reLinha.exec(xml)) !== null) {
    const celulas = [];
    let c;
    reCelula.lastIndex = 0;
    while ((c = reCelula.exec(m[1])) !== null) {
      const attrs = c[1] || c[3] || '';
      const corpo = c[2] || '';
      const ref = (attrs.match(/r="([A-Z]+)\d+"/) || [])[1] || '';
      let col = 0;
      for (const ch of ref) col = col * 26 + ch.charCodeAt(0) - 64;
      const tipo = (attrs.match(/t="([^"]+)"/) || [])[1] || '';
      let valor = '';
      if (tipo === 'inlineStr') {
        valor = [...corpo.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => entidades(x[1])).join('');
      } else {
        const v = (corpo.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || '';
        valor = tipo === 's' ? (compartilhados[Number(v)] || '') : entidades(v);
      }
      if (col) celulas[col - 1] = valor;
    }
    if (celulas.some(Boolean)) linhas.push(celulas);
  }
  return linhas;
}

/* ------------------------------------------------------------ CSV simples */

/** Equivalente a Utilities.parseCsv: respeita aspas e quebras dentro do campo. */
export function lerCsv(texto) {
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  const s = String(texto).replace(/^﻿/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (aspas) {
      if (ch === '"') {
        if (s[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
      } else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ',') { linha.push(campo); campo = ''; }
    else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

/* ------------------------------------------------------------ armazenamento */

/** No lugar da planilha: um arquivo JSON por tabela, versionado no repositório. */
export function armazenamento(pasta) {
  fs.mkdirSync(pasta, { recursive: true });
  const caminho = nome => path.join(pasta, nome.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json');
  return {
    ler(nome) {
      const arq = caminho(nome);
      if (!fs.existsSync(arq)) return [];
      try { return JSON.parse(fs.readFileSync(arq, 'utf8')); } catch (e) { return []; }
    },
    gravar(nome, dados) {
      fs.writeFileSync(caminho(nome), JSON.stringify(dados, null, 1));
    },
    acrescentar(nome, linhas) {
      const atual = this.ler(nome);
      this.gravar(nome, atual.concat(linhas));
    }
  };
}

export function limparTemporarios() {
  try { fs.rmSync(TEMP, { recursive: true, force: true }); } catch (e) { /* nada a fazer */ }
}
