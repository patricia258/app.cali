/* Painel de uma subtarefa (upgrade do entregável, fase 2): notas internas, conversa da equipe e anexos próprios.
   Serve à administradora e à Equipe CALI (Partner). O cliente ainda não lê nada daqui — isso entra na fase 4. */
import { useEffect, useRef, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NoteLog } from './NoteLog';

type Message = { id: string; author_user_id: string | null; author_role: string; body: string; created_at: string };
type FileToken = { name: string; path: string; size: number };
const TOKEN = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
const when = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace('.', '');
function parse(body: string) { const files: FileToken[] = []; const clean = body.replace(TOKEN, (_all, name, path, _type, size) => { try { files.push({ name: decodeURIComponent(name), path: decodeURIComponent(path), size: Number(size || 0) }); } catch { files.push({ name, path, size: Number(size || 0) }); } return ''; }).trim(); return { clean, files }; }

export function SubtaskPanel({ task, deliverableId, companyId, staff, onNotice }: { task: { id: string; title: string; description?: string | null }; deliverableId: string; companyId: string; staff: boolean; onNotice: (message: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]); const [names, setNames] = useState<Record<string, string>>({}); const [me, setMe] = useState('');
  const [text, setText] = useState(''); const [file, setFile] = useState<File | null>(null); const [sending, setSending] = useState(false); const fileInput = useRef<HTMLInputElement | null>(null);

  async function loadMessages() { if (!supabase) return; const result = await supabase.from('task_messages').select('id,author_user_id,author_role,body,created_at').eq('task_id', task.id).order('created_at'); if (!result.error) setMessages((result.data || []) as Message[]); }
  useEffect(() => { if (!supabase) return; let alive = true; const db = supabase;
    void (async () => {
      const { data: auth } = await db.auth.getUser(); if (!alive) return; setMe(auth.user?.id || '');
      const team = await db.rpc('staff_identities'); if (alive) setNames(Object.fromEntries((((team.data || []) as any[])).map((row) => [row.id, row.full_name])));
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

  return <div className="v2-subtask-panel" onClick={(event) => event.stopPropagation()}>
    {task.description && <p className="v2-subtask-about">{task.description}</p>}
    <div className="v2-subtask-cols">
      <section className="v2-subtask-notes"><NoteLog deliverableId={deliverableId} taskId={task.id} companyId={companyId} staff={staff} title="Notas da subtarefa" hint="Internas. O cliente não vê." onNotice={onNotice} />
        {files.length > 0 && <div className="v2-subtask-files"><h4>Arquivos da subtarefa</h4>{files.map((item) => <button key={item.path} type="button" className="workspace-chat-attachment" onClick={() => void openFile(item.path)}><span>📎</span><span><strong>{item.name}</strong><small>{item.size ? `${Math.max(1, Math.round(item.size / 1024))} KB` : 'arquivo'}</small></span></button>)}</div>}
      </section>
      <section className="v2-subtask-chat"><div className="v2-subtask-head"><h4>Conversa da equipe</h4><small>Interna · {messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'}</small></div>
        <div className="v2-subtask-thread" aria-live="polite">{messages.length ? messages.map((message) => { const parsed = parse(message.body); const mine = message.author_user_id === me; return <div key={message.id} className={`v2-subtask-msg ${mine ? 'mine' : ''}`}><strong>{author(message)}<time>{when(message.created_at)}</time></strong>{parsed.clean && <p>{parsed.clean}</p>}{parsed.files.map((item) => <button key={item.path} type="button" className="workspace-chat-attachment" onClick={() => void openFile(item.path)}><span>📎</span><span><strong>{item.name}</strong><small>{item.size ? `${Math.max(1, Math.round(item.size / 1024))} KB` : 'arquivo'}</small></span></button>)}</div>; }) : <p className="v2-subtask-empty">Ainda não há mensagens nesta subtarefa.</p>}</div>
        <div className="v2-subtask-compose"><textarea rows={2} value={text} onChange={(event) => setText(event.target.value)} placeholder="Escreva para a equipe…" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} />
          <div className="v2-subtask-compose-actions"><input ref={fileInput} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx" onChange={(event) => { setFile(event.target.files?.[0] || null); event.target.value = ''; }} /><button type="button" className="dv-secondary" title="PDF, imagem, Word, Excel ou PowerPoint, até 10 MB" onClick={() => fileInput.current?.click()}><Paperclip size={14} /><span>{file ? file.name : 'Anexar'}</span></button><button type="button" className="primary" disabled={sending || (!text.trim() && !file)} onClick={() => void send()}><Send size={14} />{sending ? 'Enviando…' : 'Enviar'}</button></div></div>
      </section>
    </div>
  </div>;
}
