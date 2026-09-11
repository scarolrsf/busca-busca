/* Busca Busca — precedentes, incidentes e informativos dos Juizados. Piloto sem serviços pagos. */
// A função de administração exige a conta proprietária, inclusive em chamadas web.
const PILOTO = {
  planilha: '1I-fBiHAjorq2Jl__TmeoMmW6Sq8eIjgxRcdS2G85GOM',
  fuso: 'America/Sao_Paulo',
  temas: 'TEMAS DO PORTAL', infos: 'INFORMATIVOS DO PORTAL',
  historico: 'ALTERACOES', fontes: 'FONTES',
  stjTemas: 'https://dadosabertos.web.stj.jus.br/dataset/4238da2f-c07b-4c1a-b345-4402accacdcf/resource/df29da13-7d6b-41ba-ad96-cd1a5bbd191c/download/temas.csv',
  stjProcessos: 'https://dadosabertos.web.stj.jus.br/dataset/4238da2f-c07b-4c1a-b345-4402accacdcf/resource/7ed21202-0049-4fcb-aa7c-48d810d3c499/download/processos.csv',
  iuj: 'https://drive.google.com/uc?export=download&id=1EHZr90JLna4opkMYSo3_sNsLVFNszwiR',
  iujPagina: 'https://www.tjmg.jus.br/portal-tjmg/institucional/juizados-especiais/turma-recursal/',
  rupe: 'https://rupe.tjmg.jus.br/rupe/justica/publico/bnpr/consultarIrdrIacAdmitidos.rupe',
  stf: 'https://portal.stf.jus.br/jurisprudenciaRepercussao/todostemas.asp',
  stfTese: 'https://portal.stf.jus.br/jurisprudenciaRepercussao/verTeseTema.asp?numTema=',
  // Lista completa dos temas de RG, que traz a marca de suspensão nacional.
  stfLista: 'https://portal.stf.jus.br/jurisprudenciaRepercussao/listarProcesso.asp?situacaoRG=TODAS&situacaoAtual=S&txtTituloTema=&numeroTemaInicial=&dataInicialJulgPV=&dataFinalJulgPV=&classeProcesso=&numeroProcesso=&ministro=&txtRamoDireito=&ordenacao=asc',
  stfTesesPorExecucao: 200,
  stfInfoDados: 'https://www.stf.jus.br/arquivo/cms/informativoSTF/anexo/Informativo_Dados/Dados_InformativosSTF.xlsx',
  // Edição mínima importada da planilha oficial (1080 = janeiro de 2023).
  stfInfoEdicaoMinima: 1080,
  stjConsulta: 'https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp',
  stjInfo: 'https://processo.stj.jus.br/jurisprudencia/externo/informativo/',
  stfInfo: 'https://portal.stf.jus.br/textos/verTexto.asp?servico=informativoSTF'
};
const CAMPOS = ['id','tribunal','tipo','numero','questao','area','situacao','suspensao','julgamento','publicacao','transito','tese','fonte','verificadoEm','origem','pertinencia','observacoes','processos','atualizadoEm','anotacaoManual'];
const ROTULOS = ['ID','Tribunal','Tipo','Número / processo','Questão','Área','Situação na fonte','Registro sobre suspensão','Julgamento','Publicação','Trânsito em julgado','Tese / destaque','Fonte oficial','Consulta bem-sucedida','Origem','Pertinência','Observações da fonte','Processos e datas','Alteração detectada','Anotação da conferência mensal'];
const HF = ['Fonte','Última tentativa','Último sucesso','Resultado','Registros lidos','Detalhe','URL'];
const HH = ['Detectado em','ID','Identificação','Campo','Valor anterior','Valor novo','Fonte','Natureza'];

