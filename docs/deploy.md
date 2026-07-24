# Deploy — piloto Cochabamba

Infra elegida:

| Pieza | Dónde | Herramienta |
|---|---|---|
| Backend (Postgres + Auth + Storage) | **Supabase Cloud** | `supabase` CLI |
| `apps/admin` + `apps/merchant` (Next.js) | **VPS propio** | Node + pm2 + nginx |
| `apps/mobile` (Expo) | **EAS** (build en la nube) | `eas` CLI |

> **Nota de responsabilidades.** Los pasos marcados 🔑 requieren crear cuentas,
> cargar secretos o acceder a tu VPS — sólo los hacés vos. El repo ya está
> preparado para que el resto sea correr comandos (migraciones, `eas.json`,
> catálogo de especies en migración, etc.).

Orden recomendado: **1) Backend → 2) VPS web → 3) Mobile.** Las apps no arrancan
sin el backend.

---

## 1. Backend — Supabase Cloud

### 1.1 Crear el proyecto 🔑
1. Crear proyecto en https://supabase.com (región más cercana a Bolivia, p.ej.
   `sa-east-1` São Paulo). Guardar la **DB password**.
2. Del dashboard → Project Settings → API, anotar:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon / publishable key** (pública, va en los clientes)
   - **service_role key** (SECRETA — sólo backend/admin, nunca en el cliente)
3. El **project ref** es el `xxxx` de la URL.

### 1.2 Linkear y empujar el schema
Desde `apps/mobile/`:

```bash
supabase login                      # 🔑 abre el navegador, token de tu cuenta
supabase link --project-ref <ref>   # 🔑 pide la DB password
supabase db push                    # corre migraciones 0001 → 0011 en orden
```

`db push` aplica **sólo las migraciones**, no `seed.sql`. Eso es lo correcto en
producción:
- ✅ El **catálogo de especies** ya está en la migración `0011` (idempotente), así
  que existe en prod. (Antes vivía en `seed.sql` y hubiera quedado vacío.)
- ✅ El **catálogo de misiones** está en `0009`.
- ✅ El **bucket de Storage `tree-photos`** lo crea la migración `0003`.
- ❌ Los **comercios/cupones de prueba** de `seed.sql` NO se cargan: en prod se
  crean desde el admin (paso 2). Correcto — eran datos de prueba.

### 1.3 Primer admin 🔑
El primer admin se crea por CLI (no hay UI para el bootstrap). Desde `apps/admin/`,
con `.env.local` apuntando a **producción** (URL + service_role de Cloud):

```bash
node --env-file=.env.local scripts/create-admin.mjs tu@email.com unaClaveSegura
```

Después, ese admin crea comercios, cupones y cuentas de comercio desde la UI.

### 1.4 Verificación
En el SQL editor de Supabase Cloud:
```sql
select count(*) from species;   -- 9
select count(*) from missions;  -- 6
select id from storage.buckets where id = 'tree-photos';  -- 1 fila
```

---

## 2. Web — admin + merchant en el VPS

Dos apps Next.js: `admin` en **:3000**, `merchant` en **:3001** (ya configurado
en su `package.json`). Apuntan al Supabase Cloud del paso 1.

### 2.1 Variables de entorno 🔑
Crear `.env.local` en cada app con los valores **de producción**:

`apps/admin/.env.local`
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role — SECRETA>
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=<anon/publishable>
```

`apps/merchant/.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=<anon/publishable>
```

> El `service_role` va **sólo** en admin (backend con permisos totales). Merchant
> usa RLS con la anon key. Nunca poner `service_role` en merchant ni en mobile.

### 2.2 Build + arranque en el VPS 🔑
En el VPS (Node 20+), por cada app:

```bash
npm ci
npm run build
```

Correr con pm2 (sobrevive reinicios):

```bash
npm i -g pm2
pm2 start "npm run start" --name arbu-admin    --cwd apps/admin
pm2 start "npm run start" --name arbu-merchant  --cwd apps/merchant
pm2 save && pm2 startup    # 🔑 el startup imprime un comando con sudo para ejecutar
```

### 2.3 Reverse proxy + TLS 🔑
nginx delante, un subdominio por app, con HTTPS (Let's Encrypt / certbot):

```nginx
server {
  server_name admin.arbu.games;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}
server {
  server_name comercio.arbu.games;
  location / { proxy_pass http://127.0.0.1:3001; proxy_set_header Host $host; }
}
```

```bash
sudo certbot --nginx -d admin.arbu.games -d comercio.arbu.games   # 🔑
```

---

## 3. Mobile — EAS build

`eas.json` ya está en `apps/mobile/` con tres perfiles:
- **development** — dev client (Metro en vivo), corre en simulador.
- **preview** — APK / build interno para instalar en teléfonos de testers. **Este
  es el del piloto.**
- **production** — build de tienda (auto-incrementa versión).

> **Sobre push notifications.** Salir de Expo Go es condición *necesaria* pero no
> suficiente: `expo-notifications` todavía **no está instalado** en el proyecto y
> `app.json` no tiene config de push. El build de preview no manda notificaciones
> por sí solo — eso es trabajo aparte.
>
> **Sobre OTA updates.** `eas.json` no define `channel` a propósito: los channels
> son de EAS Update y `expo-updates` no está instalado. Si más adelante querés
> updates OTA, instalá `expo-updates` primero y recién ahí agregá los channels.

### 3.1 Preparar 🔑
Desde `apps/mobile/`:

```bash
npm i -g eas-cli
eas login                 # 🔑 tu cuenta Expo
eas init                  # 🔑 crea el proyecto EAS y escribe extra.eas.projectId en app.json
```

### 3.2 Variables de entorno del build 🔑
El bundle necesita apuntar a Supabase Cloud. Registrar las env públicas en EAS:

```bash
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://xxxx.supabase.co
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_KEY --value <anon/publishable>
```

(O un `.env` local si preferís; sólo la anon key, nunca `service_role`.)

### 3.3 Build para el piloto
```bash
eas build --profile preview --platform android   # APK para testers
eas build --profile preview --platform ios       # 🔑 requiere cuenta Apple Developer
```

Android entrega un link de APK instalable directo. iOS necesita cuenta Apple
Developer (99 USD/año) y registrar los UDID de los testers, o TestFlight.

---

## Checklist de corte

- [ ] Supabase Cloud creado, `db push` OK (especies=9, misiones=6, bucket ok)
- [ ] Primer admin creado por CLI
- [ ] Comercios + cupones del piloto cargados desde el admin
- [ ] admin.arbu.games y comercio.arbu.games arriba con HTTPS
- [ ] APK de preview distribuido a los testers, apuntando a Cloud
- [ ] Probar el loop end-to-end en prod: registrar árbol → 1+3 → canje QR en merchant

## Antes de empezar

⚠️ El disco de la máquina de desarrollo está al ~97%. Un build de EAS es en la
nube (no toca el disco local), pero `npm ci`/`npm run build` de las Next sí.
Liberar espacio antes: `docker system prune -a` y revisar `~/Library/Caches`.
