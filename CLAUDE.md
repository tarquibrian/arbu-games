# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

**Arbu Games** — a mobile app that turns urban-tree monitoring into a citizen-science + gamified + green-loyalty experience. Citizens map/verify trees, earn a virtual coin (ArbuCoins), and redeem it for real benefits at local merchants. MVP target is a 3-month pilot in Cochabamba, Bolivia. Sister app "Arbu" exists and shares data bidirectionally (see `docs/`).

## Repository layout (monorepo)

- `apps/mobile/` — the citizen-facing product: an Expo / React Native app. **Has its own `apps/mobile/CLAUDE.md`** with stack-specific gotchas — read it before touching mobile code.
- `apps/admin/` — internal team tool (Next.js, `service_role`, allowlist-gated via `admin_users`). Manages merchants, coupons, and merchant account provisioning.
- `apps/merchant/` — comercio-facing tool (Next.js, RLS via `merchant_members`). Login + QR/manual redemption validation against a comercio's own coupons.
- `docs/` — the strategic product design (source of truth for WHAT to build, not necessarily what's built yet). `arbu-games-documento-base.md` is the canonical base document; `.docx`/`.pdf` are derived exports of it. `guia-materiales-derivados.md` covers derived materials.
- `test/design/` — reference designs (plain JSX/HTML web mockups + screenshots). Mobile screens are migrated FROM these; consult them for intended visuals.
- root `README.md` — **local setup instructions for all 3 apps + the shared Supabase backend.** Read this first if you're trying to get the project running.
- root `package.json` — only carries `docx` (tooling to export the design doc). No app code lives at root; the `test` script is a placeholder.

## Current build status (read this first)

The core citizen loop is wired end-to-end against a real (locally-hosted) Supabase backend across all 3 apps — this is **not** a mock-data prototype anymore:

- **Ranking real (0008)**: RPCs `leaderboard(period, limit)` y `leaderboard_me(period)` — puntos calculados en el servidor con la perilla `app_config.points_rate` (`{map:10, verify:15}`), semana ISO cortada a las 00:00 del lunes **hora de Bolivia** (no UTC). `ranking.tsx` ya no tiene mock: podio, lista, tu-posición-si-quedás-fuera y vacíos reales. MVP = sólo estatus, sin premio (13.6).
  - Dos bugs corregidos de paso: (1) `profiles.total_trees_validated` cuenta *árboles propios que se validaron*, no verificaciones hechas — el perfil lo mostraba como "Verificados" y la insignia lo usaba mal; ahora las verificaciones salen de `tree_validations`. (2) `app_config` tenía policy de SELECT pero **nunca** el GRANT de tabla, así que `getAppConfig()` fallaba silenciosamente y toda la app corría con los defaults del cliente.
  - `getMyStats()` ya no recalcula puntos: los toma de `leaderboard_me('all')`, para que perfil, home y ranking no puedan divergir.
- **Ficha pública (`tree/[id].tsx`)**: real, no mock — foto de copa + tronco, ficha completa con chip "sin acuerdo" en cada campo disputado, bloque "Cómo se validó" (respuesta de cada participante + desglose por campo en disputa) y procedencia (coords, precisión GPS, fecha). Se entra desde "Ver ficha completa" en Explorar. Deliberadamente **no** se linkea desde `tree/verify` para árboles aún sin verificar: mostraría la ficha ajena antes de que el verificador responda.
- **Ficha del árbol + consenso (0007)**: el registro captura especie (catálogo), **circunferencia con cinta** (el DAP lo deriva un trigger — el cliente no puede desviarlos), altura por rango, contexto de plantación, conflictos con infraestructura, urgencia y **2 fotos pautadas** (copa + tronco). El verificador responde *los mismos campos por su cuenta* (sin prefill, y la ficha del registrante no se le muestra antes: prellenar convierte el consenso en un botón de "sí"); al completarse el 1+3, `apply_validation_consensus()` aplica mayoría campo por campo. Sin mayoría → se conserva el valor del registrante y el campo entra en `trees.disputed_fields`. Vocabulario ES compartido en `src/features/trees/vocab.ts`; controles compartidos en `src/features/trees/components/FormControls.tsx`.
- **GPS real (0006)**: registrar centra el pin en la posición del device y guarda `gps_accuracy` (advierte sobre `gps_accuracy_max_m`, 15 m, sin bloquear); antes de insertar consulta el RPC `nearby_trees()` y ofrece "¿es uno de estos?" → manda a `tree/verify?treeId=…` en vez de duplicar. Verificar es **geofenced server-side**: `handle_new_validation()` exige lat/lng y rechaza si la distancia supera `verify_radius_m` (30 m). El cliente replica el chequeo sólo como UX. Ver "GPS en desarrollo" en el README para simulador.
- **Schema**: `apps/mobile/supabase/migrations/0001`–`0006` — `trees`, `tree_validations`, `coupons`, `coupon_redemptions`, `merchants`, `merchant_members`, `admin_users`, `wallet_transactions`, `app_config` (server-tunable knobs like `earn_rate`), all with RLS + server-authoritative triggers/RPCs (client never sets `status`, `validations_count`, `coins`, etc. directly).
- **Mobile**: register a tree (live photo → Storage, DAP, health) → real insert, starts `pending`; community "1+3" verification (`tree/verify.tsx`) — 3 distinct non-owner users validate on-site, trigger pays out on the 3rd and flips status to `validated`; "Explorar Árboles" (`tree/explore.tsx`) is a read-only map of the whole known population with aggregate stats (species, validated count, new this week, estimated CO2); wallet/coupons are fully live — balance, catalog, redeem (mints a real scannable QR via `react-native-qrcode-svg`), "Mis Cupones"; profile/home stats are derived from real server-side counters (mapped/validated/CO2/level), not hardcoded numbers.
- **Admin** (`apps/admin`): merchant + coupon CRUD, merchant account provisioning (creates the Supabase Auth user + `merchant_members` row in one action). First admin account is bootstrapped via a CLI script, not a UI — see root `README.md`.
- **Merchant** (`apps/merchant`): camera-based QR scanner (real `getUserMedia` + `jsQR`, not a placeholder) with a manual-code fallback, both calling the atomic `validate_redemption()` RPC — single-use, scoped to the logged-in comercio's own coupons.
- **Dev-only test accounts**: the mobile login screen has "Invitado A" / "Invitado B" quick-login buttons, `__DEV__`-gated. These are fixed, reusable throwaway accounts (unlike anonymous sign-in, they persist state across app restarts) specifically so you can exercise multi-user flows — the 1+3 validation loop, a coupon claimed by one account and redeemed at the merchant — by switching between two accounts instead of juggling real emails. See root `README.md` for exact credentials.
- **`docs/` is still ahead of the code for Phase 2 items**: sponsored missions, referrals, communities, global cash-linked ranking, merchant self-service portal (see `docs/arbu-games-documento-base.md` §12.3, §13.6, §13.8). Treat those sections as future spec, not a build gap in the current MVP.
- The old ES→EN health-label map in `src/features/trees/api.ts` is gone: screens now use the schema enums directly and translate only at render time via `vocab.ts`.

## Mobile app — commands

Run from `apps/mobile/`:

```bash
npm start          # Metro bundler (press i for iOS, a for Android)
npm run ios        # start + open iOS simulator
npm run android    # start + open Android emulator
npm run web        # web target
```

There is no test runner or linter configured. Type-check with `npx tsc --noEmit` from `apps/mobile/`.

## Mobile app — architecture (big picture)

- **Routing:** Expo Router (file-based) under `app/`. Route groups: `(auth)` (login/register) and `(tabs)` (main app: `index` Inicio, `plus` action-sheet modal for Mapear/Verificar/Explorar, `profile`, `ranking`, `rewards`), plus `tree/` (`new` register, `[id]` detail, `verify` 1+3, `explore` read-only map). `_layout.tsx` files own the auth guards and redirects.
- **Backend:** Supabase (`src/lib/supabase.ts`), typed via `src/types/database.types.ts` (generated from the real schema now, not hand-written). Core tables: `profiles` (coins, counters), `trees` (status `pending|stalled|validated|unverifiable|rejected`, `validations_count`), `tree_validations` (the 1+3 verification records), `coupons`/`coupon_redemptions`/`merchants` (green-loyalty loop), `wallet_transactions` (`earn|redeem`).
- **State:** auth via **Zustand** (`src/features/auth/store/`), set by the root layout's `supabase.auth.onAuthStateChange` listener; server state via **TanStack React Query** (`src/lib/queryClient.ts`); simple persistence via **AsyncStorage** (Expo Go compatible). Path alias `@/*` → `./src/*`.
- **Styling:** NativeWind v4 (Tailwind v3). Dark-green theme; shared `ScreenBackground` owns the app background. See `apps/mobile/CLAUDE.md` for the SVG/gradient/shadow translation rules and version constraints (SDK 56, Tailwind must stay v3, MMKV incompatible with Expo Go, etc.).

## Domain rules that drive the build (non-obvious; from `docs/`)

Building features correctly requires these product rules — they are not inferable from the code:

- **Validation "1+3":** a new tree registration starts `Pendiente`; 3 distinct users must verify it on-site to become `Validado`. Reward is paid **only on validation**, split among the 4 participants. Coins/actions and coin value are meant to be server-side tunable knobs (`earn_rate`, internal `value_rate` ≈ 1 Bs = 10 coins — note `rewards.tsx` already hardcodes `balance/10`).
- **Coins → coupons only:** spending is always via merchant-defined coupons (product / discount / service / ticket), not free balance. Coupons carry a claim window and a separate post-claim use window, a quota, and a redemption location (`app` vs `en el comercio`). QR validates redemption at the merchant.
- **Gamification is phased:** habit layer (streaks, levels, badges, simple weekly status-only ranking) is MVP; social/sponsored layer (systematized events, referrals, communities, reputation, adoption, global cash-linked ranking, sponsored missions) is Phase 2.

For anything touching trees, wallet, rewards, ranking, or the Arbu data relationship, check `docs/arbu-games-documento-base.md` (sections 13.1–13.8, 10.3, 5.2) before implementing.
