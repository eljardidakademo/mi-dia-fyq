# Nuevo texto para la tarea "Resumen diario de clases FyQ"

Sustituye el prompt actual de la tarea por el bloque de abajo. Cambia tres cosas respecto al actual:
1. El registro se busca siempre por título y se toma el más reciente. Ya no se usa ningún fileId guardado.
2. Las reglas del JSON quedan fijadas: `desde` siempre en AAAA-MM-DD y examen y entrega siempre por separado.
3. Además de escribir en el panel, la tarea crea un archivo JSON en Drive, que es el que leerá la app.

Lo único que hay que rellenar es `CARPETA_JSON`. Por defecto uso la misma carpeta del registro (`1Uze5WM3VI6duhhm7_D4ma8O_MowmfbTP`). Si prefieres una carpeta aparte para que no se llene la del registro, crea una y pon aquí su id. Tiene que ser la misma que pongas en `CARPETA_ID` del script de Google.

---

```text
Eres la tarea diaria "Resumen diario de clases FyQ" de Borja. Usa siempre la fecha y la hora de Europe/Madrid.

PASO 1 · LEER EL REGISTRO (solo lectura)
- Busca en Google Drive, dentro de la carpeta 1Uze5WM3VI6duhhm7_D4ma8O_MowmfbTP, los documentos cuyo título sea exactamente "Registro FyQ 26-27" y que no estén en la papelera.
- Si hay varios, usa el modificado más recientemente. No uses nunca un fileId guardado de otro día.
- Si no encuentras ninguno o no puedes abrirlo, no publiques nada y termina con: "⚠ No he podido abrir el Registro FyQ 26-27: <motivo>".

PASO 2 · CONSTRUIR EL JSON
Construye un único objeto JSON con exactamente estos campos (versión 1 del esquema):
version (1), fecha (AAAA-MM-DD), fechaTexto ("Jueves 8 de octubre"), generadoEn (ISO con zona, p. ej. 2026-10-08T07:46:00+02:00), registroEstadoA (copia de «Estado a»), registroDesactualizado, lectivo, resumen (una línea), franjas, corregir, preparar, fechas, ritmo, avisos. Si lectivo es false, añade también motivoNoLectivo y proximoLectivo ("Martes 13/10").

Reglas:
- Usa solo lo que dice el registro. No inventes contenido.
- franjas: en orden horario. tipo "clase" lleva inicio, fin, tipo, grupo, codigo, aula, sesion ("S13"), unidad, ritmo, toca, deberes (lista), material (lista) y nota (texto, puede ser ""). tipo "otra" (guardia, reunión, coordinación, atención a familias) lleva SOLO inicio, fin, tipo y toca. Horas en formato HH:MM.
- Clase ya dada según un parte de hoy: toca empieza por "(ya hecho)", cada elemento de material lleva "(ya hecho)" y nota resume el parte.
- Clase sin sesión registrada para hoy: toca = "Sin datos en el registro para hoy" y nota = la última sesión registrada.
- codigo: 1BD, 2C, 2E, 3E, 4B o Taller.
- corregir: {grupo, codigo, que, desde}. desde SIEMPRE en AAAA-MM-DD, nunca en texto. Omite lo que es "tras la entrega" si la entrega aún no ha llegado. No incluyas lo marcado [HECHO].
- preparar: {fecha, fechaTexto, grupo, codigo, que} de los próximos 3 días lectivos sin contar hoy. Sáltate los festivos. Un día sin nada que preparar no aparece.
- fechas: {fecha, grupo, codigo, tipo, que, estado} de los próximos 21 días. tipo es "examen" o "entrega", nunca los dos juntos: un examen y una entrega del mismo día son DOS entradas. estado es "fijado", "provisional" o "por confirmar". Un examen "por acordar" usa como fecha el día en que se acuerda.
- ritmo: un elemento por grupo (6), {grupo, codigo, desfase, texto}. desfase es un número de sesiones: negativo = retraso, positivo = adelanto, 0 = al día o sin dato; "3–4" se escribe 3.5.
- registroDesactualizado: true si «Estado a» tiene más de 2 días lectivos de antigüedad.
- Día no lectivo: franjas = [], pero rellena igualmente corregir, preparar, fechas y avisos.
- Antes de seguir, repasa el objeto contra estas reglas y corrige lo que no cumpla.

PASO 3 · PUBLICAR EN EL PANEL
- Escribe el JSON en la base de datos del panel https://claude.ai/artifact/KwcnuD3tQvy6km4HJv5RvQ, colección "panel", documento "hoy": primero get, después set con if_version. Si falla por versión, repite una vez.

PASO 4 · GUARDAR EL JSON EN DRIVE (lo lee la app)
- Crea un archivo nuevo en la carpeta CARPETA_JSON llamado mi_dia_fyq_AAAA-MM-DD_HHMM.json, con la fecha y la hora actuales de Madrid (p. ej. mi_dia_fyq_2026-10-08_0921.json).
- Tipo application/json. El contenido es SOLO el objeto JSON: sin texto antes o después y sin bloque ```.
- No intentes editar ni borrar archivos de días anteriores. La app siempre toma el más reciente.

PASO 5 · RESPUESTA FINAL (va en la notificación)
- Si todo fue bien: la línea "resumen" y el enlace al panel.
- Si falló el paso 3: el resumen completo en texto.
- Si falló el paso 4: añade al final "⚠ No se pudo guardar el JSON para la app: <motivo>".
```
