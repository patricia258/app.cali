/* Notas internas como registros: cada nota fica gravada com autor e hora, na lista. Usado no entregável e na subtarefa.
   A administradora grava direto; a Equipe CALI (Partner) grava por função. O cliente nunca lê esta tabela. */
import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Entry = { id: string; author_user_id: string | null; author_name: string | null; body: string; created_at: string };
const when = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace('.', '');

export function NoteLog({ deliverableId, taskId, companyId, staff, title, hint, onNotice }: { deliverableId: string; taskId?: string | null; companyId: string; staff: boolean; title: string; hint: string; onNotice: (message: string) => void }) {
  const [entries, setEntries] = useState<Entry[]>([]); const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const [me, setMe] = useState(''); const [editing, setEditing] = useState<{ id: string; body: string } | null>(null); const [removing, setRemoving] = useState<string | null>(null);
  useEffect(() => { if (!supabase) return; void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id || '')); }, []);
  const canChange = (entry: Entry) => !staff || entry.author_user_id === me;
  async function saveEdit() { if (!supabase || !editing || !editing.body.trim()) return; const failure = staff ? (await supabase.rpc('partner_edit_note', { p_note_id: editing.id, p_body: editing.body })).error : (await supabase.from('note_entries').update({ body: editing.body.trim() }).eq('id', editing.id)).error; if (failure) { onNotice(failure.message || 'Não foi possível editar a nota.'); return; } setEditing(null); await load(); }
  async function remove(id: string) { if (!supabase) return; const failure = staff ? (await supabase.rpc('partner_delete_note', { p_note_id: id })).error : (await supabase.from('note_entries').delete().eq('id', id)).error; setRemoving(null); if (failure) { onNotice(failure.message || 'Não foi possível excluir a nota.'); return; } await load(); }
  async function load() { if (!supabase) return; let query = supabase.from('note_entries').select('id,author_user_id,author_name,body,created_at').eq('deliverable_id', deliverableId).order('created_at', { ascending: false }); query = taskId ? query.eq('task_id', taskId) : query.is('task_id', null); const result = await query; if (!result.error) setEntries((result.data || []) as Entry[]); }
  useEffect(() => { setEntries([]); setText(''); void load(); }, [deliverableId, taskId]);
  async function add() { if (!supabase || busy || !text.trim()) return; setBusy(true);
    let failure: any = null;
    if (staff) failure = (await supabase.rpc('partner_add_note', { p_deliverable_id: deliverableId, p_task_id: taskId || null, p_body: text.trim() })).error;
    else { const { data: auth } = await supabase.auth.getUser(); const profile = auth.user?.id ? await supabase.from('profiles').select('full_name').eq('id', auth.user.id).maybeSingle() : { data: null };
      failure = (await supabase.from('note_entries').insert({ deliverable_id: deliverableId, task_id: taskId || null, company_id: companyId, author_user_id: auth.user?.id || null, author_name: (profile.data as any)?.full_name || 'Patrícia Lima', body: text.trim() })).error; }
    setBusy(false); if (failure) { onNotice(failure.message || 'Não foi possível gravar a nota. Tente de novo.'); return; } setText(''); await load(); }
  return <section className="v2-notelog">
    <div className="v2-notelog-head"><div><h4>{title}</h4><p>{hint}</p></div><span>{entries.length} {entries.length === 1 ? 'nota' : 'notas'}</span></div>
    <div className="v2-notelog-new"><textarea rows={2} value={text} onChange={(event) => setText(event.target.value)} placeholder="Escreva a nota e clique em Adicionar nota." /><button type="button" className="primary" disabled={busy || !text.trim()} onClick={() => void add()}><Plus size={14} />{busy ? 'Gravando…' : 'Adicionar nota'}</button></div>
    {entries.length > 0 ? <ul className="v2-notelog-list">{entries.map((entry) => <li key={entry.id}><div><strong>{entry.author_name || 'CALI'}</strong><time>{when(entry.created_at)}</time>{canChange(entry) && editing?.id !== entry.id && removing !== entry.id && <span className="v2-notelog-tools"><button type="button" title="Editar nota" aria-label="Editar nota" onClick={() => setEditing({ id: entry.id, body: entry.body })}><Pencil size={13} /></button><button type="button" title="Excluir nota" aria-label="Excluir nota" onClick={() => setRemoving(entry.id)}><Trash2 size={13} /></button></span>}</div>
      {editing?.id === entry.id ? <div className="v2-notelog-edit"><textarea rows={2} value={editing.body} onChange={(event) => setEditing({ id: entry.id, body: event.target.value })} /><span><button type="button" onClick={() => setEditing(null)}>Cancelar</button><button type="button" className="primary" disabled={!editing.body.trim()} onClick={() => void saveEdit()}>Salvar</button></span></div>
        : removing === entry.id ? <div className="v2-notelog-confirm"><span>Excluir esta nota? Não dá para desfazer.</span><span><button type="button" onClick={() => setRemoving(null)}>Manter</button><button type="button" className="danger" onClick={() => void remove(entry.id)}>Excluir</button></span></div>
        : <p>{entry.body}</p>}</li>)}</ul> : <p className="v2-notelog-empty">Nenhuma nota gravada ainda.</p>}
  </section>;
}
