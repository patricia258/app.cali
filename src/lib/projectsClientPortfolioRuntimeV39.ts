import { ensureCompanyWorkspaceLogo, resolveCompanyAsset, type CompanyLogoRecord } from './companyWorkspaceLogo';
import { supabase } from './supabase';

type ClientScope = 'active' | 'inactive';
type ProjectRow = {
  id: string;
  protocol: string | null;
  company_id: string;
  name: string;
  planning_status: string;
  created_at: string;
  start_date: string | null;
  target_end_date: string | null;
  roadmap_end_date: string | null;
};
type CompanyRow = CompanyLogoRecord & { status: string };
type PortfolioData = { companies: CompanyRow[]; projects: ProjectRow[] };

let installed = false;
let timer = 0;
let busy = false;
let cache: { at: number; data: PortfolioData } | null = null;
let selectedScope: ClientScope = (localStorage.getItem('cali-project-client-scope-v39') as ClientScope | null) || 'active';
let overlay: HTMLElement | null = null;
let selectedCompanyId = '';

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  client_review: 'Aguardando cliente',
  adjustment_requested: 'Ajuste solicitado',
  approved: 'Cronograma aprovado',
  active: 'Projeto vigente',
  rebriefing: 'Rebriefing',
  closed: 'Encerrado',
};

