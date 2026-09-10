/**
 * Prova que o remendo da cadeia de certificados funciona.
 *
 * Existe porque a primeira tentativa de consertar isso foi dada como conferida
 * sem ter sido. O teste de então apontava a variável CURL_CA_BUNDLE para um
 * arquivo vazio, supondo que isso reproduzisse o runner do Linux. Não
 * reproduz: o curl do Windows usa o Schannel, que **ignora** essa variável — as
 * requisições passavam porque o Windows validava normalmente, e um defeito real
 * no código foi para produção sem dar sinal, custando um ciclo de doze horas
 * para aparecer.
 *
 * Aqui o caminho é exercitado de verdade, em duas etapas verificáveis em
 * qualquer sistema:
 *
 *   1. Buscar o intermediário que o certificado do servidor indica, e conferir
 *      que o que voltou é mesmo um certificado.
 *   2. Pedir a página usando **só** esse intermediário como âncora (--cacert,
 *      que o Schannel respeita, ao contrário da variável de ambiente). Se a
 *      conexão for aceita, o elo obtido é o que faltava — que é precisamente o
 *      que o runner precisa fazer sozinho.
 *
 * Também confere que a âncora não é aceita por um host de cadeia completa, o
 * que garante que o sucesso da etapa 2 veio do elo certo, e não de o --cacert
 * estar sendo ignorado.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { ancoraDaCadeia, ANCORA_DIAGNOSTICO, limparTemporarios } from './ambiente.mjs';

const NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const INCOMPLETOS = ['portal.stf.jus.br', 'www.stf.jus.br'];
const COMPLETO = 'www.tjmg.jus.br';

function pedir(url, ancora) {
  const args = ['--silent', '--show-error', '--max-time', '90', '--location',
    '--user-agent', NAVEGADOR, '--output', process.platform === 'win32' ? 'NUL' : '/dev/null',
    '--write-out', '%{http_code}'];
  if (ancora) args.push('--cacert', ancora);
  args.push(url);
  const r = spawnSync('curl', args, { encoding: 'utf8' });
  return { saida: r.status, codigo: Number(String(r.stdout || '').trim()) || 0 };
}

let falhas = 0;
const dizer = (ok, texto) => { if (!ok) falhas++; console.log((ok ? '  ok   ' : '  FALHA ') + texto); };

console.log('Remendo da cadeia de certificados\n');

for (const host of INCOMPLETOS) {
  const pem = ancoraDaCadeia(host);
  if (!pem) {
    dizer(false, host + ': nenhum intermediário obtido — ' +
      (ANCORA_DIAGNOSTICO[host] || 'sem diagnóstico'));
    continue;
  }

  const texto = fs.readFileSync(pem, 'latin1');
  dizer(/-----BEGIN CERTIFICATE-----/.test(texto) && /-----END CERTIFICATE-----/.test(texto),
    host + ': o intermediário veio e está em PEM (' + texto.length + ' bytes)');

  const com = pedir('https://' + host + '/', pem);
  dizer(com.codigo === 200,
    host + ': aceita a conexão usando só esse elo como âncora (HTTP ' + com.codigo + ')');
}

/* Se o --cacert estivesse sendo ignorado, isto também passaria — e o resultado
   acima não valeria nada. */
const ancoraAlheia = ancoraDaCadeia(INCOMPLETOS[0]);
if (ancoraAlheia) {
  const alheio = pedir('https://' + COMPLETO + '/', ancoraAlheia);
  dizer(alheio.saida === 60,
    COMPLETO + ': recusa a âncora do STF, como deve (saída ' + alheio.saida + ') — ' +
    'prova que o --cacert está mesmo sendo aplicado');
}

limparTemporarios();
console.log('\n' + (falhas ? falhas + ' verificação(ões) falharam.' : 'Todas as verificações passaram.'));
process.exit(falhas ? 1 : 0);
