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
