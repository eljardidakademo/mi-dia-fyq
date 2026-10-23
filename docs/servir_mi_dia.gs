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
 *  5. En claude.ai/code/routines (navegador), abrir la tarea «Resumen diario de clases FyQ» >
 *     menú junto al nombre > Edit. En la fila Trigger pulsar + > API, y luego Generate token
 *     (solo se ve una vez). No hace falta Save changes.
 *  6. Añadir dos propiedades del script más:
 *       TOKEN_RUTINA = el token que empieza por sk-ant-oat01-
 *       RUTINA_ID    = trig_019ZoDQqKosdyUb6aVv2DxKB (el id que aparece en la URL del disparador)
 *  7. Implementar > Gestionar implementaciones > lápiz > Versión: Nueva versión > Implementar.
 *     Google pedirá permiso para «conectarse a un servicio externo»: es la llamada a Claude.
 *     La dirección /exec no cambia.
 *
 * Partes de clase dictados en la app: llegan por POST, se apuntan en el documento
 * «Partes FyQ 26-27» de la misma carpeta (se crea solo la primera vez) y se lanza la tarea
 * para que el resumen los tenga en cuenta. Si aún no hay token, el parte queda guardado y
 * entra en la siguiente pasada programada.
 *
 * Registro automático: si el resumen trae «registrar» (sesiones que un parte da por hechas
 * y que el registro aún no marca), al servirlo por primera vez este script las apunta en
 * el «Registro FyQ 26-27»: pone [HECHO dd/mm] al principio de la columna Previsto de esa
 * sesión, actualiza «Estado a» y añade una fila a la tabla «Registro de partes». Cada
 * resumen se aplica una sola vez. Para desactivarlo: propiedad REGISTRO_AUTO = no.
 *
 * Respuestas (siempre JSON):
 *   GET  ?clave=…                    { ok: true,  archivo, creado, datos: { ...resumen... }, registrado: ["2C S14", …] }
 *   GET  ?clave=…&accion=regenerar   { ok: true,  pedidoEn, repetido }  (la tarea tarda unos 2 minutos)
 *   POST { clave, accion: "parte", parte: { fecha, inicio, codigo, grupo, sesion, texto, id } }
 *                                    { ok: true,  guardado: true, lanzado, motivo }
 *   errores                          { ok: false, error: "clave" | "sin_archivos" | "json_invalido" | "sin_token" | "rutina" | "accion", detalle }
 */

const PATRON = /^mi_dia_fyq_(\d{4}-\d{2}-\d{2})(?:_(\d{4}))?\.json$/;
// Si se pulsa el botón varias veces seguidas, solo se lanza una tarea cada 3 minutos.
const ESPERA_ENTRE_PEDIDOS_MS = 3 * 60 * 1000;
// Un parte lanza la tarea aunque se acabe de pedir un resumen, pero no más de una vez por minuto.
const ESPERA_ENTRE_PARTES_MS = 60 * 1000;
const TITULO_PARTES = 'Partes FyQ 26-27';
const TITULO_REGISTRO = 'Registro FyQ 26-27';
// Cómo empieza el título de la sección de cada grupo en el registro (en mayúsculas).
const SECCION_GRUPO = {
  '1BD': '1º BACH D',
  '4B': '4º ESO B',
  '3E': '3º ESO E',
  '2E': '2º ESO E',
  '2C': '2º ESO C',
  Taller: 'TALLER',
};
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function doGet(e) {
  return protegido(() => atenderGet(e));
}

function doPost(e) {
  return protegido(() => atenderPost(e));
}

// Cualquier fallo del script vuelve como JSON con su motivo, en vez de la página de error
// de Google, para que la app pueda decir qué pasa.
function protegido(fn) {
  try {
    return fn();
  } catch (err) {
    return responder({ ok: false, error: 'script', detalle: String(err).slice(0, 300) });
  }
}

