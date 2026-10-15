/* Pedidos de privacidade (LGPD, art. 18) feitos pelos usuários no perfil. A administradora vê o prazo e registra a resposta;
   quem pediu recebe a resposta no sino e por e-mail. A exclusão ou correção em si continua sendo feita caso a caso. */
import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Request = { id: string; user_id: string; company_id: string | null; kind: string; details: string; status: string; answer: string | null; created_at: string; resolved_at: string | null };
const KIND: Record<string, string> = { access: 'Acesso aos dados', correction: 'Correção', deletion: 'Exclusão', other: 'Outro pedido' };
const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const deadline = (iso: string) => { const date = new Date(iso); date.setDate(date.getDate() + 15); return date; };

export function PrivacyRequestsPanel() {
  const [rows, setRows] = useState<Request[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    if (!supabase) return;
    const result = await supabase.from('data_subject_requests').select('*').order('created_at', { ascending: false }).limit(50);
    if (result.error) return;
    const list = (result.data || []) as Request[]; setRows(list);
    const userIds = [...new Set(list.map((row) => row.user_id))]; const companyIds = [...new Set(list.map((row) => row.company_id).filter(Boolean))] as string[];
    if (userIds.length) { const people = await supabase.from('profiles').select('id,full_name,email').in('id', userIds); setNames(Object.fromEntries(((people.data || []) as any[]).map((row) => [row.id, row.full_name || row.email]))); }
    if (companyIds.length) { const list2 = await supabase.from('companies').select('id,display_name').in('id', companyIds); setCompanies(Object.fromEntries(((list2.data || []) as any[]).map((row) => [row.id, row.display_name]))); }
  }
  useEffect(() => { void load(); }, []);

  async function answer() {
    if (!supabase || !answering || busy || answering.text.trim().length < 5) return;
    setBusy(true); const result = await supabase.rpc('admin_answer_data_subject_request', { p_request_id: answering.id, p_answer: answering.text.trim() }); setBusy(false);
    if (result.error) { setMessage(result.error.message || 'Não foi possível registrar a resposta.'); return; }
    setAnswering(null); setMessage('Resposta registrada. A pessoa recebeu no sino e por e-mail.'); await load();
  }

  if (!rows.length) return null;
  const open = rows.filter((row) => row.status === 'open');
  return <section className="v2-privacy-panel" aria-label="Pedidos de privacidade">
    <header><ShieldCheck size={18} /><div><h2>Pedidos de privacidade (LGPD)</h2><p>{open.length ? `${open.length} em aberto. A LGPD pede resposta rápida; o prazo indicado aqui é de 15 dias.` : 'Nenhum pedido em aberto.'}</p></div></header>
    {message && <p className="v2-privacy-message" role="status">{message}</p>}
    <ul>{rows.map((row) => { const late = row.status === 'open' && deadline(row.created_at) < new Date(); return <li key={row.id} className={row.status === 'open' ? (late ? 'late' : 'open') : 'done'}>
      <div className="v2-privacy-head"><strong>{KIND[row.kind] || row.kind} · {names[row.user_id] || 'Usuário'}</strong><span>{row.company_id ? companies[row.company_id] || '' : 'CALI'} · pedido em {day(row.created_at)}{row.status === 'open' ? ` · responder até ${deadline(row.created_at).toLocaleDateString('pt-BR')}` : ` · respondido em ${row.resolved_at ? day(row.resolved_at) : '—'}`}</span></div>
      <p>{row.details}</p>
      {row.answer && <p className="v2-privacy-answer"><b>Resposta:</b> {row.answer}</p>}
      {row.status === 'open' && (answering?.id === row.id
        ? <div className="v2-privacy-form"><textarea rows={3} maxLength={4000} value={answering.text} onChange={(event) => setAnswering({ id: row.id, text: event.target.value })} placeholder="Escreva a resposta que a pessoa vai receber." /><span><button type="button" onClick={() => setAnswering(null)}>Cancelar</button><button type="button" className="primary" disabled={busy || answering.text.trim().length < 5} onClick={() => void answer()}>{busy ? 'Enviando…' : 'Enviar resposta'}</button></span></div>
        : <button type="button" className="v2-privacy-reply" onClick={() => { setMessage(''); setAnswering({ id: row.id, text: '' }); }}>Responder</button>)}
    </li>; })}</ul>
  </section>;
}
