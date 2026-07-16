# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

**Arbu Games** — a mobile app that turns urban-tree monitoring into a citizen-science + gamified + green-loyalty experience. Citizens map/verify trees, earn a virtual coin (ArbuCoins), and redeem it for real benefits at local merchants. MVP target is a 3-month pilot in Cochabamba, Bolivia. Sister app "Arbu" exists and shares data bidirectionally (see `docs/`).

## Repository layout (monorepo)

- `apps/mobile/` — the actual product: an Expo / React Native app. **Has its own `apps/mobile/CLAUDE.md`** with stack-specific gotchas — read it before touching mobile code.
- `docs/` — the strategic product design (source of truth for WHAT to build). `arbu-games-documento-base.md` is the canonical base document; `.docx`/`.pdf` are derived exports of it. `guia-materiales-derivados.md` covers derived materials.
- `test/design/` — reference designs (plain JSX/HTML web mockups + screenshots). Mobile screens are migrated FROM these; consult them for intended visuals.
- root `package.json` — only carries `docx` (tooling to export the design doc). No app code lives at root; the `test` script is a placeholder.

## Current build status (read this first)

`apps/mobile` is a **UI prototype, not a functional MVP**. Do not assume anything is wired:

- All screens use **hardcoded mock data**; submit/redeem handlers show `Alert`s and mutate local state — there are **no real Supabase reads/writes** yet.
- `apps/mobile/src/types/database.types.ts` is a **hand-written placeholder schema**; the Supabase project is not created/connected.
- **`docs/` is ahead of the code.** Many decisions specified in the base document are not yet in the schema or screens (e.g. tree `origin` plantado/existente, species capture in the register form, GPS accuracy + duplicate detection, the coupon entity with claim/use windows + `app`-vs-`en el lugar` redemption + tiers, merchant entity, the Pending→Estancado→No-verificable state machine, re-monitoring, audit/flag flows, merchant portal). When building, treat `docs/arbu-games-documento-base.md` as the spec and the current screens as visual scaffolding.
- Minor known drift: register-form health labels are Spanish (`Bueno/Regular/Pobre/Muerto`) while the schema enum is English (`good/regular/poor/dead`); `apps/mobile/CLAUDE.md`'s tab list is itself stale vs the actual `app/(tabs)/` files.

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

- **Routing:** Expo Router (file-based) under `app/`. Route groups: `(auth)` (login/register) and `(tabs)` (main app), plus `tree/` (register, verify, detail). `_layout.tsx` files own the auth guards and redirects.
- **Intended backend:** Supabase (`src/lib/supabase.ts`), typed via `src/types/database.types.ts`. Core tables in the placeholder schema: `profiles` (coins, counters), `trees` (status `pending|validated|rejected`, `validations_count`), `tree_validations` (the 1+3 verification records), `wallet_transactions` (`earn|redeem`).
- **State:** auth via **Zustand** (`src/features/auth/store/`), set by the root layout's `supabase.auth.onAuthStateChange` listener; server state via **TanStack React Query** (`src/lib/queryClient.ts`); simple persistence via **AsyncStorage** (Expo Go compatible). Path alias `@/*` → `./src/*`.
- **Styling:** NativeWind v4 (Tailwind v3). Dark-green theme; shared `ScreenBackground` owns the app background. See `apps/mobile/CLAUDE.md` for the SVG/gradient/shadow translation rules and version constraints (SDK 56, Tailwind must stay v3, MMKV incompatible with Expo Go, etc.).

## Domain rules that drive the build (non-obvious; from `docs/`)

Building features correctly requires these product rules — they are not inferable from the code:

- **Validation "1+3":** a new tree registration starts `Pendiente`; 3 distinct users must verify it on-site to become `Validado`. Reward is paid **only on validation**, split among the 4 participants. Coins/actions and coin value are meant to be server-side tunable knobs (`earn_rate`, internal `value_rate` ≈ 1 Bs = 10 coins — note `rewards.tsx` already hardcodes `balance/10`).
- **Coins → coupons only:** spending is always via merchant-defined coupons (product / discount / service / ticket), not free balance. Coupons carry a claim window and a separate post-claim use window, a quota, and a redemption location (`app` vs `en el comercio`). QR validates redemption at the merchant.
- **Gamification is phased:** habit layer (streaks, levels, badges, simple weekly status-only ranking) is MVP; social/sponsored layer (systematized events, referrals, communities, reputation, adoption, global cash-linked ranking, sponsored missions) is Phase 2.

For anything touching trees, wallet, rewards, ranking, or the Arbu data relationship, check `docs/arbu-games-documento-base.md` (sections 13.1–13.8, 10.3, 5.2) before implementing.
