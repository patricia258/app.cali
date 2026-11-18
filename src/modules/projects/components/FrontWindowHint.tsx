export function FrontWindowHint({ initial }: { initial?: boolean }) {
  return <div className={`tw:flex tw:items-start tw:gap-3 tw:rounded-[.8462rem] tw:border tw:border-solid tw:border-[color-mix(in_srgb,var(--cali-color-gold)_33%,var(--theme-line))] tw:bg-[color-mix(in_srgb,var(--cali-color-gold)_7%,var(--theme-surface))] tw:px-3.5 tw:py-3 ${initial ? 'tw:mt-2.5 tw:mb-3.5' : 'tw:mt-3'}`}>
    <strong className="tw:text-cali-detail tw:whitespace-nowrap tw:text-cali-gold-text">{initial ? 'Janela do cronograma' : 'Quando essa frente acontece?'}</strong>
    <span className="tw:text-xs tw:leading-[1.45] tw:text-cali-muted">{initial
      ? 'Você não precisa definir M1–M8 agora. A faixa de cada frente passa a ser formada pelos entregáveis que forem adicionados.'
      : 'A janela será calculada pelos entregáveis vinculados. Você não precisa escolher os meses antes de saber o volume real.'}</span>
  </div>;
}
