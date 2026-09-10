/**
 * Monta site/dados.json a partir da base versionada em dados/.
 *
 * Fica separado da coleta de propósito: é este o passo que a Cloudflare executa
 * ao publicar. Assim o repositório guarda uma coisa só — a base — e o arquivo
 * que o site lê é derivado dela, sem duplicar 8 MB a cada consulta às fontes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { armazenamento } from './ambiente.mjs';
import { conferirRegraDeSuspensao } from './conferir-regra.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function publicar() {
  const base = armazenamento(path.join(RAIZ, 'dados'));
  const historico = base.ler('ALTERACOES');

  const semAnotacaoPrivada = r => {
    const copia = Object.assign({}, r);
    delete copia.anotacaoManual;   // a conferência interna não vai ao ar
    return copia;
  };

  const dados = {
    temas: base.ler('TEMAS DO PORTAL').map(semAnotacaoPrivada),
    informativos: base.ler('INFORMATIVOS DO PORTAL').map(semAnotacaoPrivada),
    fontes: base.ler('FONTES'),
    alteracoes: historico.slice(-1200).reverse(),
    totalAlteracoes: historico.length,
    geradoEm: new Date().toISOString(),
    agenda: 'Consulta automática duas vezes por dia, às 6h e às 18h (horário de Brasília).'
  };

  if (!dados.temas.length) throw new Error('A base está vazia; nada foi publicado.');

  const regra = conferirRegraDeSuspensao(dados, path.join(RAIZ, 'site', 'index.html'));

  fs.mkdirSync(path.join(RAIZ, 'site'), { recursive: true });
  fs.writeFileSync(path.join(RAIZ, 'site', 'dados.json'), JSON.stringify(dados));
  return { dados, regra };
}

if (process.argv[1] && process.argv[1].endsWith('publicar.mjs')) {
  const { dados, regra } = publicar();
  console.log(JSON.stringify({
    temas: dados.temas.length,
    informativos: dados.informativos.length,
    alteracoes: dados.totalAlteracoes,
    suspensaoEmVigor: regra.porAlcance
  }));
}
