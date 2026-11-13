import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../src/components/ds/Button';
import { DataTable } from '../../src/components/ds/DataTable';
import { DialogFrame } from '../../src/components/ds/DialogFrame';
import { DialogForm } from '../../src/components/ds/DialogForm';
import { EmptyState } from '../../src/components/ds/EmptyState';
import { FieldLabel } from '../../src/components/ds/FieldLabel';
import { FilterSelect } from '../../src/components/ds/FilterSelect';
import { GuidedInput, GuidedTextarea } from '../../src/components/ds/GuidedField';
import { InlineNotice } from '../../src/components/ds/InlineNotice';
import { LoadingState } from '../../src/components/ds/LoadingState';
import { StatusBadge } from '../../src/components/ds/StatusBadge';
import { WorkspaceRouteLoader } from '../../src/components/ds/WorkspaceRouteLoader';
import { CapacityBar } from '../../src/components/hours/CapacityBar';
import { CapacityCard } from '../../src/components/hours/CapacityCard';
import { DocumentAutoCover } from '../../src/components/documents/DocumentAutoCover';
import { SensitiveDataNote } from '../../src/components/privacy/SensitiveDataNote';
import { ReportValidationBlock, type ReportSignatureStyleV59 } from '../../src/components/reports/ReportValidationBlock';
import { capacityOf } from '../../src/lib/capacity';
import '../../src/styles/theme-tokens.css';
import '../../src/styles/surface-foundation.css';
import '../../src/components/ds/surface-controls.css';
import '../../src/components/workspace/workspace-shell.generated.css';
import '../../src/components/workspace/operational.css';
import '../../src/components/reports/report-document-a4.css';
import './visual-variants.css';

const buttons = [
  ['primary', 'Primário'], ['secondary', 'Secundário'], ['workflowPrimary', 'Ação de fluxo'],
  ['workflowSecondary', 'Ação secundária de fluxo'], ['workflowOutline', 'Contorno de fluxo'],
  ['adminPrimary', 'Ação de Admin'], ['adminOutline', 'Contorno de Admin'],
  ['gatePrimary', 'Ação de acesso'], ['gateExit', 'Sair da verificação'],
] as const;

const capacity = [
  { label: 'Sem capacidade', hours: null, minutes: 20 },
  { label: 'Disponível', hours: 10, minutes: 300 },
  { label: 'Atenção', hours: 10, minutes: 450 },
  { label: 'Completa', hours: 10, minutes: 600 },
  { label: 'Excedente e pausa', hours: 10, minutes: 735 },
];

const logo = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#5a1e2d"/><circle cx="20" cy="20" r="10" fill="#b58c52"/></svg>',
);

const signatureStyles: ReportSignatureStyleV59[] = [
  'executive', 'editorial', 'notarial', 'heritage', 'calligraphic', 'autograph', 'contemporary',
  'italian', 'minimal', 'personal', 'classic', 'fluid', 'delicate', 'formal',
];

