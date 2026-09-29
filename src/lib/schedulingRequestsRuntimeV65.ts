import { supabase } from './supabase';
import { isWorkspaceRoute } from '../runtime/routeActivity';

type Slot = { startsAt: string; endsAt: string };
type SchedulingRequest = {
  id: string;
  company_id: string;
  requested_by: string;
  request_mode: 'remote' | 'in_person';
  title: string;
  purpose?: string | null;
  location?: string | null;
  requested_slots?: Slot[] | null;
  admin_proposed_slots?: Slot[] | null;
  selected_slot?: Slot | null;
  status: string;
  included_visits_snapshot?: number | null;
  billable_extra?: boolean | null;
  extra_visit?: boolean;
  extra_visit_fee_cents?: number | null;
  extra_visit_ack_name?: string | null;
  extra_visit_cancellation_fee_cents?: number | null;
  extra_visit_cancellation_note?: string | null;
  billing_notice?: string | null;
  billing_acknowledged_at?: string | null;
  reschedule_count?: number | null;
  admin_note?: string | null;
  client_note?: string | null;
  confirmed_event_id?: string | null;
  created_at?: string | null;
};
type Company = { id: string; display_name: string; logo_url?: string | null; onsite_visits_included_per_month?: number | null };
type RequestAttachment = { request_id: string; storage_path: string; file_name: string };
let adminRequestIndex = 0;
let adminRequesterNames: Record<string,string> = {};
let adminAttachments: RequestAttachment[] = [];
type ExtraExpense = { request_id: string; expense_kind: string; amount_cents: number; receipt_path: string | null; protocol: string | null; hours_quantity: number | null };

type ClientContext = { company: Company; requests: SchedulingRequest[] };
type AdminContext = { companies: Company[]; requests: SchedulingRequest[] };

let installed = false;
let observer: MutationObserver | null = null;
let realtime: any = null;
let renderTimer: number | undefined;
let clientContext: ClientContext | null = null;
let clientExpenses: ExtraExpense[] = [];
let adminContext: AdminContext | null = null;
let modal: HTMLElement | null = null;
let adminRenderInFlight = false;
let clientRenderInFlight = false;
let adminDrawerOpen = false;

