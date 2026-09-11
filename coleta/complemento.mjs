/**
 * A coleta feita daqui, da máquina da Sarah.
 *
 * O STF nega o endereço de saída do GitHub Actions, e o espelho não o alcança
 * (526, certificado). Daqui ele responde: foi medido em 11/09/2026, e a coleta
 * local do mesmo dia trouxe as seis fontes verdes, com 1.482 temas de
 * repercussão geral e 1.012 informativos do STF. Então a segunda via do STF não
 * é um truque de rede — é rodar a mesma coleta de um lugar que o tribunal
 * aceita.
 *
 * Este arquivo é só a embalagem disso: atualiza o repositório, chama a coleta
 * de sempre (`executar.mjs`, as seis fontes, as mesmas regras), e envia o que
 * mudou. Nada de novo acontece aqui; o que ele adiciona é não precisar lembrar
 * de quatro comandos na ordem certa.
 *
 * O commit começa com "Coleta de DD/MM/AAAA", igual ao da coleta agendada, de
 * propósito: é assim que o vigia reconhece que a base foi atualizada no dia. A
 * origem fica dita no fim da mensagem, para quem ler o histórico.
 *
 * Uso: dois cliques em `coletar-aqui.cmd`, na raiz do projeto.
 *      Ou, no terminal: node coleta/complemento.mjs
 *      Para conferir sem enviar nada: node coleta/complemento.mjs --sem-enviar
 */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEM_ENVIAR = process.argv.includes('--sem-enviar');

/** Um comando, na pasta do projeto, com a saída aparecendo na hora. */
function rodar(programa, args, { mostrar = true } = {}) {
  const r = spawnSync(programa, args, {
    cwd: RAIZ, encoding: 'utf8',
    stdio: mostrar ? 'inherit' : 'pipe',
    maxBuffer: 1024 * 1024 * 64
  });
  if (r.error) throw new Error('Não consegui executar "' + programa + '": ' + r.error.message);
  return { ok: r.status === 0, saida: String(r.stdout || '').trim(), erro: String(r.stderr || '').trim() };
}

function git(args, opcoes) { return rodar('git', args, opcoes || { mostrar: false }); }

function agoraEmSP() {
  const p = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date());
  const ler = t => (p.find(x => x.type === t) || {}).value || '';
  return ler('day') + '/' + ler('month') + '/' + ler('year') + ' às ' + ler('hour') + 'h' + ler('minute');
}

/* Um aviso que diz o que fazer, não só o que houve. Quem roda isto com dois
   cliques não vai ler a saída do git para descobrir o que significa. */
function parar(mensagem, comoResolver) {
  console.error('\n  ' + mensagem);
  if (comoResolver) console.error('  ' + comoResolver);
  process.exit(1);
}

console.log('\nColeta na máquina da Sarah — ' + agoraEmSP() + '\n');

if (!git(['rev-parse', '--git-dir']).ok) {
  parar('Esta pasta não é o repositório do projeto.',
    'Confira se o arquivo está dentro da pasta buscador-de-suspensao.');
}

/* Primeiro alinhar com o GitHub: a coleta agendada pode ter commitado desde a
   última vez, e coletar por cima disso criaria histórias paralelas. */
console.log('1. Buscando o que mudou no GitHub...');
if (!git(['fetch', 'origin']).ok) {
  parar('Não consegui falar com o GitHub.', 'Verifique a conexão com a internet e tente de novo.');
}
const atras = git(['rev-list', '--count', 'HEAD..origin/main']).saida;
const afrente = git(['rev-list', '--count', 'origin/main..HEAD']).saida;
if (atras !== '0') {
  if (afrente !== '0') {
    parar('Há trabalho aqui e no GitHub que não se encaixam sozinhos (' +
      afrente + ' commit(s) aqui, ' + atras + ' lá).',
      'Isso precisa de conferência à mão. Peça ajuda antes de seguir.');
  }
  if (!git(['merge', '--ff-only', 'origin/main']).ok) {
    parar('Não consegui atualizar a pasta com o que está no GitHub.',
      'Há alterações locais no caminho. Peça ajuda antes de seguir.');
  }
  console.log('   Trouxe ' + atras + ' novidade(s) do GitHub.');
} else {
  console.log('   Já estava em dia.');
}

console.log('\n2. Consultando os seis tribunais. Isso leva alguns minutos.\n');
if (!rodar(process.execPath, ['--max-old-space-size=4096', path.join('coleta', 'executar.mjs')]).ok) {
  parar('A coleta não terminou.',
    'As mensagens acima dizem o que houve. A base anterior continua intacta.');
}

console.log('\n3. Vendo o que mudou na base...');
if (!git(['add', 'dados']).ok) parar('Não consegui preparar os arquivos para envio.');

if (git(['diff', '--staged', '--quiet']).ok) {
  console.log('   Nada mudou nas fontes desde a última coleta. Nada a enviar.\n');
  process.exit(0);
}
console.log(git(['diff', '--staged', '--stat']).saida.split('\n').map(l => '   ' + l).join('\n'));

if (SEM_ENVIAR) {
  console.log('\n   (--sem-enviar) Parando aqui. Para desfazer o preparo: git reset\n');
  process.exit(0);
}

console.log('\n4. Enviando...');
const mensagem = 'Coleta de ' + agoraEmSP() + ' (máquina da Sarah)';
if (!git(['commit', '-m', mensagem]).ok) parar('Não consegui gravar o commit.');

if (!git(['push', 'origin', 'main']).ok) {
  /* Empurrão recusado costuma ser a coleta agendada tendo commitado no meio do
     caminho. Rebase põe o nosso por cima e tenta uma vez; não insiste além
     disso, porque aí já não é corriqueiro. */
  console.log('   O GitHub recusou; alguém commitou no meio do caminho. Reencaixando...');
  if (!git(['pull', '--rebase', 'origin', 'main']).ok || !git(['push', 'origin', 'main']).ok) {
    parar('O envio não passou.',
      'A coleta está gravada aqui, sem risco de perda. Peça ajuda para enviar.');
  }
}

console.log('\n   Pronto: ' + mensagem);
console.log('   O site se republica sozinho em um ou dois minutos.\n');
