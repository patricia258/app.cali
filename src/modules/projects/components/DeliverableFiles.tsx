/* Aba "Arquivos" do entregável: a pasta. Reúne o que foi anexado na conversa do entregável e na conversa de cada subtarefa.
   Cada arquivo abre com a sessão do Workspace. Serve à administradora e à Equipe CALI. */
import { Button } from '../../../components/ds/Button';
import { EmptyState } from '../../../components/ds/EmptyState';
import { useEffect, useRef, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { isSupabaseConfigured } from '../../../api/access/session';
import { readProjectActor } from '../../../api/projects/conversation';
import {
  archiveProjectFile,
  insertProjectFile,
  proposeFinalProjectFile,
  readDeliverableAttachmentSources,
  readFinalProjectFiles,
  releaseFinalProjectFile,
  removeProjectFile,
  renameProjectFile,
} from '../../../api/projects/files';
import { openPrivateWorkspaceFile } from '../../../api/files/workspace';

type FileItem = { name: string; path: string; size: number; when: string; mime: string };
type FinalRow = { id: string; storage_path: string | null; status: string; title: string | null };
type Group = { key: string; title: string; hint: string; files: FileItem[] };
const TOKEN = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;
const safe = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};
function filesOf(body: string, when: string) {
  const out: FileItem[] = [];
  String(body || '').replace(TOKEN, (_all, name, path, type, size) => {
    out.push({ name: safe(name), path: safe(path), size: Number(size || 0), when, mime: safe(type) });
    return '';
  });
  return out;
}
const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(iso))
    .replace('.', '');