const ADMIN_PENDING_STATUSES = new Set(['submitted', 'client_review', 'reschedule_review']);
const INCLUDED_USAGE_STATUSES = new Set(['confirmed', 'completed', 'not_occurred', 'reschedule_review']);
const style = `
.scheduling-v65-panel{margin:0 0 18px;border:1px solid color-mix(in srgb,#B58C52 24%,var(--theme-line,#e5ddd7));border-radius:18px;background:var(--theme-surface,#fff);color:var(--theme-text,#2b2b2b);box-shadow:0 10px 28px rgba(49,31,25,.045);overflow:hidden}
.scheduling-v65-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:17px 18px;background:linear-gradient(135deg,color-mix(in srgb,#B58C52 5%,var(--theme-surface,#fff)),color-mix(in srgb,#5A1E2D 3%,var(--theme-surface,#fff)))}
.scheduling-v65-head>div{min-width:0}.scheduling-v65-kicker{display:block;font-size:9px;letter-spacing:.13em;font-weight:900;color:#B58C52;text-transform:uppercase}.scheduling-v65-head h2{margin:4px 0 3px;font-size:18px;line-height:1.15;color:var(--theme-text,#2b2b2b)}.scheduling-v65-head p{margin:0;max-width:760px;font-size:11px;line-height:1.5;color:var(--theme-muted,#786d67)}
.scheduling-v65-button{border:1px solid var(--theme-line,#ded5cf);background:var(--theme-surface,#fff);color:var(--theme-text,#2b2b2b);border-radius:11px;min-height:36px;padding:0 13px;font:inherit;font-size:10px;font-weight:850;cursor:pointer;white-space:nowrap}.scheduling-v65-button.primary{background:#5A1E2D;border-color:#5A1E2D;color:#fff}.scheduling-v65-button.gold{border-color:#d7b276;color:#7a5520;background:#fffaf1}.scheduling-v65-button.danger{border-color:#dfc3c9;color:#8b3246;background:#fff9fa}.scheduling-v65-button:disabled{opacity:.45;cursor:default}
.scheduling-v65-list{padding:0 18px 14px}.scheduling-v65-request{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px 18px;padding:14px 0;border-top:1px solid var(--theme-line,#eee6e0)}.scheduling-v65-request:first-child{border-top:0}.scheduling-v65-request-copy{min-width:0}.scheduling-v65-request-top{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:5px}.scheduling-v65-request-top strong{font-size:13px}.scheduling-v65-badge{display:inline-flex;align-items:center;min-height:22px;padding:0 7px;border-radius:999px;border:1px solid var(--theme-line,#ddd4ce);font-size:8px;font-weight:900;letter-spacing:.03em;color:var(--theme-muted,#746963);background:var(--theme-surface-soft,#f8f4f1)}.scheduling-v65-badge.pending{background:#fff7e8;border-color:#ead5aa;color:#8b662e}.scheduling-v65-badge.ok{background:#edf5ed;border-color:#cfe0cf;color:#4d704f}.scheduling-v65-badge.billable{background:#f9eeee;border-color:#e5c4ca;color:#8c3d4d}.scheduling-v65-request p{margin:0;font-size:10px;line-height:1.5;color:var(--theme-muted,#746963)}.scheduling-v65-request p+p{margin-top:4px}.scheduling-v65-slots{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.scheduling-v65-slot{display:inline-flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid var(--theme-line,#e5ddd7);border-radius:10px;background:var(--theme-surface-soft,#faf7f5);font-size:9px;font-weight:750;color:var(--theme-text,#302a28)}.scheduling-v65-actions{display:flex;align-items:flex-start;justify-content:flex-end;gap:7px;flex-wrap:wrap;max-width:420px}.scheduling-v65-note{margin-top:9px;padding:9px 10px;border-left:2px solid #B58C52;border-radius:0 9px 9px 0;background:color-mix(in srgb,#B58C52 6%,var(--theme-surface,#fff));font-size:9px;line-height:1.45;color:var(--theme-muted,#746963)}.scheduling-v65-empty{padding:12px 18px 17px;font-size:10px;color:var(--theme-muted,#746963)}
.scheduling-v65-panel.is-empty{border-color:rgba(181,140,82,.38);background:linear-gradient(135deg,color-mix(in srgb,#B58C52 10%,var(--theme-surface,#fff)),var(--theme-surface,#fff))}.scheduling-v65-panel.is-empty .scheduling-v65-head{padding:14px 18px;background:transparent}.scheduling-v65-panel.is-empty .scheduling-v65-head p{max-width:620px}.scheduling-v65-panel.is-empty .scheduling-v65-empty{padding:0 18px 15px}.scheduling-v65-admin .scheduling-v65-kicker{color:#8b662e}
.scheduling-v65-modal-backdrop{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:22px;background:rgba(20,13,16,.62);backdrop-filter:blur(5px)}.scheduling-v65-modal{width:min(760px,96vw);max-height:90vh;overflow:auto;border:1px solid var(--theme-line,#ded5cf);border-radius:20px;background:var(--theme-surface,#fff);color:var(--theme-text,#2b2b2b);box-shadow:0 30px 80px rgba(0,0,0,.28)}.scheduling-v65-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:20px 22px 15px;border-bottom:1px solid var(--theme-line,#eee6e0)}.scheduling-v65-modal-head h3{margin:4px 0 0;font-size:22px}.scheduling-v65-modal-head button{width:36px;height:36px;border-radius:10px;border:1px solid var(--theme-line,#ddd4ce);background:var(--theme-surface-soft,#f8f4f1);color:var(--theme-text,#2b2b2b);cursor:pointer}.scheduling-v65-form{padding:18px 22px 22px}.scheduling-v65-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.scheduling-v65-field{display:flex;flex-direction:column;gap:6px}.scheduling-v65-field.full{grid-column:1/-1}.scheduling-v65-field>span{font-size:9px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--theme-muted,#776b65)}.scheduling-v65-field input,.scheduling-v65-field select,.scheduling-v65-field textarea{width:100%;box-sizing:border-box;border:1px solid var(--theme-line,#ded5cf);border-radius:11px;background:var(--theme-input,var(--theme-surface,#fff));color:var(--theme-text,#2b2b2b);font:inherit;font-size:11px;padding:10px 11px;outline:none}.scheduling-v65-field textarea{min-height:82px;resize:vertical}.scheduling-v65-field input:focus,.scheduling-v65-field select:focus,.scheduling-v65-field textarea:focus{border-color:#B58C52;box-shadow:0 0 0 3px rgba(181,140,82,.10)}.scheduling-v65-mode{display:grid;grid-template-columns:1fr 1fr;gap:8px}.scheduling-v65-mode label{display:flex;align-items:center;gap:8px;padding:11px 12px;border:1px solid var(--theme-line,#ded5cf);border-radius:12px;background:var(--theme-surface-soft,#faf7f5);font-size:11px;font-weight:800;cursor:pointer}.scheduling-v65-mode input{accent-color:#5A1E2D}.scheduling-v65-slot-grid{display:grid;grid-template-columns:1fr .7fr;gap:9px}.scheduling-v65-policy{margin-top:14px;padding:12px 13px;border:1px solid #e3d6c5;border-left:3px solid #B58C52;border-radius:11px;background:#fffaf2;color:#61564f;font-size:10px;line-height:1.5}.scheduling-v65-policy.billable{border-color:#e5c8cd;border-left-color:#5A1E2D;background:#fff7f8}.scheduling-v65-policy strong{display:block;margin-bottom:3px;color:#5A1E2D}.scheduling-v65-ack{display:flex;align-items:flex-start;gap:8px;margin-top:9px;font-size:9px;line-height:1.45}.scheduling-v65-ack input{margin-top:2px;accent-color:#5A1E2D}.scheduling-v65-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.scheduling-v65-error{display:none;margin-top:12px;padding:9px 11px;border-radius:9px;background:#fff1f3;color:#8b3246;font-size:9px;line-height:1.4}.scheduling-v65-error.show{display:block}.scheduling-v65-toast{position:fixed;right:22px;bottom:22px;z-index:10100;max-width:390px;padding:12px 14px;border-radius:12px;background:#2b2024;color:#fff;box-shadow:0 16px 42px rgba(0,0,0,.25);font-size:10px;line-height:1.45}.scheduling-v65-toast.error{background:#7d2f42}
.scheduling-v65-admin .scheduling-v65-request{grid-template-columns:minmax(0,1fr) minmax(280px,.8fr)}.scheduling-v65-contract{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}.scheduling-v65-admin-slot-actions{display:flex;flex-direction:column;gap:6px;align-items:stretch}.scheduling-v65-admin-slot-actions .scheduling-v65-button{white-space:normal;text-align:left;min-height:34px}
.scheduling-v65-extra{margin:7px 0 9px;padding:10px 12px;border:1px solid #d7b37c;border-left:3px solid #b58c52;border-radius:0 11px 11px 0;background:#fff9e9}.scheduling-v65-extra-head{display:flex;align-items:center;gap:7px;color:#5a1e2d}.scheduling-v65-extra-head svg{flex:none;color:#b58c52}.scheduling-v65-extra-head strong{font-size:11px;letter-spacing:.02em}.scheduling-v65-extra-fee{margin-left:auto;font-size:9px;font-weight:900;letter-spacing:.03em;color:#8b662e;background:#fff3d0;border:1px solid #ead5aa;border-radius:999px;padding:2px 8px;white-space:nowrap}.scheduling-v65-extra-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 10px;margin:8px 0 0;padding:0}.scheduling-v65-extra-facts>div{min-width:0}.scheduling-v65-extra-facts dt{margin:0;font-size:8px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#8b7a6d}.scheduling-v65-extra-facts dd{margin:2px 0 0;font-size:10px;line-height:1.4;color:#4a3a37;word-break:break-word}
html[data-workspace-theme='night'] .scheduling-v65-extra{background:#2b241c;border-color:#5d4b34}html[data-workspace-theme='night'] .scheduling-v65-extra-head{color:#f1dddc}html[data-workspace-theme='night'] .scheduling-v65-extra-head svg{color:#e8ce91}html[data-workspace-theme='night'] .scheduling-v65-extra-fee{background:#3a2f22;border-color:#6a5936;color:#e8ce91}html[data-workspace-theme='night'] .scheduling-v65-extra-facts dt{color:#c9bbb0}html[data-workspace-theme='night'] .scheduling-v65-extra-facts dd{color:#f1dddc}
@media(max-width:560px){.scheduling-v65-extra-facts{grid-template-columns:1fr}}
.scheduling-v65-float{position:fixed;right:22px;bottom:22px;z-index:10040;display:flex;align-items:center;gap:9px;min-height:52px;padding:0 18px 0 14px;border:1px solid #b98e55;border-radius:999px;background:#5A1E2D;color:#fff;box-shadow:0 16px 40px rgba(90,30,45,.32);font:800 13px/1.2 inherit;cursor:pointer}.scheduling-v65-float:hover{transform:translateY(-2px)}.scheduling-v65-float-icon{display:grid;place-items:center;flex:none;width:30px;height:30px;border-radius:999px;background:rgba(255,255,255,.14)}.scheduling-v65-float-badge{display:grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#f0cf77;color:#5A1E2D;font-size:11px;font-weight:900}
.scheduling-v65-drawer-backdrop{position:fixed;inset:0;z-index:10045;background:rgba(20,13,16,.4)}
.scheduling-v65-drawer{position:fixed;top:0;right:0;bottom:0;z-index:10046;width:min(420px,92vw);display:flex;flex-direction:column;background:var(--theme-surface,#fff);color:var(--theme-text,#2b2b2b);box-shadow:-24px 0 60px rgba(0,0,0,.22);transform:translateX(100%);transition:transform .22s ease}
.scheduling-v65-drawer.is-open{transform:translateX(0)}
.scheduling-v65-drawer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 18px 14px;border-bottom:1px solid var(--theme-line,#eee6e0)}
.scheduling-v65-drawer-head h2{margin:4px 0 0;font-size:17px}
.scheduling-v65-drawer-head button{width:34px;height:34px;flex:none;border-radius:10px;border:1px solid var(--theme-line,#ddd4ce);background:var(--theme-surface-soft,#f8f4f1);color:var(--theme-text,#2b2b2b);cursor:pointer}
.scheduling-v65-drawer-body{flex:1;overflow:auto;padding:4px 4px 16px}
.scheduling-v65-drawer-body .scheduling-v65-list{padding:0 14px;display:grid;gap:14px}
.scheduling-v65-drawer-body .scheduling-v65-request{grid-template-columns:1fr;border:1px solid var(--theme-line,#eee6e0);border-radius:14px;padding:14px;margin:0;background:var(--theme-surface-soft,#faf7f5)}
.scheduling-v65-drawer-body .scheduling-v65-request:first-child{border-top:1px solid var(--theme-line,#eee6e0)}
.scheduling-v65-drawer-body .scheduling-v65-request-top{margin-bottom:8px}
.scheduling-v65-drawer-body .scheduling-v65-request-copy>*+*{margin-top:10px}
.scheduling-v65-drawer-body .scheduling-v65-actions{justify-content:flex-start;max-width:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--theme-line,#eee6e0)}
html[data-workspace-theme='night'] .scheduling-v65-drawer-body .scheduling-v65-request{background:#2b2024;border-color:#523d44}
html[data-workspace-theme='night'] .scheduling-v65-drawer{background:#241a1e;color:#f2e8ea}html[data-workspace-theme='night'] .scheduling-v65-drawer-head{border-color:#4b373e}html[data-workspace-theme='night'] .scheduling-v65-drawer-head button{background:#2c2024;border-color:#554047;color:#eee3e6}
@media(max-width:560px){.scheduling-v65-drawer{width:100vw}.scheduling-v65-float-label{display:none}.scheduling-v65-float{padding:0;width:52px;justify-content:center}}
html[data-workspace-theme='night'] .scheduling-v65-panel,html[data-workspace-theme='night'] .scheduling-v65-modal{background:#241a1e;border-color:#4b373e;color:#f2e8ea}html[data-workspace-theme='night'] .scheduling-v65-head{background:linear-gradient(135deg,rgba(181,140,82,.08),rgba(90,30,45,.16))}html[data-workspace-theme='night'] .scheduling-v65-button{background:#2c2024;border-color:#554047;color:#eee3e6}html[data-workspace-theme='night'] .scheduling-v65-button.primary{background:#7a2942;border-color:#7a2942;color:#fff}html[data-workspace-theme='night'] .scheduling-v65-slot,html[data-workspace-theme='night'] .scheduling-v65-field input,html[data-workspace-theme='night'] .scheduling-v65-field select,html[data-workspace-theme='night'] .scheduling-v65-field textarea,html[data-workspace-theme='night'] .scheduling-v65-mode label{background:#2b2024;border-color:#523d44;color:#eee3e6}html[data-workspace-theme='night'] .scheduling-v65-policy{background:#2b241c;border-color:#5d4b34;color:#d9cfc8}html[data-workspace-theme='night'] .scheduling-v65-policy.billable{background:#322126;border-color:#6a3c47}html[data-workspace-theme='night'] .scheduling-v65-note{background:#2b231f}
@media(max-width:900px){.scheduling-v65-request,.scheduling-v65-admin .scheduling-v65-request{grid-template-columns:1fr}.scheduling-v65-actions{justify-content:flex-start;max-width:none}.scheduling-v65-grid{grid-template-columns:1fr}.scheduling-v65-field.full{grid-column:1}.scheduling-v65-head{align-items:flex-start;flex-direction:column}.scheduling-v65-head>.scheduling-v65-button{width:100%}}
@media(max-width:560px){.scheduling-v65-modal-backdrop{padding:8px}.scheduling-v65-modal{width:100%;max-height:96vh;border-radius:16px}.scheduling-v65-form,.scheduling-v65-modal-head{padding-left:15px;padding-right:15px}.scheduling-v65-slot-grid,.scheduling-v65-mode{grid-template-columns:1fr}.scheduling-v65-actions{flex-direction:column;align-items:stretch}.scheduling-v65-actions .scheduling-v65-button{width:100%}}
`;

