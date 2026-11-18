# CALI Workspace · Regras de produto

Atualização em 11/11/2026. Este arquivo registra o comportamento esperado no app.cali após a consolidação. A implementação e o aceite de cada fluxo são verificados separadamente. O código e as telas do app.cali são a base da evolução. A V2 fornece regras, contratos e soluções para reaproveitamento conforme o fluxo.

## Princípio

**CALI administra. O cliente acompanha, participa, valida e avalia.**

O Workspace é o ambiente compartilhado de execução e relacionamento entre a CALI RH e cada cliente.

## Acessos e ficha da empresa

- **Admin** conduz a operação CALI, decide ajustes e libera conteúdo. **Cliente** participa das operações autorizadas da própria empresa. **Partner interno** atua apenas em trabalhos atribuídos. CALI Partner também identifica um plano comercial.
- Cada empresa pode ter até quatro acessos Cliente equivalentes. Qualquer um pode manter a própria Equipe. A indicação de pessoa focal serve para comunicações operacionais. Os poderes de acesso decorrem do perfil. Cadastro de colaborador da Equipe e conta de acesso são registros separados.
- A empresa adere ao Workspace mediante formalização própria registrada antes do convite. A adesão é opcional e o serviço contratado segue se a empresa não aderir. O aceite individual dos termos é versionado, obrigatório no primeiro acesso e a cada nova versão. Falha na verificação bloqueia a entrada.
- O Cliente entra por código. Admin deve cadastrar e confirmar o segundo fator antes de acessar a área administrativa, inclusive no primeiro uso. Falhas mantêm o acesso bloqueado e permitem tentar de novo. O backend aplica vínculo, papel, aceite e validade da sessão em operações protegidas.
- A CALI gerencia a empresa em uma ficha organizada em abas. O pré-cadastro pede somente os dados do Cliente. A CALI completa a ficha e confere os campos obrigatórios e o contrato assinado vigente. O link de pré-cadastro tem validade de sete dias e sua reemissão invalida o anterior. A liberação confirma a ficha e os acessos juntos, com rollback se houver falha parcial.
- A checagem de ficha e contrato vale na liberação de acesso. A transição preserva o vínculo e o estado dos acessos já liberados. Lacunas de cadastro legado ficam visíveis para saneamento da CALI.
- Na ficha, Patrícia é a responsável CALI. A CALI pode designar um Partner de apoio com vínculo elegível à empresa. A designação alimenta o Início do Cliente. As permissões de trabalho continuam vinculadas às atribuições.

## Navegação

Admin acompanha a operação pela Visão geral, Clientes, Projetos, Horas, Calendário, Documentos e Relatórios. Cliente acompanha o trabalho pelo Início, Cronograma, Entregáveis, Horas, Documentos e Relatórios, conforme seu acesso.

O Início mostra plano contratado, Patrícia e, quando designado, o Partner de apoio. O atendimento começa em Ocorrências, com um assunto por conversa. Remover a caixa de mensagem do Início e preservar o histórico anterior.

Minha conta reúne pedidos sobre dados pessoais e a consulta e o aceite dos Termos. Login e Minha conta usam o mesmo e-mail institucional de ajuda. Instagram e LinkedIn da CALI ficam em Sobre a CALI.

## Equipe da empresa e métricas

- Admin e Cliente podem informar e consultar os campos privados de Equipe dentro de seu escopo. Para Cliente, o escopo é sempre a própria empresa. Campos privados incluem remuneração, revisão salarial, gênero e filhos.
- Cliente lança as métricas mensais pela primeira vez. Depois do lançamento, somente Admin pode corrigir, com histórico. Pedidos de preenchimento mensal aparecem apenas para Cliente.
- A [especificação de Equipe](EQUIPE_EMPRESA_SPEC_2026-10-01.md) conserva o desenho inicial. Para permissões e correções, valem as regras desta seção.

## Projetos, cronograma e entregáveis

