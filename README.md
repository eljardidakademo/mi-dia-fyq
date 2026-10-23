# Mi día FyQ

App móvil (Android ahora, iPhone más adelante) que enseña la jornada del día en el instituto: clases con hora, grupo y aula, qué toca hacer, deberes y material, lo pendiente de corregir, exámenes y entregas, ritmo de cada grupo y avisos.

Funciona sin conexión: lleva dentro el horario y el calendario del centro, y guarda el último resumen descargado.

## Cómo llegan los datos

1. Cada mañana la tarea de Claude «Resumen diario de clases FyQ» lee el registro y deja en Drive un `mi_dia_fyq_AAAA-MM-DD_HHMM.json` ([texto de la tarea](docs/prompt_tarea_7_45.md), [esquema](docs/mi_dia.schema.json)).
2. Un script de Google ([servir_mi_dia.gs](docs/servir_mi_dia.gs)) devuelve siempre el más reciente desde una dirección fija protegida con una clave.
3. La app lo descarga al abrirse, al volver a ella y al deslizar hacia abajo. Si no hay red, enseña lo último que tenga y lo dice.
4. El botón **Pedir resumen nuevo** pide al script que lance la tarea en ese momento (disparador API de la rutina; pasos 5–7 del script). La app espera a que aparezca el JSON nuevo, normalmente unos 2 minutos.

## Partes de clase por voz

En la cabecera de Hoy, junto a «Semana», está el botón **🎙 Parte**: un parte para todo el día, en el que se cuenta clase por clase (diciendo el grupo) qué se ha hecho. Se dicta con el micrófono del teclado y se envía al script de Google, que lo apunta en el documento «Partes FyQ 26-27» (en la misma carpeta; se crea solo) y lanza la tarea. La tarea lee esos partes: los de hoy marcan la clase como hecha y, con los que aún no están en el registro, rellena el campo `registrar` del resumen. Sin conexión, el parte se guarda en el móvil y se reenvía solo al actualizar.

**Registro automático.** La primera vez que el script sirve un resumen con `registrar`, apunta esas sesiones en el «Registro FyQ 26-27»: `[HECHO dd/mm]` al principio de la columna Previsto (más « · Parte: …»), «Estado a» con la fecha más reciente y una fila en la tabla «Registro de partes». Cada resumen se aplica una vez (propiedad `APLICADO`) y una sesión ya marcada no se toca. Se desactiva con la propiedad `REGISTRO_AUTO = no`. La app avisa de qué sesiones se han apuntado.

**Recordatorio del parte.** Diez minutos después de la última clase de cada día lectivo llega una notificación si aún no se ha mandado el parte; al tocarla se abre el dictado. Se activa o quita en Ajustes (activado por defecto).

## Vista semanal

El botón **Semana** de la pantalla principal enseña de lunes a viernes las clases de cada día con lo previsto, los exámenes y entregas, el material y los eventos del centro, y debajo el avance de la unidad en curso de cada grupo en barras (color según el ritmo). Lo previsto y el avance vienen en los campos opcionales `semana` y `avance` del resumen; mientras no lleguen, la vista enseña solo el horario.

La pestaña **Mes** enseña el calendario de lunes a viernes con un punto rojo los días de examen y azul los de entrega, con flechas para cambiar de mes y la lista debajo. La tarea manda en `fechas` todo lo que hay desde el día 1 del mes hasta final de trimestre; en Hoy solo salen los de los próximos 21 días.

## Aviso de la mañana y widget

- **Aviso**: en Ajustes se activa y se elige la hora (07:30 por defecto). Se programan los próximos días lectivos con la primera clase, el material que hay que llevar y lo urgente (correcciones, exámenes y entregas a 3 días o menos). Se rehacen cada vez que llega un resumen.
- **Widget** (Android): clase de ahora o la siguiente y lo urgente. Se refresca cada 30 minutos (y descarga si hace falta); ↻ lo actualiza al momento y tocarlo abre la app.

## Temas e idiomas

Ajustes > Apariencia: Laboratorio (claro u oscuro según el móvil), Claro, Colorido (un color por grupo) y Noche. Idiomas: castellano, valencià e inglés; el texto que escribe la tarea sigue en castellano.

## Instalar el APK

1. En GitHub, pestaña **Actions** → última ejecución de «Pruebas y APK» en verde → **Artifacts** → `mi-dia-fyq-apk`.
2. Descomprime el zip en el móvil y abre `app-release.apk` (Android pedirá permiso para instalar apps de esa fuente).
3. Al abrirla por primera vez, pon en Ajustes la dirección del script (la que acaba en `/exec`) y la clave.

Las versiones nuevas se instalan encima de la anterior sin perder los ajustes.

## Configuración del docente

Todo lo personal está en [`src/config/docente.json`](src/config/docente.json): grupos y aulas, horario semanal, días sin clase (con o sin grupos concretos) y eventos del calendario. Otro docente solo tendría que cambiar ese archivo.

## Desarrollo

```bash
npm install
npm test            # pruebas de la lógica (calendario, validación, vista, descarga, aviso, widget)
npx tsc --noEmit    # tipos
npx expo start      # servidor de desarrollo
```

Estructura:

- `src/datos/`: tipos del resumen, validación tolerante (`normalizar.ts`), calendario, descarga y caché (`fuente.ts`) y la vista que pinta la pantalla (`vista.ts`).
- `src/ui/`: temas y componentes.
- `src/i18n/`: textos de la app en cada idioma.
- `src/avisos/`: contenido del aviso y del widget (`contenido.ts`) y programación de notificaciones.
- `src/widget/`: widget de Android y su tarea en segundo plano.
- `src/pantallas/`: Hoy, Semana y Ajustes.
