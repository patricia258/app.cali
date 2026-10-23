-- CALI Forms (23/10, aplicada como cali_forms_pipeline): triagem por formulário. Cada formulário pode ter etapas de
-- acompanhamento próprias (ex.: Novo, Em análise, Aprovado...); cada resposta guarda a etapa e o responsável.
-- Só a administradora lê e altera (políticas de form_responses já existentes).
alter table cali_workspace.forms add column if not exists stages jsonb check (stages is null or jsonb_typeof(stages) = 'array');
alter table cali_workspace.form_responses add column if not exists stage text check (stage is null or length(stage) <= 60);
alter table cali_workspace.form_responses add column if not exists owner text check (owner is null or length(owner) <= 120);
grant update (stage, owner) on cali_workspace.form_responses to authenticated;
