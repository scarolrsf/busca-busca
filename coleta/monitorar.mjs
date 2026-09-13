/**
 * O agendador do GitHub é de melhor esforço: atrasa e, às vezes, pula a
 * coleta sem deixar rastro — e uma coleta pulada não commita, então ninguém
 * fica sabendo. Foi assim na manhã de 11/09/2026.
 *
 * Este passo faz duas verificações sobre a data de hoje, no horário de
 * Brasília (o mesmo "Coleta de DD/MM/AAAA às HHhMM" que a coleta grava):
 *
 * 1. Existe commit de coleta? Se não houver, a janela pulou — abre uma issue.
 * 2. Alguma fonte falha em janelas seguidas? Uma falha isolada é soluço e se
 *    resolve sozinha na janela seguinte (o resumo da execução já avisa); só
 *    vira issue quando a mesma fonte falha nos dois últimos commits de
 *    coleta, ou seja, persiste há ~12h. Foi assim na manhã de 11/09/2026: a
 *    coleta rodou, mas STJ e STF falharam nas duas execuções.
 *
 * Com issue aberta, o trabalho termina em falha — e chega também o e-mail que
 * o GitHub manda quando um trabalho falha. Quando normaliza, as issues abertas
 * por aqui são fechadas sozinhas na verificação seguinte.
 *
 * Sem GITHUB_TOKEN (rodando à mão, da raiz do repositório), só diz o
 * veredito, sem criar nem fechar issue. DATA_ESPERADA serve para testar a
 * detecção contra outro dia, sem mexer no relógio.
 */
import { spawnSync } from 'node:child_process';

const PREFIXO = '[coleta]';

