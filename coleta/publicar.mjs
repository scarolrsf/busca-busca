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

  /* A data de conferência não fica em cada registro — seriam milhares de cópias
     do mesmo instante, reescritas a cada coleta. Ela é devolvida aqui, na
     montagem do arquivo que o site lê, para que a ficha continue mostrando
     quando aquele registro foi conferido pela última vez. */
  const conferencia = Object.fromEntries(base.ler('CONFERENCIA').map(l => [l[0], l[1]]));

  const paraOSite = r => {
    const copia = Object.assign({}, r);
    delete copia.anotacaoManual;   // a conferência interna não vai ao ar
    const data = r.verificadoEm || conferencia[r.origem] || '';
    if (data) copia.verificadoEm = data; else delete copia.verificadoEm;
    /* `verificadoEm` no registro só existe quando ele parou de aparecer na
       fonte: `atualizarRegistros_` congela ali a data da última vez em que a
       fonte o trouxe. Ficha com data velha, sozinha, não explica nada — quem
       lê não sabe se a fonte inteira está parada ou se este registro saiu da
       lista. O sinal vai explícito, e derivado: some quando a fonte voltar a
       trazê-lo. */
    if (r.verificadoEm && conferencia[r.origem] && r.verificadoEm !== conferencia[r.origem]) {
      copia.foraDaFonte = r.verificadoEm;
    }
    return copia;
  };

  /* Duplicidade por erro de digitação na fonte.
   *
   * O TJMG publicou "2007816-54.2026.8.13.000" — três zeros onde o padrão CNJ
   * pede quatro — para um processo que já constava com o número completo. Como
   * identidade de processo não se adivinha, o coletor não juntou os dois: criou
   * outro registro e anotou "identificador incompleto". Certo como regra, ruim
   * como resultado: duas fichas do mesmo incidente, com situações diferentes.
   *
   * Aqui os dois se reconhecem pelo núcleo do número — as sete posições, o
   * dígito e o ano, no padrão CNJ; ou o número do TJMG sem o sufixo do
   * instrumento — e cada um passa a apontar o outro. Ninguém é fundido nem
   * escondido: quem lê vê os dois números e decide. Medido em 11/09/2026 sobre
   * a base inteira: um único grupo, nenhum falso positivo. */
  const nucleoDoNumero = numero => {
    const s = String(numero || '').replace(/\s+/g, '');
    const cnj = s.match(/(\d{7}-\d{2}\.\d{4})/);
    if (cnj) return 'cnj:' + cnj[1];
    const tjmg = s.match(/(\d\.\d{4}\.\d{2}\.\d{6}-\d)/);
    if (tjmg) return 'tjmg:' + tjmg[1];
    return '';
  };

  const marcarDuplicidade = registros => {
    const porNucleo = {};
    registros.forEach(r => {
      const k = nucleoDoNumero(r.numero);
      if (k) (porNucleo[k] = porNucleo[k] || []).push(r);
    });
    Object.values(porNucleo).forEach(grupo => {
      if (grupo.length < 2) return;
      grupo.forEach(r => {
        r.duplicidade = grupo.filter(o => o.id !== r.id).map(o => o.numero);
      });
    });
    return registros;
  };

  const dados = {
    temas: marcarDuplicidade(base.ler('TEMAS DO PORTAL').map(paraOSite)),
    informativos: base.ler('INFORMATIVOS DO PORTAL').map(paraOSite),
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
