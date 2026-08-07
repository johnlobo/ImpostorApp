import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

afterEach(() => {
  document.body.innerHTML = ''
})
