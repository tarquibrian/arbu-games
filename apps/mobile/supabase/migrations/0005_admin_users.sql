-- Allowlist del equipo Arbu Games para apps/admin.
-- El admin corre con service_role (poder total), así que la puerta de entrada tiene
-- que ser explícita: estar en esta tabla. No basta con "estar autenticado".

create table admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

-- Sin políticas para 'authenticated': nadie lee/escribe esta tabla desde el cliente.
-- Solo el service_role (server-side del admin) la consulta para autorizar.
grant all on admin_users to service_role;
