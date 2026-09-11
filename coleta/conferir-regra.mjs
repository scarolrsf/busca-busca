/**
 * Confere a regra de suspensão contra a base inteira.
 *
 * A regra vive num lugar só — as funções de classificação do Index.html — e é
 * aplicada a todo precedente e a todo incidente no momento de exibir. Este
 * arquivo carrega essas mesmas funções fora do navegador e as roda sobre os
 * dados recém-coletados, de modo que uma atualização que quebre a regra faça o
 * build falhar em vez de chegar à tela.
 *
 * Fundamento do que se confere:
 *   art. 1.040, III, do CPC  — repetitivo e repercussão geral: a suspensão
 *                              cessa com a publicação do acórdão paradigma;
 *   art. 982, § 5º, do CPC   — IRDR e correlatos: cessa se não houver recurso
 *                              especial ou extraordinário contra o acórdão;
 *   art. 987, § 1º, do CPC   — havendo esse recurso, ele tem efeito suspensivo.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

export function conferirRegraDeSuspensao(dados, caminhoDoPortal) {
  const html = fs.readFileSync(caminhoDoPortal || 'site/index.html', 'utf8');
  const codigo = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  const modulo = { exports: {} };
  vm.runInNewContext(codigo, { module: modulo, exports: modulo.exports, console });
  const R = modulo.exports;
  assert.ok(R.encerrado && R.prepararRegistro, 'O Index.html deixou de expor a regra de suspensão.');

  const registros = dados.temas.concat(dados.informativos)
    .map(r => R.prepararRegistro(Object.assign({}, r)));

  const falhas = [];
  const conta = { emVigor: 0, encerrados: 0, porAlcance: {} };

  for (const r of registros) {
    const encerrado = R.encerrado(r);
    if (encerrado) conta.encerrados++; else conta.emVigor++;

    // 1. Precedente encerrado nunca pode aparecer como risco de nulidade.
    if (encerrado && R.risco(r) !== 'BAIXO') {
      falhas.push(r.id + ': encerrado, mas classificado como risco ' + R.risco(r));
    }

    // 2. Situações que encerram por si, qualquer que seja o rito.
    const definitivas = ['Trânsito em julgado', 'Cancelado', 'Repercussão geral negada', 'Prejudicado / baixado'];
    if (definitivas.indexOf(r._situacao) >= 0 && !encerrado) {
      falhas.push(r.id + ': situação "' + r._situacao + '" deveria encerrar a suspensão');
    }

    // 3. Repetitivo e repercussão geral: publicado o acórdão, cessa.
    const paradigma = r.tipo === 'Repetitivo' || r.tipo === 'Repercussão geral';
    const clausulaExpressa = /at[ée] o tr[âa]nsito em julgado/i.test(String(r.suspensao || ''));
    if (paradigma && r._situacao === 'Acórdão publicado' && !clausulaExpressa && !encerrado) {
      falhas.push(r.id + ': acórdão paradigma publicado, deveria ter cessado (art. 1.040, III)');
    }

    // 4. Incidente com recurso pendente contra o acórdão: a suspensão persiste.
    const incidente = ['IRDR', 'IAC', 'GR', 'IUJ'].indexOf(r.tipo) >= 0;
    const temPendencia = R.pendencias(r) !== 'Nenhuma registrada';
    if (incidente && r._situacao === 'Acórdão publicado' && temPendencia && encerrado) {
      falhas.push(r.id + ': há recurso pendente contra o acórdão, não deveria ter cessado (art. 987, § 1º)');
    }

    // 5. Todo aviso precisa dizer uma razão, e não a genérica de outro caso.
    const aviso = R.avisoDe(r);
    if (!aviso || !aviso.t || !aviso.c) falhas.push(r.id + ': aviso sem texto');

    /* 6. "A partir de quando suspender" é resposta que a ficha dá em destaque:
       precisa existir, e com as duas partes — o rótulo curto e a explicação.
       Uma categoria nova sem texto chegaria à tela como caixa vazia. */
    if (R.MOMENTO) {
      const momento = R.MOMENTO[r._momento];
      if (!momento || !momento.r || !momento.c) {
        falhas.push(r.id + ': momento da suspensão sem rótulo ou sem explicação (' + r._momento + ')');
      }
      // Fase declarada só se sustenta se houver texto de suspensão para declará-la.
      if (r._momento !== 'NAO_DITO' && !String(r.suspensao || '').trim()) {
        falhas.push(r.id + ': momento "' + r._momento + '" sem texto de suspensão que o ampare');
      }
    }

    if (!encerrado) {
      conta.porAlcance[r._alcance] = (conta.porAlcance[r._alcance] || 0) + 1;
    }
  }

  assert.equal(falhas.length, 0, 'Regra de suspensão violada:\n  ' + falhas.slice(0, 20).join('\n  '));
  return conta;
}