1. A CALI estrutura o cronograma. Após validação, ele se torna o projeto vigente.
2. Cada entregável é executado e registra horas. A CALI faz revisão interna antes da apresentação ao Cliente.
3. O Cliente pode **Aprovar** ou **Solicitar ajuste**. Ajuste exige comentário contextual.
4. A aprovação fecha a revisão. Admin pode reabrir o mesmo item para correção, com motivo e histórico. O Cliente volta a ter acesso após nova liberação e deve aprovar a revisão corrigida.
5. A aprovação solicita a avaliação do entregável. Nota de 1 a 3 exige justificativa. Notas 4 e 5 permitem comentário opcional.
6. O histórico relevante alimenta o relatório mensal.

O antigo SLA automático de 72 horas depende de nova confirmação da Patrícia antes de virar regra. A arquitetura pode suportar SLA configurável.

## Horas

Horas são parte da transparência do serviço da CALI. Timer e lançamento manual registram o trabalho. A primeira versão permite uma sessão de timer ativa por administradora. Hora manual exige justificativa interna. O Cliente vê a hora conforme sua permissão. A justificativa fica restrita à CALI.

Interações relevantes por WhatsApp, e-mail, ligação ou reunião podem ser registradas como horas ou interações quando fizerem parte do serviço. Acompanhar consumo por ciclo e preservar histórico. Alertas de consumo previstos são 70%, 85% e 100%, configuráveis por ciclo. O aviso ao Cliente identifica ciclo ou serviço e mostra consumido, contratado e saldo.

Horas de Partner passam pela revisão ou aprovação da Patrícia. O cronômetro permanece visível durante a navegação. Inatividade prolongada gera aviso no Workspace e e-mail para Patrícia e para o Partner ou membro da equipe responsável.

Para homologação, a proposta é avisar após 25 minutos sem sinal e pausar após 30 minutos. O comando **Continuo aqui** renova o sinal no servidor. A pausa preserva o trecho registrado. Se a plataforma fechar com o cronômetro ativo, o Partner recupera o trecho, justifica e propõe o ajuste. A aprovação define o lançamento e preserva o registro original.

## Relatório mensal

O relatório nasce dos dados da operação. O sistema pré-monta entregáveis concluídos e em andamento, horas por projeto, entregável e frente, decisões, validações do Cliente, ajustes, reuniões, marcos, avaliações, pendências e próximos passos. Patrícia complementa com interpretação executiva, riscos, recomendações e direção do próximo ciclo.

Admin pode reabrir o mesmo relatório para correção, com motivo e histórico. A versão em revisão fica indisponível ao Cliente. Após nova liberação, uma nova ciência só é exigida quando Admin solicitar. Relatórios incluem assinatura virtual, foto da Patrícia e protocolo `CALI-TIPO-AAAA-NNNNNN`, vinculados à revisão aprovada.

## Materiais, propostas e avisos

- Patrícia revisa relatórios, propostas e devolutivas preparados pelo Partner. O material de autoria da Patrícia segue para envio direto. Para enviar ou reenviar, a interface pede duas confirmações em sequência, “Deseja enviar?” e “Tem certeza?”. Cancelar qualquer confirmação encerra a tentativa antes de chamar o envio.
- Entregar de fato a revisão confirmada ao destinatário autorizado. Registrar geração, aprovação, liberação e envio como eventos distintos, com autor, revisão e resultado.
- Para relatório, escolher acessos ativos da empresa. Para proposta, usar o contato salvo no briefing. Para devolutiva do Mapa, usar o endereço da resposta consentida. Reenvio de proposta ou devolutiva reutiliza o PDF oficial da revisão quando arquivado.
- Propostas são preparadas, enviadas e acompanhadas no Workspace. Os formulários de resposta continuam no portal do Cliente. As respostas ficam reunidas em uma área Admin do Workspace, com vínculos e histórico preservados.
- No primeiro rollout, o Partner autorizado prepara Avisos e submete à revisão da Patrícia. Ela devolve para ajuste ou aprova a publicação. Antes da aprovação, o aviso permanece interno. Após a aprovação, publicar uma vez para o público autorizado.

## Ocorrências, histórico e satisfação

