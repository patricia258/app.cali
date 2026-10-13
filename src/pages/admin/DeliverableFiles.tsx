/* Aba "Arquivos" do entregável: a pasta. Reúne o que foi anexado na conversa do entregável e na conversa de cada subtarefa.
   Só leitura; cada arquivo abre por link temporário. Serve à administradora e à Equipe CALI. */
import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type FileItem = { name: string; path: string; size: number; when: string };
type Group = { key: string; title: string; hint: string; files: FileItem[] };
const TOKEN = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;
const safe = (value: string) => { try { return decodeURIComponent(value); } catch { return value; } };
function filesOf(body: string, when: string) { const out: FileItem[] = []; String(body || '').replace(TOKEN, (_all, name, path, _type, size) => { out.push({ name: safe(name), path: safe(path), size: Number(size || 0), when }); return ''; }); return out; }
const dateLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)).replace('.', '');

export function DeliverableFiles({ deliverableId, deliverableTitle, tasks, onNotice }: { deliverableId: string; deliverableTitle: string; tasks: { id: string; title: string }[]; onNotice: (message: string) => void }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  useEffect(() => { if (!supabase) return; let alive = true; const db = supabase; setGroups(null);
    void (async () => {
      const [main, sub] = await Promise.all([
        db.from('comments').select('body,created_at').eq('target_type', 'deliverable').eq('target_id', deliverableId).order('created_at'),
        db.from('task_messages').select('task_id,body,created_at').eq('deliverable_id', deliverableId).order('created_at'),
      ]);
      if (!alive) return;
      const next: Group[] = [{ key: 'main', title: deliverableTitle, hint: 'Conversa do entregável', files: ((main.data || []) as any[]).flatMap((row) => filesOf(row.body, row.created_at)) }];
      tasks.forEach((task) => next.push({ key: task.id, title: task.title, hint: 'Subtarefa', files: ((sub.data || []) as any[]).filter((row) => row.task_id === task.id).flatMap((row) => filesOf(row.body, row.created_at)) }));
      setGroups(next);
    })();
    return () => { alive = false; };
  }, [deliverableId, tasks.map((task) => task.id).join(',')]);
  async function open(path: string) { if (!supabase) return; const { data, error } = await supabase.storage.from('cali-workspace-private').createSignedUrl(path, 300); if (error || !data?.signedUrl) { onNotice('Não foi possível abrir este arquivo agora.'); return; } window.open(data.signedUrl, '_blank', 'noopener,noreferrer'); }
  if (!groups) return <p className="v2-admin-empty data-loading" aria-busy="true">Carregando arquivos…</p>;
  const total = groups.reduce((sum, group) => sum + group.files.length, 0);
  return <section className="v2-dfiles">
    <div className="v2-dfiles-head"><FolderOpen size={18} /><div><strong>Pasta do entregável</strong><p>{total === 0 ? 'Nenhum arquivo ainda. Anexe pela conversa do entregável ou de uma subtarefa.' : `${total} ${total === 1 ? 'arquivo' : 'arquivos'}, do entregável e das subtarefas.`}</p></div></div>
    {groups.filter((group) => group.files.length > 0 || group.key === 'main').map((group) => <div className="v2-dfiles-group" key={group.key}>
      <h4>{group.title}<small>{group.hint} · {group.files.length} {group.files.length === 1 ? 'arquivo' : 'arquivos'}</small></h4>
      {group.files.length ? <div className="v2-dfiles-list">{group.files.map((file) => <button key={file.path} type="button" className="workspace-chat-attachment" onClick={() => void open(file.path)}><span>📎</span><span><strong>{file.name}</strong><small>{file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB · ` : ''}{dateLabel(file.when)}</small></span></button>)}</div> : <p className="v2-dfiles-empty">Sem arquivos nesta conversa.</p>}
    </div>)}
  </section>;
}