export function DeliverableFiles({
  deliverableId,
  deliverableTitle,
  companyId,
  projectId,
  staff,
  tasks,
  onNotice,
}: {
  deliverableId: string;
  deliverableTitle: string;
  companyId: string;
  projectId?: string | null;
  staff: boolean;
  tasks: { id: string; title: string }[];
  onNotice: (message: string) => void;
}) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [finals, setFinals] = useState<FinalRow[]>([]);
  const [busy, setBusy] = useState('');
  const [removing, setRemoving] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const renameFocus = useRef<string | null>(null);
  const renamePending = useRef(false);
  const [savingName, setSavingName] = useState(false);
  const [renameError, setRenameError] = useState('');
  function closeRename() {
    renameFocus.current = renaming?.id ?? null;
    setRenaming(null);
    setRenameError('');
  }
  async function loadFinals() {
    if (!isSupabaseConfigured) return;
    const result = await readFinalProjectFiles({ deliverableId });
    if (!result.error) setFinals((result.data || []) as FinalRow[]);
  }
  useEffect(() => {
    void loadFinals();
  }, [deliverableId]);
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
  async function act(
    file: FileItem,
    group: Group,
    action: 'propose' | 'release' | 'suspend' | 'refuse' | 'delete',
  ) {
    if (!isSupabaseConfigured || busy) return;
    setBusy(file.path);
    const taskId = group.key === 'main' ? null : group.key;
    const existing = finals.find((row) => row.storage_path === file.path);
    let failure: { message: string } | null = null;
    if (action === 'propose') failure = (await proposeFinalProjectFile(deliverableId, taskId, file)).error;
    else if (action === 'release') {
      const { data: auth } = await readProjectActor();
      failure = existing
        ? (await releaseFinalProjectFile(existing.id)).error
        : (
            await insertProjectFile({
              company_id: companyId,
              project_id: projectId || null,
              deliverable_id: deliverableId,
              task_id: taskId,
              title: group.title,
              category: 'deliverable',
              storage_path: file.path,
              original_filename: file.name,
              file_type: file.mime || 'application/octet-stream',
              file_size_bytes: file.size,
              client_visible: true,
              status: 'published',
              published_at: new Date().toISOString(),
              workflow_origin: 'deliverable',
              uploaded_by: auth.user?.id || null,
            })
          ).error;
    } else if (action === 'delete' && existing) failure = (await removeProjectFile(existing.id)).error;
    else if (existing) failure = (await archiveProjectFile(existing.id)).error;
    setBusy('');
    setRemoving('');
    if (failure) {
      onNotice(failure.message || 'Não foi possível concluir esta ação.');
      return;
    }
    onNotice(
      action === 'propose'
        ? 'Enviado para a Patricia liberar ao cliente.'
        : action === 'release'
          ? 'Liberado para o cliente em Documentos.'
          : action === 'suspend'
            ? 'Suspenso: o cliente deixou de ver este documento.'
            : action === 'delete'
              ? 'Documento retirado da pasta do cliente. O arquivo continua na conversa.'
              : 'Proposta recusada.',
    );
    await loadFinals();
  }
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    setGroups(null);
    void (async () => {
      const [main, sub] = await readDeliverableAttachmentSources(deliverableId);
      if (!alive) return;
      const next: Group[] = [
        {
          key: 'main',
          title: deliverableTitle,
          hint: 'Conversa do entregável',
          files: ((main.data || []) as { body: string; created_at: string }[]).flatMap((row) =>
            filesOf(row.body, row.created_at),
          ),
        },
      ];
      tasks.forEach((task) =>
        next.push({
          key: task.id,
          title: task.title,
          hint: 'Subtarefa',
          files: ((sub.data || []) as { task_id: string; body: string; created_at: string }[])
            .filter((row) => row.task_id === task.id)
            .flatMap((row) => filesOf(row.body, row.created_at)),
        }),
      );
      setGroups(next);
    })();
    return () => {
      alive = false;
    };
  }, [deliverableId, tasks.map((task) => task.id).join(',')]);
  async function open(path: string) {
    try {
      await openPrivateWorkspaceFile(path);
    } catch {
      onNotice('Não foi possível abrir este arquivo agora.');
    }
  }
  if (!groups)
    return (
      <EmptyState as="p" variant="admin" className="data-loading" aria-busy="true">
        Carregando arquivos…
      </EmptyState>
    );
  const total = groups.reduce((sum, group) => sum + group.files.length, 0);
  return (
    <section aria-label="Pasta do entregável" className="tw:flex tw:flex-col tw:gap-[1.231rem]">
      <div className="tw:flex tw:items-start tw:gap-[0.923rem] tw:rounded-[0.769rem] tw:bg-[#fbf7f4] tw:px-[1.231rem] tw:py-[1.077rem] tw:text-cali-brand tw:[&_svg]:shrink-0 tw:[&_strong]:text-[1.038rem] tw:[&_p]:mt-[0.231rem] tw:[&_p]:mb-0 tw:[&_p]:text-[0.923rem] tw:[&_p]:text-[#7d726b]">
        <FolderOpen size={18} />
        <div>
          <strong>Pasta do entregável</strong>
          <p>
            {total === 0
              ? 'Nenhum arquivo ainda. Anexe pela conversa do entregável ou de uma subtarefa.'
              : `${total} ${total === 1 ? 'arquivo' : 'arquivos'}. É assim que o cliente vê a pasta em Documentos: uma parte por subtarefa, só com o que estiver liberado.`}
          </p>
        </div>
      </div>
      {groups.map((group) => (
        <div
          className="tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-white tw:px-[1.231rem] tw:py-[1.077rem]"
          key={group.key}
        >
          <h4 className="tw:mt-0 tw:mb-[0.769rem] tw:flex tw:flex-wrap tw:items-baseline tw:gap-[0.769rem] tw:text-[1rem] tw:text-cali-ink tw:[&_small]:text-[0.808rem] tw:[&_small]:font-medium tw:[&_small]:text-[#9a8d85]">
            {group.title}
            <small>
              {group.hint} · {group.files.length} {group.files.length === 1 ? 'arquivo' : 'arquivos'}
            </small>
          </h4>
          {group.files.length ? (
            <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-[0.615rem] tw:p-0">
              {group.files.map((file) => {
                const final = finals.find((row) => row.storage_path === file.path);
                const state = final?.status || 'none';
                const working = busy === file.path;
                return (
                  <li
                    key={file.path}
                    className="tw:grid tw:grid-cols-[minmax(0,1fr)_auto_auto] tw:items-center tw:gap-[1.077rem] tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#f0e8e1] tw:bg-[#fdfaf7] tw:px-[0.923rem] tw:py-[0.769rem] tw:max-[45rem]:grid-cols-1"
                  >
                    <button
                      type="button"
                      className="tw:m-0 tw:inline-flex tw:w-fit tw:max-w-full tw:cursor-pointer tw:items-center tw:gap-[0.692rem] tw:justify-self-start tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#e6d9ce] tw:bg-[#fffaf7] tw:px-[0.923rem] tw:py-[0.615rem] tw:text-left tw:text-cali-ink tw:[&>span:last-child]:flex tw:[&>span:last-child]:min-w-0 tw:[&>span:last-child]:flex-col tw:[&>span:last-child]:gap-[0.077rem] tw:[&_strong]:block tw:[&_strong]:max-w-[17.692rem] tw:[&_strong]:truncate tw:[&_strong]:text-[0.923rem] tw:[&_small]:text-[0.769rem] tw:[&_small]:text-[#8a7c74]"
                      onClick={() => void open(file.path)}
                    >
                      <span>📎</span>
                      <span>
                        <strong>{file.name}</strong>
                        <small>
                          {file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB · ` : ''}
                          {dateLabel(file.when)}
                        </small>
                      </span>
                    </button>
                    <span
                      className={`tw:text-[0.846rem] tw:font-bold tw:whitespace-nowrap ${state === 'published' ? 'tw:text-[#356448]' : state === 'draft' ? 'tw:text-[#8a5a12]' : state === 'archived' ? 'tw:text-[#a03535]' : 'tw:text-[#8a7c74]'}`}
                    >
                      {state === 'published'
                        ? 'Liberado ao cliente'
                        : state === 'draft'
                          ? 'Aguardando liberação da Patricia'
                          : state === 'archived'
                            ? 'Suspenso'
                            : 'Arquivo de trabalho'}
                      {final && state !== 'archived' && renaming?.id !== final.id && (
                        <small className="tw:mt-[0.154rem] tw:block tw:text-[0.808rem] tw:font-normal tw:text-[#7d726b]">
                          O cliente vê como: {final.title || file.name}
                        </small>
                      )}
                    </span>
                    <span className="tw:flex tw:gap-[0.615rem] tw:max-[45rem]:flex-wrap tw:[&_button]:h-[2.462rem]! tw:[&_button]:cursor-pointer tw:[&_button]:rounded-[0.615rem]! tw:[&_button]:border! tw:[&_button]:border-solid tw:[&_button]:border-[#dfd3ca] tw:[&_button]:bg-white tw:[&_button]:px-[0.923rem]! tw:[&_button]:py-0! tw:[&_button]:text-[0.885rem]! tw:[&_button]:font-bold! tw:[&_button]:whitespace-nowrap tw:[&_button]:text-cali-brand tw:[&_button.primary]:border-cali-brand! tw:[&_button.primary]:bg-cali-brand! tw:[&_button.primary]:text-white! tw:[&_button.danger]:border-[#b23b3b] tw:[&_button.danger]:bg-[#b23b3b] tw:[&_button.danger]:text-white tw:[&_button:disabled]:cursor-default tw:[&_button:disabled]:opacity-50 tw:[&_em]:self-center tw:[&_em]:text-[0.885rem] tw:[&_em]:font-bold tw:[&_em]:text-[#8a2f2f] tw:[&_em]:not-italic">
                      {final && renaming?.id === final.id ? (
                        <>
                          <input
                            className="tw:box-border tw:h-[2.462rem] tw:min-w-[16.923rem] tw:rounded-[0.615rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[0.769rem] tw:text-[0.923rem] tw:max-[45rem]:min-w-0 tw:max-[45rem]:w-full"
                            value={renaming.title}
                            maxLength={200}
                            disabled={savingName}
                            aria-label="Nome do documento para o cliente"
                            onChange={(event) => setRenaming({ id: final.id, title: event.target.value })}
                            onKeyDown={(event) => {
                              if (event.nativeEvent.isComposing) return;
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                void rename();
                              }
                              if (event.key === 'Escape') {
                                event.preventDefault();
                                event.stopPropagation();
                                if (!renamePending.current) closeRename();
                              }
                            }}
                            autoFocus
                          />
                          {renameError && <span role="alert">{renameError}</span>}
                          <button type="button" disabled={savingName} onClick={closeRename}>
                            Cancelar
                          </button>
                          <Button
                            type="button"
                            variant="primary"
                            disabled={savingName || !renaming.title.trim()}
                            onClick={() => void rename()}
                          >
                            {savingName ? 'Salvando nome' : 'Salvar nome'}
                          </Button>
                        </>
                      ) : removing === file.path ? (
                        <>
                          <em>Retirar da pasta do cliente?</em>
                          <button type="button" onClick={() => setRemoving('')}>
                            Manter
                          </button>
                          <button
                            type="button"
                            className="danger"
                            disabled={working}
                            onClick={() => void act(file, group, 'delete')}
                          >
                            Retirar
                          </button>
                        </>
                      ) : staff ? (
                        (state === 'none' || state === 'archived') && (
                          <button
                            type="button"
                            disabled={working}
                            onClick={() => void act(file, group, 'propose')}
                          >
                            Propor como entrega final
                          </button>
                        )
                      ) : (
                        <>
                          {state !== 'published' && (
                            <Button
                              type="button"
                              variant="primary"
                              disabled={working}
                              onClick={() => void act(file, group, 'release')}
                            >
                              Liberar para o cliente
                            </Button>
                          )}
                          {state === 'draft' && (
                            <button
                              type="button"
                              disabled={working}
                              onClick={() => void act(file, group, 'refuse')}
                            >
                              Recusar
                            </button>
                          )}
                          {state === 'published' && (
                            <button
                              type="button"
                              disabled={working}
                              onClick={() => void act(file, group, 'suspend')}
                            >
                              Suspender
                            </button>
                          )}
                          {final && state !== 'archived' && (
                            <button
                              type="button"
                              disabled={working}
                              ref={(button) => {
                                if (button && renameFocus.current === final.id) {
                                  renameFocus.current = null;
                                  button.focus({ preventScroll: true });
                                }
                              }}
                              onClick={() => setRenaming({ id: final.id, title: final.title || file.name })}
                            >
                              Renomear
                            </button>
                          )}
                          {state !== 'none' && (
                            <button type="button" disabled={working} onClick={() => setRemoving(file.path)}>
                              Excluir
                            </button>
                          )}
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="tw:m-0 tw:text-[0.923rem] tw:text-[#8a7c74]">Sem arquivos nesta conversa.</p>
          )}
        </div>
      ))}
    </section>
  );
}
