/* Perfil Comportamental CALI — relatório do respondente (4 páginas, 2ª pessoa, sem nota) e relatório do avaliador
   (7 páginas, técnico, orientado a decisão). Páginas A4 (.cpr-page) — as mesmas viram o PDF. */
import type { ReactNode } from 'react';
import { adaptationLevel, bandOf, METHOD_VERSION, NATURAL_BLOCKS, PRESSURE_BLOCKS, STYLES, type Scores, type Style } from './profileMethod';
import { BAND_EXPLAIN, DISCLAIMER, STYLE_CONTENT, combinationOf } from './profileContent';
import { AdaptationMap, ProfileBandBars, ProfileRadar, RoleMatrix, type RoleProfile } from './ProfileCharts';
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

const PURPOSE: Record<string, string> = { selecao: 'Seleção', desenvolvimento: 'Desenvolvimento', diagnostico: 'Diagnóstico' };
const dateLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
const pcts = (scores: Scores, key: 'natural' | 'pressure' | 'natural6') => Object.fromEntries(STYLES.map((style) => [style, scores[key][style].pct])) as Record<Style, number>;

function Page({ children, number, total, title, cover }: { children: ReactNode; number: number; total: number; title: string; cover?: boolean }) {
  return <section className={`cpr-page${cover ? ' cpr-cover' : ''}`}>
    {cover && <img className="cpr-cover-leaf" src="/brand/cali-cover-leaf.png" alt="" aria-hidden="true" width={720} height={720} />}
    {!cover && <header className="cpr-head"><img src="/brand/cali-rh-bordo.png" alt="CALI RH" width={64} height={30} /><span>{title}</span></header>}
    <div className="cpr-body">{children}</div>
    {!cover && <footer className="cpr-foot"><span>CALI RH · HR for Business · calirh.com</span><span>{String(number).padStart(2, '0')} / {String(total).padStart(2, '0')}</span></footer>}
  </section>;
}

function profileTitle(result: ProfileResultView) {
  const p = STYLE_CONTENT[result.primary_style], s = STYLE_CONTENT[result.secondary_style];
  return result.mixed ? `${p.name} e ${s.name}` : p.name;
}