function isPage() { return location.pathname.startsWith('/admin/projetos'); }
function normalize(value = '') { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim(); }
function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
}
function currentProjectProtocol() {
  const text = document.querySelector<HTMLElement>('.project-hero-v2 > div:first-of-type > span')?.textContent || '';
  return text.match(/CALI-PRJ-[A-Z0-9-]+/i)?.[0] || '';
}
function escapeText(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

async function load(force = false): Promise<PortfolioData> {
  if (!supabase) return { companies: [], projects: [] };
  if (!force && cache && Date.now() - cache.at < 2500) return cache.data;
  const [companyResult, projectResult] = await Promise.all([
    supabase.from('companies').select('id,display_name,logo_url,logo_workspace_url,logo_workspace_generated_at,status').order('display_name'),
    supabase.from('projects').select('id,protocol,company_id,name,planning_status,created_at,start_date,target_end_date,roadmap_end_date').order('created_at', { ascending: false }),
  ]);
  const data = {
    companies: (companyResult.data || []) as CompanyRow[],
    projects: (projectResult.data || []) as ProjectRow[],
  };
  cache = { at: Date.now(), data };
  return data;
}

function logoTile(company: CompanyRow, url: string) {
  const tile = document.createElement('span');
  tile.className = 'project-client-logo-v39 workspace-company-logo-tile-v39';
  tile.setAttribute('aria-hidden', 'true');
  if (url) {
    const image = document.createElement('img');
    image.src = url;
    image.alt = '';
    tile.append(image);
  } else {
    const fallback = document.createElement('strong');
    fallback.textContent = company.display_name.trim().slice(0, 1).toUpperCase() || 'C';
    tile.append(fallback);
  }
  return tile;
}

async function companyLogo(company: CompanyRow) {
  if (company.logo_workspace_url) return resolveCompanyAsset(company.logo_workspace_url);
  if (company.logo_url) {
    void ensureCompanyWorkspaceLogo(company).then(() => {
      cache = null;
      window.setTimeout(schedule, 80);
    });
  }
  return '';
}

function currentFilters() {
  const search = document.querySelector<HTMLInputElement>('.project-tools-v2 input')?.value.trim() || '';
  const status = document.querySelector<HTMLSelectElement>('.project-tools-v2 select')?.value || 'all';
  return { search, status };
}

function companyMatches(company: CompanyRow, projects: ProjectRow[], search: string) {
  if (!search) return true;
  const q = normalize(search);
  if (normalize(company.display_name).includes(q)) return true;
  return projects.some((project) => project.company_id === company.id && `${normalize(project.name)} ${normalize(project.protocol || '')}`.includes(q));
}

function selectProject(project: ProjectRow) {
  const search = document.querySelector<HTMLInputElement>('.project-tools-v2 input');
  const status = document.querySelector<HTMLSelectElement>('.project-tools-v2 select');
  if (search?.value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(search, ''); search.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (status && status.value !== 'all') {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    setter?.call(status, 'all'); status.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const click = () => {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.project-selector-v2 > button'));
    const target = buttons.find((button) => button.querySelector('small')?.textContent?.trim() === project.protocol);
    if (target) target.click();
  };
  window.setTimeout(click, 30);
  window.setTimeout(click, 180);
  closeModal();
}

function closeModal() {
  overlay?.remove();
  overlay = null;
  selectedCompanyId = '';
  document.body.classList.remove('workspace-modal-open');
}

async function openCompany(company: CompanyRow, data: PortfolioData) {
  closeModal();
  selectedCompanyId = company.id;
  document.body.classList.add('workspace-modal-open');
  overlay = document.createElement('div');
  overlay.className = 'project-client-modal-backdrop-v39';
  const modal = document.createElement('section');
  modal.className = 'project-client-modal-v39';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', `Projetos de ${company.display_name}`);

  const resolved = await companyLogo(company);
  const head = document.createElement('header');
  const identity = document.createElement('div');
  identity.className = 'project-client-modal-identity-v39';
  identity.append(logoTile(company, resolved));
  const title = document.createElement('div');
  const kicker = document.createElement('span'); kicker.textContent = 'PROJETOS DA CONTA';
  const h2 = document.createElement('h2'); h2.textContent = company.display_name;
  title.append(kicker, h2); identity.append(title);
  const close = document.createElement('button'); close.type = 'button'; close.className = 'project-client-modal-close-v39'; close.textContent = '×'; close.setAttribute('aria-label', 'Fechar'); close.onclick = closeModal;
  head.append(identity, close); modal.append(head);

  const list = document.createElement('div');
  list.className = 'project-client-project-list-v39';
  const filters = currentFilters();
  let projects = data.projects.filter((project) => project.company_id === company.id);
  if (filters.status !== 'all') projects = projects.filter((project) => project.planning_status === filters.status);
  if (!projects.length) {
    const empty = document.createElement('div'); empty.className = 'project-client-project-empty-v39'; empty.textContent = filters.status === 'all' ? 'Nenhum projeto cadastrado para esta conta.' : 'Nenhum projeto deste cliente com o status selecionado.'; list.append(empty);
  } else {
    const activeProtocol = currentProjectProtocol();
    projects.forEach((project) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `project-client-project-card-v39 ${project.protocol === activeProtocol ? 'selected' : ''}`;
      const main = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = project.name;
      const protocol = document.createElement('small'); protocol.textContent = project.protocol || 'Projeto CALI';
      const meta = document.createElement('div'); meta.className = 'project-client-project-meta-v39';
      const created = document.createElement('span'); created.textContent = `Criado em ${formatDate(project.created_at)}`;
      const deadline = document.createElement('span'); deadline.textContent = `Deadline ${formatDate(project.roadmap_end_date || project.target_end_date)}`;
      meta.append(created, deadline); main.append(name, protocol, meta);
      const side = document.createElement('div');
      const badge = document.createElement('span'); badge.className = `project-client-project-status-v39 status-${project.planning_status}`; badge.textContent = statusLabels[project.planning_status] || project.planning_status;
      const arrow = document.createElement('b'); arrow.textContent = '›'; side.append(badge, arrow);
      card.append(main, side);
      card.onclick = () => selectProject(project);
      list.append(card);
    });
  }
  modal.append(list);
  const foot = document.createElement('footer');
  const note = document.createElement('span'); note.textContent = `${projects.length} ${projects.length === 1 ? 'projeto' : 'projetos'} nesta visão`;
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'secondary'; cancel.textContent = 'Fechar'; cancel.onclick = closeModal;
  foot.append(note, cancel); modal.append(foot);
  overlay.append(modal);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) closeModal(); });
  document.body.append(overlay);
}

