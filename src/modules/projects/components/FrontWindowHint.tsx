export function FrontWindowHint({ initial }: { initial?: boolean }) {
  return <div className={`tw:flex tw:items-start tw:gap-[.6923rem] tw:rounded-[.8462rem] tw:border tw:border-solid tw:border-[color-mix(in_srgb,var(--cali-color-gold)_33%,var(--theme-line))] tw:bg-[color-mix(in_srgb,var(--cali-color-gold)_7%,var(--theme-surface))] tw:px-[.9231rem] tw:py-[.7692rem] ${initial ? 'tw:mt-[.6154rem] tw:mb-[.9231rem]' : 'tw:mt-[.7692rem]'}`}>
    <strong className="tw:text-[.8077rem] tw:whitespace-nowrap tw:text-[#7f6337]">{initial ? 'Janela do cronograma' : 'Quando essa frente acontece?'}</strong>
    <span className="tw:text-[.7692rem] tw:leading-[1.45] tw:text-cali-muted">{initial
      ? 'Você não precisa definir M1–M8 agora. A faixa de cada frente passa a ser formada pelos entregáveis que forem adicionados.'
      : 'A janela será calculada pelos entregáveis vinculados. Você não precisa escolher os meses antes de saber o volume real.'}</span>
  </div>;
}
