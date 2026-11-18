# Acesso, MFA e termos

## Código por e-mail

A rota `/login` usa a Edge [workspace-access](../../supabase/functions/workspace-access/index.ts). `request` recebe e-mail e emite código para identidade elegível. `verify` recebe e-mail e código, confirma uso único e retorna `ok`, `token_hash` e `role` no contrato legado. O [cliente de acesso](../../src/api/supabase.ts) também valida uma resposta com `session.access_token` e `session.refresh_token` quando oferecida pelo servidor.

A Edge na branch chama `reserve_workspace_access_code(text, text, text)` para reservar código com cooldown de dois minutos e validade de dez. `consume_workspace_access_code(text, text)` serializa o consumo por e-mail, grava tentativa e permite no máximo um uso e cinco tentativas. São operações de `service_role` na [migration de códigos](../../supabase/migrations/20261111191000_workspace_access_code_transactions.sql). O catálogo hospedado ainda tem a Edge legada. A admissão de sessão do piloto exige reconciliação no servidor.

## Sessão e MFA

O [provider](../../src/auth/WorkspaceAuthProvider.tsx) carrega o perfil mínimo por identidade. A [guarda de MFA](../../src/auth/MfaGate.tsx) exige sessão AAL2 e fator TOTP verificado para Admin e Partner antes de montar a área. A [migration de MFA](../../supabase/migrations/20261111190000_require_verified_workspace_mfa.sql) reforça o mesmo requisito no predicado do banco, com sessão vigente e vinculada ao JWT.

O ensaio local cobre AAL1, cadastro, AAL2, ausência de fator e rejeição após logout. A revogação geral para Cliente, Data API, Storage, Realtime e RPCs ainda exige a validação do catálogo efetivo. [Matriz de aceite](../CONSOLIDATION_ACCEPTANCE.md)

## Termos

`v2_read_terms_state()` retorna versão, hash e estado de aceite. `v2_accept_terms(text, text)` confirma versão e hash apresentados. A [API de termos](../../src/api/access/terms.ts) usa token do ator da operação, compara com o conteúdo local e confirma o recibo por releitura. Partner usa o recibo legado enquanto o RPC hospedado de confirmação atende Cliente e Admin. O aceite atual precisa ser preservado na migração da versão.
