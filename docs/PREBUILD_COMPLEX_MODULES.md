# CALI Workspace — Pré-build dos módulos complexos

> Objetivo: impedir que regras antigas da Azumi sejam carregadas automaticamente para a CALI. Antes de implementar Projetos, Horas e Relatórios, cada comportamento abaixo deve estar classificado como **preservar**, **adaptar** ou **confirmar com Patrícia**.

## Fontes consultadas

1. Repositório original `azudoka/azumi-connect-hub-oficial`
   - `src/pages/admin/ProjetoDetalhe.tsx`
   - telas de calendário/admin e cliente
   - modelos de documentos e relatórios já inspecionados
2. Documento Mestre de Fluxos — Azumi Connect
3. Handoff técnico do Hub
4. MatDash — somente como referência de hierarquia visual, cards, tabelas, progressos, filtros, estados e modo escuro. **Não é fonte de regra de negócio.**

---

# 1. Projetos + Entregáveis

## PRESERVAR

- Cronograma nasce antes do projeto quando houver planejamento formal.
- Cronograma pode passar por revisão interna e aprovação do cliente.
- Quando aprovado, o cronograma vira projeto ativo.
- Projeto também pode ser criado diretamente quando não fizer sentido passar por cronograma.
- Visualização de execução em **Kanban e Lista**.
- Entregável precisa mostrar na linha principal, sem esconder:
  - nome;
  - código/rastreabilidade;
  - status;
  - prazo/deadline;
  - frente/contexto;
  - responsável;
  - subtarefas;
  - horas consumidas quando existirem.
- Status-base de entregável:
  - não iniciado;
  - em andamento;
  - aprovação interna;
  - aprovação do cliente;
  - ajuste solicitado;
  - aprovado pelo cliente;
  - cancelado.
- Entregável aprovado pelo cliente fica imutável.
- Solicitação de ajuste exige comentário/contexto.
- Aprovação do cliente pode acionar NPS.
- NPS 1–3 exige justificativa; 4–5 pode aceitar comentário opcional.
- Cancelamento exige justificativa e ciência dos impactos; histórico permanece.
- Entregável do tipo documento aprovado pode ser publicado na Biblioteca de Documentos.
- Histórico de mudanças precisa ser rastreável.
- Prazo de entregável alimenta automaticamente o Calendário.

## ADAPTAR PARA CALI

- Remover frentes antigas que não pertencem à CALI (DP, jurídico, atração etc.).
- Frentes devem refletir a arquitetura atual CALI:
  - Liderança;
  - Cultura & Engajamento;
  - Pessoas & Performance;
  - Gestão & Governança de RH;
  - ou contexto específico do projeto/serviço.
- No início existe apenas Patrícia como admin/consultora principal. A interface não deve parecer um sistema de alocação de dezenas de consultores.
- Manter arquitetura capaz de receber colaboradores no futuro, sem poluir a experiência atual.
- Comunicação é contextual ao entregável/projeto, não um chat independente.
- Documentos finais usam a Biblioteca CALI já estruturada, com versão, comentário e ciência.
- O cliente não “opera” o projeto: acompanha, comenta, valida e solicita ajuste.

## NÃO HARD-CODAR SEM CONFIRMAÇÃO DA PATRÍCIA

- SLA antigo de aprovação de **72h / 24h**.
- Regra antiga de “seguir com a versão anterior” ao vencer SLA.
- Limite antigo de **2 alterações no cronograma**.
- Regra de reordenar apenas itens de mesma complexidade.
- Uso obrigatório de complexidade C1/C2/C3 na CALI.

Essas regras só entram após decisão explícita no refinamento de Projetos.

---

# 2. Horas

## PRESERVAR

- Horas são parte central da gestão da conta.
- Cliente vê consumo para acompanhar o pacote/contrato, não para controlar Patrícia.
- Horas podem estar vinculadas a projeto, entregável e atividade.
- Registro precisa indicar data, duração e contexto.
- Lançamento manual deve ser identificado como manual.
- Justificativa interna de lançamento manual não deve aparecer ao cliente.
- Deve existir histórico e exportação.
- Consumo alimenta alertas e relatório mensal.
- Não permitir dois timers ativos simultaneamente para a mesma pessoa.
- Alertas de consumo devem existir e ser configuráveis por conta/ciclo.
- Excesso precisa ser visível e gerar decisão administrativa, não ser silencioso.
- Histórico de horas precisa ser auditável.

