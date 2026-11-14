const barTones = {
  red: 'tw:bg-[#b7495d]',
  yellow: 'tw:bg-[#d2a851]',
  blue: 'tw:bg-[#6f93b8]',
  green: 'tw:bg-[#4c9a76]',
  gold: 'tw:bg-[#b58c52]',
  brand: 'tw:bg-cali-brand',
} as const;

export type SatisfactionTone = keyof typeof barTones;

export function SatisfactionBar({ percent, tone = 'brand', className }: { percent: number; tone?: SatisfactionTone; className?: string }) {
  return (
    <div aria-hidden="true" className={`tw:h-2.5 tw:overflow-hidden tw:rounded-md tw:bg-[#f3ece6] ${className ?? ''}`}>
      <span className={`tw:block tw:h-full tw:rounded-md ${barTones[tone]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
