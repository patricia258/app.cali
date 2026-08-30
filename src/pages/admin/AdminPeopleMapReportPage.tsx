import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Printer, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import '../../people-map-report.css';

type DiagnosticoV2 = {
  version?: number;
  d1?: { processos?: number[]; estrutura?: number[]; governanca?: number[] };
  d2?: { comportamento?: number[]; valores?: { cultura_decisao?: number | null; lista?: string[]; vividos?: string[]; desenvolver?: string }; desenvolvimento?: number[] };
  d3?: { indicadores?: number[]; decisao?: number[]; tecnologia?: number[] };
  d4?: { tamanho?: number[]; vinculos?: { gestao?: number | null; composicao?: Record<string, number | null> }; rotatividade?: number[] };
};

type MapaRecord = {
  id: string;
  created_at: string;
  protocolo: string;
  c_nome: string;
  c_empresa: string;
  c_cargo: string | null;
  c_email: string;
  observacoes: Record<string, string> | null;
  diagnostico_v2: DiagnosticoV2 | null;
  d1_rh_hoje: number | null;
  d1_processos: number | null;
  d1_cargos_salarios: number | null;
  d2_valores: number | null;
  d2_lideres_preparo: number | null;
  d2_comportamento_dono: number | null;
  d2_sucessao: number | null;
  d3_indicadores: number | null;
  d3_decisao: number | null;
  d3_custo: number | null;
  d4_colaboradores: number | null;
  d4_unidades: number | null;
  d4_turnover: number | null;
};

type Scores = { d1: number; d2: number; d3: number; d4: number };
type Subscores = Record<string, number | null>;

const WEIGHTS = { d1: .25, d2: .30, d3: .20, d4: .25 };
const DIMENSIONS = [
  { key: 'd1' as const, code: 'D1', name: 'Maturidade Estrutural' },
  { key: 'd2' as const, code: 'D2', name: 'Liderança & Cultura' },
  { key: 'd3' as const, code: 'D3', name: 'Dados & Decisão' },
  { key: 'd4' as const, code: 'D4', name: 'Dimensões Operacionais' },
];

const SUBLAYERS = [
  ['1.1','Processos e políticas formais','d1_processos','Mostra se o básico está documentado, atualizado e aplicado.'],
  ['1.2','Estrutura e clareza de papéis','d1_estrutura','Revela se hierarquia, responsabilidades e capacidade do RH acompanham a operação.'],
  ['1.3','Governança de gente','d1_governanca','Indica se decisões relevantes têm responsáveis claros, registro e continuidade.'],
  ['2.1','Comportamento de dono','d2_comportamento','Lê iniciativa, responsabilidade por resultado e cuidado com custo e qualidade.'],
  ['2.2','Fidelidade aos valores','d2_valores','Mostra se os valores realmente orientam comportamento, decisão e feedback.'],
  ['2.3','Desenvolvimento e sucessão','d2_desenvolvimento','Avalia continuidade da liderança, preparo e capacidade de assumir responsabilidades maiores.'],
  ['3.1','Indicadores acompanhados','d3_indicadores','Mostra se dados essenciais existem e entram regularmente na agenda executiva.'],
  ['3.2','Decisão ancorada em dado','d3_decisao','Revela se decisões de gente seguem uma referência comum, não apenas percepção individual.'],
  ['3.3','Tecnologia e IA','d3_tecnologia','Avalia o quanto ferramentas ampliam eficiência e qualidade das decisões.'],
  ['4.1','Tamanho e complexidade','d4_tamanho','Dimensiona o porte e a distribuição geográfica que a estrutura de People precisa suportar.'],
  ['4.2','Mix de vínculos e regimes','d4_vinculos','Mostra se diferentes relações de trabalho convivem com papéis e regras claros.'],
  ['4.3','Rotatividade e custo de gente','d4_rotatividade','Lê estabilidade do quadro e domínio do impacto financeiro de pessoas.'],
] as const;

function mean(values: Array<number | null | undefined>) {
  const valid = values.filter((v): v is number => v !== null && v !== undefined && Number.isFinite(Number(v))).map(Number);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}
