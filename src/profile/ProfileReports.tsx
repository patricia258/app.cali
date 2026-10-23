/* Perfil Comportamental CALI — relatório do respondente (8 páginas, 2ª pessoa) e relatório do avaliador (9 páginas, orientado
   a decisão), na estrutura do parecer de 23/10/2026. Páginas A4 (.cpr-page) — as mesmas viram o PDF.
   Regras de leitura: escore sempre com margem (±10 natural, ±18 semana difícil), faixa honesta ("no limite com"),
   adaptação em níveis (nunca em pontos) e o mesmo nome de perfil em todas as páginas. */
import type { ReactNode } from 'react';
import { adaptationOf, bandOf, bandText, blockItems, MARGIN, METHOD_VERSION, NATURAL_BLOCKS, PRESSURE_BLOCKS, rangeOf, STYLES, type Scores, type Style } from './profileMethod';
import { BAND_EXPLAIN, DISCLAIMER, NATURE, STYLE_CONTENT, VALIDITY, combinationOf, profileName } from './profileContent';
import { ProfileBandBars, ProfileRadar, RoleMatrix, TwinBands, type RoleProfile } from './ProfileCharts';
import './profile-report.css';

export type ProfileResultView = {
  id: string;
  person_name: string;
  company_name?: string | null;
  job_title?: string | null;
  purpose?: string | null;
  created_at: string;
  scores: Scores;
  primary_style: Style;
  secondary_style: Style;
  mixed: boolean;
  method_version?: string;
  role_profile?: RoleProfile | null;
};

/** Base interna de comparação (public.cali_profile_base): total de respostas e, a partir do mínimo, a distribuição do predominante. */
export type ProfileBase = { n: number; min: number; by_primary: Record<Style, number> | null };

const PURPOSE: Record<string, string> = { selecao: 'Seleção', desenvolvimento: 'Desenvolvimento', diagnostico: 'Diagnóstico' };
const TEAM_MIN = 5;
const dateLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
const pcts = (scores: Scores, key: 'natural' | 'pressure' | 'natural6') => Object.fromEntries(STYLES.map((style) => [style, scores[key][style].pct])) as Record<Style, number>;
const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '0');

function Page({ children, number, total, title, cover }: { children: ReactNode; number: number; total: number; title: string; cover?: boolean }) {
  return <section className={`cpr-page${cover ? ' cpr-cover' : ''}`}>
    {cover && <img className="cpr-cover-leaf" src="/brand/cali-cover-leaf.png" alt="" aria-hidden="true" width={720} height={720} />}
    {!cover && <header className="cpr-head"><img src="/brand/cali-rh-bordo.png" alt="CALI RH" width={64} height={30} /><span>{title}</span></header>}
    <div className="cpr-body">{children}</div>
    {!cover && <footer className="cpr-foot"><span>CALI RH · HR for Business · calirh.com</span><span>{String(number).padStart(2, '0')} / {String(total).padStart(2, '0')}</span></footer>}
  </section>;
}

/** Personagens do perfil (cartela DISC): sempre a dupla predominante + secundário, na ordem do perfil. */
function Characters({ result, height }: { result: ProfileResultView; height: number }) {
  const pair = `${result.primary_style}${result.secondary_style}`.toLowerCase();
  return <div className="cpr-chars"><img src={`/brand/disc-pair-${pair}.png`} alt={`${STYLE_CONTENT[result.primary_style].name} e ${STYLE_CONTENT[result.secondary_style].name}`} height={height} style={{ height }} /></div>;
}

function Alert({ title, children }: { title: string; children: ReactNode }) {
  return <div className="cpr-alert" role="note"><i aria-hidden="true">!</i><div><b>{title}</b><p>{children}</p></div></div>;
}

function baseLine(base: ProfileBase | null | undefined, primary: Style) {
  if (!base) return 'A base interna da CALI está em formação.';
  if (!base.by_primary || base.n < base.min) return `A base interna da CALI tem ${base.n} ${base.n === 1 ? 'resposta' : 'respostas'} até hoje e está em formação. A partir de ${base.min} respostas, o relatório passa a mostrar quão comum é cada estilo predominante.`;
  const share = Math.round((base.by_primary[primary] / base.n) * 100);
  return `A base interna da CALI tem ${base.n} respostas até hoje. ${share}% delas têm ${STYLE_CONTENT[primary].name} como estilo predominante.`;
}

