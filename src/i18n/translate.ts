import { es, type TranslationKey } from './es'

export function translate(key: TranslationKey): string {
  return es[key]
}
