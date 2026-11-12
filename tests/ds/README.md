# Componentes compartilhados

`src/components` contém 36 arquivos TSX, o hook de foco e a configuração visual do Workspace. As primitivas preservam os seletores usados pelas páginas em `773c9d4`. Os estados novos têm fixtures próprias. A comparação de páginas cobre os controles equivalentes em contexto, incluindo MFA, formulário de Ocorrências, filtro vazio, diálogos de Entregáveis e Agenda. [Cenários das páginas](../visual/pages/scenarios.cjs).

## Reproduzir

```sh
npm run test:components
CALI_COMPONENT_VISUAL_OUTPUT=/tmp/cali-component-variants npm run test:components
npm run test:visual:components -- \
  --reference /tmp/cali-main-sintetico \
  --before /tmp/cali-branch-antes-do-css \
  --candidate /tmp/cali-branch-sintetico \
  --output /tmp/cali-component-parity
```

`--before` é opcional. Use builds do app compilados com `VITE_SUPABASE_URL=https://cali-local-qa.supabase.co` e `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_qa_fixture`. O Chrome usa proxy local de descarte e respostas sintéticas. As fontes externas ficam bloqueadas. Use `CALI_E2E_CHROME` para indicar outro binário. [Runner de páginas e builds](../visual/pages/run.cjs).

A galeria renderiza os componentes e as folhas de estilo do app com 1440×960, 1280×800, 768×1024 e 390×844. Cada largura roda com tokens dia e noite. As 32 capturas opcionais incluem galeria, diálogo, formulário e carregador. A comparação no app cobre navegação, conta, notificações, auditoria de horas e timers. Ela salva `result.json`, capturas e sobreposições de diferenças, com limiar de 24 por canal. O cenário noturno aplica o atributo de tema no navegador para verificar os seletores. O runner mede a caixa, a presença no viewport e o alvo atingido pelo clique. Diferenças de pixels incluem o conteúdo da página e precisam ser interpretadas junto da geometria.

Na comparação com `773c9d4` e `3096614`, o candidato passou os 28 estados. A navegação manteve zero pixels alterados sobre `3096614` nos oito estados. A edição de horas manteve zero pixels alterados sobre os dois builds nos quatro estados. Os dois builds anteriores tinham contador de timers inacessível nas quatro larguras, menu de perfil Admin inacessível a 390 px e painel de notificações 63 px fora da tela a 768 px. A galeria e as provas de comportamento passaram 38 casos, incluindo reaproveitamento e descarte de URLs assinadas por sessão. As capturas de assinaturas usam fontes de fallback locais.

As folhas dos componentes usam utilitários para estrutura, dimensões, cores repetidas e estados. Permanecem declarações específicas para máscaras e animações de marca, sombras, camadas de diálogos, geometria calculada e regras de impressão.

## Inventário e evidência

