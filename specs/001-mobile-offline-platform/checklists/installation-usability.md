# Protocolo de usabilidad de instalacion

**Feature**: `IMP-1` / `001-mobile-offline-platform`  
**Estado general**: `PENDIENTE`  
**Participantes requeridos**: al menos 10

Este documento prepara la validacion de SC-002. Todas las sesiones estan pendientes y no se declara
ningun porcentaje de exito hasta ejecutar el protocolo con participantes y dispositivos fisicos.

## Objetivo y criterio

Cada participante debe poder instalar ImpostorApp y abrirla desde la pantalla de inicio en menos de
120 segundos sin ayuda directa. La prueba satisface SC-002 si al menos 9 de 10 participantes cumplen
las tres condiciones: instalacion terminada, apertura desde el icono y duracion inferior a 120
segundos sin intervencion directa.

Las instrucciones visibles dentro de ImpostorApp forman parte del producto y no cuentan como ayuda
directa. Una explicacion, indicacion gestual o accion realizada por el facilitador si cuenta como
ayuda directa y debe registrarse.

## Preparacion de cada sesion

1. Asignar un identificador anonimo; no registrar nombre, correo ni otros datos personales.
2. Registrar dispositivo, sistema operativo y navegador exactos.
3. Eliminar una instalacion anterior y los datos del origen, o usar un perfil limpio equivalente.
4. Confirmar conexion disponible y entregar al participante la URL HTTPS del build identificado.
5. Colocar el dispositivo en la pantalla inicial del navegador antes de comenzar.
6. Preparar un cronometro independiente o una grabacion autorizada para verificar la duracion.

## Guion

El facilitador dice: "Instala ImpostorApp en la pantalla de inicio y abrela desde su icono".

1. Iniciar el cronometro al terminar la frase.
2. No ofrecer indicaciones salvo que el participante solicite ayuda o abandone el intento.
3. Permitir el uso libre de la ayuda incluida en la aplicacion.
4. Detener el cronometro cuando ImpostorApp se abra desde el icono y su pantalla inicial sea usable.
5. Si no termina en 120 segundos, registrar el punto alcanzado; se puede continuar para observar la
   causa, pero el resultado de SC-002 es fallido.
6. Registrar toda ayuda directa y una observacion breve del bloqueo, sin identificar al participante.

## Registro de participantes

| ID | Dispositivo | SO | Navegador | Build/URL | Duracion (s) | Instalada | Abierta desde icono | Ayuda directa | Ayuda recibida | Resultado | Estado |
|---|---|---|---|---|---:|---|---|---|---|---|---|
| P01 | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE |
| P02 | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE |
| P03 | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE |
| P04 | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE |
| P05 | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE |
| P06 | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE |
| P07 | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE |
| P08 | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE |
| P09 | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE |
| P10 | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE |

Valores de `Resultado`: `EXITO` solo si las tres condiciones de SC-002 se cumplen; en cualquier otro
caso, `FALLO`. `Estado` usa `PENDIENTE`, `EJECUTADO` o `BLOQUEADO`.

## Evaluacion agregada

| Medida | Resultado | Criterio | Estado |
|---|---|---|---|
| Participantes ejecutados | PENDIENTE | Al menos 10 | PENDIENTE |
| Exitos sin ayuda directa y en menos de 120 s | PENDIENTE | Al menos 9 de 10 | PENDIENTE |
| Tasa de exito | PENDIENTE | Al menos 90 % | PENDIENTE |

No completar el resultado agregado con participantes pendientes. Si se ejecutan mas de 10 sesiones,
anadir filas y evaluar tanto las primeras 10 planificadas como el total, explicando cualquier
exclusion antes de calcular el porcentaje.

**Incidencias y patrones observados**: PENDIENTE

**Responsable y fecha de ejecucion**: PENDIENTE
