# TETORD 2.8.0 — Paginación e impresión PRO

## Implementado
- Vista previa de impresión con páginas independientes, tamaño físico y contador.
- Salto de página explícito respetado al construir la salida.
- A4/Carta, vertical/horizontal y márgenes aplicados a `@page` y a cada hoja de salida.
- Columnas 1/2/3 y guionización automática.
- Guía visual opcional de numeración por bloques/párrafos.
- Encabezado/pie y numeración de página renderizados por hoja.
- Reglas de ruptura para títulos, tablas, imágenes, citas y bloques.
- Accesos en Archivo, Disposición y Ribbon.

## Arquitectura
El editor sigue siendo un único `contenteditable` para conservar selección, historial, comentarios, control de cambios y referencias. `OutputManager.buildPrintPages()` crea una representación paginada independiente para vista previa e impresión.

## Limitaciones conocidas
- La edición en pantalla sigue siendo paginación visual, no un editor multipágina con DOM independiente por hoja.
- La numeración visual de líneas cuenta bloques de contenido, no líneas tipográficas exactas.
- En navegador, PDF se obtiene mediante el diálogo de impresión/Guardar como PDF.


## TETORD 2.7.1 — Imágenes y tablas PRO

- Herramientas contextuales funcionales para imágenes y tablas.
- Imágenes: ajuste de texto, rotación, recorte uniforme/por lados, posición/alineación y texto alternativo.
- Tablas: combinar/dividir celdas, alineación horizontal/vertical, color de celda, grosor de bordes, encabezado repetible al imprimir, filas/columnas y propiedades.
- Se conserva la edición HTML5 + CSS3 + JavaScript sin frameworks.

## TETORD 2.5.0 — Fase 2.5: Revisar

Auditoría previa a los cambios: se leyó por completo `package.json`,
`README.md`, `CHANGELOG.md` (llegó corrupto, ver nota en ese archivo),
`VERSION`, este archivo, `MiWord/index.html`, `MiWord/js/app.js`,
`MiWord/css/style.css`, `electron/main.js` y `electron/preload.js` antes
de tocar nada. No se eliminó ninguna función existente; todos los módulos
nuevos son adicionales.

### Añadido
- **`CommentsManager`**: comentarios anclados a una selección real de
  texto (`<span class="tetord-comment-anchor" data-comment="...">`, JSON
  con autor/fecha/texto/respuestas/estado). Nuevo, editar, responder,
  resolver/reabrir, eliminar, panel lateral (`#commentsPanel`) y
  navegación anterior/siguiente. Al vivir dentro del `innerHTML` del
  editor, los comentarios se guardan y recuperan automáticamente con los
  mecanismos ya existentes (localStorage, recuperación, exportación
  HTML) sin tocar `DocumentModel`, `LocalDocuments` ni la recuperación.
- **`TrackChangesManager`**: control de cambios sobre el mismo
  `contenteditable` (sin reescribir el editor). Inserciones envueltas en
  `<ins class="tetord-ins">`, borrados en `<del class="tetord-del">`,
  ambos con autor y fecha. Activar/desactivar, mostrar/ocultar marcas,
  aceptar/rechazar un cambio (el más cercano al cursor) y aceptar/
  rechazar todos.
- **`SynonymsManager`**: diccionario local curado de ~25 palabras
  comunes en español. Si la palabra no está registrada se muestra un
  mensaje explícito de "sin resultados" en vez de inventar sinónimos.
  Queda un campo `provider` reservado para conectar un diccionario o
  servicio externo en una fase futura.
- **`CompareManager`**: comparación de texto plano contra otro archivo
  (.html/.htm/.txt/.docx, reutilizando el importador DOCX ya existente)
  mediante diferencias por palabras mediante LCS (subsecuencia común más
  larga), mostrando agregados y eliminados. Es de solo lectura: no
  reintegra los cambios al documento (ver limitaciones abajo).
- **`ProtectionManager`**: protección de edición a nivel de aplicación
  con contraseña (hash SHA-256 vía `crypto.subtle`, con fallback si no
  está disponible). Documentado explícitamente en la UI y en el código
  que **no es cifrado del archivo**: un documento protegido y exportado
  sigue siendo legible por cualquier otro programa.
- Nuevos controles en el menú "Revisar" (`#reviewMenu`) y en la pestaña
  Revisar de la cinta, siguiendo el patrón visual existente
  (`.tetord-panel`, `.recent-modal`, `.settings-check`).

### Limitaciones conocidas y documentadas
- El control de cambios marca con fiabilidad la escritura directa, IME y
  pegado de texto simple. Los saltos de párrafo (Enter) y el pegado de
  HTML con formato no se envuelven automáticamente en `<ins>` porque
  hacerlo con seguridad exigiría un diffing estructural completo del DOM;
  el texto que se escriba a continuación sí queda marcado con normalidad.
  Esto se dejó así intencionalmente en vez de simular algo fràgil.
- "Comparar documentos" no permite aceptar/rechazar diferencias
  individuales; es una vista de comparación de solo lectura sobre texto
  plano, no sobre el documento con formato.
- "Sinónimos" usa un diccionario local pequeño, no un motor lingüístico.
- "Protección" es una restricción de edición dentro de la sesión de
  TETORD, no seguridad criptográfica del archivo guardado.

### No implementado en esta versión (alcance de esta sesión)
Las fases 2.6 (Referencias), 2.7 (Imágenes/Tablas pro), 2.8 (Paginación e
impresión pro), 2.9 (Correspondencia) y 3.0 (TETORD Office) del prompt
maestro **no se implementaron en esta versión** por el volumen de trabajo
que representan (cada una es, por sí sola, comparable en tamaño a esta
fase 2.5). Se prefirió completar por entero y probar la fase 2.5 en vez
de repartir el esfuerzo en varias fases a medio terminar. Ver el reporte
técnico de esta sesión para las notas de arquitectura sugeridas para cada
fase pendiente.

### Validación de la Fase 2.5
- `node --check MiWord/js/app.js`: correcto.
- `node --check electron/main.js` y `electron/preload.js`: correcto.
- IDs duplicados en `index.html`: ninguno.
- Referencias `getElementById()` sin elemento correspondiente: ninguna.
- Balance de etiquetas `<div>`/`</div>`: correcto (214/214).
- Prueba interactiva completa en navegador/Electron: **NO PROBADA** en
  este entorno (sin acceso a un navegador real ni a Electron).

