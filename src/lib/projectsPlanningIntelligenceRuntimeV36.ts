import { caliWorkstreams } from '../domain/projects';
import { supabase } from './supabase';

type Scope = 'active' | 'closed';
type ProjectRow = {
  id: string;
  protocol: string | null;
  company_id: string;
  name: string;
  planning_status: string;
  start_date: string | null;
  target_end_date: string | null;
  roadmap_end_date: string | null;
  client_response_business_days: number | null;
};
type DeliverableRow = {
  id: string;
  workstream: string | null;
  workstream_id: string | null;
  complexity: string | null;
  due_at: string | null;
  roadmap_month_start: number | null;
  sort_order: number | null;
  status: string;
};

const FRONT_CATALOG = [...caliWorkstreams];
const PRODUCTION_DAYS: Record<string, number> = { MC1: 3, MC2: 5, MC3: 8 };
const SCOPE_KEY = 'cali-projects-portfolio-scope-v36';
const COMPANY_KEY = 'cali-projects-company-filter-v36';
let installed = false;
let scheduled = 0;
let busy = false;
let selectedProjectCache: { protocol: string; at: number; project: ProjectRow | null; deliverables: DeliverableRow[] } | null = null;

function normalize(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}
function isAdminProjects() { return location.pathname.startsWith('/admin/projetos'); }
function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
function setSelect(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
}
function addBusinessDays(date: Date, days: number) {
  const result = new Date(date);
  let remaining = Math.max(0, Math.round(days));
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) remaining -= 1;
  }
  return result;
}
function businessDaysBetween(start: Date, end: Date) {
  if (end <= start) return 0;
  const cursor = new Date(start); cursor.setHours(12, 0, 0, 0);
  const limit = new Date(end); limit.setHours(12, 0, 0, 0);
  let count = 0;
  while (cursor < limit) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) count += 1;
  }
  return count;
}
function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const last = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, last));
  return result;
}
function isoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
}
function projectProtocolFromHero() {
  const line = document.querySelector<HTMLElement>('.project-hero-v2 > div:first-of-type > span')?.textContent || '';
  const match = line.match(/CALI-PRJ-[A-Z0-9-]+/i);
  return match?.[0] || '';
}
function labelStarting(root: ParentNode, text: string) {
  return Array.from(root.querySelectorAll<HTMLLabelElement>('label')).find((label) => normalize(label.textContent || '').startsWith(normalize(text))) || null;
}
function statusIsDraft() {
  const chip = document.querySelector<HTMLElement>('.project-selector-v2 > button.active .status-chip');
  return normalize(chip?.textContent || '') === 'rascunho';
}

async function selectedProjectData(force = false) {
  if (!supabase) return { project: null as ProjectRow | null, deliverables: [] as DeliverableRow[] };
  const protocol = projectProtocolFromHero();
  if (!protocol) return { project: null, deliverables: [] };
  const now = Date.now();
  if (!force && selectedProjectCache?.protocol === protocol && now - selectedProjectCache.at < 1200) {
    return { project: selectedProjectCache.project, deliverables: selectedProjectCache.deliverables };
  }
  const p = await supabase.from('projects').select('id,protocol,company_id,name,planning_status,start_date,target_end_date,roadmap_end_date,client_response_business_days').eq('protocol', protocol).maybeSingle();
  const project = (p.data || null) as ProjectRow | null;
  let deliverables: DeliverableRow[] = [];
  if (project?.id) {
    const d = await supabase.from('deliverables').select('id,workstream,workstream_id,complexity,due_at,roadmap_month_start,sort_order,status').eq('project_id', project.id).neq('status', 'cancelled').order('sort_order');
    deliverables = (d.data || []) as DeliverableRow[];
  }
  selectedProjectCache = { protocol, at: now, project, deliverables };
  return { project, deliverables };
}

function selectedFrontNamesInDraftModal(modal: HTMLElement, except?: HTMLElement) {
  return Array.from(modal.querySelectorAll<HTMLElement>('.front-draft-row'))
    .filter((row) => row !== except)
    .map((row) => row.querySelector<HTMLInputElement>('input[data-front-native-v36="1"], input[placeholder="Nome da frente"], input[placeholder="Nome da nova frente"]')?.value || '')
    .filter(Boolean)
    .map(normalize);
}