function scale10(value: number) { return value * 2; }
function fmt(value: number) { return value.toFixed(1).replace('.', ','); }
function formatDate(value: string) { return new Date(value).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }); }

function calculateReading(record: MapaRecord): { scores: Scores; sub: Subscores; v2: DiagnosticoV2 | null } {
  const v2 = record.diagnostico_v2;
  if (v2?.version === 2 && v2.d1 && v2.d2 && v2.d3 && v2.d4) {
    const sub: Subscores = {
      d1_processos: scale10(mean(v2.d1.processos || [])), d1_estrutura: scale10(mean(v2.d1.estrutura || [])), d1_governanca: scale10(mean(v2.d1.governanca || [])),
      d2_comportamento: scale10(mean(v2.d2.comportamento || [])), d2_valores: scale10(Number(v2.d2.valores?.cultura_decisao || 0)), d2_desenvolvimento: scale10(mean(v2.d2.desenvolvimento || [])),
      d3_indicadores: scale10(mean(v2.d3.indicadores || [])), d3_decisao: scale10(mean(v2.d3.decisao || [])), d3_tecnologia: scale10(mean(v2.d3.tecnologia || [])),
      d4_tamanho: scale10(mean(v2.d4.tamanho || [])), d4_vinculos: scale10(Number(v2.d4.vinculos?.gestao || 0)), d4_rotatividade: scale10(mean(v2.d4.rotatividade || [])),
    };
    return { v2, sub, scores: {
      d1: mean([sub.d1_processos, sub.d1_estrutura, sub.d1_governanca]),
      d2: mean([sub.d2_comportamento, sub.d2_valores, sub.d2_desenvolvimento]),
      d3: mean([sub.d3_indicadores, sub.d3_decisao, sub.d3_tecnologia]),
      d4: mean([sub.d4_tamanho, sub.d4_vinculos, sub.d4_rotatividade]),
    }};
  }
  const scores = {
    d1: scale10(mean([record.d1_rh_hoje, record.d1_processos, record.d1_cargos_salarios])),
    d2: scale10(mean([record.d2_valores, record.d2_lideres_preparo, record.d2_comportamento_dono, record.d2_sucessao])),
    d3: scale10(mean([record.d3_indicadores, record.d3_decisao, record.d3_custo])),
    d4: scale10(mean([record.d4_colaboradores, record.d4_unidades, record.d4_turnover])),
  };
  return { scores, sub: {}, v2: null };
}