## TETORD 2.4.0
- Herramientas contextuales de imagen y tabla.
- Ajuste de texto básico alrededor de imágenes.
- Bordes y fondo de celdas.

# PROJECT_STATE.md — Mi Word

> Este archivo es la fuente de verdad del proyecto. Cualquier agente o desarrollador que continúe el trabajo debe leerlo primero.

## Estado actual — TETORD 2.3.0

- Cinta de opciones por pestañas implementada sobre los comandos existentes.
- Sistema de estilos basado en datos implementado y persistido en documentos locales/recuperación.
- Se mantienen las limitaciones conocidas: paginación física real, comentarios/control de cambios, correspondencia, referencias avanzadas y herramientas avanzadas de imágenes/tablas siguen pendientes.

## 1. Nombre del proyecto

**Mi Word** — procesador de textos propio, inspirado en la experiencia de Microsoft Word, con identidad y código propios (HTML5 + CSS3 + JS puro, sin frameworks ni dependencias externas).

## 2. Objetivo general

Construir un procesador de textos completo por fases, empezando por una fundación sólida y agregando formato, documentos, historial, inserción de elementos, salida a archivos y ajustes de sistema sin rehacer la arquitectura.

## 3. Fase actual

**FASE 19 — PANTALLA DE INICIO Y PLANTILLAS: COMPLETADA (validación estática; sin prueba interactiva de navegador en este entorno)**

El paquete recibido para esta auditoría ya traía Fase 4 implementada sobre una base de Fase 3 que **no incluía las 2 correcciones de seguridad/nombre de archivo** hechas en la auditoría anterior de Fase 3 (ver sección 9): esas dos regresiones se confirmaron con pruebas reales y se corrigieron de nuevo aquí. Además, se encontraron y corrigieron 2 errores propios de Fase 4: el menú "Edición" no tenía botón para abrirse, y los atajos Ctrl/Cmd+Z, Ctrl/Cmd+Y y Ctrl/Cmd+Shift+Z no estaban implementados en el código pese a que el `PROJECT_STATE.md` recibido los daba por hechos (Ctrl+Z en realidad activaba el undo nativo del navegador, desincronizado del historial propio). Todo se verificó ejecutando el proyecto en un Chromium real (headless, vía Playwright) servido con un servidor HTTP local, no solo por inspección estática.

## 4. Arquitectura actual

> Estado actualizado: Mi Word 1.1 incorpora una pantalla de inicio independiente del editor, plantillas y acceso rápido a documentos recientes. La pantalla se oculta cuando se abre/crea un documento y respeta la recuperación pendiente.

```text
MiWord/
├── index.html        Estructura de la interfaz + menú Archivo + menú Edición + modal recientes
├── css/
│   └── style.css     Sistema de diseño + estados de toolbar + documentos
├── js/
│   └── app.js         DocumentModel, Editor, History, WordCounter, Toolbar,
│                       RecentDocuments, LocalDocuments, DocumentManager,
│                       MenuBar, TitleField, PageView, StatusBar, HomeManager, App
├── assets/            Recursos futuros
└── PROJECT_STATE.md   Este archivo
```

`app.js` mantiene el patrón IIFE + objetos, sin clases ES6 ni frameworks.

- **DocumentModel**: estado del documento (`name`, `content`, `savedContent`, `isSaved`, `lastModified`, `currentId`, `sourceType`).
- **Editor**: controla `contenteditable`, sincronización, selección/cursor (incluida su serialización por rutas de nodo para el historial), formato y atajos de formato (B/I/U).
- **History**: historial propio de Mi Word con snapshots de HTML + selección serializada, pila de deshacer/rehacer, agrupación por debounce, límite de estados y sincronización con el estado Guardado/Sin guardar.
- **WordCounter**: deriva palabras y caracteres desde texto plano.
- **Toolbar**: conecta controles con comandos (incluye deshacer/rehacer/cortar/copiar/pegar/seleccionar todo) y refleja estados activos.
- **RecentDocuments**: mantiene una lista local de hasta 10 documentos recientes.
- **LocalDocuments**: persiste documentos enriquecidos en `localStorage`.
- **DocumentManager**: Nuevo, Abrir, Guardar, Guardar como, documentos recientes, descarte de cambios, File System Access API, fallback de descarga, sanitización de HTML abierto, y atajos globales de documento e historial.
- **MenuBar**: selección visual, menú Archivo y menú Edición.
- **TitleField**: nombre editable y estado guardado/no guardado.
- **StatusBar**: paginación todavía estática.
- **App**: inicialización y cableado, incluida `History.init()`.

## 5. Funcionalidades implementadas

### Fase 1 conservada

- Interfaz completa de escritorio.
- Documento tipo A4 visual.
- `contenteditable` para edición natural.
- Copiar, cortar, pegar, seleccionar todo y navegación nativa.
- Contador de palabras y caracteres.
- Título editable.
- Estado Guardado / Sin guardar.
- Diseño responsive básico.

### Fase 2 conservada

- Negrita, cursiva, subrayado y tachado.
- Fuentes y tamaños.
- Color de texto y resaltado.
- Alineación izquierda, centrada, derecha y justificada.
- Lista con viñetas y lista numerada.
- Atajos Ctrl/Cmd+B, Ctrl/Cmd+I y Ctrl/Cmd+U.
- Estados activos de la toolbar.
- Conservación/restauración de `Selection`/`Range`.
- Contador actualizado después de cambios de formato.
- (El deshacer/rehacer nativo del editor de Fase 2 fue reemplazado en Fase 4 por el historial propio `History`; ver sección 9 sobre por qué era necesario desacoplarlo del undo nativo del navegador.)

### Fase 3