const polishStyle = `
.scheduling-v65-float{right:24px;bottom:24px;min-height:48px;padding:0 15px;border-radius:13px;font-family:Inter,system-ui,sans-serif;font-size:12px;transition:transform .25s ease,box-shadow .25s ease}.scheduling-v65-float-label{font-size:12px}.scheduling-v65-float-icon{width:27px;height:27px}
.scheduling-v65-float[hidden],.scheduling-v65-drawer-backdrop[hidden]{display:none!important}
.scheduling-v65-drawer-backdrop{backdrop-filter:blur(7px);background:rgba(24,9,16,.52)}
.scheduling-v65-drawer{top:auto;right:24px;bottom:86px;width:min(520px,calc(100vw - 32px));max-height:min(800px,calc(100dvh - 110px));border:1px solid #b58c52;border-radius:23px;overflow:hidden;box-shadow:0 28px 90px rgba(20,8,13,.32);opacity:0;transform:translateY(36px) scale(.96);pointer-events:none;transition:opacity .32s ease,transform .38s cubic-bezier(.18,.85,.24,1)}
.scheduling-v65-drawer.is-open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
.scheduling-v65-drawer-head{padding:17px 20px 13px}.scheduling-v65-drawer-head h2{font-family:Inter,system-ui,sans-serif;color:var(--theme-text,#2b2b2b);font-size:19px}
.scheduling-v65-drawer-body{padding:0 18px 10px;min-height:0}.scheduling-v65-drawer-pager{display:flex;align-items:center;justify-content:center;gap:14px;padding:10px;border-top:1px solid var(--theme-line,#e5ddd7);color:var(--theme-muted,#746963);font-size:12px;font-weight:700}.scheduling-v65-drawer-pager:empty{display:none}.scheduling-v65-drawer-pager button{width:34px;height:34px;border-radius:10px;border:1px solid var(--theme-line,#e5ddd7);background:var(--theme-surface,#fff);color:var(--theme-text,#2b2b2b);cursor:pointer}
.scheduling-v65-focus-card{border:1px solid var(--theme-line,#e8ddd4);border-radius:15px;overflow:hidden;background:var(--theme-surface,#fff);color:var(--theme-text,#302a28)}
.scheduling-v65-focus-cover{min-height:94px;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:12px 15px;background:linear-gradient(120deg,#5a1e2d,#9a6b51 68%,#d2a85f)}
.scheduling-v65-focus-logo{display:grid;place-items:center;width:62px;height:62px;overflow:hidden;border:2px solid #f5e9d1;border-radius:13px;background:#fff;color:#5a1e2d;font-family:Inter,sans-serif;font-weight:700}.scheduling-v65-focus-logo img{width:100%;height:100%;object-fit:cover}.scheduling-v65-focus-cover>.scheduling-v65-badge{background:#fff9ee;color:#5a1e2d;border-color:#ead5aa}
.scheduling-v65-focus-content{padding:16px}.scheduling-v65-client-expense{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:5px}.scheduling-v65-client-expense>span{font-size:10px}.scheduling-v65-focus-content>small{font-size:10px;letter-spacing:.12em;color:#9b6d3a;font-weight:850;text-transform:uppercase}.scheduling-v65-focus-content h3{margin:5px 0 9px;font-family:Inter,system-ui,sans-serif;color:var(--theme-text,#302a28);font-size:21px;line-height:1.2}.scheduling-v65-focus-content>p{font-size:12px;color:var(--theme-muted,#746963)}
.scheduling-v65-focus-fee{margin:12px 0;padding:10px 12px;border-radius:10px;background:#fff4da;color:#5a1e2d;font-size:11px;font-weight:750}
.scheduling-v65-focus-detail{display:grid;gap:4px;margin-top:12px}.scheduling-v65-focus-detail>span,.scheduling-v65-focus-options>span{font-size:10px;letter-spacing:.09em;text-transform:uppercase;font-weight:850;color:#946a38}.scheduling-v65-focus-detail p{margin:0;font-size:13px;line-height:1.5;color:var(--theme-text,#302a28)}.scheduling-v65-focus-detail a,.scheduling-v65-focus-detail button{width:fit-content;padding:0;border:0;background:transparent;color:#71314a;font-size:12px;font-weight:700;text-align:left;text-decoration:underline;cursor:pointer;overflow-wrap:anywhere}
.scheduling-v65-focus-options{display:grid;gap:7px;margin-top:18px}.scheduling-v65-focus-options .scheduling-v65-button{padding:9px 12px;text-align:left;font-size:12px;white-space:normal}.scheduling-v65-focus-actions{display:flex;gap:8px;margin-top:8px}.scheduling-v65-focus-actions .scheduling-v65-button{flex:1;white-space:normal}
html[data-workspace-theme='night'] .scheduling-v65-focus-card{background:#291e22;border-color:#62494b;color:#f3e9e6}html[data-workspace-theme='night'] .scheduling-v65-focus-content h3,html[data-workspace-theme='night'] .scheduling-v65-focus-detail p{color:#f3e9e6}html[data-workspace-theme='night'] .scheduling-v65-focus-detail a,html[data-workspace-theme='night'] .scheduling-v65-focus-detail button{color:#eed19a}html[data-workspace-theme='night'] .scheduling-v65-focus-fee{background:#443025;color:#f0d89f}html[data-workspace-theme='night'] .scheduling-v65-drawer-pager{border-color:#62494b}
@media(max-width:560px){.scheduling-v65-drawer{right:8px;bottom:72px;width:calc(100vw - 16px);max-height:calc(100dvh - 88px)}.scheduling-v65-float{right:12px;bottom:12px}.scheduling-v65-focus-actions{flex-direction:column}}
@media(prefers-reduced-motion:reduce){.scheduling-v65-drawer{transition:none}}
`;

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
}
function errorText(error: any) { return String(error?.message || error?.details || error || 'Não foi possível concluir a ação.'); }
function slotsOf(value: unknown): Slot[] { return Array.isArray(value) ? value.filter(Boolean) as Slot[] : []; }
function formatSlot(slot?: Slot | null) {
  if (!slot?.startsAt) return 'Horário não definido';
  const start = new Date(slot.startsAt), end = new Date(slot.endsAt || slot.startsAt);
  const day = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' }).format(start).replace(/\./g, '');
  const startTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(start);
  const endTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(end);
  return `${day} · ${startTime}–${endTime}`;
}
function monthKey(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 7);
  const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', timeZone: 'America/Sao_Paulo' }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  return year && month ? `${year}-${month}` : '';
}
function statusLabel(status: string) {
  const labels: Record<string, string> = {
    submitted: 'Em análise pela CALI', client_review: 'Sua confirmação', confirmed: 'Confirmado', reschedule_review: 'Reagendamento em análise', completed: 'Realizado', not_occurred: 'Não realizado', declined: 'Não confirmado', cancelled: 'Cancelado',
  };
  return labels[status] || status;
}
function statusTone(status: string) { return status === 'confirmed' || status === 'completed' ? 'ok' : ['submitted', 'client_review', 'reschedule_review'].includes(status) ? 'pending' : ''; }
function makeSlot(date: string, time: string, duration: number): Slot {
  const start = new Date(`${date}T${time}:00-03:00`);
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + duration * 60_000).toISOString() };
}
function ensureStyle() {
  if (document.getElementById('scheduling-v65-style')) return;
  const node = document.createElement('style'); node.id = 'scheduling-v65-style'; node.textContent = style + polishStyle; document.head.appendChild(node);
}
function closeModal() { modal?.remove(); modal = null; document.body.classList.remove('workspace-modal-open'); }
function ensureAdminFloatHost() {
  if (!document.getElementById('scheduling-v65-admin-float')) {
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'scheduling-v65-admin-float'; button.className = 'scheduling-v65-float';
    button.setAttribute('data-scheduling-admin-float-toggle', ''); button.setAttribute('aria-label', 'Solicitações de agenda'); button.hidden = true;
    button.innerHTML = '<span class="scheduling-v65-float-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></span><span class="scheduling-v65-float-label">Solicitações de agenda</span><span class="scheduling-v65-float-badge">0</span>';
    document.body.appendChild(button);
  }
  if (!document.getElementById('scheduling-v65-admin-drawer-backdrop')) {
    const backdrop = document.createElement('div');
    backdrop.id = 'scheduling-v65-admin-drawer-backdrop'; backdrop.className = 'scheduling-v65-drawer-backdrop'; backdrop.hidden = true;
    document.body.appendChild(backdrop);
  }
  if (!document.getElementById('scheduling-v65-admin-drawer')) {
    const drawer = document.createElement('aside');
    drawer.id = 'scheduling-v65-admin-drawer'; drawer.className = 'scheduling-v65-drawer'; drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-label', 'Pedidos de agenda');
    drawer.innerHTML = '<div class="scheduling-v65-drawer-head"><div><span class="scheduling-v65-kicker">AGENDA CALI</span><h2>Solicitações</h2></div><button type="button" data-scheduling-admin-drawer-close aria-label="Fechar">×</button></div><div class="scheduling-v65-drawer-body"></div><div class="scheduling-v65-drawer-pager"></div>';
    document.body.appendChild(drawer);
  }
}
function openAdminDrawer() { adminDrawerOpen = true; document.getElementById('scheduling-v65-admin-drawer')?.classList.add('is-open'); const backdrop = document.getElementById('scheduling-v65-admin-drawer-backdrop'); if (backdrop) backdrop.hidden = false; }
function closeAdminDrawer() { adminDrawerOpen = false; document.getElementById('scheduling-v65-admin-drawer')?.classList.remove('is-open'); const backdrop = document.getElementById('scheduling-v65-admin-drawer-backdrop'); if (backdrop) backdrop.hidden = true; }
function toggleAdminDrawer() { if (adminDrawerOpen) closeAdminDrawer(); else openAdminDrawer(); }
function setModalError(message: string) { const node = modal?.querySelector<HTMLElement>('.scheduling-v65-error'); if (node) { node.textContent = message; node.classList.add('show'); } }
function toast(message: string, tone: 'normal' | 'error' = 'normal') { document.querySelector('.scheduling-v65-toast')?.remove(); const node = document.createElement('div'); node.className = `scheduling-v65-toast ${tone === 'error' ? 'error' : ''}`; node.textContent = message; document.body.appendChild(node); window.setTimeout(() => node.remove(), 4200); }
function openModal(title: string, kicker: string, body: string) {
  closeModal();
  modal = document.createElement('div'); modal.className = 'scheduling-v65-modal-backdrop';
  modal.innerHTML = `<div class="scheduling-v65-modal"><div class="scheduling-v65-modal-head"><div><span class="scheduling-v65-kicker">${esc(kicker)}</span><h3>${esc(title)}</h3></div><button type="button" data-scheduling-close aria-label="Fechar">×</button></div>${body}</div>`;
  document.body.appendChild(modal); document.body.classList.add('workspace-modal-open');
}
function usedIncludedVisits(requests: SchedulingRequest[], month: string, excludeId?: string) {
  return requests.filter((request) => request.id !== excludeId && request.request_mode === 'in_person' && !request.billable_extra && INCLUDED_USAGE_STATUSES.has(request.status) && request.selected_slot && monthKey(request.selected_slot.startsAt) === month).length;
}
function likelyBillable(company: Company, requests: SchedulingRequest[], month: string, request?: SchedulingRequest) {
  if (!month) return Number(company.onsite_visits_included_per_month || 0) === 0;
  if (request?.confirmed_event_id && request.billable_extra === false) return false;
  const included = Number(company.onsite_visits_included_per_month || 0);
  return usedIncludedVisits(requests, month, request?.id) >= included;
}

