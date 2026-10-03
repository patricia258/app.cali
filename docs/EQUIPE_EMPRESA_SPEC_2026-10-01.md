# Equipe da empresa e acessos · desenho inicial

## Handoff · 03/10/2026 · Codex · refinamento visual aguardando conferência

- Retirado o título grande “Equipe” da página. A identidade da empresa ganhou uma moldura discreta, logo maior e resolução de mídia privada pelo mesmo mecanismo usado nas outras telas; há inicial como fallback se o arquivo falhar.
- A ficha da liderança mostra os liderados em tabela com pessoa, cargo/área, admissão, tempo de casa e situação. A última admissão aparece no resumo; não há segunda lista com os mesmos nomes. Vínculos anteriores ficam em tabela própria. A ficha amplia apenas nessa aba e mantém deslocamento horizontal na tabela em telas estreitas.
- Ações da ficha têm altura compacta e contorno visível; o botão diz apenas “Arquivar ficha”, com a explicação abaixo. O período dos indicadores virou uma nota curta com referência em destaque e regra de data efetiva.
- Sem alteração de banco, cálculo ou permissão. `npm run typecheck` e `npm run build` passaram. Ainda requer conferência autenticada com dados da empresa, em desktop e mobile, nos temas dia e noite. **Não aprovado pela Pati ainda.**

## Handoff · 03/10/2026 · Codex · aguardando conferência da Pati

- Quadro geral: cabeçalho do cliente com logo/nome da empresa, mês ou intervalo de referência no canto direito, lembrete mensal compacto e indicadores concentrados na aba Indicadores.
- Leitura em lista ou por liderança: os grupos usam `is_leader` e `manager_code` reais; pessoas sem gestor permanecem visíveis. A estrela junto ao avatar identifica líderes nas duas visualizações e na ficha.
- Ficha do líder: abas Dados, Liderados e Histórico. Os liderados ativos são ordenados pela data de admissão crescente; a seção de desligados ou transferidos consulta o vínculo atual e os retratos mensais existentes. A ficha mostra tempo de casa calculado a partir das datas registradas.
- Ações da ficha ficam na mesma linha no desktop e em duas colunas no mobile. Desligar abre confirmação antes do formulário; a gravação continua exigindo o salvamento explícito da ficha. Arquivar mantém a trilha histórica.
- O filtro de período aplica o intervalo ao histórico e aos gráficos; o quadro mostra a posição do mês final. Não altera os dados nem as regras da RPC. Validação local: `npm run typecheck` e `npm run build` passaram. **A interação autenticada, os dados reais e o visual mobile/dia/noite ainda precisam da conferência da Pati; não registrar como aprovado.**

**Pedido da Pati em 01/10/2026.** A página `Equipe e movimentações` foi implementada para administradora e cliente principal, com tabelas e políticas próprias no Supabase. Nenhum colaborador foi importado na implantação. O perfil de parceiro interno, o termo de adesão e a matriz comercial de indicadores ainda são projetos separados; o Workspace atual reconhece somente `admin` e `client` no banco.

**Estado da entrega:** `/admin/equipe` e `/cliente/equipe` mostram a mesma equipe por empresa, com filtro de mês, busca, colunas configuráveis, ficha, edição, CSV com prévia, histórico e indicadores calculados de meses confirmados. Salvar usa RPC transacional `save_team_month_v1`; cliente principal só grava sua empresa, administradora pode selecionar empresas. Linhas ausentes do CSV não desligam pessoas. Dados opcionais de remuneração, gênero e filhos ficam em tabela restrita à administradora, sem exportação geral; o avatar derivado aparece na lista. O PDF atual usa impressão do navegador da tabela filtrada, até aprovação do modelo de relatório. A autenticação e o convite existentes não passaram a exigir o termo; a adesão formal permanece pendente e deve ser concluída antes de coleta real em escala.

**Complemento da Pati, mesma data:** a ficha serve também para reconhecer pessoas citadas em reuniões com líderes, acompanhar movimentações e fundamentar People Analytics. O acesso ao Workspace é **opcional e contratado à parte por termo de uso**, não um benefício ativado automaticamente por qualquer plano. A minuta CALI Partner examinada não promete acesso automático à plataforma. Uma prévia visual sem dados inventados está em `docs/design/equipe-empresa-preview.html`.

## 1. Perfis e permissões