- Nuevo documento mediante menú Archivo.
- Confirmación antes de descartar cambios sin guardar.
- Abrir archivos `.html`, `.htm` y `.txt` mediante selector del navegador.
- **Sanitización reforzada al abrir HTML**: elimina `script`, `iframe`, `object`, `embed`, `link`, `meta`, `base`, `form`, `style`, todos los atributos de evento (`on*`, p. ej. `onerror`, `onclick`) y las URLs `javascript:` en `href`/`src`/`action`/`formaction`/`srcdoc`. (Ampliada respecto a la primera versión de Fase 3, que solo quitaba `script/iframe/object/embed`; el HTML abierto se inserta como DOM real y vivo en `#editor`, por lo que un `onerror` sin eliminar se ejecuta.)
- Conversión de TXT a párrafos HTML, con escape de texto.
- Guardado local de documentos enriquecidos en `localStorage`.
- Guardado de archivos HTML mediante File System Access API cuando el navegador lo soporta.
- Fallback a descarga `.html` cuando no existe File System Access API, con nombre de archivo transcrito a ASCII (se eliminan tildes/`ñ` solo en el nombre real del archivo descargado; el nombre visible del documento conserva los acentos) para evitar que el navegador descarte el nombre sugerido.
- Guardar como con selector nativo cuando está disponible y fallback con nombre manual (`prompt`).
- Asociación de un `FileSystemFileHandle` para poder guardar posteriormente en el mismo archivo cuando el navegador lo permite.
- Documentos recientes persistidos en `localStorage`.
- Modal de documentos recientes.
- Apertura de documentos guardados localmente desde recientes.
- Atajos Ctrl/Cmd+N, Ctrl/Cmd+O, Ctrl/Cmd+S y Ctrl/Cmd+Shift+S gestionados a nivel de `document`, por lo que funcionan sin importar qué elemento tenga el foco.
- Protección `beforeunload` cuando existen cambios sin guardar.
- Mensajes breves de confirmación de guardado/apertura.
- Actualización del título del documento y del título de la pestaña.

### Fase 4

- Historial propio (`History`) con snapshots de `innerHTML` + selección serializada por ruta de nodos, no dependiente del undo nativo del navegador.
- Deshacer/Rehacer mediante: botones de la toolbar, menú Edición, **y ahora también** los atajos de teclado Ctrl/Cmd+Z (deshacer), Ctrl/Cmd+Shift+Z (rehacer) y Ctrl/Cmd+Y (rehacer), gestionados a nivel de `document` junto a los atajos de Fase 3.
- Agrupación de escritura mediante debounce de 450 ms antes de crear un nuevo estado de historial.
- Límite de 80 estados de historial.
- Restauración de cursor/selección cuando el DOM permite reconstruir la ruta de nodos.
- Integración con `DocumentModel`: al deshacer/rehacer hasta el HTML exactamente igual al último guardado, el estado vuelve a "Guardado" automáticamente; si se aleja de él, vuelve a "Sin guardar".
- Reinicio del historial al crear/abrir/cargar un documento (nuevo, abrir archivo, abrir reciente).
- El guardado no crea una operación de edición en el historial.
- **Menú Edición** con Deshacer, Rehacer, Cortar, Copiar, Pegar y Seleccionar todo — con su botón correspondiente (`data-menu="edicion"`) añadido a la barra de menú principal (faltaba en el paquete recibido; el `<div id="editMenu">` existía en el HTML pero no había ningún control visible para abrirlo).
- Conservada y reforzada la sanitización HTML/XSS de Fase 3 (ver arriba).

## 6. Funcionalidades pendientes (fases futuras)

### Insertar
Imágenes, tablas, enlaces, saltos de página.

### Documento
Paginación real, márgenes ajustables, regla, zoom funcional.

### Herramientas
Buscar, reemplazar, estilos, panel de estadísticas extendido.

### Salida
Imprimir, exportar a PDF/HTML/TXT y más adelante DOCX si es viable.

### Sistema
Autoguardado y recuperación de sesión más avanzados, configuración, modo oscuro y accesibilidad ampliada.

## 7. Decisiones técnicas importantes

- Sin frameworks ni dependencias externas.
- `contenteditable` sobre `#editor` como base del editor enriquecido.
- Separación DocumentModel / Editor / History / UI conservada.
- Identidad visual verde pino `#2f5d50`.
- Persistencia local mediante `localStorage` para documentos propios y recientes.
- File System Access API se utiliza de forma progresiva cuando el navegador la soporta; existe fallback mediante descarga.
- Los documentos HTML guardados por Mi Word contienen el contenido enriquecido y estilos mínimos independientes de la interfaz.
- Los TXT abiertos se convierten a párrafos y se escapa el texto antes de insertarlo como HTML.
- Al abrir HTML se eliminan elementos ejecutables/embebidos (`script`, `iframe`, `object`, `embed`, `link`, `meta`, `base`, `form`, `style`) y se eliminan todos los atributos `on*` y las URLs `javascript:`, porque el HTML se inserta como DOM real y vivo, no en un contexto aislado.
- Los atajos de documento (Ctrl/Cmd+N, O, S, Shift+S) y de historial (Ctrl/Cmd+Z, Shift+Z, Y) se gestionan con un único listener a nivel de `document`, no dentro del editor, para que funcionen sin importar el foco. Los atajos de formato (Ctrl/Cmd+B/I/U) siguen ligados al editor, ya que solo tienen sentido allí.
- Ctrl/Cmd+Z y Ctrl/Cmd+Shift+Z/Y llaman siempre a `History.undo()`/`History.redo()` con `preventDefault()`, para evitar que el undo nativo de `contenteditable` actúe en su lugar y desincronice el historial propio del contenido real del editor.
- El nombre de archivo usado en la descarga de respaldo (cuando no hay File System Access API) se transcribe a ASCII porque el navegador puede descartar el nombre sugerido y usar "download" genérico si contiene diacríticos; el nombre visible del documento conserva los acentos.
- No se almacenan credenciales ni datos externos.

## 8. Problemas conocidos / limitaciones

- `localStorage` tiene capacidad limitada y no es apropiado todavía para documentos enormes.
- La apertura/guardado de archivos depende de las capacidades del navegador.
- En navegadores sin File System Access API, Guardar genera una descarga en lugar de sobrescribir silenciosamente un archivo existente.
- El guardado HTML conserva formato básico del editor, pero no pretende todavía ser un formato DOCX ni reproducir toda la compatibilidad de Word.
- La paginación sigue fija en Página 1 de 1.
- La edición enriquecida depende del motor del navegador para `contenteditable` y `document.execCommand`.
- El contador sigue usando una heurística sencilla.
- La sanitización de HTML abierto es una lista de bloqueo (tags/atributos peligrosos conocidos), no una lista blanca exhaustiva.
- La restauración exacta de la selección tras deshacer/rehacer depende de poder reconstruir la ruta de nodos en el DOM regenerado; en estructuras muy alteradas puede no restaurarse con precisión (se degrada de forma segura: no falla, simplemente no reposiciona el cursor).
- El cuadro de diálogo nativo del sistema operativo para "Guardar"/"Guardar como" (cuando el navegador soporta File System Access API) no puede probarse de forma automatizada en este entorno porque requiere interacción real con la UI del SO; sí se verificó que la llamada a `showSaveFilePicker` se invoca correctamente y que la rama de fallback de descarga funciona de extremo a extremo.
- No se puede probar el guardado real que sobrescribe un archivo ya asociado (`fileHandle.createWritable`) sin una sesión de navegador interactiva real, por el mismo motivo.
- Cortar/Copiar/Pegar desde el menú Edición usan `document.execCommand`, cuyo soporte de portapapeles varía entre navegadores; no se ha probado en navegadores distintos de Chromium.

