-- Registro (aplicado direto em 15/10/2026, a pedido da proprietária): horas de referência do Portal.
-- CALI Partner 10 a 15 h/mês; CALI Full 20 a 25 h/mês. Preço base e teto NÃO mudaram ("o valor ainda é manual").
-- Build: horas e prazo continuam na tabela para a calculadora; textos dizem "definido na proposta".
update public.cali_pricing_rules set config = config || jsonb_build_object('hours_min', case package_code when 'PARTNER' then 10 else 20 end, 'hours_max', case package_code when 'PARTNER' then 15 else 25 end), updated_at = now()
where service_slug = 'assessoria-estrategica' and package_code in ('PARTNER','FULL');