function buildFrontSelect(nameInput: HTMLInputElement, used: string[], existing: string[], id: string) {
  const select = document.createElement('select');
  select.className = 'front-catalog-select-v36';
  select.setAttribute('aria-label', 'Frente CALI');
  select.dataset.frontSelectFor = id;
  const current = nameInput.value.trim();
  const known = FRONT_CATALOG.find((item) => normalize(item) === normalize(current) && item !== 'Outro');
  const value = known || (current ? 'Outro' : '');
  const options = ['', ...FRONT_CATALOG];
  options.forEach((item) => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item || 'Selecionar frente';
    if (item && item !== 'Outro' && (used.includes(normalize(item)) || existing.includes(normalize(item))) && normalize(item) !== normalize(current)) option.disabled = true;
    select.append(option);
  });
  select.value = value;
  return select;
}

function validateCustomFront(input: HTMLInputElement, root: HTMLElement) {
  let warning = input.parentElement?.querySelector<HTMLElement>('.front-duplicate-warning-v36') || null;
  const name = normalize(input.value);
  const rows = Array.from(root.querySelectorAll<HTMLInputElement>('input[data-front-native-v36="1"]')).filter((item) => item !== input);
  const duplicate = Boolean(name && rows.some((item) => normalize(item.value) === name));
  if (duplicate && !warning) {
    warning = document.createElement('small'); warning.className = 'front-duplicate-warning-v36';
    warning.textContent = 'Essa frente já foi adicionada neste cronograma.';
    input.insertAdjacentElement('afterend', warning);
  }
  if (!duplicate) warning?.remove();
  input.setCustomValidity(duplicate ? 'Essa frente já foi adicionada neste cronograma.' : '');
}

function decorateProjectModal() {
  const modal = document.querySelector<HTMLElement>('.project-modal-v2');
  if (!modal) return;
  modal.classList.add('planning-intelligence-modal-v36');

  const targetLabel = labelStarting(modal, 'Previsão final');
  if (targetLabel) {
    const input = targetLabel.querySelector<HTMLInputElement>('input[type="date"]');
    const textNode = Array.from(targetLabel.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && /previs/i.test(node.textContent || ''));
    if (textNode) textNode.textContent = 'Meta desejada (opcional)';
    if (input && !targetLabel.querySelector('.planning-helper-v36')) {
      const helper = document.createElement('small'); helper.className = 'planning-helper-v36';
      helper.textContent = 'Não trava o projeto. A Previsão CALI será recalculada conforme os entregáveis e suas complexidades forem inseridos.';
      input.insertAdjacentElement('afterend', helper);
    }
  }

  const title = modal.querySelector<HTMLElement>('.front-drafts-title span');
  if (title) title.textContent = 'Escolha uma frente CALI. Use “Outro” apenas quando a frente não estiver no catálogo.';

  const rows = Array.from(modal.querySelectorAll<HTMLElement>('.front-draft-row'));
  rows.forEach((row, index) => {
    const inputs = Array.from(row.querySelectorAll<HTMLInputElement>('input'));
    const nameInput = inputs.find((input) => /nome da frente|nome da nova frente/i.test(input.placeholder)) || inputs[0];
    if (!nameInput) return;
    nameInput.dataset.frontNativeV36 = '1';
    const existingSelect = row.querySelector<HTMLSelectElement>('.front-catalog-select-v36');
    const used = selectedFrontNamesInDraftModal(modal, row);
    if (!existingSelect) {
      const select = buildFrontSelect(nameInput, used, [], `draft-${index}`);
      nameInput.insertAdjacentElement('beforebegin', select);
      const apply = () => {
        if (select.value === 'Outro') {
          nameInput.classList.remove('front-native-hidden-v36');
          if (FRONT_CATALOG.some((item) => normalize(item) === normalize(nameInput.value))) setInput(nameInput, '');
          nameInput.placeholder = 'Nome da nova frente';
          nameInput.focus();
        } else {
          nameInput.classList.add('front-native-hidden-v36');
          if (select.value) setInput(nameInput, select.value);
        }
        validateCustomFront(nameInput, modal);
        schedule();
      };
      select.addEventListener('change', apply);
      nameInput.addEventListener('input', () => validateCustomFront(nameInput, modal));
      if (select.value !== 'Outro') nameInput.classList.add('front-native-hidden-v36');
      else nameInput.placeholder = 'Nome da nova frente';
    } else {
      const current = nameInput.value.trim();
      const expected = FRONT_CATALOG.find((item) => normalize(item) === normalize(current) && item !== 'Outro') || (current ? 'Outro' : '');
      if (existingSelect.value !== expected) existingSelect.value = expected;
    }

    inputs.filter((input) => input.type === 'number').forEach((input) => input.closest('label')?.classList.add('planning-month-manual-v36'));
  });

  const drafts = modal.querySelector<HTMLElement>('.front-drafts-v2');
  if (drafts && !drafts.querySelector('.front-window-helper-v36')) {
    const helper = document.createElement('div'); helper.className = 'front-window-helper-v36';
    helper.innerHTML = '<strong>Janela do cronograma</strong><span>Você não precisa definir M1–M8 agora. A faixa de cada frente passa a ser formada pelos entregáveis que forem adicionados.</span>';
    drafts.append(helper);
  }
}

