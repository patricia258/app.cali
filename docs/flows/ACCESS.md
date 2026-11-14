# Acesso, empresa e contrato

## FLOW-01

**Login, convite e sessão.** Público entra por `/login` ou `/auth/callback`. Admin, Cliente e Partner seguem à área do próprio perfil. Convites e permissões dependem da liberação da [ficha](#flow-02).

**Atual.** E-mail elegível → solicitação → código de seis dígitos → verificação → sessão Auth → leitura do perfil ativo → guarda da área. Os caminhos Admin e Partner exigem AAL2 e TOTP verificado. Sem fator, o primeiro acesso mostra QR e confirma código. Falha de conferência ou de cadastro oferece nova tentativa com a área bloqueada. Troca de ator ou nível revalida o gate. A área autenticada verifica o aceite vigente e solicita confirmação quando necessário. Callback, refresh e logout usam as superfícies existentes. [Login e callback](../../src/app/router.tsx) · [Guarda de MFA](../../src/auth/MfaGate.tsx) · [Guarda de termos](../../src/auth/TermsGate.tsx)

**Dados e integrações.** Edge `workspace-access` resolve convite/perfil elegível, chama RPCs de reserva e consumo serializado do hash do código, entrega por Resend e solicita a troca Auth. A sessão vincula o código ao ator. O estado de aceite vincula identidade, publicação e versão. A guarda privada exige sessão vigente e, para Admin e Partner, AAL2 vinculado a TOTP verificado. [Edge de acesso](../../supabase/functions/workspace-access/index.ts) · [Vínculo do código](../../supabase/migrations/20261112121000_bind_workspace_codes_to_actors.sql) · [Guarda SQL](../../supabase/migrations/20261112120400_bind_workspace_mfa_to_auth_session.sql)

**Alvo.** Convite válido → login → segundo fator Admin e Partner → aceite pessoal vigente → rota autorizada. Revogação corta também JWTs antigos em RPC, Edge, Data API e Storage conforme o escopo da operação. Reativação exige nova sessão. Exigir as mesmas guardas para entrada direta, inclusive impressão Partner. [Contrato de acesso](../contracts/ACCESS.md) · [Equipe CALI e Partner](PARTNER.md#flow-15)

**Aceite.** Testar emissão concorrente, código errado ou expirado, consumo único, callback e retorno seguro. Validar falha e retry de MFA/termos, login de cada papel, troca de sessão, refresh e logout. Tentar o mesmo JWT antes e depois de revogar e reativar. Cliente A e B devem permanecer isolados em UI e nas superfícies diretas.

**Evidência e lacunas.** O laboratório executou Auth, emissão para o Mailpit, MFA, aceite, isolamento entre empresas e negativas de sessão revogada. O catálogo hospedado e a emissão para contas externas de teste dependem da configuração do destino. URLs assinadas emitidas antes de um corte continuam sujeitas à expiração. [QA local e Preview](../DATA_CONTRACTS.md#qa-local-e-preview)

## FLOW-02

**Ficha da empresa, contrato e acessos.** Admin opera `/admin/clientes`. Cliente consulta a própria empresa a partir da área autenticada. O candidato preenche dados em `/pre-cadastro/:token`.

**Atual.** Admin cria rascunho da empresa e, na aba Acessos, gera ou reemite link, importa o pré-cadastro, anexa o contrato e confere os acessos pendentes. O servidor confirma os obrigatórios, a revisão do contrato, os objetos de Storage e a revisão da ficha antes de ativar o conjunto. Patrícia e Partner de apoio elegível aparecem no Início. Os acessos ativos legados são preservados na edição da ficha. [Ficha Admin](../../src/modules/admin/companies/AdminClientsPage.tsx) · [Pré-cadastro e liberação](../../supabase/migrations/20261112130000_company_onboarding.sql)

**Dados e integrações.** Empresa, plano e ciclo, responsáveis, adesão, versão do contrato, comprovantes, contatos e reservas de convite vinculam-se ao ID estável da empresa. No contrato alvo, entrega do convite e criação da identidade Auth têm recibos e podem ser retomadas depois da reserva. A indicação de contato focal é independente dos poderes do acesso. [Dados e autorização](../PERMISSIONS.md#matriz-de-autorização-alvo)

**Alvo.** Gerar link de sete dias → Cliente preenche seus dados → CALI completa a ficha → Admin confere obrigatórios, adesão e prova de contrato assinado vigente → liberação conjunta de ficha e até quatro acessos equivalentes. **Gerar novo link** invalida o anterior e preserva dados já recebidos. Troca da versão do contrato invalida a conferência anterior. Se uma reserva falhar, desfazer o conjunto. Patrícia responde pela conta e Admin pode designar um Partner ativo elegível de apoio. A ficha alimenta o [Início](CLIENT.md#flow-04). Acesso já liberado mantém vínculo e estado durante a transição de cadastro legado. [Regras de ficha](../PRODUCT_RULES.md#acessos-e-ficha-da-empresa)

**Aceite.** Link expirado e reemitido, tentativa pelo link anterior, contrato ausente ou desatualizado, obrigatório vazio, reserva concorrente e falha na última vaga. Conferir zero liberações parciais, repetição segura e vínculo Auth estável. Dois Clientes da mesma empresa mantêm Equipe. Fechar, pausar, renovar e reativar sem aproveitar sessão antiga.

**Evidência e lacunas.** Playwright local percorreu ficha, pré-cadastro, reemissão e liberação com contrato. PostgreSQL local verificou repetição e ausência de liberações parciais. No destino hospedado, conferir a correspondência de empresa, acessos e registros de contrato legados antes da transição. [Mapa das rotas](../../src/app/router.tsx)
