import { supabase } from './supabase';

type WorkspaceRole = 'admin' | 'client';
type RecordIdentity = {
  id?: string | null;
  full_name: string;
  avatar_url?: string | null;
  avatar_position_x?: number | null;
  avatar_position_y?: number | null;
  avatar_zoom?: number | null;
};
type MessageRow = {
  id: string;
  record_id: string;
  author_id?: string | null;
  author_role: 'admin' | 'client' | 'system';
  body: string;
  visibility: 'client' | 'internal';
  created_at: string;
};

type AttachmentToken = { name: string; path: string; mime: string; size: number };

let installed = false;
let observer: MutationObserver | null = null;
let timer = 0;
let enhancing = false;
let currentRecordId = '';
let currentCompanyId = '';
let conversationChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
let pendingAttachments: AttachmentToken[] = [];

const emojiSet = ['🙂','😊','👍','🙏','✨','✅','💡','📌','📎','❤️','👏','🤝'];
const attachmentPattern = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;

function pageRole(): WorkspaceRole | null {
  if (window.location.pathname.startsWith('/admin/registros')) return 'admin';
  if (window.location.pathname.startsWith('/cliente/registros')) return 'client';
  return null;
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'C';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date).replace('.', '');
}

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 90) || 'arquivo';
}

function avatarNode(identity: RecordIdentity, className: string) {
  const node = document.createElement('span');
  node.className = className;
  if (identity.avatar_url) {
    const img = document.createElement('img');
    img.src = identity.avatar_url;
    img.alt = '';
    img.style.objectPosition = `${Number(identity.avatar_position_x ?? 50)}% ${Number(identity.avatar_position_y ?? 50)}%`;
    img.style.transform = `scale(${Number(identity.avatar_zoom ?? 1)})`;
    node.appendChild(img);
  } else {
    node.textContent = initials(identity.full_name);
  }
  return node;
}

