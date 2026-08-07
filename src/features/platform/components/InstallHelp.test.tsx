import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { translate } from '../../../i18n/translate'
import { InstallHelp } from './InstallHelp'

describe('InstallHelp', () => {
  it('shows the iOS home-screen instructions without an automatic install action', () => {
    render(<InstallHelp state="ios" />)

    expect(screen.getByRole('heading', { name: translate('install.help') })).toBeInTheDocument()
    expect(screen.getByText(/Compartir/i)).toBeInTheDocument()
    expect(screen.getByText(/Añadir a pantalla de inicio/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('offers the available Android install prompt', async () => {
    const user = userEvent.setup()
    const onInstall = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    render(<InstallHelp state="android" onInstall={onInstall} />)

    await user.click(screen.getByRole('button', { name: /Instalar ImpostorApp/i }))

    expect(onInstall).toHaveBeenCalledOnce()
  })

  it('explains the browser fallback when installation is unsupported', () => {
    render(<InstallHelp state="unsupported" />)

    expect(screen.getByRole('status')).toHaveTextContent(translate('install.unsupported'))
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('confirms that no further action is needed when already installed', () => {
    render(<InstallHelp state="installed" />)

    expect(screen.getByRole('status')).toHaveTextContent(/ImpostorApp ya está instalada/i)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