export function VisualVariants() {
  const [surface, setSurface] = useState<'frame' | 'form' | 'loader' | null>(null);

  return <>{surface === 'loader' ? <WorkspaceRouteLoader /> : <main className="fixture-visual v2-admin-page v2-client-module" aria-label="Variantes de componentes">
    <section aria-label="Ações" className="fixture-visual-card">
      <h2>Ações</h2>
      <div className="fixture-visual-actions wf-head">
        {buttons.map(([variant, label]) => <Button key={variant} variant={variant} type="button">{label}</Button>)}
        <Button variant="primary" type="button" disabled>Indisponível</Button>
        <Button variant="workflowPrimary" type="button" pending>Salvando…</Button>
        <span className="fixture-close-controls v2-stm-actions">
          <Button variant="close" type="button"><X size={18} /></Button>
          <Button variant="inlineClose" type="button" aria-label="Fechar prévia"><X size={18} /></Button>
        </span>
      </div>
    </section>
    <section aria-label="Campos e estados" className="fixture-visual-card">
      <h2>Campos e estados</h2>
      <div className="fixture-visual-columns">
        <div className="fixture-visual-fields cali-form-page">
          <FieldLabel>Nome<GuidedInput defaultValue="Pessoa QA" /></FieldLabel>
          <FieldLabel>Detalhes<GuidedTextarea rows={2} defaultValue="Acompanhar a revisão." /></FieldLabel>
          <FilterSelect aria-label="Filtrar situação" defaultValue="review"><option value="review">Em revisão</option></FilterSelect>
        </div>
        <div className="fixture-visual-fields">
          <InlineNotice>Informação da operação</InlineNotice>
          <InlineNotice tone="success">Alteração salva</InlineNotice>
          <InlineNotice tone="danger">Falha ao salvar</InlineNotice>
          <LoadingState>Carregando resultados</LoadingState>
          <EmptyState variant="workflow">Nenhuma ocorrência</EmptyState>
          <EmptyState variant="admin">Fila de revisão vazia</EmptyState>
        </div>
      </div>
    </section>
    <section aria-label="Tabelas e privacidade" className="fixture-visual-card">
      <h2>Tabelas e privacidade</h2>
      <div className="fixture-team-table"><div className="tw:w-full tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-cali-line">
        <DataTable variant="teamReport" className="tw:w-full tw:min-w-[44.375rem] tw:border-collapse tw:text-left tw:text-xs tw:[&_th]:bg-[#f7f1eb] tw:[&_th]:px-3 tw:[&_th]:py-2.75 tw:[&_th]:text-[0.65rem] tw:[&_th]:uppercase tw:[&_th]:tracking-[0.07em] tw:[&_th]:text-cali-muted tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-cali-line tw:[&_td]:px-3 tw:[&_td]:py-2.5"><caption>Quadro da empresa</caption>
          <thead><tr><th>Pessoa</th><th>Situação</th></tr></thead>
          <tbody><tr><td>Pessoa QA</td><td><StatusBadge variant="status">Ativa</StatusBadge></td></tr></tbody>
        </DataTable>
      </div></div>
      <DataTable variant="analytics"><caption>Entregas da empresa</caption>
        <thead><tr><th>Entrega</th><th>Etapa</th></tr></thead>
        <tbody><tr><td>Planejamento</td><td><StatusBadge variant="delivery" as="b">Em revisão</StatusBadge></td></tr></tbody>
      </DataTable>
      <SensitiveDataNote />
      <DocumentAutoCover logo={logo} name="Empresa QA" />
    </section>
    <section aria-label="Capacidade mensal" className="fixture-visual-card">
      <h2>Capacidade mensal</h2>
      <div className="fixture-visual-columns">
        {capacity.map(({ label, hours, minutes }) => <div key={label} role="group" aria-label={label}>
          <h3>{label}</h3>
          <CapacityCard
            capacity={capacityOf(hours, minutes)}
            occurrence={minutes > 600 ? 3 : undefined}
            paused={minutes > 600}
          />
        </div>)}
        <div className="fixture-dark-capacity">
          <h3>Escala sobre fundo escuro</h3>
          <CapacityBar capacity={capacityOf(10, 735)} dark />
        </div>
      </div>
    </section>
    <section aria-label="Assinaturas do relatório" className="fixture-visual-card">
      <h2>Assinaturas do relatório</h2>
      <div className="fixture-visual-columns">
        {signatureStyles.map((signature_style) => <ReportValidationBlock
          key={signature_style}
          approvalIdentity={{ full_name: 'Patrícia Costa', signature_style }}
          acknowledgementIdentity={signature_style === 'executive'
            ? { full_name: 'Pessoa QA', signature_mode: 'uploaded', signature_url: logo }
            : null}
          acknowledgementProtocol={signature_style === 'executive' ? 'QA-001' : undefined}
        />)}
      </div>
    </section>
    <section aria-label="Diálogos e carregamento" className="fixture-visual-card fixture-visual-actions">
      <Button type="button" variant="primary" onClick={() => setSurface('frame')}>Abrir diálogo</Button>
      <Button type="button" variant="secondary" onClick={() => setSurface('form')}>Abrir formulário</Button>
      <Button type="button" variant="secondary" onClick={() => setSurface('loader')}>Carregar página</Button>
    </section>
    {surface === 'frame' && <div className="wf-modal-overlay fixture-dialog-overlay">
      <DialogFrame className="wf-modal wf-create" aria-label="Revisão de entrega">
        <Button type="button" variant="close" onClick={() => setSurface(null)}><X size={18} /></Button>
        <h2>Revisão de entrega</h2>
        <p>Confira o documento antes de concluir a revisão.</p>
        <div className="wf-modal-actions">
          <Button type="button" variant="workflowOutline" onClick={() => setSurface(null)}>Voltar</Button>
          <Button type="button" variant="workflowPrimary" onClick={() => setSurface(null)}>Continuar</Button>
        </div>
      </DialogFrame>
    </div>}
    {surface === 'form' && <div className="wf-modal-overlay fixture-dialog-overlay">
      <DialogForm className="wf-modal wf-create" aria-label="Registrar revisão" onSubmit={(event) => {
        event.preventDefault();
        setSurface(null);
      }}>
        <Button type="button" variant="close" onClick={() => setSurface(null)}><X size={18} /></Button>
        <h2>Registrar revisão</h2>
        <FieldLabel>Observação<GuidedInput required autoFocus /></FieldLabel>
        <div className="wf-modal-actions">
          <Button type="button" variant="workflowOutline" onClick={() => setSurface(null)}>Cancelar</Button>
          <Button type="submit" variant="workflowPrimary">Salvar</Button>
        </div>
      </DialogForm>
    </div>}
  </main>}</>;
}
