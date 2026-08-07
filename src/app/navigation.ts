export type AppScreen = 'home' | 'help'
export interface NavigationState {
  screen: AppScreen
}
export type NavigationAction = { type: 'GO_HOME' } | { type: 'OPEN_HELP' } | { type: 'BACK' }
export const initialNavigationState: NavigationState = { screen: 'home' }

export function navigationReducer(
  state: NavigationState,
  action: NavigationAction,
): NavigationState {
  switch (action.type) {
    case 'OPEN_HELP':
      return { screen: 'help' }
    case 'GO_HOME':
    case 'BACK':
      return initialNavigationState
    default:
      return state
  }
}
