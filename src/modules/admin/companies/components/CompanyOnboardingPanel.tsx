import { CompanyCheckCard, CompanyField, CompanyInput, CompanySelect } from './CompanyFormFields';
import { AccountPaneHeading } from './AccountPaneHeading';
import { Button } from '../../../../components/ds/Button';
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
const sectionStyle = 'tw:grid tw:gap-[.923rem] tw:py-[1.077rem]';
const dividedSectionStyle = `${sectionStyle} tw:[border-top:1px_solid_rgba(120,76,66,.2)]`;
const linkRowStyle = 'tw:flex tw:flex-wrap tw:items-end tw:gap-[.923rem]';
const linkFieldStyle = 'tw:[--account-field-min-width:min(100%,15.385rem)]';

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
    <Button variant="adminOutline" type="button" onClick={reload}>Tentar novamente</Button>
  </section>;

  const { registration, contract, partners, supportPartnerId, pendingAccesses, activeAccesses } = data;

  return <section className="account-tab-pane tw:grid tw:gap-[12px]" aria-label="Acessos e responsáveis">
    <section className={sectionStyle}>
      <AccountPaneHeading icon={UsersRound} title="Responsáveis" description="Exibidos no Início do Cliente." />
      <p className="tw:m-0">Responsável CALI · Patrícia Lima</p>
      <CompanyField>Partner de apoio
        <CompanySelect value={partnerId} onChange={(event) => setPartnerId(event.target.value)} disabled={busy}>
          <option value="">Sem Partner de apoio</option>
          {supportPartnerId && !partners.some((partner) => partner.id === supportPartnerId) &&
            <option value={supportPartnerId} disabled>Partner indisponível</option>}
          {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
        </CompanySelect>
      </CompanyField>
      <Button className="tw:[justify-self:start]" variant="adminOutline" type="button" disabled={busy || partnerId === (supportPartnerId ?? '')}
        onClick={() => void run(async () => {
          await setCompanySupportPartner(companyId, partnerId || null);
          setStatus('Responsáveis atualizados.');
        })}>Salvar responsáveis</Button>
    </section>

    <section className={dividedSectionStyle}>
      <AccountPaneHeading icon={Link2} title="Pré-cadastro" description="O link fica disponível por sete dias." />
      {registration?.submittedAt ? <>
        <p className="tw:m-0">Dados recebidos em {dateTime.format(new Date(registration.submittedAt))}.</p>
        <Button className="tw:[justify-self:start]" variant="adminOutline" type="button" disabled={busy || !registration.fields}
          onClick={() => { if (registration.fields) onApplyPreRegistration(registration.fields); }}>Usar dados na ficha</Button>
      </> : <>
        {registration && <p className="tw:m-0">Validade do link · {dateTime.format(new Date(registration.expiresAt))}.</p>}
        <Button className="tw:[justify-self:start]" variant="adminOutline" type="button" disabled={busy || !isActive} onClick={issueLink}>
          {registration ? 'Gerar novo link' : 'Gerar link de pré-cadastro'}
        </Button>
        {registration && <small>Ao gerar outro link, o anterior perde a validade.</small>}
        {link && <div className={linkRowStyle}>
          <CompanyField className={`${linkFieldStyle} tw:flex-1`}>Link para a empresa<CompanyInput value={link} readOnly onFocus={(event) => event.currentTarget.select()} /></CompanyField>
          <Button className="tw:[justify-self:start]" variant="adminOutline" type="button" onClick={() => {
            void navigator.clipboard.writeText(link).then(
              () => setStatus('Link copiado.'),
              () => setError('Selecione o endereço para copiar o link.'),
            );
          }}>Copiar</Button>
        </div>}
      </>}
    </section>

    <section className={dividedSectionStyle}>
      <AccountPaneHeading icon={FileCheck2} title="Contrato assinado" description="Anexe a versão vigente assinada pela empresa." />
      {contract && <p className="tw:m-0">{contract.title}{contract.date ? ` · ${contract.date.split('-').reverse().join('/')}` : ''}{!contract.available && ' · arquivo indisponível'}</p>}
      <div className={linkRowStyle}>
        <CompanyField className={`${linkFieldStyle} tw:flex-1`}>Arquivo do contrato
          <input key={fileInputKey} type="file" accept=".pdf,.doc,.docx,image/*" disabled={busy}
            onChange={(event) => setContractFile(event.target.files?.[0])} />
        </CompanyField>
        <CompanyField className={linkFieldStyle}>Data do contrato<CompanyInput type="date" value={contractDate} disabled={busy}
          onChange={(event) => setContractDate(event.target.value)} /></CompanyField>
      </div>
      <Button className="tw:[justify-self:start]" variant="adminOutline" type="button" disabled={busy || !contractFile} onClick={uploadContract}>Anexar contrato</Button>
    </section>

    <section className={dividedSectionStyle}>
      <AccountPaneHeading icon={ShieldCheck} title="Liberar acessos" description="Salve os dados obrigatórios e os contatos da ficha antes da liberação." />
      <p className="tw:m-0">{activeAccesses} liberado(s) · {pendingAccesses} aguardando liberação.</p>
      {pendingAccesses > 0 && <ul>{data.pendingContacts.map((person) => <li key={person.id}>{person.name} · {person.email}</li>)}</ul>}
      <CompanyCheckCard checked={confirmed} disabled={busy || !contract?.available}
          onChange={(event) => setConfirmed(event.target.checked)} title="Confirmo que o contrato vinculado está assinado e que a empresa aderiu ao Workspace." />
      <Button className="tw:[justify-self:start]" variant="adminPrimary" type="button" disabled={busy || !isActive || !pendingAccesses || !confirmed}
        onClick={confirmRelease}>Liberar acessos</Button>
      {data.releasedAt && <small>Última liberação · {dateTime.format(new Date(data.releasedAt))}.</small>}
    </section>
    {status && <p className="tw:m-0" role="status">{status}</p>}
    {error && <div>
      <p className="tw:m-0" role="alert">{error}</p>
      <Button className="tw:[justify-self:start]" variant="adminOutline" type="button" disabled={busy} onClick={reload}>Atualizar dados da ficha</Button>
    </div>}
  </section>;
}
