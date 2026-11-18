/* Perfil Comportamental CALI (base DISC) — método v1 (outubro/2026).
   Fonte: "Perfil-Comportamental_DISC-CALI_Revisao_v1" e "..._Banco-Perguntas_v1".
   18 blocos de 4 afirmações (uma por estilo); a pessoa marca a que MAIS e a que MENOS combina.
   Chave natural: os 18 blocos. Versão enxuta da pressão: os blocos de PRESSURE_BLOCKS respondidos de novo
   pensando em uma semana difícil. O cálculo oficial é refeito no banco (public.cali_profile_submit); este
   arquivo espelha a mesma regra para a tela e os relatórios. */

export type Style = 'D' | 'I' | 'S' | 'C';
export type Axis = 'Ritmo' | 'Relação' | 'Estrutura';
export type Temperament = 'Colérico' | 'Sanguíneo' | 'Melancólico' | 'Fleumático';

export const METHOD_VERSION = 'cali-disc-v1.1';
/** Margem de leitura (parecer de 23/10/2026): ±10 pontos na chave natural (18 blocos) e ±18 na chave sob pressão (6 blocos).
    Diferença entre estilos só é tratada como real quando passa da margem. */
export const MARGIN = { natural: 10, pressure: 18 } as const;
/** Mudança sob pressão só é lida como mudança quando passa de 25 pontos (soma das incertezas das duas leituras de 6 blocos). */
export const ADAPT_THRESHOLD = 25;
export const STYLES: Style[] = ['D', 'I', 'S', 'C'];
export const NATURAL_BLOCKS = 18;
/** Blocos repetidos na chave "sob pressão" (versão enxuta): um a cada três, cobrindo o teste inteiro. */
export const PRESSURE_BLOCKS = [2, 5, 8, 11, 14, 17];

export type BankItem = { block: number; style: Style; text: string; axis: Axis; temperament: Temperament; rarity: 'comum' | 'raro' };

const b = (block: number, items: Array<[Style, string, Axis, 'comum' | 'raro']>): BankItem[] =>
  items.map(([style, text, axis, rarity]) => ({ block, style, text, axis, rarity, temperament: TEMPERAMENT_OF[style] }));

export const TEMPERAMENT_OF: Record<Style, Temperament> = { D: 'Colérico', I: 'Sanguíneo', S: 'Fleumático', C: 'Melancólico' };

