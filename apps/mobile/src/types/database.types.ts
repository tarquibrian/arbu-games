import type { Database as Generated } from './database.generated'

export type { Json } from './database.generated'

// ============================================================
// Columnas computadas de PostgREST
//
// `supabase gen types` NO las incluye: son funciones `f(tabla)` que PostgREST
// expone como si fueran columnas, y el generador no puede adivinar cuáles lo
// son. Antes se parchaban a mano dentro del archivo generado, así que cada
// regeneración las borraba y las tres apps terminaron con schemas distintos.
//
// Ahora lo generado vive intacto en `database.generated.ts` (regenerable con
// `npm run gen:types`) y este archivo declara aparte lo que hay que sumarle.
// Si agregás una columna computada nueva, va acá.
// ============================================================

type ComputedColumns = {
  trees: {
    /** `is_stalled(trees)` — 0012. Pendiente sin completar el 1+3 pasados `stalled_after_days`. */
    is_stalled: boolean
  }
}

type WithComputed<S extends { Tables: Record<string, { Row: object }> }> = Omit<S, 'Tables'> & {
  Tables: {
    [T in keyof S['Tables']]: T extends keyof ComputedColumns
      ? Omit<S['Tables'][T], 'Row'> & { Row: S['Tables'][T]['Row'] & ComputedColumns[T] }
      : S['Tables'][T]
  }
}

export type Database = Omit<Generated, 'public'> & {
  public: WithComputed<Generated['public']>
}
