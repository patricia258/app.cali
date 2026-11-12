/* Aba "Arquivos" do entregável: a pasta. Reúne o que foi anexado na conversa do entregável e na conversa de cada subtarefa.
   Cada arquivo abre com a sessão do Workspace. Serve à administradora e à Equipe CALI. */
import { Button } from '../../../components/ds/Button';
import { EmptyState } from '../../../components/ds/EmptyState';
import { useEffect, useRef, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { isSupabaseConfigured } from '../../../api/access/session';
import { readProjectActor } from '../../../api/projects/conversation';
import {
  archiveProjectFile, insertProjectFile, proposeFinalProjectFile, readDeliverableAttachmentSources,
  readFinalProjectFiles, releaseFinalProjectFile, removeProjectFile, renameProjectFile,
} from '../../../api/projects/files';
import { openPrivateWorkspaceFile } from '../../../api/files/workspace';

type FileItem = { name: string; path: string; size: number; when: string; mime: string };
type FinalRow = { id: string; storage_path: string | null; status: string; title: string | null };
type Group = { key: string; title: string; hint: string; files: FileItem[] };
const TOKEN = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;
const safe = (value: string) => { try { return decodeURIComponent(value); } catch { return value; } };
function filesOf(body: string, when: string) { const out: FileItem[] = []; String(body || '').replace(TOKEN, (_all, name, path, type, size) => { out.push({ name: safe(name), path: safe(path), size: Number(size || 0), when, mime: safe(type) }); return ''; }); return out; }
const dateLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)).replace('.', '');

