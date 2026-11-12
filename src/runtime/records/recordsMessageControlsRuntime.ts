import { showMessage, confirmAction } from '../../components/feedback/workspaceDialogs';
import { recordsAvailable } from '../../api/records/client';
import {
  deleteRecordMessage, editRecordMessage, listRecordMessages, subscribeRecordMessages,
  type ConversationMessageRow as MessageRow,
} from '../../api/records/conversation';
import { readRecordIdentity } from '../../api/records/workspace';

let installed = false;
let observer: MutationObserver | null = null;
let debounce = 0;
let busy = false;
let activeRecord = '';
let unsubscribeMessages: (() => void) | null = null;
let decorated: { history: HTMLElement; protocol: string; lines: HTMLElement[] } | null = null;
let pendingEditFocus: { id: string; trigger: HTMLButtonElement; history: HTMLElement } | null = null;

const attachmentPattern = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;
const drawerSelector = ":is(.records-v13-drawer,[data-v2-operation~='records-v13-drawer'])";
const historySelector = ":is(.conversation-history,[data-v2-operation~='conversation-history'])";
function pageRole() {
  if (location.pathname.startsWith('/admin/registros')) return 'admin';
  if (location.pathname.startsWith('/cliente/registros')) return 'client';
  return null;
}

function parseBody(body: string) {
  const tokens: string[] = [];
  const clean = body.replace(attachmentPattern, (match) => {
    tokens.push(match);
    return '';
  }).trim();
  return { clean, tokens };
}

function nudgeConversation() {
  const history = document.querySelector<HTMLElement>(`${drawerSelector} ${historySelector}`);
  if (!history) return;
  history.dataset.recordsSignature = '';
  // O módulo da conversa só relê as mensagens quando o painel não está marcado como pronto.
  const panel = history.closest<HTMLElement>(drawerSelector);
  if (panel) delete panel.dataset.recordsRich;
  const marker = document.createElement('i');
  marker.hidden = true;
  history.append(marker);
  marker.remove();
}

