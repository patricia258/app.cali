# Runbook do CALI Workspace

## Desenvolvimento local

Use Node e npm compatíveis com as dependências do lockfile. Instale e rode os comandos na raiz do projeto.

```sh
npm ci
npm run check
npm run dev
```

Configure a URL e a chave pública do Supabase de teste conforme [o exemplo de ambiente](../.env.example). O app valida a origem e o destino ao inicializar os clientes. Mantenha tokens operacionais e chaves de serviço fora da árvore versionada. E-mail, Calendar, Meet, Drive e callbacks usam destinos de teste.

`npm run check` cobre TypeScript e build. O script `scripts/verify-v2-operation.cjs` pertence à migração visual histórica e compara caminhos e fontes de uma revisão anterior. A validação da consolidação segue a [matriz local](CONSOLIDATION_ACCEPTANCE.md).

## Banco e dados de QA

1. Obtenha a estrutura do destino em leitura. Inclua schemas e dependências, grants, políticas, funções e triggers. Inventarie separadamente Edge Functions, Storage, Realtime, jobs e configurações de Auth.
2. Restaure o dump de estrutura do CALI MAPA no destino isolado, aplique as migrations da branch e reconcilie o catálogo. O dump é a base do replay aceito. [Evidência do catálogo](DATA_CONTRACTS.md#autoridade-e-níveis-de-evidência)
3. Carregue dados sintéticos representativos do legado. Inclua empresa, acessos, IDs, estados, anexos, links emitidos e alterações equivalentes às da versão publicada.
4. Verifique os alvos dos efeitos antes da execução. Registre revisão do app, schema e função Edge usados nas provas. Valide restauração e retorno à versão anterior quando houver alteração de dados.

## Ambiente local desta consolidação

O snapshot de 12/11/2026 contém a estrutura do CALI MAPA. A partir da raiz, rode `bash tests/contracts/replay-dump.sh 773c9d4` para conferir os checksums, restaurar o dump e aplicar as migrations da branch em um container descartável sem rede. O laboratório `cali-oneshot-qa` usa a mesma base com fixtures sintéticas de Admin, Partner e três Clientes em duas empresas. Os serviços de negócio ficam em uma rede Docker interna e o proxy publica somente endereços de loopback. O cron automático fica desativado.

O app abre em `http://127.0.0.1:56430`, com API local em `http://127.0.0.1:56431` e captura de e-mail em `http://127.0.0.1:56432`. O diretório local ignorado `.cali-db-schema.local/qa` contém os comandos de retomada, o ambiente de teste e as provas. A Edge de acesso usa Mailpit no laboratório. O Admin sintético entra por uma adaptação local da lista de e-mails permitidos, com MFA e termos ativos. Auth e Storage usam histórico de inicialização dos serviços Docker locais. O Realtime inicializa seu schema gerenciado na cópia de QA e usa a publicação de tabelas do app restaurada. As contas, arquivos e senhas de teste são gerados localmente.

O smoke de partida cobriu login por código, MFA, aceite e isolamento por empresa na API, no Storage e no Realtime. O aceite de todas as jornadas segue a [matriz local](CONSOLIDATION_ACCEPTANCE.md).

## Preview e corte

O Preview usa a branch revisada, backend de homologação e credenciais e callbacks próprios. Depois de passar a validação local, confirme o commit, o ambiente Vercel, as rotas públicas e o login com contas autorizadas de teste. Registre URL e roteiro de aceite.

1. Selecione um projeto Supabase de homologação com Auth, Storage e Edge Functions próprios. Restaure a estrutura e as fixtures sintéticas. Confira o schema exposto, os papéis gerenciados, a permissão de configurar `pgrst.db_pre_request` e o proprietário das políticas de `storage.objects` antes de aplicar as migrations. Mantenha `main` e o projeto de produção na revisão publicada até um corte separado.
2. Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente Preview da branch. Na Edge, configure `CALI_DELIVERY_MODE=isolated`, a origem exata do Preview, `WORKSPACE_ACCESS_ALLOWED_ORIGINS` e os e-mails de teste em `CALI_TEST_EMAIL_RECIPIENTS`. Cada URL de hook do banco deve apontar para a função do próprio ambiente. Use chaves e segredos desse projeto.
3. Para Google, use `CALI_GOOGLE_MODE=test`, callback exato `/oauth/google/callback`, conta, calendário, pasta Drive e convidados autorizados para homologação. Teste primeiro um destino fora da lista e confirme a recusa. A configuração local usa provedor simulado e rede interna.
4. Aplique a publicação dos termos e o build correspondente no mesmo ambiente. Rode o login de Admin com MFA e aceite, um Cliente de cada empresa sintética e o Partner atribuído. Confira recusa de empresa externa, recepção do e-mail de teste e estado após recarga.

Os hooks `edge_url_workspace_notification_email_hook`, `edge_url_workspace_admin_daily_summary` e `edge_url_cali_profile_invites` ficam em `cali_workspace.runtime_secrets`. Forms e DISC usam `forms_confirmation_url` e `disc_report_url`. O executor de eliminação usa `company_elimination_worker_url`, `company_elimination_worker_hook` e a credencial `company_elimination_worker_bearer` no Vault. Configure só os envios e jobs que serão exercitados naquele ambiente.

Em homologação, `partner_timer_admin_email` identifica a conta Admin de teste que recebe o alerta do cronômetro. A configuração padrão é a Patrícia. O resumo diário usa `0 22 * * *` no catálogo em UTC, correspondente a 19h de Brasília.

Em um corte futuro de produção, reconcilie as gravações da última janela, verifique vínculos e contagens e confirme o caminho de retorno. Preserve os contratos utilizados pela revisão anterior durante a transição. [Migração e compatibilidade](DATA_CONTRACTS.md#migração-e-compatibilidade)