function dimensionText(key: keyof Scores, score: number, sub: Subscores) {
  const band = score < 4 ? 'baixo' : score < 7 ? 'medio' : 'alto';
  const texts = {
    d1: {
      baixo:'A empresa ainda depende demais da memória e da disponibilidade de poucas pessoas para fazer a gestão de gente funcionar. Quando cargos, fluxos e decisões não deixam rastros claros, qualquer ausência vira perda de continuidade e a expansão aumenta o improviso.',
      medio:'O começo existe, mas a casa ainda não funciona inteira sem esforço individual. Parte do essencial está formalizada e parte continua apoiada na experiência de quem conhece a operação. É o ponto em que organizar a base passa a ser condição para crescer sem retrabalho.',
      alto:'A base estrutural está consistente: responsabilidades, fluxos e decisões conseguem sobreviver à rotina e às mudanças de pessoas. O desafio deixa de ser criar o básico e passa a ser manter essa estrutura atualizada, simples e conectada ao ritmo do negócio.'
    },
    d2: {
      baixo:'A liderança ainda opera mais por reação do que por direção compartilhada. Valores, responsabilidade por resultado e continuidade de sucessão aparecem de forma irregular, o que faz a experiência do time depender muito de quem está conduzindo cada área.',
      medio:'Há sinais reais de cultura viva, mas eles não aparecem com a mesma força em todas as lideranças. A empresa já tem uma base valiosa; agora precisa transformar bons exemplos isolados em comportamento repetível, inclusive sob pressão e durante o crescimento.',
      alto:'Esta é uma força que vale proteger. As lideranças demonstram responsabilidade pelo negócio e os valores aparecem nas decisões, não apenas na comunicação. O próximo cuidado é garantir que essa cultura sobreviva à expansão e não dependa somente de alguns gestores muito bons.'
    },
    d3: {
      baixo:'As decisões de pessoas ainda nascem principalmente da percepção individual. Sem indicadores regulares, referências compartilhadas e ferramentas conectadas, a empresa demora mais para enxergar padrões e tende a descobrir o custo de uma decisão somente depois que ele aparece na operação.',
      medio:'A empresa já produz informação e acompanha parte dos indicadores, mas ainda existe distância entre medir e decidir. O avanço está em combinar o significado dos números, criar uma régua comum para as decisões e usar tecnologia para reduzir o trabalho manual da leitura.',
      alto:'Dados já participam de forma consistente das decisões de pessoas. Isso melhora a qualidade das escolhas e reduz diferenças de interpretação entre áreas. O próximo nível é integrar fontes, antecipar tendências e usar tecnologia para ampliar a capacidade de decisão, sem perder o olhar humano.'
    },
    d4: {
      baixo:'A operação ainda tem baixa previsibilidade sobre vínculos, rotatividade e custo de gente, ou a estrutura de People não acompanhou a complexidade já existente. Esse descompasso transforma temas cotidianos em risco operacional e consome energia que deveria estar voltada ao crescimento.',
      medio:'A complexidade operacional já é relevante e está parcialmente organizada. Porte, distribuição do time, vínculos e rotatividade pedem uma estrutura de gente mais coordenada. O foco agora é reduzir ambiguidades e tornar o custo de pessoas visível nas decisões do negócio.',
      alto:'A empresa demonstra maior domínio sobre a complexidade da operação: vínculos, distribuição do quadro, rotatividade e custo de gente são mais claros. O cuidado é manter a estrutura de People no mesmo ritmo da expansão para que escala não volte a produzir desorganização.'
    },
  } as const;
  const groups: Record<keyof Scores, Array<[string,string]>> = {
    d1:[['Processos e políticas formais','d1_processos'],['Estrutura e clareza de papéis','d1_estrutura'],['Governança de gente','d1_governanca']],
    d2:[['Comportamento de dono','d2_comportamento'],['Fidelidade aos valores','d2_valores'],['Desenvolvimento e sucessão','d2_desenvolvimento']],
    d3:[['Indicadores acompanhados','d3_indicadores'],['Decisão ancorada em dado','d3_decisao'],['Tecnologia e IA','d3_tecnologia']],
    d4:[['Tamanho e complexidade do time','d4_tamanho'],['Mix de vínculos e regimes','d4_vinculos'],['Rotatividade e custo de gente','d4_rotatividade']],
  };
  const entries = groups[key].map(([name, subKey]) => ({ name, value: sub[subKey] })).filter((item): item is {name:string;value:number} => Number.isFinite(item.value));
  let complement = '';
  if (entries.length) {
    const strongest = entries.reduce((a,b)=>b.value>a.value?b:a);
    const weakest = entries.reduce((a,b)=>b.value<a.value?b:a);
    complement = ` Dentro desta dimensão, ${strongest.name.toLowerCase()} aparece como a sustentação mais forte (${fmt(strongest.value)}/10), enquanto ${weakest.name.toLowerCase()} pede atenção primeiro (${fmt(weakest.value)}/10).`;
  }
  return texts[key][band] + complement;
}

function synthesis(scores: Scores) {
  const items = DIMENSIONS.map((d)=>({ ...d, value:scores[d.key] }));
  const strongest = items.reduce((a,b)=>b.value>a.value?b:a);
  const weakest = items.reduce((a,b)=>b.value<a.value?b:a);
  const gap = strongest.value - weakest.value;
  const balance = gap < 1.5
    ? 'O desenho é relativamente equilibrado: não existe uma única ponta isolada, então a evolução depende de movimentos coordenados.'
    : `Há um desequilíbrio de ${fmt(gap)} pontos entre a maior força e o principal ponto de atenção; essa distância explica por que algumas iniciativas avançam enquanto outras voltam a depender de esforço individual.`;
  return `${strongest.name} é hoje a principal sustentação da empresa (${fmt(strongest.value)}/10). ${weakest.name} é onde o próximo movimento tende a gerar mais efeito (${fmt(weakest.value)}/10). ${balance} A prioridade não é fazer tudo ao mesmo tempo, e sim usar a força existente para elevar a dimensão mais frágil sem perder o que já funciona.`;
}

