/**
 * ══════════════════════════════════════════════════════════════
 *  pruebas3-utils.js  —  Normalizador y exportador para datosBancarios3
 *  Banco de Occidente · AFIP MVP
 * ══════════════════════════════════════════════════════════════
 *
 *  PROBLEMAS DETECTADOS Y CORREGIDOS:
 *  ─────────────────────────────────────────────────────────────
 *  1. CAMPO_X_NAME = null  →  columna inexistente desde SQL Server;
 *     se omite completamente (no genera columna vacía en Excel).
 *
 *  2. CAMPO_X_NAME != null pero CAMPO_X_VALUE = null  →  5 606
 *     ocurrencias. El campo UDF existe pero no tiene valor para
 *     esta transacción; se guarda como string vacío '' (no "null").
 *
 *  3. MEDIO_PAGO = null  →  238 registros. Campo fijo que puede
 *     llegar sin valor; se normaliza a ''.
 *
 *  4. TRN_DT / VALUE_DT como timestamp Unix en milisegundos
 *     (ej. 1776988800000). JS los interpreta como número, no fecha;
 *     se convierten a string DD/MM/AAAA para visualización y Excel.
 *
 *  5. EXTERNAL_REF_NO como entero largo (ej. 1141004238080996).
 *     JavaScript pierde precisión en floats > 2^53; se convierte
 *     a string para preservar el valor exacto.
 *
 *  6. CAMPO_X_VALUE con decimales .0 en cédulas/IDs
 *     (ej. 33225558.0). Se elimina el decimal innecesario.
 *
 *  7. Solo existen 69 nombres UDF únicos sobre 200 columnas
 *     declaradas. El pivote dinámico descubre solo los reales
 *     y evita crear 131 columnas vacías en Excel.
 *
 *  CÓMO USAR:
 *  ─────────────────────────────────────────────────────────────
 *  1. En index.html, cargar DESPUÉS de pruebas3.js:
 *       <script src="pruebas3.js"></script>
 *       <script src="pruebas3-utils.js"></script>
 *
 *  2. Acceder a los datos normalizados:
 *       window.datosBancarios3Normalized  →  Array de 445 objetos planos
 *       window.datosBancarios3Columns     →  Array de nombres de columna
 *       window.datosBancarios3Count       →  445
 *
 *  3. Exportar a Excel:
 *       exportDatosBancarios3ToExcel();          // todos los registros
 *       exportDatosBancarios3ToExcel(filtered);  // subconjunto filtrado
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ── 1. CONSTANTES ──────────────────────────────────────────
  const MAX_CAMPOS = 200;   // máximo de pares CAMPO_X_NAME/VALUE por registro

  /**
   * Columnas fijas que vienen directamente de la query SQL.
   * El orden define el orden de las columnas en Excel.
   */
  const FIXED_COLUMNS = [
    'RELATED_REFERENCE',
    'CUENTA',
    'REF_TRANSACCION',
    'MEDIO_PAGO',
    'TRN_DT',
    'VALUE_DT',
    'TRN_CODE',
    'DRCR_IND',
    'TRN_DESC',
    'EXTERNAL_REF_NO',
    'MODULE',
    'TXN_TYPE',
    'AC_ENTRY_SR_NO',
    'CONTRACT_REF_NO',
    'PRODUCT_CODE'
  ];

  // ── 2. HELPERS ──────────────────────────────────────────────

  /**
   * Convierte cualquier valor a string seguro.
   * null / undefined  →  ''
   * número con .0     →  elimina decimal innecesario (ej. "33225558")
   * otros números     →  String(val)
   */
  function safeStr(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') {
      // Eliminar decimales .0 en cédulas / IDs (ej. 33225558.0 → "33225558")
      return Number.isInteger(val) ? String(val) : val % 1 === 0 ? String(Math.trunc(val)) : String(val);
    }
    return String(val).trim();
  }

  /**
   * Convierte un timestamp Unix en milisegundos a "DD/MM/AAAA".
   * Si el valor es nulo, inválido o no parece un timestamp, retorna ''.
   */
  function tsToDate(val) {
    if (val === null || val === undefined || val === '') return '';
    const ms = Number(val);
    if (isNaN(ms) || ms <= 0) return '';
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    const dd   = String(d.getUTCDate()).padStart(2, '0');
    const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /**
   * Convierte EXTERNAL_REF_NO (entero largo) a string
   * usando BigInt para evitar pérdida de precisión.
   */
  function safeExtRef(val) {
    if (val === null || val === undefined) return '';
    // BigInt preserva la precisión completa
    try { return BigInt(Math.trunc(val)).toString(); } catch (_) { return String(val); }
  }

  // ── 3. VERIFICAR QUE EL ARCHIVO DE DATOS ESTÉ CARGADO ─────
  if (typeof window.datosBancarios3 === 'undefined') {
    console.error('[pruebas3-utils] ERROR: window.datosBancarios3 no está definido. ' +
                  'Asegúrese de cargar pruebas3.js ANTES de pruebas3-utils.js.');
    return;
  }

  const rawRecords = window.datosBancarios3.value;

  if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
    console.warn('[pruebas3-utils] datosBancarios3.value está vacío o no es un array.');
    window.datosBancarios3Normalized = [];
    window.datosBancarios3Columns    = FIXED_COLUMNS.slice();
    window.datosBancarios3Count      = 0;
    return;
  }

  // ── 4. DESCUBRIR COLUMNAS DINÁMICAS (CAMPO_X_NAME) ─────────
  /**
   * Iterar TODOS los registros para encontrar los nombres UDF únicos
   * no-null. Preserva el orden de primera aparición → consistencia
   * con la estructura original de SQL Server.
   *
   * CORRECCIÓN NULL #1: se omiten pares donde CAMPO_X_NAME = null.
   * Estos son "slots vacíos" que SQL Server incluye por el SELECT fijo
   * de 200 columnas pero que no corresponden a ningún campo real.
   */
  const udfNamesOrdered = [];
  const udfNamesSet     = new Set();

  rawRecords.forEach(function (record) {
    for (var i = 1; i <= MAX_CAMPOS; i++) {
      var nameKey = 'CAMPO_' + i + '_NAME';
      var rawName = record[nameKey];

      // CORRECCIÓN NULL #1: saltar si NAME es null/vacío
      if (rawName === null || rawName === undefined || String(rawName).trim() === '') continue;

      var cleanName = String(rawName).trim();
      if (!udfNamesSet.has(cleanName)) {
        udfNamesSet.add(cleanName);
        udfNamesOrdered.push(cleanName);
      }
    }
  });

  // ── 5. NORMALIZAR CADA REGISTRO ────────────────────────────
  var normalized = rawRecords.map(function (record, idx) {
    var flat = {};

    // ── Campos fijos con manejo especial ──────────────────────

    // RELATED_REFERENCE: referencia cruzada, siempre string
    flat['RELATED_REFERENCE'] = safeStr(record['RELATED_REFERENCE']);

    // CUENTA: número de cuenta, preservar como string para evitar notación científica
    flat['CUENTA'] = safeStr(record['CUENTA']);

    flat['REF_TRANSACCION'] = safeStr(record['REF_TRANSACCION']);

    // CORRECCIÓN NULL #3: MEDIO_PAGO puede ser null en 238 registros
    flat['MEDIO_PAGO'] = safeStr(record['MEDIO_PAGO']);

    // CORRECCIÓN NULL #4: timestamps Unix ms → DD/MM/AAAA
    flat['TRN_DT']   = tsToDate(record['TRN_DT']);
    flat['VALUE_DT'] = tsToDate(record['VALUE_DT']);

    flat['TRN_CODE'] = safeStr(record['TRN_CODE']);
    flat['DRCR_IND'] = safeStr(record['DRCR_IND']);
    flat['TRN_DESC'] = safeStr(record['TRN_DESC']);

    // CORRECCIÓN NULL #5: entero largo → string con BigInt
    flat['EXTERNAL_REF_NO'] = safeExtRef(record['EXTERNAL_REF_NO']);

    flat['MODULE']          = safeStr(record['MODULE']);
    flat['TXN_TYPE']        = safeStr(record['TXN_TYPE']);
    flat['AC_ENTRY_SR_NO']  = safeStr(record['AC_ENTRY_SR_NO']);
    flat['CONTRACT_REF_NO'] = safeStr(record['CONTRACT_REF_NO']);
    flat['PRODUCT_CODE']    = safeStr(record['PRODUCT_CODE']);

    // ── Inicializar todas las columnas UDF descubiertas en '' ──
    // Garantiza que cada registro tenga TODAS las columnas aunque
    // para esa transacción el campo no exista.
    udfNamesOrdered.forEach(function (name) { flat[name] = ''; });

    // ── Poblar columnas UDF desde los pares CAMPO_X ────────────
    for (var i = 1; i <= MAX_CAMPOS; i++) {
      var rawName  = record['CAMPO_' + i + '_NAME'];
      var rawValue = record['CAMPO_' + i + '_VALUE'];

      // CORRECCIÓN NULL #1: omitir pares con NAME null/vacío
      if (rawName === null || rawName === undefined || String(rawName).trim() === '') continue;

      var colName = String(rawName).trim();

      // CORRECCIÓN NULL #2: VALUE null con NAME válido → string vacío
      // CORRECCIÓN NULL #6: floats .0 → entero string
      flat[colName] = safeStr(rawValue);
    }

    return flat;
  });

  // ── 6. DEFINICIÓN COMPLETA DE COLUMNAS (para tabla y Excel) ─
  var allColumns = FIXED_COLUMNS.concat(udfNamesOrdered);

  // ── 7. EXPONER GLOBALMENTE ───────────────────────────────────
  window.datosBancarios3Normalized = normalized;
  window.datosBancarios3Columns    = allColumns;
  window.datosBancarios3Count      = datosBancarios3.Count || normalized.length;

  console.info(
    '[pruebas3-utils] Normalización completa: ' +
    normalized.length + ' registros, ' +
    FIXED_COLUMNS.length + ' columnas fijas + ' +
    udfNamesOrdered.length + ' campos UDF dinámicos = ' +
    allColumns.length + ' columnas totales.'
  );

  // ── 8. EXPORTADOR A EXCEL (SheetJS) ─────────────────────────
  /**
   * Exporta los datos normalizados a .xlsx usando SheetJS (ya cargado en index.html).
   *
   * @param {Array}  [data]     - Subconjunto filtrado. Si no se pasa, usa todos.
   * @param {string} [filename] - Nombre del archivo sin extensión.
   */
  window.exportDatosBancarios3ToExcel = function (data, filename) {
    if (typeof XLSX === 'undefined') {
      alert('Error: la librería SheetJS (xlsx) no está cargada.');
      return;
    }

    var rows   = data || window.datosBancarios3Normalized;
    var cols   = window.datosBancarios3Columns;
    var fname  = (filename || 'extracto_bancarios3') + '.xlsx';

    if (!rows || rows.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    try {
      // ── Construir array de arrays (cabecera + filas) ──────────
      var sheetData = [cols]; // primera fila = encabezados

      rows.forEach(function (row) {
        var excelRow = cols.map(function (col) {
          var val = row[col];
          // Devolver string vacío como vacío real en Excel (no "")
          return (val === null || val === undefined) ? '' : val;
        });
        sheetData.push(excelRow);
      });

      // ── Crear worksheet y aplicar estilos mínimos ─────────────
      var ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Ancho automático basado en el contenido de cada columna
      var colWidths = cols.map(function (col, colIdx) {
        var maxLen = col.length; // mínimo = largo del encabezado
        rows.forEach(function (row) {
          var cellVal = String(row[col] || '');
          if (cellVal.length > maxLen) maxLen = cellVal.length;
        });
        return { wch: Math.min(maxLen + 2, 50) }; // máximo 50 caracteres
      });
      ws['!cols'] = colWidths;

      // Freeze primera fila (encabezados)
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };

      // ── Crear workbook y descargar ────────────────────────────
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
      XLSX.writeFile(wb, fname);

      console.info('[pruebas3-utils] Excel exportado: ' + fname + ' (' + rows.length + ' filas)');
    } catch (err) {
      console.error('[pruebas3-utils] Error al generar Excel:', err);
      alert('Error al generar el archivo Excel: ' + err.message);
    }
  };

})(); // IIFE — no contamina el scope global
