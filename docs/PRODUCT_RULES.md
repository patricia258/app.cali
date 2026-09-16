# CALI Workspace · Regras de produto

Este arquivo registra decisões confirmadas para evitar que a plataforma volte a herdar complexidade do antigo Azumi Connect.

## Princípio

**CALI administra. O cliente acompanha, participa, valida e avalia.**

A CALI Workspace não é um SaaS de RH para o cliente operar. É o ambiente compartilhado de execução e relacionamento entre a CALI RH e cada cliente.

## Acessos

- Dois perfis na primeira versão: `admin` e `client`.
- Patrícia Lima é a administradora da CALI.
- Um único acesso principal ativo por empresa cliente.
- O cliente não cria senha: acesso por Magic Link/OTP do Supabase.
- O isolamento entre empresas é obrigatório no banco por RLS; nunca apenas por filtro de interface.

## Navegação

### Administração

Visão geral · Clientes · Projetos · Horas · Calendário · Documentos · Relatórios

### Cliente

Início · Cronograma · Entregáveis · Horas · Documentos · Relatórios

## Projetos, cronograma e entregáveis

A lógica-base aproveitada do Connect é mantida, mas simplificada para a realidade CALI:

1. CALI estrutura o cronograma.
2. O cronograma passa pelas validações necessárias e se torna projeto vigente.
3. Cada entregável é executado e registra horas.
4. Antes de chegar ao cliente, a CALI faz a revisão interna.
5. O cliente pode **Aprovar** ou **Solicitar ajuste**.
6. Ajuste exige comentário contextual.
7. Ao aprovar, o entregável se torna imutável no fluxo normal.
8. A aprovação dispara a pesquisa de satisfação do entregável.
9. NPS de 1 a 3 exige justificativa; 4 e 5 permitem comentário opcional.
10. Todo histórico relevante alimenta o relatório mensal.

O antigo prazo automático de 72 horas não deve ser transformado em regra definitiva da CALI sem nova confirmação da Patrícia. A arquitetura pode suportar SLA configurável.

## Horas

Horas são parte central da transparência do serviço, não uma ferramenta de controle de ponto.

- Timer e lançamento manual.
- Uma sessão de timer ativa por administradora na primeira versão.
- Hora manual exige justificativa interna; o cliente vê a hora, mas não a justificativa interna.
- Interações relevantes por WhatsApp, e-mail, ligação ou reunião podem ser registradas como horas/interações quando fizerem parte do serviço.
- O consumo deve ser acompanhado por ciclo de serviço, preservando histórico de meses/ciclos anteriores.
- Alertas padrão previstos: 70%, 85% e 100%, configuráveis por ciclo.
- O alerta ao cliente sempre identifica o ciclo/serviço e apresenta consumido, contratado e saldo.

## Relatório mensal

O relatório nasce dos dados registrados na operação e depois recebe a leitura executiva da Patrícia.

O sistema deve pré-montar:

- entregáveis concluídos e em andamento;
- horas por projeto/entregável/frente;
- decisões e validações do cliente;
- ajustes solicitados;
- reuniões e marcos do período;
- NPS e comentários;
- pendências e próximos passos.

A Patrícia complementa com interpretação executiva, riscos, recomendações e direção do próximo ciclo. O texto nunca deve parecer uma colagem automática de eventos.

## Documentos e Google Drive

- Supabase Storage privado é a origem segura para arquivos gerenciados pelo Workspace.
- A CALI pode conectar um Google Drive para arquivamento/sincronização.
- O cliente também poderá conectar o Drive da própria empresa e escolher salvar uma cópia de entregáveis/relatórios finais.
- Tokens OAuth nunca ficam no frontend nem expostos pelas tabelas visíveis ao cliente.
- A plataforma mantém referência do arquivo sincronizado, status e link externo.
- Relatórios publicados devem poder ser arquivados automaticamente no Drive configurado.

## Comunicação

Não criar um chat genérico como produto paralelo. Conversas ficam no contexto em que fazem sentido:

- entregável;
- relatório;
- evento;
- documento quando necessário.

E-mail é usado apenas para eventos que merecem interromper o cliente: convite de acesso, validação necessária, ajuste, mudança importante de reunião/prazo, alerta de horas e relatório publicado.

## Escrita da interface

A escrita é parte do produto.

- Português natural, direto e executivo.
- Evitar frases genéricas de SaaS e clichês de IA.
- Evitar excesso de exclamações, emojis e textos motivacionais.
- Dizer exatamente o que aconteceu, quem precisa agir e qual é o próximo passo.
- Alertas devem informar a empresa/ciclo/entregável; nunca mensagens vagas como “80% consumido”.

## UX e acessibilidade

- Corpo de texto: mínimo confortável de 16 px como padrão.
- Textos auxiliares não podem virar microtexto ilegível para caber em card.
- Áreas clicáveis/touch: aproximadamente 44 px ou mais.
- Desktop, notebook, iPad e celular fazem parte do escopo desde o início.
- Não depender de hover para ação essencial.
- Loading e estados vazios devem explicar o que está acontecendo.
- Animação apenas quando ajuda a compreender transição; nunca para enfeitar ou tornar a interface lenta.

## O que não entra nesta versão

Não herdar do antigo Connect: recrutamento completo, Hub de colaboradores, DP, jurídico, contabilidade, folha, gamificação, múltiplos perfis internos, billing/boletos ou módulos de SaaS que não fazem parte da dinâmica CALI-cliente.