async function renderClient() {
  if (!supabase || window.location.pathname !== '/cliente/cronograma') return;
  if (clientRenderInFlight) return;
  clientRenderInFlight = true;
  const anchor = document.querySelector<HTMLElement>('.client-google-panel'); if (!anchor) { clientRenderInFlight = false; return; }
  let host = document.getElementById('scheduling-v65-client-host');
  document.querySelectorAll<HTMLElement>('[id="scheduling-v65-client-host"]').forEach((node, index) => { if (index > 0) node.remove(); });
  if (!host) { host = document.createElement('div'); host.id = 'scheduling-v65-client-host'; anchor.insertAdjacentElement('afterend', host); }
  host.innerHTML = '<section class="scheduling-v65-panel"><div class="scheduling-v65-empty">Carregando solicitações de agenda…</div></section>';
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser(); if (userError) throw userError;
    const userId = userData.user?.id; if (!userId) throw new Error('Sessão do cliente não encontrada.');
    const profile = await supabase.from('profiles').select('company_id').eq('id', userId).maybeSingle(); if (profile.error) throw profile.error;
    const companyId = String(profile.data?.company_id || ''); if (!companyId) throw new Error('Empresa não vinculada ao acesso.');
    const [companyResult, requestResult, expenseResult] = await Promise.all([
      supabase.from('companies').select('id,display_name,logo_url,onsite_visits_included_per_month').eq('id', companyId).maybeSingle(),
      supabase.from('scheduling_requests').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
      supabase.from('extra_visit_expenses').select('request_id,expense_kind,amount_cents,receipt_path,protocol,hours_quantity').eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
    ]);
    if (companyResult.error) throw companyResult.error; if (requestResult.error) throw requestResult.error;
    const company = companyResult.data as Company; const requests = (requestResult.data || []) as SchedulingRequest[]; clientContext = { company, requests }; clientExpenses = (expenseResult.data || []) as ExtraExpense[];
    const active = requests.filter((request) => ADMIN_PENDING_STATUSES.has(request.status) || (request.extra_visit && ['confirmed','completed','not_occurred'].includes(request.status)));
    host.innerHTML = `<section class="scheduling-v65-panel"><div class="scheduling-v65-head"><div><span class="scheduling-v65-kicker">AGENDA COM A CALI</span><h2>Solicitar reunião ou visita</h2><p>Envie opções de horário para análise. O compromisso só entra na agenda depois da confirmação de ambas as partes.</p></div><button type="button" class="scheduling-v65-button primary" data-scheduling-client-new>Solicitar horário</button></div>${active.length ? `<div class="scheduling-v65-list">${active.map(renderClientRequest).join('')}</div>` : '<div class="scheduling-v65-empty">Você não tem solicitações de horário em análise neste momento.</div>'}</section>`;
  } catch (error) {
    host.innerHTML = `<section class="scheduling-v65-panel"><div class="scheduling-v65-empty">${esc(errorText(error))}</div></section>`;
  } finally { clientRenderInFlight = false; }
}
function proposalNeedsBilling(request: SchedulingRequest, slot: Slot) {
  if (request.extra_visit) return true;
  if (!clientContext || request.request_mode !== 'in_person') return false;
  return likelyBillable(clientContext.company, clientContext.requests, monthKey(slot.startsAt), request);
}
function renderClientRequest(request: SchedulingRequest) {
  const requested = slotsOf(request.requested_slots), proposals = slotsOf(request.admin_proposed_slots), selected = request.selected_slot;
  const proposalBillable = proposals.some((slot) => proposalNeedsBilling(request, slot));
  const receipts = clientExpenses.filter(expense => expense.request_id === request.id);
  return `<article class="scheduling-v65-request" data-scheduling-request-card="${esc(request.id)}"><div class="scheduling-v65-request-copy"><div class="scheduling-v65-request-top"><strong>${esc(request.title)}</strong><span class="scheduling-v65-badge ${statusTone(request.status)}">${esc(statusLabel(request.status))}</span><span class="scheduling-v65-badge">${request.extra_visit ? 'Visita extra · R$ 800,00 / 4h' : request.request_mode === 'in_person' ? 'Presencial' : 'Virtual'}</span></div>${request.purpose ? `<p>${esc(request.purpose)}</p>` : ''}${request.location && request.request_mode === 'in_person' ? `<p><strong>Endereço:</strong> ${esc(request.location)}</p>` : ''}${request.status === 'submitted' || request.status === 'reschedule_review' ? `<div class="scheduling-v65-slots">${requested.map((slot) => `<span class="scheduling-v65-slot">${esc(formatSlot(slot))}</span>`).join('')}</div>` : ''}${request.status === 'client_review' ? `<div class="scheduling-v65-slots">${proposals.map((slot) => `<span class="scheduling-v65-slot">${esc(formatSlot(slot))}</span>`).join('')}</div>${request.admin_note ? `<div class="scheduling-v65-note"><strong>Mensagem da CALI:</strong> ${esc(request.admin_note)}</div>` : ''}${proposalBillable && !request.billing_acknowledged_at ? `<label class="scheduling-v65-ack"><input type="checkbox" data-scheduling-accept-ack/> <span>Li e estou ciente das condições da visita adicional.</span></label>` : ''}` : ''}${request.status === 'confirmed' && selected ? `<div class="scheduling-v65-note"><strong>Confirmado:</strong> ${esc(formatSlot(selected))}. O compromisso já faz parte da agenda do Workspace e segue para o Google Calendar da CALI.</div>` : ''}${request.extra_visit && request.status === 'completed' ? `<div class="scheduling-v65-note"><strong>Visita realizada:</strong> R$ 800,00 por até 4h; despesas comprovadas são discriminadas à parte.${receipts.length ? `<div>${receipts.map(expense => `<div class="scheduling-v65-client-expense"><span>${esc(({ transport: 'Deslocamento', parking: 'Estacionamento', food: 'Alimentação', extra_hours: 'Horas adicionais' } as Record<string,string>)[expense.expense_kind] || 'Despesa')} · R$ ${(expense.amount_cents / 100).toFixed(2).replace('.', ',')} ${expense.hours_quantity ? `· ${expense.hours_quantity}h` : ''} · ${esc(expense.protocol || '')}</span>${expense.receipt_path ? `<button type="button" class="scheduling-v65-button" data-extra-receipt="${esc(expense.receipt_path)}">Ver comprovante ↗</button>` : ''}</div>`).join('')}</div>` : ''}</div>` : ''}${request.extra_visit && request.status === 'not_occurred' ? `<div class="scheduling-v65-note"><strong>Visita não realizada:</strong> ${request.extra_visit_cancellation_fee_cents == null ? 'A CALI está avaliando a condição de cancelamento.' : request.extra_visit_cancellation_fee_cents ? 'Taxa de R$ 160,00 registrada.' : 'Sem taxa de cancelamento.'} ${esc(request.extra_visit_cancellation_note || '')}</div>` : ''}</div><div class="scheduling-v65-actions">${request.status === 'client_review' ? `${proposals.map((slot, index) => `<button type="button" class="scheduling-v65-button primary" data-scheduling-client-accept="${esc(request.id)}" data-slot-index="${index}" data-billable="${proposalNeedsBilling(request, slot) ? '1' : '0'}">Confirmar ${esc(formatSlot(slot))}</button>`).join('')}<button type="button" class="scheduling-v65-button" data-scheduling-client-more="${esc(request.id)}">Pedir outras opções</button>` : request.status === 'submitted' || request.status === 'reschedule_review' ? '<span class="scheduling-v65-badge pending">Aguardando análise</span>' : request.status === 'confirmed' ? '<span class="scheduling-v65-badge ok">Na agenda</span>' : ''}</div></article>`;
}
function openClientForm() {
  if (!clientContext) return;
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  openModal('Solicitar horário', 'AGENDA COM A CALI', `<form class="scheduling-v65-form" id="scheduling-client-form"><div class="scheduling-v65-grid"><div class="scheduling-v65-field full"><span>Formato</span><div class="scheduling-v65-mode"><label><input type="radio" name="mode" value="remote" checked/> Reunião virtual</label><label><input type="radio" name="mode" value="in_person"/> Visita presencial</label></div></div><label class="scheduling-v65-field full"><span>Assunto</span><input name="title" maxlength="160" required placeholder="Ex.: alinhamento de prioridades do mês"/></label><label class="scheduling-v65-field full"><span>Objetivo / contexto</span><textarea name="purpose" placeholder="Conte em poucas linhas o que precisa ser tratado."></textarea></label><label class="scheduling-v65-field full" data-scheduling-location-field hidden><span>Endereço da visita</span><input name="location" placeholder="Rua, número, bairro, cidade"/></label><label class="scheduling-v65-field"><span>Duração prevista</span><select name="duration"><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60" selected>1 hora</option><option value="90">1h30</option><option value="120">2 horas</option></select></label><div></div><div class="scheduling-v65-field"><span>Opção 1</span><div class="scheduling-v65-slot-grid"><input type="date" name="date1" min="${minDate}" required/><input type="time" name="time1" required/></div></div><div class="scheduling-v65-field"><span>Opção 2 <small data-scheduling-slot2-label>(opcional no virtual)</small></span><div class="scheduling-v65-slot-grid"><input type="date" name="date2" min="${minDate}"/><input type="time" name="time2"/></div></div></div><div id="scheduling-client-policy" class="scheduling-v65-policy"><strong>Como funciona</strong>As datas enviadas são opções para análise de agenda. Nenhum horário fica reservado até a confirmação final.</div><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Cancelar</button><button type="submit" class="scheduling-v65-button primary">Enviar para análise</button></div></form>`);
  updateClientFormPolicy();
}
function updateClientFormPolicy() {
  if (!modal || !clientContext) return;
  const form = modal.querySelector<HTMLFormElement>('#scheduling-client-form'); if (!form) return;
  const mode = form.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value || 'remote';
  const locationField = form.querySelector<HTMLElement>('[data-scheduling-location-field]'); if (locationField) locationField.hidden = mode !== 'in_person';
  const slot2Label = form.querySelector<HTMLElement>('[data-scheduling-slot2-label]'); if (slot2Label) slot2Label.textContent = mode === 'in_person' ? '(obrigatória)' : '(opcional no virtual)';
  const date2 = form.elements.namedItem('date2') as HTMLInputElement | null, time2 = form.elements.namedItem('time2') as HTMLInputElement | null; if (date2) date2.required = mode === 'in_person'; if (time2) time2.required = mode === 'in_person';
  const policy = form.querySelector<HTMLElement>('#scheduling-client-policy'); if (!policy) return;
  if (mode !== 'in_person') { policy.className = 'scheduling-v65-policy'; policy.innerHTML = '<strong>Reunião virtual</strong>Envie uma ou duas opções. Depois da confirmação, o compromisso entra no Workspace e o Google Meet é criado na agenda da CALI.'; return; }
  const date1 = (form.elements.namedItem('date1') as HTMLInputElement | null)?.value || '';
  const month = date1 ? date1.slice(0, 7) : '';
  const billable = likelyBillable(clientContext.company, clientContext.requests, month);
  if (billable) {
    policy.className = 'scheduling-v65-policy billable';
    policy.innerHTML = `<strong>Visita presencial adicional</strong>Esta visita gera cobrança adicional. Se o cliente cancelar depois da confirmação, será aplicada uma taxa não reembolsável de 20% pelo comprometimento da agenda. A taxa de deslocamento já está incluída. A condição considera até 1h30 de visita.<label class="scheduling-v65-ack"><input type="checkbox" name="billingAck"/> <span>Li e estou ciente desta condição para seguir com a solicitação.</span></label>`;
  } else {
    policy.className = 'scheduling-v65-policy';
    policy.innerHTML = '<strong>Visita presencial incluída no contrato</strong>A realização depende da disponibilidade de ambas as agendas. A visita admite até 2 reagendamentos mediante justificativa, não é cumulativa e, em caso de viagem ou férias, pode ser convertida em reunião virtual.';
  }
}