## 9. Pruebas realizadas

Se ejecutó el proyecto en un **Chromium real (headless) vía Playwright**, servido con `python3 -m http.server` en este entorno. Todo lo listado como PROBADO se ejecutó de verdad contra la interfaz.

### PROBADO (ejecución real en Chromium vía Playwright, esta auditoría de Fase 4)

- Regresión detectada y corregida: al recibir el paquete de Fase 4, se confirmó con una prueba real (archivo HTML con `<img onerror="...">`) que la sanitización había vuelto a la versión básica de Fase 3 (solo `script/iframe/object/embed`) y el XSS se ejecutaba. Tras reincorporar `sanitizeHtmlDocument`, se confirmó que ya no se ejecuta.
- Regresión detectada y corregida: el nombre de archivo descargado con tildes (p. ej. "café con tilde") volvía a caer a "download" genérico. Tras reincorporar la transcripción ASCII, el nombre se conserva correctamente (sin tildes) en la descarga.
- Error nuevo detectado y corregido: no existía ningún botón en la barra de menú con `data-menu="edicion"`, por lo que el `<div id="editMenu">` (ya implementado en HTML/JS) era inalcanzable desde la interfaz. Se añadió el botón "Edición"; se probó que al hacer clic se abre el menú y que "Deshacer" desde ese menú funciona.
- Error nuevo detectado y corregido: `Ctrl+Z` no llamaba a `History.undo()` (no había ningún listener para las teclas Z/Y en todo el archivo); en su lugar disparaba el undo nativo de `contenteditable`, que deshacía solo el último carácter tecleado y quedaba completamente desincronizado de `History.undoStack`/`redoStack`. Al combinarlo después con el botón "Deshacer" de la toolbar (que sí usa `History`), el contenido resultante era inconsistente con lo que el usuario acababa de ver. Se implementaron los atajos `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` y `Ctrl/Cmd+Y` llamando directamente a `History.undo()`/`History.redo()` con `preventDefault()`. Se probó repetidamente alternando Ctrl+Z, Ctrl+Shift+Z y Ctrl+Y, confirmando que el contenido y las pilas de historial se mantienen consistentes.
- Consistencia Guardado/Sin guardar tras deshacer: se guardó un documento, se escribió más texto ("Sin guardar"), se presionó Ctrl+Z hasta volver exactamente al HTML guardado, y el estado volvió a "Guardado" automáticamente.
- Menú Edición: apertura por clic, listado de sus 6 opciones (Deshacer, Rehacer, Cortar, Copiar, Pegar, Seleccionar todo), y ejecución real de "Deshacer" desde el menú.
- Regresión de Fase 3 re-verificada tras los fixes: atajos Ctrl+N/O/S funcionando con foco fuera del editor (título, body).
- Regresión completa de Fase 1/2/3 tras aplicar los 4 fixes de esta sesión: escritura y contador de palabras, negrita (Ctrl+B), Abrir `.txt` con escape correcto de `<`, `>`, `&`, Nuevo documento, Deshacer/Rehacer desde la toolbar — todo sin errores de consola ni de página.
- `node --check js/app.js` sin errores tras cada cambio.

### NO PROBADO (requiere interacción real con la UI del sistema operativo o navegadores no disponibles aquí, no automatizable en este entorno)

- El diálogo nativo del sistema operativo para "Guardar"/"Guardar como" cuando el navegador ofrece `showSaveFilePicker`.
- Escritura real que sobrescribe un archivo ya existente en disco mediante `fileHandle.createWritable()`.
- Cortar/Copiar/Pegar reales con el portapapeles del sistema operativo (execCommand de portapapeles se comporta distinto según navegador/permmisos; en Chromium headless no se validó contra un portapapeles real del SO).
- Comportamiento visual (CSS) en distintos tamaños de pantalla/navegadores reales fuera de Chromium.
- Uso con Safari/Firefox (solo se probó Chromium).

### Errores reales encontrados y corregidos en esta auditoría de Fase 4

1. **Regresión de Fase 3 — XSS al abrir HTML**: el paquete de Fase 4 recibido traía de vuelta la sanitización básica (`script/iframe/object/embed` únicamente), sin los atributos `on*` ni las URLs `javascript:`. Confirmado con prueba real (`onerror` ejecutaba JavaScript). **Corregido** reincorporando `sanitizeHtmlDocument`.
2. **Regresión de Fase 3 — nombre de descarga con tildes**: el paquete de Fase 4 recibido volvía a usar el nombre de documento sin transcribir para el atributo `download`, causando que el navegador lo descartara y usara "download" genérico con nombres acentuados. **Corregido** reincorporando `downloadFileName`.
3. **Menú Edición inalcanzable**: el HTML definía `<div id="editMenu">` y el JS lo cableaba (`MenuBar.toggleMenu("editMenu", ...)`), pero no existía ningún botón `data-menu="edicion"` en la barra de menú principal para abrirlo. **Corregido** añadiendo el botón "Edición" junto a "Archivo".
4. **Atajos Ctrl+Z/Y/Shift+Z no implementados pese a estar documentados como completos**: no había ningún manejador de teclado para las teclas Z/Y en todo `app.js`; `PROJECT_STATE.md` (tal como se recibió) afirmaba que estaban implementados, pero en la práctica Ctrl+Z activaba el undo nativo del navegador, desincronizado del historial propio (`History`), lo que podía producir contenido inconsistente al combinarse con los botones de Deshacer/Rehacer de la toolbar. **Corregido** implementando los tres atajos sobre `History.undo()`/`History.redo()`.
5. **Estructura de archivos incompleta**: el ZIP recibido no incluía la carpeta `assets/` requerida por la estructura mínima del proyecto. Se volvió a crear vacía (reservada para recursos futuros), igual que en la entrega de Fase 3.

No se afirma ninguna prueba que no se haya ejecutado realmente; las secciones PROBADO y NO PROBADO reflejan exactamente lo verificado en esta sesión.