function decorateFrontModal() {
  const modal = document.querySelector<HTMLElement>('.simple-project-modal-v2');
  if (!modal || !/Adicionar frente ao cronograma/i.test(modal.textContent || '')) return;
  modal.classList.add('planning-front-modal-v36');
  const label = labelStarting(modal, 'Nome da frente');
  const input = label?.querySelector<HTMLInputElement>('input');
  if (label && input && !label.querySelector('.front-catalog-select-v36')) {
    input.dataset.frontNativeV36 = '1';
    const existing = Array.from(document.querySelectorAll<HTMLElement>('.front-copy-v2 strong')).map((el) => normalize(el.textContent || ''));
    const select = buildFrontSelect(input, [], existing, 'single-front');
    label.insertBefore(select, input);
    const apply = () => {
      if (select.value === 'Outro') {
        input.classList.remove('front-native-hidden-v36');
        if (FRONT_CATALOG.some((item) => normalize(item) === normalize(input.value))) setInput(input, '');
        input.placeholder = 'Nome da nova frente';
        input.focus();
      } else {
        input.classList.add('front-native-hidden-v36');
        if (select.value) setInput(input, select.value);
      }
    };
    select.addEventListener('change', apply);
    input.classList.add('front-native-hidden-v36');
    const helper = document.createElement('small'); helper.className = 'planning-helper-v36';
    helper.textContent = 'Frentes já usadas neste projeto ficam indisponíveis para evitar duplicidade.';
    label.append(helper);
  }
  Array.from(modal.querySelectorAll<HTMLInputElement>('input[type="number"]')).forEach((input) => input.closest('label')?.classList.add('planning-month-manual-v36'));
  const grid = modal.querySelector<HTMLElement>('.form-grid');
  if (grid && !modal.querySelector('.front-window-helper-v36')) {
    const helper = document.createElement('div'); helper.className = 'front-window-helper-v36';
    helper.innerHTML = '<strong>Quando essa frente acontece?</strong><span>A janela será calculada pelos entregáveis vinculados. Você não precisa escolher os meses antes de saber o volume real.</span>';
    grid.insertAdjacentElement('afterend', helper);
  }
}