async function renderAdmin() {
  if (!supabase || window.location.pathname !== '/admin/calendario') return;
  if (adminRenderInFlight) return;
  adminRenderInFlight = true;
  ensureAdminFloatHost();
  const float = document.getElementById('scheduling-v65-admin-float') as HTMLButtonElement | null;
  const drawerBody = document.querySelector<HTMLElement>('#scheduling-v65-admin-drawer .scheduling-v65-drawer-body');
  const anchor = document.querySelector<HTMLElement>('.calendar-workspace-strip');
  let host: HTMLElement | null = null;
  if (anchor) {
    host = document.getElementById('scheduling-v65-admin-host');
    document.querySelectorAll<HTMLElement>('[id="scheduling-v65-admin-host"]').forEach((node, index) => { if (index > 0) node.remove(); });
    if (!host) { host = document.createElement('div'); host.id = 'scheduling-v65-admin-host'; anchor.insertAdjacentElement('afterend', host); }
  }
  try {
    const [companiesResult, requestResult] = await Promise.all([
      supabase.from('companies').select('id,display_name,logo_url,onsite_visits_included_per_month').neq('status', 'archived').order('display_name'),
      supabase.from('scheduling_requests').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (companiesResult.error) throw companiesResult.error; if (requestResult.error) throw requestResult.error;
    const companies = (companiesResult.data || []) as Company[], requests = (requestResult.data || []) as SchedulingRequest[]; adminContext = { companies, requests };
    const active = requests.filter((request) => ADMIN_PENDING_STATUSES.has(request.status));
    if (active.length) {
      const [people, files] = await Promise.all([
        supabase.from('profiles').select('id,full_name').in('id', [...new Set(active.map(request => request.requested_by))]),
        supabase.from('extra_visit_request_attachments').select('request_id,storage_path,file_name').in('request_id', active.map(request => request.id)),
      ]);
      adminRequesterNames = Object.fromEntries((people.data || []).map(person => [person.id, person.full_name]));
      adminAttachments = (files.data || []) as RequestAttachment[];
    }
    const pendingCount = requests.filter((request) => ADMIN_PENDING_STATUSES.has(request.status)).length;
    const extraOutcomes = requests.filter(request => request.extra_visit && request.status === 'not_occurred');
    if (float) { float.hidden = pendingCount === 0; const badge = float.querySelector('.scheduling-v65-float-badge'); if (badge) badge.textContent = String(pendingCount); }
    if (pendingCount === 0) closeAdminDrawer();
    if (drawerBody) { adminRequestIndex = Math.min(adminRequestIndex, Math.max(0, active.length - 1)); renderAdminDrawerItems(active); }
    if (host) host.innerHTML = `<section class="scheduling-v65-panel scheduling-v65-admin-config"><div class="scheduling-v65-head"><div><span class="scheduling-v65-kicker">CONFIGURAÇÃO</span><h2>Agenda do contrato</h2><p>Defina quantas visitas presenciais estão incluídas por mês para cada cliente.</p></div><button type="button" class="scheduling-v65-button" data-scheduling-admin-contract>Configurar encontros do contrato</button></div></section>${extraOutcomes.length ? `<section class="scheduling-v65-panel"><div class="scheduling-v65-head"><div><span class="scheduling-v65-kicker">DECISÃO MANUAL</span><h2>Visitas extras não realizadas</h2><p>A taxa de 20% depende da sua avaliação do aviso e da justificativa.</p></div></div><div class="scheduling-v65-list">${extraOutcomes.map(request => `<article class="scheduling-v65-request"><strong>${esc(companyFor(request.company_id)?.display_name || 'Cliente')} · ${esc(request.title)}</strong><p>${request.extra_visit_cancellation_fee_cents == null ? 'Avalie se houve ausência ou cancelamento sem aviso e sem justificativa.' : `Decisão registrada: ${request.extra_visit_cancellation_fee_cents ? 'R$ 160,00' : 'sem taxa'} · ${esc(request.extra_visit_cancellation_note || '')}`}</p><div class="scheduling-v65-actions"><button type="button" class="scheduling-v65-button" data-extra-cancel-id="${esc(request.id)}">${request.extra_visit_cancellation_fee_cents == null ? 'Registrar decisão' : 'Rever decisão'}</button></div></article>`).join('')}</div></section>` : ''}`;
  } catch (error) { if (drawerBody) drawerBody.innerHTML = `<div class="scheduling-v65-empty">${esc(errorText(error))}</div>`; if (host) host.innerHTML = `<section class="scheduling-v65-panel"><div class="scheduling-v65-empty">${esc(errorText(error))}</div></section>`; } finally { adminRenderInFlight = false; }
}
function companyFor(id: string) { return adminContext?.companies.find((company) => company.id === id) || null; }
function renderAdminDrawerItems(active: SchedulingRequest[]) {
  const body = document.querySelector<HTMLElement>('#scheduling-v65-admin-drawer .scheduling-v65-drawer-body');
  const pager = document.querySelector<HTMLElement>('#scheduling-v65-admin-drawer .scheduling-v65-drawer-pager');
  if (!body || !pager) return;
  body.innerHTML = active.length ? renderAdminRequest(active[adminRequestIndex]) : '<div class="scheduling-v65-empty">Nenhum pedido de agenda pendente.</div>';
  pager.innerHTML = active.length > 1 ? `<button type="button" data-scheduling-drawer-page="-1" aria-label="Pedido anterior">←</button><span>${adminRequestIndex + 1} de ${active.length}</span><button type="button" data-scheduling-drawer-page="1" aria-label="Próximo pedido">→</button>` : '';
}
function renderAdminRequest(request: SchedulingRequest) {
  const company = companyFor(request.company_id), requested = slotsOf(request.requested_slots), proposals = slotsOf(request.admin_proposed_slots);
  const logo = company?.logo_url ? `<img src="${esc(company.logo_url)}" alt="Logo de ${esc(company.display_name)}"/>` : '<span>CALI</span>';
  const attachments = adminAttachments.filter(item => item.request_id === request.id);
  return `<article class="scheduling-v65-focus-card" data-admin-request="${esc(request.id)}">
    <div class="scheduling-v65-focus-cover"><div class="scheduling-v65-focus-logo">${logo}</div><span class="scheduling-v65-badge ${statusTone(request.status)}">${esc(statusLabel(request.status))}</span></div>
    <div class="scheduling-v65-focus-content"><small>${esc(company?.display_name || 'Cliente')}</small><h3>${esc(request.title)}</h3>
      <p>Solicitado por <strong>${esc(adminRequesterNames[request.requested_by] || 'Cliente')}</strong></p>
      ${request.extra_visit ? '<div class="scheduling-v65-focus-fee">Visita extra · R$ 800,00 por até 4h · despesas à parte</div>' : ''}
      ${request.purpose ? `<div class="scheduling-v65-focus-detail"><span>Objetivo</span><p>${esc(request.purpose)}</p></div>` : ''}
      ${request.location ? `<div class="scheduling-v65-focus-detail"><span>Local</span><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.location)}" target="_blank" rel="noopener noreferrer">${esc(request.location)} ↗</a></div>` : ''}
      ${attachments.length ? `<div class="scheduling-v65-focus-detail"><span>Anexo</span>${attachments.map(item => `<button type="button" data-scheduling-request-attachment="${esc(item.storage_path)}">${esc(item.file_name)} ↗</button>`).join('')}</div>` : ''}
      ${request.client_note ? `<div class="scheduling-v65-focus-detail"><span>Mensagem do cliente</span><p>${esc(request.client_note)}</p></div>` : ''}
      ${request.status === 'client_review' ? `<div class="scheduling-v65-focus-detail"><span>Opções enviadas</span><p>${proposals.map(formatSlot).map(esc).join(' · ')}</p></div>` : ''}
      ${request.status === 'submitted' || request.status === 'reschedule_review' ? `<div class="scheduling-v65-focus-options"><span>Escolha uma das datas</span>${requested.map((slot,index) => `<button type="button" class="scheduling-v65-button primary" data-scheduling-admin-use-slot="${esc(request.id)}" data-slot-index="${index}">Confirmar · ${esc(formatSlot(slot))}</button>`).join('')}</div><div class="scheduling-v65-focus-actions"><button type="button" class="scheduling-v65-button" data-scheduling-admin-counter="${esc(request.id)}">Sugerir datas</button><button type="button" class="scheduling-v65-button danger" data-scheduling-admin-decline="${esc(request.id)}">Não confirmar</button></div>` : '<div class="scheduling-v65-focus-fee">Aguardando resposta do cliente.</div>'}
    </div>
  </article>`;
}
function renderOutcomeActions(request: SchedulingRequest) {
  const start = request.selected_slot?.startsAt ? new Date(request.selected_slot.startsAt).getTime() : 0;
  if (start && start > Date.now()) return '<span class="scheduling-v65-badge ok">Compromisso futuro</span>';
  return `<button type="button" class="scheduling-v65-button" data-scheduling-admin-occurred="${esc(request.id)}">Marcar realizado</button><button type="button" class="scheduling-v65-button danger" data-scheduling-admin-no-show="${esc(request.id)}">Não ocorreu</button>`;
}
function openAdminCounter(request: SchedulingRequest) {
  const duration = Math.max(30, Math.round(((new Date(slotsOf(request.requested_slots)[0]?.endsAt || 0).getTime() - new Date(slotsOf(request.requested_slots)[0]?.startsAt || 0).getTime()) / 60000) || 60));
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  openModal('Sugerir outros horários', 'ANÁLISE DE AGENDA', `<form class="scheduling-v65-form" id="scheduling-admin-counter-form" data-request-id="${esc(request.id)}"><div class="scheduling-v65-grid"><label class="scheduling-v65-field"><span>Duração</span><select name="duration"><option value="30" ${duration === 30 ? 'selected' : ''}>30 minutos</option><option value="45" ${duration === 45 ? 'selected' : ''}>45 minutos</option><option value="60" ${duration === 60 ? 'selected' : ''}>1 hora</option><option value="90" ${duration === 90 ? 'selected' : ''}>1h30</option><option value="120" ${duration === 120 ? 'selected' : ''}>2 horas</option>${request.extra_visit ? '<option value="240" selected>4 horas</option>' : ''}</select></label><div></div><div class="scheduling-v65-field"><span>Opção 1</span><div class="scheduling-v65-slot-grid"><input type="date" name="date1" min="${minDate}" required/><input type="time" name="time1" required/></div></div><div class="scheduling-v65-field"><span>Opção 2 ${request.extra_visit ? '(obrigatória)' : '(opcional)'}</span><div class="scheduling-v65-slot-grid"><input type="date" name="date2" min="${minDate}" ${request.extra_visit ? 'required' : ''}/><input type="time" name="time2" ${request.extra_visit ? 'required' : ''}/></div></div><label class="scheduling-v65-field full"><span>Mensagem para o cliente</span><textarea name="note" placeholder="Ex.: as opções enviadas conflitam com a agenda. Consigo nestes horários."></textarea></label></div><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Cancelar</button><button type="submit" class="scheduling-v65-button primary">Enviar opções</button></div></form>`);
}
function openAdminDecline(request: SchedulingRequest) {
  openModal('Não confirmar solicitação', 'ANÁLISE DE AGENDA', `<form class="scheduling-v65-form" id="scheduling-admin-decline-form" data-request-id="${esc(request.id)}"><label class="scheduling-v65-field"><span>Motivo</span><textarea name="note" required placeholder="Explique de forma objetiva por que esta solicitação não poderá ser confirmada."></textarea></label><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Cancelar</button><button type="submit" class="scheduling-v65-button danger">Registrar resposta</button></div></form>`);
}
function openOutcome(request: SchedulingRequest) {
  const includedFixed = request.request_mode === 'in_person' && !request.billable_extra;
  openModal('Registrar não ocorrência', 'HISTÓRICO DA AGENDA', `<form class="scheduling-v65-form" id="scheduling-admin-outcome-form" data-request-id="${esc(request.id)}" data-event-id="${esc(request.confirmed_event_id || '')}"><div class="scheduling-v65-grid"><label class="scheduling-v65-field"><span>Motivo</span><select name="reason" required><option value="">Selecione</option><option value="client">Cliente</option><option value="cali">CALI</option><option value="external">Fator externo</option><option value="health">Saúde</option><option value="travel_vacation">Viagem / férias</option><option value="other">Outro</option></select></label><label class="scheduling-v65-field"><span>Reposição</span><select name="justified"><option value="true">Com justificativa</option><option value="false">Sem justificativa</option></select></label><label class="scheduling-v65-field full"><span>Justificativa / registro</span><textarea name="note" required placeholder="Registre o que impediu a realização."></textarea></label><label class="scheduling-v65-ack full" data-scheduling-convert-wrap hidden><input type="checkbox" name="convertVirtual"/> <span>Converter a reposição desta visita presencial em reunião virtual.</span></label></div><div class="scheduling-v65-policy"><strong>${includedFixed ? 'Visita fixa incluída' : 'Regra de reposição'}</strong>${includedFixed ? `Com justificativa, a visita pode ser reagendada até 2 vezes. Esta solicitação já utilizou ${Number(request.reschedule_count || 0)} reagendamento(s). Sem justificativa, a visita não é reposta e não acumula para o mês seguinte.` : 'Com justificativa, o compromisso pode voltar para análise de agenda. Sem justificativa, a não ocorrência fica encerrada no histórico.'}</div><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Cancelar</button><button type="submit" class="scheduling-v65-button danger">Registrar não ocorrência</button></div></form>`);
}
function openContractConfig() {
  if (!adminContext) return;
  openModal('Visitas presenciais do contrato', 'REGRA DO CLIENTE', `<form class="scheduling-v65-form" id="scheduling-contract-form"><div class="scheduling-v65-grid"><label class="scheduling-v65-field full"><span>Cliente</span><select name="companyId" required>${adminContext.companies.map((company) => `<option value="${esc(company.id)}" data-count="${Number(company.onsite_visits_included_per_month || 0)}">${esc(company.display_name)}</option>`).join('')}</select></label><label class="scheduling-v65-field"><span>Visitas presenciais incluídas por mês</span><input type="number" name="count" min="0" max="12" value="${Number(adminContext.companies[0]?.onsite_visits_included_per_month || 0)}" required/></label></div><div class="scheduling-v65-policy"><strong>Regra aplicada automaticamente</strong>Quando a quantidade incluída do mês já tiver sido utilizada, a próxima visita presencial será apresentada ao cliente como adicional, com cobrança no mês subsequente e taxa de deslocamento. A visita incluída não é cumulativa.</div><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Cancelar</button><button type="submit" class="scheduling-v65-button primary">Salvar regra</button></div></form>`);
}

async function rpc(name: string, args: Record<string, unknown>) { if (!supabase) throw new Error('Supabase indisponível.'); const { data, error } = await supabase.rpc(name, args); if (error) throw error; return data as any; }
function requestAdmin(id: string) { return adminContext?.requests.find((request) => request.id === id) || null; }
async function refreshCurrent() { if (window.location.pathname === '/cliente/cronograma') await renderClient(); if (window.location.pathname === '/admin/calendario') await renderAdmin(); }

async function handleClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null; if (!target) return;
  const receipt = target.closest<HTMLElement>('[data-extra-receipt]'); if (receipt && supabase) {
    event.preventDefault(); const path = receipt.dataset.extraReceipt || '';
    const { data, error } = await supabase.storage.from('cali-workspace-private').createSignedUrl(path, 120);
    if (error || !data?.signedUrl) toast(error?.message || 'Comprovante indisponível.', 'error');
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  if (target.closest('[data-scheduling-close]')) { event.preventDefault(); closeModal(); return; }
  const attachment = target.closest<HTMLElement>('[data-scheduling-request-attachment]'); if (attachment && supabase) { event.preventDefault(); const { data, error } = await supabase.storage.from('cali-workspace-private').createSignedUrl(attachment.dataset.schedulingRequestAttachment || '', 120); if (error || !data?.signedUrl) toast(error?.message || 'Anexo indisponível.', 'error'); else window.open(data.signedUrl, '_blank', 'noopener,noreferrer'); return; }
  const page = target.closest<HTMLElement>('[data-scheduling-drawer-page]'); if (page && adminContext) { event.preventDefault(); const active = adminContext.requests.filter(request => ADMIN_PENDING_STATUSES.has(request.status)); if (!active.length) return; adminRequestIndex = (adminRequestIndex + Number(page.dataset.schedulingDrawerPage) + active.length) % active.length; renderAdminDrawerItems(active); return; }
  if (target.closest('[data-scheduling-admin-float-toggle]')) { event.preventDefault(); toggleAdminDrawer(); return; }
  if (target.closest('[data-scheduling-admin-drawer-close]')) { event.preventDefault(); closeAdminDrawer(); return; }
  if (target.id === 'scheduling-v65-admin-drawer-backdrop') { closeAdminDrawer(); return; }
  if (target.closest('[data-scheduling-client-new]')) { event.preventDefault(); openClientForm(); return; }
  const accept = target.closest<HTMLElement>('[data-scheduling-client-accept]');
  if (accept) {
    event.preventDefault(); if (!clientContext) return;
    const id = String(accept.dataset.schedulingClientAccept || ''), index = Number(accept.dataset.slotIndex || 0), card = accept.closest<HTMLElement>('[data-scheduling-request-card]');
    const needsAck = accept.dataset.billable === '1' && !clientContext.requests.find((request) => request.id === id)?.billing_acknowledged_at;
    const ack = Boolean(card?.querySelector<HTMLInputElement>('[data-scheduling-accept-ack]')?.checked);
    if (needsAck && !ack) { toast('Para confirmar esta visita adicional, registre sua ciência sobre a cobrança.', 'error'); return; }
    accept.setAttribute('disabled', 'true');
    try {
      const result = await rpc('client_accept_scheduling_proposal_v1', { p_request_id: id, p_slot_index: index, p_billing_acknowledged: ack });
      if (result?.event_id && supabase) {
        const sync = await supabase.functions.invoke('workspace-sync-scheduled-event', { body: { eventId: result.event_id } });
        if (sync.error || sync.data?.error) toast('Horário confirmado no Workspace. A sincronização com o Google ficará pendente para nova tentativa.', 'error');
        else toast('Horário confirmado. O compromisso entrou no Workspace e no Google Calendar.');
      }
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) { toast(errorText(error), 'error'); accept.removeAttribute('disabled'); }
    return;
  }
  const more = target.closest<HTMLElement>('[data-scheduling-client-more]'); if (more) { event.preventDefault(); const id = String(more.dataset.schedulingClientMore || ''); if (clientContext?.requests.find(request => request.id === id)?.extra_visit) {
    const minDate = new Date(Date.now() + 48 * 3600000).toISOString().slice(0,10);
    openModal('Outras opções para sua visita', 'VAMOS AJUSTAR A AGENDA', `<form class="scheduling-v65-form" id="extra-visit-client-counter" data-request-id="${esc(id)}"><p>Opa, não encaixou desta vez 🙂 Escolha duas novas opções de 4 horas. Eu avalio e te respondo.</p><div class="scheduling-v65-grid"><div class="scheduling-v65-field"><span>Opção 1</span><div class="scheduling-v65-slot-grid"><input type="date" name="date1" min="${minDate}" required/><input type="time" name="time1" min="09:00" max="12:00" required/></div></div><div class="scheduling-v65-field"><span>Opção 2</span><div class="scheduling-v65-slot-grid"><input type="date" name="date2" min="${minDate}" required/><input type="time" name="time2" min="09:00" max="12:00" required/></div></div><label class="scheduling-v65-field full"><span>Observação</span><textarea name="note" placeholder="Conte o que precisamos considerar."></textarea></label></div><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Voltar</button><button type="submit" class="scheduling-v65-button primary">Enviar opções</button></div></form>`);
    return;
  } const note = window.prompt('Se quiser, diga por que os horários não funcionam ou indique uma preferência.'); if (note === null) return; try { await rpc('client_request_new_scheduling_options_v1', { p_request_id: id, p_note: note }); toast('Pedido de novas opções enviado à CALI.'); await renderClient(); } catch (error) { toast(errorText(error), 'error'); } return; }
  const useSlot = target.closest<HTMLElement>('[data-scheduling-admin-use-slot]'); if (useSlot) { event.preventDefault(); const req = requestAdmin(String(useSlot.dataset.schedulingAdminUseSlot || '')); if (!req) return; const slot = slotsOf(req.requested_slots)[Number(useSlot.dataset.slotIndex || 0)]; if (!slot) return; useSlot.setAttribute('disabled', 'true'); try { if (req.extra_visit) { const result = await rpc('admin_confirm_extra_visit_v1', { p_request_id: req.id, p_slot_index: Number(useSlot.dataset.slotIndex || 0) }); if (result?.event_id && supabase) void supabase.functions.invoke('workspace-sync-scheduled-event', { body: { eventId: result.event_id } }); toast('Visita extra confirmada e cliente notificado.'); } else { await rpc('admin_respond_scheduling_request_v1', { p_request_id: req.id, p_proposed_slots: [slot], p_note: 'Um dos horários enviados está disponível.', p_decline: false }); toast('Horário enviado ao cliente para confirmação.'); } await renderAdmin(); } catch (error) { toast(errorText(error), 'error'); useSlot.removeAttribute('disabled'); } return; }
  const counter = target.closest<HTMLElement>('[data-scheduling-admin-counter]'); if (counter) { event.preventDefault(); const req = requestAdmin(String(counter.dataset.schedulingAdminCounter || '')); if (req) openAdminCounter(req); return; }
  const decline = target.closest<HTMLElement>('[data-scheduling-admin-decline]'); if (decline) { event.preventDefault(); const req = requestAdmin(String(decline.dataset.schedulingAdminDecline || '')); if (req) openAdminDecline(req); return; }
  const occurred = target.closest<HTMLElement>('[data-scheduling-admin-occurred]'); if (occurred) { event.preventDefault(); const req = requestAdmin(String(occurred.dataset.schedulingAdminOccurred || '')); if (!req?.confirmed_event_id || !window.confirm('Confirmar que este compromisso foi realizado?')) return; try { await rpc('admin_mark_scheduling_event_outcome_v1', { p_event_id: req.confirmed_event_id, p_outcome: 'occurred', p_reason_category: null, p_justified: false, p_note: '', p_convert_to_virtual: false }); toast('Compromisso registrado como realizado.'); await renderAdmin(); } catch (error) { toast(errorText(error), 'error'); } return; }
  const noShow = target.closest<HTMLElement>('[data-scheduling-admin-no-show]'); if (noShow) { event.preventDefault(); const req = requestAdmin(String(noShow.dataset.schedulingAdminNoShow || '')); if (req) openOutcome(req); return; }
  if (target.closest('[data-scheduling-admin-contract]')) { event.preventDefault(); openContractConfig(); return; }
  const cancellation = target.closest<HTMLElement>('[data-extra-cancel-id]'); if (cancellation) {
    event.preventDefault(); const id = String(cancellation.dataset.extraCancelId || '');
    openModal('Decisão sobre a visita não realizada', 'AVALIAÇÃO MANUAL', `<form class="scheduling-v65-form" id="extra-visit-cancellation-form" data-request-id="${esc(id)}"><p>Avalie se houve aviso ou uma justificativa. A taxa de 20% corresponde a R$ 160,00.</p><div class="scheduling-v65-mode"><label><input type="radio" name="charge" value="false" checked/> Isentar · com aviso ou justificativa</label><label><input type="radio" name="charge" value="true"/> Cobrar R$ 160,00 · sem aviso nem justificativa</label></div><label class="scheduling-v65-field"><span>Motivo da decisão</span><textarea name="note" required minlength="5" placeholder="Registre o aviso, a justificativa ou a ausência sem aviso."></textarea></label><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Voltar</button><button type="submit" class="scheduling-v65-button primary">Registrar decisão</button></div></form>`);
    return;
  }
}

async function handleSubmit(event: SubmitEvent) {
  const form = event.target as HTMLFormElement | null; if (!form) return;
  if (form.id === 'extra-visit-cancellation-form') {
    event.preventDefault(); const fd = new FormData(form), charge = fd.get('charge') === 'true';
    try { await rpc('admin_set_extra_visit_cancellation_v1', { p_request_id: String(form.dataset.requestId || ''), p_charge: charge, p_note: String(fd.get('note') || '') }); closeModal(); toast(charge ? 'Taxa de R$ 160,00 registrada.' : 'Isenção registrada.'); await renderAdmin(); }
    catch (error) { setModalError(errorText(error)); }
    return;
  }
  if (form.id === 'extra-visit-client-counter') {
    event.preventDefault(); const fd = new FormData(form); const date1 = String(fd.get('date1') || ''), time1 = String(fd.get('time1') || ''), date2 = String(fd.get('date2') || ''), time2 = String(fd.get('time2') || '');
    if (!date1 || !time1 || !date2 || !time2) { setModalError('Informe duas opções completas.'); return; }
    try { await rpc('client_counter_extra_visit_v1', { p_request_id: String(form.dataset.requestId || ''), p_slots: [makeSlot(date1,time1,240),makeSlot(date2,time2,240)], p_note: String(fd.get('note') || '') }); closeModal(); toast('Novas opções enviadas. Vai dar certo 🙂'); await renderClient(); }
    catch (error) { setModalError(errorText(error)); } return;
  }
  if (form.id === 'scheduling-client-form') {
    event.preventDefault(); if (!clientContext) return;
    const fd = new FormData(form), mode = String(fd.get('mode') || 'remote'), duration = Number(fd.get('duration') || 60), date1 = String(fd.get('date1') || ''), time1 = String(fd.get('time1') || ''), date2 = String(fd.get('date2') || ''), time2 = String(fd.get('time2') || '');
    if (!date1 || !time1 || (mode === 'in_person' && (!date2 || !time2))) { setModalError(mode === 'in_person' ? 'Informe duas opções de data e horário para a visita presencial.' : 'Informe ao menos uma opção de data e horário.'); return; }
    const slots = [makeSlot(date1, time1, duration)]; if (date2 && time2) slots.push(makeSlot(date2, time2, duration));
    const ack = Boolean((form.elements.namedItem('billingAck') as HTMLInputElement | null)?.checked);
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]'); if (submit) submit.disabled = true;
    try { await rpc('create_scheduling_request_v1', { p_mode: mode, p_title: String(fd.get('title') || ''), p_purpose: String(fd.get('purpose') || ''), p_location: String(fd.get('location') || ''), p_requested_slots: slots, p_billing_acknowledged: ack }); closeModal(); toast('Solicitação enviada para análise da CALI.'); await renderClient(); } catch (error) { setModalError(errorText(error)); if (submit) submit.disabled = false; }
    return;
  }
  if (form.id === 'scheduling-admin-counter-form') {
    event.preventDefault(); const fd = new FormData(form), duration = Number(fd.get('duration') || 60), date1 = String(fd.get('date1') || ''), time1 = String(fd.get('time1') || ''), date2 = String(fd.get('date2') || ''), time2 = String(fd.get('time2') || ''); if (!date1 || !time1) { setModalError('Informe ao menos um horário.'); return; }
    const slots = [makeSlot(date1, time1, duration)]; if (date2 && time2) slots.push(makeSlot(date2, time2, duration));
    const counterRequest = requestAdmin(String(form.dataset.requestId || '')); if (counterRequest?.extra_visit && (duration !== 240 || slots.length !== 2)) { setModalError('Envie duas opções de 4 horas para a visita extra.'); return; }
    try { await rpc('admin_respond_scheduling_request_v1', { p_request_id: String(form.dataset.requestId || ''), p_proposed_slots: slots, p_note: String(fd.get('note') || ''), p_decline: false }); closeModal(); toast('Novos horários enviados ao cliente.'); await renderAdmin(); } catch (error) { setModalError(errorText(error)); }
    return;
  }
  if (form.id === 'scheduling-admin-decline-form') {
    event.preventDefault(); const fd = new FormData(form); try { await rpc('admin_respond_scheduling_request_v1', { p_request_id: String(form.dataset.requestId || ''), p_proposed_slots: [], p_note: String(fd.get('note') || ''), p_decline: true }); closeModal(); toast('Resposta registrada.'); await renderAdmin(); } catch (error) { setModalError(errorText(error)); } return;
  }
  if (form.id === 'scheduling-admin-outcome-form') {
    event.preventDefault(); const fd = new FormData(form), reason = String(fd.get('reason') || ''), justified = String(fd.get('justified') || 'false') === 'true', note = String(fd.get('note') || ''), convert = Boolean(fd.get('convertVirtual')); if (!reason || note.trim().length < 3) { setModalError('Selecione o motivo e registre uma justificativa breve.'); return; }
    try { const result = await rpc('admin_mark_scheduling_event_outcome_v1', { p_event_id: String(form.dataset.eventId || ''), p_outcome: 'not_occurred', p_reason_category: reason, p_justified: justified, p_note: note, p_convert_to_virtual: convert }); closeModal(); toast(result?.replacement_allowed ? 'Não ocorrência registrada. A solicitação voltou para análise de agenda.' : 'Não ocorrência registrada no histórico.'); await renderAdmin(); } catch (error) { setModalError(errorText(error)); } return;
  }
  if (form.id === 'scheduling-contract-form') {
    event.preventDefault(); if (!supabase) return; const fd = new FormData(form), companyId = String(fd.get('companyId') || ''), count = Math.max(0, Math.min(12, Number(fd.get('count') || 0))); const { error } = await supabase.from('companies').update({ onsite_visits_included_per_month: count }).eq('id', companyId); if (error) { setModalError(error.message); return; } closeModal(); toast('Regra de visitas do contrato atualizada.'); await renderAdmin(); return;
  }
}
function handleChange(event: Event) {
  const target = event.target as HTMLInputElement | HTMLSelectElement | null; if (!target) return;
  if (target.closest('#scheduling-client-form') && ['mode', 'date1'].includes(target.name)) updateClientFormPolicy();
  if (target.closest('#scheduling-contract-form') && target.name === 'companyId' && adminContext) { const company = adminContext.companies.find((item) => item.id === target.value); const count = modal?.querySelector<HTMLInputElement>('input[name="count"]'); if (count) count.value = String(Number(company?.onsite_visits_included_per_month || 0)); }
  if (target.closest('#scheduling-admin-outcome-form') && target.name === 'reason') { const wrap = modal?.querySelector<HTMLElement>('[data-scheduling-convert-wrap]'); if (wrap) wrap.hidden = target.value !== 'travel_vacation'; }
}

function ensureHosts() {
  if (window.location.pathname !== '/admin/calendario') { closeAdminDrawer(); document.getElementById('scheduling-v65-admin-float')?.remove(); document.getElementById('scheduling-v65-admin-drawer')?.remove(); document.getElementById('scheduling-v65-admin-drawer-backdrop')?.remove(); }
  if (window.location.pathname === '/cliente/cronograma') { void renderClient(); return; }
  if (window.location.pathname === '/admin/calendario') { void renderAdmin(); return; }
}
function scheduleHosts() { if (!isWorkspaceRoute('/admin/calendario', '/cliente/cronograma') && !document.getElementById('scheduling-v65-admin-float')) return; window.clearTimeout(renderTimer); renderTimer = window.setTimeout(() => { const clientMissing = window.location.pathname === '/cliente/cronograma' && !document.getElementById('scheduling-v65-client-host'); const adminMissing = window.location.pathname === '/admin/calendario' && !document.getElementById('scheduling-v65-admin-host'); if (clientMissing || adminMissing) ensureHosts(); }, 180); }
function installRealtime() {
  if (!supabase || realtime) return;
  realtime = supabase.channel('scheduling-requests-v65').on('postgres_changes', { event: '*', schema: 'cali_workspace', table: 'scheduling_requests' }, () => { void refreshCurrent(); }).subscribe();
}

export function installSchedulingRequestsRuntimeV65() {
  if (installed) return; installed = true; ensureStyle();
  document.addEventListener('click', (event) => void handleClick(event as MouseEvent), true);
  document.addEventListener('submit', (event) => void handleSubmit(event as SubmitEvent), true);
  document.addEventListener('change', handleChange, true);
  observer = new MutationObserver(scheduleHosts); observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', () => window.setTimeout(ensureHosts, 80));
  installRealtime(); window.setTimeout(ensureHosts, 120);
}
