/* Aba "Arquivos" do entregável: a pasta. Reúne o que foi anexado na conversa do entregável e na conversa de cada subtarefa.
   Só leitura; cada arquivo abre por link temporário. Serve à administradora e à Equipe CALI. */
import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type FileItem = { name: string; path: string; size: number; when: string; mime: string };
type FinalRow = { id: string; storage_path: string | null; status: string };
type Group = { key: string; title: string; hint: string; files: FileItem[] };
const TOKEN = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;
const safe = (value: string) => { try { return decodeURIComponent(value); } catch { return value; } };
function filesOf(body: string, when: string) { const out: FileItem[] = []; String(body || '').replace(TOKEN, (_all, name, path, type, size) => { out.push({ name: safe(name), path: safe(path), size: Number(size || 0), when, mime: safe(type) }); return ''; }); return out; }
const dateLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)).replace('.', '');

export function DeliverableFiles({ deliverableId, deliverableTitle, companyId, projectId, staff, tasks, onNotice }: { deliverableId: string; deliverableTitle: string; companyId: string; projectId?: string | null; staff: boolean; tasks: { id: string; title: string }[]; onNotice: (message: string) => void }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [finals, setFinals] = useState<FinalRow[]>([]); const [busy, setBusy] = useState(''); const [removing, setRemoving] = useState('');
  async function loadFinals() { if (!supabase) return; const result = await supabase.from('files').select('id,storage_path,status').eq('deliverable_id', deliverableId); if (!result.error) setFinals((result.data || []) as FinalRow[]); }
  useEffect(() => { void loadFinals(); }, [deliverableId]);
  /* Entrega final: o Partner propõe; só a administradora libera, recusa, suspende ou exclui. */
  async function act(file: FileItem, group: Group, action: 'propose' | 'release' | 'suspend' | 'refuse' | 'delete') { if (!supabase || busy) return; setBusy(file.path); const taskId = group.key === 'main' ? null : group.key; const existing = finals.find((row) => row.storage_path === file.path); let failure: any = null;
    if (action === 'propose') failure = (await supabase.rpc('partner_propose_final_file', { p_deliverable_id: deliverableId, p_task_id: taskId, p_storage_path: file.path, p_filename: file.name, p_file_type: file.mime || 'application/octet-stream', p_size: file.size })).error;
    else if (action === 'release') { const { data: auth } = await supabase.auth.getUser(); failure = existing
      ? (await supabase.from('files').update({ status: 'published', client_visible: true, published_at: new Date().toISOString() }).eq('id', existing.id)).error
      : (await supabase.from('files').insert({ company_id: companyId, project_id: projectId || null, deliverable_id: deliverableId, task_id: taskId, title: group.title, category: 'deliverable', storage_path: file.path, original_filename: file.name, file_type: file.mime || 'application/octet-stream', file_size_bytes: file.size, client_visible: true, status: 'published', published_at: new Date().toISOString(), workflow_origin: 'deliverable', uploaded_by: auth.user?.id || null })).error; }
    else if (action === 'delete' && existing) failure = (await supabase.from('files').delete().eq('id', existing.id)).error;
    else if (existing) failure = (await supabase.from('files').update({ status: 'archived', client_visible: false }).eq('id', existing.id)).error;
    setBusy(''); setRemoving(''); if (failure) { onNotice(failure.message || 'Não foi possível concluir esta ação.'); return; }
    onNotice(action === 'propose' ? 'Enviado para a Patricia liberar ao cliente.' : action === 'release' ? 'Liberado para o cliente em Documentos.' : action === 'suspend' ? 'Suspenso: o cliente deixou de ver este documento.' : action === 'delete' ? 'Documento retirado da pasta do cliente. O arquivo continua na conversa.' : 'Proposta recusada.'); await loadFinals(); }
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
    <div className="v2-dfiles-head"><FolderOpen size={18} /><div><strong>Pasta do entregável</strong><p>{total === 0 ? 'Nenhum arquivo ainda. Anexe pela conversa do entregável ou de uma subtarefa.' : `${total} ${total === 1 ? 'arquivo' : 'arquivos'}. É assim que o cliente vê a pasta em Documentos: uma parte por subtarefa, só com o que estiver liberado.`}</p></div></div>
    {groups.map((group) => <div className="v2-dfiles-group" key={group.key}>
      <h4>{group.title}<small>{group.hint} · {group.files.length} {group.files.length === 1 ? 'arquivo' : 'arquivos'}</small></h4>
      {group.files.length ? <ul className="v2-stm-filelist">{group.files.map((file) => { const final = finals.find((row) => row.storage_path === file.path); const state = final?.status || 'none'; const working = busy === file.path; return <li key={file.path}>
        <button type="button" className="workspace-chat-attachment" onClick={() => void open(file.path)}><span>📎</span><span><strong>{file.name}</strong><small>{file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB · ` : ''}{dateLabel(file.when)}</small></span></button>
        <span className={`v2-final-state s-${state}`}>{state === 'published' ? 'Liberado ao cliente' : state === 'draft' ? 'Aguardando liberação da Patricia' : state === 'archived' ? 'Suspenso' : 'Arquivo de trabalho'}</span>
        <span className="v2-final-actions">{removing === file.path ? <><em>Retirar da pasta do cliente?</em><button type="button" onClick={() => setRemoving('')}>Manter</button><button type="button" className="danger" disabled={working} onClick={() => void act(file, group, 'delete')}>Retirar</button></> : staff
          ? (state === 'none' || state === 'archived') && <button type="button" disabled={working} onClick={() => void act(file, group, 'propose')}>Propor como entrega final</button>
          : <>{state !== 'published' && <button type="button" className="primary" disabled={working} onClick={() => void act(file, group, 'release')}>Liberar para o cliente</button>}{state === 'draft' && <button type="button" disabled={working} onClick={() => void act(file, group, 'refuse')}>Recusar</button>}{state === 'published' && <button type="button" disabled={working} onClick={() => void act(file, group, 'suspend')}>Suspender</button>}{state !== 'none' && <button type="button" disabled={working} onClick={() => setRemoving(file.path)}>Excluir</button>}</>}</span>
      </li>; })}</ul> : <p className="v2-dfiles-empty">Sem arquivos nesta conversa.</p>}
    </div>)}
  </section>;
}