- Cada ocorrência atende um assunto. O histórico cronológico por empresa abre a ocorrência ou entrega correspondente, com mensagens, arquivos, horas e aprovações conforme as permissões do papel.
- Cada encerramento de ocorrência visível ao Cliente gera uma solicitação de avaliação distinta, inclusive após reabertura. Preservar avaliações anteriores e vincular cada resposta ao encerramento correspondente. A repetição do mesmo encerramento reutiliza a solicitação já criada.
- Admin acompanha tendência, notas baixas e avaliações positivas. Tela e PDF usam os mesmos recortes, com empresa e mês selecionados por padrão, e permitem consultar todo o histórico da empresa. Separar solicitações respondidas, aguardando e encerradas sem resposta. Admin registra quando encerrar a espera. Ausência de resposta fica fora da média.

## Documentos e Google Drive

- Supabase Storage privado é a origem dos arquivos gerenciados pelo Workspace.
- A CALI pode conectar o Google Drive para arquivamento e sincronização. O Cliente pode conectar o Drive da própria empresa e escolher salvar uma cópia dos materiais finais autorizados.
- Tokens OAuth ficam em ambiente restrito do backend. A plataforma mantém referência do arquivo sincronizado, status e link externo.
- Relatórios publicados devem poder ser arquivados automaticamente no Drive configurado.

## DISC e formulários públicos

| Relatório DISC | Público | Entrega |
| --- | --- | --- |
| Respondente | Próprio respondente | PDF por e-mail e tela de agradecimento após a resposta |
| Avaliador | Equipe interna CALI | Consulta interna |
| Gestão | Gestão da empresa, após aprovação e liberação CALI | Aplicativo e aviso por e-mail para empresa com conta. PDF por e-mail para o gestor de empresa sem conta |

- Metodologia e cálculos DISC ficam restritos à CALI. Gestão exige cinco respostas, usa linguagem qualitativa entre cinco e 14 e preserva o anonimato. Aprovação exige o resultado buscado pela empresa e parecer da Patrícia. Mudança de conteúdo exige nova aprovação e liberação, com histórico.
- Convite DISC vence em sete dias, no fim do dia em Brasília. Enviar até três lembretes, de segunda a sexta, das 8h às 18h. Avisar a pessoa focal na véspera e no encerramento da campanha.
- Preservar links de convite, progresso, descadastro e continuidade das respostas. Link antigo de relatório individual abre a tela de agradecimento e orienta o contato com a CALI. A recuperação ou a nova geração do PDF ocorre em área restrita, conforme o acervo disponível, para entrega ao próprio respondente após conferência da identidade.
- Preservar links e dados de formulários públicos, validação condicional, anexos e continuidade. A operação Admin inclui compartilhamento, triagem, exportação e recuperação conforme os vínculos existentes.

## Comunicação

Conversas ficam vinculadas à ocorrência, ao entregável, ao relatório, ao evento ou ao documento pertinente. Mensagem de conversa fica no aplicativo. Atrasos e menções com `@` avisam a pessoa pertinente.

E-mail é usado para eventos que pedem atenção do destinatário, como convite de acesso, validação necessária, ajuste, mudança importante de reunião ou prazo, alerta de horas e envio de material.

### Resumo diário CALI

Enviar o resumo às 19h de Brasília, inclusive fins de semana, aos Admins ativos quando houver atividade elegível. Organizar por empresa, com empresas mais movimentadas primeiro. Exibir os blocos **O cliente fez** e **A CALI fez**, nesta ordem, horas por empresa e total geral. Cada item traz horário, título, até 180 caracteres e link. Exibir até 12 itens por bloco e indicar o excedente. Os totais incluem itens além do limite visual.

O bloco do Cliente reúne dados do mês, aprovações, respostas, documentos e solicitações que geraram aviso à CALI. O bloco da CALI reúne entregáveis, relatórios liberados e lembretes que geraram aviso ao Cliente.

Usar os eventos elegíveis do dia disponíveis no horário do envio. Excluir mensagens de conversa, avisos internos da equipe e pendências antigas. Cliente e equipe interna ficam fora da distribuição. O conteúdo e as empresas abrangidas por um resumo Partner serão definidos à parte. O resumo de conversas das 8h permanece desativado.

