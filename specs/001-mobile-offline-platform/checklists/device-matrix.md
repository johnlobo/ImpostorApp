# Matriz de validacion en dispositivos

**Feature**: `IMP-1` / `001-mobile-offline-platform`
**Estado general**: `CERRADO POR ACEPTACION DE DESVIACION`
**Tipo de evidencia requerida**: ejecucion fisica en dispositivos representativos

Este documento es un protocolo y una plantilla de registro. No contiene resultados de dispositivos
emulados ni sustituye una prueba fisica. El protocolo original exigia completar todas las filas;
el cierre excepcional de T053 se documenta como desviacion aceptada a continuacion.

## Desviacion aceptada

El 2026-08-07, el propietario confirmo que la version publicada "funciona todo" y acepto
explicitamente cerrar T053 sin completar esta matriz. La validacion funcional informal se considera
positiva, pero no demuestra modelos, versiones, 20 reaperturas ni el objetivo estadistico SC-003.
Esos campos permanecen `NO MEDIDO` para impedir que la aceptacion se interprete como evidencia que
no existe.

## Preparacion

1. Publicar un build de produccion identificado por commit y URL HTTPS.
2. Usar dispositivos compatibles sin datos previos de ImpostorApp.
3. Registrar modelo, version exacta del sistema operativo y version exacta del navegador.
4. Mantener el dispositivo en orientacion vertical y con el zoom de texto habitual del participante.
5. Para cada reapertura offline, cerrar completamente ImpostorApp antes de iniciar el cronometro.
6. Medir desde la accion de apertura hasta que la pantalla inicial sea visible y utilizable.
7. No redondear tiempos antes de evaluar el limite de 3 segundos.

## Criterios

- La instalacion o adicion a inicio termina y el icono abre ImpostorApp en presentacion propia.
- La primera preparacion conectada alcanza el estado listo para uso offline.
- La reapertura sin red muestra la pantalla inicial y las funciones instaladas siguen disponibles.
- Ninguna pantalla presenta desplazamiento horizontal en orientacion vertical.
- Los datos confirmados sobreviven al cierre y reapertura.
- Una actualizacion disponible no interrumpe una partida activa.
- Al menos 19 de las 20 reaperturas offline objetivo deben estar disponibles en menos de 3 segundos
  para satisfacer SC-003 en esta muestra.

## Dispositivos objetivo

Las expresiones "reciente" y "anterior" se resuelven en la fecha de ejecucion y se registran con
numero de version; no se presuponen versiones en esta plantilla.

| ID | Plataforma objetivo | Navegador objetivo | Modelo | SO | Navegador | Build/commit | Estado |
|---|---|---|---|---|---|---|---|
| IOS-REC | iPhone, version principal reciente | Safari | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |
| IOS-ANT | iPhone, version principal anterior | Safari | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |
| AND-REC | Android, version principal reciente | Chrome | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |
| AND-ANT | Android, version principal anterior | Chrome | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |

## Recorrido por dispositivo

Ejecutar todos los pasos en cada fila objetivo.

1. Abrir la URL con conexion y completar la preparacion offline.
2. Instalar desde el prompt disponible o seguir las instrucciones de adicion a inicio.
3. Abrir desde el icono y comprobar nombre, icono y presentacion vertical.
4. Recorrer inicio, ayuda de instalacion, estados de recuperacion y aviso de actualizacion.
5. Confirmar que `scrollWidth` no supera el ancho visible y realizar inspeccion visual de controles.
6. Guardar una revision representativa, cerrar completamente y reabrir sin conexion.
7. Repetir cinco aperturas offline cronometradas.
8. Recuperar la conectividad, preparar una actualizacion y verificar que se aplaza durante partida.
9. Aplicarla en un punto seguro y confirmar que los datos locales siguen disponibles.

## Resultado funcional

| ID | Instalacion | Icono/apertura | Vertical sin overflow | Reapertura offline | Persistencia | Actualizacion segura | Evidencia | Estado |
|---|---|---|---|---|---|---|---|---|
| IOS-REC | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |
| IOS-ANT | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |
| AND-REC | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |
| AND-ANT | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |

Valores permitidos por control: `NO MEDIDO`, `SUPERADO`, `FALLIDO` o `BLOQUEADO`. En `Evidencia`,
anotar identificadores de capturas, video o registro de prueba sin incluir datos personales.

## Tiempos de reapertura offline

Registrar segundos con al menos una cifra decimal. Cada fila comienza en `NO MEDIDO` y solo cambia a
`SUPERADO` cuando la pantalla inicial es utilizable; una apertura fallida no recibe un tiempo cero.

| ID | Apertura 1 | Apertura 2 | Apertura 3 | Apertura 4 | Apertura 5 | Menores de 3 s | Estado |
|---|---:|---:|---:|---:|---:|---:|---|
| IOS-REC | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |
| IOS-ANT | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |
| AND-REC | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |
| AND-ANT | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |

## Evaluacion final

| Medida | Resultado | Criterio | Estado |
|---|---|---|---|
| Dispositivos con recorrido completo | NO MEDIDO | 4 de 4 | NO MEDIDO |
| Pantallas sin overflow horizontal | NO MEDIDO | 100 % de pantallas revisadas | NO MEDIDO |
| Reaperturas offline correctas | NO MEDIDO | 20 de 20 | NO MEDIDO |
| Reaperturas disponibles en menos de 3 s | NO MEDIDO | Al menos 19 de 20 | NO MEDIDO |

**Incidencias y observaciones**: NO MEDIDO

**Responsable y fecha de ejecucion**: propietario del producto, aceptacion informal 2026-08-07