async function render() {
  if (!isPage() || busy) return;
  const anchor = document.querySelector<HTMLElement>('.project-selector-v2');
  if (!anchor) return;
  busy = true;
  try {
    const data = await load();
    const old = document.querySelector<HTMLElement>('.project-client-strip-v39');
    const filters = currentFilters();
    const companies = data.companies.filter((company) => {
      const active = company.status === 'active';
      if (selectedScope === 'active' ? !active : active) return false;
      return companyMatches(company, data.projects, filters.search);
    });
    const signature = JSON.stringify([selectedScope, filters.search, filters.status, companies.map((c) => [c.id, c.display_name, c.logo_workspace_url, c.logo_url, c.status]), currentProjectProtocol()]);
    if (old?.dataset.signature === signature) return;
    old?.remove();

    const section = document.createElement('section');
    section.className = 'project-client-strip-v39'; section.dataset.signature = signature;
    const header = document.createElement('div'); header.className = 'project-client-strip-head-v39';
    const heading = document.createElement('div');
    const label = document.createElement('span'); label.textContent = 'CLIENTES';
    const title = document.createElement('strong'); title.textContent = selectedScope === 'active' ? 'Contas ativas' : 'Contas inativas'; heading.append(label, title);
    const tabs = document.createElement('div'); tabs.className = 'project-client-scope-v39';
    (['active', 'inactive'] as ClientScope[]).forEach((scope) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = selectedScope === scope ? 'active' : ''; button.textContent = scope === 'active' ? 'Ativos' : 'Inativos';
      button.onclick = () => { selectedScope = scope; localStorage.setItem('cali-project-client-scope-v39', scope); schedule(true); };
      tabs.append(button);
    });
    header.append(heading, tabs); section.append(header);

    const rail = document.createElement('div'); rail.className = 'project-client-rail-v39';
    if (!companies.length) {
      const empty = document.createElement('div'); empty.className = 'project-client-empty-v39'; empty.textContent = selectedScope === 'active' ? 'Nenhum cliente ativo com os filtros atuais.' : 'Nenhum cliente inativo com os filtros atuais.'; rail.append(empty);
    } else {
      for (const company of companies) {
        const url = await companyLogo(company);
        const button = document.createElement('button'); button.type = 'button'; button.className = 'project-client-card-v39'; button.title = `Ver projetos de ${company.display_name}`;
        const activeProject = data.projects.find((project) => project.company_id === company.id && project.protocol === currentProjectProtocol());
        if (activeProject) button.classList.add('selected');
        button.append(logoTile(company, url));
        const name = document.createElement('span'); name.textContent = company.display_name; button.append(name);
        button.onclick = () => void openCompany(company, data);
        rail.append(button);
      }
    }
    rail.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (rail.scrollWidth <= rail.clientWidth) return;
      event.preventDefault(); rail.scrollLeft += event.deltaY;
    }, { passive: false });
    section.append(rail);
    anchor.insertAdjacentElement('beforebegin', section);
  } finally { busy = false; }
}

function schedule(force = false) {
  if (force) cache = null;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void render(), 80);
}

export function installProjectsClientPortfolioRuntimeV39() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  document.addEventListener('input', (event) => { if ((event.target as Element)?.closest?.('.project-tools-v2')) schedule(); }, true);
  document.addEventListener('change', (event) => { if ((event.target as Element)?.closest?.('.project-tools-v2')) schedule(); }, true);
  const observer = new MutationObserver((mutations) => {
    if (mutations.every((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : null;
      return Boolean(target?.closest('.project-client-strip-v39,.project-client-modal-backdrop-v39'));
    })) return;
    schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('focus', () => schedule(true));
  window.addEventListener('popstate', schedule);
  schedule(true);
}
