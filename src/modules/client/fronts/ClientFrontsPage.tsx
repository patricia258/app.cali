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
        <header className="page-head">
          <div>
            <span className="eyebrow">{company?.display_name || 'CALI Workspace'} / ESCOPO DA ASSESSORIA</span>
            <h1>
              Frentes contratadas<span className="title-dot">.</span>
            </h1>
            <p>Conheça os assuntos em que a CALI pode atuar com a sua empresa.</p>
          </div>
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-[0.769rem]">
            <span className="chip gold">
              {plan ? planName[plan] : company?.service_type || 'Plano em definição'}
            </span>
            {plan && (
              <a
                className="outline-button"
                href={`https://wa.me/${PATI_WHATSAPP}?text=${encodeURIComponent(`Olá, Pati! Quero conversar sobre as frentes do meu ${planName[plan]}.`)}`}
                target="_blank"
                rel="noreferrer"
              >
                Falar com a Pati <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </header>
        {loading ? (
          <p>Carregando escopo…</p>
        ) : error ? (
          <p role="alert" className="tw:text-cali-danger">
            {error}
          </p>
        ) : !plan ? (
          <section className="tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#e9e0d8] tw:bg-white tw:p-[1.231rem] tw:text-[0.846rem] tw:text-[#82786f]">
            <p>
              Seu escopo está sendo organizado. Converse com a Pati se precisar confirmar uma frente do contrato.
            </p>
          </section>
        ) : (
          <>
            {(plan === 'partner' || plan === 'full') && (
              <section className="tw:mb-8">
                <div className="tw:mb-[0.923rem] tw:flex tw:items-center tw:justify-between tw:gap-[0.923rem] tw:[&_h2]:m-0 tw:[&_h2]:flex tw:[&_h2]:items-center tw:[&_h2]:gap-[0.615rem] tw:[&_h2]:text-[1.077rem] tw:[&_h2]:font-semibold tw:[&_h2]:text-[#322f2c] tw:[&>span]:text-[0.769rem] tw:[&>span]:text-[#998c83]">
                  <h2>
                    <Check size={20} className="tw:size-[1.231rem] tw:shrink-0 tw:text-[#3f976e]" />
                    Já faz parte do seu plano
                  </h2>
                  <span>
                    {grouped.included.length} {grouped.included.length === 1 ? 'frente' : 'frentes'}
                  </span>
                </div>
                <div
                  className="tw:grid tw:grid-cols-3 tw:gap-[1.077rem] tw:max-[68.75rem]:grid-cols-2 tw:max-[43.75rem]:grid-cols-1"
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
                <div className="tw:mb-[0.923rem] tw:flex tw:items-center tw:justify-between tw:gap-[0.923rem] tw:[&_h2]:m-0 tw:[&_h2]:flex tw:[&_h2]:items-center tw:[&_h2]:gap-[0.615rem] tw:[&_h2]:text-[1.077rem] tw:[&_h2]:font-semibold tw:[&_h2]:text-[#322f2c] tw:[&>span]:text-[0.769rem] tw:[&>span]:text-[#998c83]">
                  <h2>Em implantação</h2>
                  <span>
                    {grouped.contracted.length} {grouped.contracted.length === 1 ? 'frente' : 'frentes'}
                  </span>
                </div>
                {grouped.contracted.length ? (
                  <div className="tw:grid tw:grid-cols-3 tw:gap-[1.154rem] tw:max-[53.125rem]:grid-cols-1">
                    {grouped.contracted.map(({ item, front }) => (
                      <article
                        className="tw:min-w-0 tw:rounded-[0.692rem] tw:border tw:border-t-[0.231rem] tw:border-solid tw:border-[var(--v2-line-e7d6c7,#e7d6c7)] tw:border-t-[#42b489] tw:bg-[var(--v2-surface-fff,#fff)] tw:p-[1.769rem] tw:[&_h3]:mt-[1.231rem] tw:[&_h3]:mb-[0.923rem] tw:[&_h3]:text-[1.462rem] tw:[&_h3]:text-[var(--v2-text-5a1e2d,#5a1e2d)] tw:[&_p]:text-[0.923rem]/[1.7] tw:[&_p]:text-[var(--v2-text-91806f,#91806f)]"
                        key={item.id}
                      >
                        <span className="tw:flex tw:items-center tw:gap-[0.538rem] tw:text-[0.769rem] tw:text-[var(--v2-text-3f956e,#3f956e)]">
                          <Check size={15} />
                          Implantação assistida
                        </span>
                        <h3>{front?.title}</h3>
                        <p>{item.scope_label || front?.description}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#e9e0d8] tw:bg-white tw:p-[1.231rem] tw:text-[0.846rem] tw:text-[#82786f]">
                    A CALI ainda não registrou uma frente de implantação neste espaço.
                  </div>
                )}
              </section>
            )}
            {grouped.possible.length > 0 && (
              <section className="tw:mb-8">
                <div className="tw:mb-[0.923rem] tw:flex tw:items-center tw:justify-between tw:gap-[0.923rem] tw:[&_h2]:m-0 tw:[&_h2]:flex tw:[&_h2]:items-center tw:[&_h2]:gap-[0.615rem] tw:[&_h2]:text-[1.077rem] tw:[&_h2]:font-semibold tw:[&_h2]:text-[#322f2c] tw:[&>span]:text-[0.769rem] tw:[&>span]:text-[#998c83]">
                  <h2>
                    <MessagesSquare size={20} className="tw:size-[1.231rem] tw:shrink-0 tw:text-cali-gold" />
                    Outras possibilidades
                  </h2>
                  <span>Abra uma frente para ver exemplos</span>
                </div>
                <div className="tw:grid tw:grid-cols-2 tw:items-start tw:gap-x-[1.077rem] tw:gap-y-[0.769rem] tw:max-[43.75rem]:grid-cols-1">
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
              className="tw:fixed tw:inset-0 tw:z-12100 tw:flex tw:items-center tw:justify-center tw:bg-[#241b216e] tw:p-[1.385rem] tw:motion-safe:animate-[v2-fade_.22s_ease-out_backwards]"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setChosen(null);
              }}
            >
              <DialogFrame
                className="tw:relative tw:max-h-[calc(100dvh-2.77rem)] tw:w-full tw:max-w-[45.385rem] tw:overflow-y-auto tw:rounded-[1rem] tw:bg-white tw:p-[1.923rem] tw:shadow-[0_1.154rem_4.615rem_#22172232] tw:focus:outline-none tw:motion-safe:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards]"
                aria-labelledby="front-dialog-title"
              >
                <Button
                  type="button"
                  variant="unstyled"
                  className="tw:absolute tw:top-[1.385rem] tw:right-[1.385rem] tw:grid tw:place-items-center tw:border-0 tw:bg-transparent tw:p-[0.538rem] tw:text-[var(--v2-text-6a5053,#6a5053)]"
                  onClick={() => setChosen(null)}
                  aria-label="Fechar"
                >
                  <X size={19} />
                </Button>
                <span className="tw:block tw:text-[0.769rem] tw:font-bold tw:tracking-[0.077rem] tw:text-[#a88b76]">
                  AVALIAR UMA NOVA FRENTE
                </span>
                <h2 id="front-dialog-title">{chosen.title}</h2>
                <p>
                  Vamos entender a necessidade da sua empresa e confirmar o formato, o escopo e a disponibilidade
                  antes de qualquer contratação.
                </p>
                <a
                  className="tw:inline-flex tw:items-center tw:justify-center tw:gap-[0.538rem] tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-[1.077rem] tw:py-[0.769rem] tw:text-[0.846rem] tw:font-semibold tw:text-white tw:no-underline"
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