## 10. Cómo continuar

1. Leer este archivo completo.
2. No rehacer Fase 1, Fase 2, Fase 3 ni Fase 4 sin una razón técnica: en esta auditoría se probaron con navegador real y solo se corrigieron errores puntuales documentados en la sección 9 (incluidas 2 regresiones de Fase 3 que habían vuelto en el paquete de Fase 4).
3. Si se entrega un nuevo paquete del proyecto para continuar el trabajo, verificar primero que conserva los fixes de seguridad (`sanitizeHtmlDocument`), de nombre de archivo (`downloadFileName`) y de atajos (`bindGlobalShortcuts` con N/O/S/Z/Y) documentados aquí, ya que en esta sesión se detectó que un paquete puede perderlos si se genera desde una copia de trabajo distinta a la última corregida.
4. Sigue pendiente de prueba manual en un navegador real (no headless) el diálogo nativo del sistema operativo de "Guardar"/"Guardar como", el guardado que sobrescribe un archivo ya existente, y el portapapeles real del SO para Cortar/Copiar/Pegar.
5. La siguiente fase recomendada es **FASE 5 — INSERTAR** (imágenes, tablas, enlaces, saltos de página) o **PAGINACIÓN/DOCUMENTO**, según prioridad del proyecto. NO se ha iniciado ningún trabajo de Fase 5 en esta sesión.


## Fase 5 — Páginas, márgenes, regla y zoom

**Estado: COMPLETADA por implementación y revisión estática.**

- Añadido sistema de tamaño de página A4/Carta y orientación vertical/horizontal.
- Márgenes superior, inferior, izquierdo y derecho configurables en centímetros.
- Regla horizontal y vertical con marcadores arrastrables para modificar márgenes.
- Vista permite ocultar/mostrar reglas.
- Zoom de 50% a 200% en pasos de 10%, con controles en barra inferior y menú Vista.
- Contador de páginas calcula una estimación basada en la altura de contenido imprimible.
- Preferencias de página/vista se conservan en `localStorage` sin modificar el contenido HTML del documento.
- Se preservan los fixes de Fase 3/4: sanitización HTML, nombre ASCII de descarga, historial propio y atajos Ctrl/Cmd+Z/Y/Shift+Z.

### Pruebas Fase 5

**PROBADO:** `node --check js/app.js`; estructura HTML/CSS/JS revisada; ZIP reconstruido e íntegro.

**NO PROBADO:** interacción visual completa en Chromium/Playwright en esta ejecución; arrastre real de marcadores; diálogos nativos del SO; Firefox/Safari.

**Nota:** el contador de páginas es una representación de paginación para la vista actual; Fase 5 no implementa todavía paginación física independiente ni saltos de página editables.

## FASE 6 — Insertar: imágenes, tablas, vínculos y saltos de página

Estado: COMPLETADA por implementación y revisión estática.

### Implementado
- Menú **Insertar** funcional.
- Inserción de imágenes desde el equipo mediante selector de archivos; las imágenes se almacenan en el contenido como Data URL para que formen parte del documento guardado.
- Inserción de tablas mediante diálogo configurable de 1–20 filas y 1–10 columnas.
- La primera fila de la tabla se crea como encabezado (`th`) y las demás como celdas editables (`td`).
- Inserción de vínculos mediante `Ctrl+K` o menú Insertar, con validación de URLs `http://` y `https://`.
- Los vínculos insertados usan `target="_blank"` y `rel="noopener noreferrer"`.
- Inserción de saltos de página mediante elemento dedicado con reglas de impresión `break-after/page-break-after`.
- Las cuatro operaciones pasan por el historial propio de Fase 4 para permitir Deshacer/Rehacer.
- Se conserva la selección del editor al abrir los diálogos/selector de inserción.
- Se conserva la sanitización XSS de Fase 3/4 y el nombre ASCII de descarga.

### Pruebas
- `node --check js/app.js`: PROBADO, sin errores de sintaxis.
- Inspección de estructura HTML/CSS/JS: PROBADO.
- Intento de prueba interactiva real con Chromium/Playwright: el entorno bloqueó la navegación local (`ERR_BLOCKED_BY_ADMINISTRATOR`) y posteriormente la prueba embebida no completó por timeout; por tanto, **NO se declara como prueba interactiva completa**.
- Diálogos nativos del SO y portapapeles real: NO PROBADO.

### Notas
- No se implementó todavía edición avanzada de tamaño/posición de imágenes, ni herramientas de diseño de tablas (bordes, combinar/dividir celdas). Esas capacidades pertenecen a una etapa posterior si se requieren.
- No se inició Fase 7.


## FASE 7 — Herramientas avanzadas

Estado: **COMPLETADA por implementación y revisión estática**.

### Implementado
- Menú **Herramientas** integrado en la barra principal.
- **Buscar** con Ctrl/Cmd+F, navegación Anterior/Siguiente, contador de coincidencias y opción para distinguir mayúsculas/minúsculas.
- **Reemplazar** con Ctrl/Cmd+H, reemplazo individual y Reemplazar todo, conservando los nodos/formato existentes cuando las coincidencias están dentro de un mismo nodo de texto.
- **Estilos de párrafo**: Normal, Título 1, Título 2, Título 3, Cita y Código.
- **Estadísticas extendidas**: palabras, caracteres sin saltos, caracteres con espacios, bloques/párrafos, páginas estimadas y palabras seleccionadas.
- Integración de reemplazos y estilos con el historial propio de Fase 4.
- Atajos Ctrl/Cmd+F y Ctrl/Cmd+H. Escape cierra los nuevos diálogos.
- Se conservan las funciones de Fases 1–6, sin frameworks ni dependencias externas.

### Pruebas
- `node --check js/app.js`: **PROBADO**, sin errores de sintaxis.
- Verificación estática de IDs, referencias de módulos, menú Herramientas, diálogos, estilos y atajos: **PROBADO**.
- ZIP final reconstruido y comprobado con `unzip -t`: **PROBADO**, sin errores.

### NO PROBADO
- Interacción completa en Chromium: el entorno de ejecución bloquea la navegación local con `ERR_BLOCKED_BY_ADMINISTRATOR`; no se declara una prueba de navegador que no pudo ejecutarse.
- Firefox/Safari.
- Portapapeles real del sistema operativo y diálogos nativos de archivos.

