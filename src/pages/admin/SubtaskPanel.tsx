/* Painel de uma subtarefa (upgrade do entregável, fase 2): notas internas, conversa da equipe e anexos próprios.
   Serve à administradora e à Equipe CALI (Partner). O cliente ainda não lê nada daqui — isso entra na fase 4. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Paperclip, Send, X } from 'lucide-react';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { supabase } from '../../lib/supabase';
import { NoteLog } from './NoteLog';

type Message = { id: string; author_user_id: string | null; author_role: string; body: string; created_at: string };
type FileToken = { name: string; path: string; size: number };
const TOKEN = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
const when = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace('.', '');
function parse(body: string) { const files: FileToken[] = []; const clean = body.replace(TOKEN, (_all, name, path, _type, size) => { try { files.push({ name: decodeURIComponent(name), path: decodeURIComponent(path), size: Number(size || 0) }); } catch { files.push({ name, path, size: Number(size || 0) }); } return ''; }).trim(); return { clean, files }; }

export const SUBTASK_STATUS: Record<string, { label: string; tone: string }> = { todo: { label: 'Não iniciado', tone: 'purple' }, doing: { label: 'Em andamento', tone: 'blue' }, standby: { label: 'Stand by', tone: 'gray' }, internal_review: { label: 'Revisão interna', tone: 'blue' }, client_review: { label: 'Com o cliente', tone: 'amber' }, approved: { label: 'Aprovado', tone: 'green' }, done: { label: 'Concluída', tone: 'green' }, cancelled: { label: 'Cancelada', tone: 'red' } };
export const subtaskStatusOptions = (staff: boolean, current: string) => staff ? (['client_review', 'approved', 'done', 'cancelled'].includes(current) ? [current] : ['todo', 'doing', 'standby', 'internal_review']) : ['todo', 'doing', 'standby', 'internal_review', 'client_review', 'approved', 'done'];
export const subtaskStatusLabel = (status: string, staff: boolean) => staff && status === 'internal_review' ? 'Revisão da Patricia' : (SUBTASK_STATUS[status]?.label || status);

type SubtaskInfo = { id: string; title: string; description?: string | null; status: string; dueAt?: string | null; protocol?: string | null; clientVisible?: boolean; complexity?: string | null; isDocument?: boolean };
/** Modal próprio da subtarefa, no mesmo formato do entregável: situação e cronômetro em cima; abas Visão geral, Conversas e Arquivos. */
export function SubtaskModal({ task, deliverableId, deliverableTitle, companyId, staff, timer, formatDate, onStatus, onClose, onNotice }: { task: SubtaskInfo; deliverableId: string; deliverableTitle: string; companyId: string; staff: boolean; timer: ReactNode; formatDate: (value?: string | null) => string; onStatus: (next: string) => void; onClose: () => void; onNotice: (message: string) => void }) {
  const [tab, setTab] = useState<'overview' | 'chat' | 'files'>('overview');
  const [messages, setMessages] = useState<Message[]>([]); const [names, setNames] = useState<Record<string, string>>({}); const [photos, setPhotos] = useState<Record<string, string>>({}); const [me, setMe] = useState('');
  const [text, setText] = useState(''); const [file, setFile] = useState<File | null>(null); const [sending, setSending] = useState(false); const fileInput = useRef<HTMLInputElement | null>(null);

  async function loadMessages() { if (!supabase) return; const result = await supabase.from('task_messages').select('id,author_user_id,author_role,body,created_at').eq('task_id', task.id).order('created_at'); if (!result.error) setMessages((result.data || []) as Message[]); }
  useEffect(() => { if (!supabase) return; let alive = true; const db = supabase;
    void (async () => {
      const { data: auth } = await db.auth.getUser(); if (!alive) return; setMe(auth.user?.id || '');
      const team = await db.rpc('staff_identities'); const admins = staff ? await db.rpc('staff_admin_contacts') : await db.from('profiles').select('id,full_name,avatar_url').eq('role', 'admin');
      const people = [...((team.data || []) as any[]), ...((admins.data || []) as any[])];
      if (alive) setNames(Object.fromEntries(people.map((row) => [row.id, row.full_name])));
      const resolved = await Promise.all(people.map(async (row) => [row.id, row.avatar_url ? await resolveWorkspaceMedia(row.avatar_url).catch(() => null) : null] as const));
      if (alive) setPhotos(Object.fromEntries(resolved.filter((pair) => pair[1]) as [string, string][]));
      await loadMessages();
    })();
    const timer = window.setInterval(() => void loadMessages(), 20000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [task.id, staff]);

  async function send() { if (!supabase || sending || (!text.trim() && !file)) return; setSending(true);
    try {
      let token = '';
      if (file) {
        if (!ALLOWED.includes(file.type)) { onNotice('Use PDF, imagem, Word, Excel ou PowerPoint.'); return; }
        if (file.size > 10 * 1024 * 1024) { onNotice('O anexo pode ter até 10 MB.'); return; }
        const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 90) || 'arquivo';
        const path = `deliverable-chat/${companyId}/${deliverableId}/${me}/${Date.now()}-${safe}`;
        const upload = await supabase.storage.from('cali-workspace-private').upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) { onNotice('Não foi possível anexar o arquivo. A mensagem não foi enviada.'); return; }
        token = `[[arquivo|${encodeURIComponent(file.name)}|${encodeURIComponent(path)}|${encodeURIComponent(file.type)}|${file.size}]]`;
      }
      const body = [text.trim(), token].filter(Boolean).join('\n');
      const result = staff ? await supabase.rpc('partner_post_task_message', { p_task_id: task.id, p_body: body }) : await supabase.from('task_messages').insert({ task_id: task.id, deliverable_id: deliverableId, company_id: companyId, author_user_id: me || null, author_role: 'admin', body, client_visible: false });
      if (result.error) { onNotice(result.error.message || 'Não foi possível enviar a mensagem.'); return; }
      setText(''); setFile(null); await loadMessages();
    } finally { setSending(false); }
  }
  async function openFile(path: string) { if (!supabase) return; const { data, error } = await supabase.storage.from('cali-workspace-private').createSignedUrl(path, 300); if (error || !data?.signedUrl) { onNotice('Não foi possível abrir este anexo agora.'); return; } window.open(data.signedUrl, '_blank', 'noopener,noreferrer'); }
  const author = (message: Message) => (message.author_user_id && names[message.author_user_id]) || (message.author_role === 'admin' ? 'Patrícia Lima' : message.author_role === 'client' ? 'Cliente' : 'Equipe CALI');
  const files = messages.flatMap((message) => parse(message.body).files);

  const options = subtaskStatusOptions(staff, task.status);
  return <div className="v2-stm-overlay" onMouseDown={onClose}><section className="v2-stm" role="dialog" aria-modal="true" aria-label={`Subtarefa ${task.title}`} onMouseDown={(event) => event.stopPropagation()}>
    <header className="v2-stm-head"><div><button type="button" className="v2-stm-back" onClick={onClose}><ArrowLeft size={14} /> Voltar para o entregável</button><h2>{task.title}</h2><p className="v2-stm-line"><span>Subtarefa de <strong>{deliverableTitle}</strong></span>{task.protocol && <small>{task.protocol}</small>}{task.complexity && <b className={`mc-chip ${task.complexity.toLowerCase()}`}>{task.complexity}</b>}</p></div>
      <div className="v2-stm-actions"><label className={`v2-head-status ${SUBTASK_STATUS[task.status]?.tone || 'purple'}`} title="Situação da subtarefa — clique para alterar"><i /><select aria-label="Situação da subtarefa" value={task.status} disabled={options.length === 1} onChange={(event) => onStatus(event.target.value)}>{options.map((value) => <option key={value} value={value}>{subtaskStatusLabel(value, staff)}</option>)}</select></label>{timer}<button type="button" className="modal-close-static" aria-label="Fechar" onClick={onClose}><X size={18} /></button></div></header>
    <nav className="v2-stm-tabs">{([['overview', 'Visão geral'], ['chat', `Conversas (${messages.length})`], ['files', `Arquivos (${files.length})`]] as const).map(([key, label]) => <button key={key} type="button" className={tab === key ? 'selected' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>
    <div className="v2-stm-body">
      {tab === 'overview' && <><div className="v2-stm-cards"><span>Prazo<b>{task.dueAt ? formatDate(task.dueAt) : 'Sem prazo'}</b></span><span>Complexidade<b>{task.complexity || '—'}</b></span><span>Cliente<b>{task.clientVisible ? 'Vê esta subtarefa' : 'Não vê (interna)'}</b></span><span>Tipo<b>{task.isDocument ? 'Entrega documental' : 'Atividade'}</b></span></div>
        <div className="v2-stm-about"><h3>Sobre esta subtarefa</h3><p>{task.description || 'Sem descrição.'}</p></div>
        <NoteLog deliverableId={deliverableId} taskId={task.id} companyId={companyId} staff={staff} title="Notas internas" hint="Anotações, fontes e referências desta subtarefa. O cliente não vê." onNotice={onNotice} /></>}
      {tab === 'chat' && <section className="v2-subtask-chat"><div className="v2-subtask-head"><h4>Conversa da equipe</h4><small>Interna · o cliente não vê</small></div>
        <div className="v2-subtask-thread workspace-chat-list v2-staff-project-chat" aria-live="polite">{messages.length ? messages.map((message) => { const parsed = parse(message.body); const mine = message.author_user_id === me; const name = author(message); const photo = message.author_user_id ? photos[message.author_user_id] : ''; const avatar = <span className="workspace-chat-avatar v2-chat-photo">{photo ? <img src={photo} alt="" /> : name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}</span>; return <div key={message.id} className={`workspace-chat-line ${mine ? 'mine' : 'other'}`}>{!mine && avatar}<div className="workspace-chat-bubble"><div className="workspace-chat-head"><strong>{name}</strong><time>{when(message.created_at)}</time></div>{parsed.clean && <p>{parsed.clean}</p>}{parsed.files.length > 0 && <div className="workspace-chat-attachments">{parsed.files.map((item) => <button key={item.path} type="button" className="workspace-chat-attachment" onClick={() => void openFile(item.path)}><span>📎</span><span><strong>{item.name}</strong><small>{item.size ? `${Math.max(1, Math.round(item.size / 1024))} KB` : 'arquivo'}</small></span></button>)}</div>}</div>{mine && avatar}</div>; }) : <p className="v2-subtask-empty">Ainda não há mensagens nesta subtarefa.</p>}</div>
        <div className="v2-subtask-compose"><textarea rows={2} value={text} onChange={(event) => setText(event.target.value)} placeholder="Escreva para a equipe…" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} />
          <div className="v2-subtask-compose-actions"><input ref={fileInput} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx" onChange={(event) => { setFile(event.target.files?.[0] || null); event.target.value = ''; }} /><button type="button" className="v2-stm-attach" title="PDF, imagem, Word, Excel ou PowerPoint, até 10 MB" onClick={() => fileInput.current?.click()}><Paperclip size={14} /><span>{file ? file.name : 'Anexar'}</span></button><button type="button" className="primary" disabled={sending || (!text.trim() && !file)} onClick={() => void send()}><Send size={14} />{sending ? 'Enviando…' : 'Enviar'}</button></div></div></section>}
      {tab === 'files' && <section className="v2-stm-files"><h3>Arquivos desta subtarefa</h3>{files.length ? <div className="v2-subtask-files">{files.map((item) => <button key={item.path} type="button" className="workspace-chat-attachment" onClick={() => void openFile(item.path)}><span>📎</span><span><strong>{item.name}</strong><small>{item.size ? `${Math.max(1, Math.round(item.size / 1024))} KB` : 'arquivo'}</small></span></button>)}</div> : <p className="v2-subtask-empty">Nenhum arquivo ainda. Anexe pela aba Conversas.</p>}</section>}
    </div>
  </section></div>;
}
