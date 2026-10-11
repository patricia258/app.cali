# CALI Workspace — migração visual V2, homologação

## Estado atual

**Parcial e bloqueada na validação visual. Nenhuma página certificada como equivalente à V2.** A home foi refatorada estruturalmente nesta etapa. A experiência completa do cliente ainda não está concluída. A administradora não recebe novas refações antes da comprovação do cliente.

- Oficial: `patricia258/app.cali`.
- Branch: `feat/client-visual-v2-inplace-20261008`.
- Base operacional: `7d817c3d64e3839eb10475233b4e43b92a9914cb`.
- Referência aprovada: `patricia258/cali-workspace-v2@7c0a2323bb221cfd61c0a8ed4ced8670c05cce78`.
- Primeira etapa estrutural: commit `823cce7ab1c04d843d21bfbcc83caf8d351b9935`, Vercel `dpl_612cyfWyHB7nwRAut9yitTXQGqSM`, **READY**, `target: null`.
- Prévia estável da branch, aberta e verificada no navegador: https://app-cali-git-feat-client-visual-v2-inplace-20261008-cali11.vercel.app/login

O link estável acompanha os próximos commits de homologação; READY certifica publicação/build, não equivalência visual ou regressão funcional.

## Alterações da página inicial

O JSX antigo foi substituído em lugar, sem uma implementação paralela. Composição e classes derivadas do `ClientHome.tsx` e `client-home.css` aprovados:

- Saudação e responsável CALI, contratação, três painéis executivos independentes.
- Quadro de Avisos à esquerda, Mini Equipe à direita.
- Documento e ocorrência mais recentes.
- Em Movimento na coluna maior; Agenda Compartilhada acima de Próxima Decisão na lateral.
- Janela e botão “Fale com a Pati”, mantendo tipos de mensagem, respostas automáticas, validação, envio e confirmação reais.
- Cabeçalho global separado da barra de módulo, rail cliente de 56 px; editor de perfil no topo. Agendamento, frentes, relatórios, tema, notificações, logout e bridges permanecem disponíveis.

Estados sem informação exibem indisponibilidade/ausência, sem trazer exemplos fictícios da V2 nem transformar falta de sessão em contagens reais.

## Fontes e dependências

| Bloco | Origem oficial | Limite |
|---|---|---|
| Contratação, métricas, documentos, ocorrências, agenda, projeto | Consultas e cálculos anteriores do dashboard | Ainda sem comprovação autenticada nesta execução |
| Próxima Decisão | Primeira entrega real em `client_review`, acesso aos entregáveis | Estado vazio se não houver validação pendente |
| Mini Equipe | Leitura de `team_members`, empresa do dashboard autenticado, paginação de 500 | Seleção apenas de id/nome/área/admissão/status/categoria do afastamento/arquivamento; RLS intacta |
| Férias/afastamentos | `status` + categoria `leave_reason` já existentes | Sem informações médicas ou dados privados |
| Aniversário de empresa | `admission_date`, mês/ano em São Paulo | Somente datas existentes |
| Aniversário pessoal | Nenhuma data de nascimento no cadastro profissional auditado | Estado explícito indisponível; nenhum novo campo criado |
| Avisos e ciência | Não encontrada fonte/módulo persistido no oficial | Card vazio, mural indisponível; sem consulta inventada, ciência fictícia ou escrita de banco |

## Comparação visual

A V2 foi executada no deployment aprovado e observada em viewport **1363 × 936**. Referência salva em `docs/visual-v2/inicio-v2-referencia-20261009.jpg`.

Medidas observadas no estado demonstrativo aprovado:

| Elemento | x / y | largura × altura (px) |
|---|---|---|
| Barra do módulo | 91 / 87 | 1222 × 70 |
| Saudação | 100 / 185 | 1204 × 84,84 |
| Contratação | 98 / 287,84 | 1208 × 148 |
| Indicadores | 98 / 448,84 | 1208 × 142,89 |
| Avisos + Mini Equipe | 98 / 608,73 | 1208 × 383 |
| Documentos + ocorrências | 98 / 1008,73 | 1208 × 160 |
| Em Movimento + lateral | 98 / 1181,73 | 1208 × 344,09 |

