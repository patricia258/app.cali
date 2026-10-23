-- CALI Forms (23/10, aplicada como cali_forms_submit_label_success): texto do botão final e mensagem de sucesso
-- próprios por formulário (vazios = padrão "Enviar" e "Muito obrigado!"). A função pública passa a devolvê-los.
alter table cali_workspace.forms add column if not exists submit_label text check (submit_label is null or length(submit_label) <= 60);
alter table cali_workspace.forms add column if not exists success_text text check (success_text is null or length(success_text) <= 600);
create or replace function public.cali_form_public(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select jsonb_build_object('id', f.id, 'slug', f.slug, 'title', f.title, 'description', f.description, 'thank_you', f.thank_you,
         'status', f.status, 'confirm_email', f.confirm_email, 'category', f.category,
         'submit_label', f.submit_label, 'success_text', f.success_text,
         'questions', case when f.status = 'open' then f.questions else '[]'::jsonb end)
    from cali_workspace.forms f
   where f.slug = lower(btrim(coalesce(p_slug, ''))) and f.status in ('open', 'closed');
$$;