| Perfil na interface | Uso | Acesso previsto |
| --- | --- | --- |
| Administradora geral | Patrícia | Todas as contas e configurações CALI. Identificação visível no perfil e no menu. |
| Parceiro CALI (interno) | Profissional que atua com a CALI; **não** é o plano CALI Partner do cliente | Somente a empresa atribuída por Patrícia. Pode acompanhar projetos, ocorrências, calendário, ficha de pessoas e remuneração dessa empresa. Não vê contratos nem edita dados cadastrais/contratuais. |
| Cliente principal | Representante da empresa contratante | Somente sua empresa; envia e confere dados da equipe e as demais áreas contratadas. |

O parceiro interno exige migração de papel, atribuição explícita a empresas, políticas RLS e revisão de todos os fluxos de autorização. Uma etiqueta visual, sozinha, não concede nem restringe acesso. O princípio de um acesso principal por empresa permanece até decisão sobre acessos adicionais.

## 2. Onde isso entra

- **Cliente:** `Minha empresa > Equipe e movimentações`. No topo, mês de referência, total de pessoas ativas, entradas e saídas daquele mês e data da última confirmação. Abaixo, tabela com busca e agrupamento por departamento ou gestor. Uma ação principal: **Atualizar equipe**. Só aparece após adesão ao Workspace e assinatura do termo pela pessoa autorizada.
- **Administradora:** aba `Equipe` dentro da conta selecionada em Clientes, com o mesmo quadro e histórico por mês. Mostrar quem enviou, quem confirmou e diferenças pendentes. Uma visão entre empresas pode vir depois, sem misturar dados de clientes.
- **Dados da empresa:** razão social/nome, segmento, unidades, contato e plano devem reaproveitar o cadastro existente; evitar uma segunda fonte de verdade. **CNPJ e CEP da cliente ainda precisam ser verificados e acrescentados ao formulário atual**; o comprovante de CNPJ da CALI é da prestadora, não da empresa cliente. O total de colaboradores mostrado nessa ficha vem da equipe ativa no mês confirmado, com indicação clara da referência.

## 3. Cadastro mínimo de cada pessoa

| Campo | Regra inicial |
| --- | --- |
| Código interno do colaborador | Identificador estável da empresa ou gerado na primeira importação; preservado em promoções e transferências. Não usar só o nome para conciliar linhas. |
| Nome completo; data de admissão | Obrigatórios. E-mail corporativo e telefone profissional opcionais, para convites autorizados; não enviar testes automaticamente. |
| Cargo atual; senioridade; departamento/área; setor; gestor direto | Cargo, departamento e gestor obrigatórios para permitir agrupamento. Senioridade e setor opcionais. Gestor deve apontar preferencialmente para outro código da mesma empresa; aceitar revisão na importação. |
| Tipo de contratação; jornada semanal | Obrigatórios, com opções padronizadas e campo de observação quando necessário. |
| Situação e data de referência | Ativo, afastado ou desligado; a data efetiva define o mês em que a mudança aparece. Não pedir diagnóstico ou motivo médico. |
| Remuneração atual | Campo opcional solicitado e já decidido em planejamento anterior: visível para Patrícia e parceiro interno **atribuído a esta empresa**. Não mostrar ao cliente por padrão na tabela, nem incluí-lo em exportações gerais; definir com precisão o fluxo de envio e conferência do valor pelo representante autorizado. Última revisão salarial é opcional. |
| Identificação de gênero | **Opcional e autodeclarada**, com `Feminino`, `Masculino`, `Outra identificação` (abre texto livre opcional) e `Prefiro não informar` (não abre campo). Uma ficha ainda não respondida permanece `Não informado`; não inferir pelo nome, aparência ou documento. Texto livre fica restrito à ficha, não em gráficos por categoria. A empresa pode importar `Não informado` e convidar a pessoa a declarar, quando houver canal apropriado; não adivinhar a resposta. |
| Tem filhos? | **Opcional**, com `Sim`, `Não`, `Prefiro não informar` e estado `Não informado`. Não pedir nome, idade ou dados de filhos neste fluxo. A finalidade analítica e o acesso a essa informação individual exigem revisão antes da coleta real. |

Sugestões úteis, também opcionais: unidade/localidade e modelo de trabalho, para análises por unidade e para não confundir departamento com local. Não coletar CPF, endereço pessoal, data de nascimento ou dados de saúde apenas para montar este quadro.

## 4. Atualização mensal

