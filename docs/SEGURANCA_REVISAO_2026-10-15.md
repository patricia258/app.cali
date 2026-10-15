# Revisão de segurança e LGPD — CALI Workspace (15/10/2026)

Escopo: banco e funções (Supabase, projeto `kqtbfeeqbcllwvlkbrkq`, região us-east-2/EUA), armazenamento de arquivos, funções de borda, front-end (app.calirh.com na Vercel), dependências e política de privacidade publicada em calirh.com/privacidade.html. Leitura apenas; NADA foi alterado nesta revisão. Não substitui parecer jurídico.

## O que já está bom
- Proteção por linha (RLS) ligada em 90 de 91 tabelas; tabelas de credenciais e códigos trancadas para todos.
- Arquivos privados com link temporário (5 a 15 min), limite de tamanho e tipos permitidos.
- Login por código enviado por e-mail, com validade, limite de tentativas e bloqueio por excesso.
- Histórico de ações (`activity_log`, 230 registros); nenhum segredo no código do navegador; sem cookies de propaganda ou rastreadores.

## Técnico — prioridade alta (eu faço, precisa do sim da proprietária)
1. **Funções chamáveis sem login:** ~130 funções do esquema `cali_workspace` podem ser chamadas por quem não está logado. A maioria recusa por dentro, mas 8 não conferem quem chama:
   `build_agenda_compliance_v66`, `company_meeting_policy_v66`, `resolve_meeting_entitlement_v66`, `client_hours_enabled_for_period` (mostram dados de uma empresa para quem souber o identificador dela);
   `dispatch_daily_chat_digest`, `dispatch_document_validity_alerts_v1` (qualquer pessoa pode disparar envios de e-mail);
   `generate_protocol`, `refresh_project_forecast`, `refresh_project_workstream_ranges` (gastam numeração / recalculam dados).
   Correção: tirar de "quem não está logado" a permissão de chamar todas; nas 8, permitir só a rotina interna ou a administradora.
2. **Numeração de protocolos (`protocol_counters`) sem proteção por linha** e com permissão total para qualquer usuário logado: um cliente poderia alterar ou apagar a contagem. Correção: ligar a proteção e deixar só as funções internas mexerem.
3. **Cabeçalhos de segurança do site ausentes** (`vercel.json` só tem redirecionamento): sem proteção contra o site ser embutido em outra página (clickjacking), sem política de referência e de permissões. Correção: incluir os cabeçalhos; a política de conteúdo (CSP) entra depois, com teste.
4. **Administradora sem segundo fator (MFA):** a conta com acesso a tudo entra só com código por e-mail. Recomendação: ativar verificação em duas etapas (aplicativo autenticador) para a administradora e a Equipe CALI.

## Técnico — prioridade média
5. 32 pontos que montam HTML na tela juntando textos sem "higienizar". A maioria usa datas e textos fixos, mas precisa revisão linha a linha: se algum texto digitado por usuário entrar sem tratamento, abre brecha para roubo de sessão.
6. Biblioteca `react-router` com alerta moderado de segurança: atualizar.
7. Proteção contra senha vazada desligada no Supabase (Authentication → Passwords) — liga no painel.
8. Extensão `pg_net` no esquema público (baixo risco).
9. Logos e fotos de perfil ficam num armazenamento público (abre por link). Aceitável; registrar na política.
10. Cópias de segurança: conferir no painel do Supabase se o plano faz backup diário e por quanto tempo guarda.

## LGPD — decisões da proprietária (com apoio jurídico)
11. **Política de privacidade não cobre o app.** A de calirh.com trata do site, do Mapa e de propostas. Faltam: bases legais por finalidade; dados de colaboradores dos clientes; fornecedores nomeados; transferência internacional; prazos de retenção; procedimento de incidente; encarregado ou canal.
12. **Papel da CALI com os dados dos colaboradores dos clientes:** o cliente é o controlador; a CALI é operadora. Precisa de cláusula (ou aditivo) de tratamento de dados nos contratos com os clientes.
13. **Transferência internacional:** banco nos EUA (Supabase us-east-2), hospedagem Vercel, e-mails Resend, agenda e Drive Google. A LGPD (art. 33) exige base para isso — normalmente as cláusulas-padrão contratuais da ANPD (Res. CD/ANPD 19/2024) e informação clara na política.
14. **Encarregado (DPO):** agente de pequeno porte pode ser dispensado de indicar encarregado (Res. CD/ANPD 2/2022), mas precisa manter um canal de comunicação com o titular. Confirmar enquadramento.
15. **Incidentes:** plano escrito; comunicação à ANPD e aos titulares em até 3 dias úteis quando houver risco relevante (Res. CD/ANPD 15/2024).
16. **Aceite registrado no primeiro acesso** (versão e data dos termos e da política) — hoje não existe.
17. **Direitos do titular no app:** exportar meus dados / pedir correção ou exclusão — hoje só por e-mail.
18. **Retenção e fim de contrato:** definir prazo e rotina de exportação + exclusão dos dados da empresa ao encerrar.
19. **Dados sensíveis em ocorrências** (saúde, disciplinares de colaboradores): orientar o uso, restringir acesso e registrar.
20. **Registro das operações de tratamento** (versão simplificada para pequeno porte).
