import { ChevronRight } from 'lucide-react';

export function DocumentFolderAction({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="tw:mt-4.5 tw:inline-flex tw:h-12.5 tw:w-full tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:text-cali-body tw:font-bold tw:text-cali-brand"
      onClick={onClick}
    >
      Abrir pasta <ChevronRight size={14} aria-hidden="true" />
    </button>
  );
}
