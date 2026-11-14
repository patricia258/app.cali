# Política de mudança

Registre a regra que muda, sua fonte, o código responsável e a prova esperada. Use a [ficha do fluxo](flows/README.md) como entrada e ajuste o documento dono quando o contrato mudar.

| Mudança | Evidência mínima |
| --- | --- |
| Documentação | Conferir regras contra fonte e implementação, links e estado de entrega. |
| Pastas e componentes | Checar tipos e build, entradas afetadas, imports dinâmicos, cascata, ações e estados do fluxo. |
| URL ou navegação | Exercitar link direto, recarga, query, fragmento, histórico e papel permitido. |
| Leitura ou escrita | Verificar ator e empresa, sucesso, falha, retry, concorrência quando aplicável e estado persistido. |
| Permissão e arquivos | Provar chamada direta, ator sem acesso, outra empresa e efeito da revogação. |
| Integração | Usar destino de teste e registrar uma única entrega ou efeito por operação, inclusive em retry. |
| Migração | Conferir preimagem, consumidores, restauração e compatibilidade com a revisão anterior e dados legados. |

## Registro de evidência

Uma prova identifica revisão, ambiente, perfil, entrada, resultado esperado e resultado observado. Dados sintéticos provam a interface e o contrato simulado. Banco isolado com schema reconciliado prova execução e permissões desse destino. Resultado parcial mantém as lacunas explícitas.

Código estrutural preserva URLs e contratos de dados. Imports novos seguem o [mapa de arquitetura](ARCHITECTURE.md). O Preview da consolidação exige a [matriz local completa](CONSOLIDATION_ACCEPTANCE.md), limpeza das provas temporárias da entrega e nova execução de tipos e build.