async function updateDeliverableSuggestion(modal: HTMLElement) {
  const { project, deliverables } = await selectedProjectData();
  if (!project) return;
  const complexityLabel = labelStarting(modal, 'Complexidade');
  const deadlineLabel = labelStarting(modal, 'Deadline');
  const monthLabel = labelStarting(modal, 'Mês inicial');
  const frontLabel = labelStarting(modal, 'Frente');
  const complexity = complexityLabel?.querySelector<HTMLSelectElement>('select')?.value || 'MC2';
  const deadline = deadlineLabel?.querySelector<HTMLInputElement>('input[type="date"]');
  const monthStart = Math.max(1, Number(monthLabel?.querySelector<HTMLInputElement>('input')?.value || 1));
  const frontSelect = frontLabel?.querySelector<HTMLSelectElement>('select');
  const frontName = frontSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
  const productionDays = PRODUCTION_DAYS[complexity] || 5;
  const startValue = project.start_date || isoDate(new Date());
  let anchor = addMonths(new Date(`${startValue}T12:00:00`), monthStart - 1);
  const related = deliverables.filter((item) => item.status !== 'cancelled' && normalize(item.workstream || '') === normalize(frontName) && item.due_at);
  const latest = related.map((item) => new Date(item.due_at!)).filter((date) => !Number.isNaN(date.getTime())).sort((a, b) => b.getTime() - a.getTime())[0];
  if (latest && latest > anchor) anchor = addBusinessDays(latest, 1);
  const suggested = addBusinessDays(anchor, productionDays);
  const suggestedIso = isoDate(suggested);
  let card = modal.querySelector<HTMLElement>('.deadline-intelligence-v36');
  if (!card) {
    card = document.createElement('section'); card.className = 'deadline-intelligence-v36';
    const formGrid = deadlineLabel?.closest('.form-grid') || modal.querySelector('.form-grid');
    formGrid?.insertAdjacentElement('afterend', card);
  }
  if (!card) return;
  const target = project.target_end_date ? new Date(`${project.target_end_date}T12:00:00`) : null;
  const over = target && suggested > target ? businessDaysBetween(target, suggested) : 0;
  card.innerHTML = `<div><span>PREVISÃO ASSISTIDA</span><strong>Sugestão CALI · ${formatDate(suggestedIso)}</strong><p>${complexity} considera ${productionDays} dias úteis de produção a partir da janela M${monthStart}${related.length ? ' e da última entrega desta frente' : ''}.</p>${over ? `<em>Essa sugestão ultrapassa a meta desejada em ${over} dia(s) útil(eis).</em>` : ''}</div><button type="button">Usar sugestão</button>`;
  card.querySelector('button')?.addEventListener('click', () => { if (deadline) setInput(deadline, suggestedIso); });
}

function decorateDeliverableModal() {
  const modal = Array.from(document.querySelectorAll<HTMLElement>('.simple-project-modal-v2')).find((node) => /entregável/i.test(node.querySelector('header')?.textContent || ''));
  if (!modal) return;
  modal.classList.add('planning-deliverable-modal-v36');
  if (!modal.dataset.planningBoundV36) {
    modal.dataset.planningBoundV36 = '1';
    modal.addEventListener('change', (event) => {
      const target = event.target as HTMLElement;
      if (target.matches('select,input[type="number"]')) {
        selectedProjectCache = selectedProjectCache ? { ...selectedProjectCache, at: 0 } : null;
        void updateDeliverableSuggestion(modal);
      }
    });
  }
  void updateDeliverableSuggestion(modal);
}

async function decorateHeroForecast() {
  const hero = document.querySelector<HTMLElement>('.project-hero-v2');
  if (!hero) return;
  const { project, deliverables } = await selectedProjectData();
  if (!project) return;
  let block = hero.querySelector<HTMLElement>('.project-forecast-v36');
  if (!block) {
    block = document.createElement('div'); block.className = 'project-forecast-v36';
    const first = hero.querySelector<HTMLElement>(':scope > div:first-of-type');
    first?.append(block);
  }
  if (!block) return;
  const target = project.target_end_date;
  const forecast = project.roadmap_end_date;
  let impact = '';
  if (target && forecast) {
    const targetDate = new Date(`${target}T12:00:00`);
    const forecastDate = new Date(`${forecast}T12:00:00`);
    const late = forecastDate > targetDate ? businessDaysBetween(targetDate, forecastDate) : 0;
    if (late) impact = `<p class="forecast-impact-v36">A previsão atual ultrapassa a meta em <strong>${late} dia(s) útil(eis)</strong>. Ajuste sequência, capacidade ou expectativa antes de enviar.</p>`;
  }
  block.innerHTML = `<div><span>Meta desejada</span><strong>${target ? formatDate(target) : 'Sem meta fixa'}</strong></div><div><span>Previsão CALI</span><strong>${forecast ? formatDate(forecast) : 'Em construção'}</strong></div>${!deliverables.length ? '<p>A previsão aparece conforme os entregáveis e suas complexidades forem inseridos.</p>' : impact}`;

  const summaryLine = hero.querySelector<HTMLElement>(':scope > div:first-of-type > p');
  if (summaryLine && !summaryLine.dataset.forecastCopyV36) {
    const service = (summaryLine.textContent || '').split(' · ')[0] || 'Serviço CALI';
    summaryLine.dataset.forecastCopyV36 = '1';
    summaryLine.textContent = `${service} · início ${formatDate(project.start_date)} · meta ${target ? formatDate(target) : 'aberta'}`;
  }
}

