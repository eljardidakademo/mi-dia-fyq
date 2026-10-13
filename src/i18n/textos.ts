// Textos de la app en cada idioma. Lo que escribe la tarea (resumen, qué toca, avisos…)
// llega tal cual del registro y no se traduce.

export type Idioma = 'es' | 'va' | 'en';

export const IDIOMAS: { id: Idioma; nombre: string }[] = [
  { id: 'es', nombre: 'Castellano' },
  { id: 'va', nombre: 'Valencià' },
  { id: 'en', nombre: 'English' },
];

const es = {
  dias: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  meses: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  /** "Jueves 8 de octubre" */
  fechaLarga: (dia: string, n: number, mes: string) => `${dia} ${n} de ${mes}`,

  // Calendario
  finDeSemana: 'Fin de semana',
  cursoTerminado: 'Curso terminado',
  sinClase: (motivo: string) => `Sin clase: ${motivo}`,

  // Alertas de la vista
  sinResumenNunca: 'Todavía no hay ningún resumen descargado. Muestro solo tu horario.',
  sinResumenHoy: (conHorario: boolean, fecha: string) =>
    `No hay resumen de hoy. Muestro ${conHorario ? 'tu horario y ' : ''}lo pendiente del resumen del ${fecha.toLowerCase()}.`,
  registroViejo: (estadoA: string) => `El registro lleva más de 2 días lectivos sin actualizarse (estado a: ${estadoA}).`,
  formatoRaro: (detalle: string) => `El resumen traía algún dato con formato inesperado: ${detalle}`,

  // Errores de descarga
  errores: {
    sin_url: 'Falta la dirección del script. Ponla en Ajustes.',
    sin_red: 'Sin conexión o el script no responde. Muestro lo último descargado.',
    http: (status: number) => `El script respondió con un error (HTTP ${status}).`,
    no_json: 'El script no devolvió JSON. Comprueba que está implementado como aplicación web con acceso «Cualquier usuario».',
    clave: 'La clave no coincide con la del script de Google. Revísala en Ajustes.',
    sin_archivos: 'El script no encuentra ningún mi_dia_fyq_*.json en la carpeta. ¿Ha guardado ya la tarea alguno?',
    json_invalido: 'El último archivo que dejó la tarea no es un JSON válido.',
    ilegible: (detalle: string) => `El resumen descargado no se puede leer: ${detalle}`,
    script: (detalle: string) => `Error del script: ${detalle}`,
    sin_token:
      'El script todavía no puede pedir resúmenes nuevos: falta poner TOKEN_RUTINA en sus propiedades (mira las instrucciones del script).',
    version_vieja: 'El script de Google es de una versión anterior y no sabe hacer esto. Pega la versión nueva y vuelve a implementarlo.',
    rutina: (detalle: string) => `No se pudo lanzar la tarea de Claude: ${detalle}`,
    tarda: 'La tarea se ha lanzado, pero el resumen nuevo aún no ha llegado. Desliza hacia abajo dentro de un rato.',
  },

  // Hoy
  generado: (h: string) => `Generado ${h}`,
  registro: (e: string) => `Registro: ${e}`,
  actualizado: (h: string) => `Actualizado ${h}`,
  deslizaParaActualizar: 'Desliza hacia abajo para actualizar',
  hoyNoHayClase: 'Hoy no hay clase',
  proximoDiaLectivo: 'Próximo día lectivo:',
  ajustes: 'Ajustes',
  pedirResumen: 'Pedir resumen nuevo',
  pidiendo: 'Pidiendo a Claude un resumen nuevo con lo que hay ahora en el registro. Suele tardar unos 2 minutos.',
  resumenNuevoListo: 'Resumen nuevo descargado.',

  // Componentes
  estado: { ahora: 'Ahora', siguiente: 'Siguiente', hecha: 'Hecha' },
  revisarDeberes: 'Revisar deberes',
  material: 'Material',
  pendienteCorregir: 'Pendiente de corregir',
  desdeEl: (ddmm: string) => `desde el ${ddmm}`,
  materialProximos: 'Material de los próximos días',
  examenesEntregas: 'Exámenes y entregas',
  examen: 'Examen',
  entrega: 'Entrega',
  estadoFecha: { fijado: 'fijado', provisional: 'provisional', 'por confirmar': 'por confirmar' },
  enDias: (n: number) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`),
  ritmo: 'Ritmo respecto a la programación',
  avisos: 'Avisos',

  // Ajustes
  conexion: 'Conexión',
  conexionTexto:
    'La app lee el resumen diario desde el script de Google. Pega aquí la dirección que termina en /exec y la clave que pusiste en el script.',
  direccion: 'Dirección del script',
  clave: 'Clave',
  probar: 'Probar',
  guardar: 'Guardar',
  volver: '← Volver',
  conectado: (archivo: string) => `Conectado. Último resumen: ${archivo}.`,
  guardado: 'Guardado.',
  apariencia: 'Apariencia',
  tema: 'Tema',
  idioma: 'Idioma',
  idiomaNota: 'El resumen que escribe Claude sigue llegando en castellano.',
  temas: {
    laboratorio: ['Laboratorio', 'El de siempre. Claro u oscuro según el móvil.'],
    claro: ['Claro', 'Blanco y suave, para leer a pleno sol.'],
    colorido: ['Colorido', 'Cálido y con un color para cada grupo.'],
    noche: ['Noche', 'Laboratorio siempre oscuro.'],
  },
  avisoDiario: 'Aviso de la mañana',
  avisoTexto: 'Una notificación los días lectivos con la primera clase, el material y lo urgente. Al tocarla se abre la app.',
  avisoActivo: 'Avisarme',
  hora: 'Hora',
  avisoSinPermiso: 'Android no deja mostrar notificaciones. Actívalas para Mi día FyQ en los ajustes del móvil.',
  avisosProgramados: (n: number) => (n === 1 ? 'Hay 1 aviso programado.' : `Hay ${n} avisos programados.`),
  widget: 'Widget',
  widgetTexto: 'Mantén pulsado el escritorio del móvil, elige Widgets y busca «Mi día FyQ». Enseña la clase siguiente y lo urgente.',
  anadirWidget: 'Añadir al escritorio',

  // Aviso diario
  avisoTitulo: (fecha: string, n: number) => `${fecha} · ${n === 1 ? '1 clase' : `${n} clases`}`,
  avisoSinClases: (fecha: string) => `${fecha} · sin clases`,
  primera: (hora: string, grupo: string, aula: string) => `Primera: ${hora} ${grupo}${aula ? ` (${aula})` : ''}`,
  llevar: (cosas: string) => `Llevar: ${cosas}`,
  corregirN: (n: number) => `Corregir: ${n} pendiente${n === 1 ? '' : 's'}`,
  canalAviso: 'Aviso de la mañana',

  // Partes de clase
  parte: 'Parte',
  parteEnviado: 'Parte enviado',
  partePendiente: 'Parte sin enviar',
  parteTitulo: (grupo: string, hora: string) => `Parte de ${grupo} · ${hora}`,
  parteAyuda: 'Pulsa el micrófono del teclado y cuenta qué has hecho, qué ha quedado pendiente y cualquier incidencia.',
  partePlaceholder: 'Hoy hemos…',
  enviar: 'Enviar',
  cancelar: 'Cancelar',
  parteOk: 'Parte guardado. El resumen se actualizará en unos 2 minutos.',
  parteOkSinTarea: 'Parte guardado en Drive. Se tendrá en cuenta en el próximo resumen.',
  parteEnCola: (error: string) => `No se ha podido enviar: ${error} Queda guardado en el móvil y se reenviará solo.`,
  partesEnCola: (n: number) => (n === 1 ? '1 parte esperando para enviarse.' : `${n} partes esperando para enviarse.`),

  // Widget
  ahoraW: 'Ahora',
  siguienteW: 'Siguiente',
  sinMasClases: 'No quedan clases hoy',
  manana: 'Próximo día',
  urgente: 'Urgente',
  nadaUrgente: 'Nada urgente',
  widgetSinDatos: 'Abre la app para cargar el día',
};

export type Textos = typeof es;
type TemaId = keyof Textos['temas'];

const va: Textos = {
  dias: ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'],
  meses: ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'],
  fechaLarga: (dia, n, mes) => `${dia} ${n} ${/^[aeiouà]/i.test(mes) ? "d'" : 'de '}${mes}`,

  finDeSemana: 'Cap de setmana',
  cursoTerminado: 'Curs acabat',
  sinClase: (motivo) => `Sense classe: ${motivo}`,

  sinResumenNunca: 'Encara no hi ha cap resum descarregat. Mostre només el teu horari.',
  sinResumenHoy: (conHorario, fecha) =>
    `No hi ha resum de hui. Mostre ${conHorario ? "el teu horari i " : ''}el pendent del resum del ${fecha.toLowerCase()}.`,
  registroViejo: (estadoA) => `El registre porta més de 2 dies lectius sense actualitzar-se (estat a: ${estadoA}).`,
  formatoRaro: (detalle) => `El resum portava alguna dada amb un format inesperat: ${detalle}`,

  errores: {
    sin_url: "Falta l'adreça de l'script. Posa-la en Ajustos.",
    sin_red: "Sense connexió o l'script no respon. Mostre l'últim descarregat.",
    http: (status) => `L'script ha respost amb un error (HTTP ${status}).`,
    no_json: "L'script no ha tornat JSON. Comprova que està implementat com a aplicació web amb accés «Qualsevol usuari».",
    clave: "La clau no coincideix amb la de l'script de Google. Revisa-la en Ajustos.",
    sin_archivos: "L'script no troba cap mi_dia_fyq_*.json a la carpeta. Ja n'ha guardat algun la tasca?",
    json_invalido: "L'últim fitxer que va deixar la tasca no és un JSON vàlid.",
    ilegible: (detalle) => `El resum descarregat no es pot llegir: ${detalle}`,
    script: (detalle) => `Error de l'script: ${detalle}`,
    sin_token: "L'script encara no pot demanar resums nous: falta posar TOKEN_RUTINA en les seues propietats (mira les instruccions de l'script).",
    version_vieja: "L'script de Google és d'una versió anterior i no sap fer açò. Apega la versió nova i torna a implementar-lo.",
    rutina: (detalle) => `No s'ha pogut llançar la tasca de Claude: ${detalle}`,
    tarda: "La tasca s'ha llançat, però el resum nou encara no ha arribat. Llisca cap avall d'ací a una estona.",
  },

  generado: (h) => `Generat ${h}`,
  registro: (e) => `Registre: ${e}`,
  actualizado: (h) => `Actualitzat ${h}`,
  deslizaParaActualizar: 'Llisca cap avall per a actualitzar',
  hoyNoHayClase: 'Hui no hi ha classe',
  proximoDiaLectivo: 'Pròxim dia lectiu:',
  ajustes: 'Ajustos',
  pedirResumen: 'Demanar resum nou',
  pidiendo: 'Demanant a Claude un resum nou amb el que hi ha ara en el registre. Sol tardar uns 2 minuts.',
  resumenNuevoListo: 'Resum nou descarregat.',

  estado: { ahora: 'Ara', siguiente: 'Següent', hecha: 'Feta' },
  revisarDeberes: 'Revisar deures',
  material: 'Material',
  pendienteCorregir: 'Pendent de corregir',
  desdeEl: (ddmm) => `des del ${ddmm}`,
  materialProximos: 'Material dels pròxims dies',
  examenesEntregas: 'Exàmens i entregues',
  examen: 'Examen',
  entrega: 'Entrega',
  estadoFecha: { fijado: 'fixat', provisional: 'provisional', 'por confirmar': 'per confirmar' },
  enDias: (n) => (n === 0 ? 'hui' : n === 1 ? 'demà' : `d'ací a ${n} dies`),
  ritmo: 'Ritme respecte a la programació',
  avisos: 'Avisos',

  conexion: 'Connexió',
  conexionTexto:
    "L'app llig el resum diari des de l'script de Google. Apega ací l'adreça que acaba en /exec i la clau que vas posar en l'script.",
  direccion: "Adreça de l'script",
  clave: 'Clau',
  probar: 'Provar',
  guardar: 'Guardar',
  volver: '← Tornar',
  conectado: (archivo) => `Connectat. Últim resum: ${archivo}.`,
  guardado: 'Guardat.',
  apariencia: 'Aparença',
  tema: 'Tema',
  idioma: 'Idioma',
  idiomaNota: 'El resum que escriu Claude continua arribant en castellà.',
  temas: {
    laboratorio: ['Laboratori', 'El de sempre. Clar o fosc segons el mòbil.'],
    claro: ['Clar', 'Blanc i suau, per a llegir a ple sol.'],
    colorido: ['Colorit', 'Càlid i amb un color per a cada grup.'],
    noche: ['Nit', 'Laboratori sempre fosc.'],
  },
  avisoDiario: 'Avís del matí',
  avisoTexto: "Una notificació els dies lectius amb la primera classe, el material i l'urgent. En tocar-la s'obri l'app.",
  avisoActivo: "Avisar-me",
  hora: 'Hora',
  avisoSinPermiso: 'Android no deixa mostrar notificacions. Activa-les per a Mi día FyQ en els ajustos del mòbil.',
  avisosProgramados: (n) => (n === 1 ? 'Hi ha 1 avís programat.' : `Hi ha ${n} avisos programats.`),
  widget: 'Widget',
  widgetTexto: "Mantín premut l'escriptori del mòbil, tria Widgets i busca «Mi día FyQ». Mostra la classe següent i l'urgent.",
  anadirWidget: "Afegir a l'escriptori",

  avisoTitulo: (fecha, n) => `${fecha} · ${n === 1 ? '1 classe' : `${n} classes`}`,
  avisoSinClases: (fecha) => `${fecha} · sense classes`,
  primera: (hora, grupo, aula) => `Primera: ${hora} ${grupo}${aula ? ` (${aula})` : ''}`,
  llevar: (cosas) => `Portar: ${cosas}`,
  corregirN: (n) => `Corregir: ${n} pendent${n === 1 ? '' : 's'}`,
  canalAviso: 'Avís del matí',

  parte: 'Part',
  parteEnviado: 'Part enviat',
  partePendiente: 'Part sense enviar',
  parteTitulo: (grupo, hora) => `Part de ${grupo} · ${hora}`,
  parteAyuda: "Prem el micròfon del teclat i conta què has fet, què ha quedat pendent i qualsevol incidència.",
  partePlaceholder: 'Hui hem…',
  enviar: 'Enviar',
  cancelar: 'Cancel·lar',
  parteOk: "Part guardat. El resum s'actualitzarà en uns 2 minuts.",
  parteOkSinTarea: 'Part guardat en Drive. Es tindrà en compte en el pròxim resum.',
  parteEnCola: (error) => `No s'ha pogut enviar: ${error} Queda guardat en el mòbil i es reenviarà sol.`,
  partesEnCola: (n) => (n === 1 ? '1 part esperant per a enviar-se.' : `${n} parts esperant per a enviar-se.`),

  ahoraW: 'Ara',
  siguienteW: 'Següent',
  sinMasClases: 'Hui no queden classes',
  manana: 'Pròxim dia',
  urgente: 'Urgent',
  nadaUrgente: 'Res urgent',
  widgetSinDatos: "Obri l'app per a carregar el dia",
};