// Apenas os dois métodos de leitura são públicos no aplicativo web.
function coletarSTJ_(){executarFonte_('STJ — temas e processos',PILOTO.stjTemas,()=>{
  const temas=csvObjetos_(buscarTexto_(PILOTO.stjTemas));const processos=csvObjetos_(buscarTexto_(PILOTO.stjProcessos));
  if(temas.length<100||!temas[0].sequencialPrecedente||!('situacao' in temas[0])||processos.length<100)throw Error('Estrutura ou volume do conjunto STJ inesperado; base anterior preservada.');
  const groups={};processos.forEach(p=>(groups[p.sequencialPrecedente]||(groups[p.sequencialPrecedente]=[])).push(p));
  const records=consolidarSTJ_(temas.filter(t=>t.tipoPrecedente==='Tema'||t.tipoPrecedente==='IAC')).map(t=>{
    const ps=groups[t.sequencialPrecedente]||[];
    return {id:'STJ-'+(t.tipoPrecedente==='Tema'?'TEMA':'IAC')+'-'+t.numeroPrecedente,tribunal:'STJ',tipo:t.tipoPrecedente==='Tema'?'Repetitivo':'IAC',numero:t.numeroPrecedente,questao:t.questaoSubmetidaAJulgamento,area:classificarArea_(t.Assuntos+' '+t.questaoSubmetidaAJulgamento,t.orgaoJulgador),situacao:t.situacao,suspensao:t.informacoesComplementares,julgamento:t.dataJulgamento,publicacao:t.dataPublicacaoAcordao,tese:t.teseFirmada,fonte:paginaTemaSTJ_(t.tipoPrecedente,t.numeroPrecedente),origem:'STJ — dados abertos',pertinencia:'Possível pertinência — classificação automática ampla',observacoes:[t.anotacoesNUGEPNAC,t.delimitacaoJulgado,t.descricaoRepercussaoGeral,'A data do trânsito não é fornecida neste arquivo. As informações complementares podem conter determinações históricas de suspensão.'].filter(Boolean).join('\n\n'),processos:ps.map(p=>[p.Processo,'Julgamento: '+(p.dataJulgamento||'não informado'),'Publicação: '+(p.dataPbulicacaoAcordao||'não informada'),'ED: '+(p['dataPublicacaoEmbargosDeDeclaração']||'não informados')].join(' | ')).join('\n')};
  });
  return atualizarRegistros_(PILOTO.temas,records,'STJ — dados abertos');
});}
function coletarIUJ_(){executarFonte_('TJMG — IUJ',PILOTO.iujPagina,()=>{
  const r=buscarResposta_(PILOTO.iuj);const rows=lerXlsx_(r.getBlob());
  if(rows.length<5||!/SITUA/i.test(rows[0][1]||'')||!/QUEST/i.test(rows[0][4]||'')||!/TR.NSITO/i.test(rows[0][10]||''))throw Error('Cabeçalho do acompanhamento IUJ mudou. Nenhuma alteração aplicada.');
  const records=rows.slice(1).filter(r=>r[0]&&r[4]).map(r=>{
    const parsed=numeroProcesso_(r[0]);const number=parsed||String(r[0]).trim();if(!parsed)r[11]='Identificador incompleto na fonte oficial: '+number+'. Conferir antes de citar. '+(r[11]||'');
    return {id:'TJMG-IUJ-'+number,tribunal:'TJMG',tipo:'IUJ',numero:number,questao:r[4],area:classificarArea_(r[4]),situacao:r[1],suspensao:[r[5],r[6]].filter(x=>x&&!/^[-. ]+$/.test(x)).join('\n\n'),julgamento:dataExcel_(r[7]),publicacao:dataExcel_(r[8]),transito:dataExcel_(r[10]),tese:r[9],fonte:PILOTO.iujPagina,origem:'TJMG — acompanhamento IUJ',pertinencia:'IUJ da Turma de Uniformização',observacoes:[r[11],r[12],r[3]?'Relatoria: '+r[3]:''].filter(Boolean).join('\n'),processos:r[0]};
  });return atualizarRegistros_(PILOTO.temas,consolidarIUJ_(records),'TJMG — acompanhamento IUJ');
});}
function coletarInformativosSTJ_(){executarFonte_('STJ — informativos',PILOTO.stjInfo,()=>{
  const html=buscarTexto_(PILOTO.stjInfo,'ISO-8859-1');const records=parseInformativoSTJ_(html,PILOTO.stjInfo);
  if(!records.length)throw Error('Não foi possível reconhecer os julgados do informativo STJ.');
  return atualizarRegistros_(PILOTO.infos,records,'STJ — informativos');
});}
function coletarTJMG_(){executarFonte_('TJMG — IRDR, IAC e GR',PILOTO.rupe,()=>{
  const records=buscarRupe_();if(!records.length)throw Error('Consulta RUPE sem registros reconhecidos.');
  return atualizarRegistros_(PILOTO.temas,records,'TJMG — RUPE');
});}
function coletarSTF_(){executarFonte_('STF — repercussão geral',PILOTO.stf,()=>{
  return coletarTemasSTF_();
});}
function coletarInformativosSTF_(){executarFonte_('STF — informativos',PILOTO.stfInfo,()=>{
  return coletarInfosSTF_();
});}
/* Uma fonte não cai só por erro de rede. O portal do STF, quando está
   sobrecarregado, responde 200 e devolve em meio segundo uma página de erro de
   54 KB, sem a tabela — para o curl é sucesso, e só o leitor percebe que não
   veio o que foi pedido. Como isso pode acontecer em qualquer uma das seis, a
   repetição fica aqui, em volta da operação inteira: buscar, reconhecer e
   comparar. Só a última falha é registrada; se alguma tentativa der certo, a
   fonte conta como consultada, porque foi.

   Repetir, porém, só faz sentido quando o que falhou pode dar certo da segunda
   vez. Um 403 ou um 404 é resposta: o servidor disse o que tinha a dizer, e
   insistir não muda a resposta — só repete a batida, o que em portal com
   firewall ajuda a prolongar o bloqueio. Foi o que se viu em 11/09/2026, com
   STF e STJ negando o endereço do GitHub Actions: três tentativas por fonte,
   três fontes, duas execuções seguidas, e o STJ, que respondia, passou a negar
   também. Então a repetição aqui vale para o que é passageiro — erro de rede,
   tempo esgotado, 429, 5xx e a página errada que chega com 200, que nem código
   de erro traz. */
