'use client'

import { useState } from 'react'

// Traduce el precio en monedas a algo que un humano pueda juzgar: cuántas
// verificaciones de árbol representa (earn_rate) y su referencia en Bs
// (value_rate) — ambos vienen de app_config, no hardcodeados aquí.
export function CouponPriceField({
  field,
  label,
  coinsPerValidation,
  coinsPerBs,
}: {
  field: string
  label: string
  coinsPerValidation: number
  coinsPerBs: number
}) {
  const [price, setPrice] = useState<number | null>(null)

  const validations = price && coinsPerValidation > 0 ? Math.round(price / coinsPerValidation) : null
  const bs = price && coinsPerBs > 0 ? Math.round(price / coinsPerBs) : null

  return (
    <div>
      <label className={label}>Precio (monedas) *</label>
      <input
        name="price_coins"
        type="number"
        min="1"
        required
        className={field}
        placeholder="150"
        onChange={(e) => {
          const v = Number(e.target.value)
          setPrice(Number.isFinite(v) && v > 0 ? v : null)
        }}
      />
      <p className="mt-1 text-xs text-neutral-400">
        {validations != null && bs != null
          ? `≈ ${validations} ${validations === 1 ? 'verificación' : 'verificaciones'} · ≈ ${bs} Bs`
          : 'Referencia: cuántas verificaciones de árbol le toma a un usuario ganar esto'}
      </p>
    </div>
  )
}