export function DeliverableFiles({ deliverableId, deliverableTitle, companyId, projectId, staff, tasks, onNotice }: { deliverableId: string; deliverableTitle: string; companyId: string; projectId?: string | null; staff: boolean; tasks: { id: string; title: string }[]; onNotice: (message: string) => void }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [finals, setFinals] = useState<FinalRow[]>([]); const [busy, setBusy] = useState(''); const [removing, setRemoving] = useState(''); const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const renameFocus = useRef<string | null>(null);
  const renamePending = useRef(false);
  const [savingName, setSavingName] = useState(false);
  const [renameError, setRenameError] = useState('');
  function closeRename() {
    renameFocus.current = renaming?.id ?? null;
    setRenaming(null);
    setRenameError('');
  }
  async function loadFinals() { if (!isSupabaseConfigured) return; const result = await readFinalProjectFiles({ deliverableId }); if (!result.error) setFinals((result.data || []) as FinalRow[]); }
  useEffect(() => { void loadFinals(); }, [deliverableId]);
  /* Nome que o cliente vê em Documentos. Só a administradora muda. */
  async function rename() {
    if (!isSupabaseConfigured || !renaming || renamePending.current) return;
    const title = renaming.title.trim().slice(0, 200);
    if (!title) return;

    renamePending.current = true;
    setSavingName(true);
    setRenameError('');
    try {
      const result = await renameProjectFile(renaming.id, title);
      if (result.error) {
        setRenameError(result.error.message || 'Não foi possível renomear.');
        return;
      }
      closeRename();
      onNotice('Nome do documento atualizado para o cliente.');
      await loadFinals();
    } finally {
      renamePending.current = false;
      setSavingName(false);
    }
  }
  /* Entrega final: o Partner propõe; só a administradora libera, recusa, suspende ou exclui. */
  async function act(file: FileItem, group: Group, action: 'propose' | 'release' | 'suspend' | 'refuse' | 'delete') { if (!isSupabaseConfigured || busy) return; setBusy(file.path); const taskId = group.key === 'main' ? null : group.key; const existing = finals.find((row) => row.storage_path === file.path); let failure: { message: string } | null = null;
    if (action === 'propose') failure = (await proposeFinalProjectFile(deliverableId, taskId, file)).error;
    else if (action === 'release') { const { data: auth } = await readProjectActor(); failure = existing
      ? (await releaseFinalProjectFile(existing.id)).error
      : (await insertProjectFile({ company_id: companyId, project_id: projectId || null, deliverable_id: deliverableId, task_id: taskId, title: group.title, category: 'deliverable', storage_path: file.path, original_filename: file.name, file_type: file.mime || 'application/octet-stream', file_size_bytes: file.size, client_visible: true, status: 'published', published_at: new Date().toISOString(), workflow_origin: 'deliverable', uploaded_by: auth.user?.id || null })).error; }
    else if (action === 'delete' && existing) failure = (await removeProjectFile(existing.id)).error;
    else if (existing) failure = (await archiveProjectFile(existing.id)).error;
    setBusy(''); setRemoving(''); if (failure) { onNotice(failure.message || 'Não foi possível concluir esta ação.'); return; }
    onNotice(action === 'propose' ? 'Enviado para a Patricia liberar ao cliente.' : action === 'release' ? 'Liberado para o cliente em Documentos.' : action === 'suspend' ? 'Suspenso: o cliente deixou de ver este documento.' : action === 'delete' ? 'Documento retirado da pasta do cliente. O arquivo continua na conversa.' : 'Proposta recusada.'); await loadFinals(); }
  useEffect(() => { if (!isSupabaseConfigured) return; let alive = true; setGroups(null);
    void (async () => {
      const [main, sub] = await readDeliverableAttachmentSources(deliverableId);
      if (!alive) return;
      const next: Group[] = [{ key: 'main', title: deliverableTitle, hint: 'Conversa do entregável', files: ((main.data || []) as { body: string; created_at: string }[]).flatMap((row) => filesOf(row.body, row.created_at)) }];
      tasks.forEach((task) => next.push({ key: task.id, title: task.title, hint: 'Subtarefa', files: ((sub.data || []) as { task_id: string; body: string; created_at: string }[]).filter((row) => row.task_id === task.id).flatMap((row) => filesOf(row.body, row.created_at)) }));
      setGroups(next);
    })();
    return () => { alive = false; };
  }, [deliverableId, tasks.map((task) => task.id).join(',')]);
  async function open(path: string) {
    try {
      await openPrivateWorkspaceFile(path);
    } catch {
      onNotice('Não foi possível abrir este arquivo agora.');
    }
  }
  if (!groups) return <EmptyState as="p" variant="admin" className="data-loading" aria-busy="true">Carregando arquivos…</EmptyState>;
  const total = groups.reduce((sum, group) => sum + group.files.length, 0);
  return <section className="v2-dfiles">
    <div className="v2-dfiles-head"><FolderOpen size={18} /><div><strong>Pasta do entregável</strong><p>{total === 0 ? 'Nenhum arquivo ainda. Anexe pela conversa do entregável ou de uma subtarefa.' : `${total} ${total === 1 ? 'arquivo' : 'arquivos'}. É assim que o cliente vê a pasta em Documentos: uma parte por subtarefa, só com o que estiver liberado.`}</p></div></div>
    {groups.map((group) => <div className="v2-dfiles-group" key={group.key}>
      <h4>{group.title}<small>{group.hint} · {group.files.length} {group.files.length === 1 ? 'arquivo' : 'arquivos'}</small></h4>
      {group.files.length ? <ul className="v2-stm-filelist">{group.files.map((file) => { const final = finals.find((row) => row.storage_path === file.path); const state = final?.status || 'none'; const working = busy === file.path; return <li key={file.path}>
        <button type="button" className="workspace-chat-attachment" onClick={() => void open(file.path)}><span>📎</span><span><strong>{file.name}</strong><small>{file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB · ` : ''}{dateLabel(file.when)}</small></span></button>
        <span className={`v2-final-state s-${state}`}>{state === 'published' ? 'Liberado ao cliente' : state === 'draft' ? 'Aguardando liberação da Patricia' : state === 'archived' ? 'Suspenso' : 'Arquivo de trabalho'}{final && state !== 'archived' && renaming?.id !== final.id && <small className="v2-final-name">O cliente vê como: {final.title || file.name}</small>}</span>
        <span className="v2-final-actions">{final && renaming?.id === final.id ? <><input className="v2-final-rename" value={renaming.title} maxLength={200} disabled={savingName} aria-label="Nome do documento para o cliente" onChange={(event) => setRenaming({ id: final.id, title: event.target.value })} onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Enter') { event.preventDefault(); void rename(); }
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!renamePending.current) closeRename(); }
        }} autoFocus />
          {renameError && <span role="alert">{renameError}</span>}
          <button type="button" disabled={savingName} onClick={closeRename}>Cancelar</button>
          <Button type="button" variant="primary" disabled={savingName || !renaming.title.trim()} onClick={() => void rename()}>{savingName ? 'Salvando nome' : 'Salvar nome'}</Button></> : removing === file.path ? <><em>Retirar da pasta do cliente?</em><button type="button" onClick={() => setRemoving('')}>Manter</button><button type="button" className="danger" disabled={working} onClick={() => void act(file, group, 'delete')}>Retirar</button></> : staff
          ? (state === 'none' || state === 'archived') && <button type="button" disabled={working} onClick={() => void act(file, group, 'propose')}>Propor como entrega final</button>
          : <>{state !== 'published' && <Button type="button" variant="primary" disabled={working} onClick={() => void act(file, group, 'release')}>Liberar para o cliente</Button>}{state === 'draft' && <button type="button" disabled={working} onClick={() => void act(file, group, 'refuse')}>Recusar</button>}{state === 'published' && <button type="button" disabled={working} onClick={() => void act(file, group, 'suspend')}>Suspender</button>}{final && state !== 'archived' && <button type="button" disabled={working} ref={(button) => {
          if (button && renameFocus.current === final.id) { renameFocus.current = null; button.focus({ preventScroll: true }); }
        }} onClick={() => setRenaming({ id: final.id, title: final.title || file.name })}>Renomear</button>}{state !== 'none' && <button type="button" disabled={working} onClick={() => setRemoving(file.path)}>Excluir</button>}</>}</span>
      </li>; })}</ul> : <p className="v2-dfiles-empty">Sem arquivos nesta conversa.</p>}
    </div>)}
  </section>;
}