export function RespondentReport({ result }: { result: ProfileResultView }) {
  const p = STYLE_CONTENT[result.primary_style];
  const s = STYLE_CONTENT[result.secondary_style];
  const combo = combinationOf(result.primary_style, result.secondary_style);
  const natural = pcts(result.scores, 'natural');
  const total = 4;
  const title = 'Perfil Comportamental · seu relatório';
  return <div className="cali-profile-report">
    <Page number={1} total={total} title={title} cover>
      <div className="cpr-cover-top"><img className="cpr-cover-logo" src="/brand/cali-logo-light.png" alt="CALI RH" width={126} height={70} /><span>PERFIL COMPORTAMENTAL</span></div>
      <div className="cpr-cover-main">
        <small>RELATÓRIO PESSOAL</small>
        <h1>{result.person_name}</h1>
        <p>{[result.job_title, result.company_name].filter(Boolean).join(' · ')}</p>
        <div className="cpr-cover-profile" style={{ borderColor: p.color }}><span>Seu perfil</span><strong>{result.mixed ? 'Perfil misto' : p.name}</strong><em>{result.mixed ? `${p.name} e ${s.name}` : p.oneLiner}</em></div>
      </div>
      <div className="cpr-cover-foot"><span>{dateLabel(result.created_at)}</span><span>Leitura comportamental de triagem. Não é diagnóstico psicológico.</span></div>
    </Page>

    <Page number={2} total={total} title={title}>
      <small className="cpr-eyebrow">SEU PERFIL EM UMA FRASE</small>
      <h2 style={{ color: p.color }}>{result.mixed ? `Perfil misto: ${p.name} e ${s.name}` : p.name}</h2>
      <p className="cpr-lead">{p.oneLiner}</p>
      <p>{p.respondent.summary}</p>
      <div className="cpr-callout" style={{ borderColor: s.color }}><b>Seu traço secundário: {s.name}.</b> {combo?.text}{result.mixed ? ' Os dois estilos aparecem com força parecida: você transita entre eles conforme a situação.' : ''}</div>
      <small className="cpr-eyebrow">COMO VOCÊ APARECE NO GRÁFICO</small>
      <div className="cpr-chart-row"><ProfileRadar natural={natural} size={250} /><ProfileBandBars values={natural} /></div>
      <p className="cpr-note">{BAND_EXPLAIN} Ter um estilo baixo não é defeito: mostra o que você usa menos, não o que você não sabe fazer.</p>
      <p className="cpr-note">Vocabulário: no jeito de agir, um perfil com traço {p.temperament.toLowerCase()} ({p.temperamentWords}).</p>
    </Page>

    <Page number={3} total={total} title={title}>
      <small className="cpr-eyebrow">SUAS FORÇAS</small>
      <div className="cpr-grid2">{p.respondent.strengths.map((item) => <div className="cpr-card" key={item.title}><strong>{item.title}</strong><p>{item.example}</p></div>)}</div>
      <small className="cpr-eyebrow">SEU PONTO DE ATENÇÃO</small>
      <div className="cpr-callout attention"><b>{p.respondent.attention.name}.</b> {p.respondent.attention.text}</div>
      <small className="cpr-eyebrow">COMO VOCÊ DECIDE, COMUNICA E REAGE</small>
      <div className="cpr-three">
        <div><strong>Decide</strong><p>{p.respondent.decides}</p></div>
        <div><strong>Comunica</strong><p>{p.respondent.communicates}</p></div>
        <div><strong>Reage sob pressão</strong><p>{p.respondent.reacts}</p></div>
      </div>
    </Page>

    <Page number={4} total={total} title={title}>
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
      <small className="cpr-eyebrow">DICAS PARA O PRÓXIMO TRIMESTRE</small>
      <ol className="cpr-tips">{p.respondent.tips.map((tip) => <li key={tip}>{tip}</li>)}</ol>
      <div className="cpr-disclaimer"><b>Importante.</b> {DISCLAIMER} Você pode pedir acesso ao seu resultado e à explicação do método a qualquer momento: privacidade@calirh.com.</div>
    </Page>
  </div>;
}