1. O cliente escolhe o mês e baixa o **modelo CSV** ou uma cópia do último quadro confirmado. Também pode editar uma pessoa diretamente.
2. O upload valida formato, datas, códigos repetidos e referências de gestor. Exibe uma prévia com **novos, alterados, sem mudança e não encontrados no arquivo**. Comparar pelo código interno estável, nunca pelo nome sozinho. A lista de departamentos da empresa é reutilizada e nomes desconhecidos são propostos para revisão.
3. A ausência de uma linha no CSV **nunca desliga automaticamente** uma pessoa. O cliente marca a saída ou confirma que a linha foi omitida por engano.
4. Para cada mudança, o cliente informa tipo e data efetiva. Promoção pode alterar cargo e/ou senioridade; transferência pode alterar departamento e/ou gestor; contratação/jornada também podem mudar. Desligamento registra iniciativa (pedido da pessoa, empresa, fim de contrato ou outro), motivo em categorias objetivas, data e aviso prévio (trabalhado, indenizado, dispensado ou não se aplica). Texto livre fica opcional e breve.
5. Antes de publicar, a interface mostra um resumo das mudanças, pede confirmação e salva quem enviou e quando. A administradora vê a versão confirmada e o histórico, inclusive correções posteriores; números de meses anteriores não devem ser sobrescritos silenciosamente.
6. Se o mês ainda não foi atualizado, mostrar **Aguardando atualização de outubro**, sem inventar variação zero. Lembrete mensal pode ser configurado em outra etapa.

Na tabela: colunas de pessoa, cargo, departamento, gestor, vínculo, jornada, admissão e situação; filtros por mês, departamento, gestor, situação e tipo de contrato. As movimentações ficam em uma aba/visão do mesmo contexto, com resumo de origem e destino. No mobile, cada linha vira um resumo expansível com as mesmas ações.

**Colunas e retratos.** A referência visual enviada pela Pati em 01/10 usa avatar ao lado de nome, linha secundária e etiquetas de situação. A coluna `Pessoa` permanece visível; `Cargo`, `Departamento`, `Gestor` e `Situação` são a seleção inicial, e `Escolher colunas` permite mostrar/ocultar as demais sem perder os dados. Persistir a escolha por usuário e empresa; respeitar a mesma autorização no servidor, nas buscas e nas exportações. No desktop, manter nome fixo e usar deslocamento horizontal somente quando o usuário escolher mais colunas do que cabem; no celular, resumo e detalhes expansíveis. `Exportar PDF` terá modelo de relatório próprio em etapa posterior, com referência, filtros, cobertura e permissões; não exportar remuneração ou dados de gênero/família por acidente.

O avatar usa a mesma moldura sutil da CALI e aceita foto autorizada. **Proposta para atender à escolha da Pati:** sem foto, ilustração adulta feminina quando `Feminino`, masculina quando `Masculino`, e figura neutra quando `Outra identificação`, `Prefiro não informar` ou `Não informado`; a pessoa pode substituir a ilustração. Como o avatar pode revelar a declaração a quem vê a lista, revisar permissões e oferecer avatar neutro independente do campo antes de ativar a associação automática. Nunca inferir identidade a partir do avatar.

## 5. Ficha individual e contexto de atuação

Ao selecionar uma pessoa, abrir **um painel lateral** (no celular, uma folha de detalhes), sem tirar o usuário da lista:

- **Vínculo:** dados profissionais, posição atual, gestor, tempo de casa e contatos de trabalho disponíveis.
- **Linha do tempo:** admissões, promoções, alterações de senioridade, transferências, mudanças de gestor, afastamento/retorno e saída, cada uma com data efetiva e origem da atualização. Histórico não é apagado quando a pessoa sai.
- **Contextos relacionados:** atalhos para ocorrência, projeto, reunião ou decisão que já tenha permissão de exibição. Anotações sobre conflito ou desempenho exigem finalidade e visibilidade explícitas; não criar um campo livre compartilhado que mostre à empresa comentários internos da CALI.
- **Avaliações/convites:** registrar qual instrumento foi usado, data, status e link/arquivo, se o cliente autorizou a finalidade. E-mail profissional permite convite futuro, mas importar e-mail não dispara teste. Se a empresa já usa outra ferramenta, preferir vincular o registro ou importar somente os dados necessários, sem obrigá-la a preencher tudo de novo.

Indicadores úteis, calculados do histórico confirmado: headcount e saldo de entradas/saídas, rotatividade voluntária e involuntária, tempo de permanência, promoções, transferências, distribuição por departamento/gestor e tipos de vínculo. Mostrar período e cobertura dos dados; sem mês confirmado, exibir `Dados ainda não enviados`, nunca zero fictício. Não transformar esse quadro em folha de pagamento ou controle operacional de DP.

