import { es, type TranslationKey } from './es'

export function translate(
  key: TranslationKey,
  parameters: Readonly<Record<string, string | number>> = {},
): string {
  return Object.entries(parameters).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    es[key] as string,
  )
}