export function EvaluatorReport({ result, team, editableRole, onRoleChange }: { result: ProfileResultView; team?: Array<{ primary_style: Style }>; editableRole?: boolean; onRoleChange?: (role: RoleProfile) => void }) {
  const p = STYLE_CONTENT[result.primary_style];
  const s = STYLE_CONTENT[result.secondary_style];
  const combo = combinationOf(result.primary_style, result.secondary_style);
  const natural = pcts(result.scores, 'natural');
  const pressure = pcts(result.scores, 'pressure');
  const natural6 = pcts(result.scores, 'natural6');
  const adaptation = result.scores.adaptation;
  const role = result.role_profile || {};
  const total = 7;
  const title = `Perfil Comportamental · ${result.person_name}`;
  const biggest = [...STYLES].sort((a, b) => Math.abs(adaptation[b]) - Math.abs(adaptation[a]))[0];
  const roleGaps = STYLES.filter((style) => role[style]).map((style) => ({ style, asked: role[style] as string, gives: bandOf(natural[style]) }));
  const roleSummary = !roleGaps.length ? 'Perfil da função ainda não definido — preencha a matriz de papel (página 5).' : roleGaps.every((gap) => gap.asked === gap.gives) ? 'Alinhado ao que a função pede nos estilos definidos.' : `Diferenças em ${roleGaps.filter((gap) => gap.asked !== gap.gives).map((gap) => STYLE_CONTENT[gap.style].name).join(', ')} (ver página 5).`;
  const teamCount = (team || []).reduce<Record<Style, number>>((acc, item) => ({ ...acc, [item.primary_style]: acc[item.primary_style] + 1 }), { D: 0, I: 0, S: 0, C: 0 });
  const teamTotal = STYLES.reduce((sum, style) => sum + teamCount[style], 0);
  const teamDominant = teamTotal ? [...STYLES].sort((a, b) => teamCount[b] - teamCount[a])[0] : null;
  const teamTop = teamTotal ? STYLES.filter((style) => teamCount[style] === teamCount[teamDominant!]) : [];

  return <div className="cali-profile-report">
    <Page number={1} total={total} title={title} cover>
      <div className="cpr-cover-top"><img className="cpr-cover-logo" src="/brand/cali-logo-light.png" alt="CALI RH" width={126} height={70} /><span>PERFIL COMPORTAMENTAL · AVALIADOR</span></div>
      <div className="cpr-cover-main">
        <small>RELATÓRIO PARA A LIDERANÇA · USO RESTRITO</small>
        <h1>{result.person_name}</h1>
        <p>{[result.job_title, result.company_name].filter(Boolean).join(' · ')}</p>
        <div className="cpr-cover-profile" style={{ borderColor: p.color }}><span>Perfil</span><strong>{profileTitle(result)}</strong><em>{combo?.name}</em></div>
      </div>
      <div className="cpr-cover-foot"><span>{dateLabel(result.created_at)} · Contexto: {PURPOSE[result.purpose || ''] || 'Não informado'}</span><span>Método {result.method_version || METHOD_VERSION}</span></div>
    </Page>

    <Page number={2} total={total} title={title}>
      <small className="cpr-eyebrow">SÍNTESE PARA DECISÃO</small>
      <ol className="cpr-synthesis">
        <li><b>Perfil:</b> {result.mixed ? `misto ${p.name}/${s.name}` : `${p.name} com traço ${s.name}`} — {p.evaluator.synthesis}</li>
        <li><b>Aderência ao papel:</b> {roleSummary}</li>
        <li><b>Risco principal:</b> {p.evaluator.risks[0].risk}. Sinal precoce: {p.evaluator.risks[0].signal.toLowerCase()}</li>
        <li><b>Sob pressão:</b> maior mudança em {STYLE_CONTENT[biggest].name} ({adaptation[biggest] > 0 ? '+' : ''}{adaptation[biggest]}, {adaptationLevel(adaptation[biggest])}). {adaptation[biggest] >= 0 ? STYLE_CONTENT[biggest].pressureUp : STYLE_CONTENT[biggest].pressureDown}</li>
        <li><b>Aprofundar na entrevista:</b> {p.evaluator.interview[0]}</li>
      </ol>
      <small className="cpr-eyebrow">PERFIL PREDOMINANTE E SECUNDÁRIO</small>
      <h2 style={{ color: p.color }}>{combo?.name} <span className="cpr-h2-sub">({result.primary_style}+{result.secondary_style})</span></h2>
      <p>{combo?.text}</p>
      {result.mixed && <div className="cpr-callout">Perfil misto: {p.name} e {s.name} ficaram a menos de 5 pontos. Leia os dois estilos como igualmente presentes.</div>}
      <div className="cpr-grid2"><div className="cpr-card"><strong>{p.name} (predominante)</strong><p>{p.respondent.summary}</p></div><div className="cpr-card"><strong>{s.name} (secundário)</strong><p>{s.respondent.summary}</p></div></div>
    </Page>

    <Page number={3} total={total} title={title}>
      <small className="cpr-eyebrow">CHAVE NATURAL × CHAVE SOB PRESSÃO</small>
      <div className="cpr-chart-row"><ProfileRadar natural={natural6} pressure={pressure} size={270} />
        <div className="cpr-legend-box"><p><i className="solid" /> Dia comum (os mesmos {PRESSURE_BLOCKS.length} blocos)</p><p><i className="dash" /> Semana difícil</p><p className="cpr-note">A diferença entre as duas linhas é a adaptação: o quanto a pessoa muda o jeito de agir quando há cobrança e prazo curto.</p></div></div>
      <small className="cpr-eyebrow">MAPA DE ADAPTAÇÃO</small>
      <AdaptationMap adaptation={adaptation} />
      <ul className="cpr-readings">{STYLES.filter((style) => Math.abs(adaptation[style]) >= 15).map((style) => <li key={style}><b style={{ color: STYLE_CONTENT[style].color }}>{STYLE_CONTENT[style].name} ({adaptationLevel(adaptation[style])}):</b> {adaptation[style] > 0 ? STYLE_CONTENT[style].pressureUp : STYLE_CONTENT[style].pressureDown}</li>)}
        {!STYLES.some((style) => Math.abs(adaptation[style]) >= 15) && <li>Pouca mudança sob pressão: o comportamento tende a ser o mesmo em dias comuns e em semanas difíceis.</li>}</ul>
      <p className="cpr-note">Versão enxuta: a chave sob pressão usa {PRESSURE_BLOCKS.length} blocos; a comparação é feita contra os mesmos blocos na chave natural. Diferenças abaixo de 15 pontos são leves.</p>
    </Page>

    <Page number={4} total={total} title={title}>
      <small className="cpr-eyebrow">FAIXAS DE INTENSIDADE (CHAVE NATURAL, {NATURAL_BLOCKS} BLOCOS)</small>
      <ProfileBandBars values={natural} compare={undefined} />
      <ul className="cpr-readings">{STYLES.map((style) => { const band = bandOf(natural[style]); return <li key={style}><b style={{ color: STYLE_CONTENT[style].color }}>{STYLE_CONTENT[style].name} · {band}:</b> {band === 'Alto' || band === 'Muito alto' ? STYLE_CONTENT[style].bandHigh : band === 'Baixo' ? STYLE_CONTENT[style].bandLow : 'Uso situacional: aparece quando o contexto pede, sem ser o modo preferido.'}</li>; })}</ul>
      <p className="cpr-note">{BAND_EXPLAIN}</p>
      <small className="cpr-eyebrow">CAMADA DE TEMPERAMENTO (VOCABULÁRIO)</small>
      <table className="cpr-matrix"><thead><tr><th>Estilo DISC</th><th>Temperamento</th><th>Palavras de leitura</th><th>Nesta pessoa</th></tr></thead><tbody>
        {STYLES.map((style) => <tr key={style}><td style={{ color: STYLE_CONTENT[style].color }}><b>{style}</b> {STYLE_CONTENT[style].name}</td><td>{STYLE_CONTENT[style].temperament}</td><td>{STYLE_CONTENT[style].temperamentWords}</td><td>{style === result.primary_style ? 'Base' : style === result.secondary_style ? 'Traço' : bandOf(natural[style])}</td></tr>)}
      </tbody></table>
      <p className="cpr-note">Temperamento é usado só como linguagem de leitura, a partir do DISC. Não é escore independente e não tem hierarquia. A mistura é a regra, não a exceção.</p>
    </Page>

    <Page number={5} total={total} title={title}>
      <small className="cpr-eyebrow">LEITURA DE PAPEL</small>
      <RoleMatrix values={natural} role={role} editable={editableRole} onChange={onRoleChange} />
      <div className="cpr-grid2">
        <div><strong className="cpr-sub">Favorece</strong><ul className="cpr-list good">{p.evaluator.roleFavors.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><strong className="cpr-sub">Exige apoio em</strong><ul className="cpr-list warn">{p.evaluator.roleNeedsSupport.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </div>
      <small className="cpr-eyebrow">LEITURA DE TIME</small>
      {teamTotal > 1 ? <>
        <div className="cpr-team">{STYLES.map((style) => <div key={style}><span style={{ color: STYLE_CONTENT[style].color }}>{STYLE_CONTENT[style].name}</span><div><i style={{ width: `${(teamCount[style] / teamTotal) * 100}%`, background: STYLE_CONTENT[style].color }} /></div><b>{teamCount[style]}</b></div>)}</div>
        <p>{teamTop.length > 1 ? `No grupo avaliado não há um estilo dominante (${teamTop.map((style) => STYLE_CONTENT[style].name).join(' e ')} empatados); esta pessoa traz ${p.name}.` : teamDominant === result.primary_style ? `No grupo avaliado predomina o mesmo estilo (${STYLE_CONTENT[result.primary_style].name}): a pessoa reforça a característica do time; atenção ao que falta (${STYLES.filter((style) => !teamCount[style]).map((style) => STYLE_CONTENT[style].name).join(', ') || 'nenhum estilo ausente'}).` : `No grupo avaliado predomina ${STYLE_CONTENT[teamDominant!].name}; esta pessoa traz ${p.name}, um contraponto que complementa o time — e que pode gerar atrito se não for combinado.`} Base: {teamTotal} pessoas da mesma empresa que responderam.</p>
      </> : <p className="cpr-note">Ainda não há base de comparação: menos de duas pessoas da mesma empresa responderam.</p>}
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
      <small className="cpr-eyebrow">RISCOS DE GESTÃO</small>
      <table className="cpr-matrix"><thead><tr><th>Risco</th><th>Sinal precoce</th></tr></thead><tbody>{p.evaluator.risks.map((item) => <tr key={item.risk}><td>{item.risk}</td><td>{item.signal}</td></tr>)}</tbody></table>
      <div className="cpr-callout"><b>Traço secundário ({s.name}):</b> {s.evaluator.risks[0].risk.toLowerCase()} também pode aparecer. Sinal: {s.evaluator.risks[0].signal.toLowerCase()}</div>
    </Page>

    <Page number={7} total={total} title={title}>
      <small className="cpr-eyebrow">PERGUNTAS PARA A ENTREVISTA OU CONVERSA DE DESENVOLVIMENTO</small>
      <ol className="cpr-tips">{p.evaluator.interview.map((question) => <li key={question}>{question}</li>)}</ol>
      <small className="cpr-eyebrow">ANEXO · MÉTODO E DADOS</small>
      <table className="cpr-matrix cpr-data"><thead><tr><th>Estilo</th><th>Natural (pontos)</th><th>Natural (0–100)</th><th>Faixa</th><th>Pressão (0–100)</th><th>Adaptação</th></tr></thead><tbody>
        {STYLES.map((style) => <tr key={style}><td style={{ color: STYLE_CONTENT[style].color }}><b>{style}</b> {STYLE_CONTENT[style].name}</td><td>{result.scores.natural[style].raw > 0 ? '+' : ''}{result.scores.natural[style].raw}</td><td>{natural[style]}</td><td>{bandOf(natural[style])}</td><td>{pressure[style]}</td><td>{adaptation[style] > 0 ? '+' : ''}{adaptation[style]}</td></tr>)}
      </tbody></table>
      <p className="cpr-note">Instrumento {result.method_version || METHOD_VERSION}: {NATURAL_BLOCKS} blocos de 4 afirmações (72 itens) na chave natural e {PRESSURE_BLOCKS.length} blocos repetidos na chave sob pressão. Em cada bloco: +1 no estilo marcado como "mais" e −1 no marcado como "menos". Escala 0–100 com 50 como ponto neutro. Perfil misto quando os dois maiores estilos ficam a menos de 5 pontos. Respostas por item guardadas para recálculo.</p>
      <div className="cpr-disclaimer"><b>Limites.</b> {DISCLAIMER} Não é laudo e não serve como prova em processo nem como justificativa isolada de desligamento.</div>
    </Page>
  </div>;
}