const TENTATIVAS_POR_FONTE=3;
/* Sem código, o erro não veio do servidor: é rede, leitura ou reconhecimento —
   e esses podem dar certo na tentativa seguinte. Com código, repete-se apenas o
   que o próprio servidor apresenta como transitório. */
function vaiAdiantarRepetirFonte_(e){
  const codigo=e&&e.codigoHttp;
  if(!codigo)return true;
  if(codigo===408||codigo===429)return true;
  return codigo>=500&&codigo<600;
}
function executarFonte_(name,url,fn){
  let ultimo=null,feitas=0;
  for(let t=1;t<=TENTATIVAS_POR_FONTE;t++){
    const time=new Date().toISOString();
    feitas=t;
    try{
      const count=fn();
      registrarFonte_(name,time,time,'Consulta concluída',count,'Dados reconhecidos e comparados com a base. A consulta não certifica a completude da fonte.',url);
      console.log(name+': '+count+' registros processados.'+(t>1?' (na '+t+'ª tentativa)':''));
      return;
    }catch(e){
      ultimo=e;
      if(!vaiAdiantarRepetirFonte_(e)){console.error(name+': '+e.message+' — resposta do servidor, não soluço; sem repetir.');break;}
      if(t<TENTATIVAS_POR_FONTE){console.error(name+': '+e.message+' — repetindo.');esperar_(t*5000);}
    }
  }
  const fim=new Date().toISOString();
  registrarFonte_(name,fim,'','Falha / cobertura pendente',0,'Em '+feitas+(feitas===1?' tentativa: ':' tentativas: ')+String(ultimo&&ultimo.message||ultimo).slice(0,1400),url);
  console.error(name+': '+(ultimo&&ultimo.message));
}
function atualizarRegistros_(sheetName,incoming,origin){
  const current=lerRegistros_(sheetName);const index={};current.forEach((r,i)=>index[r.id]=i);
  const seen=new Set();const changes=[];const now=new Date().toISOString();
  for(const fresh of incoming){
    if(!fresh.id||!fresh.questao||seen.has(fresh.id))throw Error('Identidade ausente ou duplicada na fonte: '+fresh.id);seen.add(fresh.id);
    for(const k of CAMPOS)if(String(fresh[k]||'').length>45000)throw Error('Campo muito extenso; exige adaptação antes de gravar: '+fresh.id+' '+k);
  }
  /* A data de conferência é a mesma para todos os registros de uma fonte: é o
     instante em que a fonte foi lida. Guardá-la em cada registro fazia cada
     coleta reescrever milhares de linhas idênticas. Ela mora agora na tabela
     CONFERENCIA, uma linha por origem. O campo só reaparece no registro como
     exceção: quando ele some da fonte e a data dele para de acompanhar. */
  const conferencia=lerConferencia_();
  const anteriorDaOrigem=conferencia[origin]||'';
  const efetiva=r=>r.verificadoEm||conferencia[r.origem]||'';
  const comparable=CAMPOS.filter(k=>!['verificadoEm','atualizadoEm','anotacaoManual','pertinencia','origem'].includes(k));
  for(const fresh of incoming){
    const pos=index[fresh.id],old=pos===undefined?null:current[pos];
    let changed=false;const next={...(old||{}),...fresh};delete next.verificadoEm;
    if(old){
      next.anotacaoManual=old.anotacaoManual||'';
      if(old.pertinencia==='Selecionado na planilha inicial')next.pertinencia=old.pertinencia;
      for(const k of comparable){if(!(k in fresh))continue;const a=String(old[k]||''),b=String(fresh[k]||'');if(a!==b){changed=true;changes.push([now,fresh.id,rotuloTema_(next),ROTULOS[CAMPOS.indexOf(k)],a,b,fresh.fonte,efetiva(old)?'Atualização na fonte':'Primeira conferência']);}}
    }else{changed=true;changes.push([now,fresh.id,rotuloTema_(next),'Cadastro','',fresh.questao,fresh.fonte,'Inclusão na base']);}
    if(changed)next.atualizadoEm=now;
    if(pos===undefined){index[fresh.id]=current.length;current.push(next);}else current[pos]=next;
  }
  // Não removemos registros que desapareçam de uma fonte. Eles continuam com a
  // data anterior — e é só por isso que o campo existe no registro: para que a
  // data de quem sumiu pare, em vez de acompanhar a fonte que já não o traz.
  for(const r of current){
    if(r.origem!==origin||seen.has(r.id)||r.verificadoEm||!anteriorDaOrigem)continue;
    r.verificadoEm=anteriorDaOrigem;
  }
  conferencia[origin]=now;gravarConferencia_(conferencia);
  gravarRegistros_(sheetName,current);
  if(changes.length)registrarAlteracoes_(changes);
  return incoming.length;
}
function importarTema_(r,i){const s=r[0].trim();let court=/STJ/.test(s)?'STJ':/STF/.test(s)?'STF':'TJMG';let type=/Grupo/i.test(s)?'GR':/IUJ/i.test(s)?'IUJ':/IAC/i.test(s)?'IAC':/IRDR/i.test(s)?'IRDR':court==='STJ'?'Repetitivo':'Repercussão geral';let number=type==='IUJ'?numeroProcesso_(s):(s.match(/(?:Tema|IRDR|IAC|Representativos)\s*(\d+)/i)||[])[1];if(!number)number=String(i+1);const key=type==='Repetitivo'||type==='Repercussão geral'?'TEMA':type;return {id:court+'-'+key+'-'+number,tribunal:court,tipo:type,numero:number,questao:r[1],area:r[2],situacao:r[3],observacoes:r[4],origem:'Planilha inicial',pertinencia:'Selecionado na planilha inicial'};}
function rotuloTema_(r){return r.tipo==='IUJ'?'IUJ '+r.numero:r.tipo==='Informativo'?r.numero:(['Repetitivo','Repercussão geral'].includes(r.tipo)?'Tema':r.tipo)+' '+r.numero+' · '+r.tribunal;}
/* O arquivo de dados abertos do STJ é um CSV: abrir esse endereço baixa o arquivo
   em vez de mostrar o tema. A consulta pública tem uma página por tema, que é o
   que interessa a quem clica em "Fonte oficial". */
