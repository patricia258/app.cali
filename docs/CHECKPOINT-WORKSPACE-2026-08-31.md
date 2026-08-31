# CALI Workspace — checkpoint de estabilidade

Data: 31/08/2026

Este checkpoint registra o estado aprovado antes da revisão aprofundada da página **Documentos**.

## Regra de não regressão

- Preservar os fluxos já aprovados de Clientes, Projetos, Mapa de People, autenticação, perfil e sidebar.
- Não substituir páginas aprovadas por versões simplificadas ou previews antigos.
- Ajustes visuais devem ser isolados e não podem alterar regras de negócio ou integrações existentes.
- Modais devem respeitar o padrão global do Workspace: centralização, backdrop/blur cobrindo toda a interface, footer dentro da moldura, margens seguras e scroll interno quando necessário.
- Foto da pessoa e logo da empresa são a identidade primária nas molduras. Iniciais são apenas fallback quando não houver mídia cadastrada.
- Nenhum runtime visual pode remover, substituir ou inserir filhos diretamente em elementos controlados pelo React. A camada de identidade usa apenas estilos/classes na moldura existente.

## Navegação e estabilidade

Em 31/08 foi identificado no browser o erro `NotFoundError: Failed to execute 'removeChild' on 'Node'` ao trocar de página. A causa foi localizada na camada de identidade que utilizava `replaceChildren`/alteração de `textContent` em nós renderizados pelo React.

Correção aplicada:
- `src/lib/identityMediaRuntime.ts`: identidade visual sem mutação da árvore React.
- `src/identity-media.css`: foto/logo aplicada como background da moldura existente.

Deploys da correção concluídos como `READY` em produção.

## Clientes — estado preservado

A página atual `AdminClientsPageV3.tsx` mantém exatamente o mesmo blob (`692c7602145017cd418b702c354cca6e476c942d`) do checkpoint de 29/08 após o ajuste final do modal. Portanto, a construção aprovada de Clientes não foi sobrescrita pelos trabalhos posteriores.

Itens preservados no modelo atual:
- dados cadastrais, decisor e aniversário;
- endereço, filiais, serviço e horas contratadas;
- CALI Partner / CALI Full;
- contrato, vigência e renovação;
- financeiro, valor, recorrência e vencimento;
- multa por atraso e juros diários;
- multa de encerramento e regras de cálculo/pagamento;
- registro de distrato;
- automações de boas-vindas, cobrança, atraso, notificação extrajudicial, aniversário e encerramento;
- abas de operação, comunicações e histórico;
- documentos/contrato/aditivo e contexto de Drive;
- ações de bloquear, arquivar, encerrar e reativar.

## Projetos — estado preservado

Permanece a estrutura aprovada:
- cronograma → frentes → entregáveis → subtarefas;
- CALI Partner / CALI Full;
- MC1 / MC2 / MC3;
- status e histórico com data/hora;
- impactos por atraso do cliente;
- até 3 ajustes antes de rebriefing;
- timer e horas;
- conversa cliente / interna e reações;
- roadmap com identidade CALI;
- foto/logo nas molduras de identidade quando cadastradas.

## Mapa de People — estado preservado

Permanece integrado ao Workspace, mantendo:
- respostas da base original;
- revisão administrativa;
- edição do relatório;
- relatório integral;
- impressão/PDF no padrão aprovado;
- fluxo de WhatsApp;
- envio de relatório por e-mail;
- status e histórico;
- identidade visual integrada ao Workspace.

## Sidebar / perfil — estado aprovado

- Sidebar dia e noite preservados.
- Ilustrações CALI preservadas.
- Perfil funciona aberto e fechado.
- Foto quadrada cadastrada pelo próprio perfil.
- Sidebar fechado mantém o tamanho aprovado.
- Sidebar aberto usa foto com respiro adequado entre avatar, nome e cargo.

## Documentos — baseline encontrado antes da revisão

A rota `/admin/documentos` está ativa e aponta para `AdminDocumentsPage`.

O baseline atual já contém:
- Storage privado;
- upload do arquivo principal;
- upload de capa;
- protocolo automático `CALI-DOC-*`;
- cliente;
- categoria;
- tipo documental;
- versão;
- descrição/contexto;
- publicação para o cliente;
- solicitação de ciência;
- origem Workspace / Google Drive;
- registro no `activity_log`;
- rollback dos uploads caso o salvamento falhe.

Próximo passo: auditar e evoluir **Documentos** sem desmontar este baseline e cruzar com o fluxo completo já definido para biblioteca, comentários, versões, Drive, cliente e histórico.
