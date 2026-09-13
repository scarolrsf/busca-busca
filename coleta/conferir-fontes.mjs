/**
 * O que a coleta conseguiu, dito onde alguém veja.
 *
 * A coleta não para quando um tribunal não responde: os registros daquela fonte
 * continuam sendo os da última consulta bem-sucedida, e a falha é anotada. Isso
 * é o comportamento certo — apagar dado bom porque a fonte caiu seria pior —,
 * mas tem um efeito colateral: o trabalho no GitHub Actions termina em verde
 * mesmo com metade dos tribunais fora, e ninguém fica sabendo.
 *
 * Este passo transforma a anotação em aviso visível no resumo da execução.
 * Perder todas as seis fontes de uma vez derruba o trabalho de propósito: seis
 * tribunais não saem do ar juntos, então isso é problema daqui — rede, Node,
 * uma regra quebrada — e merece o e-mail que o GitHub manda quando falha.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONCLUIDA = 'Consulta concluída';

/** Mensagens de erro vêm com quebras de linha; numa célula de tabela, viram lixo. */
function numaLinha(texto, limite) {
  return String(texto == null ? '' : texto)
    .replace(/\s+/g, ' ').replace(/\|/g, '/').trim().slice(0, limite || 200);
}

export function conferirFontes(fontes) {
  const ruins = fontes.filter(f => f[3] !== CONCLUIDA);
  const resumo = ['## Coleta', '', '| Fonte | Situação | Observação |', '| --- | --- | --- |']
    .concat(fontes.map(f => '| ' + numaLinha(f[0], 60) + ' | ' + numaLinha(f[3], 40) +
      ' | ' + numaLinha(f[5], 200) + ' |'))
    .concat(['', ruins.length
      ? '**' + ruins.length + ' de ' + fontes.length + ' fontes não responderam.** ' +
        'Os registros delas continuam sendo os da última consulta bem-sucedida.'
      : 'Todas as fontes responderam.'])
    .join('\n');
  return { ruins, resumo, totalFalhou: fontes.length > 0 && ruins.length === fontes.length };
}

if (process.argv[1] && process.argv[1].endsWith('conferir-fontes.mjs')) {
  const fontes = JSON.parse(fs.readFileSync(path.join(RAIZ, 'dados', 'fontes.json'), 'utf8'));
  const { ruins, resumo, totalFalhou } = conferirFontes(fontes);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumo + '\n');
  } else {
    console.log(resumo);
  }

  ruins.forEach(f => console.log('::warning title=' + numaLinha(f[0], 60) + '::' + numaLinha(f[5], 200)));

  if (totalFalhou) {
    console.log('::error::Nenhuma das ' + fontes.length + ' fontes respondeu. ' +
      'Seis tribunais não saem do ar juntos: o problema é da coleta.');
    process.exit(1);
  }
}
