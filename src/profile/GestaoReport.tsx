/* Perfil Comportamental CALI — relatório de gestão (terceiro relatório, para CEO, sócio e diretoria do cliente).
   Especificação "Relatorio-Gestao_Especificacao_v1": fala do conjunto, nunca de pessoas; cada manchete traz um número e uma
   consequência amarrada ao resultado que a empresa persegue; termina em três decisões com dono e pergunta de checagem.
   Regras de microdado: abaixo de 5 respostas não há leitura; de 5 a 14, o time é descrito em texto, sem número por estilo. */
import type { ReactNode } from 'react';
import { STYLES, type Style } from './profileMethod';
import { NATURE, STYLE_CONTENT } from './profileContent';
import { Alert, Page } from './ProfileReports';
import './profile-report.css';

export type GestaoData = {
  link_id: string; title: string; company: string | null; purpose: string;
  moment: string | null; sector: string | null; goal: string | null; released_at: string | null;
  n: number;
  invites: { sent: number; completed: number; declined: number; started: number; expired: number; median_minutes: number | null };
  dates: { min: string | null; max: string | null; method: string | null };
  dist: null | {
    primary: Record<Style, number>; secondary: Record<Style, number>; mixed: number;
    bands: Record<Style, { low: number; mid: number; high: number }>;
    pressure: { stable: number; one: number; many: number; up: Record<Style, number>; down: Record<Style, number> };
  };
};

export const MOMENTS: Record<string, string> = { crescimento: 'Crescimento', reorganizacao: 'Reorganização', escala: 'Ganho de escala', estabilidade: 'Estabilidade' };
export const SECTORS: Record<string, { label: string; unit: string; flow: string }> = {
  industria: { label: 'Indústria', unit: 'turno', flow: 'produção' },
  tecnologia: { label: 'Tecnologia', unit: 'squad', flow: 'ciclo de entrega' },
  servicos: { label: 'Serviços', unit: 'equipe', flow: 'atendimento ao cliente' },
  varejo: { label: 'Varejo', unit: 'loja', flow: 'venda' },
  saude: { label: 'Saúde', unit: 'plantão', flow: 'atendimento' },
  outro: { label: 'Outro', unit: 'equipe', flow: 'rotina de trabalho' },
};
const MIN_READ = 5;
const MIN_CHART = 15;
const PREFERS: Record<Style, string> = { D: 'decidir e puxar o resultado', I: 'engajar e conectar pessoas', S: 'estabilidade e ritmo constante', C: 'critério e qualidade antes da velocidade' };
const FUNCTION: Record<Style, string> = { D: 'Resolver: decidir e destravar', I: 'Conectar: engajar e comunicar', S: 'Sustentar: manter rotina e clima', C: 'Conferir: padrão e qualidade' };
const day = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
const inTen = (part: number, whole: number) => Math.max(0, Math.min(10, Math.round((part / Math.max(1, whole)) * 10)));
const split = (text: string) => { const [consequence, question] = text.split('Pergunta de gestão: '); return { consequence: consequence.trim(), question: (question || '').trim() }; };

function momentReading(moment: string | null, top: Style) {
  const fast = top === 'D' || top === 'I';
  if (moment === 'crescimento') return `Em crescimento, a empresa cobra velocidade e novidade. ${fast ? 'Esta configuração ajuda a abrir frentes; o risco é perder o controle do que já foi aberto.' : 'Esta configuração dá estabilidade; o risco é o ritmo ficar abaixo do que o crescimento pede.'}`;
  if (moment === 'reorganizacao') return `Em reorganização, o time precisa de clareza e segurança. ${fast ? 'Esta configuração tende a acelerar a mudança; o risco é atropelar quem precisa de tempo para se adaptar.' : 'Esta configuração tende a sustentar o processo; o risco é a resistência silenciosa à mudança.'}`;
  if (moment === 'escala') return `No ganho de escala, processo e repetição pesam. ${fast ? 'Esta configuração favorece iniciativa; o risco é cada um fazer do seu jeito e o processo não escalar.' : 'Esta configuração favorece padrão e constância; o risco é a decisão ficar lenta.'}`;
  if (moment === 'estabilidade') return `Em estabilidade, o desafio é manter o engajamento. ${fast ? 'Esta configuração traz energia; o risco é a busca por novidade gerar dispersão.' : 'Esta configuração sustenta a rotina; o risco é a acomodação.'}`;
  return '';
}