export const BANK: BankItem[] = [
  ...b(1, [['D', 'Decido rápido, mesmo sem tudo na mão', 'Ritmo', 'comum'], ['I', 'Puxo conversa com facilidade', 'Relação', 'comum'], ['S', 'Prefiro manter o que já funciona', 'Estrutura', 'comum'], ['C', 'Confiro tudo antes de entregar', 'Estrutura', 'comum']]),
  ...b(2, [['D', 'Assumo a frente quando trava', 'Ritmo', 'comum'], ['I', 'Conto as coisas com entusiasmo', 'Relação', 'comum'], ['S', 'Sou a pessoa que o time procura', 'Relação', 'raro'], ['C', 'Quero entender o porquê das coisas', 'Estrutura', 'comum']]),
  ...b(3, [['D', 'Gosto de metas difíceis', 'Ritmo', 'comum'], ['I', 'Trabalho bem em grupo', 'Relação', 'comum'], ['S', 'Prefiro rotina previsível', 'Estrutura', 'comum'], ['C', 'Sigo o padrão combinado', 'Estrutura', 'comum']]),
  ...b(4, [['D', 'Falo direto, sem rodeio', 'Ritmo', 'comum'], ['I', 'Me animo com ideia nova', 'Ritmo', 'comum'], ['S', 'Escuto mais do que falo', 'Relação', 'comum'], ['C', 'Reviso o meu próprio trabalho', 'Estrutura', 'comum']]),
  ...b(5, [['D', 'Resolvo na hora o que aparece', 'Ritmo', 'comum'], ['I', 'Convenço pela conversa', 'Relação', 'raro'], ['S', 'Mantenho a calma no aperto', 'Ritmo', 'comum'], ['C', 'Prefiro ter todos os dados', 'Estrutura', 'comum']]),
  ...b(6, [['D', 'Aceito correr risco calculado', 'Ritmo', 'raro'], ['I', 'Gosto de conhecer gente nova', 'Relação', 'comum'], ['S', 'Cumpro o que combinei', 'Estrutura', 'comum'], ['C', 'Não gosto de deixar ponta solta', 'Estrutura', 'comum']]),
  ...b(7, [['D', 'Fico impaciente com processo lento', 'Ritmo', 'comum'], ['I', 'Falo em público sem dificuldade', 'Relação', 'raro'], ['S', 'Ajudo sem que me peçam', 'Relação', 'comum'], ['C', 'Anoto tudo para não esquecer', 'Estrutura', 'comum']]),
  ...b(8, [['D', 'Prefiro decidir a esperar', 'Ritmo', 'comum'], ['I', 'Meu humor contamina o ambiente', 'Relação', 'raro'], ['S', 'Evito criar atrito', 'Relação', 'comum'], ['C', 'Questiono quando não faz sentido', 'Estrutura', 'comum']]),
  ...b(9, [['D', 'Gosto de ter a palavra final', 'Ritmo', 'raro'], ['I', 'Faço amizade rápido', 'Relação', 'comum'], ['S', 'Prefiro trabalhar com quem já conheço', 'Relação', 'raro'], ['C', 'Trabalho melhor sozinho e concentrado', 'Ritmo', 'comum']]),
  ...b(10, [['D', 'Busco resultado antes de tudo', 'Ritmo', 'comum'], ['I', 'Prefiro tarefa que envolve gente', 'Relação', 'comum'], ['S', 'Não gosto de mudança de última hora', 'Estrutura', 'comum'], ['C', 'Detecto erro com facilidade', 'Estrutura', 'comum']]),
  ...b(11, [['D', 'Delego sem dificuldade', 'Ritmo', 'comum'], ['I', 'Gosto de reconhecimento na frente do time', 'Relação', 'raro'], ['S', 'Prefiro instrução clara e estável', 'Estrutura', 'comum'], ['C', 'Preciso de tempo para pensar', 'Ritmo', 'comum']]),
  ...b(12, [['D', 'Encaro conflito de frente', 'Relação', 'raro'], ['I', 'Puxo o time para cima', 'Relação', 'comum'], ['S', 'Escuto antes de discordar', 'Relação', 'comum'], ['C', 'Prefiro qualidade a velocidade', 'Estrutura', 'comum']]),
  ...b(13, [['D', 'Aumento o ritmo quando aperta', 'Ritmo', 'comum'], ['I', 'Falo o que penso na hora', 'Ritmo', 'comum'], ['S', 'Prefiro o combinado ao improviso', 'Estrutura', 'comum'], ['C', 'Organizo antes de começar', 'Estrutura', 'comum']]),
  ...b(14, [['D', 'Me incomoda gente que enrola', 'Ritmo', 'comum'], ['I', 'Gosto de ambiente animado', 'Relação', 'comum'], ['S', 'Sou leal a quem está comigo', 'Relação', 'raro'], ['C', 'Me cobro mais do que os outros me cobram', 'Estrutura', 'raro']]),
  ...b(15, [['D', 'Prefiro pedir desculpa a pedir licença', 'Ritmo', 'raro'], ['I', 'Me distraio em tarefa repetitiva', 'Estrutura', 'raro'], ['S', 'Sou o ponto de equilíbrio do grupo', 'Relação', 'raro'], ['C', 'Sigo a regra mesmo sem supervisão', 'Estrutura', 'comum']]),
  ...b(16, [['D', 'Assumo risco sem consultar', 'Ritmo', 'raro'], ['I', 'Converso com todo mundo', 'Relação', 'comum'], ['S', 'Prefiro trabalhar em ritmo constante', 'Ritmo', 'comum'], ['C', 'Quero que fique certo, não rápido', 'Estrutura', 'comum']]),
  ...b(17, [['D', 'Me irrito com quem não decide', 'Ritmo', 'comum'], ['I', 'Me empolgo com o que é novo', 'Ritmo', 'comum'], ['S', 'Prefiro ambiente sem clima pesado', 'Relação', 'comum'], ['C', 'Me incomoda resposta vaga', 'Estrutura', 'raro']]),
  ...b(18, [['D', 'Gosto de ser cobrado por resultado', 'Ritmo', 'raro'], ['I', 'Me aborreço com trabalho solitário', 'Relação', 'raro'], ['S', 'Prefiro estabilidade a mudança', 'Estrutura', 'comum'], ['C', 'Necessito de critério claro para agir', 'Estrutura', 'comum']]),
];

