# Arbu Games — Merchant

App del comercio: login + validación de canjes (escaneo de QR por cámara, con fallback de código manual). Corre con RLS (`merchant_members`) — cada cuenta solo ve/valida los cupones de su propio comercio. Las cuentas de comercio se crean desde `apps/admin`, no hay self-signup acá.

Para instrucciones completas de setup (Supabase local, variables de entorno), ver el **[README de la raíz del repo](../../README.md)**.

```bash
npm install
npm run dev   # http://localhost:3001
```