function suggestedService(scores: Scores) {
  const maturity = (scores.d1 + scores.d2 + scores.d3) / 3;
  if (maturity < 5 && scores.d4 < 5) return 'Diagnóstico Executivo de People';
  if (maturity < 5 && scores.d4 >= 5) return 'Projeto de Cultura e Direção';
  if (maturity >= 5 && scores.d4 < 5) return 'Assessoria Estratégica Mensal — CALI Partner';
  return 'Assessoria Estratégica Mensal — CALI Full';
}

function serviceText(name: string) {
  if (name.includes('CALI Full')) return 'Uma atuação executiva mais ampla e contínua, conectando estratégia de pessoas, liderança, governança, indicadores e execução. A CALI entra como extensão estratégica da gestão, acompanhando prioridades e decisões ao longo do ciclo.';
  if (name.includes('CALI Partner')) return 'Uma assessoria recorrente para organizar prioridades, decisões e rituais de People com proximidade executiva. O foco é transformar o diagnóstico em agenda prática, com direção e acompanhamento sem criar uma estrutura pesada.';
  if (name.includes('Cultura')) return 'Um projeto direcionado para traduzir cultura em comportamentos, decisões, rituais e responsabilidades observáveis, conectando liderança e operação ao que a empresa precisa sustentar daqui para frente.';
  return 'Uma leitura aprofundada da operação, das lideranças e dos indicadores disponíveis para transformar o Mapa em uma agenda executiva de prioridades, riscos e próximos movimentos.';
}

function MatrixChart({scores}:{scores:Scores}) {
  const maturity = (scores.d1 + scores.d2 + scores.d3) / 3;
  const x = Math.min(94, Math.max(6, scores.d4 * 10));
  const y = Math.min(94, Math.max(6, maturity * 10));
  const quadrant = maturity < 5 ? (scores.d4 < 5 ? 'Embrionário' : 'Frágil') : (scores.d4 < 5 ? 'Em Estruturação' : 'Estratégico');
  return <div className="pmr-matrix-layout"><div className="pmr-matrix"><div className="pmr-quad q1"><b>Embrionário</b><span>baixa maturidade · baixa complexidade</span></div><div className="pmr-quad q2"><b>Frágil</b><span>baixa maturidade · alta complexidade</span></div><div className="pmr-quad q3"><b>Em Estruturação</b><span>alta maturidade · baixa complexidade</span></div><div className="pmr-quad q4"><b>Estratégico</b><span>alta maturidade · alta complexidade</span></div><span className="pmr-matrix-dot" style={{left:`calc(${x}% - 8px)`,top:`calc(${y}% - 8px)`}}/></div><div className="pmr-matrix-side"><p>Posição atual</p><strong>{quadrant}</strong>{DIMENSIONS.map((d)=><div className="pmr-bar" key={d.key}><span><b>{d.name}</b><em>{fmt(scores[d.key])}/10</em></span><i><u style={{width:`${scores[d.key]*10}%`}}/></i></div>)}</div></div>;
}

