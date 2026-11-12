import { useEffect, useRef, useState } from 'react';
import { FileCheck2, Link2, ShieldCheck, UsersRound } from 'lucide-react';
import {
  issueCompanyPreRegistration,
  readCompanyOnboarding,
  releaseCompanyAccess,
  setCompanySupportPartner,
  type CompanyOnboarding,
} from '../../../../api/admin/companies/onboarding';
import type { PreRegistrationFields } from '../../../../api/public/pre-registration';
import './company-onboarding-panel.css';

type Props = {
  companyId: string;
  isActive: boolean;
  onApplyPreRegistration: (fields: PreRegistrationFields) => void;
  onAccessChanged: () => Promise<void>;
  onUploadContract: (file: File, date: string) => Promise<void>;
};

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
});

export function CompanyOnboardingPanel({ companyId, isActive, onApplyPreRegistration, onAccessChanged, onUploadContract }: Props) {
  const [data, setData] = useState<CompanyOnboarding>();
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [contractFile, setContractFile] = useState<File>();
  const [contractDate, setContractDate] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const issuingToken = useRef<string | null>(null);
  const releaseRequest = useRef<{ key: string; id: string }>();
  const writing = useRef(false);

  function apply(next: CompanyOnboarding) {
    setData(next);
    setPartnerId(next.supportPartnerId ?? '');
  }

  useEffect(() => {
    const request = new AbortController();
    void readCompanyOnboarding(companyId, request.signal).then(
      (next) => { if (!request.signal.aborted) apply(next); },
      (reason: Error) => { if (!request.signal.aborted) setError(reason.message); },
    ).finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => request.abort();
  }, [companyId, retry]);

  async function run(action: () => Promise<void>) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await action();
      apply(await readCompanyOnboarding(companyId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível concluir a operação.');
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  function issueLink() {
    void run(async () => {
      const token = issuingToken.current ?? crypto.randomUUID();
      issuingToken.current = token;
      await issueCompanyPreRegistration(companyId, token);
      issuingToken.current = null;
      setLink(new URL(`/pre-cadastro/${token}`, window.location.origin).href);
      setStatus('Link gerado.');
    });
  }

  function confirmRelease() {
    if (!data?.contract?.available || !confirmed) return;
    const { contract, reviewVersion } = data;
    void run(async () => {
      const key = `${contract.id}:${contract.version}:${reviewVersion}`;
      if (releaseRequest.current?.key !== key) releaseRequest.current = { key, id: crypto.randomUUID() };
      const receipt = await releaseCompanyAccess(companyId, releaseRequest.current.id, contract, reviewVersion, confirmed);
      setConfirmed(false);
      setStatus(`${receipt.accessCount} acesso(s) liberado(s).`);
      await onAccessChanged();
    });
  }

  function uploadContract() {
    if (!contractFile) return;
    void run(async () => {
      await onUploadContract(contractFile, contractDate);
      setContractFile(undefined);
      setFileInputKey((key) => key + 1);
      setConfirmed(false);
      setStatus('Contrato anexado. Confira a assinatura antes de liberar os acessos.');
    });
  }

  function reload() {
    setError('');
    setConfirmed(false);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  if (loading) return <section className="account-tab-pane"><p role="status">Carregando acessos…</p></section>;
  if (!data) return <section className="account-tab-pane">
    <p role="alert">{error || 'Não foi possível carregar os acessos.'}</p>
    <button className="ap-outline" type="button" onClick={reload}>Tentar novamente</button>
  </section>;

  const { registration, contract, partners, supportPartnerId, pendingAccesses, activeAccesses } = data;

  return <section className="account-tab-pane company-onboarding-panel" aria-label="Acessos e responsáveis">
    <section>
      <div className="account-pane-heading"><UsersRound size={18} /><div><strong>Responsáveis</strong><span>Exibidos no Início do Cliente.</span></div></div>
      <p>Responsável CALI · Patrícia Lima</p>
      <label className="stacked-label">Partner de apoio
        <select value={partnerId} onChange={(event) => setPartnerId(event.target.value)} disabled={busy}>
          <option value="">Sem Partner de apoio</option>
          {supportPartnerId && !partners.some((partner) => partner.id === supportPartnerId) &&
            <option value={supportPartnerId} disabled>Partner indisponível</option>}
          {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
        </select>
      </label>
      <button className="ap-outline" type="button" disabled={busy || partnerId === (supportPartnerId ?? '')}
        onClick={() => void run(async () => {
          await setCompanySupportPartner(companyId, partnerId || null);
          setStatus('Responsáveis atualizados.');
        })}>Salvar responsáveis</button>
    </section>

    <section>
      <div className="account-pane-heading"><Link2 size={18} /><div><strong>Pré-cadastro</strong><span>O link fica disponível por sete dias.</span></div></div>
      {registration?.submittedAt ? <>
        <p>Dados recebidos em {dateTime.format(new Date(registration.submittedAt))}.</p>
        <button className="ap-outline" type="button" disabled={busy || !registration.fields}
          onClick={() => { if (registration.fields) onApplyPreRegistration(registration.fields); }}>Usar dados na ficha</button>
      </> : <>
        {registration && <p>Validade do link · {dateTime.format(new Date(registration.expiresAt))}.</p>}
        <button className="ap-outline" type="button" disabled={busy || !isActive} onClick={issueLink}>
          {registration ? 'Gerar novo link' : 'Gerar link de pré-cadastro'}
        </button>
        {registration && <small>Ao gerar outro link, o anterior perde a validade.</small>}
        {link && <div className="company-onboarding-link">
          <label className="stacked-label">Link para a empresa<input value={link} readOnly onFocus={(event) => event.currentTarget.select()} /></label>
          <button className="ap-outline" type="button" onClick={() => {
            void navigator.clipboard.writeText(link).then(
              () => setStatus('Link copiado.'),
              () => setError('Selecione o endereço para copiar o link.'),
            );
          }}>Copiar</button>
        </div>}
      </>}
    </section>

    <section>
      <div className="account-pane-heading"><FileCheck2 size={18} /><div><strong>Contrato assinado</strong><span>Anexe a versão vigente assinada pela empresa.</span></div></div>
      {contract && <p>{contract.title}{contract.date ? ` · ${contract.date.split('-').reverse().join('/')}` : ''}{!contract.available && ' · arquivo indisponível'}</p>}
      <div className="company-onboarding-link">
        <label className="stacked-label">Arquivo do contrato
          <input key={fileInputKey} type="file" accept=".pdf,.doc,.docx,image/*" disabled={busy}
            onChange={(event) => setContractFile(event.target.files?.[0])} />
        </label>
        <label className="stacked-label">Data do contrato<input type="date" value={contractDate} disabled={busy}
          onChange={(event) => setContractDate(event.target.value)} /></label>
      </div>
      <button className="ap-outline" type="button" disabled={busy || !contractFile} onClick={uploadContract}>Anexar contrato</button>
    </section>

    <section>
      <div className="account-pane-heading"><ShieldCheck size={18} /><div><strong>Liberar acessos</strong><span>Salve os dados obrigatórios e os contatos da ficha antes da liberação.</span></div></div>
      <p>{activeAccesses} liberado(s) · {pendingAccesses} aguardando liberação.</p>
      {pendingAccesses > 0 && <ul>{data.pendingContacts.map((person) => <li key={person.id}>{person.name} · {person.email}</li>)}</ul>}
      <label className="check-line">
        <input type="checkbox" checked={confirmed} disabled={busy || !contract?.available}
          onChange={(event) => setConfirmed(event.target.checked)} />
        Confirmo que o contrato vinculado está assinado e que a empresa aderiu ao Workspace.
      </label>
      <button className="ap-primary" type="button" disabled={busy || !isActive || !pendingAccesses || !confirmed}
        onClick={confirmRelease}>Liberar acessos</button>
      {data.releasedAt && <small>Última liberação · {dateTime.format(new Date(data.releasedAt))}.</small>}
    </section>
    {status && <p role="status">{status}</p>}
    {error && <div>
      <p role="alert">{error}</p>
      <button className="ap-outline" type="button" disabled={busy} onClick={reload}>Atualizar dados da ficha</button>
    </div>}
  </section>;
}