| Arquivo em `src/components` | Prova de comportamento ou apresentação |
| --- | --- |
| `calendar/ExtraVisitExpenses.tsx` | Fixture de linhas obrigatórias, upload, rollback de anexo e retry. E2E `agenda-admin-despesas-visitas-concluidas` valida entrada por Agenda. |
| `calendar/ExtraVisitRequest.tsx` | Fixtures online/presencial, conflito, upload e vínculo. E2E `agenda-cliente-solicitar-agendamento`. |
| `documents/DocumentAutoCover.tsx` | Galeria com amostragem de cor real do logo. Unitário de alt e URL. |
| `ds/Button.tsx` | Galeria com 11 variantes. Fixtures de pending, disabled, aria-busy, envio nativo e fechar. |
| `ds/DataTable.tsx` | Galeria Equipe e analytics. Fixture de cabeçalhos, nome acessível e células. |
| `ds/DialogForm.tsx` | Galeria de formulário focado. Fixture de validação nativa, Enter e retorno de foco. |
| `ds/DialogFrame.tsx` | Galeria de diálogo. Fixtures de foco inicial, Tab, Shift+Tab, Escape, diálogo aninhado e cancelamento pelo consumidor. |
| `ds/EmptyState.tsx` | Galeria com variantes de fluxo e Admin. E2E `design-filter-and-empty` exercita recorte vazio. |
| `ds/FieldLabel.tsx` | Galeria e fixture de associação nativa com os campos. |
| `ds/FilterSelect.tsx` | Galeria e fixture de seleção. E2E `design-filter-and-empty`. |
| `ds/GuidedField.tsx` | Galeria e fixture de input, textarea e refs. |
| `ds/InlineNotice.tsx` | Galeria info/sucesso/erro. Fixture de anúncios e papel explícito. |
| `ds/LoadingState.tsx` | Galeria de estado ocupado. Fixture de transição para estado vazio. |
| `ds/StatusBadge.tsx` | Galeria de situação e entrega. Fixture de elementos semânticos e texto. |
| `ds/WorkspaceRouteLoader.tsx` | Captura isolada do carregador. Fixture de anúncio ocupado e ilustração decorativa. |
| `feedback/AppErrorBoundary.tsx` | Fixtures de erro, recuperação manual e recarga única para módulo desatualizado. |
| `hours/CapacityBar.tsx` | Galeria de ausência de contrato, uso normal, atenção, completo, excedente, pausa e fundo escuro. Unitários de texto e escala. |
| `hours/GlobalTimerBar.tsx` | E2E `global-timer-pause-and-finalize`. Comparação `timers-overflow` prova quatro timers acessíveis, foco após Escape, reabertura por teclado e controles do cabeçalho. |
| `hours/HoursLifecycleBridge.tsx` | E2E `hours-lifecycle-finalizes-selected-active-timer` verifica escolha por ID e dupla confirmação. |
| `hours/ProjectTimerBridge.tsx` | E2E `06-project-timer-start-and-pause` pelo detalhe do projeto. |
| `hours/TimerFinalizationDialog.tsx` | Fixture de duas confirmações e trava durante processamento. |
| `legal/LegalDocument.tsx` | Unitários de títulos, listas, tabelas e escape. E2E de termos na entrada e impressão por papel. |
| `navigation/Link.tsx` | Fixtures de caminho, query, hash, clique cancelado e modificado, download, alvo e histórico. |
| `navigation/Navigate.tsx` | Fixtures de push e replace com parâmetros repetidos e hash. |
| `privacy/SensitiveDataNote.tsx` | Galeria e unitário de orientação e ícone decorativo. |
| `projects/DeliverableDependencies.tsx` | Fixtures de reprogramação Admin com justificativa e registro/recebimento por RPC do Partner. E2E `06-client-dependency-read-only` verifica atraso, histórico, escopo e leitura pelo Cliente. |
| `modules/projects/components/ProjectDeliveryHistory.tsx` | E2E `06-project-delivery-performance-history` verifica prazo, aprovação, horas e exclusão de execução aberta. A suíte `project-history` verifica troca de projeto e atualização no intervalo. |
| `reports/ExecutiveReportPaperV17.tsx` | Unitário do protocolo e ciência. E2E `12-report-print` valida impressão. |
| `reports/ReportManualComplementsPanel.tsx` | Fixture de inclusão, edição, total e remoção. Unitário de travamento da versão fechada. Persistência externa fora da fixture. |
| `reports/ReportValidationV55.tsx` | Galeria com 14 estilos gerados, assinatura enviada, ciência pendente e protocolo. Unitário pelo papel do relatório. |
| `workspace/DirectProfileControl.tsx` | E2E `profile-save-retry-and-reopen` e casos `account-*`. Comparação da conta aberta em quatro larguras. |
| `workspace/OperationalSafetyBridgeV2.tsx` | E2E `hours-audit-edit-keeps-visible-entry`. Comparação de edição de horas com justificativa. |
| `workspace/WelcomeTour.tsx` | Fixture de avanço, retorno, destaque, conclusão persistida e reabertura. Guardas de primeira entrada. |
| `workspace/WorkspaceChrome.tsx` | E2E de destino, leitura, bloqueio de origem externa e troca de sessão com dois titulares. Comparação do sino. |
| `workspace/WorkspaceShell.tsx` | Jornadas de entrada por papel e rotas diretas. Testes de barra global, notificações e pontes instaladas pelo shell. |
| `workspace/WorkspaceShellV2.tsx` | Comparações de navegação e perfil. E2E de menu, troca de módulo e saída com timer ativo da sessão. |
| `ds/useDialogFocus.ts` | Fixtures de diálogo sem ações, teclado aninhado e foco restaurado. |
| `workspace/visualSystem.ts` | Exercitado no carregamento das rotas de ambos os shells. Teste de horário dos temas em `workspace-rules.test.mjs`. |

Os casos diretos ficam em [Design System](design-system.test.mjs) e [Agenda e navegação](calendar-navigation.mjs). Casos por rota em [Workspace](../e2e/workspace-components.cjs), [Agenda](../e2e/agenda-visits.cjs), [Jornadas](../e2e/journeys.cjs) e [Design no navegador](../e2e/design-browser.cjs). Renderização estática em [Testes de apresentação](../unit/presentation-components.test.mjs).
