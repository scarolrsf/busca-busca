/**
 * Espelho de leitura para as fontes do STJ.
 *
 * O STJ nega o endereço de saída do GitHub Actions — ora com desafio
 * anti-robô, ora com 403 seco. Medido em 11/09/2026, o mesmo pedido feito da
 * rede da Cloudflare passa. Este Worker existe só para isso: a coleta tenta
 * primeiro pelo GitHub, e só quando leva 403 refaz o pedido por aqui.
 *
 * O STF não está na lista, e não é esquecimento: pela Cloudflare ele devolve
 * 526 (certificado inválido), porque omite o intermediário da cadeia. O
 * `coleta/ambiente.mjs` remenda isso buscando o elo que falta, e um Worker não
 * tem como fazer o mesmo — `fetch` aqui não aceita âncora própria.
 *
 * Não é um proxy aberto, e não pode virar um: só GET, só os dois endereços do
 * STJ, e só com a chave combinada. Sem isso, qualquer pessoa que descobrisse o
 * endereço teria um encaminhador anônimo de graça, na conta da Sarah.
 */
const HOSTS = ['processo.stj.jus.br', 'dadosabertos.web.stj.jus.br'];
const NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function recusa(motivo) {
  return new Response(motivo + '\n', { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

export default {
  async fetch(pedido, env) {
    if (pedido.method !== 'GET') return recusa('Só GET.');

    // Comparação de tamanho constante não vale a pena aqui: a chave não é
    // segredo de usuário, e o Worker não distingue "errada" de "ausente".
    if (!env.CHAVE || pedido.headers.get('x-espelho-chave') !== env.CHAVE) {
      return recusa('Chave ausente ou inválida.');
    }

    const pedida = new URL(pedido.url).searchParams.get('url');
    if (!pedida) return recusa('Faltou o parâmetro url.');

    let alvo;
    try { alvo = new URL(pedida); } catch (e) { return recusa('Endereço inválido.'); }
    if (alvo.protocol !== 'https:') return recusa('Só https.');
    if (!HOSTS.includes(alvo.hostname)) return recusa('Endereço fora da lista: ' + alvo.hostname);

    let resposta;
    try {
      resposta = await fetch(alvo.toString(), {
        headers: { 'user-agent': NAVEGADOR, 'accept-language': 'pt-BR,pt;q=0.9' },
        redirect: 'follow'
      });
    } catch (e) {
      return new Response('Falha ao consultar a fonte: ' + e.message + '\n',
        { status: 502, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }

    // O corpo passa como veio: o informativo do STJ é ISO-8859-1, e quem decide
    // a codificação é quem lê, do outro lado. Reescrever aqui estragaria o texto.
    const cabecalhos = new Headers();
    const tipo = resposta.headers.get('content-type');
    if (tipo) cabecalhos.set('content-type', tipo);
    cabecalhos.set('x-espelho', 'stj');
    return new Response(resposta.body, { status: resposta.status, headers: cabecalhos });
  }
};
