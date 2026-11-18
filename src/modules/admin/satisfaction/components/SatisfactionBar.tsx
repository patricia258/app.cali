const barTones = {
  red: 'tw:bg-cali-danger',
  yellow: 'tw:bg-cali-orange-line',
  blue: 'tw:bg-cali-blue-accent',
  green: 'tw:bg-cali-teal-accent',
  gold: 'tw:bg-cali-gold',
  brand: 'tw:bg-cali-brand',
} as const;

export type SatisfactionTone = keyof typeof barTones;

export function SatisfactionBar({ percent, tone = 'brand', className }: { percent: number; tone?: SatisfactionTone; className?: string }) {
  return (
    <div aria-hidden="true" className={`tw:h-2.5 tw:overflow-hidden tw:rounded-md tw:bg-cali-surface-muted ${className ?? ''}`}>
      <span className={`tw:block tw:h-full tw:rounded-md ${barTones[tone]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
