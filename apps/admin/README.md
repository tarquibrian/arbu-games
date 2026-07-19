# Arbu Games — Admin

Panel interno del equipo: alta de comercios y cupones, provisión de cuentas de comercio. Corre con `service_role` de Supabase (acceso total a la DB), gateado por allowlist (`admin_users`) — no hay self-signup.

Para instrucciones completas de setup (Supabase local, variables de entorno, bootstrap de la primera cuenta admin), ver el **[README de la raíz del repo](../../README.md)**.

```bash
npm install
npm run dev   # http://localhost:3000
```
