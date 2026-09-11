/**
 * Executa a coleta e grava o que o site lê.
 *
 * Roda duas vezes por dia pelo GitHub Actions. As regras de leitura de cada
 * fonte estão em regras.js, exatamente como foram homologadas contra os seis
 * tribunais; aqui elas apenas recebem um ambiente que sabe falar com a rede e
 * guardar o resultado em arquivos.
 *
 * Nada é apagado quando uma fonte falha: o registro anterior é preservado e a
 * falha fica anotada, para que o portal nunca apresente dado velho como
 * recém-conferido.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resposta, lerXlsxDeArquivo, lerCsv, armazenamento, limparTemporarios } from './ambiente.mjs';
import { publicar } from './publicar.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = armazenamento(path.join(RAIZ, 'dados'));

const TABELAS = {
  temas: 'TEMAS DO PORTAL',
  informativos: 'INFORMATIVOS DO PORTAL',
  alteracoes: 'ALTERACOES',
  fontes: 'FONTES',
  conferencia: 'CONFERENCIA'
};

/* --------------------------------------------------- ambiente das regras */

const contexto = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(RAIZ, 'coleta', 'regras.js'), 'utf8'), contexto);

contexto.buscarResposta_ = (url, opcoes) => resposta(url, opcoes);
contexto.buscarTexto_ = (url, codificacao) => resposta(url).getContentText(codificacao || 'UTF-8');
contexto.csvObjetos_ = (texto) => {
  const linhas = lerCsv(texto);
  const cabecalho = linhas.shift();
  return linhas.filter(l => l.some(Boolean))
    .map(l => Object.fromEntries(cabecalho.map((k, i) => [k, l[i] || ''])));
};
contexto.lerXlsx_ = (blob) => lerXlsxDeArquivo(blob.caminho);
contexto.lerXlsxRemoto_ = (url) => lerXlsxDeArquivo(resposta(url, { segundos: 300 }).getBlob().caminho);

/* Pausa entre uma tentativa e outra. Síncrona, como todo o resto da coleta. */
contexto.esperar_ = (ms) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

contexto.lerRegistros_ = (tabela) => BASE.ler(tabela);
contexto.gravarRegistros_ = (tabela, registros) => BASE.gravar(tabela, registros);
contexto.registrarAlteracoes_ = (linhas) => BASE.acrescentar(TABELAS.alteracoes, linhas);

/* Uma linha por origem: [origem, instante da última leitura bem-sucedida].
   Gravada em ordem fixa, para que a coleta não produza diferença só por ter
   visitado as fontes em outra ordem. */
contexto.lerConferencia_ = () => {
  const linhas = BASE.ler(TABELAS.conferencia);
  return Object.fromEntries((Array.isArray(linhas) ? linhas : []).map(l => [l[0], l[1]]));
};
contexto.gravarConferencia_ = (mapa) => BASE.gravar(TABELAS.conferencia,
  Object.entries(mapa).sort((a, b) => (a[0] < b[0] ? -1 : 1)));

contexto.registrarFonte_ = (nome, tentativa, sucesso, situacao, quantidade, detalhe, url) => {
  const atuais = BASE.ler(TABELAS.fontes);
  const anterior = atuais.find(f => f[0] === nome);
  const linha = [nome, tentativa, sucesso || (anterior && anterior[2]) || '', situacao,
    String(quantidade), detalhe, url];
  if (anterior) atuais[atuais.indexOf(anterior)] = linha; else atuais.push(linha);
  BASE.gravar(TABELAS.fontes, atuais);
};

/** O lote de teses do STF, uma requisição por vez — são páginas de 1,5 KB. */
contexto.buscarLote_ = (urls) => urls.map(url => {
  try {
    const r = resposta(url);
    return { getResponseCode: () => 200, getContentText: (c) => r.getContentText(c) };
  } catch (e) {
    return { getResponseCode: () => 0, getContentText: () => '' };
  }
});

/* ------------------------------------------------------------- execução */

const COLETORES = ['coletarSTJ_', 'coletarIUJ_', 'coletarTJMG_',
  'coletarInformativosSTJ_', 'coletarSTF_', 'coletarInformativosSTF_'];

