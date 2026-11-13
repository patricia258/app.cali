import { ChevronRight } from 'lucide-react';

export function DocumentFolderAction({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="tw:mt-[1.077rem] tw:inline-flex tw:h-[3.077rem] tw:w-full tw:cursor-pointer tw:items-center tw:justify-center tw:gap-[.462rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:text-[.962rem] tw:font-bold tw:text-cali-brand"
      onClick={onClick}
    >
      Abrir pasta <ChevronRight size={14} aria-hidden="true" />
    </button>
  );
}
