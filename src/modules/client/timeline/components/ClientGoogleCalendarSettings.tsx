import { CalendarDays } from 'lucide-react';
import { ClientGoogleCalendarPanel } from './ClientGoogleCalendarPanel';

export function ClientGoogleCalendarSettings() {
  return (
    <details className="tw:group/google tw:mb-[0.923rem] tw:rounded-lg tw:border tw:border-solid tw:border-[#e9e0d8] tw:bg-[#fffdfb] tw:workspace-night:border-cali-line tw:workspace-night:bg-cali-surface">
      <summary className="tw:flex tw:min-h-[5.846rem] tw:w-full tw:cursor-pointer tw:group-open/google:min-h-[3.692rem] tw:list-none tw:items-center tw:gap-[0.769rem] tw:rounded-lg tw:border tw:border-solid tw:border-[color-mix(in_srgb,var(--theme-gold)_45%,var(--theme-line))] tw:bg-[color-mix(in_srgb,var(--theme-gold)_7%,var(--theme-surface))] tw:px-[1.077rem] tw:py-[0.769rem] tw:text-left tw:text-[0.769rem] tw:text-[#77716c] tw:[&::-webkit-details-marker]:hidden tw:max-[40.625rem]:flex-wrap tw:max-[40.625rem]:items-start">
        <CalendarDays size={15} aria-hidden="true" className="tw:shrink-0 tw:text-[#a38571]" />
        <span className="tw:flex tw:min-w-0 tw:flex-1 tw:items-baseline tw:gap-[0.615rem]">
          <strong className="tw:text-[0.846rem] tw:text-[#3e3533] tw:workspace-night:text-cali-text">Integração com Google Agenda</strong>
          <small className="tw:text-[0.769rem]/[1.45] tw:font-medium tw:text-cali-muted tw:group-open/google:hidden">Veja seus eventos pessoais junto aos compromissos da CALI. Você escolhe o que exibir pelo filtro da agenda.</small>
        </span>
        <span className="tw:text-[0.846rem] tw:font-bold tw:whitespace-nowrap tw:text-cali-brand tw:max-[40.625rem]:ml-[2.538rem] tw:workspace-night:text-cali-accent">Ver integração</span>
      </summary>
      <ClientGoogleCalendarPanel />
    </details>
  );
}