export function RespondentReport({ result, base }: { result: ProfileResultView; base?: ProfileBase | null }) {
  const P = result.primary_style, S = result.secondary_style;
  const p = STYLE_CONTENT[P], s = STYLE_CONTENT[S];
  const natural = pcts(result.scores, 'natural');
  const pressure = pcts(result.scores, 'pressure');
  const adapt = adaptationOf(result.scores);
  const third = [...STYLES].filter((style) => style !== P && style !== S).sort((a, b) => natural[b] - natural[a])[0];
  const name = profileName(P, S, result.mixed);
  const raw = result.scores.natural[P].raw;
  const plan = result.mixed ? [p.respondent.plan[0], p.respondent.plan[1], s.respondent.plan[0]] : p.respondent.plan;
  const total = 8;
  const title = 'Perfil Comportamental · seu relatório';
  return <div className="cali-profile-report">
    <Page number={1} total={total} title={title} cover>
      <div className="cpr-cover-top"><img className="cpr-cover-logo" src="/brand/cali-logo-light.png" alt="CALI RH" width={126} height={70} /><span>PERFIL COMPORTAMENTAL</span></div>
      <div className="cpr-cover-main">
        <small>RELATÓRIO PESSOAL</small>
        <h1>{result.person_name}</h1>
        <p>{[result.job_title, result.company_name].filter(Boolean).join(' · ')}</p>
        <div className="cpr-cover-profile"><span>Seu perfil</span><strong>{name}</strong><em>{result.mixed ? 'Os dois estilos aparecem com força parecida.' : p.oneLiner}</em></div>
      </div>
      <div className="cpr-cover-chars"><Characters result={result} height={230} /></div>
      <div className="cpr-cover-foot"><span>{dateLabel(result.created_at)}</span><span>{NATURE}</span></div>
    </Page>

    <Page number={2} total={total} title={title}>
      <small className="cpr-eyebrow">SEU RESULTADO</small>
      <h2 style={{ color: p.ink }}>{name}</h2>
      <p>Todo mundo usa os quatro estilos. O resultado mostra <b>o quanto você prefere cada um</b> no seu dia a dia de trabalho.</p>
      <div className="cpr-chart-row"><ProfileRadar natural={natural} size={290} /><ul className="cpr-styles-line">{STYLES.map((style) => <li key={style}><b style={{ color: STYLE_CONTENT[style].ink }}>{style} · {STYLE_CONTENT[style].name}</b><span>{STYLE_CONTENT[style].verbLine}</span></li>)}</ul></div>
      <small className="cpr-eyebrow">SEUS QUATRO ESTILOS, COM A MARGEM DE LEITURA</small>
      <ProfileBandBars values={natural} margin={MARGIN.natural} />
      <p className="cpr-note"><b>Como ler:</b> o ponto é o seu escore; a faixa colorida em volta mostra onde ele provavelmente está (±{MARGIN.natural} pontos). Quando a faixa cruza a fronteira entre duas faixas, o relatório diz "no limite com". {BAND_EXPLAIN} Estilo baixo não é defeito: mostra o que você usa menos, não o que você não sabe fazer.</p>
    </Page>

    <Page number={3} total={total} title={title}>
      <small className="cpr-eyebrow">COMO SE CHEGOU AQUI</small>
      <h2>De onde vem o seu resultado</h2>
      <ol className="cpr-origin">
        <li><b>O que você respondeu.</b> {NATURAL_BLOCKS} blocos com 4 frases cada, uma de cada estilo: {NATURAL_BLOCKS * 4} frases, {NATURAL_BLOCKS} de cada estilo. Depois, {PRESSURE_BLOCKS.length} desses blocos de novo, pensando em uma semana difícil.</li>
        <li><b>Como cada marcação conta.</b> Em cada bloco, a frase que <b>mais</b> combina com você soma +1 ao estilo dela; a que <b>menos</b> combina soma −1. As outras duas ficam em 0.</li>
        <li><b>Como vira a escala de 0 a 100.</b> Somando os {NATURAL_BLOCKS} blocos, cada estilo fica entre −{NATURAL_BLOCKS} e +{NATURAL_BLOCKS}. A conta é (saldo + {NATURAL_BLOCKS}) ÷ {NATURAL_BLOCKS * 2} × 100. No seu {p.name}: saldo {signed(raw)} → ({signed(raw)} + {NATURAL_BLOCKS}) ÷ {NATURAL_BLOCKS * 2} × 100 = <b>{natural[P]}</b>.</li>
        <li><b>Por que quatro estilos e não um tipo.</b> Ninguém é um estilo só. A leitura mostra a intensidade de cada um; o predominante é o mais alto e o secundário, o segundo.</li>
        <li><b>A margem de leitura.</b> Um questionário curto tem imprecisão: ±{MARGIN.natural} pontos no dia comum e ±{MARGIN.pressure} na semana difícil (que tem só {PRESSURE_BLOCKS.length} blocos). Diferença menor que {MARGIN.natural} pontos entre dois estilos não é tratada como diferença: por isso, quando os dois maiores ficam a menos de {MARGIN.natural} pontos, o perfil é chamado de misto.</li>
        <li><b>Comparado a quê.</b> As faixas seguem uma regra fixa do método, não uma comparação com outras pessoas: o resultado compara os seus quatro estilos entre si. {baseLine(base, P)}</li>
      </ol>
      <small className="cpr-eyebrow">EXEMPLO: COMO UM BLOCO É CONTADO</small>
      <div className="cpr-block-demo">{blockItems(1).map((item) => { const mark = item.style === 'D' ? 'mais' : item.style === 'S' ? 'menos' : ''; return <div key={item.style} className={mark}>
        <span>{item.text}</span><em>{mark === 'mais' ? 'Mais' : mark === 'menos' ? 'Menos' : ''}</em><b style={{ color: STYLE_CONTENT[item.style].ink }}>{item.style} {mark === 'mais' ? '+1' : mark === 'menos' ? '−1' : '0'}</b>
      </div>; })}</div>
      <Alert title="Perfil é preferência média, não teto.">Ele mostra o jeito que você prefere usar, não o único jeito que você sabe usar. Você muda quando a situação pede, e a sua própria semana difícil mostra isso (página 5).</Alert>
      <small className="cpr-eyebrow">O QUE ESTA LEITURA NÃO MEDE</small>
      <p>Competência, desempenho, potencial, inteligência, caráter ou valores. Também não diz se você é adequado ou não a um cargo.</p>
    </Page>

    <Page number={4} total={total} title={title}>
      <small className="cpr-eyebrow">SEU PERFIL</small>
      <div className="cpr-profile-head"><Characters result={result} height={170} /><div><h2 style={{ color: p.ink }}>{name}</h2><p className="cpr-lead">{result.mixed ? `Você transita entre ${p.name} e ${s.name} conforme a situação.` : p.oneLiner}</p></div></div>
      <div className="cpr-grid2">
        {[P, S].map((style, index) => { const c = STYLE_CONTENT[style]; return <div className="cpr-card" key={style} style={{ borderTopColor: c.color }}>
          <span className="cpr-tag" style={{ background: c.soft, color: c.ink }}>{index === 0 ? (result.mixed ? 'Estilo 1' : 'Predominante') : (result.mixed ? 'Estilo 2' : 'Traço secundário')} · {c.name}</span>
          <p>{c.respondent.summary}</p>
          <p><b>Força:</b> {c.respondent.strengths[0].title.toLowerCase()}. <b>Custo:</b> {c.respondent.cost}</p>
          <p className="cpr-note"><b>Como os outros percebem:</b> {c.respondent.perceived}</p>
        </div>; })}
      </div>
      <small className="cpr-eyebrow">COMO VOCÊ DECIDE, COMUNICA E REAGE</small>
      <div className="cpr-three">
        <div><strong>Decide</strong><p>{p.respondent.decides}</p></div>
        <div><strong>Comunica</strong><p>{p.respondent.communicates}</p></div>
        <div><strong>Reage sob pressão</strong><p>{p.respondent.reacts}</p></div>
      </div>
      <p className="cpr-note">Vocabulário de apoio: no jeito de agir, {p.name} lembra o temperamento {p.temperament.toLowerCase()} ({p.temperamentWords}). É só linguagem, não é nota.</p>
    </Page>

    <Page number={5} total={total} title={title}>
      <small className="cpr-eyebrow">DIA COMUM E SEMANA DIFÍCIL</small>
      <h2>{adapt.level} sob pressão</h2>
      <TwinBands natural={natural} pressure={pressure} naturalMargin={MARGIN.natural} pressureMargin={MARGIN.pressure} />
      <ul className="cpr-readings">{adapt.changed.length ? adapt.changed.map(({ style, up }) => <li key={style}><b style={{ color: STYLE_CONTENT[style].ink }}>{STYLE_CONTENT[style].name}:</b> {up ? STYLE_CONTENT[style].pressureUp : STYLE_CONTENT[style].pressureDown}</li>)
        : <li>O seu jeito de agir tende a ser parecido em dias comuns e em semanas difíceis.</li>}</ul>
      <p className="cpr-note">Compare faixas, não números: a semana difícil tem só {PRESSURE_BLOCKS.length} blocos, por isso a margem é maior. Uma mudança só é apontada quando passa bem da margem.</p>
      <div className="cpr-grid2">
        <div><small className="cpr-eyebrow">O QUE TE DÁ ENERGIA</small><ul className="cpr-list good">{p.respondent.energy.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><small className="cpr-eyebrow">O QUE TE DESGASTA</small><ul className="cpr-list warn">{p.respondent.drains.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </div>
      <small className="cpr-eyebrow">COMO VOCÊ RENDE MELHOR</small>
      <dl className="cpr-dl">
        <div><dt>Ambiente</dt><dd>{p.respondent.thrives.ambiente}</dd></div>
        <div><dt>Liderança</dt><dd>{p.respondent.thrives.lideranca}</dd></div>
        <div><dt>Rotina</dt><dd>{p.respondent.thrives.rotina}</dd></div>
        <div><dt>Reconhecimento</dt><dd>{p.respondent.thrives.reconhecimento}</dd></div>
      </dl>
    </Page>

    <Page number={6} total={total} title={title}>
      <small className="cpr-eyebrow">O QUE TE FAVORECE</small>
      <div className="cpr-grid2">
        {p.respondent.strengths.map((item) => <div className="cpr-card" key={item.title} style={{ borderTopColor: p.color }}><span className="cpr-tag" style={{ background: p.soft, color: p.ink }}>{p.name}</span><strong>{item.title}</strong><p>{item.example}</p></div>)}
        {[S, third].map((style) => { const c = STYLE_CONTENT[style]; return <div className="cpr-card" key={style} style={{ borderTopColor: c.color }}><span className="cpr-tag" style={{ background: c.soft, color: c.ink }}>{c.name} · em outro contexto</span><strong>{c.respondent.contextStrength.title}</strong><p>{c.respondent.contextStrength.text}</p></div>; })}
      </div>
      <small className="cpr-eyebrow">O QUE EXIGE ATENÇÃO</small>
      {[P, S].map((style, index) => { const c = STYLE_CONTENT[style]; return <div className="cpr-callout attention" key={style}>
        <b>{c.respondent.attention.name}</b> <span className="cpr-tag" style={{ background: c.soft, color: c.ink }}>{index === 0 ? 'do seu estilo' : 'do seu traço'} {c.name}</span>
        <p>{c.respondent.attention.text}</p>
        <p className="cpr-signal"><b>Sinal de alerta:</b> {c.respondent.attention.signal}</p>
      </div>; })}
      <p className="cpr-note">Ponto de atenção não é defeito: é o lado da sua força que custa caro quando passa da medida.</p>
      <small className="cpr-eyebrow">PARA MOSTRAR À SUA LIDERANÇA: COMO TRABALHAR MELHOR COM VOCÊ</small>
      <dl className="cpr-dl">
        <div><dt>Comunicação</dt><dd>{p.evaluator.lead.comunicacao}</dd></div>
        <div><dt>Delegação</dt><dd>{p.evaluator.lead.delegacao}</dd></div>
        <div><dt>Feedback</dt><dd>{p.evaluator.lead.feedback}</dd></div>
      </dl>
    </Page>

    <Page number={7} total={total} title={title}>
      <small className="cpr-eyebrow">SEU PLANO DE 7 DIAS</small>
      <h2>Três ações para a próxima semana</h2>
      <p>Escolha a semana, anote a data de início e volte a esta página no sétimo dia com a pergunta de retorno de cada ação.</p>
      <ol className="cpr-plan">{plan.map((item, index) => <li key={item.action}>
        <span className="cpr-plan-n">{index + 1}</span>
        <div><p><b>Cenário:</b> {item.scenario}, {item.action}</p><p className="cpr-plan-meta"><b>Prazo:</b> 7 dias · <b>Pergunta de retorno:</b> {item.question}</p>
          <div className="cpr-plan-notes"><span>Comecei em ____/____</span><span>O que aconteceu:</span><i /><i /></div></div>
      </li>)}</ol>
      <div className="cpr-offer"><b>Converse sobre o resultado.</b><p>Ler sozinho muda pouco; conversar muda mais. Peça uma devolutiva a quem enviou o link ou à CALI RH: em 30 minutos, você confere se se reconhece no resultado e transforma o plano em combinados concretos.</p></div>
    </Page>

    <Page number={8} total={total} title={title}>
      <small className="cpr-eyebrow">LIMITES DESTA LEITURA</small>
      <Alert title="O que é este documento.">{NATURE}</Alert>
      <ul className="cpr-list">
        <li>É uma leitura das suas próprias respostas, em um momento. Se você não se reconhecer em algum ponto, isso também é informação: leve para a conversa de devolutiva.</li>
        <li>{VALIDITY}</li>
        <li>Não compara você com outras pessoas e não diz se você é melhor ou pior em alguma coisa.</li>
      </ul>
      <small className="cpr-eyebrow">GLOSSÁRIO RÁPIDO</small>
      <dl className="cpr-dl cpr-glossary">
        <div><dt>Saldo</dt><dd>Vezes em que o estilo foi marcado como "mais" menos as vezes em que foi marcado como "menos" (de −{NATURAL_BLOCKS} a +{NATURAL_BLOCKS}).</dd></div>
        <div><dt>Escore (0–100)</dt><dd>O saldo convertido para uma escala de 0 a 100; 50 é equilíbrio.</dd></div>
        <div><dt>Margem</dt><dd>A faixa em volta do escore onde ele provavelmente está: ±{MARGIN.natural} no dia comum e ±{MARGIN.pressure} na semana difícil.</dd></div>
        <div><dt>Predominante e secundário</dt><dd>Os dois estilos mais altos. Quando ficam a menos de {MARGIN.natural} pontos, o perfil é misto.</dd></div>
        <div><dt>Semana difícil</dt><dd>Os {PRESSURE_BLOCKS.length} blocos respondidos de novo pensando em cobrança e prazo curto. Leitura indicativa.</dd></div>
      </dl>
      <small className="cpr-eyebrow">SEUS DADOS</small>
      <dl className="cpr-dl">
        <div><dt>O que guardamos</dt><dd>Nome, e-mail, cargo, empresa (se informada), as suas marcações em cada bloco e os escores calculados.</dd></div>
        <div><dt>Para quê</dt><dd>Gerar e enviar o seu relatório e, quando o link veio de uma empresa, apoiar o desenvolvimento e a gestão do time.</dd></div>
        <div><dt>Quem vê</dt><dd>Você e a CALI RH. A liderança da sua empresa só vê se o link veio dela e a CALI liberar o relatório do avaliador.</dd></div>
        <div><dt>Seus direitos</dt><dd>Pedir acesso, correção, revisão da leitura ou exclusão dos seus dados a qualquer momento: privacidade@calirh.com.</dd></div>
      </dl>
      <div className="cpr-disclaimer static"><b>Importante.</b> {DISCLAIMER} Método {result.method_version || METHOD_VERSION}.</div>
    </Page>
  </div>;
}

export function EvaluatorReport({ result, team, base, editableRole, onRoleChange }: { result: ProfileResultView; team?: Array<{ primary_style: Style }>; base?: ProfileBase | null; editableRole?: boolean; onRoleChange?: (role: RoleProfile) => void }) {
  const P = result.primary_style, S = result.secondary_style;
  const p = STYLE_CONTENT[P], s = STYLE_CONTENT[S];
  const combo = combinationOf(P, S);
  const natural = pcts(result.scores, 'natural');
  const pressure = pcts(result.scores, 'pressure');
  const adapt = adaptationOf(result.scores);
  const role = result.role_profile || {};
  const name = profileName(P, S, result.mixed);
  const total = 8;
  const title = `Perfil Comportamental · ${result.person_name}`;
  const roleDefined = STYLES.some((style) => role[style]);
  const roleGaps = STYLES.filter((style) => role[style]).map((style) => ({ style, asked: role[style] as string, gives: bandOf(natural[style]) }));
  const ORDER = ['Baixo', 'Moderado', 'Alto', 'Muito alto'];
  const beyond = roleGaps.filter((gap) => ORDER.indexOf(gap.gives) - ORDER.indexOf(gap.asked) >= 1);
  const roleSummary = !roleDefined ? 'Perfil da função ainda não definido: preencha a matriz de papel (página 5) para ler a aderência.' : roleGaps.every((gap) => gap.asked === gap.gives) ? 'Alinhado ao que a função pede nos estilos definidos.' : `Diferenças em ${roleGaps.filter((gap) => gap.asked !== gap.gives).map((gap) => STYLE_CONTENT[gap.style].name).join(', ')} (ver página 5).`;
  const teamCount = (team || []).reduce<Record<Style, number>>((acc, item) => ({ ...acc, [item.primary_style]: acc[item.primary_style] + 1 }), { D: 0, I: 0, S: 0, C: 0 });
  const teamTotal = STYLES.reduce((sum, style) => sum + teamCount[style], 0);
  const concentrated = STYLES.filter((style) => teamTotal && teamCount[style] / teamTotal >= 0.5);
  const missing = STYLES.filter((style) => teamTotal && !teamCount[style]);

  return <div className="cali-profile-report">
    <Page number={1} total={total} title={title} cover>
      <div className="cpr-cover-top"><img className="cpr-cover-logo" src="/brand/cali-logo-light.png" alt="CALI RH" width={126} height={70} /><span>PERFIL COMPORTAMENTAL · AVALIADOR</span></div>
      <div className="cpr-cover-main">
        <small>RELATÓRIO PARA A LIDERANÇA · USO RESTRITO</small>
        <h1>{result.person_name}</h1>
        <p>{[result.job_title, result.company_name].filter(Boolean).join(' · ')}</p>
        <div className="cpr-cover-profile"><span>Perfil</span><strong>{name}</strong><em>Combinação {combo?.name}</em></div>
      </div>
      <div className="cpr-cover-chars"><Characters result={result} height={230} /></div>
      <div className="cpr-cover-foot"><span>{dateLabel(result.created_at)} · Contexto: {PURPOSE[result.purpose || ''] || 'Não informado'}</span><span>Método {result.method_version || METHOD_VERSION}</span></div>
    </Page>

    <Page number={2} total={total} title={title}>
      <small className="cpr-eyebrow">ANTES DE DECIDIR</small>
      <h2>Três perguntas de gestão</h2>
      <div className="cpr-ceo">{p.evaluator.ceo.map((item, index) => <div key={item.ask}><span>{index + 1}</span><p>{item.reflection}</p><p><b>Pergunte:</b> {item.ask}</p></div>)}</div>
      <Alert title="Este documento não decide sozinho.">Ele não autoriza concluir que a pessoa terá bom ou mau desempenho, que é apta ou inapta, nem que é melhor ou pior que outra. Contratação, promoção e desligamento pedem entrevista, histórico e evidência de trabalho.</Alert>
      <small className="cpr-eyebrow">SÍNTESE PARA DECISÃO</small>
      <ol className="cpr-synthesis">
        <li><b>Perfil:</b> {name}. {p.evaluator.synthesis}</li>
        <li><b>Aderência ao papel:</b> {roleSummary}</li>
        <li><b>Risco principal:</b> {p.evaluator.risks[0].risk}. Sinal precoce: {p.evaluator.risks[0].signal.toLowerCase()}</li>
        <li><b>Semana difícil:</b> {adapt.level.toLowerCase()}{adapt.changed.length ? ` (${adapt.changed.map((item) => STYLE_CONTENT[item.style].name).join(', ')}). ${adapt.changed[0].up ? STYLE_CONTENT[adapt.changed[0].style].pressureUp : STYLE_CONTENT[adapt.changed[0].style].pressureDown}` : '. O comportamento tende a ser parecido em dias comuns e em semanas difíceis.'}</li>
        <li><b>Aprofundar na conversa:</b> {p.evaluator.interview[0].question}</li>
      </ol>
    </Page>

    <Page number={3} total={total} title={title}>
      <small className="cpr-eyebrow">PERFIL PREDOMINANTE E SECUNDÁRIO</small>
      <div className="cpr-profile-head"><Characters result={result} height={150} /><div><h2 style={{ color: p.ink }}>{name}</h2><p className="cpr-lead">Combinação {combo?.name} ({P}+{S})</p></div></div>
      <p>{combo?.text}</p>
      {result.mixed && <div className="cpr-callout">Perfil misto: {p.name} ({natural[P]}) e {s.name} ({natural[S]}) ficaram a menos de {MARGIN.natural} pontos, dentro da margem de leitura. Leia os dois estilos como igualmente presentes.</div>}
      <div className="cpr-grid2">{[P, S].map((style, index) => { const c = STYLE_CONTENT[style]; return <div className="cpr-card" key={style} style={{ borderTopColor: c.color }}>
        <span className="cpr-tag" style={{ background: c.soft, color: c.ink }}>{index === 0 ? (result.mixed ? 'Estilo 1' : 'Predominante') : (result.mixed ? 'Estilo 2' : 'Secundário')} · {c.name}</span>
        <p>{c.evaluator.synthesis}</p>
        <p className="cpr-note"><b>Como costuma ser percebido:</b> {c.respondent.perceived.replace('Quem trabalha com você', 'Quem trabalha com a pessoa').replace('do que você pretende', 'do que pretende')}</p>
      </div>; })}</div>
      <small className="cpr-eyebrow">CAMADA DE TEMPERAMENTO (VOCABULÁRIO)</small>
      <table className="cpr-matrix"><thead><tr><th>Estilo DISC</th><th>Temperamento</th><th>Palavras de leitura</th><th>Nesta pessoa</th></tr></thead><tbody>
        {STYLES.map((style) => <tr key={style}><td className="cpr-style-cell" style={{ color: STYLE_CONTENT[style].ink }}><b>{style}</b> {STYLE_CONTENT[style].name}</td><td>{STYLE_CONTENT[style].temperament}</td><td>{STYLE_CONTENT[style].temperamentWords}</td><td>{bandText(natural[style], MARGIN.natural)}{style === P ? (result.mixed ? ' · estilo 1' : ' · predominante') : style === S ? (result.mixed ? ' · estilo 2' : ' · secundário') : ''}</td></tr>)}
      </tbody></table>
      <p className="cpr-note">Temperamento é só linguagem de leitura, derivada do DISC. Não tem base experimental, não é escore, não é nota e não descreve identidade.</p>
    </Page>

    <Page number={4} total={total} title={title}>
      <small className="cpr-eyebrow">FAIXAS DE INTENSIDADE (DIA COMUM, {NATURAL_BLOCKS} BLOCOS, ±{MARGIN.natural})</small>
      <ProfileBandBars values={natural} margin={MARGIN.natural} />
      <ul className="cpr-readings">{STYLES.map((style) => { const band = bandOf(natural[style]); return <li key={style}><b style={{ color: STYLE_CONTENT[style].ink }}>{STYLE_CONTENT[style].name} · {bandText(natural[style], MARGIN.natural)}:</b> {band === 'Alto' || band === 'Muito alto' ? STYLE_CONTENT[style].bandHigh : band === 'Baixo' ? STYLE_CONTENT[style].bandLow : 'Uso situacional: aparece quando o contexto pede, sem ser o modo preferido.'}</li>; })}</ul>
      <p className="cpr-note">{BAND_EXPLAIN}</p>
      <small className="cpr-eyebrow">DIA COMUM × SEMANA DIFÍCIL</small>
      <p className="cpr-lead">{adapt.level} sob pressão</p>
      <TwinBands natural={natural} pressure={pressure} naturalMargin={MARGIN.natural} pressureMargin={MARGIN.pressure} />
      <ul className="cpr-readings">{adapt.changed.length ? adapt.changed.map(({ style, up }) => <li key={style}><b style={{ color: STYLE_CONTENT[style].ink }}>{STYLE_CONTENT[style].name}:</b> {up ? STYLE_CONTENT[style].pressureUp : STYLE_CONTENT[style].pressureDown}</li>)
        : <li>Pouca mudança: o comportamento tende a ser o mesmo em dias comuns e em semanas difíceis.</li>}</ul>
      <p className="cpr-note">Leitura em níveis (muda pouco, muda em um estilo, muda em mais de um estilo), nunca em pontos. A semana difícil usa {PRESSURE_BLOCKS.length} blocos (margem ±{MARGIN.pressure}); a mudança é medida contra os mesmos {PRESSURE_BLOCKS.length} blocos no dia comum e só é apontada acima de 25 pontos. É leitura indicativa, não instrumento de decisão.</p>
    </Page>

    <Page number={5} total={total} title={title}>
      <small className="cpr-eyebrow">LEITURA DE PAPEL</small>
      {(editableRole || roleDefined) ? <RoleMatrix values={natural} margin={MARGIN.natural} role={role} editable={editableRole} onChange={onRoleChange} />
        : <p className="cpr-note">A matriz de papel aparece quando o avaliador define o que a função pede em cada estilo.</p>}
      <div className="cpr-callout"><b>Leitura ao contrário: o que custa caro nesta função.</b> {p.evaluator.costly}{beyond.length ? ` Nesta função, a pessoa traz mais ${beyond.map((gap) => STYLE_CONTENT[gap.style].name).join(' e ')} do que o papel pede: é capacidade que precisa de dono no time, ou vira atrito.` : ''}</div>
      <div className="cpr-grid2">
        <div><strong className="cpr-sub">A função tende a favorecer quando pede</strong><ul className="cpr-list good">{p.evaluator.roleFavors.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><strong className="cpr-sub">A função tende a tolerar mal quando pede</strong><ul className="cpr-list warn">{p.evaluator.roleNeedsSupport.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </div>
      <p><b style={{ color: s.ink }}>O {result.mixed ? 'outro estilo' : 'traço'} {s.name} também ajuda em:</b> {s.evaluator.roleFavors.join('; ').toLowerCase()}.</p>
      <small className="cpr-eyebrow">LEITURA DE TIME (CONCENTRAÇÃO, NÃO MÉDIA)</small>
      {teamTotal >= TEAM_MIN ? <>
        <div className="cpr-team">{STYLES.map((style) => <div key={style}><span style={{ color: STYLE_CONTENT[style].ink }}>{STYLE_CONTENT[style].name}</span><div><i style={{ width: `${(teamCount[style] / teamTotal) * 100}%`, background: STYLE_CONTENT[style].color }} /></div><b>{teamCount[style]}</b></div>)}</div>
        <ul className="cpr-readings">
          {concentrated.map((style) => <li key={`c${style}`}><b>Concentração em {STYLE_CONTENT[style].name}.</b> {STYLE_CONTENT[style].evaluator.teamConcentrated}</li>)}
          {missing.map((style) => <li key={`m${style}`}><b>Sem {STYLE_CONTENT[style].name}.</b> {STYLE_CONTENT[style].evaluator.teamMissing}</li>)}
          {!concentrated.length && !missing.length && <li>Os quatro estilos aparecem no grupo, sem concentração forte.</li>}
          <li>Esta pessoa traz {p.name}{teamCount[P] / teamTotal >= 0.5 ? ', o estilo que já concentra o grupo: reforça a característica do time.' : ', um contraponto ao que concentra o grupo: complementa, e pode gerar atrito se não for combinado.'}</li>
        </ul>
        <p className="cpr-note">Base: {teamTotal} pessoas da mesma empresa que responderam. Sem nota de "melhor equipe": a leitura mostra onde há buraco e onde há sobreposição.</p>
      </> : <p className="cpr-note">A leitura de time aparece a partir de {TEAM_MIN} pessoas da mesma empresa (proteção de privacidade). Hoje: {teamTotal}.</p>}
    </Page>

    <Page number={6} total={total} title={title}>
      <small className="cpr-eyebrow">COMO LIDERAR ESTA PESSOA</small>
      <dl className="cpr-dl">
        <div><dt>Comunicação</dt><dd>{p.evaluator.lead.comunicacao}</dd></div>
        <div><dt>Delegação</dt><dd>{p.evaluator.lead.delegacao}</dd></div>
        <div><dt>Feedback</dt><dd>{p.evaluator.lead.feedback}</dd></div>
        <div><dt>Reconhecimento</dt><dd>{p.evaluator.lead.reconhecimento}</dd></div>
        <div><dt>O que evitar</dt><dd>{p.evaluator.lead.evitar}</dd></div>
      </dl>
      <small className="cpr-eyebrow">RISCOS DE GESTÃO COM SINAL PRECOCE</small>
      <table className="cpr-matrix"><thead><tr><th>Risco</th><th>Sinal precoce</th></tr></thead><tbody>
        {p.evaluator.risks.map((item) => <tr key={item.risk}><td>{item.risk}</td><td>{item.signal}</td></tr>)}
        <tr><td><span className="cpr-tag" style={{ background: s.soft, color: s.ink }}>{result.mixed ? 'Estilo 2' : 'Traço'} {s.name}</span> {s.evaluator.risks[0].risk}</td><td>{s.evaluator.risks[0].signal}</td></tr>
      </tbody></table>
      <small className="cpr-eyebrow">ROTEIRO DA DEVOLUTIVA (30 MINUTOS)</small>
      <ol className="cpr-steps">
        <li><b>Abra pelo reconhecimento.</b> Pergunte em que parte do relatório a pessoa se reconheceu e em qual não. Comece pelo que ela traz.</li>
        <li><b>Leia junto o dia comum e a semana difícil.</b> Fale de situações e tarefas, não da personalidade: feedback sobre a pessoa piora o desempenho; sobre a tarefa, melhora.</li>
        <li><b>Feche com uma ação.</b> Escolham juntos uma das três ações do plano de 7 dias e marquem a conversa de retorno.</li>
      </ol>
    </Page>

    <Page number={7} total={total} title={title}>
      <small className="cpr-eyebrow">PERGUNTAS PARA A ENTREVISTA OU CONVERSA DE DESENVOLVIMENTO</small>
      <p>Cada pergunta testa uma hipótese do relatório. Anote o que a pessoa conta na última coluna e compare com as outras duas: isso transforma opinião em verificação e protege o avaliador do próprio viés.</p>
      <table className="cpr-matrix cpr-evidence"><thead><tr><th>Pergunta</th><th>Confirma a leitura</th><th>Contradiz a leitura</th><th>O que a pessoa contou</th></tr></thead><tbody>
        {p.evaluator.interview.map((item) => <tr key={item.question}><td>{item.question}</td><td>{item.confirms}</td><td>{item.denies}</td><td className="cpr-write" /></tr>)}
      </tbody></table>
      <div className="cpr-summary-box"><b>Síntese da conversa</b><div><span>O que confirmou</span><i /></div><div><span>O que contradisse</span><i /></div><div><span>Próximo passo combinado</span><i /></div></div>
    </Page>

    <Page number={8} total={total} title={title}>
      <small className="cpr-eyebrow">ANEXO · MÉTODO E DADOS</small>
      <table className="cpr-matrix cpr-data"><thead><tr><th>Estilo</th><th>Saldo (−18 a +18)</th><th>Dia comum (±{MARGIN.natural})</th><th>Faixa</th><th>Semana difícil (±{MARGIN.pressure})</th></tr></thead><tbody>
        {STYLES.map((style) => { const n = rangeOf(natural[style], MARGIN.natural), pr = rangeOf(pressure[style], MARGIN.pressure); return <tr key={style}><td className="cpr-style-cell" style={{ color: STYLE_CONTENT[style].ink }}><b>{style}</b> {STYLE_CONTENT[style].name}</td><td>{signed(result.scores.natural[style].raw)}</td><td>{natural[style]} ({n.lo}–{n.hi})</td><td>{bandText(natural[style], MARGIN.natural)}</td><td>{bandText(pressure[style], MARGIN.pressure)} ({pr.lo}–{pr.hi})</td></tr>; })}
      </tbody></table>
      <p className="cpr-note">Instrumento {result.method_version || METHOD_VERSION}: {NATURAL_BLOCKS} blocos de 4 afirmações ({NATURAL_BLOCKS * 4} itens) no dia comum e {PRESSURE_BLOCKS.length} blocos repetidos na semana difícil. Em cada bloco, +1 no estilo marcado como "mais" e −1 no marcado como "menos"; escala (saldo + {NATURAL_BLOCKS}) ÷ {NATURAL_BLOCKS * 2} × 100, com 50 como equilíbrio. Perfil misto quando os dois maiores ficam a menos de {MARGIN.natural} pontos. Adaptação em níveis, acima de 25 pontos nos mesmos blocos. Escores de escolha forçada comparam os estilos da pessoa entre si, não pessoas entre si. {baseLine(base, P)}</p>
      <small className="cpr-eyebrow">O QUE ESTE RELATÓRIO NÃO PODE AFIRMAR</small>
      <ul className="cpr-list">
        <li><b>Previsão de desempenho.</b> Não há evidência publicada de que o DISC preveja desempenho no trabalho; estudos independentes são poucos e, em geral, sem efeito (por exemplo, Moreno e Puertas, 2022: 3 correlações significativas entre 225 testadas). O relatório descreve preferência, não resultado.</li>
        <li><b>Decisão isolada.</b> Não serve como critério único de contratação, promoção ou desligamento, nem como prova em processo.</li>
        <li><b>Identidade.</b> Temperamento e estilo são linguagem de leitura, não rótulo da pessoa.</li>
      </ul>
      <small className="cpr-eyebrow">PRIVACIDADE</small>
      <p className="cpr-note">Perfil comportamental de pessoa identificada é dado pessoal (LGPD, art. 5º e art. 12, § 2º). Use apenas para a finalidade declarada no convite, não compartilhe fora da liderança envolvida e garanta à pessoa acesso, revisão e exclusão (privacidade@calirh.com). {VALIDITY.replace('você se posiciona', 'a pessoa se posiciona')}</p>
      <div className="cpr-disclaimer static"><b>Limites.</b> {DISCLAIMER}</div>
    </Page>
  </div>;
}
