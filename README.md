# Banco de Occidente — Corporate Banking

Proyecto web reestructurado desde un solo archivo HTML.

## Estructura
- `index.html` — plantilla principal del sitio
- `css/styles.css` — estilos extraídos
- `js/app.js` — lógica y datos extraídos
- `split_to_project.py` — script auxiliar usado para generar este proyecto

## Cómo usar
1. Abre `c:\bdo_corporate_banking` en VS Code.
2. Edita `index.html`, `css/styles.css` o `js/app.js` según necesites.
3. Usa Live Server o abre `index.html` en el navegador.

## Notas
- Mantengo la importación de Chart.js desde CDN en el `<head>` de `index.html`.
- El script de forzar modo claro se conserva en el `<head>` para que se ejecute antes del render.