**A nova integração não foi capturada após o deploy.** O login real ofereceu e-mail/código de uso único; o e-mail foi submetido pela entrada segura. Na etapa seguinte, o navegador retornou `declined: user_took_over`. O estado final da sessão é desconhecido.

A revisão automática bloqueou a leitura da página e também a tentativa de inspeção sem navegação, alegando risco de perder o estado após a tomada de controle pelo usuário. Não foram usadas novas abas, comandos indiretos, armazenamento de sessão ou outro contorno. Retomar a leitura da página requer liberação desse bloqueio.

Não há comparação lado a lado válida entre o novo commit e a V2. As capturas anteriores `inicio-corrigido.jpg`/`referencia-aprovada.jpg` documentam apenas a etapa anterior de CSS e **não são prova deste JSX**.

## Verificações

- `npm run check`: TypeScript e Vite build aprovados na etapa estrutural; repetidos após ajustes finais de estados vazios/tema.
- `node scripts/verify-v2-operation.cjs`: 271 fontes operacionais auditadas com a base. Para os dois arquivos com JSX refatorado, compara via AST todas as declarações fora da apresentação e exige cada binding anterior de ação, valor, navegação e progresso. Demais TS/TSX/SQL existentes continuam iguais, salvo imports/atributos visuais previamente autorizados.
- `git diff --check`: aprovado.
- CSS canônico analisado com PostCSS; quatro versões antigas da home continuam removidas. A composição antiga foi retirada do dashboard e 97 seletores sem uso removidos de arquivos compartilhados.
- Revisão React: hooks fora de condicionais, limpeza de leitura assíncrona, chave por empresa para evitar exibição transitória da equipe anterior, navegação/labels/controles reais preservados. Não introduzidas bibliotecas de interface nem alterações de dependências.

Essas verificações certificam build e preservação de código/bindings; **não substituem teste funcional autenticado**. Nenhuma funcionalidade existente foi removida do código, mas preservação integral em execução ainda exige regressão.

## Próximas páginas e critérios

| Página | Situação desta etapa |
|---|---|
| Início | Estrutura refatorada; comparação e operação autenticada bloqueadas |
| Calendário | Estrutura oficial preservada; transporte JSX V2 e comparação ainda pendentes |
| Equipe, estrutura, movimentações e indicadores | Idem; depende de sessão real para renderizar todos os estados |
| Horas | Idem, incluindo meses com visibilidade diferente |
| Ocorrências e conversas | Idem, incluindo formulários, anexos e histórico |
| Projetos, frentes, cronograma e entregáveis | Idem, incluindo aceite/ajuste/subtarefas/histórico |
| Documentos | Idem, incluindo versões, ciência, comentários e Drive |
| Relatórios | Idem, incluindo período, versões, ciência e PDF |
| Administradora | Não iniciar nova refação antes de comprovar todo o cliente |

Antes de declarar qualquer página concluída: executar os dois aplicativos em viewport e estado equivalentes; capturar e comparar; corrigir diferenças; testar filtros, formulários, teclado/foco, permissões e fluxos com conta apropriada. A prévia sem sessão e os dados fictícios da referência não certificam isolamento entre empresas.

O teste sintético `scripts/verify-visual-v2.cjs` da etapa anterior não foi executado: instalação do Chromium falhou com arquivo inválido/vazio. Não contá-lo como teste aprovado.

## Restrições respeitadas

Somente preview na branch solicitada e no projeto oficial Vercel. Sem merge em principal, publicação em produção, novo aplicativo, alteração de banco/RLS/Auth/integrações, envio de mensagens de teste ou mudança de dados/históricos. A prévia não garante banco isolado; testes de escrita não serão tratados como seguros somente por estarem em um deployment preview.
