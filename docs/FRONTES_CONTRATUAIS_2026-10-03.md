# Frentes contratuais · CALI Workspace

**Fonte:** `CALI Workspace — Pacotes, Frentes e Comportamento de Upsell.pdf`, recebido da Pati em 03/10/2026; conferir também a Matriz CALI v3. **Autora da implementação:** Codex. **Aprovação visual e funcional:** pendente da Pati.

## Regra implementada

- A empresa tem um único plano registrado em `companies.service_plan`: Partner, Full, Build Essencial ou Build Completo. O núcleo do Partner e do Full é derivado do plano, sem cadastrar linhas artificiais em cada cliente.
- A tabela `front_catalog` define o catálogo. `company_fronts` registra apenas ativações explícitas por empresa, com modalidade, escopo, data e histórico de encerramento. Isso **não** usa `project_workstreams`, que continua descrevendo a execução de projetos.
- Partner: nenhuma frente adicional incluída; até uma frente recorrente paga por vez. Full: até uma frente adicional incluída e uma paga por vez. Atração e Seleção é por vaga identificada, para desenho e supervisão, sem sourcing operacional. Marca Empregadora e projetos pontuais não consomem esses slots.
- Build Essencial: uma frente em implantação assistida por vez. Build Completo: várias. A configuração impede tratar Build como um plano recorrente com os slots do Partner/Full.
- RLS: cliente lê somente a própria empresa; só administradora ativa ou encerra. O gatilho valida plano, elegibilidade e capacidade sob bloqueio da empresa. Mudança de plano com frente ativa exige encerrar essas ativações primeiro.
- Cliente: página `Frentes` acessada pelo **botão do top bar** (com tooltip do plano); núcleo em linha única, opções fora do escopo agrupadas por categoria. Frentes contratadas à parte (Partner/Full) saem da página e viram um atalho com contador na barra superior, que abre um modal próprio — a página só mostra essa seção inline para planos Build, onde é o conteúdo principal ("Em implantação"). Interesse abre o modal padrão do Workspace e WhatsApp com mensagem preenchida; não altera plano, não cobra e não cria pedido comercial no banco. **WhatsApp:** o CTA de interesse usa o número administrativo **41 8787-9244**, não o pessoal da Pati (41 98779-1933) — upgrade e dúvidas de escopo são ADM. Admin: aba `Frentes` na ficha da empresa para registrar o escopo contratado.

## Limites desta primeira entrega

- Não ativar frente para a empresa de teste sem contrato/aditivo correspondente. A implantação da migração deixou `company_fronts` vazia.
- Os processos e políticas mensais de Partner (1) e Full (até 2, ou projeto maior trimestral) continuam regidos pelo contrato e não foram convertidos em contador automático nesta tela.
- O desenho de checkpoints e revisões do Build requer especificação própria. A página mostra a frente ativada, sem fingir que já acompanha etapas de execução.
- Sinal de interesse agregado para a administradora é backlog do PDF, seção 10. A conversa via WhatsApp ainda não registra intenção no banco.
- Termo de adesão ao Workspace é decisão separada: nenhum plano autoriza coleta de dados pessoais automaticamente. A nova página não dispensa a formalização do acesso e da privacidade já descrita em `EQUIPE_EMPRESA_SPEC_2026-10-01.md`.
- Validado por `npm run check` e estrutura/RLS no Supabase. Ainda falta clique autenticado real em dia/noite/mobile e confirmação do conteúdo e desenho pela Pati.
