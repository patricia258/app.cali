import { useRef, useState } from 'react';
import { caliWorkstreams } from '../../../domain/projects';

export function normalizeFrontName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}

type Props = {
  name: string;
  taken: string[];
  onChange: (value: string) => void;
  draft?: boolean;
  inputClassName?: string;
};

export function FrontCatalogField({ name, taken, onChange, draft = false, inputClassName }: Props) {
  const normalized = normalizeFrontName(name);
  const known = caliWorkstreams.find((item) => item !== 'Outro' && normalizeFrontName(item) === normalized);
  const [custom, setCustom] = useState(Boolean(name) && !known);
  const customInput = useRef<HTMLInputElement | null>(null);
  const takenNames = taken.map(normalizeFrontName);
  const duplicate = Boolean(normalized) && takenNames.includes(normalized);
  const catalogClasses = draft
    ? 'tw:h-[3.5385rem] tw:min-w-[17.3077rem] tw:rounded-[.6154rem] tw:pl-[.7692rem] tw:pr-[2.4615rem] tw:[@media(max-width:900px)]:min-w-[13.8462rem]'
    : 'tw:h-[3.5385rem] tw:w-full tw:rounded-[.7692rem] tw:pl-[.9231rem] tw:pr-[2.6154rem]';
  const select = <select
    className={`${catalogClasses} tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:text-[.9231rem] tw:text-cali-text`}
    aria-label="Frente CALI"
    value={custom ? 'Outro' : known ?? ''}
    onChange={(event) => {
      const next = event.target.value;
      setCustom(next === 'Outro');
      onChange(next === 'Outro' ? '' : next);
    }}
  >
    <option value="">Selecionar frente</option>
    {caliWorkstreams.map((item) => <option key={item} disabled={item !== 'Outro' && item !== known && takenNames.includes(normalizeFrontName(item))}>{item}</option>)}
  </select>;
  const input = custom && <input
    ref={(node) => {
      if (node && node !== customInput.current) node.focus();
      customInput.current = node;
    }}
    aria-label="Nome da nova frente"
    aria-invalid={duplicate || undefined}
    className={draft ? `tw:min-w-[16.1538rem] ${inputClassName ?? ''}` : undefined}
    value={name}
    onChange={(event) => onChange(event.target.value)}
    placeholder="Nome da nova frente"
  />;
  const warning = duplicate && <small role="alert" className="tw:mt-[.3077rem] tw:block tw:text-[.6923rem] tw:text-[#9c334d]">Essa frente já foi adicionada neste cronograma.</small>;

  return <>{select}{input}{warning}</>;
}