### Notas
- Buscar opera sobre nodos de texto individuales para evitar modificar el HTML solo para resaltar resultados.
- Reemplazar todo conserva el formato de los nodos donde se encuentran las coincidencias.
- Los estilos usan `formatBlock` y el estilo visual correspondiente se define en CSS.
- No se inició la Fase 8.


---

# FASE 8 — SALIDA: COMPLETADA

## Implementación
- Se añadió **Imprimir / PDF…** desde Archivo y mediante `Ctrl+P`.
- La impresión usa un área de salida separada y respeta tamaño/orientación/márgenes configurados en Fase 5.
- Los saltos de página de Fase 6 se convierten en saltos de impresión.
- Se añadió **Exportar HTML**, reutilizando la generación HTML del documento.
- Se añadió **Exportar TXT**, utilizando el texto plano actual del editor.
- Se añadió **Exportar Word (.docx)** sin dependencias externas. El exportador genera un paquete DOCX ZIP mínimo válido con `document.xml`, estilos y propiedades básicas.
- El DOCX conserva texto, párrafos, saltos de página y formato básico de negrita/cursiva/subrayado; imágenes se representan como marcador textual `[Imagen: ...]` en esta primera versión del exportador DOCX.
- `Ctrl+P` queda interceptado para evitar el diálogo de impresión genérico del navegador y abrir el flujo de salida de Mi Word.
- Todas las nuevas salidas se conectan al menú Archivo y conservan la identidad visual existente.

## Pruebas PROBADAS
- `node --check js/app.js` → sin errores de sintaxis.
- Estructura HTML principal y referencias a CSS/JS verificadas.
- No se detectaron IDs duplicados en la interfaz al validar la estructura.
- Integridad del ZIP final comprobada con `unzip -t`.
- Se comprobó estáticamente la presencia de `OutputManager`, sus cuatro acciones de salida, `Ctrl+P`, y su inicialización en `App`.

## NO PROBADO
- Diálogo de impresión/PDF del sistema en un navegador real.
- Exportación mediante interacción real del navegador.
- Apertura del DOCX generado en Microsoft Word/LibreOffice.
- Compatibilidad de impresión específica de Chrome/Firefox/Safari.
- Inserción real de imágenes dentro del DOCX: esta versión las representa como marcador textual.
- Guardado/sobrescritura mediante diálogos nativos del sistema.

## Nota técnica
La generación DOCX se implementó con ZIP sin compresión y CRC-32 directamente en JavaScript, evitando frameworks y dependencias externas. Esto mantiene la arquitectura original HTML/CSS/JS puro.

# FASE 9 — SISTEMA: AUTOGUARDADO, RECUPERACIÓN, CONFIGURACIÓN Y ACCESIBILIDAD

Estado: **COMPLETADA por implementación y revisión estática.**

### Implementado
- Menú **Sistema** en la barra principal.
- **Autoguardado local de recuperación**: mientras el documento tiene cambios sin guardar, Mi Word conserva una copia de recuperación en `localStorage` con un pequeño retraso para agrupar cambios. Esto no sustituye todavía el guardado explícito a archivo del documento.
- **Recuperación de sesión** al iniciar: si existe una copia recuperable distinta del documento inicial, se muestra un diálogo para recuperar o descartar.
- Recuperación conserva nombre, HTML y referencia del contenido guardado para que el estado siga apareciendo como **Sin guardar** hasta que el usuario guarde explícitamente.
- Opción para **eliminar la recuperación guardada** manualmente.
- Preferencias persistentes para autoguardado, recuperación, modo oscuro, reducción de movimiento y tamaño de interfaz.
- **Modo oscuro** con la identidad verde pino de Mi Word, sin convertir la interfaz en una estética neon.
- **Reducir movimiento**, además de respetar automáticamente `prefers-reduced-motion` del sistema.
- **Tamaño de interfaz grande** para mejorar legibilidad sin alterar el tamaño real del documento.
- Etiquetas, roles y controles del diálogo de recuperación preparados para teclado y lectores de pantalla; se mantienen los `aria-label`/`aria-labelledby` existentes.
- Se conservan las fases 1–8 y sus correcciones de seguridad, historial, inserción, herramientas y salida.

### Pruebas
**PROBADO:** `node --check js/app.js`; búsqueda de IDs nuevos y referencias `SystemManager`; estructura del ZIP; variables CSS y selectores principales revisados; ZIP final comprobado con `unzip -t`.

### NO PROBADO
- Persistencia y recuperación mediante interacción completa en Chromium/Firefox/Safari.
- Prueba visual completa del modo oscuro y tamaño de interfaz en todos los breakpoints.
- Prueba con lector de pantalla real.
- Comportamiento del `beforeunload` en todos los navegadores.
- Sincronización entre varias pestañas/dispositivos: no implementada.
- Autoguardado a un archivo del sistema: no implementado; el autoguardado de Fase 9 es una copia de recuperación local.

### Notas
- El autoguardado no marca el documento como **Guardado**, porque eso podría hacer creer que el archivo del usuario ya fue escrito al disco.
- La recuperación se elimina al aceptar **Descartar** o al restaurar correctamente la sesión.
- El modo oscuro afecta la interfaz, no fuerza colores oscuros sobre el contenido del documento salvo que el documento ya los tenga.


# FASE 11 — REVISIÓN Y EXPERIENCIA DE ESCRITURA

Estado: **COMPLETADA por implementación y revisión estática.**

### Implementado
- Nuevo menú **Revisar**.
- Activación/desactivación persistente de la **corrección ortográfica** del editor mediante `spellcheck`.
- **Borrar formato** para retirar formato inline de la selección mediante `Ctrl+Espacio`.
- **Modo concentración**: oculta temporalmente barras y regla para dejar el documento como foco principal.
- `Escape` sale del modo concentración.
- Preferencias de revisión persistidas en `localStorage` sin afectar al contenido del documento.
- `ReviewManager` expuesto en `window.MiWord`.

### Pruebas
**PROBADO:** `node --check js/app.js`; referencias HTML/CSS/JS y ausencia de IDs duplicados revisadas; ZIP comprobado con `unzip -t`.

### NO PROBADO
- Corrección ortográfica real depende del diccionario y motor del navegador.
- Interacción visual completa del modo concentración en Chromium/Firefox/Safari.
- Comportamiento del portapapeles y atajos en todos los sistemas operativos.


