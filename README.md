# Arbu Games

Monorepo de **Arbu Games** — una app que convierte el monitoreo de arbolado urbano en una experiencia de ciencia ciudadana + gamificación + fidelización verde. Los usuarios mapean y verifican árboles en comunidad (modelo "1+3"), ganan ArbuCoins, y las canjean por beneficios reales en comercios locales. MVP en piloto para Cochabamba, Bolivia.

**Estado:** en desarrollo/pruebas. El loop completo (mapear → verificar → ganar monedas → canjear cupón con QR) ya funciona de punta a punta contra un backend Supabase real (local). No es producción todavía — ver `CLAUDE.md` para el detalle de qué está construido y qué falta (fase 2).

## Arquitectura

Tres apps independientes compartiendo un mismo backend Supabase, separadas por frontera de confianza:

| App | Quién la usa | Stack | Puerto |
|---|---|---|---|
| `apps/mobile` | Ciudadanos (mapean/verifican árboles, canjean cupones) | Expo / React Native | Expo Go |
| `apps/admin` | Equipo interno (alta de comercios/cupones) | Next.js + `service_role` | `:3000` |
| `apps/merchant` | Comercios (validan canjes vía QR) | Next.js + RLS | `:3001` |

El backend es un proyecto Supabase local (Postgres + Auth + Storage vía Docker), definido en `apps/mobile/supabase/` (migraciones + seed). Es portable — self-host o Supabase hosted post-MVP.

## Requisitos

- Node.js 20+ (no está fijado en el repo con `engines`, pero Next.js 16 lo requiere)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) corriendo
- Supabase CLI — no hace falta instalarlo global, `npx supabase` alcanza
- Expo Go (app en tu celular) o un simulador iOS/Android, para probar `apps/mobile`

## Levantar el proyecto (primera vez)

1. **Clonar el repo.**

2. **Levantar el backend — desde `apps/mobile/`, no desde la raíz:**
   ```bash
   cd apps/mobile
   npx supabase start
   ```
   El primer arranque corre las migraciones y el seed automáticamente (especies, 5 comercios, 5 cupones de ejemplo). El seed **no crea usuarios** — ni admin ni comercio, eso es un paso aparte (más abajo).

3. **Sacar las credenciales locales:**
   ```bash
   npx supabase status
   ```
   Da `API_URL`, `PUBLISHABLE_KEY` y `SERVICE_ROLE_KEY` (siempre los mismos valores fijos en local).

4. **Crear los archivos de entorno** (cada uno tiene su `.env.example` — copiar y completar con los valores de arriba):
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   cp apps/admin/.env.example apps/admin/.env.local
   cp apps/merchant/.env.example apps/merchant/.env.local
   ```

5. **Instalar dependencias en cada app** (no es un monorepo con workspaces — cada `apps/*` tiene su propio `node_modules`):
   ```bash
   npm install --prefix apps/mobile
   npm install --prefix apps/admin
   npm install --prefix apps/merchant
   ```

6. **Crear la primera cuenta admin** (a propósito solo por CLI, sin UI — crear un admin es acceso total a la DB):
   ```bash
   cd apps/admin
   node --env-file=.env.local scripts/create-admin.mjs tu@email.com unaClaveSegura
   ```

7. **Levantar las 3 apps** (en terminales separadas):
   ```bash
   npm start --prefix apps/mobile      # Metro — tocar i (iOS) o a (Android)
   npm run dev --prefix apps/admin     # http://localhost:3000
   npm run dev --prefix apps/merchant  # http://localhost:3001
   ```

8. **Crear una cuenta de comercio** desde `apps/admin` ya logueado (alta de comercio + cuenta en un solo paso) — no hay script para esto, es flujo de UI a propósito.

## Cuentas de prueba

Datos de desarrollo únicamente, contra el Supabase **local**. No usar este patrón en producción.

### Admin (`apps/admin`, `:3000`)
```
equipo@arbu.games / ArbuAdmin2026!
```

### Merchant (`apps/merchant`, `:3001`) — comercio "Café Verde"
```
cafe@verde.bo / CafeVerde2026!
```

### Mobile — Invitado A / Invitado B

En la pantalla de login de `apps/mobile` hay dos botones dev-only ("Invitado A" / "Invitado B") que loguean instantáneamente con dos cuentas fijas y reutilizables (`invitado.a@arbu.dev`, `invitado.b@arbu.dev`) en vez de crear una sesión anónima descartable.

**Para qué existen:** varios flujos del producto necesitan **dos o más usuarios distintos** para probarse de punta a punta — la validación comunitaria "1+3" (alguien mapea, otros verifican) y el canje de cupón con QR (uno reclama en el celular, otro valida desde `apps/merchant`). Sin esto, probar esos flujos requeriría crear cuentas nuevas o usar sesiones anónimas que se descartan y pierden el estado. Con Invitado A/B podés alternar entre dos identidades persistentes con un tap, cada una con sus propios árboles/monedas/cupones, y repetir la prueba las veces que haga falta.

## Comandos rápidos por app

```bash
# mobile (desde apps/mobile/)
npm start          # Metro — i para iOS, a para Android
npx tsc --noEmit    # type-check (no hay linter/test runner configurado)
npx supabase status # ver credenciales locales
npx supabase stop   # apagar el backend

# admin / merchant (desde cada carpeta)
npm run dev
```

## Dónde mirar después

- [`CLAUDE.md`](CLAUDE.md) — estado actual del build, arquitectura, reglas de dominio no obvias (modelo 1+3, cupones, gamificación por fases).
- [`apps/mobile/CLAUDE.md`](apps/mobile/CLAUDE.md) — gotchas específicos del stack de Expo/React Native.
- [`docs/arbu-games-documento-base.md`](docs/arbu-games-documento-base.md) — spec de producto completa (fuente de verdad de QUÉ construir).