### Painel de People Analytics — proposta comercial a validar

| Visualização | CALI Partner — base proposta | CALI Full — aprofundamento proposto |
| --- | --- | --- |
| Composição e evolução | Total ativo por mês, entradas, saídas, saldo, tempo de casa e composição por departamento/gestor. | Os mesmos dados com cortes por unidade, vínculo e coorte, quando a amostra permitir. |
| Movimentações | Promoções, transferências e desligamentos no período, com definições claras. | Análise de mobilidade e rotatividade voluntária/involuntária por área e gestor, com leitura de tendência e contexto de atuação. |
| Pessoas e condições | Cobertura dos dados opcionais, sem expor respostas individuais na visão analítica. | Indicadores agregados de identificação de gênero e parentalidade **somente após finalidade, base, transparência, acesso e tamanho mínimo do grupo serem aprovados**. Distribuição salarial, se aprovada, exige uma permissão separada; não entra automaticamente no painel do cliente. |
| Entrega consultiva | Indicadores essenciais e sua definição. | Interpretação e ações ligadas às frentes do CALI Full, a definir comercialmente; acesso ao painel não é, por si, toda a diferença entre planos. |

Essa matriz é **proposta, não regra de cobrança ou autorização implementada**. Confirmar com Pati o escopo contratual de cada pacote antes de bloquear ou revelar qualquer indicador. No Partner, mostrar uma chamada discreta `Conheça as análises do CALI Full`, explicando a frente adicional e levando a uma conversa; não mostrar números falsos, gráfico borrado com dados reais ou botão que ative o plano. CALI Build exige definição própria.

Os prints de referência trazem linha/área suave, linha única e barras empilhadas. Aplicar a linguagem CALI (bordô, dourado, verde sálvia e azul petróleo) com legenda, período, unidade, fonte e tooltip legível nos temas dia/noite. Linha mensal representa pontos reais sem interpolação que invente valores intermediários; barras empilhadas só para categorias que somam o total. Comparação entre meses incompletos deve ser marcada, nunca exibida como queda real. Gênero e parentalidade: mostrar taxa de preenchimento, agrupar respostas pequenas/suprimir cortes reidentificáveis e não usar o dado para decisões individuais automatizadas.

## 6. Adesão ao Workspace e dados

1. Patrícia apresenta o Workspace; a empresa **opta por usar ou não**. Contratar CALI Partner/Full/Build não ativa uma conta por si só.
2. Antes do primeiro convite, apresentar termo específico da plataforma à pessoa com poderes para aderir, em versão identificada. Registrar empresa, representante, versão, data/hora, aceite/assinatura e protocolo; entregar cópia. O conteúdo jurídico deve cobrir acessos, responsabilidades, dados de colaboradores, integrações, suporte e encerramento, com revisão profissional.
3. Só após o termo, liberar convite e conta. Acesso de colaborador ao Workspace não nasce da importação da ficha; são cadastros distintos. Se a empresa recusar o Workspace, a consultoria continua conforme contrato pelos outros canais definidos.
   **Implementação pendente:** auditar a RPC `create_client_account` chamada no cadastro atual e o registro relacionado em `client_invites`; separar criação da conta comercial de envio/ativação do acesso até existir aceite verificável do termo. Registrar o status `não oferecido / oferecido / aceito / recusado / encerrado` por empresa, sem presumir adesão pelo plano.
4. Não presumir que consentimento individual seja sempre a base legal para dados de empregados. A base e os papéis de cada parte dependem da operação concreta e precisam ser revisados com jurídico. O contrato atual já fala genericamente em dados de empregados, mas não define a rotina mensal e a ficha detalhada.

## 7. Dados, segurança e implantação

- Tabelas por empresa para colaborador, versão mensal/importação e evento de movimentação, com autoria, data efetiva e trilha de auditoria. Importação deve ser idempotente pelo código interno + empresa + mês. Armazenar arquivo original em bucket privado somente se houver finalidade e prazo definidos; preferir processar, validar e descartar o arquivo após confirmação.
- Políticas RLS no banco para separar empresas, com parceiro interno limitado por atribuição. Validar também Storage, RPCs, exportações e relatórios. O cliente não deve conseguir acessar outra empresa nem salários ocultos por consulta direta.
- Rever aviso de privacidade, contrato/anexo de tratamento, retenção e permissões antes de receber a primeira planilha real. A política pública atual passou a mencionar dados de equipe em termos gerais, mas não descreve ainda este fluxo mensal e seus campos detalhados. Definir com assessoria jurídica os papéis e prazos, sem prometer exclusão automática inexistente.
- **Antes de coletar gênero e parentalidade:** documentar a finalidade específica de cada campo, necessidade, base legal adequada, quem informa e quem enxerga, prazo, direito de correção e proteção contra usos discriminatórios. A adesão da empresa ao Workspace não equivale à declaração da pessoa. Não incluir esses campos no CSV obrigatório nem na primeira importação sem essa revisão. A LGPD exige finalidade/necessidade e veda tratamento discriminatório; a classificação e a base aplicável devem considerar o dado e o uso concreto.
- Entrega por etapas: (a) termo e ativação opcional + matriz de acesso; (b) ficha, tabela e edição manual com RLS; (c) CSV com prévia e confirmação; (d) histórico/indicadores e convites a instrumentos. Testar com dados de ensaio isolados; nunca preencher com dados inventados na conta real.

