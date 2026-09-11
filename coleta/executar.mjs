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
/* Importado, e não recopiado: o endereço da busca tem regra própria — é
   `queryString`, não `termo=` — e duas cópias divergem no primeiro ajuste. */
import { montarUrlBusca } from './jurisprudencia-stf.mjs';

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

/* O registro da prova fica no próprio arquivo dela, e não em FONTES.
   FONTES é o painel das seis fontes oficiais do portal: uma sétima linha, que
   só é atualizada em execução à mão, apareceria ao leitor como fonte do portal
   com data velha, e o vigia da coleta a leria como fonte falhando há duas
   janelas — abrindo issue todo dia por causa de uma prova opcional. */
const TEMA_DA_PROVA = 'fornecimento de medicamentos';

function provarJurisprudenciaStf_() {
  const nome = 'STF — jurisprudência (navegador)';
  const tentativa = new Date().toISOString();
  const prova = path.join(RAIZ, 'dados', 'jurisprudencia-stf.json');
  const anotar = (registro) =>
    fs.writeFileSync(prova, JSON.stringify(Object.assign({ fonte: nome, tentativa }, registro), null, 1));
  try {
    const r = spawnSync(process.execPath,
      [path.join(RAIZ, 'coleta', 'jurisprudencia-stf.mjs'),
        '--tema', TEMA_DA_PROVA, '--headless', '--limite', '3',
        '--json-out', prova],
      { encoding: 'utf8', timeout: 300000 });
    if (r.status !== 0) throw new Error('A prova de vida saiu com erro: ' + String(r.stderr || r.stdout || '').slice(0, 300));
    const resultado = JSON.parse(fs.readFileSync(prova, 'utf8'));
    if (resultado.bloqueadoWaf) throw new Error('WAF bloqueou o navegador; prova adiada para uso manual.');
    anotar(Object.assign({
      situacao: 'Prova concluída',
      url: montarUrlBusca(resultado.termo || TEMA_DA_PROVA)
    }, resultado));
    console.log(nome + ': ' + resultado.itens.length + ' ficha(s) de ' +
      (resultado.total == null ? 'total não lido' : resultado.total + ' resultado(s)') + '.');
  } catch (e) {
    /* Sem BASE nem FONTES aqui: uma falha na prova não pode mudar o que o
       portal mostra, nem acionar o vigia. Fica escrita no arquivo da prova. */
    anotar({
      situacao: 'Prova falhou',
      detalhe: String(e.message || e).slice(0, 1400),
      url: montarUrlBusca(TEMA_DA_PROVA),
      itens: []
    });
    console.error(nome + ': ' + e.message);
  }
}

/* Segunda via do STF, desligada por padrão (ver coleta/jurisprudencia-stf.mjs).
   Exige navegador de verdade, que o runner agendado não tem — por isso só roda
   quando JURISPRUDENCIA_STF=1, numa execução à mão. É prova de vida da via com
   uma busca limitada, não coleta de conteúdo para o portal: o resultado bruto e
   a situação da tentativa ficam em dados/jurisprudencia-stf.json.
   Uma falha aqui nunca derruba a coleta: anota-se e segue.

   A chamada vem depois das declarações de propósito: `const` não sobe como
   `function`, e chamar antes deixaria o módulo com uma constante inacessível —
   o erro cairia dentro do catch, que usaria a mesma constante e derrubaria a
   coleta inteira, justamente o que este trecho promete nunca fazer. */
if (process.env.JURISPRUDENCIA_STF === '1') {
  provarJurisprudenciaStf_();
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
