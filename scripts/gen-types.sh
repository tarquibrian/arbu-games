#!/usr/bin/env bash
# Regenera los tipos del schema para las tres apps desde la base local.
#
# Por qué existe: las tres apps hablan con el MISMO schema, así que sus tipos
# tienen que salir de la misma fuente. Cuando se mantenían a mano, cada una
# terminó viendo un schema distinto (una conocía `pilot_metrics`, otra
# `merchant_activity`, ninguna las dos) y los errores aparecían recién en runtime.
#
# Sólo se toca `database.generated.ts`. Las columnas computadas de PostgREST
# viven aparte en `database.types.ts`, que este script NO pisa — ver el comentario
# de ese archivo.
#
# Uso:  ./scripts/gen-types.sh     (necesita supabase local corriendo)

set -euo pipefail

cd "$(dirname "$0")/.."

TARGETS=(
  "apps/mobile/src/types/database.generated.ts"
  "apps/admin/lib/database.generated.ts"
  "apps/merchant/lib/database.generated.ts"
)

echo "Generando tipos desde la base local…"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

(cd apps/mobile && npx supabase gen types typescript --local) > "$TMP"

# Un archivo vacío o un JSON de error significa que la base no está corriendo:
# sin este chequeo, el script pisaría los tres archivos con basura.
if [ ! -s "$TMP" ] || head -c 1 "$TMP" | grep -q '{'; then
  echo "ERROR: no se pudo generar. ¿Está corriendo 'npx supabase start' en apps/mobile?" >&2
  head -3 "$TMP" >&2
  exit 1
fi

for t in "${TARGETS[@]}"; do
  cp "$TMP" "$t"
  echo "  ✓ $t"
done

echo
echo "Listo. Verificá con: npm run typecheck en cada app."
