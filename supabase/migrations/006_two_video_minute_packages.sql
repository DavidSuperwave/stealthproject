-- ============================================================
-- Doble Labs two-package video minute pricing
-- 1500 MXN = 25 min, 4000 MXN = 75 min.
-- ============================================================

update public.credit_packages
set active = false,
    is_best_value = false,
    updated_at = now();

do $$
begin
  if exists (select 1 from public.credit_packages where name = '25 minutos') then
    update public.credit_packages
    set
      price_cents_mxn = 150000,
      credits = 125,
      minutes_equivalent = 25,
      features = '{"25 minutos de video","Acceso a guiones","Flujo guiado de campanas"}',
      is_best_value = false,
      includes_scripts = true,
      active = true,
      sort_order = 10,
      updated_at = now()
    where name = '25 minutos';
  else
    insert into public.credit_packages
      (name, price_cents_mxn, credits, minutes_equivalent, features, is_best_value, includes_scripts, active, sort_order)
    values
      ('25 minutos', 150000, 125, 25, '{"25 minutos de video","Acceso a guiones","Flujo guiado de campanas"}', false, true, true, 10);
  end if;

  if exists (select 1 from public.credit_packages where name = '75 minutos') then
    update public.credit_packages
    set
      price_cents_mxn = 400000,
      credits = 375,
      minutes_equivalent = 75,
      features = '{"75 minutos de video","Acceso a guiones","Planeacion de campanas","Revision prioritaria de flujo"}',
      is_best_value = true,
      includes_scripts = true,
      active = true,
      sort_order = 20,
      updated_at = now()
    where name = '75 minutos';
  else
    insert into public.credit_packages
      (name, price_cents_mxn, credits, minutes_equivalent, features, is_best_value, includes_scripts, active, sort_order)
    values
      ('75 minutos', 400000, 375, 75, '{"75 minutos de video","Acceso a guiones","Planeacion de campanas","Revision prioritaria de flujo"}', true, true, true, 20);
  end if;
end $$;
