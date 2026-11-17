import { Input } from '../../../components/ds/Input';
import { Select } from '../../../components/ds/Select';
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
};

export function FrontCatalogField({ name, taken, onChange, draft = false }: Props) {
  const normalized = normalizeFrontName(name);
  const known = caliWorkstreams.find((item) => item !== 'Outro' && normalizeFrontName(item) === normalized);
  const [custom, setCustom] = useState(Boolean(name) && !known);
  const customInput = useRef<HTMLInputElement | null>(null);
  const takenNames = taken.map(normalizeFrontName);
  const duplicate = Boolean(normalized) && takenNames.includes(normalized);
  const select = <Select
    className={draft ? 'tw:max-w-full tw:flex-[1_1_17rem]' : 'tw:w-full'}
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
  </Select>;
  const input = custom && <Input
    ref={(node) => {
      if (node && node !== customInput.current) node.focus();
      customInput.current = node;
    }}
    aria-label="Nome da nova frente"
    aria-invalid={duplicate || undefined}
    value={name}
    onChange={(event) => onChange(event.target.value)}
    placeholder="Nome da nova frente"
  />;
  const warning = duplicate && <small role="alert" className="tw:mt-1 tw:block tw:text-cali-label tw:text-cali-red-accent">Essa frente já foi adicionada neste cronograma.</small>;

  return <>{select}{input}{warning}</>;
}