/** Ordem de exibição fixa por bloco (rotação do sistema), diferente na chave sob pressão. */
const PERMUTATIONS: Style[][] = [
  ['C', 'I', 'D', 'S'], ['S', 'D', 'C', 'I'], ['I', 'C', 'S', 'D'], ['D', 'S', 'I', 'C'], ['C', 'D', 'S', 'I'], ['I', 'S', 'D', 'C'],
  ['S', 'C', 'I', 'D'], ['D', 'I', 'C', 'S'], ['I', 'D', 'S', 'C'], ['C', 'S', 'D', 'I'], ['S', 'I', 'C', 'D'], ['D', 'C', 'I', 'S'],
];
export function blockItems(block: number, pressure = false) {
  const order = PERMUTATIONS[(block * 5 + (pressure ? 7 : 0)) % PERMUTATIONS.length];
  const items = BANK.filter((item) => item.block === block);
  return order.map((style) => items.find((item) => item.style === style)!);
}

export type BlockAnswer = { b: number; mais: Style; menos: Style };
export type RawAnswers = { natural: BlockAnswer[]; pressure: BlockAnswer[] };
export type StyleScore = { raw: number; pct: number };
export type Scores = {
  natural: Record<Style, StyleScore>;
  natural6: Record<Style, StyleScore>;
  pressure: Record<Style, StyleScore>;
  adaptation: Record<Style, number>;
};

const pct = (raw: number, blocks: number) => Math.round(((raw + blocks) / (blocks * 2)) * 100);
function tally(answers: BlockAnswer[], blocks: number): Record<Style, StyleScore> {
  const raw: Record<Style, number> = { D: 0, I: 0, S: 0, C: 0 };
  for (const answer of answers) { raw[answer.mais] += 1; raw[answer.menos] -= 1; }
  return Object.fromEntries(STYLES.map((style) => [style, { raw: raw[style], pct: pct(raw[style], blocks) }])) as Record<Style, StyleScore>;
}

export function computeScores(answers: RawAnswers): Scores {
  const natural = tally(answers.natural, NATURAL_BLOCKS);
  const natural6 = tally(answers.natural.filter((answer) => PRESSURE_BLOCKS.includes(answer.b)), PRESSURE_BLOCKS.length);
  const pressure = tally(answers.pressure, PRESSURE_BLOCKS.length);
  const adaptation = Object.fromEntries(STYLES.map((style) => [style, pressure[style].pct - natural6[style].pct])) as Record<Style, number>;
  return { natural, natural6, pressure, adaptation };
}

export type Band = 'Baixo' | 'Moderado' | 'Alto' | 'Muito alto';
export const BANDS: Array<{ band: Band; from: number; to: number }> = [
  { band: 'Baixo', from: 0, to: 39 }, { band: 'Moderado', from: 40, to: 59 }, { band: 'Alto', from: 60, to: 79 }, { band: 'Muito alto', from: 80, to: 100 },
];
export function bandOf(value: number): Band {
  return value >= 80 ? 'Muito alto' : value >= 60 ? 'Alto' : value >= 40 ? 'Moderado' : 'Baixo';
}

/** Perfil: predominante e secundário pela chave natural; diferença menor que a margem (10 pontos) = perfil misto. */
export function profileOf(scores: Pick<Scores, 'natural'>) {
  const ranked = [...STYLES].sort((a, b) => scores.natural[b].pct - scores.natural[a].pct);
  const [primary, secondary] = ranked;
  const mixed = scores.natural[primary].pct - scores.natural[secondary].pct < MARGIN.natural;
  return { primary, secondary, mixed, ranked };
}

/** Intervalo provável de um escore (escore ± margem, entre 0 e 100) e as faixas que ele toca. */
export function rangeOf(value: number, margin: number) {
  const lo = Math.max(0, value - margin), hi = Math.min(100, value + margin);
  return { lo, hi, band: bandOf(value), loBand: bandOf(lo), hiBand: bandOf(hi) };
}

/** Faixa em texto, honesta com a margem: "Alto" ou "Moderado, no limite com Alto". */
export function bandText(value: number, margin: number) {
  const { band, loBand, hiBand } = rangeOf(value, margin);
  const near = [...new Set([loBand, hiBand])].filter((item) => item !== band);
  return near.length ? `${band}, no limite com ${near.join(' e ')}` : band;
}

/** Adaptação em níveis (nunca em pontos): estilos que mudam além do limite entre o dia comum e a semana difícil,
    comparando os mesmos 6 blocos nas duas situações. */
export function adaptationOf(scores: Pick<Scores, 'adaptation'>) {
  const changed = STYLES.filter((style) => Math.abs(scores.adaptation[style]) >= ADAPT_THRESHOLD)
    .sort((a, b) => Math.abs(scores.adaptation[b]) - Math.abs(scores.adaptation[a]))
    .map((style) => ({ style, up: scores.adaptation[style] > 0 }));
  const level = changed.length === 0 ? 'Muda pouco' : changed.length === 1 ? 'Muda em um estilo' : 'Muda em mais de um estilo';
  return { level, changed };
}
