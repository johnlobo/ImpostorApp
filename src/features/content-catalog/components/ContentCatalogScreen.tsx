import { useEffect } from 'react'
import type { PreparedContentSelection } from '../../../domain/entities/contentCatalog'
import type { CatalogIssue } from '../../../domain/entities/contentCatalog'
import { translate } from '../../../i18n/translate'
import type { ContentCatalogController } from '../hooks/useContentCatalog'
import { CustomCategoryEditor } from './CustomCategoryEditor'

interface Props {
  controller: ContentCatalogController
  onConfirmed?: (content: PreparedContentSelection) => void
}

const issueKeys: Record<CatalogIssue, Parameters<typeof translate>[0]> = {
  'invalid-game': 'catalog.issue.invalid-game',
  'invalid-category': 'catalog.issue.invalid-category',
  'duplicate-category-id': 'catalog.issue.duplicate-category-id',
  'duplicate-category-name': 'catalog.issue.duplicate-category-name',
  'duplicate-concept-id': 'catalog.issue.duplicate-concept-id',
  'duplicate-concept-text': 'catalog.issue.duplicate-concept-text',
  'insufficient-built-in-concepts': 'catalog.issue.insufficient-built-in-concepts',
  'invalid-selection': 'catalog.issue.invalid-selection',
  'adult-content-disabled': 'catalog.issue.adult-content-disabled',
  'insufficient-concepts': 'catalog.issue.insufficient-concepts',
  'invalid-random': 'catalog.issue.invalid-random',
  'content-exhausted': 'catalog.issue.content-exhausted',
  'invalid-confirmation': 'catalog.issue.invalid-confirmation',
}

export function ContentCatalogScreen({ controller, onConfirmed }: Props) {
  const { state } = controller
  const disabled = state.readOnly || ['loading', 'saving', 'drawing'].includes(state.status)

  useEffect(() => {
    if (state.status === 'confirmed' && state.prepared) onConfirmed?.(state.prepared)
  }, [onConfirmed, state.prepared, state.status])

  if (state.status === 'loading') return <p role="status">{translate('catalog.loading')}</p>
  return (
    <main className="content-catalog-screen">
      <header>
        <p className="muted">{translate('catalog.eyebrow')}</p>
        <h2>{translate('catalog.title')}</h2>
      </header>
      {state.readOnly && <p role="status">{translate('catalog.observer')}</p>}
      {state.storageError && (
        <div role="alert">
          <p>{translate('catalog.error.storage')}</p>
          <button type="button" onClick={() => void controller.retry()}>
            {translate('catalog.retry')}
          </button>
        </div>
      )}
      {state.issues.length > 0 && (
        <div className="status-message error-message" role="alert">
          {state.issues.map((issue) => (
            <p key={issue}>{translate(issueKeys[issue])}</p>
          ))}
        </div>
      )}

      {state.status === 'reviewing' ? (
        <section aria-labelledby="catalog-review-title">
          <h3 id="catalog-review-title">{translate('catalog.review.title')}</h3>
          <p>
            {state.draft.selection.mode === 'selected'
              ? translate('catalog.review.selected', {
                  count: state.draft.selection.categoryIds.length,
                })
              : state.draft.selection.mode === 'all'
                ? translate('catalog.review.all')
                : translate('catalog.review.random')}
          </p>
          <button type="button" onClick={controller.edit}>
            {translate('catalog.edit')}
          </button>
          <button type="button" onClick={() => void controller.confirm()} disabled={disabled}>
            {translate('catalog.confirm')}
          </button>
        </section>
      ) : (
        <>
          <fieldset disabled={disabled}>
            <legend>{translate('catalog.mode')}</legend>
            {(['all', 'random-category'] as const).map((mode) => (
              <label key={mode}>
                <input
                  type="radio"
                  name="selection-mode"
                  checked={state.draft.selection.mode === mode}
                  onChange={() => controller.setSelection({ mode })}
                />
                {translate(mode === 'all' ? 'catalog.mode.all' : 'catalog.mode.random')}
              </label>
            ))}
            <label>
              <input
                type="radio"
                name="selection-mode"
                checked={state.draft.selection.mode === 'selected'}
                onChange={() =>
                  controller.setSelection({
                    mode: 'selected',
                    categoryIds: [
                      state.categories.find(
                        (item) => state.draft.adultContentEnabled || !item.adult,
                      )?.id ?? '',
                    ],
                  })
                }
              />
              {translate('catalog.mode.selected')}
            </label>
          </fieldset>
          {state.draft.selection.mode === 'selected' && (
            <fieldset disabled={disabled}>
              <legend>{translate('catalog.categories')}</legend>
              {state.categories
                .filter((item) => state.draft.adultContentEnabled || !item.adult)
                .map((category) => {
                  const selected =
                    state.draft.selection.mode === 'selected' &&
                    state.draft.selection.categoryIds.includes(category.id)
                  return (
                    <label key={category.id}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          if (state.draft.selection.mode !== 'selected') return
                          const ids = selected
                            ? state.draft.selection.categoryIds.filter((id) => id !== category.id)
                            : [...state.draft.selection.categoryIds, category.id]
                          if (ids.length)
                            controller.setSelection({ mode: 'selected', categoryIds: ids })
                        }}
                      />
                      {translate('catalog.category.count', {
                        name: category.name,
                        count: category.concepts.length,
                      })}
                    </label>
                  )
                })}
            </fieldset>
          )}
          <label>
            <input
              type="checkbox"
              checked={state.draft.adultContentEnabled}
              disabled={disabled}
              onChange={(event) => void controller.requestAdultContent(event.target.checked)}
            />{' '}
            {translate('catalog.adult.toggle')}
          </label>
          <button type="button" onClick={controller.review} disabled={disabled}>
            {translate('catalog.review.action')}
          </button>
        </>
      )}

      {state.adultConfirmationPending && (
        <div role="dialog" aria-modal="true" aria-labelledby="adult-confirm-title">
          <h2 id="adult-confirm-title">{translate('catalog.adult.title')}</h2>
          <p>{translate('catalog.adult.description')}</p>
          <button type="button" onClick={controller.cancelAdultContent}>
            {translate('catalog.cancel')}
          </button>
          <button type="button" onClick={() => void controller.confirmAdultContent()}>
            {translate('catalog.adult.activate')}
          </button>
        </div>
      )}

      {state.prepared && (
        <section aria-labelledby="draw-title">
          <h3 id="draw-title">{translate('catalog.prepared')}</h3>
          <button type="button" disabled={disabled} onClick={() => void controller.draw()}>
            {translate('catalog.draw')}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (window.confirm(translate('catalog.history.confirm')))
                void controller.resetHistory()
            }}
          >
            {translate('catalog.history.reset')}
          </button>
          {state.drawn && <p role="status">{translate('catalog.drawn')}</p>}
        </section>
      )}
      <CustomCategoryEditor
        categories={state.customCategories}
        disabled={disabled}
        onSave={controller.saveCustomCategory}
        onDelete={controller.deleteCustomCategory}
      />
    </main>
  )
}