## ADAPTAR PARA CALI

- A fonte de verdade de “horas contratadas” deve vir da Gestão da Conta/Contrato.
- Alertas não serão números fixos herdados da Azumi; usar thresholds configuráveis.
- O dashboard deve comparar **ritmo consumido x ritmo esperado no período**, além de percentual simples.
- A visão cliente precisa ser elegante e resumida, com opção de detalhar quando necessário.
- Relatório mensal agrega horas por frente/projeto/entregável e não por módulos antigos da Azumi.

## NÃO HARD-CODAR SEM CONFIRMAÇÃO DA PATRÍCIA

- Horário comercial antigo para timer: segunda a sábado, 08h–18h.
- Encerramento automático do timer exatamente às 18h.
- Se interações externas (WhatsApp, e-mail, ligação, visita) **contam ou não** no pacote.
- Thresholds antigos de 70/85/100 ou 80/100.
- Regra automática de upgrade após dois meses excedidos.

---

# 3. Relatórios

## PRESERVAR

- Relatório mensal deve ser majoritariamente automático.
- Sistema coleta os dados reais do período; Patrícia revisa e acrescenta leitura executiva.
- Deve existir estado de rascunho antes da publicação.
- Deve gerar PDF final.
- Deve ficar disponível na plataforma.
- Deve poder ser enviado ao cliente por e-mail.
- Deve suportar ciência do cliente com data/hora e audit trail.
- Deve se conectar ao Google Drive quando a integração estiver ativa.
- Relatório precisa manter histórico por período e versão/publicação.

## CONTEÚDO CALI DO RELATÓRIO MENSAL

1. Identificação da conta e período.
2. Serviço/plano contratado e ciclo vigente.
3. Horas:
   - contratadas;
   - consumidas;
   - restantes/excedentes;
   - distribuição por frente/projeto/entregável;
   - ritmo de consumo.
4. Projetos em andamento e progresso.
5. Entregáveis do período:
   - concluídos;
   - em aprovação;
   - ajustes;
   - prazos relevantes.
6. NPS/avaliações do período.
7. Agenda e decisões relevantes.
8. Riscos e pontos de atenção.
9. Leitura executiva de Patrícia.
10. Próximos passos / prioridades do próximo ciclo.
11. Anexos/documentos finais relacionados, quando fizer sentido.

## ADAPTAR PARA CALI

- Remover Vagas, candidatos, solicitações e outros módulos antigos que não fazem parte do CALI Workspace.
- Relatório precisa parecer documento executivo da CALI, não relatório operacional de software.
- Horas são importantes, mas não podem transformar o relatório num timesheet.
- O valor está na leitura do trabalho + decisão + evolução.

## NÃO HARD-CODAR SEM CONFIRMAÇÃO DA PATRÍCIA

- Prazo automático para ciência do relatório e quantidade de lembretes.
- Se cliente pode comentar relatório publicado ou apenas dar ciência.
- Se relatório financeiro/cobrança será enviado junto no mesmo e-mail ou em bloco visual separado.

---

# 4. Ordem obrigatória antes de implementar cada módulo

1. Ler novamente o fluxo correspondente no Documento Mestre.
2. Abrir a tela equivalente no Connect e identificar o que era fluxo real versus mock/TODO.
3. Conferir o schema atual `cali_workspace` e evitar duplicar estruturas.
4. Usar MatDash apenas para referências de UX/UI compatíveis (cards, tabela, filtros, progresso, drawer/modal, dark mode).
5. Adaptar linguagem, taxonomia e visual para CALI.
6. Implementar primeiro a lógica e os estados; depois o refinamento visual.
7. Verificar Dia/Noite, desktop, tablet e mobile.
8. Só promover para `main` depois de validação.

---

# 5. Decisões que deverão ser perguntadas à Patrícia no momento certo

- SLA de aprovação do cliente em entregáveis.
- Quantidade/limite de alterações no cronograma, se houver.
- Se complexidade C1/C2/C3 ainda faz sentido na CALI.
- Regras de funcionamento e encerramento automático do timer.
- Se interações externas contam no pacote de horas.
- Thresholds padrão de alertas de horas.
- Prazo e lembretes para ciência do relatório.
- Relação entre relatório mensal e e-mail de cobrança.

Não implementar essas decisões por inferência.