function Headline({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <div className="cgr-headline"><strong>{number}</strong><div><b>{title}</b><p>{children}</p></div></div>;
}

export function GestaoReport({ data }: { data: GestaoData }) {
  const n = data.n;
  const valid = n >= MIN_READ && data.dist;
  const sector = SECTORS[data.sector || ''] || SECTORS.outro;
  const goal = data.goal?.trim() || '';
  const inv = data.invites;
  const rate = inv.sent - inv.declined > 0 ? Math.round((inv.completed / (inv.sent - inv.declined)) * 100) : null;
  const readAt = data.dates.max ? day(data.dates.max) : '—';
  const validUntil = data.dates.min ? (() => { const date = new Date(data.dates.min); date.setMonth(date.getMonth() + 6); return date; })() : null;
  const current = validUntil ? validUntil.getTime() > Date.now() : false;
  const total = !valid ? 2 : n >= MIN_CHART ? 5 : 4;
  const title = `Relatório de gestão · ${data.company || data.title}`;

  const dist = data.dist;
  /** Abaixo de 15 pessoas, nada de número: o tamanho vira palavra, para não permitir dedução. */
  const amount = (part: number) => n >= MIN_CHART ? `${inTen(part, n)} em 10` : part === 0 ? 'Ninguém' : part / n >= 0.5 ? 'A maioria' : part / n >= 0.3 ? 'Boa parte' : 'Poucos';
  const ranked = dist ? [...STYLES].sort((a, b) => dist.primary[b] - dist.primary[a] || dist.secondary[b] - dist.secondary[a]) : STYLES;
  const top = ranked[0], gap = ranked[ranked.length - 1];
  const presence = (style: Style) => dist ? dist.primary[style] + dist.secondary[style] : 0;
  const coverage = (style: Style) => !dist ? 'Parcial' : dist.primary[style] / n >= 0.2 ? 'Coberta' : dist.primary[style] === 0 && dist.secondary[style] / n < 0.2 ? 'Descoberta' : 'Parcial';
  const changed = dist ? dist.pressure.one + dist.pressure.many : 0;
  const highPressure = dist ? changed / n >= 0.3 : false;
  const mostUp = dist ? [...STYLES].sort((a, b) => dist.pressure.up[b] - dist.pressure.up[a])[0] : top;
  const mostDown = dist ? [...STYLES].sort((a, b) => dist.pressure.down[b] - dist.pressure.down[a])[0] : top;
  const concentrated = split(STYLE_CONTENT[top].evaluator.teamConcentrated);
  const missingRaw = split(STYLE_CONTENT[gap].evaluator.teamMissing);
  const missing = { ...missingRaw, consequence: dist && dist.primary[gap] > 0 ? missingRaw.consequence.replace('Ninguém com preferência', 'Pouca gente com preferência') : missingRaw.consequence };
  const strengths = dist ? [...STYLES].sort((a, b) => presence(b) - presence(a)).slice(0, 2) : [];

  const decisions = [
    { decision: `Equilibrar o desenho da equipe: a concentração em ${STYLE_CONTENT[top].name} reforça sempre o mesmo instinto.`, owner: 'Diretoria', check: concentrated.question },
    { decision: `Usar ${STYLE_CONTENT[gap].name} como critério da próxima contratação ou da próxima formação de ${sector.unit}.`, owner: 'RH e liderança da área', check: missing.question },
    highPressure
      ? { decision: 'Revisar meta, prazo e forma de cobrança nos picos do mês.', owner: 'Liderança direta', check: 'Quais metas do próximo mês concentram a cobrança, e quem acompanha o desgaste do time?' }
      : { decision: 'Manter o ritmo de cobrança e acompanhar o desgaste nos picos.', owner: 'Liderança direta', check: 'Como você vai saber que o time chegou ao limite antes de alguém parar?' },
  ];

  const coverageBlock = dist ? <>
    <small className="cpr-eyebrow">COBERTURA DAS QUATRO FUNÇÕES</small>
    <table className="cpr-matrix"><thead><tr><th>Função de que a operação precisa</th><th>No time</th></tr></thead><tbody>
      {STYLES.map((style) => <tr key={style}><td className="cpr-style-cell" style={{ color: STYLE_CONTENT[style].ink }}><b>{FUNCTION[style]}</b></td><td><span className={`cgr-cover ${coverage(style) === 'Coberta' ? 'ok' : coverage(style) === 'Descoberta' ? 'gap' : ''}`}>{coverage(style)}</span></td></tr>)}
    </tbody></table>
    {n >= MIN_CHART && <p className="cpr-note">Função descoberta é ponto cego permanente do desenho da equipe, não falha de alguém: vira critério de próxima contratação.</p>}
  </> : null;

  const configurationBlock = dist ? <>
        <small className="cpr-eyebrow">ONDE ESTA CONFIGURAÇÃO AJUDA E ONDE TRAVA</small>
        <div className="cpr-grid2">
          <div><strong className="cpr-sub">O que o time faz bem</strong><ul className="cpr-list good">{strengths.map((style) => <li key={style}><b>{STYLE_CONTENT[style].evaluator.roleFavors[0]}.</b> Consequência: mais {STYLE_CONTENT[style].verb === 'resolve' ? 'velocidade de decisão' : STYLE_CONTENT[style].verb === 'conecta' ? 'engajamento e comunicação' : STYLE_CONTENT[style].verb === 'sustenta' ? 'constância e retenção' : 'qualidade e menos retrabalho'} na rotina de {sector.flow}.</li>)}</ul></div>
          <div><strong className="cpr-sub">O que o time não faz</strong><ul className="cpr-list warn"><li><b>{STYLE_CONTENT[gap].evaluator.roleFavors[0]}.</b> Consequência: {missing.consequence.replace(/\.$/, '').toLowerCase()}.</li><li><b>Contraponto a {STYLE_CONTENT[top].name}.</b> Consequência: {concentrated.consequence.replace(/\.$/, '').toLowerCase()}.</li></ul></div>
        </div>
        {n >= MIN_CHART && coverageBlock}
        <small className="cpr-eyebrow">COMO O TIME REAGE SOB PRESSÃO</small>
        <div className="cgr-pressure">
          <i style={{ flex: Math.max(dist.pressure.stable, 0.001) }} className="stable" /><i style={{ flex: Math.max(dist.pressure.one, 0.001) }} className="one" /><i style={{ flex: Math.max(dist.pressure.many, 0.001) }} className="many" />
        </div>
        <div className="cgr-pressure-legend"><span><i className="stable" />Muda pouco · {amount(dist.pressure.stable).toLowerCase()}</span><span><i className="one" />Muda em um estilo · {amount(dist.pressure.one).toLowerCase()}</span><span><i className="many" />Muda em mais de um · {amount(dist.pressure.many).toLowerCase()}</span></div>
        <p>{dist.pressure.up[mostUp] > 0 ? `Quando aperta, o que mais cresce no grupo é ${STYLE_CONTENT[mostUp].name}: ${STYLE_CONTENT[mostUp].pressureUp.replace('Na semana difícil, ', '').toLowerCase()}` : 'Quando aperta, nenhum estilo cresce de forma marcante no grupo.'} {dist.pressure.down[mostDown] > 0 ? `O que mais recua é ${STYLE_CONTENT[mostDown].name}: ${STYLE_CONTENT[mostDown].pressureDown.replace('Na semana difícil, ', '').toLowerCase()}` : ''}</p>
        <div className="cpr-callout"><b>O que isso pede da liderança.</b> {highPressure ? 'Sinalizar com antecedência os picos, combinar prioridade por escrito e acompanhar quem segura mais carga.' : 'Manter a cobrança com clareza de prioridade e observar o desgaste de quem não reclama.'}</div>
  </> : null;

  return <div className="cali-profile-report cali-gestao-report">
    <Page number={1} total={total} title={title} cover>
      <div className="cpr-cover-top"><img className="cpr-cover-logo" src="/brand/cali-logo-light.png" alt="CALI RH" width={126} height={70} /><span>RELATÓRIO DE GESTÃO</span></div>
      <div className="cpr-cover-main">
        <small>PERFIL COMPORTAMENTAL · LEITURA DO TIME</small>
        <h1>{data.company || data.title}</h1>
        <p>{data.title}</p>
        <div className="cgr-cover-stats">
          <div><strong>{n}</strong><span>{n === 1 ? 'pessoa respondeu' : 'pessoas responderam'}</span></div>
          <div><strong>{rate === null ? '—' : `${rate}%`}</strong><span>taxa de resposta</span></div>
          <div><strong>{readAt}</strong><span>data da leitura</span></div>
        </div>
        {validUntil && <span className={`cgr-validity ${current ? 'on' : ''}`}>{current ? `Vigente até ${day(validUntil.toISOString())}` : 'Vencido: reabra a leitura antes de decidir'}</span>}
      </div>
      <div className="cpr-cover-foot"><span>{data.moment ? `Momento: ${MOMENTS[data.moment] || data.moment}` : 'Uso restrito à liderança'}</span><span>{NATURE}</span></div>
    </Page>

    <Page number={2} total={total} title={title}>
      <small className="cpr-eyebrow">O QUE SABER EM 60 SEGUNDOS</small>
      <h2>As três manchetes</h2>
      {!valid ? <Alert title={`A leitura do time aparece a partir de ${MIN_READ} respostas.`}>Hoje são {n}. Com menos pessoas, qualquer número revelaria o perfil de alguém. Assim que o grupo completar {MIN_READ} respostas, as manchetes, o gráfico e as decisões aparecem aqui.</Alert>
        : !goal ? <Alert title="Falta o resultado que a empresa persegue.">Sem ele não há manchete: o relatório só liga comportamento a consequência quando sabe o que a empresa quer alcançar. A CALI preenche este campo a partir do diagnóstico.</Alert>
        : <>
          <p className="cgr-goal">Resultado que a empresa persegue: <b>{goal}</b>{data.moment ? <> · momento de <b>{(MOMENTS[data.moment] || data.moment).toLowerCase()}</b></> : null}.</p>
          {rate !== null && rate < 80 && <Alert title={`Taxa de resposta de ${rate}%.`}>Abaixo de 80%, a leitura pode não representar o time inteiro. Vale ajustar o convite e reabrir antes de tirar conclusões.</Alert>}
          <Headline number={amount(dist!.primary[top])} title={`${n >= MIN_CHART ? 'preferem' : 'prefere'} ${PREFERS[top]}.`}>{concentrated.consequence} Para {goal.charAt(0).toLowerCase() + goal.slice(1)}, isso pede atenção a quem faz o contraponto.</Headline>
          <Headline number={amount(dist!.primary[gap])} title={`${n >= MIN_CHART ? 'têm' : 'tem'} ${STYLE_CONTENT[gap].name} como estilo predominante.`}>{missing.consequence} Na rotina de {sector.flow}, esse é um ponto cego permanente, não falha de alguém.</Headline>
          <Headline number={amount(changed)} title={`${n >= MIN_CHART ? 'mudam' : 'muda'} o jeito de agir quando o mês aperta.`}>{highPressure ? `Amplitude alta com cobrança alta é risco de ruptura. Antes de apertar a cobrança para ${goal.charAt(0).toLowerCase() + goal.slice(1)}, olhe meta, prazo e forma de cobrar.` : 'O time tende a manter o jeito de agir sob pressão: a cobrança pode subir sem mudar o comportamento, mas o desgaste acumula em silêncio.'}</Headline>
        </>}
    </Page>

    {valid && dist && <>
      <Page number={3} total={total} title={title}>
        <small className="cpr-eyebrow">{n >= MIN_CHART ? 'O TIME EM UM GRÁFICO' : 'O TIME'}</small>
        <h2>Como este time está distribuído</h2>
        {n >= MIN_CHART ? <>
          <div className="cgr-dist">{STYLES.map((style) => <div key={style} className="cgr-dist-row">
            <span style={{ color: STYLE_CONTENT[style].ink }}><b>{STYLE_CONTENT[style].name}</b><small>{FUNCTION[style]}</small></span>
            <div className="cgr-dist-track"><i style={{ width: `${(dist.primary[style] / n) * 100}%`, background: STYLE_CONTENT[style].color }} /><i className="soft" style={{ width: `${(dist.secondary[style] / n) * 100}%`, background: STYLE_CONTENT[style].color }} /></div>
            <em>cerca de {inTen(dist.primary[style], n)} em 10</em>
          </div>)}</div>
          <p className="cpr-note">Cor cheia: estilo predominante. Cor clara: estilo secundário. Leitura em faixas de "em cada 10", nunca em percentual exato.</p>
          <small className="cpr-eyebrow">INTENSIDADE DE CADA ESTILO NO GRUPO</small>
          <div className="cgr-bands">{STYLES.map((style) => { const band = dist.bands[style]; return <div key={style} className="cgr-band-row">
            <span style={{ color: STYLE_CONTENT[style].ink }}>{STYLE_CONTENT[style].name}</span>
            <div className="cgr-band-track"><i className="low" style={{ flex: Math.max(band.low, 0.001) }} /><i className="mid" style={{ flex: Math.max(band.mid, 0.001) }} /><i className="high" style={{ flex: Math.max(band.high, 0.001), background: STYLE_CONTENT[style].color }} /></div>
            <em>alta em {inTen(band.high, n)} de 10</em>
          </div>; })}</div>
          <div className="cgr-pressure-legend"><span><i className="cgr-sw low" />Baixa</span><span><i className="cgr-sw mid" />Moderada</span><span><i className="cgr-sw high" />Alta (cor do estilo)</span></div>
        </> : null}
        <div className="cpr-callout"><b>Leitura do conjunto.</b> O estilo que mais aparece é {STYLE_CONTENT[top].name} ({PREFERS[top]}); o que menos aparece é {STYLE_CONTENT[gap].name}. {dist.mixed >= Math.ceil(n / 3) ? 'Boa parte do grupo tem perfil misto, o que dá flexibilidade de repertório.' : 'A maioria tem um estilo predominante claro.'}</div>
        {data.moment && <p>{momentReading(data.moment, top)}</p>}
        {n < MIN_CHART && coverageBlock}
        {n < MIN_CHART && configurationBlock}
      </Page>

      {n >= MIN_CHART && <Page number={4} total={total} title={title}>
        {configurationBlock}
      </Page>}

      <Page number={total} total={total} title={title}>
        <small className="cpr-eyebrow">O QUE FAZER COM ISSO AGORA</small>
        <h2>Três decisões</h2>
        <ol className="cgr-decisions">{decisions.map((item, index) => <li key={index}><span>{index + 1}</span><div><b>{item.decision}</b><p><em>Dono sugerido:</em> {item.owner}</p><p><em>Pergunta de checagem:</em> {item.check}</p></div></li>)}</ol>
        <small className="cpr-eyebrow">NOTA DE MÉTODO</small>
        <p className="cpr-note">Autoavaliação de preferências comportamentais de trabalho (base DISC, método {data.dates.method || 'CALI'}), respondida por {n} {n === 1 ? 'pessoa' : 'pessoas'}{rate !== null ? ` (${rate}% dos convites)` : ''}. Leitura por faixa e por grupo: nenhum dado individual aparece aqui{n < MIN_CHART ? '; em grupos com menos de 15 pessoas a distribuição aparece em texto, sem número por estilo, para ninguém ser identificado' : ''}. Não serve para decidir contratação, promoção ou desligamento. {validUntil ? `Vale como leitura atual até ${day(validUntil.toISOString())}.` : ''}</p>
        <div className="cgr-sign"><p>Leia este relatório como um retrato do time neste momento, não como nota de ninguém. O que pede mais cuidado é a concentração em {STYLE_CONTENT[top].name} e o comportamento nos picos de cobrança. Na nossa próxima conversa, vamos transformar as três decisões em combinados com dono e data.</p><b>CALI RH</b></div>
      </Page>
    </>}
  </div>;
}
