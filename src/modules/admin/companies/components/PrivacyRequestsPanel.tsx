/* Pedidos de privacidade (LGPD, art. 18) feitos pelos usuários no perfil. A administradora vê o prazo e registra a resposta;
   quem pediu recebe a resposta no sino e por e-mail. A exclusão ou correção em si continua sendo feita caso a caso. */
import { Button } from '../../../../components/ds/Button';
import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { addDays } from 'date-fns';
import { answerPrivacyRequest, readPrivacyRequests, type PrivacyRequest } from '../../../../api/admin/companies/privacy';

const KIND: Record<string, string> = { access: 'Acesso aos dados', correction: 'Correção', deletion: 'Exclusão', other: 'Outro pedido' };
const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const deadline = (iso: string) => addDays(new Date(iso), 15);

export function PrivacyRequestsPanel() {
  const [rows, setRows] = useState<PrivacyRequest[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const replyFocus = useRef<string | null>(null);

  async function load(signal?: AbortSignal) {
    const result = await readPrivacyRequests(signal).catch(() => null);
    if (!result || signal?.aborted) return;
    setRows(result.rows);
    setNames(result.names);
    setCompanies(result.companies);
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  async function answer() {
    if (!answering || busy || answering.text.trim().length < 5) return;
    setBusy(true);
    setFeedback(null);
    try {
      const answerText = answering.text.trim();
      await answerPrivacyRequest(answering.id, answerText);
      setRows((current) => current.map((row) => row.id === answering.id
        ? { ...row, status: 'answered', answer: answerText }
        : row));
      setAnswering(null);
      setFeedback({ error: false, text: 'Resposta registrada. A notificação foi encaminhada para envio.' });
      await load();
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : 'Não foi possível registrar a resposta.' });
    } finally {
      setBusy(false);
    }
  }

  if (!rows.length) return null;
  const open = rows.filter((row) => row.status === 'open');

  return (
    <section aria-label="Pedidos de privacidade" className="tw:mx-0 tw:mt-0 tw:mb-5.5 tw:rounded-[0.923rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-5.5 tw:py-5">
      <header className="tw:flex tw:items-start tw:gap-3 tw:text-cali-brand">
        <ShieldCheck size={18} />
        <div>
          <h2 className="tw:m-0 tw:text-lg tw:text-cali-ink">Pedidos de privacidade (LGPD)</h2>
          <p className="tw:mx-0 tw:mt-1 tw:mb-0 tw:text-cali-body tw:text-cali-muted">
            {open.length ? `${open.length} em aberto. A LGPD pede resposta rápida; o prazo indicado aqui é de 15 dias.` : 'Nenhum pedido em aberto.'}
          </p>
        </div>
      </header>
      {feedback && (
        <p
          className={`tw:mx-0 tw:mt-3 tw:mb-0 tw:text-cali-body tw:font-bold ${feedback.error ? 'tw:text-cali-danger' : 'tw:text-cali-success'}`}
          role={feedback.error ? 'alert' : 'status'}
        >
          {feedback.text}
        </p>
      )}
      <ul className="tw:mx-0 tw:mt-3.5 tw:mb-0 tw:flex tw:list-none tw:flex-col tw:gap-3 tw:p-0">
        {rows.map((row) => {
          const isOpen = row.status === 'open';
          const respondBy = deadline(row.created_at);
          const late = isOpen && respondBy < new Date();
          return (
            <li key={row.id} className={`tw:rounded-cali-panel tw:border tw:border-l-4 tw:border-solid tw:border-cali-line tw:px-4.5 tw:py-3.5 tw:text-cali-body tw:text-cali-text
              ${late ? 'tw:border-l-cali-danger tw:bg-cali-red-surface' : isOpen ? 'tw:border-l-cali-gold tw:bg-cali-warning-surface' : 'tw:border-l-cali-sand-accent'}`}>
              <div className="tw:flex tw:flex-wrap tw:justify-between tw:gap-x-3.5 tw:gap-y-1">
                <strong>{KIND[row.kind] || row.kind} · {names[row.user_id] || 'Usuário'}</strong>
                <span className="tw:text-sm tw:text-cali-muted">
                  {row.company_id ? companies[row.company_id] || '' : 'CALI'} · pedido em {day(row.created_at)}
                  {isOpen ? ` · responder até ${respondBy.toLocaleDateString('pt-BR')}` : ` · respondido em ${row.resolved_at ? day(row.resolved_at) : '—'}`}
                </span>
              </div>
              <p className="tw:mx-0 tw:mt-2 tw:mb-0 tw:leading-normal tw:whitespace-pre-wrap">{row.details}</p>
              {row.answer && (
                <p className="tw:mx-0 tw:mt-2 tw:mb-0 tw:leading-normal tw:whitespace-pre-wrap"><b>Resposta:</b> {row.answer}</p>
              )}
              {isOpen && (answering?.id === row.id ? (
                <div className="tw:mt-3 tw:flex tw:flex-col tw:gap-2.5">
                  <label htmlFor={`privacy-answer-${row.id}`} className="tw:text-cali-caption tw:font-semibold tw:text-cali-text">Resposta ao pedido</label>
                  <textarea
                    id={`privacy-answer-${row.id}`} rows={3} maxLength={4000} value={answering.text} autoFocus
                    className="tw:box-border tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-input-line tw:px-3 tw:py-2.5 tw:font-cali-body tw:text-cali-body"
                    onChange={(event) => setAnswering({ id: row.id, text: event.target.value })}
                    placeholder="Escreva a resposta que a pessoa vai receber."
                  />
                  <span className="tw:flex tw:justify-end tw:gap-2.5">
                    <Button type="button" variant="unstyled" className="tw:mt-2.5 tw:h-10 tw:cursor-pointer tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3.5 tw:text-cali-body tw:font-bold tw:text-cali-brand"
                      disabled={busy} onClick={() => { replyFocus.current = row.id; setAnswering(null); setFeedback(null); }}>Cancelar</Button>
                    <Button type="button" variant="unstyled" className="tw:mt-2.5 tw:h-10 tw:cursor-pointer tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-3.5 tw:text-cali-body tw:font-bold tw:text-cali-neutral-surface"
                      disabled={busy || answering.text.trim().length < 5} onClick={() => void answer()}>{busy ? 'Enviando…' : 'Enviar resposta'}</Button>
                  </span>
                </div>
              ) : (
                <Button type="button" variant="unstyled"
                  className="tw:mt-2.5 tw:h-10 tw:cursor-pointer tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3.5 tw:text-cali-body tw:font-bold tw:text-cali-brand"
                  disabled={busy}
                  ref={(button) => {
                    if (button && replyFocus.current === row.id) { replyFocus.current = null; button.focus({ preventScroll: true }); }
                  }}
                  onClick={() => { setFeedback(null); setAnswering({ id: row.id, text: '' }); }}>
                  Responder
                </Button>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
