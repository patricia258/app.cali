import { forwardRef, useEffect, useId, useRef, useState, type ComponentPropsWithoutRef, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { MentionCandidate } from '../../api/workspace/mentions';
import { useMentionCandidates } from './hooks/useMentionCandidates';

type Props = Omit<ComponentPropsWithoutRef<'textarea'>, 'value' | 'defaultValue'> & {
  value: string;
  onValueChange: (value: string) => void;
};
type Mention = { start: number; end: number; query: string; left: number; top: number; bottom: number };

const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(function MentionTextarea(
  { value, onValueChange, onChange, onBlur, onKeyDown, ...props }, forwarded,
) {
  const listId = useId();
  const field = useRef<HTMLTextAreaElement | null>(null);
  const selection = useRef<number | null>(null);
  const [mention, setMention] = useState<Mention | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const people = useMentionCandidates(Boolean(mention));
  const prefix = (person: MentionCandidate) => normalize(person.full_name).split(/\s+/).some((word) => word.startsWith(mention?.query ?? ''));
  const matches = mention ? (people.data ?? []).filter((person) => normalize(person.full_name).includes(mention.query))
    .sort((first, second) => Number(prefix(second)) - Number(prefix(first))).slice(0, 6) : [];
  const current = Math.min(activeIndex, Math.max(0, matches.length - 1));
  const open = Boolean(mention && matches.length);

  useEffect(() => {
    if (selection.current === null) return;
    field.current?.focus();
    field.current?.setSelectionRange(selection.current, selection.current);
    selection.current = null;
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const close = () => setMention(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function choose(person: MentionCandidate) {
    if (!mention) return;
    const token = `@${person.full_name} `;
    selection.current = mention.start + token.length;
    onValueChange(value.slice(0, mention.start) + token + value.slice(mention.end));
    setMention(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || event.nativeEvent.isComposing || !['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
      onKeyDown?.(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') setMention(null);
    else if (event.key === 'ArrowDown') setActiveIndex((current + 1) % matches.length);
    else if (event.key === 'ArrowUp') setActiveIndex((current - 1 + matches.length) % matches.length);
    else choose(matches[current]);
  }

  const estimatedHeight = matches.length * 44 + 12;
  const popup = open && mention && createPortal(
    <div id={listId} role="listbox" aria-label="Mencionar uma pessoa"
      className="tw:fixed tw:z-[2147483000] tw:max-h-[17.25rem] tw:w-[17.5rem] tw:max-w-[calc(100vw-1.5rem)] tw:overflow-y-auto tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:p-1.5 tw:font-cali-body tw:shadow-[0_.875rem_2.125rem_#2b181e2e] tw:[scrollbar-width:none]"
      style={{ left: mention.left, top: mention.top > estimatedHeight + 16 ? mention.top - estimatedHeight - 6 : mention.bottom + 6 }}>
      {matches.map((person, index) => <button key={person.id} id={`${listId}-${person.id}`} type="button" role="option" tabIndex={-1} aria-selected={index === current}
        onPointerDown={(event) => event.preventDefault()} onClick={() => choose(person)}
        className="tw:flex tw:min-h-11 tw:w-full tw:cursor-pointer tw:flex-col tw:items-start tw:gap-px tw:rounded-lg tw:border-0 tw:bg-transparent tw:px-2.5 tw:py-1.5 tw:text-left tw:hover:bg-(--theme-accent-soft) tw:aria-selected:bg-(--theme-accent-soft)">
        <strong className="tw:text-sm tw:text-cali-text">{person.full_name}</strong>
        <small className="tw:text-xs tw:text-cali-muted">{person.label}</small>
      </button>)}
    </div>, document.body,
  );

  return <>
    <textarea {...props} ref={(element) => {
      field.current = element;
      if (typeof forwarded === 'function') forwarded(element);
      else if (forwarded) forwarded.current = element;
    }} value={value} aria-autocomplete="list" aria-controls={open ? listId : undefined}
      aria-activedescendant={open ? `${listId}-${matches[current].id}` : undefined}
      onKeyDown={handleKeyDown} onBlur={(event) => { setMention(null); onBlur?.(event); }}
      onChange={(event) => {
        const { currentTarget } = event;
        const end = currentTarget.selectionStart;
        const match = /(^|\s)@([^\s@][^@\n]{0,30})?$/.exec(currentTarget.value.slice(0, end));
        if (match) {
          const { left, top, bottom } = currentTarget.getBoundingClientRect();
          const query = match[2] ?? '';
          setMention({ start: end - query.length - 1, end, query: normalize(query), left: Math.max(12, Math.min(left, window.innerWidth - 292)), top, bottom });
          setActiveIndex(0);
        } else setMention(null);
        onValueChange(currentTarget.value);
        onChange?.(event);
      }} />
    {popup}
  </>;
});
