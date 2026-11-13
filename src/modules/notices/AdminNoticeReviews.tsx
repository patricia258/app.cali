import {
  NoticeButton,
  NoticeComposeFields,
  NoticeDialog,
  NoticeDialogBody,
  NoticeDialogFooter,
} from './components/NoticeDialog';
import { Button } from '../../components/ds/Button';
import { useEffect, useState, type FormEvent } from 'react';
import { readPendingNoticeReviews, decideNoticeReview, type NoticeReview } from '../../api/notices/reviews';
import { noticeReviewStyles } from './notice-review';

export function AdminNoticeReviews({
  companies,
  onPublish,
}: {
  companies: { id: string; name: string }[];
  onPublish: () => Promise<void>;
}) {
  const [rows, setRows] = useState<NoticeReview[]>([]);
  const [selected, setSelected] = useState<NoticeReview | null>(null);
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      setRows(await readPendingNoticeReviews());
    } catch {
      setError('Não foi possível carregar a fila de revisão.');
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function decide(event: FormEvent) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      await decideNoticeReview(selected, !returning, note);
      setSelected(null);
      await load();
      if (!returning) await onPublish();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível registrar a decisão.');
    } finally {
      setBusy(false);
    }
  }

  const nameOf = (id: string) => companies.find((company) => company.id === id)?.name ?? 'Empresa indisponível';

  return (
    <section className={noticeReviewStyles.panel}>
      <h2 className={noticeReviewStyles.heading}>Avisos para revisar</h2>
      {error && !selected && (
        <p role="alert">
          {error}{' '}
          <button
            type="button"
            onClick={() => {
              setError('');
              void load();
            }}
          >
            Atualizar fila
          </button>
        </p>
      )}
      {rows.length > 0 ? (
        <ul className={noticeReviewStyles.list}>
          {rows.map((row) => (
            <li className={noticeReviewStyles.item} key={row.id}>
              <strong>{row.title}</strong>
              <span>{row.company_ids.map(nameOf).join(', ')}</span>
              <Button
                variant="workflowSecondary"
                type="button"
                onClick={() => {
                  setReturning(false);
                  setNote('');
                  setError('');
                  setSelected(row);
                }}
              >
                Revisar comunicado
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum aviso aguardando revisão.</p>
      )}
      {selected && (
        <NoticeDialog mode="compose" title="Revisar comunicado" onSubmit={decide}>
          <NoticeDialogBody mode="compose">
            <h2>{selected.title}</h2>
            <p>{selected.company_ids.map(nameOf).join(', ')}</p>
            <p className="tw:whitespace-pre-wrap">{selected.body}</p>
            {returning && (
              <NoticeComposeFields>
                <label>
                  Ajuste solicitado
                  <textarea
                    required
                    minLength={3}
                    maxLength={2000}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
              </NoticeComposeFields>
            )}
            {error && <p role="alert">{error}</p>}
          </NoticeDialogBody>
          <NoticeDialogFooter mode="compose">
            <NoticeButton disabled={busy} onClick={() => setSelected(null)}>
              Fechar
            </NoticeButton>
            {!returning && (
              <NoticeButton disabled={busy} onClick={() => setReturning(true)}>
                Pedir ajuste
              </NoticeButton>
            )}
            <NoticeButton
              appearance="primary"
              type="submit"
              disabled={busy || (returning && note.trim().length < 3)}
            >
              {returning ? 'Devolver para ajuste' : 'Aprovar e publicar'}
            </NoticeButton>
          </NoticeDialogFooter>
        </NoticeDialog>
      )}
    </section>
  );
}
