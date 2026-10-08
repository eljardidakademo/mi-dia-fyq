/**
 * Mi día FyQ: devuelve el resumen diario más reciente desde una dirección fija.
 *
 * La tarea de las 7:45 crea cada vez un archivo nuevo en CARPETA_ID llamado
 * mi_dia_fyq_AAAA-MM-DD_HHMM.json. Este script busca el más reciente por nombre
 * (y, si empatan, por fecha de creación) y devuelve su contenido. Así la app no
 * necesita iniciar sesión en Google ni conocer ningún fileId.
 *
 * Instalación (una vez):
 *  1. script.google.com > Nuevo proyecto > pegar este archivo.
 *  2. Configuración del proyecto > Propiedades del script:
 *       CARPETA_ID = id de la carpeta donde la tarea deja los JSON
 *       CLAVE      = una contraseña larga inventada (la app la enviará en ?clave=)
 *  3. Implementar > Nueva implementación > Aplicación web.
 *       Ejecutar como: Yo.  Quién tiene acceso: Cualquier usuario.
 *  4. Copiar la URL /exec que termina en /exec. Esa es la dirección fija.
 *
 * Botón «Pedir resumen nuevo» de la app (opcional):
 *  5. En claude.ai/code/routines, abrir la tarea «Resumen diario de clases FyQ» > Editar >
 *     Añadir otro disparador > API. Guardar y pulsar «Generar token» (solo se ve una vez).
 *  6. Añadir dos propiedades del script más:
 *       TOKEN_RUTINA = el token que empieza por sk-ant-oat01-
 *       RUTINA_ID    = trig_019ZoDQqKosdyUb6aVv2DxKB (el id que aparece en la URL del disparador)
 *  7. Implementar > Gestionar implementaciones > lápiz > Versión: Nueva versión > Implementar.
 *     Google pedirá permiso para «conectarse a un servicio externo»: es la llamada a Claude.
 *     La dirección /exec no cambia.
 *
 * Respuestas (siempre JSON):
 *   ?clave=…                    { ok: true,  archivo, creado, datos: { ...resumen... } }
 *   ?clave=…&accion=regenerar   { ok: true,  pedidoEn, repetido }  (la tarea tarda unos 2 minutos)
 *   errores                     { ok: false, error: "clave" | "sin_archivos" | "json_invalido" | "sin_token" | "rutina", detalle }
 */

const PATRON = /^mi_dia_fyq_(\d{4}-\d{2}-\d{2})(?:_(\d{4}))?\.json$/;
// Si se pulsa el botón varias veces seguidas, solo se lanza una tarea cada 3 minutos.
const ESPERA_ENTRE_PEDIDOS_MS = 3 * 60 * 1000;

function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  if (!e || !e.parameter || e.parameter.clave !== props.getProperty('CLAVE')) {
    return responder({ ok: false, error: 'clave', detalle: 'Clave incorrecta o ausente.' });
  }

  if (e.parameter.accion === 'regenerar') return responder(regenerar(props));

  const archivo = buscarMasReciente(props.getProperty('CARPETA_ID'));
  if (!archivo) {
    return responder({ ok: false, error: 'sin_archivos', detalle: 'No hay ningún mi_dia_fyq_*.json en la carpeta.' });
  }

  const texto = leerTexto(archivo);
  try {
    return responder({
      ok: true,
      archivo: archivo.getName(),
      creado: archivo.getDateCreated().toISOString(),
      datos: parsear(texto),
    });
  } catch (err) {
    return responder({ ok: false, error: 'json_invalido', archivo: archivo.getName(), detalle: String(err).slice(0, 300) });
  }
}

// Lanza ya la tarea de Claude que lee el registro y deja un JSON nuevo en la carpeta.
function regenerar(props) {
  const token = props.getProperty('TOKEN_RUTINA');
  const rutina = props.getProperty('RUTINA_ID');
  if (!token || !rutina) {
    return { ok: false, error: 'sin_token', detalle: 'Faltan TOKEN_RUTINA o RUTINA_ID en las propiedades del script.' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const anterior = Number(props.getProperty('ULTIMO_PEDIDO') || 0);
    if (Date.now() - anterior < ESPERA_ENTRE_PEDIDOS_MS) {
      return { ok: true, pedidoEn: new Date(anterior).toISOString(), repetido: true };
    }

    const r = UrlFetchApp.fetch('https://api.anthropic.com/v1/claude_code/routines/' + encodeURIComponent(rutina) + '/fire', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({ text: 'Pedido desde el botón «Pedir resumen nuevo» de la app Mi día FyQ.' }),
      muteHttpExceptions: true,
    });
    const codigo = r.getResponseCode();
    if (codigo !== 200) {
      let detalle = 'HTTP ' + codigo;
      try {
        const err = JSON.parse(r.getContentText()).error;
        if (err && err.message) detalle += ': ' + err.message;
      } catch (ignorar) {}
      return { ok: false, error: 'rutina', detalle: detalle.slice(0, 300) };
    }
    const ahora = Date.now();
    props.setProperty('ULTIMO_PEDIDO', String(ahora));
    return { ok: true, pedidoEn: new Date(ahora).toISOString(), repetido: false };
  } finally {
    lock.releaseLock();
  }
}

function buscarMasReciente(carpetaId) {
  const it = DriveApp.getFolderById(carpetaId).searchFiles("title contains 'mi_dia_fyq_' and trashed = false");
  let mejor = null, mejorClave = '';
  while (it.hasNext()) {
    const f = it.next();
    const m = PATRON.exec(f.getName());
    if (!m) continue;
    // Clave ordenable: fecha + hora del nombre + instante de creación (desempata repeticiones del mismo nombre).
    const clave = m[1] + (m[2] || '0000') + String(f.getDateCreated().getTime()).padStart(15, '0');
    if (clave > mejorClave) { mejor = f; mejorClave = clave; }
  }
  return mejor;
}

// El conector de Drive puede guardar el JSON como archivo de texto o convertirlo en un Google Doc.
function leerTexto(f) {
  if (f.getMimeType() === MimeType.GOOGLE_DOCS) {
    return DocumentApp.openById(f.getId()).getBody().getText();
  }
  return f.getBlob().getDataAsString('UTF-8');
}

// Quita BOM y un posible bloque ```json ... ```. Solo si aun así falla, prueba a
// cambiar comillas tipográficas por rectas (un Doc puede haberlas convertido).
function parsear(t) {
  t = t.replace(/^﻿/, '').trim();
  const bloque = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
  if (bloque) t = bloque[1].trim();
  try {
    return JSON.parse(t);
  } catch (err) {
    return JSON.parse(t.replace(/[“”]/g, '"'));
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