function atenderGet(e) {
  const props = PropertiesService.getScriptProperties();
  if (!e || !e.parameter || e.parameter.clave !== props.getProperty('CLAVE')) {
    return responder({ ok: false, error: 'clave', detalle: 'Clave incorrecta o ausente.' });
  }

  if (e.parameter.accion === 'regenerar') return responder(regenerar(props));

  const archivo = buscarMasReciente(idCarpeta(props));
  if (!archivo) {
    return responder({ ok: false, error: 'sin_archivos', detalle: 'No hay ningún mi_dia_fyq_*.json en la carpeta.' });
  }

  const texto = leerTexto(archivo);
  let datos;
  try {
    datos = parsear(texto);
  } catch (err) {
    return responder({ ok: false, error: 'json_invalido', archivo: archivo.getName(), detalle: String(err).slice(0, 300) });
  }
  const respuesta = { ok: true, archivo: archivo.getName(), creado: archivo.getDateCreated().toISOString(), datos: datos };
  // Si el registro no se puede tocar, la app recibe el resumen igual.
  try {
    respuesta.registrado = aplicarRegistro(props, archivo, datos);
  } catch (err) {
    respuesta.registroError = String(err).slice(0, 300);
  }
  return responder(respuesta);
}

// ---------- Registro automático ----------

// Apunta en el registro las sesiones de «registrar» del resumen. Una vez por archivo:
// la marca APLICADO guarda el último resumen ya pasado al registro.
function aplicarRegistro(props, archivo, datos) {
  if (String(props.getProperty('REGISTRO_AUTO') || '').toLowerCase() === 'no') return [];
  const lista = (datos && Array.isArray(datos.registrar) ? datos.registrar : []).filter(
    (r) => r && r.codigo && r.sesion && /^\d{4}-\d{2}-\d{2}$/.test(String(r.fecha || ''))
  );
  const marca = archivo.getName() + '|' + archivo.getDateCreated().getTime();
  if (!lista.length || props.getProperty('APLICADO') === marca) return [];

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (props.getProperty('APLICADO') === marca) return [];
    const doc = documentoRegistro(props);
    if (!doc) throw new Error('No encuentro el documento «' + TITULO_REGISTRO + '» en la carpeta.');
    const body = doc.getBody();
    const hechos = [];
    for (const r of lista) {
      if (marcarSesion(body, r)) hechos.push(r);
    }
    if (hechos.length) {
      actualizarEstadoA(body, hechos);
      anotarPartes(body, hechos);
      doc.saveAndClose();
    }
    props.setProperty('APLICADO', marca);
    return hechos.map((r) => r.codigo + ' ' + r.sesion);
  } finally {
    lock.releaseLock();
  }
}

function documentoRegistro(props) {
  const it = DriveApp.getFolderById(idCarpeta(props)).getFilesByName(TITULO_REGISTRO);
  let masNuevo = null;
  while (it.hasNext()) {
    const f = it.next();
    if (f.getMimeType() === MimeType.GOOGLE_DOCS && !f.isTrashed() && (!masNuevo || f.getLastUpdated() > masNuevo.getLastUpdated())) masNuevo = f;
  }
  return masNuevo ? DocumentApp.openById(masNuevo.getId()) : null;
}

