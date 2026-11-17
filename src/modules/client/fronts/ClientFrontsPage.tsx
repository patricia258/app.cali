import { CompactPageHeading } from '../../../components/workspace/components/CompactPageHeading';
import { IncludedFrontCard, PossibleFrontCard } from './components/ClientFrontCards';
import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Check, MessagesSquare, X } from 'lucide-react';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import type { Front } from '../../../api/fronts/contracts';
import { useClientFronts } from './hooks/useClientFronts';
import { activeFront, coreFront, eligibleMode, planName } from '../../../lib/contractFronts';

// Cali ADM — administrativo, financeiro e dúvidas de upgrade/escopo (41 8787-9244).
const ADM_WHATSAPP = '554187879244';
// Cali Pati — contato direto com a Patrícia (41 98779-1933). Usado só onde o cliente já tem a frente
// e quer entender melhor o que já é dele, não para sinalizar interesse em algo fora do escopo.
const PATI_WHATSAPP = '5541987791933';

export function ClientFrontsPage() {
  const { user } = useWorkspaceAuth();
  const [chosen, setChosen] = useState<Front | null>(null);
  const { data, error: queryError, isLoading: loading } = useClientFronts(user?.id);
  const company = data?.company ?? null;
  const catalog = data?.catalog ?? [];
  const contracts = data?.contracts ?? [];
  const error =
    queryError instanceof Error ? queryError.message : queryError ? 'Não foi possível carregar o escopo.' : '';
  useEffect(() => {
    if (!chosen) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  }, [chosen]);
  const plan = company?.service_plan || null;
  const active = useMemo(() => contracts.filter(activeFront), [contracts]);
  const grouped = useMemo(
    () => ({
      included: catalog.filter((front) => coreFront(front, plan)),
      contracted: active
        .map((item) => ({ item, front: catalog.find((front) => front.code === item.front_code) }))
        .filter((entry) => entry.front),
      possible: catalog.filter(
        (front) =>
          !coreFront(front, plan) &&
          !active.some((item) => item.front_code === front.code) &&
          eligibleMode(front, plan),
      ),
    }),
    [catalog, active, plan],
  );
  const showContractedInline = plan ? plan.startsWith('build_') : false;
  const contact = chosen
    ? `Olá! Gostaria de conversar sobre ${chosen.title} para ${company?.display_name || 'minha empresa'}.`
    : '';
  return (
    <Shell role="client">
      <div className="v2-client-module">
        <CompactPageHeading
          eyebrow={<>{company?.display_name || 'CALI Workspace'} / ESCOPO DA ASSESSORIA</>}
          title="Frentes contratadas"
          description="Conheça os assuntos em que a CALI pode atuar com a sua empresa."
        >
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3">
            <span className="tw:inline-block tw:rounded-md tw:border tw:border-solid tw:border-cali-orange-surface tw:bg-cali-orange-surface tw:px-2 tw:py-1.5 tw:text-cali-label/[inherit] tw:font-semibold tw:whitespace-nowrap tw:text-cali-gold-text">
              {plan ? planName[plan] : company?.service_type || 'Plano em definição'}
            </span>
            {plan && (
              <a
                className="tw:inline-flex tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4.5 tw:py-3 tw:text-sm/[inherit] tw:font-semibold tw:whitespace-nowrap tw:text-cali-muted tw:hover:border-cali-gold"
                href={`https://wa.me/${PATI_WHATSAPP}?text=${encodeURIComponent(`Olá, Pati! Quero conversar sobre as frentes do meu ${planName[plan]}.`)}`}
                target="_blank"
                rel="noreferrer"
              >
                Falar com a Pati <ArrowUpRight className="tw:shrink-0" size={14} />
              </a>
            )}
          </div>
        </CompactPageHeading>
        {loading ? (
          <p>Carregando escopo…</p>
        ) : error ? (
          <p role="alert" className="tw:text-cali-danger">
            {error}
          </p>
        ) : !plan ? (
          <section className="tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-5 tw:text-sm tw:text-cali-muted">
            <p>
              Seu escopo está sendo organizado. Converse com a Pati se precisar confirmar uma frente do contrato.
            </p>
          </section>
        ) : (
          <>
            {(plan === 'partner' || plan === 'full') && (
              <section className="tw:mb-8">
                <div className="tw:mb-3.5 tw:flex tw:items-center tw:justify-between tw:gap-3.5 tw:[&_h2]:m-0 tw:[&_h2]:flex tw:[&_h2]:items-center tw:[&_h2]:gap-2.5 tw:[&_h2]:text-lg tw:[&_h2]:font-semibold tw:[&_h2]:text-cali-text tw:[&>span]:text-xs tw:[&>span]:text-cali-sand-text">
                  <h2>
                    <Check size={20} className="tw:size-5 tw:shrink-0 tw:text-cali-green-accent" />
                    Já faz parte do seu plano
                  </h2>
                  <span>
                    {grouped.included.length} {grouped.included.length === 1 ? 'frente' : 'frentes'}
                  </span>
                </div>
                <div
                  className="tw:grid tw:grid-cols-3 tw:gap-4.5 tw:max-[68.75rem]:grid-cols-2 tw:max-[43.75rem]:grid-cols-1"
                  aria-label="Frentes incluídas no seu plano"
                >
                  {grouped.included.map((front) => (
                    <IncludedFrontCard front={front} key={front.code} />
                  ))}
                </div>
              </section>
            )}
            {showContractedInline && (
              <section className="tw:mb-8">
                <div className="tw:mb-3.5 tw:flex tw:items-center tw:justify-between tw:gap-3.5 tw:[&_h2]:m-0 tw:[&_h2]:flex tw:[&_h2]:items-center tw:[&_h2]:gap-2.5 tw:[&_h2]:text-lg tw:[&_h2]:font-semibold tw:[&_h2]:text-cali-text tw:[&>span]:text-xs tw:[&>span]:text-cali-sand-text">
                  <h2>Em implantação</h2>
                  <span>
                    {grouped.contracted.length} {grouped.contracted.length === 1 ? 'frente' : 'frentes'}
                  </span>
                </div>
                {grouped.contracted.length ? (
                  <div className="tw:grid tw:grid-cols-3 tw:gap-4.5 tw:max-[53.125rem]:grid-cols-1">
                    {grouped.contracted.map(({ item, front }) => (
                      <article
                        className="tw:min-w-0 tw:rounded-cali-panel tw:border tw:border-t-[0.231rem] tw:border-solid tw:border-[var(--v2-line-e7d6c7,var(--cali-color-sand-line))] tw:border-t-cali-teal-accent tw:bg-[var(--v2-surface-fff,var(--cali-color-neutral-surface))] tw:p-7 tw:[&_h3]:mt-5 tw:[&_h3]:mb-3.5 tw:[&_h3]:text-2xl tw:[&_h3]:text-[var(--v2-text-5a1e2d,var(--cali-color-burgundy-accent))] tw:[&_p]:text-cali-body/[1.7] tw:[&_p]:text-[var(--v2-text-91806f,var(--cali-color-sand-text))]"
                        key={item.id}
                      >
                        <span className="tw:flex tw:items-center tw:gap-2 tw:text-xs tw:text-[var(--v2-text-3f956e,var(--cali-color-green-accent))]">
                          <Check size={15} />
                          Implantação assistida
                        </span>
                        <h3>{front?.title}</h3>
                        <p>{item.scope_label || front?.description}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-5 tw:text-sm tw:text-cali-muted">
                    A CALI ainda não registrou uma frente de implantação neste espaço.
                  </div>
                )}
              </section>
            )}
            {grouped.possible.length > 0 && (
              <section className="tw:mb-8">
                <div className="tw:mb-3.5 tw:flex tw:items-center tw:justify-between tw:gap-3.5 tw:[&_h2]:m-0 tw:[&_h2]:flex tw:[&_h2]:items-center tw:[&_h2]:gap-2.5 tw:[&_h2]:text-lg tw:[&_h2]:font-semibold tw:[&_h2]:text-cali-text tw:[&>span]:text-xs tw:[&>span]:text-cali-sand-text">
                  <h2>
                    <MessagesSquare size={20} className="tw:size-5 tw:shrink-0 tw:text-cali-gold" />
                    Outras possibilidades
                  </h2>
                  <span>Abra uma frente para ver exemplos</span>
                </div>
                <div className="tw:grid tw:grid-cols-2 tw:items-start tw:gap-x-4.5 tw:gap-y-3 tw:max-[43.75rem]:grid-cols-1">
                  {grouped.possible.map((front) => (
                    <PossibleFrontCard front={front} plan={plan} onChoose={setChosen} key={front.code} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        {chosen &&
          createPortal(
            <div
              className="tw:fixed tw:inset-0 tw:z-12100 tw:flex tw:items-center tw:justify-center tw:bg-cali-burgundy-inverse/43 tw:p-5.5 tw:motion-safe:animate-[v2-fade_.22s_ease-out_backwards]"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setChosen(null);
              }}
            >
              <DialogFrame
                className="tw:relative tw:max-h-[calc(100dvh-2.77rem)] tw:w-full tw:max-w-[45.385rem] tw:overflow-y-auto tw:rounded-2xl tw:bg-cali-neutral-surface tw:p-7.5 tw:shadow-[0_1.154rem_4.615rem_rgb(var(--cali-rgb-burgundy-inverse)/0.1961)] tw:focus:outline-none tw:motion-safe:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards]"
                aria-labelledby="front-dialog-title"
              >
                <Button
                  type="button"
                  variant="unstyled"
                  className="tw:absolute tw:top-5.5 tw:right-5.5 tw:grid tw:place-items-center tw:border-0 tw:bg-transparent tw:p-2 tw:text-[var(--v2-text-6a5053,var(--cali-color-neutral-text))]"
                  onClick={() => setChosen(null)}
                  aria-label="Fechar"
                >
                  <X size={19} />
                </Button>
                <span className="tw:block tw:text-xs tw:font-bold tw:tracking-[0.077rem] tw:text-cali-muted">
                  AVALIAR UMA NOVA FRENTE
                </span>
                <h2 id="front-dialog-title">{chosen.title}</h2>
                <p>
                  Vamos entender a necessidade da sua empresa e confirmar o formato, o escopo e a disponibilidade
                  antes de qualquer contratação.
                </p>
                <a
                  className="tw:inline-flex tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-4.5 tw:py-3 tw:text-sm tw:font-semibold tw:text-cali-neutral-surface tw:no-underline"
                  href={`https://wa.me/${ADM_WHATSAPP}?text=${encodeURIComponent(contact)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Conversar com a CALI <ArrowUpRight size={16} />
                </a>
              </DialogFrame>
            </div>,
            document.body,
          )}
      </div>
    </Shell>
  );
}
