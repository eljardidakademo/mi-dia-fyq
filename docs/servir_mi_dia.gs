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
 * Respuestas (siempre JSON):
 *   { ok: true,  archivo, creado, datos: { ...resumen... } }
 *   { ok: false, error: "clave" | "sin_archivos" | "json_invalido", detalle }
 */

const PATRON = /^mi_dia_fyq_(\d{4}-\d{2}-\d{2})(?:_(\d{4}))?\.json$/;

function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  if (!e || !e.parameter || e.parameter.clave !== props.getProperty('CLAVE')) {
    return responder({ ok: false, error: 'clave', detalle: 'Clave incorrecta o ausente.' });
  }

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