## Fase 12 — Pulido profesional de interfaz
- Mejorados estados de foco y accesibilidad de controles.
- Añadidos tooltips/aria-label a controles principales de formato.
- Menús y toolbar con desplazamiento más robusto en ventanas pequeñas.
- Estados activos, hover y pulsación más consistentes.
- Respeto de `prefers-reduced-motion` además del ajuste propio de Mi Word.
- Corregida duplicación accidental del selector `.color-swatch`.

## Fase 13 — Compatibilidad y robustez
- Almacenamiento local protegido contra errores/cuota y lecturas corruptas.
- Guardado local de documento actualizado después de completar correctamente la salida a archivo.
- Manejo de errores y cancelaciones de lectura de archivos e imágenes.
- Límite de 15 MB para archivos abiertos y 4 MB por imagen insertada.
- La recuperación local se intenta al ocultar la pestaña además de antes de cerrar.
- Avisos de error no controlado para evitar fallos silenciosos.
- Validación estática completada; interacción real de navegador sigue pendiente por bloqueo del entorno.


## FASE 14 — Imágenes avanzadas
- Selección contextual de imágenes insertadas mediante clic.
- Panel de propiedades flotante: ancho en píxeles, texto alternativo y alineación izquierda/centrada/derecha.
- Eliminación de imágenes con actualización del documento e historial.
- Imágenes insertadas reciben `tabindex` y `aria-label` para mejor accesibilidad.
- Posicionamiento del panel adaptado al espacio visible de la ventana.
- Se corrigió una compatibilidad interna de Fase 11: `Editor.sync()` y `History.capture()` ahora delegan correctamente en el flujo de entrada/historial existente.
- Limitación: el ancho está expresado en píxeles y la imagen sigue limitada al ancho útil de la página (`max-width: 100%`); todavía no existe recorte, rotación, ajuste de texto ni arrastre de esquinas.
- Validación estática: `node --check js/app.js` correcto.
- Integridad ZIP: validada con `unzip -t`.
- Prueba interactiva completa en navegador: NO realizada en este entorno.


### Fase 15 — Tablas avanzadas

- Selección visual de tablas con clic y panel contextual de propiedades.
- Agregar filas y columnas desde el panel.
- Eliminar la fila o columna donde está el cursor, conservando al menos una fila y una columna.
- Cambiar la primera fila entre encabezado (`th`) y celdas normales (`td`).
- Cambiar el ancho de la tabla entre 20% y 100%.
- Alinear la tabla a izquierda, centro o derecha.
- Eliminar una tabla completa desde el panel.
- El panel se reposiciona al mover la ventana o hacer scroll y se cierra con Escape.
- Los cambios pasan por el historial propio de Mi Word.
- Las operaciones conservan el contenido existente de las celdas al modificar la estructura.

**Limitación conocida:** esta fase no implementa todavía arrastre directo de bordes para redimensionar columnas individuales ni combinar/dividir celdas.

**Validación Fase 15:** `node --check js/app.js` y prueba de integridad del ZIP realizadas. La interacción completa en navegador no pudo ejecutarse en este entorno.


## 7. Fase 5 a 15 — estado consolidado

Las fases posteriores añadieron paginación estimada, márgenes, regla y zoom; inserción de imágenes, tablas, vínculos y saltos de página; búsqueda/reemplazo, estilos y estadísticas; impresión y exportación HTML/TXT/DOCX; recuperación/autoguardado, preferencias, modo oscuro, accesibilidad, revisión, enfoque, pulido visual, robustez de almacenamiento, propiedades avanzadas de imágenes y tablas.

## 8. Fase 16 — Documentos profesionales

- Encabezado y pie de página configurables desde Diseño.
- Número de página configurable en el pie.
- Visualización del encabezado/pie dentro de la hoja de trabajo.
- Persistencia de encabezado, pie y opciones asociadas en documentos locales y recuperación de sesión.
- Exportación HTML conserva la configuración mediante metadatos propios de Mi Word.
- Impresión incluye encabezado/pie y numeración mediante el sistema de impresión del navegador.
- Exportación DOCX incorpora partes `header1.xml` y `footer1.xml` y referencias de sección para encabezado, pie y campo PAGE.
- La opción de primera página diferente queda registrada en el documento para futuras mejoras de paginación real; la implementación visual actual no pretende simular paginación física exacta.

### Validación de Fase 16
- `node --check js/app.js`: correcto.
- Integridad del ZIP: verificada con `unzip -t`.
- Prueba interactiva completa en navegador: no realizada en este entorno por bloqueo del navegador automatizado.

## 9. Próximas fases sugeridas

- Fase 17: pruebas finales y auditoría integral.
- Fase 18: preparación de Mi Word 1.0, limpieza técnica y documentación final.


## 17. Fase 17 — Auditoría y robustez final

Se realizó una auditoría estática completa de la base de Fase 16 y se corrigieron regresiones detectadas antes de la preparación de Mi Word 1.0:

- Se preservan encabezado, pie, numeración y primera página diferente al abrir HTML exportado por Mi Word.
- Se preservan esos mismos metadatos al restaurar una sesión de recuperación local.
- La exportación HTML respeta correctamente Carta/Letter además de A4 (antes podía caer a A4 por una diferencia de mayúsculas en el valor interno).
- La exportación DOCX ahora toma el tamaño de página, orientación y márgenes configurados en Mi Word en lugar de usar siempre A4.
- DOCX incluye `titlePg` cuando está activada la opción de primera página diferente.
- Se verificó que todas las referencias `getElementById()` existentes en `app.js` tienen un elemento correspondiente en `index.html`.
- Se verificó ausencia de IDs HTML duplicados.
- `node --check js/app.js` pasa correctamente.

### Estado de pruebas

- Sintaxis JavaScript: **PROBADA**.
- Integridad estructural HTML/JS mediante auditoría estática: **PROBADA**.
- ZIP: **PROBADO** con test de integridad.
- Flujo interactivo completo en navegador: **NO PROBADO** en este entorno porque Chromium está bloqueado por las políticas del entorno de ejecución.

La siguiente etapa es la preparación de **Mi Word 1.0**, centrada en congelar funcionalidades, documentar limitaciones conocidas y hacer una última revisión de distribución.


## Fase 19 — Pantalla de inicio y plantillas

- Pantalla inicial de Mi Word al arrancar cuando no hay una recuperación pendiente.
- Documento en blanco.
- Plantillas: Trabajo escolar, Informe, Carta, Apuntes y Currículum.
- Vista de hasta 6 documentos recientes guardados localmente.
- Apertura de archivos desde la pantalla inicial.
- Acceso a “Ver todos” mediante el gestor existente de documentos recientes.
- Las plantillas crean documentos editables y sin guardar, conservando el historial y la configuración de página.
- La pantalla inicial no reemplaza el editor: funciona como punto de entrada y desaparece al comenzar a trabajar.
- Diseño sobrio y propio de Mi Word, sin depender de recursos externos.

