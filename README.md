# ImpostorApp

Aplicacion web progresiva local para jugar en grupo desde un unico dispositivo. La plataforma se
instala en moviles compatibles, prepara sus recursos para uso offline y conserva el ultimo estado
confirmado en IndexedDB. No necesita cuentas ni servicios remotos durante el juego.

## Requisitos

- Node.js 24 LTS y npm.
- Chromium actual para desarrollo y automatizacion PWA.
- Safari 16.4 o posterior en iPhone/iPad para la experiencia Apple.
- Chrome actual en Android para el aviso de instalacion automatico.

Otros navegadores pueden usar la aplicacion como sitio web, pero la instalacion, el modo standalone
y la persistencia privada dependen de las capacidades que exponga cada navegador.

## Desarrollo

```bash
npm ci
npm run dev
```

Vite mostrara la URL local. El modo offline y el ciclo de actualizacion deben validarse siempre
contra un build de produccion:

```bash
npm run build
npm run preview
```

## Calidad

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Playwright necesita Chromium y WebKit con sus dependencias del sistema. CI instala ambos motores y
ejecuta la matriz movil. La guia completa de escenarios esta en
[`specs/001-mobile-offline-platform/quickstart.md`](specs/001-mobile-offline-platform/quickstart.md).

## Instalacion

En Android compatible, abre **Ayuda** y usa **Instalar ImpostorApp** cuando el navegador ofrezca la
instalacion. En Safari para iPhone o iPad, abre **Compartir** y selecciona **Anadir a pantalla de
inicio**. Desde el icono, la aplicacion se abre en vertical y sin interfaz del navegador.

## Datos locales

Los grupos, preferencias y la ultima partida confirmada viven solo en IndexedDB del navegador. Las
escrituras de recuperacion son transaccionales y una segunda pestana permanece en modo observador
mientras otra conserva la concesion de escritura. Los datos con una version futura se abren en modo
seguro y nunca se eliminan como reparacion automatica.

Borrar datos del sitio, desinstalar limpiando su almacenamiento, usar navegacion privada o una
politica de limpieza del sistema puede eliminar la informacion local. ImpostorApp no sincroniza ni
mantiene una copia remota. La eliminacion desde la aplicacion exige explicar las consecuencias y
una confirmacion explicita.