function setNativeValue(input: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

function parseMessageBody(body: string) {
  const attachments: AttachmentToken[] = [];
  const clean = body.replace(attachmentPattern, (_full, name, path, mime, size) => {
    try {
      attachments.push({ name: decodeURIComponent(name), path: decodeURIComponent(path), mime: decodeURIComponent(mime), size: Number(size || 0) });
    } catch {
      attachments.push({ name, path, mime, size: Number(size || 0) });
    }
    return '';
  }).trim();
  return { clean, attachments };
}

function appendLinkifiedText(parent: HTMLElement, text: string) {
  const pieces = text.split(/(https?:\/\/[^\s]+)/g);
  pieces.forEach((piece) => {
    if (/^https?:\/\//i.test(piece)) {
      const link = document.createElement('a');
      link.href = piece;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = piece;
      parent.appendChild(link);
    } else if (piece) {
      parent.appendChild(document.createTextNode(piece));
    }
  });
}

async function openPrivateAttachment(attachment: AttachmentToken) {
  if (!supabase) return;
  const { data, error } = await supabase.storage.from('cali-workspace-private').createSignedUrl(attachment.path, 300);
  if (error || !data?.signedUrl) {
    window.alert('Não foi possível abrir este anexo agora.');
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

async function loadIdentities(role: WorkspaceRole, companyId: string) {
  const byId = new Map<string, RecordIdentity>();
  let adminFallback: RecordIdentity = { full_name: 'Patrícia Lima' };
  let clientFallback: RecordIdentity = { full_name: 'Cliente' };
  if (!supabase) return { byId, adminFallback, clientFallback };

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id || '';

  if (role === 'admin') {
    const [selfResult, clientResult] = await Promise.all([
      userId ? supabase.from('profiles').select('id,full_name,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom').eq('id', userId).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('profiles').select('id,full_name,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom').eq('company_id', companyId).eq('role', 'client').eq('active', true),
    ]);
    if (selfResult.data) {
      adminFallback = selfResult.data as RecordIdentity;
      byId.set(String((selfResult.data as any).id), adminFallback);
    }
    const clients = (clientResult.data || []) as RecordIdentity[];
    clients.forEach((item) => { if (item.id) byId.set(String(item.id), item); });
    if (clients[0]) clientFallback = clients[0];
  } else {
    const [selfResult, contactResult] = await Promise.all([
      userId ? supabase.from('profiles').select('id,full_name,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom').eq('id', userId).maybeSingle() : Promise.resolve({ data: null }),
      supabase.rpc('get_client_account_contact'),
    ]);
    if (selfResult.data) {
      clientFallback = selfResult.data as RecordIdentity;
      byId.set(String((selfResult.data as any).id), clientFallback);
    }
    const contact = Array.isArray(contactResult.data) ? contactResult.data[0] : contactResult.data;
    if (contact) adminFallback = contact as RecordIdentity;
  }
  return { byId, adminFallback, clientFallback };
}

function identityFor(message: MessageRow, identities: Awaited<ReturnType<typeof loadIdentities>>) {
  if (message.author_id && identities.byId.has(message.author_id)) return identities.byId.get(message.author_id)!;
  if (message.author_role === 'admin') return identities.adminFallback;
  if (message.author_role === 'client') return identities.clientFallback;
  return { full_name: 'CALI Workspace' } as RecordIdentity;
}

async function renderConversation(recordId: string, companyId: string, role: WorkspaceRole) {
  if (!supabase) return;
  const history = document.querySelector<HTMLElement>('.records-v13-drawer .conversation-history');
  if (!history) return;
  const [messageResult, identities] = await Promise.all([
    supabase.from('account_record_messages').select('id,record_id,author_id,author_role,body,visibility,created_at').eq('record_id', recordId).is('deleted_at', null).order('created_at'),
    loadIdentities(role, companyId),
  ]);
  if (messageResult.error) return;
  const messages = (messageResult.data || []) as MessageRow[];
  history.replaceChildren();

  if (!messages.length) {
    const empty = document.createElement('div');
    empty.className = 'records-chat-empty';
    empty.textContent = 'A conversa começa aqui.';
    history.appendChild(empty);
    return;
  }

  messages.forEach((message) => {
    const identity = identityFor(message, identities);
    const mine = message.author_role === role;
    const line = document.createElement('div');
    line.className = `conversation-line records-chat-line role-${message.author_role} ${mine ? 'mine' : 'other'} ${message.visibility === 'internal' ? 'internal' : ''}`;
    const avatar = avatarNode(identity, 'records-chat-avatar');
    const bubble = document.createElement('div');
    bubble.className = 'conversation-bubble records-chat-bubble';

    const head = document.createElement('div');
    head.className = 'records-chat-head';
    const name = document.createElement('strong');
    name.textContent = message.visibility === 'internal' ? `${identity.full_name} · nota interna` : identity.full_name;
    const time = document.createElement('time');
    time.textContent = formatDate(message.created_at);
    head.append(name, time);
    bubble.appendChild(head);

    const parsed = parseMessageBody(message.body);
    if (parsed.clean) {
      const body = document.createElement('p');
      appendLinkifiedText(body, parsed.clean);
      bubble.appendChild(body);
    }
    if (parsed.attachments.length) {
      const list = document.createElement('div');
      list.className = 'records-chat-attachments';
      parsed.attachments.forEach((attachment) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'records-chat-attachment';
        const kb = attachment.size ? `${Math.max(1, Math.round(attachment.size / 1024))} KB` : 'arquivo';
        button.innerHTML = `<span aria-hidden="true">📎</span><span><strong></strong><small>${kb}</small></span>`;
        const strong = button.querySelector('strong');
        if (strong) strong.textContent = attachment.name;
        button.addEventListener('click', () => void openPrivateAttachment(attachment));
        list.appendChild(button);
      });
      bubble.appendChild(list);
    }

    if (mine) line.append(bubble, avatar); else line.append(avatar, bubble);
    history.appendChild(line);
  });
  history.scrollTop = history.scrollHeight;
}

function renderPendingAttachments(compose: HTMLElement) {
  let tray = compose.querySelector<HTMLElement>('.records-chat-pending');
  if (!tray) {
    tray = document.createElement('div');
    tray.className = 'records-chat-pending';
    compose.prepend(tray);
  }
  tray.replaceChildren();
  pendingAttachments.forEach((attachment, index) => {
    const chip = document.createElement('span');
    chip.className = 'records-chat-pending-chip';
    const label = document.createElement('span');
    label.textContent = `📎 ${attachment.name}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remover ${attachment.name}`);
    remove.addEventListener('click', async () => {
      pendingAttachments.splice(index, 1);
      if (supabase) await supabase.storage.from('cali-workspace-private').remove([attachment.path]);
      renderPendingAttachments(compose);
    });
    chip.append(label, remove);
    tray!.appendChild(chip);
  });
  tray.style.display = pendingAttachments.length ? 'flex' : 'none';
}

async function uploadAttachment(file: File, recordId: string, companyId: string, compose: HTMLElement) {
  if (!supabase) return;
  const allowed = new Set(['application/pdf','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation']);
  if (!allowed.has(file.type)) {
    window.alert('Use PDF, imagem, Word, Excel ou PowerPoint.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    window.alert('Cada anexo pode ter até 10 MB.');
    return;
  }
  if (pendingAttachments.length >= 5) {
    window.alert('Você pode enviar até 5 anexos por mensagem.');
    return;
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return;
  const path = `records/${companyId}/${recordId}/${userId}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from('cali-workspace-private').upload(path, file, { upsert: false, contentType: file.type });
  if (error) {
    window.alert(`Não consegui anexar “${file.name}”.`);
    return;
  }
  pendingAttachments.push({ name: file.name, path, mime: file.type, size: file.size });
  renderPendingAttachments(compose);
}

async function sendRichMessage(recordId: string, textarea: HTMLTextAreaElement, sendButton: HTMLButtonElement, compose: HTMLElement) {
  if (!supabase) return;
  const text = textarea.value.trim();
  if (!text && !pendingAttachments.length) return;
  const tokens = pendingAttachments.map((item) => `[[arquivo|${encodeURIComponent(item.name)}|${encodeURIComponent(item.path)}|${encodeURIComponent(item.mime)}|${item.size}]]`).join('\n');
  const body = [text, tokens].filter(Boolean).join('\n');
  sendButton.disabled = true;
  sendButton.classList.add('is-sending');
  try {
    const result = await supabase.rpc('post_account_record_message', { p_record_id: recordId, p_body: body, p_internal: false });
    if (result.error) throw result.error;
    pendingAttachments = [];
    setNativeValue(textarea, '');
    renderPendingAttachments(compose);
    await enhanceDrawer(true);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.');
  } finally {
    sendButton.disabled = false;
    sendButton.classList.remove('is-sending');
  }
}

function enhanceComposer(recordId: string, companyId: string) {
  const compose = document.querySelector<HTMLElement>('.records-v13-drawer .conversation-compose');
  const textarea = compose?.querySelector<HTMLTextAreaElement>('textarea');
  const sendButton = compose?.querySelector<HTMLButtonElement>('button.primary');
  if (!compose || !textarea || !sendButton) return;
  if (!compose.querySelector('.records-chat-tools')) {
    const tools = document.createElement('div');
    tools.className = 'records-chat-tools';
    const attach = document.createElement('button');
    attach.type = 'button'; attach.title = 'Anexar arquivo'; attach.setAttribute('aria-label', 'Anexar arquivo'); attach.textContent = '📎';
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.multiple = true; fileInput.hidden = true;
    fileInput.accept = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx';
    attach.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      for (const file of Array.from(fileInput.files || [])) await uploadAttachment(file, recordId, companyId, compose);
      fileInput.value = '';
    });

    const link = document.createElement('button');
    link.type = 'button'; link.title = 'Inserir link'; link.setAttribute('aria-label', 'Inserir link'); link.textContent = '🔗';
    link.addEventListener('click', () => {
      const value = window.prompt('Cole o link que deseja compartilhar:');
      if (!value) return;
      const normalized = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
      setNativeValue(textarea, `${textarea.value}${textarea.value ? ' ' : ''}${normalized}`);
    });

    const emoji = document.createElement('button');
    emoji.type = 'button'; emoji.title = 'Inserir emoji'; emoji.setAttribute('aria-label', 'Inserir emoji'); emoji.textContent = '☺';
    const picker = document.createElement('div');
    picker.className = 'records-chat-emoji-picker'; picker.hidden = true;
    emojiSet.forEach((item) => {
      const option = document.createElement('button');
      option.type = 'button'; option.textContent = item;
      option.addEventListener('click', () => { setNativeValue(textarea, `${textarea.value}${item}`); picker.hidden = true; });
      picker.appendChild(option);
    });
    emoji.addEventListener('click', () => { picker.hidden = !picker.hidden; });
    tools.append(attach, fileInput, link, emoji, picker);
    compose.insertBefore(tools, textarea);
    renderPendingAttachments(compose);
  }

  if (!sendButton.dataset.richRecordsBound) {
    sendButton.dataset.richRecordsBound = '1';
    sendButton.addEventListener('click', (event) => {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      void sendRichMessage(recordId, textarea, sendButton, compose);
    }, true);
    textarea.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.shiftKey) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      void sendRichMessage(recordId, textarea, sendButton, compose);
    }, true);
  }
}

function subscribeConversation(recordId: string) {
  if (!supabase || currentRecordId === recordId && conversationChannel) return;
  if (conversationChannel) supabase.removeChannel(conversationChannel);
  currentRecordId = recordId;
  conversationChannel = supabase.channel(`records-live-${recordId}-${Date.now()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'cali_workspace', table: 'account_record_messages', filter: `record_id=eq.${recordId}` }, () => {
      window.setTimeout(() => void enhanceDrawer(true), 80);
    })
    .subscribe();
}

async function enhanceDrawer(force = false) {
  if (enhancing || !supabase) return;
  const role = pageRole();
  const drawer = document.querySelector<HTMLElement>('.records-v13-drawer');
  if (!role || !drawer) return;
  enhancing = true;
  try {
    const kicker = drawer.querySelector<HTMLElement>('.section-kicker')?.textContent?.trim() || '';
    if (!kicker.startsWith('CALI-REG-')) return;
    const { data: record } = await supabase.from('account_records').select('id,company_id').eq('protocol', kicker).maybeSingle();
    if (!record?.id || !record.company_id) return;
    currentCompanyId = record.company_id;
    subscribeConversation(record.id);
    await renderConversation(record.id, record.company_id, role);
    enhanceComposer(record.id, record.company_id);

    drawer.querySelectorAll<HTMLButtonElement>('.records-v13-drawer-actions button').forEach((button) => {
      const text = button.textContent?.trim();
      if (text === 'Assumir') button.textContent = 'Assumir atendimento';
      if (text === 'Enriquecer memória') button.textContent = 'Salvar na memória da conta';
    });
    drawer.dataset.recordsRich = force ? 'refreshed' : 'ready';
  } finally {
    enhancing = false;
  }
}

async function decorateAdminTable() {
  if (!supabase || pageRole() !== 'admin') return;
  const select = document.querySelector<HTMLSelectElement>('.records-v13-toolbar label:first-child select');
  const companyId = select?.value;
  if (!companyId) return;
  const { data: company } = await supabase.from('companies').select('display_name,logo_url').eq('id', companyId).maybeSingle();
  if (!company) return;
  document.querySelectorAll<HTMLTableRowElement>('.records-v13-table tbody tr').forEach((row) => {
    const cell = row.querySelector<HTMLTableCellElement>('td:nth-child(2)');
    if (!cell || cell.querySelector('.records-company-cell')) return;
    const wrap = document.createElement('span'); wrap.className = 'records-company-cell';
    const mark = document.createElement('span'); mark.className = 'records-company-logo';
    if (company.logo_url) {
      const img = document.createElement('img'); img.src = company.logo_url; img.alt = ''; mark.appendChild(img);
    } else mark.textContent = initials(company.display_name || 'C');
    const name = document.createElement('span'); name.textContent = company.display_name || cell.textContent || 'Cliente';
    wrap.append(mark, name); cell.replaceChildren(wrap);
  });
}

function normalizePageCopy() {
  const role = pageRole();
  if (!role) return;
  const heading = document.querySelector<HTMLElement>('.records-v13-heading h1');
  if (heading) heading.textContent = 'Ocorrências e solicitações';
}

function scheduleEnhance() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    normalizePageCopy();
    void decorateAdminTable();
    void enhanceDrawer();
  }, 60);
}

export function installRecordsExperienceRuntime() {
  if (installed) return;
  installed = true;
  const start = () => {
    scheduleEnhance();
    observer?.disconnect();
    observer = new MutationObserver(() => scheduleEnhance());
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener('popstate', scheduleEnhance);
  window.addEventListener('focus', scheduleEnhance);
}
