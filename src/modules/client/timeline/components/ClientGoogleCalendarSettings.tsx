import { CalendarDays } from 'lucide-react';
import { ClientGoogleCalendarPanel } from './ClientGoogleCalendarPanel';

export function ClientGoogleCalendarSettings() {
  return (
    <details className="tw:group/google tw:mb-3.5 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-paper tw:workspace-night:border-cali-line tw:workspace-night:bg-cali-surface">
      <summary className="tw:flex tw:min-h-[5.846rem] tw:w-full tw:cursor-pointer tw:group-open/google:min-h-[3.692rem] tw:list-none tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-[color-mix(in_srgb,var(--theme-gold)_45%,var(--theme-line))] tw:bg-[color-mix(in_srgb,var(--theme-gold)_7%,var(--theme-surface))] tw:px-4.5 tw:py-3 tw:text-left tw:text-xs tw:text-cali-neutral-accent tw:[&::-webkit-details-marker]:hidden tw:max-[40.625rem]:flex-wrap tw:max-[40.625rem]:items-start">
        <CalendarDays size={15} aria-hidden="true" className="tw:shrink-0 tw:text-cali-muted" />
        <span className="tw:flex tw:min-w-0 tw:flex-1 tw:items-baseline tw:gap-2.5">
          <strong className="tw:text-sm tw:text-cali-text tw:workspace-night:text-cali-text">Integração com Google Agenda</strong>
          <small className="tw:text-xs/[1.45] tw:font-medium tw:text-cali-muted tw:group-open/google:hidden">Veja seus eventos pessoais junto aos compromissos da CALI. Você escolhe o que exibir pelo filtro da agenda.</small>
        </span>
        <span className="tw:text-sm tw:font-bold tw:whitespace-nowrap tw:text-cali-brand tw:max-[40.625rem]:ml-10 tw:workspace-night:text-cali-accent">Ver integração</span>
      </summary>
      <ClientGoogleCalendarPanel />
    </details>
  );
}