### Validación de Fase 19

- `node --check js/app.js`: OK.
- IDs HTML duplicados: ninguno.
- Botones de plantilla: 6.
- ZIP final: verificado con `unzip -t`.
- Prueba interactiva completa en navegador: no realizada en este entorno por bloqueo de Chromium.

### Versión

**TETORD 2.0.0** — experiencia de inicio con plantillas y documentos recientes.


## TETORD 2.0 — consolidación avanzada

Se incorporó una capa de funciones para acercar el producto a un procesador de textos de escritorio: formato de párrafo (espaciado, interlineado y sangrías), superíndice/subíndice, cambio de mayúsculas/minúsculas, ecuaciones y símbolos, notas al pie, tabla de contenido, marcadores, propiedades del documento y combinación/división básica de celdas. La identidad visual pasa a llamarse TETORD (Teto + Word), manteniendo una estética sobria y propia.

### Estado de pruebas TETORD 2.0
- Sintaxis JavaScript: se valida con `node --check`.
- Auditoría estructural: IDs y referencias principales se revisan estáticamente.
- ZIP: se verifica con `unzip -t`.
- Interacción completa en navegador: NO PROBADA en este entorno por bloqueo de Chromium.

## Fase 19 / TETORD 2.1 — Importación DOCX
- `Archivo > Abrir` acepta `.docx`.
- Se implementó un lector ZIP/DOCX local sin dependencias externas.
- Importación: texto, estilos de párrafo básicos, formato inline básico, tablas, saltos de página, encabezado/pie, número de página y configuración de sección básica.
- Compatibilidad: documentos DOCX estándar que usen ZIP Store/Deflate; no es un parser completo de OOXML.

## 2.1.1 — Más fuentes y colores

- Paleta de texto ampliada a 19 colores y resaltado a 15 colores.
- Selector de fuentes ampliado con 14 familias comunes.

## Auditoría 2.1.3 — Guardado y exportación

**FASE 20 — ARCHIVOS: COMPLETADA (validación estática; ejecución interactiva no disponible en este entorno).**

Se separaron conceptualmente `Guardar`, `Guardar como`, `Exportar` e `Imprimir/PDF`.
`Guardar como` dispone de cuatro formatos: DOCX, PDF, TXT y HTML. El formato elegido se registra en `DocumentModel.fileFormat` y en los documentos recientes locales.

- DOCX reutiliza el generador DOCX existente.
- TXT se genera desde el texto plano del editor.
- HTML reutiliza `buildHtmlFile()`.
- PDF mantiene el flujo de impresión en navegador; en Electron usa `webContents.printToPDF` mediante IPC seguro.
- Electron incorpora `electron/preload.js` con `contextBridge`; no se habilita `nodeIntegration`.
- La selección de formato y nombre evita extensiones duplicadas.
- `Inicio` conserva el documento en memoria y dispone de confirmación Guardar/No guardar/Cancelar para cambios pendientes.

### PROBADO
- Sintaxis de `MiWord/js/app.js` con `node --check`.
- Sintaxis de `electron/main.js` y `electron/preload.js` con `node --check`.
- Inspección estática de IDs, listeners y referencias de los nuevos controles.
- Integridad de estructura del proyecto y ZIP final.

### NO PROBADO
- Ejecución visual/interactiva real de Electron o navegador.
- Diálogos nativos de Guardar como.
- Generación real de PDF por `printToPDF`.
- Apertura posterior de DOCX/PDF/TXT/HTML en aplicaciones externas.


## Actualización 2.1.4

Se amplió la navegación superior para acercar la organización de TETORD al modelo de procesadores de texto de escritorio: Disposición, Referencias, Correspondencia y Ayuda. Los comandos disponibles reutilizan módulos existentes; las funciones aún no implementadas permanecen deshabilitadas o informativas.

### Pruebas 2.1.4
- `node --check MiWord/js/app.js` → sin errores.
- IDs usados por `getElementById` → sin faltantes.
- IDs duplicados → ninguno.
- Estructura HTML principal → balance correcto.
- ZIP final → integridad verificada con `unzip -t`.
- Ejecución interactiva en navegador/Electron → NO PROBADA en este entorno.


## 2.3.0 — Paginación física visual
El editor representa el documento como una secuencia vertical de hojas con altura basada en el tamaño de papel, márgenes y orientación. Los saltos explícitos y el crecimiento del contenido actualizan el contador de páginas. Sigue existiendo un único contenteditable para evitar romper selección e historial.


## 2.6.0 — Referencias
- Tabla de contenido actualizable basada en H1/H2/H3.
- Notas al pie y notas al final.
- Fuentes locales, citas y bibliografía.
- Títulos numerados para figuras/tablas.
- Referencias cruzadas a marcadores, encabezados y títulos.
- Entradas de índice e índice generado.
- Pendiente: actualización inteligente de campos al estilo Word y motor bibliográfico avanzado.


## TETORD 2.9.0 — Correspondencia
La fase 2.9 incorpora combinación de correspondencia local: destinatarios desde CSV/TSV, campos combinados, vista previa por registro y generación de un documento HTML combinado. No requiere servidor.

## TETORD 3.1.0 — Office
Suite unificada: Writer, Calc, Slides y Messenger. Calc y Slides son módulos iniciales funcionales; Messenger es local y preparado para backend futuro.


### 3.1.0 Writer PRO
Historial local de versiones, saltos de sección, pegado sin formato, estadísticas de selección y atajos de productividad.

## TETORD 3.3.0 — Slides PRO
Slides recibe temas (Miku Blue, claro, oscuro y atardecer), fondo configurable, imágenes locales persistidas, duplicación y presentación navegable. Writer=Teto rojo pastel, Calc=Neru amarillo pastel, Slides=Miku azul pastel.


## TETORD 3.4.0 — Office Files
- Estado: implementado.
- Nuevo módulo Archivos en TETORD Office.
- Inicio muestra recientes de Writer/Calc/Slides.
- Búsqueda y filtros locales.
- Apertura directa de documentos Writer guardados localmente.
- Creación rápida de Writer/Calc/Slides.
- Sin servidor, nube ni sincronización online.
