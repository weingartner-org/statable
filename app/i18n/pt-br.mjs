#!/usr/bin/env node
/**
 * Brasilianisches Portugiesisch aus dem europäischen (Bauplan 7 Sprachen, Welle 1).
 *
 *   node i18n/pt-br.mjs            schreibt src/i18n/sprachen/pt-BR.json und pt-BR.hilfe.json (NUR Einträge, die von pt abweichen -
 *                                  der Rest kommt zur Laufzeit aus pt.json, laufzeit.ts BASIS) und lib/messages.pt-BR.json (ganz);
 *                                  dazu docs/sprachen/pt-BR-arbeit/in-durchsicht-*.json für die Durchsicht durch Agenten.
 *   node i18n/pt-br.mjs --zusammen trägt docs/sprachen/pt-BR-arbeit/out-*.json (Korrekturen der Durchsicht) über das Skript-Ergebnis ein.
 *
 * Die Ersetzungen sind bewusst eng (Wortgrenzen, feste Wendungen mit Geschlecht zuerst). Was das Skript nicht sicher kann
 * (Geschlecht nach ecrã → tela, rácio → razão; „guarda“; „transferir“), markiert es für die Durchsicht.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('..', import.meta.url));
const SPR = join(APP, 'src/i18n/sprachen');
const ARBEIT = join(APP, '..', 'docs', 'sprachen', 'pt-BR-arbeit');
const json = f => JSON.parse(readFileSync(f, 'utf8'));
const schreib = (f, o) => writeFileSync(f, JSON.stringify(o, null, 1) + '\n');
const sortiert = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));

// Feste Wendungen (mit Artikel/Geschlecht) zuerst, dann einzelne Wörter. [Muster, Ersatz]; Groß-/Kleinschreibung des Anfangs bleibt.
const WENDUNGEN = [
  ['o ecrã', 'a tela'], ['no ecrã', 'na tela'], ['do ecrã', 'da tela'], ['ao ecrã', 'à tela'], ['pelo ecrã', 'pela tela'],
  ['este ecrã', 'esta tela'], ['esse ecrã', 'essa tela'], ['um ecrã', 'uma tela'], ['os ecrãs', 'as telas'], ['nos ecrãs', 'nas telas'],
  ['ecrã inteiro', 'tela cheia'], ['ecrã estreito', 'tela estreita'], ['ecrãs estreitos', 'telas estreitas'], ['ecrãs pequenos', 'telas pequenas'], ['ecrã pequeno', 'tela pequena'], ['leitor de ecrã', 'leitor de tela'], ['leitores de ecrã', 'leitores de tela'],
  ['o rácio', 'a razão'], ['do rácio', 'da razão'], ['um rácio', 'uma razão'], ['rácio de chances', 'razão de chances'], ['rácio de verosimilhança', 'razão de verossimilhança'],
  ['grupo de controlo', 'grupo de controle'], ['valores omissos', 'valores ausentes'], ['Valores omissos', 'Valores ausentes'], ['valor omisso', 'valor ausente'],
  ['dados em falta', 'dados ausentes'], ['valores em falta', 'valores ausentes'], ['valor em falta', 'valor ausente'],
  ['área de transferência', 'área de transferência'],
  ['de facto', 'de fato'], ['tem de', 'tem que'], ['têm de', 'têm que'], ['temos de', 'temos que'], ['tenha de', 'tenha que'], ['terá de', 'terá que'],
  ['desvio-padrão', 'desvio padrão'], ['desvios-padrão', 'desvios padrão'], ['erro-padrão', 'erro padrão'], ['erros-padrão', 'erros padrão'],
  ['Carregue em', 'Clique em'], ['carregue em', 'clique em'], ['carregar em', 'clicar em'], ['carrega em', 'clica em'],
  ['caixa de bigodes', 'boxplot'],
  // aus Durchsicht 01 (11.11.)
  ['está a ser', 'está sendo'], ['estão a ser', 'estão sendo'], ['base de dados', 'banco de dados'], ['bases de dados', 'bancos de dados'], ['tipos de letra', 'fontes'], ['tipo de letra', 'fonte'],
  ['ordenada na origem', 'intercepto'], ['por defeito', 'por padrão'], ['mais pequeno', 'menor'], ['mais pequena', 'menor'], ['mais pequenos', 'menores'], ['mais pequenas', 'menores'],
  ['por omissão', 'por padrão'], ['por predefinição', 'por padrão'], ['em baixo', 'embaixo'], ['por vezes', 'às vezes'], ['Por vezes', 'Às vezes'], ['mais depressa', 'mais rápido'], ['em curso', 'em andamento'],
  ['a meio de', 'no meio de'], ['a meio do', 'no meio do'], ['a meio da', 'no meio da'], ['erro de escrita', 'erro de digitação'], ['erros de escrita', 'erros de digitação'], ['porque é que', 'por que'], ['iniciar sessão', 'fazer login'],
  ['sítio web', 'site'], ['unidade curricular', 'disciplina'], ['unidades curriculares', 'disciplinas'], ['Diário da República', 'Diário Oficial'], ['N.º', 'Nº'], ['1.ª', '1ª'], ['2.ª', '2ª'], ['3.ª', '3ª'],
  ['folha de cálculo', 'planilha'], ['folhas de cálculo', 'planilhas'], ['parênteses retos', 'colchetes'], ['Nova Iorque', 'Nova York'],
  ['caso-controlo', 'caso-controle'], ['IC a 95%', 'IC de 95%'], ['em linha', 'online'], ['pasta de transferências', 'pasta de downloads'], ['em todo o lado', 'em todo lugar'], ['Noutras línguas', 'Em outros idiomas'],
  ['valores próprios', 'autovalores'], ['valor próprio', 'autovalor'], ['até ao', 'até o'], ['até à', 'até a'], ['até aos', 'até os'], ['até às', 'até as'], ['a negrito', 'em negrito'], ['a itálico', 'em itálico'],
  ['ao fim de', 'após'], ['de imediato', 'imediatamente'], ['segredo estatístico', 'sigilo estatístico'], ['agregado familiar', 'domicílio'], ['agregados familiares', 'domicílios'], ['ferramentas de programador', 'ferramentas de desenvolvedor'],
  ['análise de potência', 'análise de poder'], ['potência estatística', 'poder estatístico'], ['potência do teste', 'poder do teste'], ['Calculadoras e cursores', 'Calculadoras e controles deslizantes'],
  ['Os seus', 'Seus'], ['As suas', 'Suas'], ['O seu', 'Seu'], ['A sua', 'Sua'], ['o seu', 'seu'], ['a sua', 'sua'], ['os seus', 'seus'], ['as suas', 'suas'],
  ['começar por', 'começar com'], ['começa por', 'começa com'], ['face a', 'em relação a'], ['1.º', '1º'], ['2.º', '2º'], ['3.º', '3º'], ['n.º', 'nº'],
];
const WOERTER = [
  ['ficheiros', 'arquivos'], ['ficheiro', 'arquivo'], ['utilizadores', 'usuários'], ['utilizadoras', 'usuárias'], ['utilizadora', 'usuária'], ['utilizador', 'usuário'],
  ['registos', 'registros'], ['registo', 'registro'], ['registado', 'registrado'], ['registada', 'registrada'], ['registados', 'registrados'], ['registadas', 'registradas'], ['registar', 'registrar'], ['regista', 'registra'], ['registam', 'registram'],
  ['equipas', 'equipes'], ['equipa', 'equipe'], ['factos', 'fatos'], ['facto', 'fato'], ['contactos', 'contatos'], ['contacto', 'contato'], ['contactar', 'contatar'],
  ['fiabilidade', 'confiabilidade'], ['fiáveis', 'confiáveis'], ['fiável', 'confiável'], ['percentagens', 'porcentagens'], ['percentagem', 'porcentagem'],
  ['aceder', 'acessar'], ['acede', 'acessa'], ['acedem', 'acessam'], ['acedido', 'acessado'],
  ['controlos', 'controles'], ['controlo', 'controle'], ['controlar', 'controlar'], ['secções', 'seções'], ['secção', 'seção'],
  ['partilhar', 'compartilhar'], ['partilha', 'compartilhamento'], ['partilhado', 'compartilhado'], ['partilhada', 'compartilhada'], ['partilhados', 'compartilhados'], ['partilhadas', 'compartilhadas'], ['Partilhar', 'Compartilhar'],
  ['investigação', 'pesquisa'], ['investigações', 'pesquisas'], ['investigadores', 'pesquisadores'], ['investigadoras', 'pesquisadoras'], ['investigador', 'pesquisador'], ['investigadora', 'pesquisadora'],
  ['planeamento', 'planejamento'], ['planear', 'planejar'], ['planeado', 'planejado'], ['planeada', 'planejada'], ['planeia', 'planeja'],
  ['telemóveis', 'celulares'], ['telemóvel', 'celular'], ['Guardar', 'Salvar'], ['guardar', 'salvar'], ['guardado', 'salvo'], ['guardada', 'salva'], ['guardados', 'salvos'], ['guardadas', 'salvas'],
  ['Definições', 'Configurações'], ['Prima', 'Pressione'], ['prima', 'pressione'], ['premir', 'pressionar'], ['prime', 'pressiona'],
  ['Eliminar', 'Excluir'], ['ecrãs', 'telas'], ['ecrã', 'tela'], ['rácios', 'razões'], ['rácio', 'razão'], ['inquéritos', 'questionários'], ['inquérito', 'questionário'],
  ['introduzir', 'inserir'], ['introduza', 'insira'], ['introduzido', 'inserido'], ['introduzida', 'inserida'], ['introduzidos', 'inseridos'], ['introduzidas', 'inseridas'], ['introduz', 'insere'], ['introduzem', 'inserem'],
  ['palavra-passe', 'senha'], ['palavras-passe', 'senhas'], ['separador', 'aba'], ['separadores', 'abas'], ['assinalar', 'marcar'], ['assinale', 'marque'], ['assinalado', 'marcado'], ['assinalada', 'marcada'], ['assinalados', 'marcados'], ['assinaladas', 'marcadas'],
  ['alojamento', 'hospedagem'], ['alojado', 'hospedado'], ['alojada', 'hospedada'], ['invulgar', 'atípico'], ['invulgares', 'atípicos'], ['omisso', 'ausente'], ['omissos', 'ausentes'], ['omissa', 'ausente'], ['omissas', 'ausentes'],
  ['declive', 'inclinação'], ['declives', 'inclinações'], ['ajustamento', 'ajuste'], ['ajustamentos', 'ajustes'], ['ómega', 'ômega'], ['estandardizado', 'padronizado'], ['estandardizada', 'padronizada'], ['estandardizados', 'padronizados'], ['estandardizadas', 'padronizadas'], ['estandardizar', 'padronizar'],
  ['acontecimento', 'evento'], ['acontecimentos', 'eventos'], ['desfasamento', 'defasagem'], ['desfasamentos', 'defasagens'], ['truncagem', 'truncamento'], ['alisamento', 'suavização'], ['predefinição', 'padrão'], ['predefinições', 'padrões'], ['predefinido', 'padrão'], ['predefinida', 'padrão'],
  ['detetar', 'detectar'], ['deteta', 'detecta'], ['detetam', 'detectam'], ['detetado', 'detectado'], ['detetada', 'detectada'], ['detetados', 'detectados'], ['detetadas', 'detectadas'], ['deteção', 'detecção'], ['deteções', 'detecções'],
  ['grelha', 'grade'], ['grelhas', 'grades'], ['centragem', 'centralização'], ['emparelhado', 'pareado'], ['emparelhada', 'pareada'], ['emparelhados', 'pareados'], ['emparelhadas', 'pareadas'], ['emparelhar', 'parear'], ['emparelhamento', 'pareamento'],
  ['sobredispersão', 'superdispersão'], ['recolha', 'coleta'], ['recolhas', 'coletas'], ['recolher', 'coletar'],
  ['cinzento', 'cinza'], ['cinzenta', 'cinza'], ['desligado', 'desativado'], ['desligada', 'desativada'], ['premido', 'pressionado'], ['premida', 'pressionada'], ['artefacto', 'artefato'], ['artefactos', 'artefatos'], ['ronda', 'rodada'], ['rondas', 'rodadas'], ['porquê', 'por quê'],
  ['carateres', 'caracteres'], ['caráter', 'caractere'], ['píxeis', 'pixels'], ['telefónica', 'telefônica'], ['telefónico', 'telefônico'], ['incómodo', 'incômodo'], ['enviesamento', 'viés'], ['enviesado', 'viesado'], ['enviesada', 'viesada'],
  ['comboio', 'trem'], ['comboios', 'trens'], ['autocarro', 'ônibus'], ['autocarros', 'ônibus'], ['pára', 'para'],
  ['libertar', 'liberar'], ['libertado', 'liberado'], ['multimédia', 'multimídia'], ['agrupação', 'agrupamento'], ['morada', 'endereço'], ['raparigas', 'meninas'], ['rapariga', 'menina'], ['rapazes', 'meninos'], ['rapaz', 'menino'],
  ['noutro', 'em outro'], ['noutra', 'em outra'], ['noutros', 'em outros'], ['noutras', 'em outras'],
  ['recenseamento', 'censo'], ['diapositivo', 'slide'], ['diapositivos', 'slides'], ['rastreio', 'rastreamento'],
  ['descarregar', 'baixar'], ['descarregue', 'baixe'], ['descarregado', 'baixado'],
  ['num', 'em um'], ['numa', 'em uma'], ['nuns', 'em uns'], ['numas', 'em umas'],
  ['chávena', 'xícara'], ['chávenas', 'xícaras'],
  ['connosco', 'conosco'], ['dezasseis', 'dezesseis'], ['dezassete', 'dezessete'], ['dezanove', 'dezenove'], ['intermédio', 'intermediário'], ['intermédia', 'intermediária'], ['intermédios', 'intermediários'], ['intermédias', 'intermediárias'], ['verosimilhança', 'verossimilhança'], ['verosímil', 'verossímil'],
  // Akzent é/ó → ê/ô vor m/n
  ['académico', 'acadêmico'], ['académica', 'acadêmica'], ['académicos', 'acadêmicos'], ['académicas', 'acadêmicas'], ['anónimo', 'anônimo'], ['anónima', 'anônima'], ['anónimos', 'anônimos'], ['anónimas', 'anônimas'], ['anonimizado', 'anonimizado'],
  ['económico', 'econômico'], ['económica', 'econômica'], ['económicos', 'econômicos'], ['económicas', 'econômicas'], ['fenómeno', 'fenômeno'], ['fenómenos', 'fenômenos'],
  ['género', 'gênero'], ['géneros', 'gêneros'], ['sinónimo', 'sinônimo'], ['sinónimos', 'sinônimos'], ['homogéneo', 'homogêneo'], ['homogénea', 'homogênea'], ['homogéneos', 'homogêneos'], ['homogéneas', 'homogêneas'],
  ['heterogéneo', 'heterogêneo'], ['heterogénea', 'heterogênea'], ['heterogéneos', 'heterogêneos'], ['heterogéneas', 'heterogêneas'], ['polinómio', 'polinômio'], ['polinómios', 'polinômios'], ['polinomial', 'polinomial'],
  ['binómio', 'binômio'], ['dicotómico', 'dicotômico'], ['dicotómica', 'dicotômica'], ['dicotómicos', 'dicotômicos'], ['dicotómicas', 'dicotômicas'], ['politómico', 'politômico'], ['politómica', 'politômica'],
  ['autónomo', 'autônomo'], ['autónoma', 'autônoma'], ['autonomia', 'autonomia'], ['eletrónico', 'eletrônico'], ['eletrónica', 'eletrônica'], ['eletrónicos', 'eletrônicos'], ['eletrónicas', 'eletrônicas'],
  ['crónico', 'crônico'], ['crónica', 'crônica'], ['crónicos', 'crônicos'], ['harmónico', 'harmônico'], ['harmónica', 'harmônica'], ['prémio', 'prêmio'], ['prémios', 'prêmios'], ['bónus', 'bônus'], ['ónus', 'ônus'],
  ['quilómetro', 'quilômetro'], ['quilómetros', 'quilômetros'], ['milénio', 'milênio'], ['ténue', 'tênue'], ['génio', 'gênio'], ['cómodo', 'cômodo'], ['anatómico', 'anatômico'], ['agronómico', 'agronômico'], ['astronómico', 'astronômico'],
  ['idóneo', 'idôneo'], ['idónea', 'idônea'], ['síndroma', 'síndrome'], ['ténis', 'tênis'], ['Antónimo', 'Antônimo'], ['antónimo', 'antônimo'], ['António', 'Antônio'],
  // AO90 in Portugal ohne c/p, Brasilien mit
  ['aspeto', 'aspecto'], ['aspetos', 'aspectos'], ['respetivo', 'respectivo'], ['respetiva', 'respectiva'], ['respetivos', 'respectivos'], ['respetivas', 'respectivas'], ['respetivamente', 'respectivamente'],
  ['perceção', 'percepção'], ['perceções', 'percepções'], ['receção', 'recepção'], ['conceção', 'concepção'], ['conceções', 'concepções'], ['exceção', 'exceção'], ['excecional', 'excepcional'], ['excecionais', 'excepcionais'],
  ['espetro', 'espectro'], ['espetador', 'espectador'], ['espetadores', 'espectadores'], ['perspetiva', 'perspectiva'], ['perspetivas', 'perspectivas'], ['retrospetivo', 'retrospectivo'], ['retrospetiva', 'retrospectiva'], ['prospetivo', 'prospectivo'], ['prospetiva', 'prospectiva'],
  ['seção', 'seção'], ['facultativo', 'facultativo'],
  // Power eines Tests: pt-PT „potência“ (weiblich) → pt-BR „poder“ (männlich); Potenz in Formeln zurück
  ['uma potência', 'um poder'], ['a potência', 'o poder'], ['da potência', 'do poder'], ['na potência', 'no poder'], ['à potência', 'ao poder'], ['pela potência', 'pelo poder'], ['potência', 'poder'],
  ['elevado ao poder', 'elevado à potência'], ['elevada ao poder', 'elevada à potência'], ['cursores', 'controles deslizantes'],
];
// Wörter, die das Skript nicht anfasst, aber zur Durchsicht vormerkt (Bedeutung hängt am Satz)
const VORMERKEN = /\b(guarda|guardam|transferir|Transferir|transferência|ligação|ligações|sítio|carregar|carregue|definições|eliminar|apagar|anular|Anular|propina|licenciatura|cadeira|unidade curricular|autocarro|equipamento|ecrã|rácio|razão|tela|telas|recolhido|recolhida|recolhidos|recolhidas)\b/u;

const grossAnfang = (wort, ersatz) => (wort[0] === wort[0].toUpperCase() && wort[0] !== wort[0].toLowerCase() ? ersatz[0].toUpperCase() + ersatz.slice(1) : ersatz);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const B = '(?<![\\p{L}\\p{N}-])', E = '(?![\\p{L}\\p{N}])'; // Unterstrich gilt als Grenze (Spaltennamen wie telemóvel_cama); Bindestrich davor nicht
const REGELN = [...WENDUNGEN, ...WOERTER].filter(([a, b]) => a !== b).map(([a, b]) => {
  // Kleinschreibung trifft auch den großen Anfang („Ficheiro“ → „Arquivo“); ausdrücklich große Einträge nur sich selbst
  const klein = a[0] === a[0].toLowerCase();
  const muster = klein ? `[${a[0]}${a[0].toUpperCase()}]${esc(a.slice(1))}` : esc(a);
  return [new RegExp(B + muster + E, 'gu'), b];
});
// „está a calcular“ → „está calculando“ (Brasilien: Gerundium). Nur „estar“-Formen + a + Infinitiv auf -ar/-er/-ir.
const ESTAR = '(estou|está|estás|estamos|estão|estava|estavam|estive|esteve|estiveram|estará|estarão|esteja|estejam|estar|estiver|estiverem|estaria|estariam|continua|continuam|ficar|fica|ficam|anda|andam)';
const NICHT_INF = new Set(['par', 'mar', 'lugar', 'bar', 'ser', 'prazer', 'poder', 'dever', 'mulher', 'colher', 'qualquer', 'ter']);
const GERUND = new RegExp(`${B}${ESTAR} a (\\p{L}+?)(ar|er|ir)${E}`, 'gu');
const gerForm = (stamm, end) => `${stamm}${end === 'ar' ? 'ando' : end === 'er' ? 'endo' : 'indo'}`;
// Statusmeldung am Satzanfang ohne „estar“: „A ler o ficheiro…“ → „Lendo o arquivo…“
const ANFANG = /^(\s*)A (\p{Ll}+?)(ar|er|ir)(?=[\s…])/u;
const gerund = t => t.replace(GERUND, (m, e, stamm, end) => (NICHT_INF.has(stamm + end) ? m : `${e} ${gerForm(stamm, end)}`))
  .replace(ANFANG, (m, ws, stamm, end) => (NICHT_INF.has(stamm + end) ? m : ws + gerForm(stamm, end)[0].toUpperCase() + gerForm(stamm, end).slice(1)));

// geschützt: Dezimal-/Tausender-/Feldtrenner, Trennzeichen in Anführung („separador “;”“, „separador “{0}”“), „ela própria o separador“
const SEP_SCHUTZ = /ela própria o separador|(?:caracteres? )?[Ss]eparador(?:es)?(?= (?:decimal|decimais|de milhares|de casas|de campos|de colunas|de valores|de listas|de texto)|\s*[“"«]\s*(?:[^\p{L}”"»]{1,3}|\{\d+\})\s*[”"»]|\s*[“"«]\s*$)|como separador(?=\s*[.;]|\s*$)/gu;
// Geschlecht nach „separador“ → „aba“ (die Regel ändert nur das Wort): o aba → a aba, aba aberto → aba aberta
const ABA_GESCHLECHT = [
  ['um dos nove abas', 'uma das nove abas'], ['dos nove abas', 'das nove abas'], ['os outros abas', 'as outras abas'], ['outros abas', 'outras abas'],
  ['os abas', 'as abas'], ['dos abas', 'das abas'], ['nos abas', 'nas abas'], ['aos abas', 'às abas'], ['pelos abas', 'pelas abas'], ['estes abas', 'estas abas'],
  ['o aba', 'a aba'], ['do aba', 'da aba'], ['no aba', 'na aba'], ['ao aba', 'à aba'], ['um aba', 'uma aba'], ['este aba', 'esta aba'], ['esse aba', 'essa aba'],
  ['do outro aba', 'da outra aba'], ['deste aba', 'desta aba'], ['neste aba', 'nesta aba'], ['desse aba', 'dessa aba'], ['nesse aba', 'nessa aba'], ['outro aba', 'outra aba'], ['pelo aba', 'pela aba'],
  ['aba aberto', 'aba aberta'], ['aba próprio', 'aba própria'], ['aba ativo', 'aba ativa'], ['abas abertos', 'abas abertas'], ['abas próprios', 'abas próprias'],
].map(([a, b]) => [new RegExp(B + `[${a[0]}${a[0].toUpperCase()}]${esc(a.slice(1))}` + E, 'gu'), b]);

export function zuBr(t) {
  if (typeof t !== 'string') return Object.fromEntries(Object.entries(t).map(([f, x]) => [f, zuBr(x)]));
  // Platzhalter, Tags und Code nicht anfassen: nur Textteile außerhalb von <…> und {n}
  return t.split(/(<[^>]+>|\{\d+\})/).map((teil, i) => {
    if (i % 2) return teil;
    // „separador“ als Trennzeichen (Dezimal-, Tausender-, Feld-, Zeichen) bleibt; nur der Reiter wird „aba“
    const schutz = [];
    let x = gerund(teil).replace(SEP_SCHUTZ, m => `\u0001${schutz.push(m) - 1}\u0002`);
    for (const [re, b] of REGELN) x = x.replace(re, w => grossAnfang(w, b));
    x = x.replace(/\u0001(\d+)\u0002/g, (m, n) => schutz[Number(n)]);
    for (const [re, b] of ABA_GESCHLECHT) x = x.replace(re, w => grossAnfang(w, b));
    return x.replace(/«\s?/g, '“').replace(/\s?»/g, '”');
  }).join('');
}
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const textVon = v => (typeof v === 'string' ? v : Object.values(v).join(' | '));

const ohneBuendel = process.argv.includes('--ohne-buendel');
if (process.argv[2] === '--zusammen') {
  for (const b of ['', '.hilfe']) {
    const f = join(SPR, `pt-BR${b}.json`), ziel = existsSync(f) ? json(f) : {};
    const basis = json(join(SPR, `pt${b}.json`));
    let n = 0;
    for (const d of readdirSync(ARBEIT).filter(d => /^out-.*\.json$/.test(d))) for (const [k, v] of Object.entries(json(join(ARBEIT, d)))) {
      if (!(k in basis)) continue;
      const w = zuBr(v); // Regeln auch über die Korrekturen der Durchsicht (spätere Muster)
      if (gleich(w, basis[k])) delete ziel[k]; else ziel[k] = w;
      n++;
    }
    schreib(f, sortiert(ziel));
    console.log(`pt-BR${b}.json: ${n} Korrekturen eingetragen, ${Object.keys(ziel).length} Einträge weichen von pt ab`);
  }
} else {
  mkdirSync(ARBEIT, { recursive: true });
  const katalog = json(join(APP, 'src/i18n/katalog.json'));
  const durchsicht = [];
  for (const b of ['', '.hilfe']) {
    const pt = json(join(SPR, `pt${b}.json`)), aus = {};
    for (const [k, v] of Object.entries(pt)) {
      const br = zuBr(v);
      if (!gleich(br, v)) aus[k] = br;
      const o = katalog[k]?.orte?.[0] ?? '';
      // Durchsicht: Oberfläche und Bausteine ganz (dort zählt jedes Wort der Bedienung), sonst nur vorgemerkte Einträge
      if (/^(seiten|bausteine)\//.test(o) || VORMERKEN.test(textVon(br))) durchsicht.push({ k, en: katalog[k]?.en, br, orte: katalog[k]?.orte });
    }
    schreib(join(SPR, `pt-BR${b}.json`), sortiert(aus));
    console.log(`pt-BR${b}.json: ${Object.keys(aus).length} von ${Object.keys(pt).length} Einträgen weichen ab`);
  }
  // Erklärtexte ganz (eigener Aufbau, kein Erben)
  const m = json(join(APP, 'src/lib/messages.pt.json'));
  const umbau = x => (typeof x === 'string' ? zuBr(x) : Array.isArray(x) ? x.map(umbau) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, ['muster', 'original', 'id'].includes(k) ? v : umbau(v)])) : x);
  schreib(join(APP, 'src/lib/messages.pt-BR.json'), umbau(m));
  // Bündel für die Durchsicht (~15.000 Wörter)
  if (ohneBuendel) { console.log(`Durchsicht: ${durchsicht.length} Einträge (Bündel nicht neu geschrieben, --ohne-buendel)`); process.exit(0); }
  for (const f of readdirSync(ARBEIT).filter(f => /^in-durchsicht-\d+\.json$/.test(f))) writeFileSync(join(ARBEIT, f), '');
  let nr = 1, akt = [], w = 0;
  const raus = () => { if (akt.length) schreib(join(ARBEIT, `in-durchsicht-${String(nr++).padStart(2, '0')}.json`), akt); akt = []; w = 0; };
  for (const x of durchsicht) { akt.push(x); w += textVon(x.br).split(/\s+/).length; if (w > 15000) raus(); }
  raus();
  console.log(`Durchsicht: ${durchsicht.length} Einträge in ${nr - 1} Bündeln → docs/sprachen/pt-BR-arbeit/`);
}