const en: Textos = {
  dias: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  meses: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fechaLarga: (dia, n, mes) => `${dia} ${n} ${mes}`,

  finDeSemana: 'Weekend',
  cursoTerminado: 'School year over',
  sinClase: (motivo) => `No class: ${motivo}`,

  sinResumenNunca: 'No summary downloaded yet. Showing only your timetable.',
  sinResumenHoy: (conHorario, fecha) =>
    `No summary for today. Showing ${conHorario ? 'your timetable and ' : ''}what was pending in the summary from ${fecha}.`,
  registroViejo: (estadoA) => `The log hasn't been updated for more than 2 school days (as of: ${estadoA}).`,
  formatoRaro: (detalle) => `Some data in the summary had an unexpected format: ${detalle}`,

  errores: {
    sin_url: 'The script address is missing. Add it in Settings.',
    sin_red: "No connection or the script isn't responding. Showing the last download.",
    http: (status) => `The script returned an error (HTTP ${status}).`,
    no_json: "The script didn't return JSON. Check it is deployed as a web app with access set to “Anyone”.",
    clave: "The key doesn't match the Google script's key. Check it in Settings.",
    sin_archivos: "The script can't find any mi_dia_fyq_*.json in the folder. Has the task saved one yet?",
    json_invalido: 'The last file the task saved is not valid JSON.',
    ilegible: (detalle) => `The downloaded summary can't be read: ${detalle}`,
    script: (detalle) => `Script error: ${detalle}`,
    sin_token: "The script can't request new summaries yet: TOKEN_RUTINA is missing from its properties (see the script's instructions).",
    version_vieja: "The Google script is an older version and can't do this yet. Paste the new version and deploy it again.",
    rutina: (detalle) => `Couldn't start the Claude task: ${detalle}`,
    tarda: "The task has started but the new summary hasn't arrived yet. Pull down to refresh in a while.",
  },

  generado: (h) => `Generated ${h}`,
  registro: (e) => `Log: ${e}`,
  actualizado: (h) => `Updated ${h}`,
  deslizaParaActualizar: 'Pull down to refresh',
  hoyNoHayClase: 'No classes today',
  proximoDiaLectivo: 'Next school day:',
  ajustes: 'Settings',
  pedirResumen: 'Request new summary',
  pidiendo: "Asking Claude for a new summary with what's in the log right now. It usually takes about 2 minutes.",
  resumenNuevoListo: 'New summary downloaded.',

  estado: { ahora: 'Now', siguiente: 'Next', hecha: 'Done' },
  revisarDeberes: 'Check homework',
  material: 'Materials',
  pendienteCorregir: 'To mark',
  desdeEl: (ddmm) => `since ${ddmm}`,
  materialProximos: 'Materials for the next days',
  examenesEntregas: 'Exams and deadlines',
  examen: 'Exam',
  entrega: 'Deadline',
  estadoFecha: { fijado: 'set', provisional: 'provisional', 'por confirmar': 'to confirm' },
  enDias: (n) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`),
  ritmo: 'Pace vs. the syllabus',
  avisos: 'Notices',

  conexion: 'Connection',
  conexionTexto: 'The app reads the daily summary from the Google script. Paste the address ending in /exec and the key you set in the script.',
  direccion: 'Script address',
  clave: 'Key',
  probar: 'Test',
  guardar: 'Save',
  volver: '← Back',
  conectado: (archivo) => `Connected. Latest summary: ${archivo}.`,
  guardado: 'Saved.',
  apariencia: 'Appearance',
  tema: 'Theme',
  idioma: 'Language',
  idiomaNota: 'The summary Claude writes still arrives in Spanish.',
  temas: {
    laboratorio: ['Lab', 'The usual one. Light or dark following the phone.'],
    claro: ['Light', 'White and soft, easy to read in bright sun.'],
    colorido: ['Colourful', 'Warm, with a colour for each group.'],
    noche: ['Night', 'Lab, always dark.'],
  },
  avisoDiario: 'Morning reminder',
  avisoTexto: 'A notification on school days with your first class, materials and anything urgent. Tap it to open the app.',
  avisoActivo: 'Remind me',
  hora: 'Time',
  avisoSinPermiso: "Android isn't allowing notifications. Turn them on for Mi día FyQ in the phone's settings.",
  avisosProgramados: (n) => (n === 1 ? '1 reminder scheduled.' : `${n} reminders scheduled.`),
  widget: 'Widget',
  widgetTexto: 'Long-press the home screen, choose Widgets and look for “Mi día FyQ”. It shows your next class and anything urgent.',
  anadirWidget: 'Add to home screen',

  avisoTitulo: (fecha, n) => `${fecha} · ${n === 1 ? '1 class' : `${n} classes`}`,
  avisoSinClases: (fecha) => `${fecha} · no classes`,
  primera: (hora, grupo, aula) => `First: ${hora} ${grupo}${aula ? ` (${aula})` : ''}`,
  llevar: (cosas) => `Bring: ${cosas}`,
  corregirN: (n) => `To mark: ${n}`,
  canalAviso: 'Morning reminder',

  parte: 'Log',
  parteEnviado: 'Log sent',
  partePendiente: 'Log not sent',
  parteTitulo: (grupo, hora) => `Class log · ${grupo} · ${hora}`,
  parteAyuda: "Tap the keyboard's microphone and say what you did, what's still pending and anything that happened.",
  partePlaceholder: 'Today we…',
  enviar: 'Send',
  cancelar: 'Cancel',
  parteOk: 'Log saved. The summary will update in about 2 minutes.',
  parteOkSinTarea: "Log saved to Drive. It'll be included in the next summary.",
  parteEnCola: (error) => `Couldn't send it: ${error} It's saved on the phone and will be resent automatically.`,
  partesEnCola: (n) => (n === 1 ? '1 log waiting to be sent.' : `${n} logs waiting to be sent.`),

  ahoraW: 'Now',
  siguienteW: 'Next',
  sinMasClases: 'No more classes today',
  manana: 'Next day',
  urgente: 'Urgent',
  nadaUrgente: 'Nothing urgent',
  widgetSinDatos: 'Open the app to load the day',
};

const TEXTOS: Record<Idioma, Textos> = { es, va, en };

export function textos(idioma: Idioma = 'es'): Textos {
  return TEXTOS[idioma] ?? es;
}

export type { TemaId };
