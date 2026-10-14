/* Menção com @ nas conversas. Um único ouvinte para todos os campos de conversa do Workspace (ocorrências, entregável e
   subtarefa, nos três perfis): ao digitar @ aparece a lista de pessoas; escolher uma escreve "@Nome Completo" na mensagem.
   Quem recebe o aviso é decidido no banco, pelo nome escrito. Aqui é só a ajuda de digitação. */
import { supabase } from './supabase';

type Person = { id: string; full_name: string; label: string };

const CHAT_FIELD = '[class*="chat"],[class*="conversation"],[class*="compose"],[class*="thread"],.wf-record-drawer,.v2-stm';
let people: Person[] | null = null;
let loading: Promise<Person[]> | null = null;
let box: HTMLDivElement | null = null;
let field: HTMLTextAreaElement | null = null;
let matches: Person[] = [];
let active = 0;
let start = -1;

const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function loadPeople() {
  if (people) return people;
  if (!supabase) return [];
  if (!loading) loading = (async () => { const result = await supabase!.rpc('mention_candidates'); people = result.error ? [] : ((result.data || []) as Person[]).sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR')); if (result.error) loading = null; return people || []; })();
  return loading;
}

function close() { box?.remove(); box = null; field = null; matches = []; start = -1; }

function writeValue(target: HTMLTextAreaElement, value: string, caret: number) {
  // Campo controlado pelo React: o valor precisa entrar pelo "setter" nativo e avisar com um evento de digitação.
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (setter) setter.call(target, value); else target.value = value;
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.focus(); target.setSelectionRange(caret, caret);
}

function choose(person: Person) {
  if (!field || start < 0) return;
  const target = field; const end = target.selectionStart ?? target.value.length;
  const inserted = `@${person.full_name} `;
  const value = target.value.slice(0, start) + inserted + target.value.slice(end);
  const caret = start + inserted.length;
  close(); writeValue(target, value, caret);
}

function render() {
  if (!field) return;
  if (!box) { box = document.createElement('div'); box.className = 'v2-mention-box'; box.setAttribute('role', 'listbox'); box.setAttribute('aria-label', 'Mencionar uma pessoa'); document.body.appendChild(box); }
  box.replaceChildren(...matches.map((person, index) => {
    const option = document.createElement('button'); option.type = 'button'; option.setAttribute('role', 'option'); option.className = index === active ? 'on' : '';
    const name = document.createElement('strong'); name.textContent = person.full_name;
    const label = document.createElement('small'); label.textContent = person.label;
    option.append(name, label);
    option.addEventListener('mousedown', (event) => { event.preventDefault(); choose(person); });
    return option;
  }));
  const rect = field.getBoundingClientRect(); const height = Math.min(matches.length, 6) * 44 + 12;
  const above = rect.top > height + 16;
  box.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 292))}px`;
  box.style.top = `${above ? rect.top - height - 6 : rect.bottom + 6}px`;
}

async function onInput(event: Event) {
  const target = event.target as HTMLElement | null;
  if (!(target instanceof HTMLTextAreaElement) || !target.closest(CHAT_FIELD)) { if (box) close(); return; }
  const caret = target.selectionStart ?? 0; const before = target.value.slice(0, caret);
  const found = /(^|\s)@([^\s@][^@\n]{0,30})?$/.exec(before);
  if (!found) { close(); return; }
  const query = plain(found[2] || '');
  const list = await loadPeople();
  if (document.activeElement !== target) return;
  // Quem começa com o que foi digitado (nome ou sobrenome) vem primeiro.
  const starts = (person: Person) => plain(person.full_name).split(/\s+/).some((part) => part.startsWith(query)) ? 0 : 1;
  const next = list.filter((person) => plain(person.full_name).includes(query)).sort((a, b) => starts(a) - starts(b)).slice(0, 6);
  if (!next.length) { close(); return; }
  field = target; start = caret - (found[2] || '').length - 1; matches = next; active = Math.min(active, next.length - 1); render();
}

function onKeyDown(event: KeyboardEvent) {
  if (!box || !matches.length) return;
  if (event.key === 'ArrowDown') { active = (active + 1) % matches.length; render(); }
  else if (event.key === 'ArrowUp') { active = (active - 1 + matches.length) % matches.length; render(); }
  else if (event.key === 'Enter' || event.key === 'Tab') choose(matches[active]);
  else if (event.key === 'Escape') close();
  else return;
  event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
}

let installed = false;
export function installMentionRuntime() {
  if (installed || typeof document === 'undefined') return; installed = true;
  document.addEventListener('input', (event) => { void onInput(event); }, true);
  // Na fase de captura, para a tecla Enter escolher a pessoa antes de a conversa entender como "enviar".
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('mousedown', (event) => { if (box && !box.contains(event.target as Node) && event.target !== field) close(); }, true);
  window.addEventListener('scroll', () => { if (box) close(); }, true);
}