// Texto comparable: sin asteriscos ni almohadillas, apóstrofo recto, mayúsculas y sin acentos.
function normal(t) {
  return String(t || '')
    .replace(/[*#]/g, '')
    .replace(/[’`´]/g, "'")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

const SECCIONES = Object.keys(SECCION_GRUPO).map((c) => normal(SECCION_GRUPO[c]));
const esTituloDeGrupo = (texto) => texto.length < 80 && SECCIONES.some((s) => texto.indexOf(s) === 0);

function ddmm(iso) {
  return iso.slice(8, 10) + '/' + iso.slice(5, 7);
}

// Busca la sección del grupo, luego su tabla Sesión | Fecha | Previsto | Preparar y la fila
// de la sesión. Si Previsto aún no dice [HECHO], le pone la marca y el resumen del parte.
function marcarSesion(body, r) {
  const seccion = SECCION_GRUPO[r.codigo] ? normal(SECCION_GRUPO[r.codigo]) : null;
  if (!seccion) return false;
  let enGrupo = false;
  for (let i = 0; i < body.getNumChildren(); i++) {
    const el = body.getChild(i);
    const tipo = el.getType();
    if (tipo === DocumentApp.ElementType.PARAGRAPH || tipo === DocumentApp.ElementType.LIST_ITEM) {
      const texto = normal(el.asText().getText());
      if (esTituloDeGrupo(texto)) enGrupo = texto.indexOf(seccion) === 0;
      continue;
    }
    if (!enGrupo || tipo !== DocumentApp.ElementType.TABLE) continue;
    const tabla = el.asTable();
    if (tabla.getNumRows() < 2) continue;
    const cab = tabla.getRow(0);
    let colSesion = -1, colPrevisto = -1;
    for (let c = 0; c < cab.getNumCells(); c++) {
      const h = normal(cab.getCell(c).getText());
      if (h === 'SESION') colSesion = c;
      if (h === 'PREVISTO') colPrevisto = c;
    }
    if (colSesion < 0 || colPrevisto < 0) continue;
    for (let f = 1; f < tabla.getNumRows(); f++) {
      const fila = tabla.getRow(f);
      if (fila.getNumCells() <= Math.max(colSesion, colPrevisto)) continue;
      if (normal(fila.getCell(colSesion).getText()) !== normal(r.sesion)) continue;
      const celda = fila.getCell(colPrevisto);
      if (/\[HECHO/i.test(celda.getText())) return false;
      const t = celda.editAsText();
      t.insertText(0, '[HECHO ' + ddmm(r.fecha) + '] ');
      const hecho = String(r.hecho || '').replace(/\s+/g, ' ').trim();
      if (hecho) t.appendText(' · Parte: ' + hecho);
      return true;
    }
    return false; // la tabla de sesiones del grupo no tiene esa sesión
  }
  return false;
}

// «Estado a» pasa a la fecha más reciente apuntada, si es posterior a la que tenía.
function actualizarEstadoA(body, hechos) {
  const ultima = hechos.map((r) => r.fecha).sort().pop();
  const tablas = body.getTables();
  for (const tabla of tablas) {
    for (let f = 0; f < tabla.getNumRows(); f++) {
      const fila = tabla.getRow(f);
      if (fila.getNumCells() < 2 || normal(fila.getCell(0).getText()) !== 'ESTADO A') continue;
      const actual = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(fila.getCell(1).getText());
      const actualIso = actual ? actual[3] + '-' + actual[2].padStart(2, '0') + '-' + actual[1].padStart(2, '0') : '';
      if (actualIso >= ultima) return;
      const d = new Date(ultima + 'T12:00:00');
      fila.getCell(1).setText(DIAS_SEMANA[d.getDay()] + ' ' + ddmm(ultima) + '/' + ultima.slice(0, 4));
      return;
    }
  }
}

// Una fila por fecha en la tabla que sigue al título «Registro de partes».
function anotarPartes(body, hechos) {
  let tras = false;
  for (let i = 0; i < body.getNumChildren(); i++) {
    const el = body.getChild(i);
    const tipo = el.getType();
    if (tipo === DocumentApp.ElementType.PARAGRAPH) {
      if (normal(el.asText().getText()).indexOf('REGISTRO DE PARTES') === 0) tras = true;
      continue;
    }
    if (!tras || tipo !== DocumentApp.ElementType.TABLE) continue;
    const tabla = el.asTable();
    const porFecha = {};
    for (const r of hechos) (porFecha[r.fecha] = porFecha[r.fecha] || []).push(r);
    Object.keys(porFecha).sort().forEach((fecha) => {
      const resumen = porFecha[fecha]
        .map((r) => r.codigo + ' ' + r.sesion + (r.hecho ? ': ' + String(r.hecho).trim() : ''))
        .join(' · ');
      const fila = tabla.appendTableRow();
      fila.appendTableCell(ddmm(fecha) + '/' + fecha.slice(0, 4));
      fila.appendTableCell(resumen + ' (desde la app)');
    });
    return;
  }
}

function atenderPost(e) {
  const props = PropertiesService.getScriptProperties();
  let cuerpo;
  try {
    cuerpo = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder({ ok: false, error: 'accion', detalle: 'El cuerpo no es JSON.' });
  }
  if (!cuerpo || cuerpo.clave !== props.getProperty('CLAVE')) {
    return responder({ ok: false, error: 'clave', detalle: 'Clave incorrecta o ausente.' });
  }
  if (cuerpo.accion === 'parte') return responder(recibirParte(props, cuerpo.parte));
  return responder({ ok: false, error: 'accion', detalle: 'Acción desconocida.' });
}

function recibirParte(props, p) {
  if (!p || !p.texto || !p.fecha) return { ok: false, error: 'accion', detalle: 'Parte vacío.' };
  const limpio = (x) => String(x || '').replace(/\s+/g, ' ').trim();
  const hora = Utilities.formatDate(new Date(), 'Europe/Madrid', 'HH:mm');
  const linea =
    limpio(p.fecha) + ' · ' + limpio(p.inicio) + ' · ' + limpio(p.grupo) + ' (' + limpio(p.codigo) + ')' +
    (p.sesion ? ' · ' + limpio(p.sesion) : '') + ' · enviado ' + hora + '\n' + String(p.texto).trim();

  const doc = documentoPartes(props);
  doc.getBody().appendParagraph(linea);
  doc.getBody().appendParagraph('');
  doc.saveAndClose();

  const r = lanzarRutina(
    props,
    'Parte nuevo desde la app Mi día FyQ (' + limpio(p.grupo) + ', ' + limpio(p.fecha) + ' ' + limpio(p.inicio) + '):\n' + String(p.texto).trim(),
    ESPERA_ENTRE_PARTES_MS
  );
  return { ok: true, guardado: true, lanzado: r.ok && !r.repetido, motivo: r.ok ? (r.repetido ? 'repetido' : '') : r.error };
}

// El documento de partes vive en la carpeta de siempre. Se busca por título (por si alguien
// lo recrea) y, si no existe, se crea con una cabecera que explica el formato.
function documentoPartes(props) {
  const carpeta = DriveApp.getFolderById(idCarpeta(props));
  const it = carpeta.getFilesByName(TITULO_PARTES);
  let masNuevo = null;
  while (it.hasNext()) {
    const f = it.next();
    if (f.getMimeType() === MimeType.GOOGLE_DOCS && (!masNuevo || f.getLastUpdated() > masNuevo.getLastUpdated())) masNuevo = f;
  }
  if (masNuevo) return DocumentApp.openById(masNuevo.getId());

  const doc = DocumentApp.create(TITULO_PARTES);
  doc.getBody().appendParagraph(
    'Partes de clase dictados desde la app Mi día FyQ. Cada parte empieza con: fecha · hora de la clase · grupo (código) · sesión · hora de envío. ' +
    'Al pasar un parte al Registro FyQ 26-27, puedes borrarlo de aquí o dejarlo: la tarea solo usa los que aún no están en el registro.'
  );
  doc.getBody().appendParagraph('');
  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(carpeta);
  return DocumentApp.openById(doc.getId());
}

// Lanza ya la tarea de Claude que lee el registro y deja un JSON nuevo en la carpeta.
function regenerar(props) {
  return lanzarRutina(props, 'Pedido desde el botón «Pedir resumen nuevo» de la app Mi día FyQ.', ESPERA_ENTRE_PEDIDOS_MS);
}

function lanzarRutina(props, texto, esperaMinimaMs) {
  const token = props.getProperty('TOKEN_RUTINA');
  const rutina = props.getProperty('RUTINA_ID');
  if (!token || !rutina) {
    return { ok: false, error: 'sin_token', detalle: 'Faltan TOKEN_RUTINA o RUTINA_ID en las propiedades del script.' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const anterior = Number(props.getProperty('ULTIMO_PEDIDO') || 0);
    if (Date.now() - anterior < esperaMinimaMs) {
      return { ok: true, pedidoEn: new Date(anterior).toISOString(), repetido: true };
    }

    const r = UrlFetchApp.fetch('https://api.anthropic.com/v1/claude_code/routines/' + encodeURIComponent(rutina) + '/fire', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + token,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'experimental-cc-routine-2026-04-01',
      },
      payload: JSON.stringify({ text: texto }),
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

// Admite el id tal cual o la dirección entera de la carpeta, con espacios de sobra.
function idCarpeta(props) {
  const v = String(props.getProperty('CARPETA_ID') || '').trim();
  const m = /folders\/([\w-]+)/.exec(v);
  return m ? m[1] : v;
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
