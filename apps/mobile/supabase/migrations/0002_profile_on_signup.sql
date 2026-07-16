-- Auto-crea una fila en profiles cuando se registra un usuario en auth.users.
-- Sin esto, trees.user_id -> profiles(id) falla tras el signup (no hay perfil).
-- security definer: corre como owner, evita RLS/column grants.

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
begin
  -- username desde metadata (si el signup lo envía) o prefijo del email
  v_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(new.email, '@', 1),
    'user'
  );

  -- garantizar unicidad (profiles.username es unique not null)
  if exists (select 1 from profiles where username = v_username) then
    v_username := v_username || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  insert into profiles (id, username)
    values (new.id, v_username)
    on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
