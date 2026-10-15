/* Subtarefa vista pelo cliente: situação, prazo, complexidade, documentos liberados, conversa com a CALI e aprovação da parte.
   O cliente só vê o que a CALI marcou como visível; não altera situação — apenas conversa, anexa e aprova quando está "Aguardando você". */
import { withMentions } from '../../lib/mentionText';
import { SensitiveDataNote } from '../../components/SensitiveDataNote';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Paperclip, RefreshCw, Send, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Message = { id: string; author_user_id: string | null; author_role: string; body: string; created_at: string };
type FileToken = { name: string; path: string; size: number };
const TOKEN = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
const when = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace('.', '');
const safe = (value: string) => { try { return decodeURIComponent(value); } catch { return value; } };
function parse(body: string) { const files: FileToken[] = []; const clean = body.replace(TOKEN, (_all, name, path, _type, size) => { files.push({ name: safe(name), path: safe(path), size: Number(size || 0) }); return ''; }).trim(); return { clean, files }; }

export function ClientSubtaskModal({ task, deliverableId, deliverableTitle, statusLabel, complexityHint, formatDate, onClose, onChanged }: { task: { id: string; title: string; status: string; dueAt?: string | null; protocol?: string | null; complexity?: string | null }; deliverableId: string; deliverableTitle: string; statusLabel: string; complexityHint: string; formatDate: (value?: string | null) => string; onClose: () => void; onChanged: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]); const [docs, setDocs] = useState<{ id: string; title: string; storage_path: string | null; original_filename: string | null }[]>([]);
  const [me, setMe] = useState(''); const [companyId, setCompanyId] = useState(''); const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState(''); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(''); const [confirming, setConfirming] = useState(false); const [adjusting, setAdjusting] = useState(false); const [adjustUsed, setAdjustUsed] = useState(0); const [adjustText, setAdjustText] = useState('');
  const fileInput = useRef<HTMLInputElement | null>(null);
  const closed = ['approved', 'done', 'completed', 'cancelled'].includes(task.status);

  async function load() { if (!supabase) return;
    const [thread, files] = await Promise.all([
      supabase.from('task_messages').select('id,author_user_id,author_role,body,created_at').eq('task_id', task.id).eq('client_visible', true).order('created_at'),
      supabase.from('files').select('id,title,storage_path,original_filename').eq('task_id', task.id).eq('client_visible', true).eq('status', 'published'),
    ]);
    if (!thread.error) setMessages((thread.data || []) as Message[]); if (!files.error) setDocs((files.data || []) as any[]);
    const used = await supabase.from('deliverable_tasks').select('adjustment_count').eq('id', task.id).maybeSingle(); if (!used.error) setAdjustUsed(Number((used.data as any)?.adjustment_count || 0));
  }
  useEffect(() => { if (!supabase) return; let alive = true; const db = supabase;
    void (async () => { const { data: auth } = await db.auth.getUser(); const uid = auth.user?.id || ''; if (!alive) return; setMe(uid);
      const profile = uid ? await db.from('profiles').select('company_id').eq('id', uid).maybeSingle() : { data: null }; if (alive) setCompanyId((profile.data as any)?.company_id || '');
      const team = await db.rpc('staff_identities'); const contact = await db.rpc('get_client_account_contact'); const admin = Array.isArray(contact.data) ? contact.data[0] : contact.data;
      if (alive) setNames(Object.fromEntries([...(((team.data || []) as any[]).map((row) => [row.id, row.full_name])), ...(admin?.id ? [[admin.id, admin.full_name]] : [])]));
      await load(); })();
    const timer = window.setInterval(() => void load(), 20000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [task.id]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 4500); return () => window.clearTimeout(timer); }, [notice]);

  async function open(path: string) { if (!supabase) return; const { data, error } = await supabase.storage.from('cali-workspace-private').createSignedUrl(path, 300); if (error || !data?.signedUrl) { setNotice('Não foi possível abrir este arquivo agora.'); return; } window.open(data.signedUrl, '_blank', 'noopener,noreferrer'); }
  async function send() { if (!supabase || busy || (!text.trim() && !file)) return; setBusy(true);
    try { let token = '';
      if (file) {
        if (!ALLOWED.includes(file.type)) { setNotice('Use PDF, imagem, Word, Excel ou PowerPoint.'); return; }
        if (file.size > 10 * 1024 * 1024) { setNotice('O anexo pode ter até 10 MB.'); return; }
        if (!companyId || !me) { setNotice('Não foi possível anexar agora. Tente de novo.'); return; }
        const clean = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 90) || 'arquivo';
        const path = `deliverable-chat/${companyId}/${deliverableId}/${me}/${Date.now()}-${clean}`;
        const upload = await supabase.storage.from('cali-workspace-private').upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) { setNotice('Não foi possível anexar o arquivo. A mensagem não foi enviada.'); return; }
        token = `[[arquivo|${encodeURIComponent(file.name)}|${encodeURIComponent(path)}|${encodeURIComponent(file.type)}|${file.size}]]`;
      }
      const result = await supabase.rpc('client_post_task_message', { p_task_id: task.id, p_body: [text.trim(), token].filter(Boolean).join('\n') });
      if (result.error) { setNotice(result.error.message || 'Não foi possível enviar a mensagem.'); return; }
      setText(''); setFile(null); await load();
    } finally { setBusy(false); }
  }
  async function approve() { if (!supabase || busy) return; setBusy(true); const result = await supabase.rpc('client_approve_task', { p_task_id: task.id }); setBusy(false); setConfirming(false);
    if (result.error) { setNotice(result.error.message || 'Não foi possível registrar a aprovação.'); return; } onChanged(); onClose(); }
  async function requestAdjustment() { if (!supabase || busy || adjustText.trim().length < 10) return; setBusy(true); const result = await supabase.rpc('client_request_task_adjustment', { p_task_id: task.id, p_body: adjustText.trim() }); setBusy(false);
    if (result.error) { setNotice(result.error.message || 'Não foi possível registrar o pedido de ajuste.'); return; } onChanged(); onClose(); }
  const author = (message: Message) => message.author_user_id === me ? 'Você' : (message.author_user_id && names[message.author_user_id]) || (message.author_role === 'client' ? 'Sua equipe' : 'CALI');

  return <div className="v2-stm-overlay" onMouseDown={onClose}><section className="v2-stm v2-stm-client" role="dialog" aria-modal="true" aria-label={`Subtarefa ${task.title}`} onMouseDown={(event) => event.stopPropagation()}>
    <header className="v2-stm-head"><div><h2>{task.title}</h2><p className="v2-stm-line"><span>Parte de <strong>{deliverableTitle}</strong></span>{task.protocol && <small>{task.protocol}</small>}{task.complexity && <b className={`mc-chip ${task.complexity.toLowerCase()}`} data-tip={complexityHint}>{task.complexity}</b>}</p></div>
      <div className="v2-stm-actions"><span className={`dv-status ${task.status === 'client_review' ? 'd0' : task.status === 'todo' ? 'd2' : ''}`}>{statusLabel}</span><button type="button" className="modal-close-static" aria-label="Fechar" onClick={onClose}><X size={18} /></button></div></header>
    <div className="v2-stm-body">
      <div className="v2-stm-cards v2-stm-cards-2"><span>Prazo<b>{task.dueAt ? formatDate(task.dueAt) : 'A definir'}</b></span><span>Documentos entregues<b>{docs.length ? docs.length : 'Em produção'}</b></span></div>
      {docs.length > 0 && <div className="v2-subtask-files">{docs.map((doc) => doc.storage_path ? <button key={doc.id} type="button" className="workspace-chat-attachment" onClick={() => void open(doc.storage_path!)}><span>📎</span><span><strong>{doc.original_filename || doc.title}</strong><small>Documento entregue</small></span></button> : null)}</div>}
      {task.status === 'client_review' && <div className={`v2-stm-approve ${adjusting ? 'adjusting' : ''}`}>{adjusting ? <><label>O que precisa ser ajustado nesta parte?<textarea rows={3} value={adjustText} onChange={(event) => setAdjustText(event.target.value)} placeholder="Descreva o ajuste. A CALI recebe o pedido e esta parte volta para produção." maxLength={4000} /></label><span><button type="button" onClick={() => setAdjusting(false)}>Voltar</button><button type="button" className="primary" disabled={busy || adjustText.trim().length < 10} onClick={() => void requestAdjustment()}>{busy ? 'Enviando…' : 'Enviar pedido de ajuste'}</button></span></> : confirming ? <><span>Confirmar a aprovação desta parte? Depois disso ela fica concluída.</span><span><button type="button" onClick={() => setConfirming(false)}>Voltar</button><button type="button" className="primary" disabled={busy} onClick={() => void approve()}>{busy ? 'Registrando…' : 'Sim, aprovar'}</button></span></> : <><span><strong>Esta parte aguarda a sua aprovação.</strong> {adjustUsed >= 2 ? 'Os 2 ajustes desta parte já foram usados; se precisar, fale com a CALI pela conversa.' : `Ajustes usados: ${adjustUsed} de 2.`}</span><span>{adjustUsed < 2 && <button type="button" onClick={() => setAdjusting(true)}><RefreshCw size={14} /> Pedir ajuste</button>}<button type="button" className="primary" onClick={() => setConfirming(true)}><CheckCircle2 size={14} /> Aprovar esta parte</button></span></>}</div>}
      <section className="v2-subtask-chat"><div className="v2-subtask-head"><h4>Conversa com a CALI</h4><small>{messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'}</small></div>
        <div className="v2-subtask-thread workspace-chat-list" aria-live="polite">{messages.length ? messages.map((message) => { const parsed = parse(message.body); const mine = message.author_user_id === me; const name = author(message); const avatar = <span className="workspace-chat-avatar v2-chat-photo">{name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}</span>; return <div key={message.id} className={`workspace-chat-line ${mine ? 'mine' : 'other'}`}>{!mine && avatar}<div className="workspace-chat-bubble"><div className="workspace-chat-head"><strong>{name}</strong><time>{when(message.created_at)}</time></div>{parsed.clean && <p>{withMentions(parsed.clean)}</p>}{parsed.files.length > 0 && <div className="workspace-chat-attachments">{parsed.files.map((item) => <button key={item.path} type="button" className="workspace-chat-attachment" onClick={() => void open(item.path)}><span>📎</span><span><strong>{item.name}</strong><small>{item.size ? `${Math.max(1, Math.round(item.size / 1024))} KB` : 'arquivo'}</small></span></button>)}</div>}</div>{mine && avatar}</div>; }) : <p className="v2-subtask-empty">Ainda não há mensagens nesta parte.</p>}</div>
        {closed ? <p className="v2-subtask-empty">Esta parte foi concluída. A conversa fica disponível para consulta.</p> : <div className="v2-subtask-compose"><textarea rows={2} value={text} onChange={(event) => setText(event.target.value)} placeholder="Escreva para a CALI…" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} />
          <div className="v2-subtask-compose-actions"><input ref={fileInput} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx" onChange={(event) => { setFile(event.target.files?.[0] || null); event.target.value = ''; }} /><button type="button" className="v2-stm-attach" title="PDF, imagem, Word, Excel ou PowerPoint, até 10 MB" onClick={() => fileInput.current?.click()}><Paperclip size={14} /><span>{file ? file.name : 'Anexar'}</span></button><button type="button" className="primary" disabled={busy || (!text.trim() && !file)} onClick={() => void send()}><Send size={14} />{busy ? 'Enviando…' : 'Enviar'}</button></div><SensitiveDataNote /></div>}
      </section>
      {notice && <p className="v2-stm-notice" role="alert">{notice}</p>}
    </div>
  </section></div>;
}
