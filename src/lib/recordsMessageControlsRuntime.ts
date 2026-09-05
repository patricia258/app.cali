import { supabase } from './supabase';

type ReactionCode = 'ok' | 'like' | 'question' | 'heart' | 'smile';
type MessageRow = {
  id: string;
  author_role: 'admin' | 'client' | 'system';
  body: string;
  edited_at?: string | null;
  visibility: 'client' | 'internal';
};
type ReactionRow = { message_id: string; user_id: string; reaction: ReactionCode };

let installed = false;
let observer: MutationObserver | null = null;
let debounce = 0;
let busy = false;
let activeRecord = '';
let viewerId = '';
let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

const attachmentPattern = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;
const reactionOptions: Array<{ code: ReactionCode; symbol: string; label: string }> = [
  { code: 'ok', symbol: '✓', label: 'Entendido' },
  { code: 'like', symbol: '👍', label: 'Gostei' },
  { code: 'question', symbol: '?', label: 'Tenho uma dúvida' },
  { code: 'heart', symbol: '♥', label: 'Amei' },
  { code: 'smile', symbol: '☺', label: 'Legal' },
];

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
  const history = document.querySelector<HTMLElement>('.records-v13-drawer .conversation-history');
  if (!history) return;
  history.dataset.recordsSignature = '';
  const marker = document.createElement('i');
  marker.hidden = true;
  history.append(marker);
  marker.remove();
}

async function editMessage(message: MessageRow, bubble: HTMLElement) {
  if (!supabase || pageRole() !== 'admin' || message.author_role !== 'admin') return;
  if (bubble.querySelector('.records-inline-edit')) return;
  const parsed = parseBody(message.body);
  const currentBody = bubble.querySelector('p');
  const editor = document.createElement('div');
  editor.className = 'records-inline-edit';
  const textarea = document.createElement('textarea');
  textarea.value = parsed.clean;
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
  cancel.onclick = () => { nudgeConversation(); };
  save.onclick = async () => {
    const text = textarea.value.trim();
    if (!text && !parsed.tokens.length) return;
    save.disabled = true;
    try {
      const body = [text, parsed.tokens.join('\n')].filter(Boolean).join('\n');
      const result = await supabase!.rpc('edit_account_record_message', { p_message_id: message.id, p_body: body });
      if (result.error) throw result.error;
      nudgeConversation();
      window.setTimeout(schedule, 120);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível editar a mensagem.');
    } finally {
      save.disabled = false;
    }
  };
  actions.append(cancel, save);
  editor.append(textarea, actions);
  if (currentBody) currentBody.replaceWith(editor);
  else bubble.append(editor);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

async function deleteMessage(message: MessageRow) {
  if (!supabase || pageRole() !== 'admin' || message.author_role !== 'admin') return;
  if (!confirm('Excluir esta mensagem do histórico visível para o cliente?')) return;
  try {
    const result = await supabase.rpc('delete_account_record_message', { p_message_id: message.id });
    if (result.error) throw result.error;
    nudgeConversation();
    window.setTimeout(schedule, 120);
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Não foi possível excluir a mensagem.');
  }
}

async function toggleReaction(messageId: string, reaction: ReactionCode) {
  if (!supabase) return;
  try {
    const result = await supabase.rpc('toggle_account_record_message_reaction', { p_message_id: messageId, p_reaction: reaction });
    if (result.error) throw result.error;
    window.setTimeout(schedule, 80);
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Não foi possível registrar a reação.');
  }
}

function decorateMessage(line: HTMLElement, message: MessageRow, reactions: ReactionRow[]) {
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
    edit.textContent = '✎';
    edit.title = 'Editar mensagem';
    edit.setAttribute('aria-label', 'Editar mensagem');
    edit.onclick = (event) => { event.stopPropagation(); void editMessage(message, bubble); };
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.title = 'Excluir mensagem';
    remove.setAttribute('aria-label', 'Excluir mensagem');
    remove.onclick = (event) => { event.stopPropagation(); void deleteMessage(message); };
    controls.append(edit, remove);
    extra.append(controls);
  }
  if (extra.childNodes.length) head.append(extra);

  bubble.querySelector('.records-message-reactions')?.remove();
  if (message.visibility !== 'client' || message.author_role === 'system') return;
  const bar = document.createElement('div');
  bar.className = 'records-message-reactions';
  reactionOptions.forEach((option) => {
    const matching = reactions.filter((item) => item.message_id === message.id && item.reaction === option.code);
    const mine = viewerId && matching.some((item) => item.user_id === viewerId);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = mine ? 'active' : '';
    button.title = option.label;
    button.setAttribute('aria-label', option.label);
    button.setAttribute('aria-pressed', String(Boolean(mine)));
    const icon = document.createElement('span');
    icon.textContent = option.symbol;
    button.append(icon);
    if (matching.length) {
      const count = document.createElement('small');
      count.textContent = String(matching.length);
      button.append(count);
    }
    button.onclick = (event) => {
      event.stopPropagation();
      void toggleReaction(message.id, option.code);
    };
    bar.append(button);
  });
  bubble.append(bar);
}

async function subscribe(recordId: string) {
  if (!supabase || (activeRecord === recordId && channel)) return;
  if (channel) await supabase.removeChannel(channel);
  activeRecord = recordId;
  channel = supabase.channel(`records-controls-${recordId}-${Date.now()}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'cali_workspace', table: 'account_record_messages', filter: `record_id=eq.${recordId}` }, () => {
      nudgeConversation();
      window.setTimeout(schedule, 100);
    })
    .on('postgres_changes', { event: '*', schema: 'cali_workspace', table: 'account_record_message_reactions', filter: `record_id=eq.${recordId}` }, () => {
      window.setTimeout(schedule, 80);
    })
    .subscribe();
}

async function sync() {
  if (busy || !supabase || !pageRole()) return;
  const drawer = document.querySelector<HTMLElement>('.records-v13-drawer');
  const history = drawer?.querySelector<HTMLElement>('.conversation-history');
  const protocol = drawer?.querySelector<HTMLElement>('.section-kicker')?.textContent?.trim() || '';
  if (!drawer || !history || !protocol.startsWith('CALI-REG-')) return;
  busy = true;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    viewerId = sessionData.session?.user?.id || '';
    const { data: record } = await supabase.from('account_records').select('id').eq('protocol', protocol).maybeSingle();
    if (!record?.id) return;
    const [messageResult, reactionResult] = await Promise.all([
      supabase.from('account_record_messages').select('id,author_role,body,edited_at,visibility').eq('record_id', record.id).is('deleted_at', null).order('created_at'),
      supabase.from('account_record_message_reactions').select('message_id,user_id,reaction').eq('record_id', record.id),
    ]);
    if (messageResult.error) return;
    const messages = (messageResult.data || []) as MessageRow[];
    const reactionRows = reactionResult.error ? [] : ((reactionResult.data || []) as ReactionRow[]);
    const lines = Array.from(history.querySelectorAll<HTMLElement>('.records-chat-line'));
    if (lines.length !== messages.length) {
      nudgeConversation();
      window.setTimeout(schedule, 140);
      return;
    }
    messages.forEach((message, index) => decorateMessage(lines[index], message, reactionRows));
    await subscribe(record.id);
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
  window.addEventListener('focus', schedule);
  window.addEventListener('popstate', schedule);
}
