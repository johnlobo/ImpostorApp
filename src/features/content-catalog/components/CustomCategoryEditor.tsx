import { useState, type FormEvent } from 'react'
import type { ContentCategory } from '../../../domain/entities/contentCatalog'
import { translate } from '../../../i18n/translate'
import type { CustomCategoryInput } from '../services/contentCatalogService'

interface Props {
  categories: readonly ContentCategory[]
  disabled?: boolean
  onSave: (input: CustomCategoryInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function CustomCategoryEditor({ categories, disabled = false, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<ContentCategory | null>(null)
  const [name, setName] = useState('')
  const [concepts, setConcepts] = useState('')
  const [adult, setAdult] = useState(false)

  function edit(category: ContentCategory): void {
    setEditing(category)
    setName(category.name)
    setConcepts(category.concepts.map(({ text }) => text).join('\n'))
    setAdult(category.adult)
  }
  function clear(): void {
    setEditing(null)
    setName('')
    setConcepts('')
    setAdult(false)
  }
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const lines = concepts.split('\n').filter((line) => line.trim())
    await onSave({
      id: editing?.id,
      name,
      adult,
      concepts: lines.map((text, index) => ({ id: editing?.concepts[index]?.id, text })),
    })
  }

  return (
    <section aria-labelledby="custom-category-title">
      <h3 id="custom-category-title">{translate('catalog.custom.title')}</h3>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          {translate('catalog.custom.name')}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={disabled}
          />
        </label>
        <label>
          {translate('catalog.custom.concepts')}
          <textarea
            value={concepts}
            onChange={(event) => setConcepts(event.target.value)}
            disabled={disabled}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={adult}
            onChange={(event) => setAdult(event.target.checked)}
            disabled={disabled}
          />{' '}
          {translate('catalog.custom.adult')}
        </label>
        <button type="submit" disabled={disabled}>
          {translate(editing ? 'catalog.custom.save' : 'catalog.custom.create')}
        </button>
        {editing && (
          <button type="button" onClick={clear}>
            {translate('catalog.custom.cancel')}
          </button>
        )}
      </form>
      <ul>
        {categories.map((category) => (
          <li key={category.id}>
            <span>
              {translate('catalog.category.count', {
                name: category.name,
                count: category.concepts.length,
              })}
            </span>
            <button type="button" onClick={() => edit(category)} disabled={disabled}>
              {translate('catalog.custom.edit', { name: category.name })}
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(translate('catalog.custom.deleteConfirm', { name: category.name }))
                )
                  void onDelete(category.id)
              }}
              disabled={disabled}
            >
              {translate('catalog.custom.delete', { name: category.name })}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
