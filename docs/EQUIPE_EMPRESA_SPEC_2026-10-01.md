# Equipe da empresa e acessos · desenho inicial

**Pedido da Pati em 01/10/2026.** Este documento separa decisões de produto de implementação. A nova página e o novo perfil ainda não estão ativos; nenhum colaborador foi importado. O Workspace atual reconhece somente `admin` e `client` no banco. O cliente principal já é criado como `client` e Patrícia como `admin`.

## 1. Perfis e permissões

| Perfil na interface | Uso | Acesso previsto |
| --- | --- | --- |
| Administradora geral | Patrícia | Todas as contas e configurações CALI. Identificação visível no perfil e no menu. |
| Parceiro CALI (interno) | Profissional que atua com a CALI; **não** é o plano CALI Partner do cliente | Somente empresas e módulos atribuídos por Patrícia; sem gestão de outros acessos, cobrança ou configurações gerais por padrão. |
| Cliente principal | Representante da empresa contratante | Somente sua empresa; envia e confere dados da equipe e as demais áreas contratadas. |

O parceiro interno exige migração de papel, atribuição explícita a empresas, políticas RLS e revisão de todos os fluxos de autorização. Uma etiqueta visual, sozinha, não concede nem restringe acesso. O princípio de um acesso principal por empresa permanece até decisão sobre acessos adicionais.

## 2. Onde isso entra

- **Cliente:** `Minha empresa > Equipe e movimentações`. No topo, mês de referência, total de pessoas ativas, entradas e saídas daquele mês e data da última confirmação. Abaixo, tabela com busca e agrupamento por departamento ou gestor. Uma ação principal: **Atualizar equipe**.
- **Administradora:** aba `Equipe` dentro da conta selecionada em Clientes, com o mesmo quadro e histórico por mês. Mostrar quem enviou, quem confirmou e diferenças pendentes. Uma visão entre empresas pode vir depois, sem misturar dados de clientes.
- **Dados da empresa:** razão social/nome, segmento, unidades, contato e plano devem reaproveitar o cadastro existente; evitar uma segunda fonte de verdade. O total de colaboradores mostrado nessa ficha vem da equipe ativa no mês confirmado, com indicação clara da referência.

## 3. Cadastro mínimo de cada pessoa

| Campo | Regra inicial |
| --- | --- |
| Código interno do colaborador | Identificador estável da empresa ou gerado na primeira importação; preservado em promoções e transferências. Não usar só o nome para conciliar linhas. |
| Nome completo; data de admissão | Obrigatórios. |
| Cargo atual; departamento/setor; gestor direto | Obrigatórios para permitir agrupamento. Gestor deve apontar preferencialmente para outro código da mesma empresa; aceitar revisão na importação. Senioridade é opcional, mas sua mudança deve ser registrada. |
| Tipo de contratação; jornada semanal | Obrigatórios, com opções padronizadas e campo de observação quando necessário. |
| Situação e data de referência | Ativo, afastado ou desligado; a data efetiva define o mês em que a mudança aparece. Não pedir diagnóstico ou motivo médico. |
| Remuneração atual | Opcional e sensível: coluna separada, desativada por padrão até definir quem pode ver, exportar e importar. |

Sugestões úteis, também opcionais: unidade/localidade e modelo de trabalho, para análises por unidade e para não confundir departamento com local. Não coletar CPF, endereço pessoal, data de nascimento ou dados de saúde apenas para montar este quadro.

## 4. Atualização mensal

1. O cliente escolhe o mês e baixa o **modelo CSV** ou uma cópia do último quadro confirmado. Também pode editar uma pessoa diretamente.
2. O upload valida formato, datas, códigos repetidos e referências de gestor. Exibe uma prévia com **novos, alterados, sem mudança e não encontrados no arquivo**.
3. A ausência de uma linha no CSV **nunca desliga automaticamente** uma pessoa. O cliente marca a saída ou confirma que a linha foi omitida por engano.
4. Para cada mudança, o cliente informa tipo e data efetiva. Promoção pode alterar cargo e/ou senioridade; transferência pode alterar departamento e/ou gestor; contratação/jornada também podem mudar. Desligamento registra iniciativa (pedido da pessoa, empresa, fim de contrato ou outro), motivo em categorias objetivas, data e aviso prévio (trabalhado, indenizado, dispensado ou não se aplica). Texto livre fica opcional e breve.
5. Antes de publicar, a interface mostra um resumo das mudanças, pede confirmação e salva quem enviou e quando. A administradora vê a versão confirmada e o histórico, inclusive correções posteriores; números de meses anteriores não devem ser sobrescritos silenciosamente.
6. Se o mês ainda não foi atualizado, mostrar **Aguardando atualização de outubro**, sem inventar variação zero. Lembrete mensal pode ser configurado em outra etapa.

Na tabela: colunas de pessoa, cargo, departamento, gestor, vínculo, jornada, admissão e situação; filtros por mês, departamento, gestor, situação e tipo de contrato. As movimentações ficam em uma aba/visão do mesmo contexto, com resumo de origem e destino. No mobile, cada linha vira um resumo expansível com as mesmas ações.

## 5. Dados, segurança e implantação

- Tabelas por empresa para colaborador, versão mensal/importação e evento de movimentação, com autoria, data efetiva e trilha de auditoria. Importação deve ser idempotente pelo código interno + empresa + mês. Armazenar arquivo original em bucket privado somente se houver finalidade e prazo definidos; preferir processar, validar e descartar o arquivo após confirmação.
- Políticas RLS no banco para separar empresas, com parceiro interno limitado por atribuição. Validar também Storage, RPCs, exportações e relatórios. O cliente não deve conseguir acessar outra empresa nem salários ocultos por consulta direta.
- Rever aviso de privacidade, contrato/anexo de tratamento, retenção e permissões antes de receber a primeira planilha real. A política pública atual passou a mencionar dados de equipe em termos gerais, mas não descreve ainda este fluxo mensal e seus campos detalhados. Definir com assessoria jurídica os papéis e prazos, sem prometer exclusão automática inexistente.
- Entrega por etapas: (a) papel visível e matriz de acesso; (b) tabela e edição manual com RLS; (c) CSV com prévia e confirmação; (d) histórico/indicadores e lembretes. Testar com dados de ensaio isolados; nunca preencher com dados inventados na conta real.

## 6. Decisões para fechar antes da implementação dos dados

1. O parceiro interno poderá ver quais módulos e quais empresas? Pode editar equipe ou apenas acompanhar?
2. Quem no cliente pode confirmar o mês: somente o acesso principal ou acessos adicionais futuramente?
3. Remuneração entra já na primeira versão? Se sim, Patrícia, parceiro e cliente terão quais permissões individuais?
4. Qual dia do mês vence a atualização e qual mês de referência deve aparecer antes do primeiro envio?
5. A CALI aprova o envio mensal antes de ele se tornar vigente ou apenas recebe aviso e pode pedir correção?

**Critério de aceite:** um envio real de teste altera o quadro apenas da empresa correta; Pati e o cliente veem o mesmo mês confirmado; gestor/departamento agrupam corretamente; admissão, promoção, transferência e desligamento preservam histórico; linhas ausentes não geram desligamento; a permissão de parceiro não alcança outras empresas.
