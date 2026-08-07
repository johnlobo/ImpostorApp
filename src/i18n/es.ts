export const es = {
  'app.name': 'ImpostorApp',
  'app.tagline': 'La partida vive en este dispositivo',
  'nav.home': 'Inicio',
  'nav.help': 'Ayuda',
  'platform.initializing': 'Preparando la aplicación…',
  'platform.offlineReady': 'Lista para jugar sin conexión',
  'platform.firstLoadRequired': 'Conéctate para completar la primera preparación.',
  'platform.retry': 'Reintentar preparación',
  'platform.storageFull': 'No hay espacio suficiente para guardar de forma segura.',
  'platform.storageUnavailable': 'El almacenamiento local no está disponible.',
  'platform.incompatibleData': 'Estos datos pertenecen a una versión no compatible.',
  'platform.writerUnavailable': 'Otra ventana está usando la partida. Esta ventana es de consulta.',
  'platform.updateAvailable': 'Hay una actualización preparada.',
  'platform.applyUpdate': 'Aplicar actualización',
  'platform.postponeUpdate': 'Ahora no',
  'platform.deleteData': 'Eliminar datos locales',
  'platform.confirmDelete': 'Entiendo que se eliminarán la partida y los datos guardados.',
  'install.help': 'Cómo instalar',
  'install.unsupported': 'Puedes seguir usando ImpostorApp desde el navegador.',
} as const

export type TranslationKey = keyof typeof es