function RadarChart({scores}:{scores:Scores}) {
  const cx=300, cy=190, radius=112;
  const axes = [{key:'d1' as const,label:'Maturidade Estrutural',angle:-90},{key:'d2' as const,label:'Liderança & Cultura',angle:0},{key:'d3' as const,label:'Dados & Decisão',angle:90},{key:'d4' as const,label:'Dimensões Operacionais',angle:180}];
  const point=(value:number, angle:number)=>{const r=value/10*radius;const rad=angle*Math.PI/180;return [cx+r*Math.cos(rad),cy+r*Math.sin(rad)];};
  const polygon=axes.map((a)=>point(scores[a.key],a.angle).join(',')).join(' ');
  const min=Math.min(...axes.map((a)=>scores[a.key]));
  return <svg className="pmr-radar" viewBox="0 0 600 390" role="img" aria-label="Radar das quatro dimensões">{[.25,.5,.75,1].map((p)=><circle key={p} cx={cx} cy={cy} r={radius*p} fill="none" stroke="#b7a99a" strokeOpacity=".35"/>)}{axes.map((a)=>{const [x,y]=point(10,a.angle);return <line key={a.key} x1={cx} y1={cy} x2={x} y2={y} stroke="#b7a99a" strokeOpacity=".5"/>})}<polygon points={polygon} fill="rgba(90,30,45,.20)" stroke="#5A1E2D" strokeWidth="3"/>{axes.map((a)=>{const [x,y]=point(scores[a.key],a.angle);const [lx,ly]=point(12.2,a.angle);const anchor=a.angle===0?'start':a.angle===180?'end':'middle';return <g key={a.key}>{scores[a.key]===min&&<circle cx={x} cy={y} r="10" fill="none" stroke="#2B2B2B" strokeDasharray="2 2"/>}<circle cx={x} cy={y} r="6" fill="#B58C52" stroke="#5A1E2D" strokeWidth="2"/><text x={lx} y={ly} textAnchor={anchor} className="pmr-svg-label">{a.label}</text><text x={lx} y={ly+16} textAnchor={anchor} className="pmr-svg-value">{fmt(scores[a.key])}</text></g>})}</svg>;
}

function BubbleChart({scores}:{scores:Scores}) {
  const plot={x:72,y:25,w:430,h:185};
  const x=(weight:number)=>plot.x+(weight-.18)/(.14)*plot.w;
  const y=(value:number)=>plot.y+(10-value)/10*plot.h;
  const positions=[-18,22,-26,18];
  return <svg className="pmr-bubble" viewBox="0 0 600 270" role="img" aria-label="Peso estratégico por desempenho atual"><rect x={x(.20)} y={y(5)} width={plot.x+plot.w-x(.20)} height={plot.y+plot.h-y(5)} fill="#5A1E2D" fillOpacity=".05"/><text x={plot.x+plot.w-8} y={plot.y+plot.h-8} textAnchor="end" className="pmr-alert-label">ALERTA ESTRATÉGICO</text>{[0,2.5,5,7.5,10].map((v)=><g key={v}><line x1={plot.x} x2={plot.x+plot.w} y1={y(v)} y2={y(v)} stroke="#b7a99a" strokeOpacity=".25"/><text x={plot.x-12} y={y(v)+3} textAnchor="end" className="pmr-axis">{String(v).replace('.',',')}</text></g>)}{DIMENSIONS.map((d,index)=>{const weight=WEIGHTS[d.key];const cx=x(weight),cy=y(scores[d.key]),r=17+weight*52;const labelY=Math.max(14,Math.min(205,cy+positions[index]));const labelX=index%2===0?330:78;const anchorX=index%2===0?labelX:labelX+180;return <g key={d.key}><line x1={cx} y1={cy} x2={anchorX} y2={labelY+18} stroke="#5A1E2D" strokeOpacity=".5"/><circle cx={cx} cy={cy} r={r} fill={scores[d.key]===Math.min(...DIMENSIONS.map((item)=>scores[item.key]))?'#5A1E2D':'#B58C52'} fillOpacity=".82" stroke="#F7F3EE" strokeWidth="2"/><text x={cx} y={cy+3} textAnchor="middle" className="pmr-bubble-code">{d.code}</text><rect x={labelX} y={labelY} width="180" height="36" rx="5" fill="#F7F3EE" stroke="#5A1E2D" strokeOpacity=".25"/><text x={labelX+9} y={labelY+14} className="pmr-bubble-name">{d.code} · {d.name}</text><text x={labelX+9} y={labelY+28} className="pmr-axis">Peso {String(weight).replace('.',',')} · Desempenho {fmt(scores[d.key])}</text></g>})}<line x1={plot.x} x2={plot.x+plot.w} y1={plot.y+plot.h} y2={plot.y+plot.h} stroke="#2B2B2B"/><line x1={plot.x} x2={plot.x} y1={plot.y} y2={plot.y+plot.h} stroke="#2B2B2B"/><text x={plot.x+plot.w/2} y="250" textAnchor="middle" className="pmr-axis-title">Peso / importância</text><text x="18" y={plot.y+plot.h/2} textAnchor="middle" transform={`rotate(-90 18 ${plot.y+plot.h/2})`} className="pmr-axis-title">Desempenho atual</text></svg>;
}