function dataDeHojeEmSP() {
  if (process.env.DATA_ESPERADA) return process.env.DATA_ESPERADA;
  const partes = new Intl.DateTimeFormat('pt-BR',
    { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
    .formatToParts(new Date());
  const ler = tipo => (partes.find(p => p.type === tipo) || {}).value || '';
  return ler('day') + '/' + ler('month') + '/' + ler('year');
}

function ultimosAssuntos() {
  const r = spawnSync('git', ['log', '--format=%s', '-15'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('Não foi possível ler o histórico do git.');
  return String(r.stdout || '').split('\n').map(l => l.trim()).filter(Boolean);
}

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', timeout: 60000 });
  return { ok: r.status === 0, saida: String(r.stdout || '').trim(), erro: String(r.stderr || '').trim() };
}

function tituloFalta(data) {
  return PREFIXO + ' Sem coleta registrada em ' + data;
}

function tituloFontes(data) {
  return PREFIXO + ' Fontes sem resposta em ' + data;
}

function corpoFalta(data) {
  return [
    'Não há commit "Coleta de ' + data + '" no histórico — a coleta agendada ' +
    '(6h07 e 18h07, horário de Brasília) não registrou a janela esperada.',
    '',
    'Como verificar: Actions → Coleta → conferir se há execução de hoje ' +
    '(atrasos de minutos são normais; horas ou ausência, não).',
    '',
    'Saída imediata: na mesma tela, "Run workflow" dispara a coleta na hora, ' +
    'sem esperar a próxima janela.',
    '',
    'Esta issue fecha sozinha quando um commit de coleta com esta data aparecer.'
  ].join('\n');
}

function corpoFontes(data, nomes) {
  return [
    'As fontes abaixo falham há pelo menos duas janelas seguidas (≈12h) — não ' +
    'é soluço, e o resumo da execução sozinho não alcança quem não abre o Actions:',
    '',
    nomes.map(n => '- ' + n).join('\n'),
    '',
    'Os registros delas seguem sendo os da última consulta bem-sucedida; nada ' +
    'foi apagado. Diagnóstico: conferir o log da última execução em Actions → Coleta.',
    '',
    'Esta issue fecha sozinha quando todas voltarem a responder em duas ' +
    'janelas seguidas.'
  ].join('\n');
}

/** SHAs dos últimos commits de coleta, do mais novo ao mais antigo. */
function commitsDeColeta(n) {
  const r = spawnSync('git', ['log', '--format=%H', '--grep=^Coleta de', '-' + n], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('Não foi possível ler o histórico do git.');
  return String(r.stdout || '').split('\n').map(l => l.trim()).filter(Boolean);
}

/** Nomes das fontes sem "Consulta concluída" num commit de coleta. */
function falhasEm(sha) {
  const r = spawnSync('git', ['show', sha + ':dados/fontes.json'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('Não foi possível ler dados/fontes.json em ' + sha.slice(0, 7) + '.');
  let fontes = [];
  try { fontes = JSON.parse(r.stdout || '[]'); } catch (e) { throw new Error('fontes.json ilegível em ' + sha.slice(0, 7) + '.'); }
  return fontes.filter(f => f[3] !== 'Consulta concluída').map(f => f[0]);
}

function issuesAbertas() {
  const lista = gh(['issue', 'list', '--state', 'open', '--limit', '30', '--json', 'number,title']);
  if (!lista.ok) throw new Error('Não foi possível ler as issues: ' + lista.erro.slice(0, 120));
  try { return JSON.parse(lista.saida || '[]'); }
  catch (e) { return []; }
}

function garantirIssue(abertas, comToken, titulo, corpo) {
  if (abertas.some(i => String(i.title || '').indexOf(titulo) === 0)) {
    console.log('Issue já aberta ("' + titulo + '"); nada duplicado.');
    return false;
  }
  if (!comToken) {
    console.log('Sem GITHUB_TOKEN: aqui nasceria a issue "' + titulo + '".');
    return true;
  }
  const cria = gh(['issue', 'create', '--title', titulo, '--body', corpo]);
  if (!cria.ok) throw new Error('Não foi possível criar a issue: ' + cria.erro.slice(0, 200));
  console.log('Issue criada: ' + cria.saida);
  return true;
}

function fecharIssuesNossas(abertas, comToken) {
  const nossas = abertas.filter(i => String(i.title || '').indexOf(PREFIXO) === 0);
  if (!nossas.length) return;
  if (!comToken) { console.log(nossas.length + ' issue(s) nossa(s) seriam fechadas.'); return; }
  nossas.forEach(i => {
    const f = gh(['issue', 'close', String(i.number), '--comment', 'Situação normalizada; fechando.']);
    console.log(f.ok ? 'Issue #' + i.number + ' fechada.' : 'Aviso: não foi possível fechar #' + i.number + '.');
  });
}

function main() {
  const data = dataDeHojeEmSP();
  const assuntos = ultimosAssuntos();
  const comToken = Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN);

  const semColeta = !assuntos.some(a => a.indexOf('Coleta de ' + data) === 0);
  if (semColeta) console.log('Sem commit "Coleta de ' + data + '" nos últimos ' + assuntos.length + ' commits.');
  else console.log('Coleta de ' + data + ' registrada.');

  let persistentes = [];
  const shas = commitsDeColeta(2);
  if (shas.length === 2) {
    const a = falhasEm(shas[0]);
    const b = falhasEm(shas[1]);
    persistentes = a.filter(n => b.indexOf(n) >= 0);
    console.log('Falhas na última janela: ' + (a.join('; ') || 'nenhuma') + '.');
    console.log('Persistentes há duas janelas: ' + (persistentes.join('; ') || 'nenhuma') + '.');
  } else {
    console.log('Menos de dois commits de coleta no histórico; verificação de fontes pulada.');
  }

  if (!semColeta && !persistentes.length) {
    console.log('Tudo em dia.');
    if (!comToken) return 0;
    fecharIssuesNossas(issuesAbertas(), comToken);
    return 0;
  }

  let abertas = [];
  if (comToken) abertas = issuesAbertas();
  if (semColeta) garantirIssue(abertas, comToken, tituloFalta(data), corpoFalta(data));
  if (persistentes.length) garantirIssue(abertas, comToken, tituloFontes(data), corpoFontes(data, persistentes));
  return 1;
}

if (process.argv[1] && process.argv[1].endsWith('monitorar.mjs')) {
  try {
    process.exit(main());
  } catch (e) {
    console.error(e && e.message ? e.message : e);
    process.exit(1);
  }
}