function buildPortfolioNavigator() {
  const native = document.querySelector<HTMLElement>('.project-selector-v2');
  const tools = document.querySelector<HTMLElement>('.project-tools-v2');
  if (!native || !tools) return;
  native.classList.add('project-selector-native-v36');
  const buttons = Array.from(native.querySelectorAll<HTMLButtonElement>(':scope > button'));
  const records = buttons.map((button) => ({
    button,
    protocol: button.querySelector('small')?.textContent?.trim() || '',
    company: button.querySelector('strong')?.textContent?.trim() || 'Cliente',
    project: button.querySelector('em')?.textContent?.trim() || 'Projeto',
    status: button.querySelector('b')?.textContent?.trim() || '',
    active: button.classList.contains('active'),
    logo: (button.querySelector<HTMLElement>('.project-client-mark')?.style.getPropertyValue('--identity-image') || ''),
  }));
  let scope = (localStorage.getItem(SCOPE_KEY) as Scope | null) || 'active';
  let companyFilter = localStorage.getItem(COMPANY_KEY) || 'all';
  const allCompanies = Array.from(new Set(records.map((record) => record.company))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (companyFilter !== 'all' && !allCompanies.includes(companyFilter)) companyFilter = 'all';

  let nav = document.querySelector<HTMLElement>('.project-account-navigator-v36');
  if (!nav) {
    nav = document.createElement('section'); nav.className = 'project-account-navigator-v36';
    native.insertAdjacentElement('beforebegin', nav);
  }
  nav.replaceChildren();
  const head = document.createElement('div'); head.className = 'portfolio-head-v36';
  const tabs = document.createElement('div'); tabs.className = 'portfolio-tabs-v36';
  (['active', 'closed'] as Scope[]).forEach((item) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = scope === item ? 'active' : '';
    button.textContent = item === 'active' ? 'Em andamento' : 'Finalizados';
    button.onclick = () => { localStorage.setItem(SCOPE_KEY, item); buildPortfolioNavigator(); };
    tabs.append(button);
  });
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Filtrar cliente');
  const all = document.createElement('option'); all.value = 'all'; all.textContent = 'Todos os clientes'; select.append(all);
  allCompanies.forEach((company) => { const option = document.createElement('option'); option.value = company; option.textContent = company; select.append(option); });
  select.value = companyFilter;
  select.onchange = () => { localStorage.setItem(COMPANY_KEY, select.value); buildPortfolioNavigator(); };
  head.append(tabs, select); nav.append(head);

  const scoped = records.filter((record) => {
    const closed = normalize(record.status) === 'encerrado';
    if (scope === 'closed' ? !closed : closed) return false;
    if (companyFilter !== 'all' && record.company !== companyFilter) return false;
    return true;
  });
  if (!scoped.length) {
    const empty = document.createElement('div'); empty.className = 'portfolio-empty-v36';
    empty.textContent = scope === 'closed' ? 'Nenhum projeto finalizado com os filtros atuais.' : 'Nenhum projeto em andamento com os filtros atuais.';
    nav.append(empty); return;
  }
  const byCompany = new Map<string, typeof scoped>();
  scoped.forEach((record) => byCompany.set(record.company, [...(byCompany.get(record.company) || []), record]));
  const groups = document.createElement('div'); groups.className = 'portfolio-groups-v36';
  Array.from(byCompany.entries()).sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).forEach(([company, items]) => {
    const section = document.createElement('section'); section.className = 'portfolio-company-v36';
    const header = document.createElement('header');
    const title = document.createElement('strong'); title.textContent = company;
    const count = document.createElement('span'); count.textContent = `${items.length} ${items.length === 1 ? 'projeto' : 'projetos'}`;
    header.append(title, count); section.append(header);
    const list = document.createElement('div');
    items.forEach((record) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = record.active ? 'active' : '';
      const protocol = document.createElement('small'); protocol.textContent = record.protocol;
      const name = document.createElement('strong'); name.textContent = record.project;
      const status = document.createElement('span'); status.textContent = record.status;
      button.append(protocol, name, status);
      button.onclick = () => record.button.click();
      list.append(button);
    });
    section.append(list); groups.append(section);
  });
  nav.append(groups);
}

