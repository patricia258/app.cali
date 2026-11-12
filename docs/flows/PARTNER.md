# Partner · Equipe CALI, módulos e aprovações

## FLOW-15

**Equipe CALI e Partner.** Admin opera `/admin/equipe-cali`. Partner entra em `/equipe` e acessa o menu de módulos e `/equipe/aprovacoes`. CALI Partner como plano comercial é um dado da [ficha](ACCESS.md#flow-02).

**Atual.** Admin mantém pessoas, módulos e empresas. O papel de login é `partner`. O shell lê os módulos e empresas do vínculo, mostra fila, timer e sino. Há páginas reaproveitadas de projetos, documentos, ocorrências, horas, agenda, equipe e relatórios. A guarda da branch exige perfil Partner ativo, MFA e termos. Impressão de relatório passa pelo mesmo acesso e exige módulo `reports`. [Shell Partner](../../src/modules/partner/StaffWorkspace.tsx) · [Vínculo Partner](../../supabase/migrations/20261012150000_staff_partner_base.sql) · [Fila de submissões](../../supabase/migrations/20261012190000_staff_partner_write_queues.sql)

**Dados e integrações.** Identidade Auth e `staff_members`, estado ativo, empresas, módulos, atribuições de registro, pedido, decisão e trilha de acesso. Fila Partner tem pedidos e retorno de revisão próprios. Admin decide conforme operação e permissão. [Auditoria de sessão](../../supabase/migrations/20261013110000_staff_session_log.sql)

**Alvo.** Admin convida e ativa → define empresa, módulo e atribuições → Partner trabalha e submete → Patrícia decide ou devolve → Partner acompanha a decisão. Desativação ou retirada de escopo corta as superfícies afetadas, inclusive sessão antiga quando aplicável. Vínculo de apoio visível ao Cliente por si só não autoriza um trabalho. [Matriz de autorização](../PERMISSIONS.md#matriz-de-autorização-alvo)

**Aceite.** Ativar e desativar Partner e ajustar módulos/empresas. Testar AAL1, ausência de aceite, empresa diferente, falta de atribuição e URL copiada de impressão. Tentar SELECT de rascunho e leitura de arquivo indevido. Validar retorno de revisão, fila própria, rota direta e negativa após perda de acesso. Conferir [Horas](OPERATIONS.md#flow-07), [Avisos](OPERATIONS.md#flow-13) e [Relatórios](ADMIN.md#flow-12) separadamente.

**Evidência e lacunas.** Provas locais de rotas e acesso direto cobriram Partner atribuído e limitado, impressão, MFA, aceite e revogação. O acesso a rascunhos, anexos e comandos combina módulo, vínculo e atribuição. Conferir o catálogo hospedado e manter cada teste de módulo ao alterar o escopo. [Guardas Playwright](../../tests/e2e/guards.cjs)