function PageFooter(){return <div className="pmr-page-footer">CALI · MAPA DE PEOPLE</div>}

export function AdminPeopleMapReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record,setRecord] = useState<MapaRecord|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  useEffect(()=>{
    let active=true;
    async function load(){
      if(!supabase||!id){setError('Relatório sem identificador válido.');setLoading(false);return;}
      setLoading(true);setError('');
      const {data,error:rpcError}=await supabase.schema('public').rpc('workspace_mapa_people_records');
      if(!active)return;
      if(rpcError){setError(`Não foi possível carregar a resposta: ${rpcError.message}`);setLoading(false);return;}
      const found=((data||[]) as MapaRecord[]).find((item)=>item.id===id)||null;
      if(!found)setError('Resposta não encontrada no Mapa de People.');
      else setRecord(found);
      setLoading(false);
    }
    load();
    return()=>{active=false};
  },[id]);

  const reading=useMemo(()=>record?calculateReading(record):null,[record]);
  if(loading)return <div className="pmr-state"><RefreshCw className="spin"/>Carregando relatório integral…</div>;
  if(error||!record||!reading)return <div className="pmr-state pmr-error"><strong>Não foi possível abrir o relatório.</strong><span>{error}</span><button onClick={()=>navigate('/admin/mapa-de-people')}>Voltar ao Mapa</button></div>;

  const {scores,sub,v2}=reading;
  const obs=record.observacoes||{};
  const weakest=DIMENSIONS.map((d)=>({...d,value:scores[d.key]})).reduce((a,b)=>b.value<a.value?b:a);
  const strongest=DIMENSIONS.map((d)=>({...d,value:scores[d.key]})).reduce((a,b)=>b.value>a.value?b:a);
  const service=obs.servico_recomendado||suggestedService(scores);
  const parecer=obs.parecer||`Eu começaria por ${weakest.name}. É a dimensão que hoje cria a maior distância entre o que a operação exige e o que a gestão de pessoas consegue sustentar com previsibilidade. A proposta não é tratar essa frente isoladamente, mas usá-la como ponto de entrada para proteger ${strongest.name}, que já funciona como sustentação importante.`;
  const filename=`Mapa de People — Relatório — ${record.c_empresa||record.c_nome} — CALI RH — ${record.protocolo}`;

  function print(){const old=document.title;document.title=filename;window.print();setTimeout(()=>{document.title=old},500)}

  return <div className="people-map-report-shell">
    <div className="pmr-toolbar"><div><strong>CALI · Mapa de People</strong><span>Relatório integral no Workspace</span></div><div><button onClick={()=>navigate('/admin/mapa-de-people')}><ArrowLeft size={16}/>Painel do Mapa</button><a href={`https://mapa.calirh.com/relatorio.html?id=${encodeURIComponent(record.id)}`} target="_blank" rel="noreferrer">Comparar original<ExternalLink size={15}/></a><button className="primary" onClick={print}><Printer size={16}/>Imprimir / Salvar PDF</button></div></div>
    <main className="pmr-doc">
      <section className="pmr-page pmr-cover"><img src="/brand/cali-workspace-transparent.svg" className="pmr-logo" alt="CALI"/><div className="pmr-cover-kicker">Mapa de People</div><h1>Onde sua gestão de<br/>pessoas está hoje.</h1><p className="pmr-company">{record.c_empresa||record.c_nome}</p><div className="pmr-cover-meta"><div><span>Protocolo</span><strong>{record.protocolo}</strong></div><div><span>Data da leitura</span><strong>{formatDate(record.created_at)}</strong></div><div><span>Respondido por</span><strong>{record.c_nome}</strong></div><div><span>Elaborado por</span><strong>Patrícia Lima</strong></div></div></section>

      <section className="pmr-page pmr-letter"><div className="pmr-eyebrow">Antes de começar</div><h2>Uma leitura, não um formulário</h2><p className="pmr-subtitle">Sobre este relatório e como eu cheguei até estas conclusões</p><hr/><p className="pmr-dropcap">Recebi suas respostas e li cada uma com atenção — este não é um relatório automático. É a minha leitura, como People Advisory Executive, sobre onde a gestão de pessoas da sua empresa está hoje e o que precisa vir primeiro.</p><p>Cruzei o que você me contou com quatro dimensões que uso para entender a maturidade de uma operação: a estrutura que sustenta o dia a dia, a liderança e a cultura que fazem o time se mover, a forma como vocês decidem — com dado ou com instinto — e a complexidade operacional que você já carrega.</p><p>Nas próximas páginas, mostro esse resultado de duas formas: primeiro como uma posição num mapa de quadrantes, depois como um radar que revela o formato do problema. Ao final, aponto o caminho que faz mais sentido para o seu momento.</p><div className="pmr-sign"><img src="https://mapa.calirh.com/patricia-lima.webp" alt="Patrícia Lima"/><div><strong>Patrícia Lima</strong><span>People Advisory Executive · CALI RH</span></div></div><PageFooter/></section>

      <section className="pmr-page"><div className="pmr-eyebrow">Leitura executiva</div><h2>Onde a empresa aparece no mapa</h2><p className="pmr-subtitle">Maturidade da gestão × complexidade operacional</p><hr/><div className="pmr-score-box"><strong>{fmt((scores.d1+scores.d2+scores.d3)/3)}</strong><span>/10 de maturidade média</span><p>A complexidade operacional está em <b>{fmt(scores.d4)}/10</b>. O mapa cruza essas duas leituras para mostrar o tipo de estrutura que o negócio já exige.</p></div><MatrixChart scores={scores}/><PageFooter/></section>

      <section className="pmr-page"><div className="pmr-eyebrow">Leitura visual</div><h2>O formato do seu problema</h2><p className="pmr-subtitle">As quatro dimensões no mesmo radar</p><hr/><div className="pmr-score-box"><strong>{fmt(weakest.value)}</strong><span>/10</span><p><b>{weakest.name}</b> é a ponta mais frágil do radar — é ali que eu recomendo começar.</p></div><div className="pmr-radar-wrap"><RadarChart scores={scores}/><div className="pmr-radar-insights"><div><span>Maior força</span><strong>{strongest.name} · {fmt(strongest.value)}/10</strong></div><div><span>Ponto de atenção</span><strong>{weakest.name} · {fmt(weakest.value)}/10</strong></div></div></div><PageFooter/></section>

      <section className="pmr-page"><div className="pmr-eyebrow">Detalhe · 01</div><h2>O que está por trás de cada nota</h2><p className="pmr-subtitle">Estrutura, liderança e cultura</p><hr/><div className="pmr-dim-grid">{DIMENSIONS.slice(0,2).map((d)=><article className="pmr-dim-card" key={d.key}><header><strong>{d.code} · {d.name}</strong><b>{fmt(scores[d.key])}<small>/10</small></b></header><p>{dimensionText(d.key,scores[d.key],sub)}</p>{obs[`${d.key}_obs`]&&<div className="pmr-observation"><b>Observação da Patrícia</b><span>{obs[`${d.key}_obs`]}</span></div>}</article>)}</div><PageFooter/></section>

      <section className="pmr-page"><div className="pmr-eyebrow">Detalhe · 02</div><h2>Decisão e operação</h2><p className="pmr-subtitle">Como dados, tecnologia e complexidade se encontram</p><hr/><div className="pmr-dim-grid">{DIMENSIONS.slice(2).map((d)=><article className="pmr-dim-card" key={d.key}><header><strong>{d.code} · {d.name}</strong><b>{fmt(scores[d.key])}<small>/10</small></b></header><p>{dimensionText(d.key,scores[d.key],sub)}</p>{obs[`${d.key}_obs`]&&<div className="pmr-observation"><b>Observação da Patrícia</b><span>{obs[`${d.key}_obs`]}</span></div>}</article>)}</div><div className="pmr-synthesis"><h3>Uma leitura que amarra tudo</h3><p>{synthesis(scores)}</p></div><PageFooter/></section>

      <section className="pmr-page"><div className="pmr-eyebrow">Leitura profunda · 01</div><h2>Estrutura, liderança e cultura</h2><p className="pmr-subtitle">Seis subcamadas mostram exatamente onde a base sustenta — e onde ainda depende de esforço individual.</p><hr/><div className="pmr-sublayer-grid">{SUBLAYERS.slice(0,6).map(([code,name,key,description])=>{const value=sub[key];return <article key={code}><header><div><span>Subcamada {code}</span><strong>{name}</strong></div><b>{Number.isFinite(value)?fmt(Number(value)):'—'}/10</b></header><p>{description} {Number.isFinite(value)&&<em>{Number(value)<4?'Base ainda frágil.':Number(value)<7?'Estrutura parcial, com pontos de dependência.':'Base consistente e capaz de sustentar o crescimento.'}</em>}</p>{key==='d2_valores'&&v2?.d2?.valores&&<small>Valores mais vivos: {(v2.d2.valores.vividos||[]).join(', ')||'não destacados'}. Valor a desenvolver: {v2.d2.valores.desenvolver||'—'}.</small>}</article>})}</div><PageFooter/></section>

      <section className="pmr-page"><div className="pmr-eyebrow">Leitura profunda · 02</div><h2>Decisão, tecnologia e operação</h2><p className="pmr-subtitle">Seis subcamadas revelam a qualidade da decisão e o tamanho real da complexidade que o RH precisa suportar.</p><hr/><div className="pmr-sublayer-grid">{SUBLAYERS.slice(6).map(([code,name,key,description])=>{const value=sub[key];return <article key={code}><header><div><span>Subcamada {code}</span><strong>{name}</strong></div><b>{Number.isFinite(value)?fmt(Number(value)):'—'}/10</b></header><p>{description} {Number.isFinite(value)&&<em>{Number(value)<4?'Base ainda frágil.':Number(value)<7?'Estrutura parcial, com pontos de dependência.':'Base consistente e capaz de sustentar o crescimento.'}</em>}</p></article>})}</div><PageFooter/></section>

      <section className="pmr-page pmr-recommendation"><div className="pmr-eyebrow">Meu parecer</div><h2>O que eu faria primeiro</h2><hr/><p className="pmr-parecer">{parecer}</p><figure className="pmr-effort"><h3>Onde concentrar o esforço</h3><p>Peso estratégico em relação ao desempenho de cada dimensão.</p><BubbleChart scores={scores}/><figcaption>Quanto mais à direita e mais abaixo, maior a necessidade de atenção. O tamanho da bolha acompanha o peso estratégico.</figcaption></figure><div className="pmr-service"><div><span>Serviço indicado</span><h3>{service}</h3></div><p>{serviceText(service)}</p><div className="pmr-steps"><div><b>01</b><span>Priorizar riscos</span></div><div><b>02</b><span>Definir o plano</span></div><div><b>03</b><span>Executar com direção</span></div></div><a href="https://wa.me/5541987791933" target="_blank" rel="noreferrer">Vamos conversar?</a></div><PageFooter/></section>

      <section className="pmr-page pmr-closing"><img src="/brand/cali-workspace-transparent.svg" className="pmr-logo small" alt="CALI"/><p>“A raiz de quem vem forte não falha: sustenta, atravessa, constrói e permanece.”</p><div className="pmr-closing-sign"><strong>Patricia Lima</strong><span>People Advisory Executive · CALI RH</span></div><small>patricia@calirh.com · (41) 98779-1933 · calirh.com</small></section>
    </main>
  </div>;
}