## 8. Decisões restantes antes da implementação dos dados

### Revisão mensal entregue em 02/10/2026

O terceiro dia útil gera lembrete no app e pelo mecanismo de e-mail do Workspace para revisar o mês anterior. O cliente principal ou admin confirma em cinco passos: saídas, admissões, mudanças, vagas e resumo. Vagas abertas passam de mês, encerram com data e alimentam o tempo médio de preenchimento. A confirmação transacional grava autoria, retratos e eventos; uma ficha editada fora da revisão não dispensa o lembrete. O CSV preserva pessoas ausentes. Retificação histórica além do mês anterior, termo de adesão e matriz comercial permanecem para definição.

**Refino após teste de 02/10:** nenhuma etapa intermediária do cadastro manual persiste a ficha. O código interno pode ser informado pela empresa ou gerado no último passo. A pessoa pode ser marcada explicitamente como liderança; o gestor direto é selecionado pelo código de outra pessoa da mesma empresa. Departamento sugere valores já usados, setor fica opcional e senioridade tem lista. O histórico distingue a data efetiva de admissão/desligamento da data do registro; entradas e saídas dos indicadores usam a data efetiva. Assim, cadastrar hoje uma admissão ocorrida em 2025 não cria uma admissão falsa no mês atual. A revisão final mostra data/hora em São Paulo, referência e as linhas antes de confirmar. O estilo do avatar segue a opção fornecida de gênero quando declarada; gênero, filhos e remuneração continuam em tabela privada. A empresa não ganha acesso à remuneração privada pela exibição do avatar.

1. Quem no cliente pode confirmar o mês: somente o acesso principal ou acessos adicionais futuramente? Acesso do parceiro interno para editar equipe continua sem decisão explícita; por padrão, leitura.
2. Qual dia do mês vence a atualização e qual mês de referência deve aparecer antes do primeiro envio?
3. A CALI aprova o envio mensal antes de ele se tornar vigente ou apenas recebe aviso e pode pedir correção?
4. O representante que envia remuneração pode ver/revisar valores já enviados na própria conta? O planejamento anterior restringiu a visualização da coluna a Patrícia e parceiro interno, então o fluxo precisa evitar confirmação cega e exposição acidental.
5. Quais instrumentos comportamentais serão oferecidos, por qual fornecedor e com qual autorização e retenção? Isso é uma etapa própria, não uma consequência automática de cadastrar o e-mail.
6. Confirmar a matriz Partner/Full/Build de indicadores e entregas consultivas, incluindo se o cliente pode ver análises agregadas de gênero, parentalidade e remuneração. Fixar um limiar de tamanho/cobertura para cortes e o tratamento de grupos pequenos.
7. Validar o texto de identificação de gênero com pessoas interessadas, a opção de avatar neutro e se `Tem filhos?` é necessário para um indicador específico antes de disponibilizar a coleta.

**Critério de aceite:** um envio real de teste altera o quadro apenas da empresa correta; Pati e o cliente veem o mesmo mês confirmado; gestor/departamento agrupam corretamente; admissão, promoção, transferência e desligamento preservam histórico; linhas ausentes não geram desligamento; a permissão de parceiro não alcança outras empresas.

**Teste de 02/10, segunda rodada:** importação CSV fechava o modal antes da prévia; corrigida. Tabela inicial inclui colunas profissionais solicitadas, histórico detalha antes/depois e a ficha pode sair da equipe atual sem destruir meses anteriores. O desenho anterior foi substituído por monograma neutro. A planilha de 15 pessoas gerada para o teste tem o formato CSV antigo e não contém senioridade nem gênero; esses campos não são inventados. XLSX ainda não é aceito pelo importador.
