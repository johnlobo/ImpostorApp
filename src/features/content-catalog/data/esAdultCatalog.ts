import { BUILT_IN_CATALOG_SCHEMA_VERSION, type BuiltInCategory } from './esCatalog'

const adultConcepts = Object.freeze(
  [
    'Cita a ciegas',
    'Flechazo inesperado',
    'Cena romántica',
    'Aplicación de citas',
    'Despedida de soltería',
    'Luna de miel',
    'Coqueteo',
    'Resaca',
    'Bar de copas',
    'Secreto de pareja',
  ].map((text, index) =>
    Object.freeze({
      id: `es-b15-c${String(index + 1).padStart(2, '0')}`,
      text,
    }),
  ),
)

export const ES_ADULT_CATALOG: readonly BuiltInCategory[] = Object.freeze([
  Object.freeze({
    id: 'es-b15',
    schemaVersion: BUILT_IN_CATALOG_SCHEMA_VERSION,
    source: 'built-in',
    name: 'Contenido adulto',
    adult: true,
    concepts: adultConcepts,
    createdAt: null,
    updatedAt: null,
  }),
])
