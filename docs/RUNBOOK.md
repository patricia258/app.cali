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
2. Restaure a estrutura no destino isolado e reconcilie o catálogo. O replay apenas com migrations versionadas ainda encontra relações ausentes no histórico. [Evidência e lacunas](DATA_CONTRACTS.md#autoridade-e-níveis-de-evidência)
3. Carregue dados sintéticos representativos do legado. Inclua empresa, acessos, IDs, estados, anexos, links emitidos e alterações equivalentes às da versão publicada.
4. Verifique os alvos dos efeitos antes da execução. Registre revisão do app, schema e função Edge usados nas provas. Valide restauração e retorno à versão anterior quando houver alteração de dados.

## Preview e corte

O Preview usa a branch revisada, backend de homologação e credenciais e callbacks próprios. Depois de passar a validação local, confirme o commit, o ambiente Vercel, as rotas públicas e o login com contas autorizadas de teste. Registre URL e roteiro de aceite.

Em um corte futuro de produção, reconcilie as gravações da última janela, verifique vínculos e contagens e confirme o caminho de retorno. Preserve os contratos utilizados pela revisão anterior durante a transição. [Migração e compatibilidade](DATA_CONTRACTS.md#migração-e-compatibilidade)