async function editMessage(message: MessageRow, bubble: HTMLElement, trigger: HTMLButtonElement) {
  if (!recordsAvailable || pageRole() !== 'admin' || message.author_role !== 'admin') return;
  if (bubble.querySelector('.records-inline-edit')) return;
  const parsed = parseBody(message.body);
  const currentBody = bubble.querySelector('p');
  const editor = document.createElement('div');
  editor.className = 'records-inline-edit';
  const textarea = document.createElement('textarea');
  textarea.value = parsed.clean;
  textarea.setAttribute('aria-label', 'Editar texto da mensagem');
  textarea.rows = Math.max(3, Math.min(7, parsed.clean.split('\n').length + 1));
  const actions = document.createElement('div');
  actions.className = 'records-inline-edit-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'secondary';
  cancel.textContent = 'Cancelar';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'primary';
  save.textContent = 'Salvar';
  // Cancelar devolve o texto na hora, sem depender da releitura da conversa.
  const closeEditor = () => { if (currentBody) editor.replaceWith(currentBody); else editor.remove(); };
  cancel.onclick = () => { closeEditor(); trigger.focus(); };
  save.onclick = async () => {
    const text = textarea.value.trim();
    if (!text && !parsed.tokens.length) return;
    const hadFocus = editor.contains(document.activeElement);
    const shouldRestoreFocus = () => hadFocus && (editor.contains(document.activeElement) || document.activeElement === document.body);
    save.disabled = true;
    try {
      const body = [text, parsed.tokens.join('\n')].filter(Boolean).join('\n');
      const result = await editRecordMessage(message.id, body);
      if (result.error) throw result.error;
      if (!editor.isConnected) return;
      const restoreFocus = shouldRestoreFocus();
      if (currentBody) currentBody.textContent = text;
      closeEditor();
      if (restoreFocus) {
        const history = bubble.closest<HTMLElement>(historySelector);
        if (history) pendingEditFocus = { id: message.id, trigger, history };
        trigger.focus();
      }
      nudgeConversation();
      window.setTimeout(schedule, 120);
    } catch (error) {
      void showMessage(error instanceof Error ? error.message : 'Não foi possível editar a mensagem.');
    } finally {
      save.disabled = false;
      if (editor.isConnected && shouldRestoreFocus()) save.focus();
    }
  };
  actions.append(cancel, save);
  editor.append(textarea, actions);
  if (currentBody) currentBody.replaceWith(editor);
  else bubble.append(editor);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

async function deleteMessage(message: MessageRow, trigger: HTMLButtonElement) {
  if (!recordsAvailable || pageRole() !== 'admin' || message.author_role !== 'admin') return;
  if (!await confirmAction('Excluir esta mensagem do histórico visível para o cliente?')) return;
  try {
    const result = await deleteRecordMessage(message.id);
    if (result.error) throw result.error;
    const drawer = trigger.closest<HTMLElement>(drawerSelector);
    if (!drawer) return;
    if (document.activeElement === trigger) {
      const fallback = drawer.querySelector<HTMLElement>('#wf-answer') ?? drawer.querySelector<HTMLElement>('button[aria-label="Fechar"]');
      fallback?.focus();
    }
    nudgeConversation();
    window.setTimeout(schedule, 120);
  } catch (error) {
    void showMessage(error instanceof Error ? error.message : 'Não foi possível excluir a mensagem.');
  }
}

function decorateMessage(line: HTMLElement, message: MessageRow) {
  line.dataset.messageId = message.id;
  const bubble = line.querySelector<HTMLElement>('.records-chat-bubble');
  const head = bubble?.querySelector<HTMLElement>('.records-chat-head');
  if (!bubble || !head) return;

  head.querySelector('.records-message-meta-extra')?.remove();
  const extra = document.createElement('span');
  extra.className = 'records-message-meta-extra';
  if (message.edited_at) {
    const edited = document.createElement('em');
    edited.textContent = 'editada';
    edited.title = 'Mensagem editada pela CALI';
    extra.append(edited);
  }
  if (pageRole() === 'admin' && message.author_role === 'admin' && message.visibility === 'client') {
    const controls = document.createElement('span');
    controls.className = 'records-message-admin-controls';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>';
    edit.title = 'Editar mensagem';
    edit.setAttribute('aria-label', 'Editar mensagem');
    edit.onclick = (event) => { event.stopPropagation(); void editMessage(message, bubble, edit); };
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
    remove.title = 'Excluir mensagem';
    remove.setAttribute('aria-label', 'Excluir mensagem');
    remove.onclick = (event) => { event.stopPropagation(); void deleteMessage(message, remove); };
    controls.append(edit, remove);
    extra.append(controls);
  }
  if (extra.childNodes.length) head.append(extra);
}

function stopWatchingMessages() {
  unsubscribeMessages?.();
  unsubscribeMessages = null;
  activeRecord = '';
}

function watchMessages(recordId: string) {
  if (activeRecord === recordId && unsubscribeMessages) return;
  stopWatchingMessages();
  activeRecord = recordId;
  unsubscribeMessages = subscribeRecordMessages(recordId, 'UPDATE', () => {
    nudgeConversation();
    window.setTimeout(schedule, 100);
  });
}

async function sync() {
  if (busy || !recordsAvailable) return;
  const role = pageRole();
  const drawer = document.querySelector<HTMLElement>(drawerSelector);
  const history = drawer?.querySelector<HTMLElement>(historySelector);
  const readProtocol = () => drawer?.querySelector<HTMLElement>('.section-kicker')?.textContent?.trim() || '';
  const protocol = readProtocol();
  if (!role || !drawer || !history || !protocol.startsWith('CALI-REG-')) {
    stopWatchingMessages();
    decorated = null;
    pendingEditFocus = null;
    return;
  }
  const currentLines = Array.from(history.querySelectorAll<HTMLElement>('.records-chat-line'));
  // A decoração também dispara o observer. Só consulte após uma nova renderização da conversa.
  const previous = decorated;
  if (history === previous?.history && protocol === previous.protocol &&
      currentLines.length === previous.lines.length && currentLines.every((line, index) => line === previous.lines[index])) return;
  busy = true;
  try {
    const { data: record } = await readRecordIdentity(protocol);
    if (!record?.id || !drawer.isConnected) return;
    const { data: messages, error } = await listRecordMessages(record.id);
    if (error || !messages || !history.isConnected || pageRole() !== role || readProtocol() !== protocol) return;
    watchMessages(record.id);
    const lines = Array.from(history.querySelectorAll<HTMLElement>('.records-chat-line'));
    if (lines.length !== messages.length) return;
    messages.forEach((message, index) => decorateMessage(lines[index], message));
    decorated = { history, protocol, lines };
    if (pendingEditFocus) {
      const { id, trigger, history: previousHistory } = pendingEditFocus;
      pendingEditFocus = null;
      if (history === previousHistory && (document.activeElement === document.body || document.activeElement === trigger)) {
        lines.find((line) => line.dataset.messageId === id)?.querySelector<HTMLButtonElement>('button[aria-label="Editar mensagem"]')?.focus();
      }
    }
  } finally {
    busy = false;
  }
}

function schedule() {
  clearTimeout(debounce);
  debounce = window.setTimeout(() => void sync(), 70);
}

export function installRecordsMessageControlsRuntime() {
  if (installed) return;
  installed = true;
  const start = () => {
    schedule();
    observer?.disconnect();
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener('cali-route-change', schedule);
  window.addEventListener('focus', schedule);
  window.addEventListener('popstate', schedule);
}