for (const nome of COLETORES) {
  const inicio = Date.now();
  contexto[nome]();
  console.log('   (' + ((Date.now() - inicio) / 1000).toFixed(0) + 's)');
}

/* Segunda via do STF, desligada por padrão (ver coleta/jurisprudencia-stf.mjs).
   Exige navegador de verdade, que o runner agendado não tem — por isso só roda
   quando JURISPRUDENCIA_STF=1, numa execução à mão. É prova de vida da via com
   uma busca limitada, não coleta de conteúdo para o portal: o resultado bruto
   vai para dados/jurisprudencia-stf.json e a tentativa é anotada em FONTES.
   Uma falha aqui nunca derruba a coleta: anota-se e segue. */
if (process.env.JURISPRUDENCIA_STF === '1') {
  provarJurisprudenciaStf_();
}

function provarJurisprudenciaStf_() {
  const nome = 'STF — jurisprudência (navegador)';
  const tentativa = new Date().toISOString();
  const prova = path.join(RAIZ, 'dados', 'jurisprudencia-stf.json');
  try {
    const r = spawnSync(process.execPath,
      [path.join(RAIZ, 'coleta', 'jurisprudencia-stf.mjs'),
        '--tema', 'fornecimento de medicamentos', '--headless', '--limite', '3',
        '--json-out', prova],
      { encoding: 'utf8', timeout: 300000 });
    if (r.status !== 0) throw new Error('A prova de vida saiu com erro: ' + String(r.stderr || r.stdout || '').slice(0, 300));
    const resultado = JSON.parse(fs.readFileSync(prova, 'utf8'));
    if (resultado.bloqueadoWaf) throw new Error('WAF bloqueou o navegador; prova adiada para uso manual.');
    const atuais = BASE.ler(TABELAS.fontes);
    const linha = [nome, tentativa, tentativa, 'Consulta concluída',
      String(resultado.itens.length),
      'Prova de vida da segunda via: "' + resultado.termo + '" com ' + resultado.total +
      ' resultado(s), ' + resultado.itens.length + ' ficha(s) guardada(s) em jurisprudencia-stf.json.',
      montarUrlBuscaStf_(resultado.termo)];
    const anterior = atuais.find(f => f[0] === nome);
    if (anterior) atuais[atuais.indexOf(anterior)] = linha; else atuais.push(linha);
    BASE.gravar(TABELAS.fontes, atuais);
    const conferencia = Object.fromEntries(BASE.ler(TABELAS.conferencia).map(l => [l[0], l[1]]));
    conferencia[nome] = tentativa;
    BASE.gravar(TABELAS.conferencia,
      Object.entries(conferencia).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
    console.log(nome + ': ' + resultado.itens.length + ' ficha(s) de ' + resultado.total + ' resultado(s).');
  } catch (e) {
    const atuais = BASE.ler(TABELAS.fontes);
    const anterior = atuais.find(f => f[0] === nome);
    const linha = [nome, tentativa, (anterior && anterior[2]) || '', 'Falha / cobertura pendente',
      '0', String(e.message || e).slice(0, 1400), BUSCA_JURISPRUDENCIA_STF_];
    if (anterior) atuais[atuais.indexOf(anterior)] = linha; else atuais.push(linha);
    BASE.gravar(TABELAS.fontes, atuais);
    console.error(nome + ': ' + e.message);
  }
}

const BUSCA_JURISPRUDENCIA_STF_ = 'https://jurisprudencia.stf.jus.br/pages/search';
function montarUrlBuscaStf_(termo) {
  return BUSCA_JURISPRUDENCIA_STF_ + '?base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true' +
    '&plural=true&radicais=false&buscaExata=true&page=1&pageSize=10' +
    '&queryString=' + encodeURIComponent(termo) + '&sort=_score&sortBy=desc';
}

/* ------------------------------------------------ o que o site vai ler */

const { dados, regra } = publicar();
limparTemporarios();

const falhas = dados.fontes.filter(f => f[3] !== 'Consulta concluída').map(f => f[0]);
console.log(JSON.stringify({
  temas: dados.temas.length,
  informativos: dados.informativos.length,
  alteracoes: dados.totalAlteracoes,
  suspensaoEmVigor: regra.porAlcance,
  fontesComFalha: falhas
}));
