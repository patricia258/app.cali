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
  return <section className="v2-privacy-panel" aria-label="Pedidos de privacidade">
    <header><ShieldCheck size={18} /><div><h2>Pedidos de privacidade (LGPD)</h2><p>{open.length ? `${open.length} em aberto. A LGPD pede resposta rápida; o prazo indicado aqui é de 15 dias.` : 'Nenhum pedido em aberto.'}</p></div></header>
    {feedback && (feedback.error
      ? <p className="tw:mt-2 tw:text-cali-caption tw:font-bold tw:text-cali-danger" role="alert">{feedback.text}</p>
      : <p className="v2-privacy-message" role="status">{feedback.text}</p>)}
    <ul>{rows.map((row) => { const late = row.status === 'open' && deadline(row.created_at) < new Date(); return <li key={row.id} className={row.status === 'open' ? (late ? 'late' : 'open') : 'done'}>
      <div className="v2-privacy-head"><strong>{KIND[row.kind] || row.kind} · {names[row.user_id] || 'Usuário'}</strong><span>{row.company_id ? companies[row.company_id] || '' : 'CALI'} · pedido em {day(row.created_at)}{row.status === 'open' ? ` · responder até ${deadline(row.created_at).toLocaleDateString('pt-BR')}` : ` · respondido em ${row.resolved_at ? day(row.resolved_at) : '—'}`}</span></div>
      <p>{row.details}</p>
      {row.answer && <p className="v2-privacy-answer"><b>Resposta:</b> {row.answer}</p>}
      {row.status === 'open' && (answering?.id === row.id
        ? <div className="v2-privacy-form">
          <label htmlFor={`privacy-answer-${row.id}`} className="tw:text-cali-caption tw:font-semibold tw:text-cali-text">Resposta ao pedido</label>
          <textarea id={`privacy-answer-${row.id}`} rows={3} maxLength={4000} value={answering.text} autoFocus
            onChange={(event) => setAnswering({ id: row.id, text: event.target.value })}
            placeholder="Escreva a resposta que a pessoa vai receber." />
          <span>
            <button type="button" disabled={busy} onClick={() => { replyFocus.current = row.id; setAnswering(null); setFeedback(null); }}>Cancelar</button>
            <Button type="button" variant="primary" disabled={busy || answering.text.trim().length < 5} onClick={() => void answer()}>{busy ? 'Enviando…' : 'Enviar resposta'}</Button>
          </span>
        </div>
        : <button type="button" className="v2-privacy-reply" disabled={busy}
          ref={(button) => {
            if (button && replyFocus.current === row.id) { replyFocus.current = null; button.focus({ preventScroll: true }); }
          }} onClick={() => { setFeedback(null); setAnswering({ id: row.id, text: '' }); }}>Responder</button>)}
    </li>; })}</ul>
  </section>;
}
