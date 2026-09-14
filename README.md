
## TETORD 2.7.1 — Imágenes y tablas PRO

- Herramientas contextuales funcionales para imágenes y tablas.
- Imágenes: ajuste de texto, rotación, recorte uniforme/por lados, posición/alineación y texto alternativo.
- Tablas: combinar/dividir celdas, alineación horizontal/vertical, color de celda, grosor de bordes, encabezado repetible al imprimir, filas/columnas y propiedades.
- Se conserva la edición HTML5 + CSS3 + JavaScript sin frameworks.

# Mi Word 1.1

Procesador de textos web propio construido con HTML5, CSS3 y JavaScript puro.

## Inicio
Al abrir Mi Word se muestra una pantalla inicial con:
- Documento en blanco
- Trabajo escolar
- Informe
- Carta
- Apuntes
- Currículum
- Documentos recientes guardados localmente
- Abrir documento

## Privacidad
Los documentos recientes y documentos locales se almacenan en el almacenamiento del navegador del dispositivo. No se usa un servidor externo para sincronización.

## Compatibilidad
Se recomienda un navegador moderno con soporte para `contenteditable`, `localStorage`, FileReader y, cuando esté disponible, File System Access API.

## Pruebas
La validación estática de la distribución pasa. La prueba interactiva completa en navegador no se realizó en el entorno de desarrollo porque Chromium está bloqueado.


## TETORD 2.0
TETORD (Teto + Word) añade herramientas de párrafo, ecuaciones Unicode, símbolos, notas al pie, tabla de contenido, marcadores, combinación/división de celdas, propiedades del documento y una barra de herramientas ampliada. Mantiene HTML5/CSS3/JavaScript vanilla y almacenamiento local.


## TETORD Desktop

Esta distribución incluye un empaquetado de escritorio con Electron. En Windows puedes ejecutar `npm install` y después `npm run dist` para generar el instalador y la versión portable.


## Versión actual

TETORD 2.8.0 — paginación e impresión PRO, vista previa paginada, columnas y configuración de salida.

## 2.4.0
La edición 2.2 incorpora una cinta de opciones organizada por pestañas y un sistema de estilos basado en datos, manteniendo la arquitectura HTML5/CSS3/JavaScript puro.


### 2.4.0
Incluye controles contextuales para imágenes y tablas.

## 2.5.0 — Revisar
Añade comentarios anclados al texto, control de cambios (insertar/borrar
marcado, aceptar/rechazar), sinónimos con diccionario local, comparación
de documentos por texto plano y protección de documento a nivel de
aplicación. Ver `CHANGELOG.md` y `MiWord/PROJECT_STATE.md` para el
detalle y las limitaciones conocidas.


## TETORD 2.6.0 — Referencias

Incluye tabla de contenido actualizable, notas al final, fuentes y citas, bibliografía, títulos de figuras/tablas, referencias cruzadas, marcadores de índice e índice generado. Los datos de fuentes se almacenan localmente y las referencias se conservan dentro del HTML del documento.


## 2.8.0 — Paginación e impresión PRO
Incluye vista previa de impresión por hojas, saltos de página, configuración A4/Carta y orientación, márgenes, columnas, guionización y encabezados/pies con numeración.


## TETORD 2.9.0 — Correspondencia
La fase 2.9 incorpora combinación de correspondencia local: destinatarios desde CSV/TSV, campos combinados, vista previa por registro y generación de un documento HTML combinado. No requiere servidor.

## TETORD Office 3.0
TETORD 3.0 incorpora Writer, Calc, Slides y Messenger en una suite local. Messenger no usa servidor todavía.


## TETORD 3.1.0 — Writer PRO

Writer incorpora historial local de versiones, saltos de sección, pegado sin formato, estadísticas de selección y atajos de productividad.

## 3.4.0
Calc PRO incorpora múltiples hojas, fórmulas adicionales y formato de celdas. La identidad visual de TETORD Office diferencia Writer (rojo pastel), Calc (amarillo pastel) y Slides (azul pastel).


### 3.4.0 — TETORD Files
La suite incorpora un espacio común de **Archivos** para localizar y abrir recursos locales de Writer, Calc y Slides. Incluye búsqueda, filtros, recientes y accesos rápidos para crear contenido. Sigue siendo almacenamiento local; la nube, colaboración y sincronización quedan para fases posteriores.
