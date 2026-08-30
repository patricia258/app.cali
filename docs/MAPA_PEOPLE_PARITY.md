# Mapa de People · paridade administrativa no CALI Workspace

Regra principal: `mapa.calirh.com` continua público e funcional. O painel legado permanece disponível até a validação integral da Patrícia. Nenhuma função antiga é removida antes da paridade.

## Fonte de verdade

- Repositório público/legado: `patricia258/mapa-de-people`
- Workspace: `patricia258/app.cali`
- Supabase compartilhado: `kqtbfeeqbcllwvlkbrkq`
- Respostas: `public.mapa_respostas`
- Jornada: `public.mapa_eventos` / `public.mapa_sessoes_resumo`
- Ponte segura Workspace: `cali_workspace.mapa_people_admin`, `cali_workspace.mapa_people_journey`, `cali_workspace.update_mapa_people_record`

## Checklist obrigatório

### Lista e gestão
- [x] Menu Mapa de People no Workspace
- [x] Dados reais da mesma base
- [x] Total de respostas
- [x] Novos
- [x] Em andamento
- [x] Enviados
- [x] Busca empresa / decisor / e-mail / protocolo
- [x] Filtro de status
- [x] Score compatível V1 e V2
- [x] Mudança rápida de status
- [x] Protocolo e data

### Revisão da resposta
- [x] Dados completos do decisor
- [x] Qualificação
- [x] D1 · Maturidade Estrutural
- [x] D2 · Liderança & Cultura
- [x] D3 · Dados & Decisão
- [x] D4 · Dimensões Operacionais
- [x] Lentes transversais
- [x] Observação por dimensão
- [x] Parecer final
- [x] Serviço recomendado
- [x] Salvar revisão via RPC administrativa
- [x] Exibir campos extras de `diagnostico_v2.qualificacao` usados no painel legado

### Jornada / acessos
- [x] Visitas
- [x] Iniciados
- [x] Abandonos
- [x] Cópias
- [x] Etapa máxima
- [x] Último sinal
- [x] Dispositivo
- [x] Origem / referrer
- [x] Situação: enviou / em andamento / abandonou
- [x] Filtro de jornada
- [x] Filtro de período equivalente ao legado
- [x] Busca por origem / dispositivo

### Relatório
- [x] Relatório legado preservado sem alteração visual
- [x] Ponte segura de autenticação Workspace → `relatorio.html` sem novo login
- [x] Ação “Gerar relatório” habilitada no novo painel
- [x] Workspace possui responder de sessão para o relatório
- [x] Nome de arquivo preservado pelo relatório original
- [x] Matriz de quadrantes preservada pelo relatório original
- [x] Radar preservado pelo relatório original
- [x] Leitura por dimensões preservada pelo relatório original
- [x] Subcamadas V2 preservadas pelo relatório original
- [x] Gráfico Peso estratégico × Desempenho preservado pelo relatório original
- [x] Serviço indicado preservado pelo relatório original
- [ ] Handshake e impressão/PDF validados ponta a ponta em produção

### Envio
- [x] Edge Function exclusiva `workspace-enviar-relatorio-mapa`
- [x] JWT obrigatório
- [x] Restrita a `patricia@calirh.com`
- [x] CORS do Workspace sem alterar a função antiga
- [x] Validação PDF e limite 8 MB
- [x] Envio Resend
- [x] Atualização `status=enviado`
- [x] Atualização `relatorio_enviado_em`
- [x] Modal de confirmação do destinatário
- [x] Seleção/anexo do PDF aprovado
- [x] Envio integrado no novo painel
- [x] Feedback de sucesso/erro
- [x] WhatsApp com mensagem preparada
- [ ] Envio real validado ponta a ponta em produção

### Segurança / não regressão
- [x] Painel antigo permanece disponível
- [x] Formulário público permanece no mesmo domínio
- [x] Nenhuma migração/cópia de respostas
- [x] Views do Workspace com `security_invoker=true`
- [x] RLS original preservada
- [x] RPC administrativa valida `cali_workspace.is_admin()`
- [ ] Teste final painel antigo × Workspace item por item

## Critério para chamar Patrícia para testar

Somente quando todos os itens funcionais estiverem implementados e os únicos itens restantes forem validações ponta a ponta que necessariamente dependem do navegador autenticado da Patrícia. Ajustes puramente visuais podem continuar depois da validação funcional, mas nenhuma função antiga pode ficar ausente.