async function decorateKpis() {
  if (!supabase) return;
  const first = document.querySelector<HTMLElement>('.project-kpis-v2 article:first-child strong');
  if (!first || first.dataset.vigentesV36) return;
  const result = await supabase.from('projects').select('id,planning_status');
  if (!result.data) return;
  const active = result.data.filter((row: any) => row.planning_status !== 'closed').length;
  first.textContent = String(active); first.dataset.vigentesV36 = '1';
}

function iconButton(label: string, svg: string) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'quick-icon-v36';
  button.setAttribute('aria-label', label); button.title = label; button.innerHTML = svg; return button;
}
const pencilSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>';
const trashSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>';

function decorateDraftActions() {
  const draft = statusIsDraft();
  document.querySelectorAll<HTMLElement>('.front-deliverable-row-v3').forEach((row) => {
    row.classList.toggle('draft-editable-v36', draft);
    row.querySelector('.draft-row-actions-v36')?.remove();
    if (!draft) return;
    const actions = document.createElement('span'); actions.className = 'draft-row-actions-v36';
    const edit = iconButton('Editar entregável', pencilSvg);
    const remove = iconButton('Excluir entregável', trashSvg); remove.classList.add('danger');
    edit.onclick = (event) => {
      event.preventDefault(); event.stopPropagation();
      row.querySelector<HTMLButtonElement>('.front-deliverable-open-v3')?.click();
      window.setTimeout(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.deliverable-actions-left-v2 button')).find((button) => /^editar$/i.test(button.textContent?.trim() || ''))?.click(), 90);
    };
    remove.onclick = (event) => {
      event.preventDefault(); event.stopPropagation();
      row.querySelector<HTMLButtonElement>('.front-deliverable-open-v3')?.click();
      window.setTimeout(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.deliverable-actions-left-v2 button')).find((button) => /^excluir$/i.test(button.textContent?.trim() || ''))?.click(), 90);
    };
    actions.append(edit, remove); row.append(actions);
  });

  const roadmapHeader = document.querySelector<HTMLElement>('.roadmap-v2 > header');
  if (roadmapHeader) {
    roadmapHeader.querySelector('.roadmap-add-front-v36')?.remove();
    if (draft) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary roadmap-add-front-v36';
      button.textContent = '+ Nova frente';
      button.onclick = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.project-hero-buttons button')).find((item) => /adicionar frente/i.test(item.textContent || ''))?.click();
      roadmapHeader.append(button);
    }
  }

  document.querySelectorAll<HTMLElement>('.front-section-v2').forEach((section) => {
    const hasDeliverables = Boolean(section.querySelector('.front-deliverable-row-v3'));
    const bar = section.querySelector<HTMLElement>('.front-monthbar-v2');
    if (bar) bar.classList.toggle('front-window-pending-v36', !hasDeliverables);
  });
}

function schedule() {
  window.clearTimeout(scheduled);
  scheduled = window.setTimeout(() => void enhance(), 90);
}

async function enhance() {
  if (busy || !isAdminProjects()) return;
  busy = true;
  try {
    decorateProjectModal();
    decorateFrontModal();
    decorateDeliverableModal();
    buildPortfolioNavigator();
    decorateDraftActions();
    await Promise.all([decorateHeroForecast(), decorateKpis()]);
  } finally { busy = false; }
}

export function installProjectsPlanningIntelligenceRuntimeV36() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('focus', () => { selectedProjectCache = null; schedule(); });
  window.addEventListener('popstate', schedule);
}
