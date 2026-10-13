/* Perguntas frequentes do cliente — contrato e utilização de horas. Textos do documento da proprietária (2026-10-13),
   sem alteração. Pesquisável, por assunto, com perguntas que abrem e fecham. */
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';

const FAQ: { topic: string; items: [string, string][] }[] = [
  { topic: 'Horas contratadas', items: [
    ['O que representam as horas contratadas?', 'As horas correspondem à capacidade mensal reservada pela CALI para acompanhar as prioridades da sua empresa, conforme o serviço e o contrato vigente. Elas podem ser utilizadas em reuniões, análises, preparação de materiais, desenvolvimento de entregáveis e outras atividades relacionadas ao escopo contratado.'],
    ['O que acontece se não utilizarmos todas as horas do mês?', 'As horas não utilizadas não são acumuladas ou transferidas para meses seguintes. A contratação garante capacidade reservada para o período, não um banco de horas.'],
    ['Como posso acompanhar a utilização das horas?', 'Na área Horas do Workspace, você poderá consultar a capacidade contratada, as horas registradas, o percentual utilizado e os eventuais excedentes do período.'],
  ] },
  { topic: 'Avisos de consumo', items: [
    ['O que acontece quando atingimos 75% da capacidade?', 'Você recebe um aviso preventivo para acompanhar o consumo do mês. É uma oportunidade para avaliar as atividades previstas e alinhar prioridades.'],
    ['E quando atingimos 100%?', 'O sistema informa que a capacidade mensal contratada foi integralmente utilizada. Isso não significa cancelamento automático das atividades, mas indica que novas necessidades precisam ser avaliadas conforme o planejamento e as condições contratadas.'],
    ['A CALI deixa de trabalhar quando as horas acabam?', 'Não existe suspensão automática por atingir o limite. Entretanto, a capacidade mensal tem limites contratados: há uma tolerância de até 10% acima do contratado e, passando disso, a CALI pode pausar as atividades até a renovação do mês seguinte, sempre avisando você antes. O alerta de consumo não constitui promessa de disponibilidade ilimitada.'],
  ] },
  { topic: 'Excedentes e ajustes', items: [
    ['E se ultrapassarmos a quantidade de horas contratadas?', 'O excedente será registrado e sinalizado. A CALI avaliará o consumo, as prioridades e os possíveis encaminhamentos com a liderança. A ultrapassagem não gera, por si só, cobrança automática de horas adicionais.'],
    ['O que acontece quando ultrapassamos o limite várias vezes?', 'Quando o consumo acima da capacidade se torna recorrente, a CALI realiza uma avaliação de adequação do pacote. O objetivo é verificar se a capacidade contratada continua compatível com a necessidade real da empresa.'],
    ['Vamos precisar contratar um pacote maior?', 'Não necessariamente. A avaliação pode resultar em reorganização de prioridades, reprogramação de atividades, contratação complementar ou proposta de alteração de capacidade. Qualquer mudança comercial depende de alinhamento e formalização.'],
    ['As horas excedentes serão cobradas automaticamente?', 'Não. Serviços ou capacidades adicionais dependem de alinhamento prévio e das condições comerciais formalizadas entre as partes.'],
    ['Posso solicitar mais horas para uma demanda específica?', 'Sim. A necessidade poderá ser avaliada com a CALI e, quando aplicável, formalizada como capacidade adicional ou outra solução adequada ao escopo.'],
  ] },
];
const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function ClientFaqPage() {
  const [query, setQuery] = useState(''); const [open, setOpen] = useState<string | null>(null);
  const groups = useMemo(() => { const term = plain(query.trim()); return FAQ.map((group) => ({ ...group, items: group.items.filter(([question, answer]) => !term || plain(question).includes(term) || plain(answer).includes(term)) })).filter((group) => group.items.length > 0); }, [query]);
  return <Shell role="client">
    <section className="v2-client-module">
      <header className="page-head"><div><div className="eyebrow">AJUDA / CONTRATO E HORAS</div><h1>Dúvidas frequentes<span className="title-dot">.</span></h1><p>Como funcionam as horas contratadas, os avisos de consumo e os excedentes.</p></div></header>
      <label className="v2-faq-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por palavra, por exemplo: excedente" aria-label="Buscar nas dúvidas frequentes" /></label>
      {groups.length === 0 ? <p className="v2-faq-empty">Nenhuma pergunta encontrada para “{query}”. Fale com a CALI pelas Ocorrências.</p> : groups.map((group) => <section className="v2-faq-group" key={group.topic}><h2>{group.topic}</h2>
        {group.items.map(([question, answer]) => { const isOpen = open === question || Boolean(query.trim()); return <div className="v2-faq-item" key={question}><button type="button" aria-expanded={isOpen} onClick={() => setOpen(open === question ? null : question)}>{question}{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>{isOpen && <p>{answer}</p>}</div>; })}
      </section>)}
    </section>
  </Shell>;
}