function paginaTemaSTJ_(tipo,numero){
 const n=String(numero||'').replace(/D/g,'');
 if(!n)return PILOTO.stjConsulta;
 return PILOTO.stjConsulta+'?novaConsulta=true&tipo_pesquisa='+(tipo==='IAC'?'I':'T')+
  '&cod_tema_inicial='+n+'&cod_tema_final='+n;
}
function classificarArea_(text,orgao){const t=normalizar_(text);if(/previdenci|aposentadoria|auxilio.acidente/.test(t))return 'Fazenda Pública';if(orgao==='S3'||orgao==='CE'&&/penal|criminal/.test(t)||/direito penal|processual penal|contravenc|execucao penal/.test(t))return 'Criminal';if(orgao==='S1'||/servidor|fazenda publica|tributari|administrativ|concurso publico|previdenci|municipio/.test(t))return 'Fazenda Pública';if(orgao==='S2'||/consumidor|bancari|direito civil|indeniza|contrat|condominio/.test(t))return 'Cível';return 'Transversal / a conferir';}
function normalizar_(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function numeroProcesso_(s){const m=String(s).replace(/\s+/g,'').match(/\d\.\d{4}\.\d{2}\.\d{6}-\d\/\d{3}|\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);return m?m[0]:'';}
function dataExcel_(v){if(!v||/^[-. ]+$/.test(String(v)))return '';if(/^\d{5}(\.0+)?$/.test(v))return new Date(Date.UTC(1899,11,30)+Number(v)*86400000).toISOString().slice(0,10);return String(v);}

function htmlTexto_(s){return entidades_(String(s||'').replace(/\r\n?/g,'\n').replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<(?:br\b[^>]*|\/p|\/div|\/tr|\/h[1-6])>/gi,'\n').replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g,' ')).replace(/[ \t\u00a0]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{2,}/g,'\n').trim();}
function consolidarSTJ_(rows){
 const byId=new Map();for(const r of rows){const key=r.tipoPrecedente+'-'+r.numeroPrecedente;const old=byId.get(key);if(!old){byId.set(key,{...r});continue;}
  for(const k of Object.keys(r)){if(['numeroRepercussaoGeralSTF','descricaoRepercussaoGeral'].includes(k)){old[k]=[...new Set([old[k],r[k]].filter(Boolean))].join('\n');}else if(String(old[k]||'')!==String(r[k]||''))throw Error('Linhas conflitantes no arquivo STJ: '+key+' / '+k);}
 }return [...byId.values()];
}
function consolidarIUJ_(rows){
 const groups=new Map();for(const r of rows){if(!groups.has(r.id))groups.set(r.id,[]);groups.get(r.id).push(r);}
 return [...groups.values()].map(group=>{if(group.length===1)return group[0];const out={...group[0]};for(const k of ['questao','situacao','suspensao','julgamento','publicacao','transito','tese','observacoes']){const vals=[...new Set(group.map(r=>String(r[k]||'').trim()).filter(Boolean))];out[k]=vals.length>1?vals.map((v,i)=>'Registro da fonte '+(i+1)+':\n'+v).join('\n\n'):(vals[0]||'');}out.observacoes='A fonte contém '+group.length+' linhas para este IUJ. Os textos distintos foram preservados e exigem conferência.\n\n'+out.observacoes;return out;});
}
function entidades_(s){const e={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ordm:'º',ordf:'ª',ndash:'–',mdash:'—',ccedil:'ç',Ccedil:'Ç',aacute:'á',Aacute:'Á',eacute:'é',Eacute:'É',iacute:'í',Iacute:'Í',oacute:'ó',Oacute:'Ó',uacute:'ú',Uacute:'Ú',atilde:'ã',Atilde:'Ã',otilde:'õ',Otilde:'Õ',acirc:'â',Acirc:'Â',ecirc:'ê',Ecirc:'Ê',ocirc:'ô',Ocirc:'Ô',agrave:'à',Agrave:'À',uuml:'ü',hellip:'…'};return s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi,(m,k)=>k[0]==='#'?String.fromCodePoint(k[1].toLowerCase()==='x'?parseInt(k.slice(2),16):parseInt(k.slice(1),10)):(e[k]||m));}
function atributos_(s){const a={};for(const m of s.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))a[m[1]]=entidades_(m[2]===undefined?m[3]:m[2]);return a;}
function dataPt_(s){const m=String(s||'').match(/(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/i);if(m)return m[3]+'-'+String(['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'].indexOf(m[2].toLowerCase())+1).padStart(2,'0')+'-'+m[1].padStart(2,'0');return '';}
function parseInformativoSTJ_(html,url){
 const title=html.match(/<span[^>]*class="clsInformativoTitulo"[^>]*>([\s\S]*?)<\/span>/i);if(!title)throw Error('Edição STJ não identificada.');
 const titulo=htmlTexto_(title[1]),edition=titulo.match(/n[ºo.]?\s*(\d+)/i);if(!edition)throw Error('Número da edição STJ não identificado.');
 const blocks=[...html.matchAll(/<div id="urlNota(\d+)"[^>]*>([\s\S]*?)<\/div>/gi)];const records=[];
 blocks.forEach((m,i)=>{const block=html.slice(m.index,i+1<blocks.length?blocks[i+1].index:html.length);const note=htmlTexto_(m[2]);const cnot=(note.match(/CNOT=(\d+)/)||[])[1];if(!cnot)return;
 const plain=htmlTexto_(block),d=plain.indexOf('\nDestaque\n'),end=plain.indexOf('\nInformações do Inteiro Teor',d);if(d<0||end<0)throw Error('Destaque STJ incompleto: '+cnot);
 const label=(name,next)=>{const a=plain.indexOf('\n'+name+'\n');if(a<0)return '';let b=plain.length;next.forEach(n=>{const p=plain.indexOf('\n'+n+'\n',a+name.length+2);if(p>=0)b=Math.min(b,p);});return plain.slice(a+name.length+2,b).trim();};
 const ramo=label('Ramo do Direito',['Tema','Destaque']);const tema=label('Tema',['Destaque']);const processo=label('Processo',['Ramo do Direito','Tema','Destaque']);
 const tese=plain.slice(d+'\nDestaque\n'.length,end).trim();if(!tese||!tema)throw Error('Campos obrigatórios ausentes no STJ: '+cnot);
 records.push({id:'STJ-INFO-'+cnot,tribunal:'STJ',tipo:'Informativo',numero:'Informativo STJ '+edition[1],questao:tema,area:classificarArea_(ramo),situacao:'Destaque publicado',publicacao:dataPt_(titulo),tese,fonte:'https://processo.stj.jus.br'+note,origem:'STJ — informativos',pertinencia:'Possível pertinência — classificação automática ampla',observacoes:ramo,processos:processo});});
 return records;
}
function parametrosFormulario_(html,id){const start=html.indexOf('<form id="'+id+'"');if(start<0)throw Error('Formulário de consulta não localizado.');const form=html.slice(start,html.indexOf('</form>',start)+7);const params={};
 for(const m of form.matchAll(/<input\b[^>]*>/gi)){const a=atributos_(m[0]);if(a.name&&a.type!=='button')params[a.name]=a.value||'';}
 for(const m of form.matchAll(/<select\b[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)){const opts=[...m[2].matchAll(/<option\b[^>]*>/gi)].map(x=>atributos_(x[0]));const selected=[...m[2].matchAll(/<option\b[^>]*selected[^>]*>/gi)][0];params[m[1]]=selected?atributos_(selected[0]).value:opts[0]?.value||'';}
 return {params,action:atributos_(form.slice(0,form.indexOf('>')+1)).action};}
function buscarRupe_(){
 const first=buscarResposta_(PILOTO.rupe);const initial=first.getContentText('ISO-8859-1');const cookies=first.getAllHeaders()['Set-Cookie'];let cookie=(Array.isArray(cookies)?cookies:[cookies||'']).map(s=>s.split(';')[0]).join('; ');
 const form=parametrosFormulario_(initial,'formFiltrosfiltrosTemasParadigmas');const payload={...form.params,AJAXREQUEST:'_viewRoot','formFiltrosfiltrosTemasParadigmas:pesquisar':'formFiltrosfiltrosTemasParadigmas:pesquisar'};
 const action='https://rupe.tjmg.jus.br'+form.action;let html=buscarResposta_(action,{method:'post',payload,headers:{Cookie:cookie}}).getContentText('UTF-8');
 const countMatch=htmlTexto_(html).match(/(\d+) resultados,\s*página\s*1\s*de\s*(\d+)/i);if(!countMatch)throw Error('Total/paginação RUPE não reconhecido.');const total=Number(countMatch[1]),pages=Number(countMatch[2]);if(pages>100)throw Error('RUPE excedeu o limite de segurança do piloto.');
 let all=parseRupe_(html);let view=(html.match(/name="javax.faces.ViewState"[^>]*value="([^"]+)"/)||[])[1]||form.params['javax.faces.ViewState'];
 const pager='formVisualizacaoTemasParadigmas:dataTabletabelaTemas:sc1tabelaTemas';
 for(let page=2;page<=pages;page++){
  const p={'formVisualizacaoTemasParadigmas':'formVisualizacaoTemasParadigmas','javax.faces.ViewState':view,AJAXREQUEST:'_viewRoot',ajaxSingle:pager};p[pager]=String(page);
  html=buscarResposta_(action,{method:'post',payload:p,headers:{Cookie:cookie}}).getContentText('UTF-8');view=(html.match(/name="javax.faces.ViewState"[^>]*value="([^"]+)"/)||[])[1]||view;all=all.concat(parseRupe_(html));
 }
 const unique=[...new Map(all.map(r=>[r.id,r])).values()];if(unique.length!==total)throw Error('Paginação incompleta no RUPE: '+unique.length+' de '+total+'. Nenhum registro atualizado.');return unique;
}
function parseRupe_(html){
 const records=[];let cur=null,ph=[],ps=[];
 function finish(){if(!cur)return;cur.processos=ps.map(p=>Object.entries(p).map(([k,v])=>k+': '+v).join(' | ')).join('\n');for(const [field,label] of [['julgamento','Julgado em'],['publicacao','Acórdão Publicado em'],['transito','Trânsito em Julgado']]){const vals=ps.filter(p=>p[label]).map(p=>(ps.length>1?Object.values(p)[0]+': ':'')+p[label]);cur[field]=vals.join('\n');}records.push(cur);}
 for(const m of html.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)){
  const cells=[...m[2].matchAll(/<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/gi)];const texts=cells.map(c=>htmlTexto_(c[2]));
  if(cells.length>=6&&/class="rich-table-cell"/.test(cells[1]?.[1]||'')&&/dataTabletabelaTemas:\d+:/.test(cells[1]?.[1]||'')){
   finish();ps=[];ph=[];const type=/IRDR/.test(texts[1])?'IRDR':/IAC/.test(texts[1])?'IAC':/Grupo/.test(texts[1])?'GR':'';if(!type)throw Error('Tipo RUPE desconhecido: '+texts[1]);const num=texts[5];if(!/^\d+$/.test(num))throw Error('Número TJMG não reconhecido.');
   cur={id:'TJMG-'+type+'-'+num,tribunal:'TJMG',tipo:type,numero:num,questao:texts[4],situacao:texts[3],fonte:PILOTO.rupe,origem:'TJMG — RUPE',pertinencia:'Possível pertinência — classificação automática ampla',area:'Transversal / a conferir',observacoes:''};
  }else if(cur&&cells.some(c=>/:tabelaTemas:\d+:/.test(c[1]))&&texts.length>=3){
   const label=normalizar_(texts[1]),value=texts[2];if(label==='tese firmada')cur.tese=value;else if(label==='ramo do direito')cur.area=classificarArea_(value);else if(label.includes('anotacoes'))cur.suspensao=value;else cur.observacoes+=(cur.observacoes?'\n':'')+texts[1]+': '+value;
  }else if(cur&&/rich-subtable-header/.test(m[1])&&texts.some(x=>/Trânsito em Julgado/.test(x))){ph=texts;}
  else if(cur&&ph.length&&cells.some(c=>/:tabelaParadigmas:/.test(c[1]))&&texts.length===ph.length){const p={};ph.forEach((h,i)=>{if(h)p[h]=texts[i];});if(Object.values(p).some(v=>numeroProcesso_(v)))ps.push(p);}
 }
 finish();return records;
}
/* ===========================================================================
   STF — repercussão geral

   A página "Todos os temas" devolve o cadastro inteiro numa única tabela
   (~1.480 linhas). Cada linha traz, além do que aparece na tela, a descrição
   integral da controvérsia e a lista de assuntos nos atributos title dos dois
   tooltips da célula do título — é de lá que sai a questão e a classificação
   de área.

   A tese não vem nessa tabela: cada tema tem uma página própria e curta
   (verTeseTema.asp). Buscar 1.300 delas por dia estouraria a cota, então cada
   execução completa apenas as teses que ainda faltam na base, em lote limitado.
   Em poucos dias a coluna fica completa e, depois disso, só os temas novos
   geram requisição.
   =========================================================================== */

/** A exportação do STF troca aspas, travessões e quebras perdidas por "¿". */
function limpaSTF_(s){return String(s==null?'':s).replace(/¿+/g,' ').replace(/[ 	]{2,}/g,' ').replace(/ +([,.;:)])/g,'$1').trim();}
function situacaoSTF_(texto){
 const s=String(texto||'').replace(/\s+/g,' ').trim();
 const data=(s.match(/\d{2}\/\d{2}\/\d{4}/)||[''])[0];
 const merito=(s.match(/^(N[ãa]o h[áa] repercuss[ãa]o geral[^\d]*|H[áa] repercuss[ãa]o geral[^\d]*)/i)||['',''])[1].trim();
 let resto=s;
 if(merito)resto=resto.slice(merito.length);
 if(data)resto=resto.replace(data,'');
 resto=resto.replace(/\s+/g,' ').trim();
 return {merito:merito,data:data,processual:resto};
}
function parseTemasSTF_(html){
 const inicio=html.indexOf('<table');if(inicio<0)throw Error('Tabela "Todos os temas" não localizada na página do STF.');
 const tabela=html.slice(inicio,html.indexOf('</table>',inicio));
 const registros=[];
 for(const linha of tabela.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const celulas=[...linha[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>c[1]);
  if(celulas.length<6)continue;
  const t=celulas.map(htmlTexto_);
  if(!/^\d+$/.test(t[0]))continue;                       // cabeçalho e linhas de apoio
  const numero=String(Number(t[0]));
  const titulo=t[1].replace(/\n?Ver Descrição\s*/g,'').replace(/\n?Ver Assuntos\s*/g,'').trim();
  const dicas=[...celulas[1].matchAll(/title="([^"]*)"/gi)].map(m=>htmlTexto_(m[1]));
  const descricao=dicas[0]||'';const assuntos=dicas[1]||'';
  const href=(celulas[1].match(/href="(verAndamentoProcesso\.asp[^"]+)"/i)||[])[1]||'';
  const situacao=situacaoSTF_(t[4]);
  const leading=t[2].split('\n')[0].trim();
  registros.push({
   id:'STF-TEMA-'+numero,tribunal:'STF',tipo:'Repercussão geral',numero:numero,
   // Alguns temas recém-afetados entram na tabela sem título e sem descrição.
   questao:limpaSTF_(descricao)||limpaSTF_(titulo)||('Tema '+numero+' — o STF ainda não publicou a descrição da controvérsia.'),
   area:classificarArea_(assuntos+' '+titulo+' '+descricao),
   situacao:[situacao.processual,situacao.merito].filter(Boolean).join(' — ')||'Sem situação informada',
   suspensao:'',
   julgamento:'',publicacao:'',transito:'',
   tese:'',
   fonte:href?'https://portal.stf.jus.br/jurisprudenciaRepercussao/'+entidades_(href):PILOTO.stf,
   origem:'STF — repercussão geral',
   pertinencia:'Possível pertinência — classificação automática ampla',
   observacoes:['Título: '+limpaSTF_(titulo),'Relator: '+(t[3].split('\n')[0].trim()||'não informado'),
    situacao.data?'Data registrada na situação: '+situacao.data:'',
    t[5].trim()?'Data da tese: '+t[5].trim():'',
    assuntos?'Assuntos: '+assuntos:'',
    'O portal do STF não publica o alcance da suspensão em formato legível por programa; quando houver suspensão nacional, confira no painel de Suspensão Nacional.'
   ].filter(Boolean).join('\n'),
   processos:leading
  });
 }
 return registros;
}
/** Preenche as teses que ainda faltam, respeitando o limite por execução. */
function completarTesesSTF_(registros){
 const base={};
 try{
  lerRegistros_(PILOTO.temas).forEach(r=>{
   if(r.tribunal==='STF'&&r.tipo==='Repercussão geral'&&r.tese)base[String(r.numero)]=r.tese;
  });
 }catch(e){/* primeira execução: a aba ainda pode não existir */}
 const faltantes=[];
 registros.forEach(r=>{
  const guardada=base[r.numero];
  if(guardada){r.tese=guardada;return;}
  if(/Data da tese: /.test(r.observacoes))faltantes.push(r);
 });
 const lote=faltantes.slice(0,PILOTO.stfTesesPorExecucao);
 if(lote.length){
  const respostas=buscarLote_(lote.map(r=>PILOTO.stfTese+r.numero));
  respostas.forEach((resposta,i)=>{
   if(resposta.getResponseCode()!==200)return;
   const tese=parseTeseSTF_(resposta.getContentText('ISO-8859-1'));
   if(tese)lote[i].tese=tese;
  });
 }
 if(faltantes.length>lote.length){
  console.log('STF: faltam '+(faltantes.length-lote.length)+' teses; serão buscadas nas próximas execuções.');
 }
 return registros;
}
function parseTeseSTF_(html){
 const celulas=[...html.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>htmlTexto_(m[1]));
 // A página tem três colunas: Tema | Leading Case | Tese, com uma linha de dados.
 return celulas.length>=6?limpaSTF_(celulas[5]):'';
}
/**
 * Quais temas têm determinação de suspensão nacional.
 *
 * O portal do STF só mostra isso num painel interativo e na ficha de cada
 * leading case — 2,6 MB por tema, inviável de varrer todo dia. Mas a lista de
 * resultados da pesquisa de repercussão geral traz a mesma marca ao lado da
 * situação de cada tema, e devolve o cadastro inteiro numa requisição só.
 *
 * A marca indica que houve determinação de suspensão nacional, não que ela
 * continue em vigor: temas já transitados aparecem marcados. Quem resolve isso
 * é o estágio do julgamento, exibido ao lado no portal.
 */
function suspensaoNacionalSTF_(){
 const html=buscarTexto_(PILOTO.stfLista);
 // 7 MB de HTML: fatiar por linha sai bem mais barato que uma regex global.
 const linhas=html.split(/<tr\b/i);
 const marcados={};let total=0;
 for(let i=0;i<linhas.length;i++){
  const m=linhas[i].match(/numeroTema=(\d+)/);
  if(!m)continue;
  total++;
  if(/Suspens[ãa]o Nacional/i.test(linhas[i]))marcados[String(Number(m[1]))]=true;
 }
 if(total<1000)throw Error('A lista de temas do STF veio com apenas '+total+' linhas; a marcação de suspensão não foi aplicada.');
 return marcados;
}
const TEXTO_SUSPENSAO_STF='O STF assinala determinação de suspensão nacional para este tema, na lista de temas de repercussão geral (art. 1.035, § 5º, do CPC). A marca não informa a data nem as exceções: confira o andamento do leading case antes de aplicar a um processo.';

function coletarTemasSTF_(){
 const html=buscarTexto_(PILOTO.stf);
 const registros=parseTemasSTF_(html);
 if(registros.length<1000)throw Error('A tabela de temas do STF veio com apenas '+registros.length+' linhas; a base anterior foi preservada.');
 const suspensos=suspensaoNacionalSTF_();
 registros.forEach(r=>{if(suspensos[r.numero])r.suspensao=TEXTO_SUSPENSAO_STF;});
 return atualizarRegistros_(PILOTO.temas,completarTesesSTF_(registros),'STF — repercussão geral');
}

/* ===========================================================================
   STF — informativos

   O STF publica os dados do Informativo numa planilha oficial (~9 MB), e não
   em página por edição — o antigo endereço em HTML por edição saiu do ar. O
   arquivo é lido e descompactado pela coleta, que devolve as linhas já em
   texto — sem depender de serviço externo.
   =========================================================================== */

function dataSTF_(valor){
 const v=String(valor==null?'':valor).trim();
 if(/^\d{2}\/\d{2}\/\d{4}$/.test(v))return v;
 if(/^\d{5}(\.\d+)?$/.test(v)){
  const d=new Date(Date.UTC(1899,11,30)+Math.floor(Number(v))*86400000);
  return ('0'+d.getUTCDate()).slice(-2)+'/'+('0'+(d.getUTCMonth()+1)).slice(-2)+'/'+d.getUTCFullYear();
 }
 return v;
}
function parseInformativosSTF_(linhas){
 const cabecalho=(linhas[0]||[]).map(c=>String(c||'').trim());
 const indice=nome=>{const i=cabecalho.indexOf(nome);if(i<0)throw Error('A planilha do Informativo STF não tem mais a coluna "'+nome+'".');return i;};
 const c={edicao:indice('Informativo'),classe:indice('Classe Processo'),numero:indice('Número Processo'),
  incidente:indice('Incidente Julgamento'),uf:indice('UF'),data:indice('Data Julgamento'),
  relator:indice('Relator'),orgao:indice('Órgão Julgador'),titulo:indice('Título'),
  tese:indice('Tese Julgado'),resumo:indice('Resumo'),ramo:indice('Ramo Direito'),
  materia:indice('Matéria'),temaRG:indice('Tema RG')};
 const usados={};const registros=[];
 linhas.slice(1).forEach(l=>{
  const edicao=String(l[c.edicao]||'').trim();
  if(!/^\d+$/.test(edicao)||Number(edicao)<PILOTO.stfInfoEdicaoMinima)return;
  const titulo=limpaSTF_(l[c.titulo]);
  const tese=limpaSTF_(l[c.tese])||limpaSTF_(l[c.resumo]);
  if(!titulo&&!tese)return;
  const classe=String(l[c.classe]||'').trim();
  const numeroProcesso=String(l[c.numero]||'').trim();
  const processo=[classe,numeroProcesso].filter(Boolean).join(' ')+(l[c.uf]?'/'+String(l[c.uf]).trim():'');
  let id='STF-INFO-'+edicao+'-'+(String(l[c.incidente]||'').trim()||(classe+numeroProcesso).replace(/\W/g,'')||String(registros.length));
  usados[id]=(usados[id]||0)+1;
  if(usados[id]>1)id+='-'+usados[id];
  registros.push({
   id:id,tribunal:'STF',tipo:'Informativo',numero:'Informativo STF '+edicao,
   questao:titulo||tese.slice(0,240),
   area:classificarArea_([l[c.ramo],l[c.materia],titulo].join(' ')),
   situacao:'Destaque publicado',
   tese:tese,
   publicacao:dataSTF_(l[c.data]),
   fonte:'https://www.stf.jus.br/arquivo/cms/informativoSTF/anexo/Informativo_PDF/Informativo_stf_'+edicao+'.pdf',
   origem:'STF — informativos',
   pertinencia:'Possível pertinência — classificação automática ampla',
   observacoes:['Ramo: '+(l[c.ramo]||'não informado'),
    l[c.materia]?'Matéria: '+l[c.materia]:'',
    'Órgão: '+(l[c.orgao]||'não informado'),
    l[c.relator]?'Relator: '+l[c.relator]:'',
    l[c.temaRG]?'Tema de repercussão geral: '+l[c.temaRG]:''].filter(Boolean).join('\n'),
   processos:processo
  });
 });
 return registros;
}
function coletarInfosSTF_(){
 const linhas=lerXlsxRemoto_(PILOTO.stfInfoDados,'Informativo STF');
 const registros=parseInformativosSTF_(linhas);
 if(!registros.length)throw Error('Nenhum julgado reconhecido na planilha oficial do Informativo STF.');
 return atualizarRegistros_(PILOTO.infos,registros,'STF — informativos');
}