## Privacidade e encerramento

- Documentar finalidade, leitores autorizados e guarda dos dados, inclusive campos de Equipe. Apresentar essas informações no acesso e registrar o aceite da versão.
- Concluir a eliminação dos dados da empresa em até **30 dias corridos do encerramento efetivo do contrato**. A exportação, quando aplicável, e o preparo da eliminação cabem nessa janela. A guarda residual exige fundamento, escopo, acesso e prazo próprios.
- Alinhar termos, política, telas e executor à regra de 30 dias. Conferir contratos e aditivos assinados para orientar a transição de cláusulas legadas. Os 45 dias em textos e SQL descrevem o estado legado.

## Escrita da interface

- Português natural, direto e executivo, com a voz CALI.
- Dizer o que aconteceu, quem precisa agir e qual é o próximo passo.
- Alertas identificam a empresa, o ciclo ou o entregável.

## UX e acessibilidade

- Corpo de texto de 16 px como referência. Áreas de toque de aproximadamente 44 px ou mais. Ações essenciais acessíveis por teclado e toque.
- Desktop, notebook, iPad e celular participam do aceite. Controles preservam acesso em largura estreita. Usar rolagem discreta que preserve indicação de conteúdo adicional.
- Tema claro em Admin e Cliente. Usar tokens CALI para espaçamento, alertas, cantos e hierarquia de metadados. Alertas incluem texto e ação. A cor complementa a mensagem.
- Preservar a apresentação dos diálogos atuais, com foco, teclado e confirmação do objeto e do efeito da ação. Cadastros usam uma ficha com seções. Preservar etapas funcionais de importação, prévia e confirmação.
- Fotos e logos quadrados com cantos de 7 px. Folha e lima seguem os assets oficiais. PDFs usam Inter, com verificação de fonte e fallback.
- Estados de carregamento e vazio explicam a situação. Usar animação quando ela ajudar a compreender a transição.

## Limites do produto

O Workspace cobre a dinâmica CALI-cliente. Recrutamento completo, Hub de colaboradores, DP, jurídico, contabilidade, folha, gamificação e billing ficam fora deste escopo.

## Assessoria Estratégica Mensal · termos comerciais oficiais

Atualização confirmada em **21/09/2026**. Esta seção substitui prazos mínimos anteriores registrados em materiais antigos.

### CALI Partner

- Contrato mínimo: **8 meses**.
- Renovação automática; reajuste a cada 12 meses.
- Formato: **100% online**. Visita presencial somente sob solicitação, com custo adicional.
- Dedicação: **10 a 15h/mês**.
- Ritmo principal: **mensal**.
- Escopo-base vigente: reunião mensal com founders/diretoria ou RH; leitura mensal de indicadores-chave; orientação de DP sem execução; apoio a decisões críticas; direção estratégica de pessoas e DHO; **1 ajuste ou desenho de política/processo por mês, não cumulativo**.

### CALI Full

- Contrato mínimo: **12 meses**.
- Renovação automática; reajuste a cada 12 meses.
- Formato: **1 visita presencial fixa por mês**. Referência atual: Curitiba e Região Metropolitana, sem custo adicional até 10 km.
- Dedicação: **20 a 25h/mês**.
- Ritmo principal: **quinzenal**.
- Escopo-base vigente: tudo do CALI Partner, mais Cargos e Salários; People Analytics nível 3; Treinamento e Desenvolvimento conforme necessidade; Saúde Ocupacional e Conformidade; acompanhamento mais próximo da liderança; até **2 ajustes/desenhos de política ou processo por mês**, ou **1 projeto/treinamento estrutural maior por trimestre**. Pode incluir desenho do processo de Atração e Seleção quando necessário, nunca a operação de abrir vaga ou fazer sourcing.

### Regra de comunicação pública

- Não publicar preço fixo dos pacotes.
- A landing page, o site, o Portal e as propostas devem usar **8 meses para Partner** e **12 meses para Full**.
- Em caso de conflito com documento anterior, estes termos de 21/09/2026 prevalecem.
