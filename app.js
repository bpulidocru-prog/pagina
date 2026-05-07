// ════ DATA ════════════════════════════════════════════════
let allTx = [
  { date:'Oct 24, 2023', time:'14:32:01', icon:'☁️', name:'Cloud Infrastructure - AWS', sub:'Software y Suscripciones', ref:'REF-92384-LX', amount:-12450, state:'completado' },
  { date:'Oct 23, 2023', time:'09:15:44', icon:'🏦', name:'Incoming Wire Transfer', sub:'Pago Cliente: Global Logistics Inc.', ref:'WT-882103-PL', amount:+84000, state:'completado' },
  { date:'Oct 22, 2023', time:'18:45:12', icon:'👥', name:'Monthly Payroll Disbursement', sub:'Transferencia Interna', ref:'PYRL-282310-A', amount:-145900, state:'pendiente' },
  { date:'Oct 21, 2023', time:'12:10:00', icon:'🏢', name:'Office Lease - Tower Plaza', sub:'Gasto de Operaciones', ref:'RENT-TX-4491', amount:-24000, state:'completado' },
  { date:'Oct 20, 2023', time:'08:22:30', icon:'→', name:'Transferencia a Proveedor: Claro SA', sub:'Telecomunicaciones', ref:'TRF-10291-CL', amount:-3200, state:'completado' },
  { date:'Oct 19, 2023', time:'16:55:09', icon:'💰', name:'Cobro Factura: Retail Partners', sub:'Cuentas por Cobrar', ref:'INV-2023-441', amount:+22500, state:'completado' },
  { date:'Oct 18, 2023', time:'11:00:00', icon:'📦', name:'Compra Inventario: Global Supply', sub:'Compras', ref:'PO-3381-GS', amount:-67000, state:'pendiente' },
  { date:'Oct 17, 2023', time:'09:30:00', icon:'🔁', name:'Transferencia Interna: Cta Ahorros', sub:'Movimiento Interno', ref:'INT-881-XX', amount:+15000, state:'completado' },
];

let approvalsData = [
  { initials:'ST', name:'Starling Technologies S.A.', sub:'Cloud Infrastructure - Inv #40922', cat:'PROVEEDORES', amount:12450, currency:'USD', date:'Oct 24, 2023', state:'pendiente' },
  { initials:'NA', name:'National Tax Authority', sub:'Corporate Income Tax - Ref: 991823', cat:'IMPUESTOS', amount:482900, currency:'COP', date:'Oct 23, 2023', state:'pendiente' },
  { initials:'LW', name:'Logistics World Co.', sub:'Fuel Surcharge - Inv #A-112', cat:'PROVEEDORES', amount:3150, currency:'USD', date:'Oct 22, 2023', state:'rechazado', note:'Archivo Adjunto Faltante' },
  { initials:'PD', name:'PetroFlow Distribución', sub:'Supply Agreement Q4 - Ref #2291', cat:'PROVEEDORES', amount:89000, currency:'USD', date:'Oct 21, 2023', state:'pendiente' },
];

const excelKeys = ['TRN_DT','TRN_DESC','TRN_REF_NO','LCY_AMOUNT','DRCR_IND'];

const MONTH_MAP = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
  ene:0, feb:1, mar:2, abr:3, may:4, jun:5, jul:6, ago:7, sep:8, oct:9, nov:10, dic:11
};

function normalizeKey(key) {
  return (key || '').toString().trim().toUpperCase();
}

function normalizeInitialTransactionDates() {
  allTx = allTx.map(tx => ({ ...tx, rawDate: parseDateValue(tx.date) }));
}

normalizeInitialTransactionDates();

function findCellValue(row, targetKey) {
  if (row[targetKey] !== undefined) return row[targetKey];
  const foundKey = Object.keys(row).find(k => normalizeKey(k) === targetKey);
  return foundKey ? row[foundKey] : '';
}

function parseExcelSerialDate(value) {
  if (typeof value !== 'number' || isNaN(value) || value <= 0) return null;
  if (typeof XLSX !== 'undefined' && XLSX.SSF && typeof XLSX.SSF.parse_date_code === 'function') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
  }
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const msPerDay = 24 * 60 * 60 * 1000;
  return new Date(epoch.getTime() + (value * msPerDay));
}

function parseDateString(text) {
  const cleanText = String(text || '').trim();
  if (!cleanText) return null;

  const isoMatch = cleanText.match(/^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/);
  if (isoMatch) {
    return new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00`);
  }

  const monthDayYearMatch = cleanText.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);
  if (monthDayYearMatch) {
    const month = MONTH_MAP[monthDayYearMatch[1].toLowerCase().slice(0, 3)];
    const day = Number(monthDayYearMatch[2]);
    const year = Number(monthDayYearMatch[3]);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  const dayMonthYearMatch = cleanText.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (dayMonthYearMatch) {
    const day = Number(dayMonthYearMatch[1]);
    const month = MONTH_MAP[dayMonthYearMatch[2].toLowerCase().slice(0, 3)];
    const year = Number(dayMonthYearMatch[3]);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  const numericDateMatch = cleanText.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (numericDateMatch) {
    const part1 = Number(numericDateMatch[1]);
    const part2 = Number(numericDateMatch[2]);
    const part3 = Number(numericDateMatch[3]);
    if (part3 > 31) {
      return new Date(part3, part2 - 1, part1);
    }
  }

  const date = new Date(cleanText);
  return !isNaN(date) ? date : null;
}

function parseDateValue(value) {
  if (value instanceof Date && !isNaN(value)) return value;
  const numberRaw = typeof value === 'number' ? value : Number(String(value || '').replace(/[^0-9.-]+/g, ''));
  if (!isNaN(numberRaw) && numberRaw > 0 && numberRaw < 60000) {
    const serialDate = parseExcelSerialDate(numberRaw);
    if (serialDate && !isNaN(serialDate)) return serialDate;
  }
  return parseDateString(value);
}

function formatExcelDate(value) {
  const parsed = parseDateValue(value);
  if (parsed) {
    return parsed.toLocaleDateString('es-CO', { year:'numeric', month:'short', day:'2-digit' });
  }
  return String(value || '').trim();
}

function parseExcelAmount(value, drcr) {
  const amount = parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
  const normalized = String(drcr || '').trim().toUpperCase();
  const isDebit = normalized === 'D' || normalized === 'DR' || normalized === 'DEBIT' || normalized === 'DB';
  if (isNaN(amount)) return 0;
  return isDebit ? -Math.abs(amount) : Math.abs(amount);
}

// ════ JSON DATA INGESTION & MODAL ═════════════════════════
let currentPage = 1;
const PAGE_SIZE = 30;

function initJsonData() {
  if (typeof window.datosBancarios3Normalized !== 'undefined' && window.datosBancarios3Normalized.length > 0) {
    allTx = window.datosBancarios3Normalized.map((tx, index) => {
      // Mocking monto since it's not present in fixed columns
      // Using a deterministic mock based on index to avoid flicker
      let fallbackMonto = ((index * 73) % 50000) + 1000;
      const monto = Number(tx.LCY_AMOUNT || tx.MONTO || fallbackMonto);
      return {
        date: tx.TRN_DT || '',
        origen: String(tx.CUENTA || ''),
        destino: tx.EXTERNAL_REF_NO || tx.LLAVE_DEST || 'Desconocido',
        ref: tx.TRN_REF_NO || '',
        name: tx.TRN_DESC || '',
        nature: tx.DRCR_IND || 'D',
        monto: monto,
        udf: tx.UDFCATEGORIA || tx.TRN_DESC || 'General',
        amount: tx.DRCR_IND === 'D' ? -Math.abs(monto) : Math.abs(monto),
        state: 'completado',
        icon: tx.DRCR_IND === 'D' ? '↘️' : '↗️',
        raw: tx
      };
    });
  } else if (typeof window.datosBancarios !== 'undefined' && window.datosBancarios.length > 0) {
    // Fallback if pruebas3-utils is not loaded yet
    allTx = window.datosBancarios.map(tx => {
      return {
        date: tx.FECHA_TRANSACCION,
        origen: String(tx.CUENTA_ORIGEN || ''),
        destino: tx.CUENTA_DESTINO,
        ref: tx.TRN_REF_NO,
        name: tx.DESCRIPCION,
        nature: tx.NATURALEZA,
        monto: tx.MONTO,
        udf: tx.UDF,
        amount: tx.NATURALEZA === 'D' ? -Math.abs(tx.MONTO) : Math.abs(tx.MONTO),
        state: 'completado',
        icon: tx.NATURALEZA === 'D' ? '↘️' : '↗️',
        raw: tx
      };
    });
  } else {
    return;
  }

  // Renderizar dashboard de saldos
  if (typeof window.renderSaldosDashboard === 'function') {
    window.renderSaldosDashboard();
  }
  
  if (typeof window.renderCDTTable === 'function') {
    window.renderCDTTable();
  }
}

function openTxModal(ref) {
  const tx = allTx.find(t => t.ref === ref);
  if (!tx) return;
  const content = document.getElementById('modal-body-content');
  if (!content) return;
  
  let html = '';
  // Show details nicely extracted from raw
  for (const [key, value] of Object.entries(tx.raw)) {
    let displayValue = (value === null || value === undefined) ? '-' : value;
    if (key === 'MONTO') displayValue = `$${Number(displayValue).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    html += `
      <div class="detail-row">
        <div class="detail-label">${key}</div>
        <div class="detail-value">${displayValue}</div>
      </div>
    `;
  }
  content.innerHTML = html;
  
  const modal = document.getElementById('tx-modal-overlay');
  if (modal) modal.classList.add('active');
}

function closeTxModal() {
  const modal = document.getElementById('tx-modal-overlay');
  if (modal) modal.classList.remove('active');
}


// ════ DASHBOARD SALDOS CONSOLIDADOS ═══════════════════════
let saldosChartInstance = null;
let naturalezaChartInstance = null;
let destinoChartInstance = null;
let fechasChartInstance = null;
let udfChartInstance = null;
let frecuenciaChartInstance = null;

window.renderSaldosDashboard = function() {
  if (!allTx || allTx.length === 0) return;

  // 1. Poblar select de Descripciones (se usa en Gráfico 1 y 6)
  const descripcionesUnicas = [...new Set(allTx.map(tx => tx.name))].filter(Boolean).sort();
  const cuentasUnicas = [...new Set(allTx.map(tx => tx.origen))].filter(Boolean).sort();

  const descFilter = document.getElementById('dash-desc-filter');
  const freqDescFilter = document.getElementById('dash-freq-desc-filter');
  if (descFilter && descFilter.options.length <= 1) {
    let html = '<option value="all">Todas</option>';
    descripcionesUnicas.forEach(desc => html += `<option value="${desc}">${desc}</option>`);
    descFilter.innerHTML = html;
    if (freqDescFilter) freqDescFilter.innerHTML = html;
  }

  // 2. Poblar select de Cuentas (se usa en Gráfico 2 y 4)
  const accFilter = document.getElementById('dash-account-filter');
  const dateAccFilter = document.getElementById('dash-date-account-filter');
  if (accFilter && accFilter.options.length <= 1) {
    let html = '<option value="all">Cuentas</option>';
    cuentasUnicas.forEach(cta => html += `<option value="${cta}">${cta}</option>`);
    accFilter.innerHTML = html;
    if (dateAccFilter) dateAccFilter.innerHTML = '<option value="all">Todas las Cuentas</option>' + cuentasUnicas.map(cta => `<option value="${cta}">${cta}</option>`).join('');
  }

  updateChartSaldos();
  updateChartNaturaleza();
  updateChartDestinos();
  updateChartFechas();
  updateChartUdf();
  updateChartFrecuencia();
};

window.updateChartSaldos = function() {
  if (!allTx || allTx.length === 0) return;
  const descFilter = document.getElementById('dash-desc-filter');
  const selectedDesc = descFilter ? descFilter.value : 'all';
  let txSaldos = allTx;
  if (selectedDesc !== 'all') {
    txSaldos = allTx.filter(tx => tx.name === selectedDesc);
  }

  const montosPorCuenta = {};
  txSaldos.forEach(tx => {
    const cta = tx.origen || 'Desconocida';
    if (!montosPorCuenta[cta]) montosPorCuenta[cta] = 0;
    montosPorCuenta[cta] += Math.abs(tx.monto);
  });

  const cuentasLabels = Object.keys(montosPorCuenta);
  const cuentasDatos = Object.values(montosPorCuenta);

  const ctxSaldos = document.getElementById('saldosChart');
  if (ctxSaldos) {
    if (saldosChartInstance) saldosChartInstance.destroy();
    const isDark = document.documentElement.classList.contains('theme-dark');
    const textColor = isDark ? '#f8fafc' : '#1e293b';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    saldosChartInstance = new Chart(ctxSaldos, {
      type: 'bar',
      data: {
        labels: cuentasLabels,
        datasets: [{
          label: 'Volumen Total ($)',
          data: cuentasDatos,
          backgroundColor: 'rgba(0, 114, 188, 0.8)',
          borderColor: 'rgba(0, 114, 188, 1)',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return '$' + context.raw.toLocaleString('en-US', { minimumFractionDigits: 2 });
              }
            }
          }
        },
        scales: {
          y: { ticks: { color: textColor }, grid: { color: gridColor } },
          x: { ticks: { color: textColor }, grid: { display: false } }
        }
      }
    });
  }
};

window.updateChartNaturaleza = function() {
  if (!allTx || allTx.length === 0) return;
  const accFilter = document.getElementById('dash-account-filter');
  const selectedAcc = accFilter ? accFilter.value : 'all';
  let txNaturaleza = allTx;
  if (selectedAcc !== 'all') {
    txNaturaleza = allTx.filter(tx => tx.origen === selectedAcc);
  }

  const naturalezaObj = { Débitos: 0, Créditos: 0 };
  txNaturaleza.forEach(tx => {
    if (tx.nature === 'D') naturalezaObj['Débitos'] += Math.abs(tx.monto);
    else naturalezaObj['Créditos'] += Math.abs(tx.monto);
  });

  const ctxNaturaleza = document.getElementById('naturalezaChart');
  if (ctxNaturaleza) {
    if (naturalezaChartInstance) naturalezaChartInstance.destroy();
    const isDark = document.documentElement.classList.contains('theme-dark');
    const textColor = isDark ? '#f8fafc' : '#1e293b';

    naturalezaChartInstance = new Chart(ctxNaturaleza, {
      type: 'doughnut',
      data: {
        labels: ['Débitos', 'Créditos'],
        datasets: [{
          data: [naturalezaObj['Débitos'], naturalezaObj['Créditos']],
          backgroundColor: ['#e8a020', '#3ecf8e'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, padding: 20 } },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ' $' + context.raw.toLocaleString('en-US', { minimumFractionDigits: 2 });
              }
            }
          }
        }
      }
    });
  }
};

window.updateChartDestinos = function() {
  if (!allTx || allTx.length === 0) return;
  const natureFilter = document.getElementById('dash-nature-filter');
  const selectedNature = natureFilter ? natureFilter.value : 'all';
  let txDestinos = allTx;
  if (selectedNature !== 'all') {
    txDestinos = allTx.filter(tx => tx.nature === selectedNature);
  }

  const montosPorDestino = {};
  txDestinos.forEach(tx => {
    const dest = tx.destino || 'Desconocida';
    if (!montosPorDestino[dest]) montosPorDestino[dest] = 0;
    montosPorDestino[dest] += Math.abs(tx.monto);
  });

  const topDestinos = Object.entries(montosPorDestino)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const destLabels = topDestinos.map(item => item[0]);
  const destDatos = topDestinos.map(item => item[1]);

  const ctxDestino = document.getElementById('destinoChart');
  if (ctxDestino) {
    if (destinoChartInstance) destinoChartInstance.destroy();
    const isDark = document.documentElement.classList.contains('theme-dark');
    const textColor = isDark ? '#f8fafc' : '#1e293b';

    destinoChartInstance = new Chart(ctxDestino, {
      type: 'pie',
      data: {
        labels: destLabels,
        datasets: [{
          data: destDatos,
          backgroundColor: ['#0072bc', '#1a2e5a', '#29abe2', '#3ecf8e', '#e8a020'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: textColor, boxWidth: 12, padding: 15 } },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ' $' + context.raw.toLocaleString('en-US', { minimumFractionDigits: 2 });
              }
            }
          }
        }
      }
    });
  }
};

window.updateChartFechas = function() {
  if (!allTx || allTx.length === 0) return;
  const dateAccFilterEl = document.getElementById('dash-date-account-filter');
  const selectedDateAcc = dateAccFilterEl ? dateAccFilterEl.value : 'all';
  let txFechas = allTx;
  if (selectedDateAcc !== 'all') {
    txFechas = allTx.filter(tx => tx.origen === selectedDateAcc);
  }
  
  const montosPorFecha = {};
  txFechas.forEach(tx => {
    const fecha = tx.date || 'Sin Fecha';
    if (!montosPorFecha[fecha]) montosPorFecha[fecha] = 0;
    montosPorFecha[fecha] += Math.abs(tx.monto);
  });
  
  const sortedFechas = Object.keys(montosPorFecha).sort((a, b) => {
    const pA = a.split('/');
    const pB = b.split('/');
    if(pA.length===3 && pB.length===3) {
      return new Date(pA[2], pA[1]-1, pA[0]) - new Date(pB[2], pB[1]-1, pB[0]);
    }
    return a.localeCompare(b);
  });
  const fechasDatos = sortedFechas.map(f => montosPorFecha[f]);

  const ctxFechas = document.getElementById('fechasChart');
  if (ctxFechas) {
    if (fechasChartInstance) fechasChartInstance.destroy();
    const isDark = document.documentElement.classList.contains('theme-dark');
    const textColor = isDark ? '#f8fafc' : '#1e293b';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    fechasChartInstance = new Chart(ctxFechas, {
      type: 'line',
      data: {
        labels: sortedFechas,
        datasets: [{
          label: 'Volumen ($)',
          data: fechasDatos,
          borderColor: '#0072bc',
          backgroundColor: 'rgba(0, 114, 188, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#1a2e5a',
          pointRadius: 3,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return '$' + context.raw.toLocaleString('en-US', { minimumFractionDigits: 2 });
              }
            }
          }
        },
        scales: {
          y: { ticks: { color: textColor }, grid: { color: gridColor } },
          x: { ticks: { color: textColor }, grid: { display: false } }
        }
      }
    });
  }
};

window.updateChartUdf = function() {
  if (!allTx || allTx.length === 0) return;
  const udfNatureFilter = document.getElementById('dash-udf-nature-filter');
  const selectedUdfNature = udfNatureFilter ? udfNatureFilter.value : 'all';
  let txUdf = allTx;
  if (selectedUdfNature !== 'all') {
    txUdf = allTx.filter(tx => tx.nature === selectedUdfNature);
  }

  const montosPorUdf = {};
  txUdf.forEach(tx => {
    const udf = tx.udf || 'Sin Categoría';
    if (!montosPorUdf[udf]) montosPorUdf[udf] = 0;
    montosPorUdf[udf] += Math.abs(tx.monto);
  });

  const udfLabels = Object.keys(montosPorUdf);
  const udfDatos = Object.values(montosPorUdf);

  const ctxUdf = document.getElementById('udfChart');
  if (ctxUdf) {
    if (udfChartInstance) udfChartInstance.destroy();
    const isDark = document.documentElement.classList.contains('theme-dark');
    const textColor = isDark ? '#f8fafc' : '#1e293b';

    udfChartInstance = new Chart(ctxUdf, {
      type: 'polarArea',
      data: {
        labels: udfLabels,
        datasets: [{
          data: udfDatos,
          backgroundColor: [
            'rgba(0, 114, 188, 0.7)',
            'rgba(26, 46, 90, 0.7)',
            'rgba(41, 171, 226, 0.7)',
            'rgba(62, 207, 142, 0.7)',
            'rgba(232, 160, 32, 0.7)',
            'rgba(156, 39, 176, 0.7)'
          ],
          borderWidth: 1,
          borderColor: isDark ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: textColor, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ' $' + context.raw.toLocaleString('en-US', { minimumFractionDigits: 2 });
              }
            }
          }
        },
        scales: {
          r: {
            ticks: { display: false },
            grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
          }
        }
      }
    });
  }
};

window.updateChartFrecuencia = function() {
  if (!allTx || allTx.length === 0) return;
  const freqDescFilterEl = document.getElementById('dash-freq-desc-filter');
  const selectedFreqDesc = freqDescFilterEl ? freqDescFilterEl.value : 'all';
  let txFreq = allTx;
  if (selectedFreqDesc !== 'all') {
    txFreq = allTx.filter(tx => tx.name === selectedFreqDesc);
  }

  const freqPorCuenta = {};
  txFreq.forEach(tx => {
    const cta = tx.origen || 'Desconocida';
    if (!freqPorCuenta[cta]) freqPorCuenta[cta] = 0;
    freqPorCuenta[cta] += 1;
  });

  const freqLabels = Object.keys(freqPorCuenta);
  const freqDatos = Object.values(freqPorCuenta);

  const ctxFreq = document.getElementById('frecuenciaChart');
  if (ctxFreq) {
    if (frecuenciaChartInstance) frecuenciaChartInstance.destroy();
    const isDark = document.documentElement.classList.contains('theme-dark');
    const textColor = isDark ? '#f8fafc' : '#1e293b';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    frecuenciaChartInstance = new Chart(ctxFreq, {
      type: 'bar',
      data: {
        labels: freqLabels,
        datasets: [{
          label: 'Cantidad de Ops.',
          data: freqDatos,
          backgroundColor: 'rgba(62, 207, 142, 0.8)',
          borderColor: 'rgba(62, 207, 142, 1)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ' ' + context.raw + ' ops';
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { display: false } }
        }
      }
    });
  }
};
// ════ TRANSACTIONS ════════════════════════════════════════
function updateBalanceDisplay(txList = allTx) {
  const balanceEl = document.getElementById('excel-balance');
  const inEl = document.getElementById('excel-in');
  const outEl = document.getElementById('excel-out');
  const barIn = document.getElementById('bar-in');
  const barOut = document.getElementById('bar-out');
  if (!balanceEl) return;
  const totalIn = txList.reduce((sum, tx) => sum + (tx.amount > 0 ? Number(tx.amount) : 0), 0);
  const totalOut = txList.reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(Number(tx.amount)) : 0), 0);
  const net = totalIn - totalOut;
  balanceEl.textContent = net.toLocaleString('en-US', { minimumFractionDigits: 2 });
  balanceEl.style.color = net >= 0 ? 'var(--green)' : 'var(--gold)';
  if (inEl) inEl.textContent = `$${totalIn.toLocaleString('en-US',{minimumFractionDigits:2})}`;
  if (outEl) outEl.textContent = `$${totalOut.toLocaleString('en-US',{minimumFractionDigits:2})}`;
  const totalFlow = totalIn + totalOut || 1;
  if (barIn) barIn.style.width = `${Math.round((totalIn / totalFlow) * 100)}%`;
  if (barOut) barOut.style.width = `${Math.round((totalOut / totalFlow) * 100)}%`;
}

function parseTransactionDate(tx) {
  if (tx.rawDate instanceof Date && !isNaN(tx.rawDate)) return tx.rawDate;
  if (typeof tx.date === 'string') {
    return parseDateValue(tx.date);
  }
  return null;
}

function renderTransactions(page = 1) {
  currentPage = page;

  const filter = document.getElementById('status-filter')?.value||'all';
  const accFilter = document.getElementById('account-filter')?.value||'all';
  const amtFilter = document.getElementById('amount-filter')?.value||'all';
  
  const fromValue = document.getElementById('date-from')?.value;
  const toValue = document.getElementById('date-to')?.value;
  const fromDate = fromValue ? new Date(fromValue) : null;
  const toDate = toValue ? new Date(toValue) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  let filtered = allTx.filter(tx => {
    if (filter !== 'all' && tx.state !== filter) return false;
    if (accFilter !== 'all' && tx.origen !== accFilter) return false;
    if (amtFilter !== 'all') {
      const minAmount = Number(amtFilter);
      if (Math.abs(tx.amount) <= minAmount) return false;
    }
    
    if (fromDate || toDate) {
      const txDate = parseTransactionDate(tx);
      if (txDate) {
        if (fromDate && txDate < fromDate) return false;
        if (toDate && txDate > toDate) return false;
      }
    }
    return true;
  });

  const txCountDiv = document.getElementById('tx-count');
  if (txCountDiv) txCountDiv.textContent = `MOSTRANDO ${Math.min(PAGE_SIZE, filtered.length)} DE ${filtered.length} MOVIMIENTOS`;
  updateBalanceDisplay(filtered);

  const totalMatches = filtered.length;
  
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const tbodyEl = document.getElementById('tx-tbody');
  if (!tbodyEl) return; // El Libro 1 ya no existe en el HTML

  tbodyEl.innerHTML = paginated.map(tx=>`
    <tr>
      <td style="font-size:12.5px;font-weight:500;white-space:nowrap">${tx.date}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11.5px">${tx.origen}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11.5px">${tx.destino}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11.5px;color:var(--text-muted)">${tx.ref}</td>
      <td><div class="tx-name" style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${tx.name}">${tx.name}</div></td>
      <td><span class="badge ${tx.nature==='D'?'badge-gold':'badge-teal'}">${tx.nature==='D'?'DÉBITO':'CRÉDITO'}</span></td>
      <td style="text-align:right"><button class="btn btn-ghost" style="padding:5px 12px;font-size:11px" onclick="openTxModal('${tx.ref}')">Ver</button></td>
    </tr>`).join('');

  renderPagination(totalMatches);
}

function renderPagination(totalMatches) {
  const container = document.getElementById('tx-pagination');
  if (!container) return;
  if (totalMatches === 0) {
    container.innerHTML = '';
    return;
  }
  const totalPages = Math.ceil(totalMatches / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  
  let html = `<span class="page-info">Página ${currentPage} de ${totalPages}</span><div class="page-btns">`;
  
  if (currentPage > 1) {
    html += `<div class="page-btn" onclick="renderTransactions(${currentPage - 1})">‹</div>`;
  } else {
    html += `<div class="page-btn" style="opacity:.4">‹</div>`;
  }
  
  let startP = Math.max(1, currentPage - 2);
  let endP = Math.min(totalPages, currentPage + 2);
  
  if (startP > 1) {
    html += `<div class="page-btn" onclick="renderTransactions(1)">1</div>`;
    if (startP > 2) html += `<div class="page-btn" style="pointer-events:none;opacity:0.5;background:transparent;border-color:transparent">…</div>`;
  }
  
  for (let p = startP; p <= endP; p++) {
    html += `<div class="page-btn ${p === currentPage ? 'active' : ''}" onclick="renderTransactions(${p})">${p}</div>`;
  }
  
  if (endP < totalPages) {
    if (endP < totalPages - 1) html += `<div class="page-btn" style="pointer-events:none;opacity:0.5;background:transparent;border-color:transparent">…</div>`;
    html += `<div class="page-btn" onclick="renderTransactions(${totalPages})">${totalPages}</div>`;
  }
  
  if (currentPage < totalPages) {
    html += `<div class="page-btn" onclick="renderTransactions(${currentPage + 1})">›</div>`;
  } else {
    html += `<div class="page-btn" style="opacity:.4">›</div>`;
  }
  
  html += `</div>`;
  container.innerHTML = html;
}

// ════ FLUJO CHARTS ════════════════════════════════════════

// ════ TOAST ═══════════════════════════════════════════════
let toastTimer = null;
function showToast(msg, icon='✅') {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-icon').textContent = icon;
  t.classList.add('show');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2800);
}

// ════ PRODUCT CAROUSEL ════════════════════════════════════
let productList = [];
let currentProductIndex = 0;

async function initProductData() {
  if (typeof window.datosProductos !== 'undefined' && window.datosProductos.length > 0) {
    productList = window.datosProductos;
    renderProductCarousel();
  } else {
    showToast('No se encontró datosdos.js o está vacío', '⚠️');
  }
}

function renderProductCarousel() {
  if (!productList.length) return;
  const p = productList[currentProductIndex];
  
  const isActiva = p.Estado === 'ACTIVA';
  const stateHtml = isActiva ? `<span style="color:var(--green)">🟢 ACTIVA</span>` : `<span style="color:var(--red)">🔴 INACTIVA</span>`;
  
  const prevDateSaldo = p[" Saldo_dia_Anterior "] || 0;
  const diff = p.Saldo_Actual - prevDateSaldo;
  const diffPct = prevDateSaldo ? ((diff / prevDateSaldo) * 100).toFixed(2) : '0.00';
  const diffColor = diff >= 0 ? 'var(--green)' : 'var(--red)';
  const diffText = diff >= 0 ? `+${diffPct}% vs ayer` : `${diffPct}% vs ayer`;
  
  const formattedSaldo = p.Saldo_Actual.toLocaleString('en-US',{minimumFractionDigits:2});
  
  const container = document.getElementById('product-content');
  if (container) {
    container.style.opacity = '0';
    setTimeout(() => {
      container.innerHTML = `
        <div class="kpi-label" style="color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:8px">
           CUENTA DE ${p.Tipo_Cuenta.toUpperCase()}
           <div style="font-size:10px;padding:2px 6px;border:1px solid rgba(255,255,255,0.3);border-radius:10px;background:rgba(255,255,255,0.1)">${currentProductIndex + 1}/${productList.length}</div>
        </div>
        <div class="kpi-amount" style="margin:6px 0"><span>$</span>${formattedSaldo}</div>
        <div class="account-meta">
          <div><div class="account-meta-label">Número de Cuenta</div><div class="account-meta-value" style="font-family:'DM Mono',monospace;font-size:14px">${p.Cuenta}</div></div>
          <div><div class="account-meta-label">Estado</div><div class="account-meta-value" style="font-weight:700">${stateHtml}</div></div>
          <div><div class="account-meta-label">Variación</div><div class="account-meta-value" style="color:${diffColor};font-weight:600">${diffText}</div></div>
        </div>
      `;
      container.style.opacity = '1';
    }, 150);
  }
}

function nextProduct() {
  if (!productList.length) return;
  currentProductIndex = (currentProductIndex + 1) % productList.length;
  renderProductCarousel();
}

function prevProduct() {
  if (!productList.length) return;
  currentProductIndex = (currentProductIndex - 1 + productList.length) % productList.length;
  renderProductCarousel();
}

// ════ INIT ════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search-input').addEventListener('keyup', e=>{
    if(e.key==='Enter' && e.target.value) { showToast(`Buscando: "${e.target.value}"`, '🔍'); e.target.value=''; }
  });
  initJsonData();
  initProductData();
  initTheme();
});

// ════ THEME TOGGLE ════════════════════════════════════════
function initTheme() {
  const isDark = document.documentElement.classList.contains('theme-dark');
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  if (iconSun && iconMoon) {
    if (isDark) {
      iconMoon.style.display = 'none';
      iconSun.style.display = 'block';
    } else {
      iconSun.style.display = 'none';
      iconMoon.style.display = 'block';
    }
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('theme-dark');
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  
  if (isDark) {
    localStorage.setItem('bdoTheme', 'dark');
    if (iconSun && iconMoon) {
      iconMoon.style.display = 'none';
      iconSun.style.display = 'block';
    }
  } else {
    localStorage.setItem('bdoTheme', 'light');
    if (iconSun && iconMoon) {
      iconSun.style.display = 'none';
      iconMoon.style.display = 'block';
    }
  }
}

// ════ NAVEGACIÓN ENTRE PÁGINAS ════════════════════════════
function navigate(page) {
  ['home', 'cuentas', 'cdt'].forEach(p => {
    const main = document.getElementById('page-' + p);
    if (main) main.classList.remove('active');
    const nav = document.getElementById('nav-' + p);
    if (nav) nav.classList.remove('active');
  });
  const targetMain = document.getElementById('page-' + page);
  const targetNav = document.getElementById('nav-' + page);
  if (targetMain) targetMain.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  // Si navegamos a un sub-item (cuentas/cdt), expandir el grupo automáticamente
  const movGroup = document.getElementById('nav-group-movimientos');
  if (movGroup) {
    if (page === 'cuentas' || page === 'cdt') {
      movGroup.classList.add('open');
    }
    // Si vamos a home, NO colapsamos automáticamente (deja la decisión al usuario)
  }

  // Si navegamos a HOME, refrescar los datos consolidados
  if (page === 'home' && typeof renderHomePage === 'function') {
    renderHomePage();
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
}

// Toggle del menú desplegable del sidebar
function toggleNavGroup(name) {
  const group = document.getElementById('nav-group-' + name);
  if (group) group.classList.toggle('open');
}


// ════════════════════════════════════════════════════════════
// LIBRO DE TRANSACCIONES 2 (pruebas2.js) — DINÁMICO
// ════════════════════════════════════════════════════════════
let allTx2 = [];
let filteredTx2 = [];
let currentPage2 = 1;

// Definición de las 7 columnas configurables (sin contar Acción)
// Cada columna define cómo se renderiza una celda a partir del registro raw
const TX2_COLUMNS_DEFAULT = [
  {
    id: 'fecha',
    label: 'Fecha',
    width: '90px',
    align: 'left',
    render: (tx) => {
      let f = '';
      if (typeof tx.TRN_DT === 'number') {
        const parsed = parseDateValue(tx.TRN_DT);
        if (parsed) {
          const dd = String(parsed.getDate()).padStart(2, '0');
          const mm = String(parsed.getMonth() + 1).padStart(2, '0');
          const yyyy = parsed.getFullYear();
          f = `${dd}/${mm}/${yyyy}`;
        }
      }
      return `<td style="font-size:12.5px;font-weight:600;font-family:'DM Mono',monospace;white-space:nowrap">${f || '—'}</td>`;
    }
  },
  {
    id: 'cuenta',
    label: 'Cuenta',
    width: '110px',
    align: 'left',
    render: (tx) => `<td style="font-family:'DM Mono',monospace;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${tx.AC_NO || '—'}</td>`
  },
  {
    id: 'refExterna',
    label: 'Ref. Externa',
    width: '150px',
    align: 'left',
    render: (tx) => {
      const v = tx.EXTERNAL_REF_NO || '—';
      return `<td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${v}">${v}</td>`;
    }
  },
  {
    id: 'nRef',
    label: 'N° Referencia',
    width: '160px',
    align: 'left',
    render: (tx) => {
      const v = tx.TRN_REF_NO || '—';
      return `<td style="font-family:'DM Mono',monospace;font-size:11.5px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${v}">${v}</td>`;
    }
  },
  {
    id: 'descripcion',
    label: 'Descripción',
    width: 'auto',
    align: 'left',
    render: (tx) => {
      const v = tx.TRN_DESC || '—';
      return `<td><div class="tx-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${v}">${v}</div></td>`;
    }
  },
  {
    id: 'naturaleza',
    label: 'Naturaleza',
    width: '100px',
    align: 'left',
    render: (tx) => {
      const isD = tx.DRCR_IND === 'D';
      return `<td><span class="badge ${isD ? 'badge-gold' : 'badge-teal'}">${isD ? 'DÉBITO' : 'CRÉDITO'}</span></td>`;
    }
  },
  {
    id: 'monto',
    label: 'Monto',
    width: '120px',
    align: 'right',
    render: (tx) => {
      const monto = Number(tx.LCY_AMOUNT) || 0;
      const isD = tx.DRCR_IND === 'D';
      const color = isD ? 'var(--gold)' : 'var(--green)';
      const str = '$' + Math.abs(monto).toLocaleString('en-US', { minimumFractionDigits: 2 });
      return `<td style="text-align:right;font-family:'DM Mono',monospace;font-weight:600;color:${color};white-space:nowrap">${str}</td>`;
    }
  }
];

// Estado de columnas: copia mutable que el usuario puede reordenar y desactivar
let tx2Columns = TX2_COLUMNS_DEFAULT.map(c => ({ ...c, visible: true }));

function initJsonData2() {
  if (typeof window.datosBancarios2 === 'undefined' || !window.datosBancarios2.length) {
    const tbody = document.getElementById('tx2-tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px">No hay datos disponibles. Verifique que pruebas2.js esté cargado correctamente.</td></tr>';
    }
    const countEl = document.getElementById('tx2-count');
    if (countEl) countEl.textContent = 'SIN DATOS';
    return;
  }

  // Mantenemos referencia al raw + alias compatibles para exportadores
  allTx2 = window.datosBancarios2.map(tx => {
    const monto = Number(tx.LCY_AMOUNT) || 0;
    const naturaleza = tx.DRCR_IND || '';
    let fechaFormateada = '';
    let dateObj = null;
    if (typeof tx.TRN_DT === 'number') {
      dateObj = parseDateValue(tx.TRN_DT);
      if (dateObj) {
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = dateObj.getFullYear();
        fechaFormateada = `${dd}/${mm}/${yyyy}`;
      }
    }
    return {
      // alias para compatibilidad con exportadores
      date: fechaFormateada,
      dateObj: dateObj,
      origen: String(tx.AC_NO || ''),
      destino: String(tx.EXTERNAL_REF_NO || tx.LLAVE_DEST || '—'),
      ref: tx.TRN_REF_NO || '',
      name: tx.TRN_DESC || '',
      nature: naturaleza,
      monto: monto,
      amount: naturaleza === 'D' ? -Math.abs(monto) : Math.abs(monto),
      state: 'completado',
      raw: tx
    };
  });

  // Inicializar lista filtrada y populate filters
  filteredTx2 = [...allTx2];
  initFilters2();
  renderTable2();
}

function renderTable2() {
  const colgroup = document.getElementById('tx2-colgroup');
  const thead = document.getElementById('tx2-thead');
  if (!colgroup || !thead) return;

  // Construir colgroup
  const visibleCols = tx2Columns.filter(c => c.visible);
  let colHtml = '';
  visibleCols.forEach(c => {
    colHtml += `<col style="width:${c.width}">`;
  });
  // Columna Acción siempre al final
  colHtml += `<col style="width:70px">`;
  colgroup.innerHTML = colHtml;

  // Construir thead
  let thHtml = '<tr>';
  visibleCols.forEach(c => {
    thHtml += `<th style="text-align:${c.align}">${c.label}</th>`;
  });
  thHtml += `<th style="text-align:right">Acción</th></tr>`;
  thead.innerHTML = thHtml;

  // Calcular min-width dinámico
  const table = document.getElementById('tx2-table');
  if (table) {
    let totalWidth = 70; // acción
    visibleCols.forEach(c => {
      const w = parseInt(c.width) || 150;
      totalWidth += w;
    });
    table.style.minWidth = totalWidth + 'px';
  }

  renderTransactions2(currentPage2);
}

function renderTransactions2(page = 1) {
  currentPage2 = page;

  const dataSource = filteredTx2.length > 0 || allTx2.length === 0 ? filteredTx2 : filteredTx2;
  const totalRecords = filteredTx2.length;

  const tx2CountDiv = document.getElementById('tx2-count');
  if (tx2CountDiv) {
    if (totalRecords === allTx2.length) {
      tx2CountDiv.textContent = `MOSTRANDO ${Math.min(PAGE_SIZE, totalRecords)} DE ${totalRecords} MOVIMIENTOS`;
    } else {
      tx2CountDiv.textContent = `${totalRecords} DE ${allTx2.length} (FILTRADO)`;
    }
  }

  const startIndex = (currentPage2 - 1) * PAGE_SIZE;
  const paginated = filteredTx2.slice(startIndex, startIndex + PAGE_SIZE);

  const tbody = document.getElementById('tx2-tbody');
  if (!tbody) return;

  if (filteredTx2.length === 0) {
    const visibleColsCount = tx2Columns.filter(c => c.visible).length + 1;
    tbody.innerHTML = `<tr><td colspan="${visibleColsCount}" style="text-align:center;padding:32px;color:var(--text-muted);font-size:12.5px">No se encontraron transacciones con los filtros aplicados</td></tr>`;
    renderPagination2(0);
    return;
  }

  const visibleCols = tx2Columns.filter(c => c.visible);

  tbody.innerHTML = paginated.map(tx => {
    const raw = tx.raw || {};
    let cells = '';
    visibleCols.forEach(c => {
      cells += c.render(raw);
    });
    cells += `<td style="text-align:right"><button class="btn btn-ghost" style="padding:4px 10px;font-size:11px" onclick="openTx2Modal('${tx.ref}')">Ver</button></td>`;
    return `<tr>${cells}</tr>`;
  }).join('');

  renderPagination2(filteredTx2.length);
}

function renderPagination2(totalMatches) {
  const totalPages = Math.ceil(totalMatches / PAGE_SIZE);
  const container = document.getElementById('tx2-pagination');
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<div class="page-info">Página ${currentPage2} de ${totalPages}</div><div class="page-btns">`;
  html += `<button class="page-btn" onclick="renderTransactions2(${Math.max(1, currentPage2 - 1)})" ${currentPage2 === 1 ? 'disabled' : ''}>‹</button>`;

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage2 - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === currentPage2 ? 'active' : ''}" onclick="renderTransactions2(${i})">${i}</button>`;
  }

  html += `<button class="page-btn" onclick="renderTransactions2(${Math.min(totalPages, currentPage2 + 1)})" ${currentPage2 === totalPages ? 'disabled' : ''}>›</button>`;
  html += `</div>`;
  container.innerHTML = html;
}

// ════════════════════════════════════════════════════════════
// MODAL DE DETALLES con todos los campos + toggle de nulos
// ════════════════════════════════════════════════════════════
let currentTxModalRef = null;

// Mapeo de campos crudos -> etiquetas legibles en español
const FIELD_LABELS = {
  AC_NO: 'Cuenta (AC_NO)',
  TRN_REF_NO: 'N° Referencia',
  MEDIO_PAGO: 'Medio de Pago',
  EVENT: 'Evento',
  TRN_DT: 'Fecha Transacción',
  VALUE_DT: 'Fecha Valor',
  TRN_CODE: 'Código TRN',
  DRCR_IND: 'Naturaleza',
  TRN_DESC: 'Descripción',
  ID_BAN_NO_AVL: 'ID Ban (No Avalado)',
  LLAVE_DEST: 'Llave Destino',
  NOM_DES_NO_AVL: 'Nombre Destino (No Avalado)',
  NOM_ORI_NO_AVL: 'Nombre Origen (No Avalado)',
  ID_BAN_REP: 'ID Ban Representante',
  INSTRUMENT_CODE: 'Código Instrumento',
  LCY_AMOUNT: 'Monto',
  EXTERNAL_REF_NO: 'Referencia Externa',
  MODULE: 'Módulo',
  TXN_TYPE: 'Tipo Transacción',
  REFERENCIA1: 'Referencia 1',
  REFERENCIA2: 'Referencia 2',
  BRANCH: 'Sucursal',
  IDENTIFICACION: 'Identificación',
  FACTURA: 'Factura',
  INFO_LIBRE: 'Información Libre',
  AC_ENTRY_SR_NO: 'N° Asiento'
};

function openTx2Modal(ref) {
  currentTxModalRef = ref;
  // Resetear el toggle a desmarcado al abrir
  const toggle = document.getElementById('hide-nulls-toggle');
  if (toggle) toggle.checked = false;
  rerenderTxModal();
  document.getElementById('tx-modal-overlay').classList.add('active');
}

function rerenderTxModal() {
  if (!currentTxModalRef) return;
  const tx = allTx2.find(t => t.ref === currentTxModalRef);
  if (!tx) return;

  const content = document.getElementById('modal-body-content');
  if (!content) return;

  const hideNulls = document.getElementById('hide-nulls-toggle')?.checked || false;
  const r = tx.raw || {};

  // Construir lista de campos a mostrar usando el orden del FIELD_LABELS
  let totalCount = 0;
  let shownCount = 0;
  let html = '';

  Object.keys(FIELD_LABELS).forEach(key => {
    if (!(key in r)) return;
    totalCount++;
    let value = r[key];
    const isNull = value === null || value === undefined || value === '' || value === 'null';

    if (hideNulls && isNull) return;
    shownCount++;

    let displayValue = '';
    let isMono = false;

    if (isNull) {
      displayValue = '<span style="color:var(--text-muted);font-style:italic">—</span>';
    } else if (key === 'TRN_DT' || key === 'VALUE_DT') {
      // Convertir serial Excel a fecha legible
      if (typeof value === 'number') {
        const parsed = parseDateValue(value);
        if (parsed) {
          const dd = String(parsed.getDate()).padStart(2, '0');
          const mm = String(parsed.getMonth() + 1).padStart(2, '0');
          const yyyy = parsed.getFullYear();
          displayValue = `${dd}/${mm}/${yyyy}`;
          isMono = true;
        } else {
          displayValue = String(value);
        }
      } else {
        displayValue = String(value);
      }
    } else if (key === 'DRCR_IND') {
      const isD = value === 'D';
      displayValue = `<span class="badge ${isD ? 'badge-gold' : 'badge-teal'}">${isD ? 'DÉBITO' : 'CRÉDITO'}</span>`;
    } else if (key === 'LCY_AMOUNT') {
      displayValue = '$' + Math.abs(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      isMono = true;
    } else if (typeof value === 'number') {
      displayValue = String(value);
      isMono = true;
    } else {
      displayValue = String(value);
      // Heurística: si parece un código/referencia, usar mono
      if (/^[A-Z0-9_-]+$/.test(displayValue) && displayValue.length > 4) {
        isMono = true;
      }
    }

    const monoStyle = isMono ? "font-family:'DM Mono',monospace" : '';
    html += `<div class="detail-row"><span class="detail-label">${FIELD_LABELS[key]}</span><span class="detail-value" style="${monoStyle}">${displayValue}</span></div>`;
  });

  content.innerHTML = html || '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">No hay campos para mostrar con los filtros actuales</div>';

  const counter = document.getElementById('tx-modal-fields-count');
  if (counter) {
    counter.textContent = hideNulls
      ? `Mostrando ${shownCount} de ${totalCount} campos (${totalCount - shownCount} ocultos)`
      : `Mostrando ${totalCount} campos`;
  }
}

// ════════════════════════════════════════════════════════════
// CONFIGURADOR DE COLUMNAS (drag & drop)
// ════════════════════════════════════════════════════════════
function openColumnsConfig() {
  renderColumnsConfig();
  document.getElementById('cols-modal-overlay').classList.add('active');
}

function closeColumnsConfig() {
  document.getElementById('cols-modal-overlay').classList.remove('active');
}

function renderColumnsConfig() {
  const body = document.getElementById('cols-modal-body');
  if (!body) return;

  body.innerHTML = tx2Columns.map((c, idx) => `
    <div class="col-config-item" draggable="true" data-index="${idx}"
         ondragstart="onColDragStart(event, ${idx})"
         ondragover="onColDragOver(event)"
         ondragleave="onColDragLeave(event)"
         ondrop="onColDrop(event, ${idx})"
         ondragend="onColDragEnd(event)">
      <span class="col-config-handle">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 4a1 1 0 110-2 1 1 0 010 2zM13 4a1 1 0 110-2 1 1 0 010 2zM7 11a1 1 0 110-2 1 1 0 010 2zM13 11a1 1 0 110-2 1 1 0 010 2zM7 18a1 1 0 110-2 1 1 0 010 2zM13 18a1 1 0 110-2 1 1 0 010 2z"/>
        </svg>
      </span>
      <input type="checkbox" class="col-config-checkbox" ${c.visible ? 'checked' : ''} onchange="toggleColVisibility(${idx})">
      <span class="col-config-label">${c.label}</span>
      <span class="col-config-tag">#${idx + 1}</span>
    </div>
  `).join('');
}

function toggleColVisibility(idx) {
  tx2Columns[idx].visible = !tx2Columns[idx].visible;
  const items = document.querySelectorAll('.col-config-item');
  if (items[idx]) {
    items[idx].querySelector('.col-config-checkbox').checked = tx2Columns[idx].visible;
  }
}

let dragSrcIdx = null;

function onColDragStart(e, idx) {
  dragSrcIdx = idx;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onColDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function onColDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function onColDrop(e, targetIdx) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;
  const [moved] = tx2Columns.splice(dragSrcIdx, 1);
  tx2Columns.splice(targetIdx, 0, moved);
  renderColumnsConfig();
}

function onColDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.col-config-item').forEach(el => el.classList.remove('drag-over'));
  dragSrcIdx = null;
}

function applyColumnsConfig() {
  // Validación: al menos una columna activa
  const visible = tx2Columns.filter(c => c.visible);
  if (visible.length === 0) {
    showToast('Debe haber al menos una columna visible', '⚠️');
    return;
  }
  renderTable2();
  closeColumnsConfig();
  showToast('Configuración de columnas aplicada', '✅');
}

function resetColumnsConfig() {
  tx2Columns = TX2_COLUMNS_DEFAULT.map(c => ({ ...c, visible: true }));
  renderColumnsConfig();
  showToast('Configuración restaurada', '🔄');
}

// ════════════════════════════════════════════════════════════
// FILTROS DEL LIBRO DE TRANSACCIONES 2
// ════════════════════════════════════════════════════════════
let amountMinAbs = 0;
let amountMaxAbs = 0;

function initFilters2() {
  if (!allTx2.length) return;

  // Poblar dropdown de cuentas únicas
  const accountSel = document.getElementById('account-filter-2');
  if (accountSel) {
    const uniqueAccounts = [...new Set(allTx2.map(tx => tx.origen).filter(Boolean))].sort();
    accountSel.innerHTML = '<option value="all">Cuenta: Todas</option>';
    uniqueAccounts.forEach(acc => {
      accountSel.innerHTML += `<option value="${acc}">${acc}</option>`;
    });
  }

  // Calcular rango de montos del archivo
  const montos = allTx2.map(tx => Math.abs(tx.monto)).filter(m => m > 0);
  amountMinAbs = montos.length ? Math.floor(Math.min(...montos)) : 0;
  amountMaxAbs = montos.length ? Math.ceil(Math.max(...montos)) : 0;

  // Configurar placeholders con el rango real para guiar al usuario
  const minInput = document.getElementById('amount-min-2');
  const maxInput = document.getElementById('amount-max-2');
  if (minInput) {
    minInput.placeholder = 'Mín: ' + amountMinAbs.toLocaleString('en-US');
    minInput.value = '';
  }
  if (maxInput) {
    maxInput.placeholder = 'Máx: ' + amountMaxAbs.toLocaleString('en-US');
    maxInput.value = '';
  }
}

// Función ligera de validación visual mientras se escribe (no aplica filtro aún)
function syncAmountDisplay() {
  const minInput = document.getElementById('amount-min-2');
  const maxInput = document.getElementById('amount-max-2');
  if (!minInput || !maxInput) return;

  // Si min > max, marcar visualmente con rojo
  const minVal = parseFloat(minInput.value);
  const maxVal = parseFloat(maxInput.value);
  if (!isNaN(minVal) && !isNaN(maxVal) && minVal > maxVal) {
    minInput.style.borderColor = 'var(--red)';
    maxInput.style.borderColor = 'var(--red)';
  } else {
    minInput.style.borderColor = '';
    maxInput.style.borderColor = '';
  }
}

function applyFilters2() {
  const dateFromVal = document.getElementById('date-from-2')?.value;
  const dateToVal = document.getElementById('date-to-2')?.value;
  const accountVal = document.getElementById('account-filter-2')?.value || 'all';
  const natureVal = document.getElementById('nature-filter-2')?.value || 'all';

  const minStr = document.getElementById('amount-min-2')?.value;
  const maxStr = document.getElementById('amount-max-2')?.value;
  const minVal = (minStr === '' || minStr === undefined) ? null : parseFloat(minStr);
  const maxVal = (maxStr === '' || maxStr === undefined) ? null : parseFloat(maxStr);

  const fromDate = dateFromVal ? new Date(dateFromVal) : null;
  const toDate = dateToVal ? new Date(dateToVal) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  // Si min > max, los intercambiamos para no devolver siempre vacío
  let realMin = minVal;
  let realMax = maxVal;
  if (realMin !== null && realMax !== null && realMin > realMax) {
    [realMin, realMax] = [realMax, realMin];
  }

  filteredTx2 = allTx2.filter(tx => {
    // Fecha
    if (fromDate || toDate) {
      if (!tx.dateObj) return false;
      if (fromDate && tx.dateObj < fromDate) return false;
      if (toDate && tx.dateObj > toDate) return false;
    }
    // Cuenta
    if (accountVal !== 'all' && tx.origen !== accountVal) return false;
    // Naturaleza
    if (natureVal !== 'all' && tx.nature !== natureVal) return false;
    // Monto (cada límite es opcional)
    const m = Math.abs(tx.monto);
    if (realMin !== null && !isNaN(realMin) && m < realMin) return false;
    if (realMax !== null && !isNaN(realMax) && m > realMax) return false;
    return true;
  });

  currentPage2 = 1;
  renderTransactions2(1);
}

function resetFilters2() {
  const dateFrom = document.getElementById('date-from-2');
  const dateTo = document.getElementById('date-to-2');
  const accountSel = document.getElementById('account-filter-2');
  const natureSel = document.getElementById('nature-filter-2');
  const minInput = document.getElementById('amount-min-2');
  const maxInput = document.getElementById('amount-max-2');

  if (dateFrom) dateFrom.value = '';
  if (dateTo) dateTo.value = '';
  if (accountSel) accountSel.value = 'all';
  if (natureSel) natureSel.value = 'all';
  if (minInput) {
    minInput.value = '';
    minInput.style.borderColor = '';
  }
  if (maxInput) {
    maxInput.value = '';
    maxInput.style.borderColor = '';
  }

  filteredTx2 = [...allTx2];
  currentPage2 = 1;
  renderTransactions2(1);
  showToast('Filtros restablecidos', '🔄');
}

// Inicializar libro 2 cuando carga la página
window.addEventListener('DOMContentLoaded', initJsonData2);

// ════════════════════════════════════════════════════════════
// EXPORTADOR DE EXTRACTOS - MT940 / OFX / CNAB / CSV
// ════════════════════════════════════════════════════════════

function clearExportFilter() {
  const f = document.getElementById('export-date-from');
  const t = document.getElementById('export-date-to');
  if (f) f.value = '';
  if (t) t.value = '';
  document.getElementById('export-count').textContent = 'SELECCIONE FORMATO';
  showToast('Filtros limpiados', '🔄');
}

function getFilteredExportData() {
  if (!allTx2 || !allTx2.length) {
    showToast('No hay datos en el Libro 2 para exportar', '⚠️');
    return null;
  }

  const fromValue = document.getElementById('export-date-from')?.value;
  const toValue = document.getElementById('export-date-to')?.value;
  const fromDate = fromValue ? new Date(fromValue) : null;
  const toDate = toValue ? new Date(toValue) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  const filtered = allTx2.filter(tx => {
    if (!fromDate && !toDate) return true;
    const txDate = parseTransactionDate(tx);
    if (!txDate) return true;
    if (fromDate && txDate < fromDate) return false;
    if (toDate && txDate > toDate) return false;
    return true;
  });

  return filtered;
}

function previewExport() {
  const data = getFilteredExportData();
  if (!data) return;
  const countEl = document.getElementById('export-count');
  if (countEl) countEl.textContent = `${data.length} REGISTROS LISTOS PARA EXPORTAR`;
  showToast(`${data.length} transacciones encontradas en el rango`, '📊');
}

function downloadFile(filename, content, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function pad(str, length, char = ' ', side = 'right') {
  str = String(str);
  if (str.length >= length) return str.substring(0, length);
  const padding = char.repeat(length - str.length);
  return side === 'right' ? str + padding : padding + str;
}

function formatDateForExport(dateStr, fmt = 'yyMMdd') {
  // Soporta formato DD/MM/AAAA
  const slashMatch = String(dateStr).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1];
    const mon = slashMatch[2];
    const yr = slashMatch[3];
    if (fmt === 'yyMMdd') return yr.slice(2) + mon + day;
    if (fmt === 'yyyyMMdd') return yr + mon + day;
    if (fmt === 'yyyy-MM-dd') return `${yr}-${mon}-${day}`;
    if (fmt === 'dd/MM/yyyy') return `${day}/${mon}/${yr}`;
  }
  // Soporta formato "09 de abr de 2026"
  const months = {
    ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
    jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12'
  };
  const m = String(dateStr).toLowerCase().match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const mon = months[m[2].substring(0, 3)] || '01';
    const yr = m[3];
    if (fmt === 'yyMMdd') return yr.slice(2) + mon + day;
    if (fmt === 'yyyyMMdd') return yr + mon + day;
    if (fmt === 'yyyy-MM-dd') return `${yr}-${mon}-${day}`;
    if (fmt === 'dd/MM/yyyy') return `${day}/${mon}/${yr}`;
  }
  // Fallback: hoy
  const today = new Date();
  const yy = String(today.getFullYear()).slice(2);
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  if (fmt === 'yyMMdd') return yy + mm + dd;
  if (fmt === 'yyyyMMdd') return yyyy + mm + dd;
  if (fmt === 'yyyy-MM-dd') return `${yyyy}-${mm}-${dd}`;
  return `${dd}/${mm}/${yyyy}`;
}

// ── MT940: Formato SWIFT estándar ───────────────────────────
function buildMT940(data) {
  const account = data[0]?.origen || '240806828';
  const today = formatDateForExport('', 'yyMMdd');
  let lines = [];

  // Cabecera del extracto
  lines.push(':20:STMT' + today + '01');
  lines.push(':25:BANCODEOCCIDENTE/' + account);
  lines.push(':28C:00001/001');
  lines.push(':60F:C' + today + 'COP0,00');

  // Transacciones
  data.forEach((tx, i) => {
    const fecha = formatDateForExport(tx.date, 'yyMMdd');
    const fechaCorta = fecha.substring(2); // MMDD
    const drcr = tx.nature === 'D' ? 'D' : 'C';
    const monto = Math.abs(tx.monto).toFixed(2).replace('.', ',');
    const ref = (tx.ref || '').substring(0, 16);

    lines.push(`:61:${fecha}${fechaCorta}${drcr}${monto}NTRF${ref}`);
    lines.push(`:86:${(tx.name || '').substring(0, 65)}`);
  });

  // Saldo final
  const totalDebito = data.filter(t => t.nature === 'D').reduce((s, t) => s + Math.abs(t.monto), 0);
  const totalCredito = data.filter(t => t.nature !== 'D').reduce((s, t) => s + Math.abs(t.monto), 0);
  const saldoFinal = (totalCredito - totalDebito).toFixed(2).replace('.', ',');
  lines.push(`:62F:C${today}COP${saldoFinal}`);

  return lines.join('\r\n');
}

// ── OFX: Open Financial Exchange ────────────────────────────
function buildOFX(data) {
  const dtNow = formatDateForExport('', 'yyyyMMdd') + '120000';
  const account = data[0]?.origen || '240806828';

  let header = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<DTSERVER>${dtNow}
<LANGUAGE>SPA
<FI><ORG>BANCO DE OCCIDENTE<FID>0023</FI>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<STMTRS>
<CURDEF>COP
<BANKACCTFROM>
<BANKID>023<ACCTID>${account}<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${dtNow}<DTEND>${dtNow}
`;

  let trans = data.map((tx, i) => {
    const fecha = formatDateForExport(tx.date, 'yyyyMMdd');
    const drcr = tx.nature === 'D' ? 'DEBIT' : 'CREDIT';
    const monto = (tx.nature === 'D' ? -1 : 1) * Math.abs(tx.monto);
    const ref = tx.ref || `FITID${i + 1}`;
    const desc = (tx.name || 'TRANSACCION').replace(/[<>&]/g, '');
    return `<STMTTRN>
<TRNTYPE>${drcr}
<DTPOSTED>${fecha}120000
<TRNAMT>${monto.toFixed(2)}
<FITID>${ref}
<NAME>${desc}
<MEMO>${desc}
</STMTTRN>`;
  }).join('\n');

  let footer = `
</BANKTRANLIST>
<LEDGERBAL><BALAMT>0.00<DTASOF>${dtNow}</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  return header + trans + footer;
}

// ── CNAB 240: Formato posicional bancario ───────────────────
function buildCNAB240(data) {
  const today = formatDateForExport('', 'yyyyMMdd');
  const account = data[0]?.origen || '240806828';
  let lines = [];

  // Header de archivo
  let headerArchivo = pad('023', 3, '0', 'left'); // Banco
  headerArchivo += pad('0000', 4, '0', 'left'); // Lote
  headerArchivo += '0'; // Tipo registro
  headerArchivo += pad('', 9, ' '); // Reservado
  headerArchivo += '2'; // Tipo inscripción
  headerArchivo += pad('00000000000000', 14, '0', 'left'); // CUIT
  headerArchivo += pad('', 20, ' ');
  headerArchivo += pad(account, 20, '0', 'left');
  headerArchivo += pad('', 10, ' ');
  headerArchivo += pad('BANCO DE OCCIDENTE', 30, ' ');
  headerArchivo += pad('AFIP CORPORATE BANKING', 30, ' ');
  headerArchivo += '1'; // Codigo remesa
  headerArchivo += pad(today, 8, '0', 'left');
  headerArchivo += pad('120000', 6, '0', 'left');
  headerArchivo += pad('000001', 6, '0', 'left');
  headerArchivo += pad('087', 3, '0', 'left'); // Versión
  headerArchivo += pad('00000', 5, '0', 'left'); // Densidad
  headerArchivo += pad('', 20, ' ');
  headerArchivo += pad('', 20, ' ');
  headerArchivo += pad('', 29, ' ');
  lines.push(headerArchivo.substring(0, 240));

  // Header de lote
  let headerLote = pad('023', 3, '0', 'left');
  headerLote += pad('0001', 4, '0', 'left');
  headerLote += '1';
  headerLote += 'C';
  headerLote += pad('20', 2, '0', 'left');
  headerLote += pad('45', 2, '0', 'left');
  headerLote += pad('046', 3, '0', 'left');
  headerLote += pad('', 1, ' ');
  headerLote += '2';
  headerLote += pad('00000000000000', 14, '0', 'left');
  headerLote += pad('', 20, ' ');
  headerLote += pad(account, 20, '0', 'left');
  headerLote += pad('', 10, ' ');
  headerLote += pad('BANCO DE OCCIDENTE', 30, ' ');
  headerLote += pad('AFIP', 40, ' ');
  headerLote += pad('', 40, ' ');
  headerLote += pad('', 8, ' ');
  headerLote += pad(today, 8, '0', 'left');
  headerLote += pad('00000000', 8, '0', 'left');
  headerLote += pad('', 33, ' ');
  lines.push(headerLote.substring(0, 240));

  // Detalles
  let totalValor = 0;
  data.forEach((tx, i) => {
    const fecha = formatDateForExport(tx.date, 'yyyyMMdd');
    const monto = Math.round(Math.abs(tx.monto) * 100);
    totalValor += monto;
    const drcr = tx.nature === 'D' ? 'D' : 'C';

    let detalle = pad('023', 3, '0', 'left');
    detalle += pad('0001', 4, '0', 'left');
    detalle += '3';
    detalle += pad(String(i + 1).padStart(5, '0'), 5, '0', 'left');
    detalle += 'A';
    detalle += pad('000', 3, '0', 'left');
    detalle += '0';
    detalle += pad(account, 20, '0', 'left');
    detalle += pad('', 5, ' ');
    detalle += pad((tx.name || '').toUpperCase(), 30, ' ');
    detalle += pad('023', 3, '0', 'left');
    detalle += pad('0000', 4, '0', 'left');
    detalle += pad('', 12, ' ');
    detalle += pad((tx.ref || '').substring(0, 20), 20, ' ');
    detalle += pad(fecha, 8, '0', 'left');
    detalle += 'COP';
    detalle += pad('0', 15, '0', 'left');
    detalle += pad(String(monto), 15, '0', 'left');
    detalle += pad('', 15, ' ');
    detalle += pad(fecha, 8, '0', 'left');
    detalle += pad('0', 15, '0', 'left');
    detalle += pad('', 40, ' ');
    detalle += pad(drcr + 'EBITO', 10, ' ');
    detalle += pad('', 25, ' ');
    lines.push(detalle.substring(0, 240));
  });

  // Trailer de lote
  let trailerLote = pad('023', 3, '0', 'left');
  trailerLote += pad('0001', 4, '0', 'left');
  trailerLote += '5';
  trailerLote += pad('', 9, ' ');
  trailerLote += pad(String(data.length + 2).padStart(6, '0'), 6, '0', 'left');
  trailerLote += pad(String(totalValor).padStart(18, '0'), 18, '0', 'left');
  trailerLote += pad('000000000000000000', 18, '0', 'left');
  trailerLote += pad('', 171, ' ');
  trailerLote += pad('', 11, ' ');
  lines.push(trailerLote.substring(0, 240));

  // Trailer de archivo
  let trailerArchivo = pad('023', 3, '0', 'left');
  trailerArchivo += pad('9999', 4, '0', 'left');
  trailerArchivo += '9';
  trailerArchivo += pad('', 9, ' ');
  trailerArchivo += pad('000001', 6, '0', 'left');
  trailerArchivo += pad(String(data.length + 4).padStart(6, '0'), 6, '0', 'left');
  trailerArchivo += pad('000000', 6, '0', 'left');
  trailerArchivo += pad('', 205, ' ');
  lines.push(trailerArchivo.substring(0, 240));

  return lines.join('\r\n');
}

// ── CSV: Comma Separated Values ─────────────────────────────
function buildCSV(data) {
  const headers = ['Fecha', 'Cuenta', 'N° Referencia', 'Referencia Externa', 'Descripción', 'Naturaleza', 'Monto', 'Medio Pago', 'Código TRN', 'Tipo Transacción', 'Sucursal'];
  let csv = headers.join(',') + '\r\n';

  data.forEach(tx => {
    const r = tx.raw || {};
    const fields = [
      formatDateForExport(tx.date, 'yyyy-MM-dd'),
      tx.origen,
      tx.ref,
      tx.destino,
      `"${(tx.name || '').replace(/"/g, '""')}"`,
      tx.nature === 'D' ? 'DEBITO' : 'CREDITO',
      Math.abs(tx.monto).toFixed(2),
      r.MEDIO_PAGO || '',
      r.TRN_CODE || '',
      r.TXN_TYPE || '',
      r.BRANCH || ''
    ];
    csv += fields.join(',') + '\r\n';
  });

  return csv;
}

// ── Función central de exportación ──────────────────────────
function exportFormat(format) {
  if (format === 'pdf') {
    const link = document.createElement('a');
    link.href = 'extractos.pdf';
    link.download = 'extractos.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Descargando extractos.pdf', '📥');
    return;
  }

  const data = getFilteredExportData();
  if (!data) return;
  if (data.length === 0) {
    showToast('No hay transacciones en el rango seleccionado', '⚠️');
    return;
  }

  const today = formatDateForExport('', 'yyyyMMdd');
  let filename = '';
  let content = '';
  let mime = 'text/plain';

  try {
    switch (format) {
      case 'mt940':
        content = buildMT940(data);
        filename = `extracto_${today}.sta`;
        mime = 'text/plain';
        break;
      case 'ofx':
        content = buildOFX(data);
        filename = `extracto_${today}.ofx`;
        mime = 'application/x-ofx';
        break;
      case 'cnab':
        content = buildCNAB240(data);
        filename = `extracto_${today}.ret`;
        mime = 'text/plain';
        break;
      case 'csv':
        content = buildCSV(data);
        filename = `extracto_${today}.csv`;
        mime = 'text/csv';
        break;
      default:
        showToast('Formato no soportado', '⚠️');
        return;
    }

    downloadFile(filename, content, mime);
    showToast(`✅ ${data.length} registros exportados a ${format.toUpperCase()}`, '📥');
  } catch (err) {
    console.error('Error exportando:', err);
    showToast('Error al generar el archivo: ' + err.message, '⚠️');
  }
}

// ════════════════════════════════════════════════════════════
// PÁGINA CDT - Carga dinámica desde cdts.js o archivo cargado
// ════════════════════════════════════════════════════════════
let allCDT = [];
let currentCDTModalIdx = null;

// Etiquetas legibles para los campos más relevantes del CDT
const CDT_FIELD_LABELS = {
  BRANCH_CODE: 'Código de Sucursal',
  CUST_AC_NO: 'N° Cuenta CDT',
  AC_DESC: 'Descripción Cuenta',
  CUST_NO: 'N° Cliente',
  CCY: 'Moneda',
  ACCOUNT_CLASS: 'Clase de Cuenta',
  AC_OPEN_DATE: 'Fecha de Apertura',
  ALT_AC_NO: 'N° Cuenta Alterna',
  ACY_OPENING_BAL: 'Saldo Apertura (ACY)',
  LCY_OPENING_BAL: 'Saldo Apertura (LCY)',
  ACY_CURR_BALANCE: 'Saldo Actual (ACY)',
  LCY_CURR_BALANCE: 'Saldo Actual (LCY)',
  ACY_AVL_BAL: 'Saldo Disponible',
  ACY_BLOCKED_AMOUNT: 'Monto Bloqueado',
  ACY_MTD_TOVER_CR: 'Movimiento Mensual CR',
  LCY_MTD_TOVER_CR: 'Movimiento Mensual CR (LCY)',
  DATE_LAST_CR: 'Última Fecha CR',
  DATE_LAST_DR: 'Última Fecha DR',
  ADDRESS1: 'Dirección',
  ADDRESS4: 'Ciudad',
  ACCOUNT_TYPE: 'Tipo de Cuenta',
  ACC_STATUS: 'Estado de Cuenta',
  RECORD_STAT: 'Estado de Registro',
  AUTH_STAT: 'Estado de Autorización',
  MAKER_ID: 'Creado por',
  MAKER_DT_STAMP: 'Fecha Creación',
  CHECKER_ID: 'Aprobado por',
  CHECKER_DT_STAMP: 'Fecha Aprobación',
  MOD_NO: 'N° Modificación',
  ONCE_AUTH: 'Autorizado',
  LIMIT_CCY: 'Moneda Límite',
  DR_GL: 'GL Débito',
  CR_GL: 'GL Crédito',
  PRODUCT_LIST: 'Lista de Productos',
  TXN_CODE_LIST: 'Lista Códigos Transacción',
  DORMANCY_DAYS: 'Días Dormancia',
  AC_STMT_DAY: 'Día Extracto',
  AC_STMT_CYCLE: 'Ciclo Extracto'
};

function formatCurrency(value, currency = 'COP') {
  const num = Number(value) || 0;
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateLong(value) {
  if (!value) return '—';
  // Si viene "2012-03-22 00:00:00"
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${m[3]} ${months[parseInt(m[2]) - 1]} ${m[1]}`;
  }
  return String(value);
}

function formatDateShort(value) {
  if (!value) return '—';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  return String(value);
}

function initCDTData() {
  if (typeof window.datosCDT === 'undefined' || !window.datosCDT.length) {
    showCDTEmptyState('No hay datos disponibles. Cargue un archivo .js con los datos de CDT.');
    return;
  }
  allCDT = [...window.datosCDT];
  renderCDTPage();
}

function showCDTEmptyState(msg) {
  const container = document.getElementById('cdt-cards-container');
  if (container) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text-muted);font-size:13px;background:rgba(0,114,188,0.03);border:1px dashed rgba(0,114,188,0.2);border-radius:12px">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px;opacity:0.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
      <div>${msg}</div>
    </div>`;
  }
  const tag = document.getElementById('cdt-active-tag');
  if (tag) tag.textContent = 'SIN DATOS';
}

function renderCDTPage() {
  if (!allCDT || !allCDT.length) {
    showCDTEmptyState('Sin certificados disponibles.');
    return;
  }

  // ── KPIs principales ───────────────────────────────────────
  const totalBalance = allCDT.reduce((sum, c) => sum + (Number(c.LCY_CURR_BALANCE) || 0), 0);
  const avgBalance = totalBalance / allCDT.length;
  const activeCDTs = allCDT.filter(c => c.ACC_STATUS === 'NORM' || c.AUTH_STAT === 'A').length;
  const currencies = [...new Set(allCDT.map(c => c.CCY).filter(Boolean))];
  const branches = [...new Set(allCDT.map(c => c.BRANCH_CODE).filter(Boolean))];

  // Apertura más reciente
  const dates = allCDT
    .map(c => c.AC_OPEN_DATE)
    .filter(Boolean)
    .sort()
    .reverse();
  const recentOpen = dates[0] ? formatDateLong(dates[0]) : '—';

  // Actualizar UI de KPIs
  const totalEl = document.getElementById('cdt-total-balance');
  if (totalEl) {
    totalEl.innerHTML = '<span>$</span>' + Number(totalBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const badgeEl = document.getElementById('cdt-total-badge');
  if (badgeEl) {
    badgeEl.innerHTML = `▲ ${allCDT.length} certificados cargados · ${currencies[0] || 'COP'}`;
  }
  const activeCountEl = document.getElementById('cdt-active-count');
  if (activeCountEl) activeCountEl.textContent = `${activeCDTs} Certificados`;
  const recentOpenEl = document.getElementById('cdt-recent-open');
  if (recentOpenEl) recentOpenEl.textContent = recentOpen;
  const avgBalanceEl = document.getElementById('cdt-avg-balance');
  if (avgBalanceEl) avgBalanceEl.textContent = formatCurrency(avgBalance);
  const ccyEl = document.getElementById('cdt-main-ccy');
  if (ccyEl) ccyEl.textContent = currencies.length === 1 ? currencies[0] : `${currencies.length} monedas`;
  const branchesEl = document.getElementById('cdt-branches');
  if (branchesEl) branchesEl.textContent = branches.length + (branches.length === 1 ? ' Sucursal' : ' Sucursales');
  const activeTag = document.getElementById('cdt-active-tag');
  if (activeTag) activeTag.textContent = `${allCDT.length} CDT${allCDT.length !== 1 ? 's' : ''} ACTIVO${allCDT.length !== 1 ? 'S' : ''}`;

  // ── Tarjetas individuales ─────────────────────────────────
  const container = document.getElementById('cdt-cards-container');
  if (!container) return;

  const gradients = [
    'linear-gradient(135deg, #1a2e5a 0%, #0072bc 100%)',
    'linear-gradient(135deg, #0d3a6e 0%, #0072bc 100%)',
    'linear-gradient(135deg, #1a2e5a 0%, #29abe2 100%)',
    'linear-gradient(135deg, #0072bc 0%, #29abe2 100%)',
    'linear-gradient(135deg, #1e3a8a 0%, #1a2e5a 100%)'
  ];

  container.innerHTML = allCDT.map((cdt, idx) => {
    const grad = gradients[idx % gradients.length];
    const balance = Number(cdt.LCY_CURR_BALANCE) || 0;
    const status = cdt.ACC_STATUS || cdt.RECORD_STAT || '—';
    const isActive = status === 'NORM' || cdt.AUTH_STAT === 'A';
    const statusColor = isActive ? 'rgba(62,207,142,0.25);color:#3ecf8e' : 'rgba(232,160,32,0.25);color:var(--gold)';
    const statusLabel = isActive ? '● ACTIVO' : '● ' + status;

    return `
      <div class="cdt-card" style="background:${grad};border-radius:14px;padding:24px;color:#fff;position:relative;overflow:hidden;box-shadow:0 4px 16px rgba(0,114,188,0.25)">
        <div style="position:absolute;top:-30px;right:-30px;width:140px;height:140px;background:radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%);border-radius:50%;pointer-events:none"></div>

        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;position:relative;z-index:2">
          <div>
            <div style="font-size:10px;font-weight:600;letter-spacing:0.14em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:4px">CDT N° ${idx + 1}</div>
            <div style="font-size:13px;font-weight:600;color:#fff">${cdt.AC_DESC || cdt.ACCOUNT_CLASS || 'Certificado de Depósito'}</div>
          </div>
          <span style="background:${statusColor};font-size:10px;font-weight:700;padding:4px 10px;border-radius:6px;letter-spacing:0.05em">${statusLabel}</span>
        </div>

        <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:4px;position:relative;z-index:2">Saldo Actual</div>
        <div style="font-size:28px;font-weight:700;font-family:'DM Mono',monospace;letter-spacing:-0.02em;margin-bottom:18px;position:relative;z-index:2">${formatCurrency(balance, cdt.CCY)}</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.15);position:relative;z-index:2">
          <div>
            <div style="font-size:10px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">N° Cuenta</div>
            <div style="font-size:13px;font-weight:600;font-family:'DM Mono',monospace">${cdt.CUST_AC_NO || '—'}</div>
          </div>
          <div>
            <div style="font-size:10px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">Apertura</div>
            <div style="font-size:13px;font-weight:600;font-family:'DM Mono',monospace">${formatDateShort(cdt.AC_OPEN_DATE)}</div>
          </div>
          <div>
            <div style="font-size:10px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">Moneda</div>
            <div style="font-size:13px;font-weight:600">${cdt.CCY || '—'}</div>
          </div>
          <div>
            <div style="font-size:10px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">Cliente</div>
            <div style="font-size:12px;font-weight:600;font-family:'DM Mono',monospace">${cdt.CUST_NO || '—'}</div>
          </div>
        </div>

        <div style="margin-top:18px;display:flex;gap:8px;position:relative;z-index:2">
          <button class="btn btn-primary" style="flex:1;justify-content:center;font-size:11.5px;padding:8px 14px" onclick="showToast('Generando certificado PDF...','📄')">Ver Certificado</button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11.5px;padding:8px 14px;color:#fff;border-color:rgba(255,255,255,0.3)" onclick="openCDTModal(${idx})">Detalles</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Modal de detalles del CDT (reutiliza el modal de transacción) ──
function openCDTModal(idx) {
  currentCDTModalIdx = idx;
  // Resetear toggle
  const toggle = document.getElementById('hide-nulls-toggle');
  if (toggle) toggle.checked = false;
  rerenderCDTModal();
  // Ajustar título del modal
  const modalTitle = document.querySelector('#tx-modal-overlay .modal-header > div:first-child');
  if (modalTitle) modalTitle.textContent = 'Detalle de CDT';
  document.getElementById('tx-modal-overlay').classList.add('active');
  // Marcar que el modal está mostrando un CDT, no una transacción
  document.getElementById('tx-modal-overlay').dataset.mode = 'cdt';
}

function rerenderCDTModal() {
  if (currentCDTModalIdx === null) return;
  const cdt = allCDT[currentCDTModalIdx];
  if (!cdt) return;

  const content = document.getElementById('modal-body-content');
  if (!content) return;

  const hideNulls = document.getElementById('hide-nulls-toggle')?.checked || false;

  // Primero los campos importantes con etiquetas, luego el resto
  const importantOrder = Object.keys(CDT_FIELD_LABELS);
  const allKeys = Object.keys(cdt);
  const otherKeys = allKeys.filter(k => !importantOrder.includes(k));
  const orderedKeys = [...importantOrder.filter(k => k in cdt), ...otherKeys];

  let totalCount = 0;
  let shownCount = 0;
  let html = '';

  orderedKeys.forEach(key => {
    if (!(key in cdt)) return;
    totalCount++;
    let value = cdt[key];
    const isEmpty = value === null || value === undefined || value === '' || value === 'null';
    const isZero = value === 0 || value === '0';

    // Cuando hideNulls está activo: ocultamos vacíos Y ceros
    if (hideNulls && (isEmpty || isZero)) return;
    shownCount++;

    let displayValue = '';
    let isMono = false;
    const label = CDT_FIELD_LABELS[key] || key;

    if (isEmpty) {
      displayValue = '<span style="color:var(--text-muted);font-style:italic">—</span>';
    } else if (key === 'AC_OPEN_DATE' || key === 'DATE_LAST_CR' || key === 'DATE_LAST_DR' || key === 'PREVIOUS_STATEMENT_DATE' || key === 'MAKER_DT_STAMP' || key === 'CHECKER_DT_STAMP') {
      displayValue = formatDateShort(value);
      isMono = true;
    } else if (typeof value === 'number' && (key.includes('BALANCE') || key.includes('AMOUNT') || key.includes('TOVER') || key.includes('LIMIT') || key.includes('OPENING') || key.includes('AVL'))) {
      displayValue = formatCurrency(value);
      isMono = true;
    } else if (typeof value === 'number') {
      displayValue = String(value);
      isMono = true;
    } else if (key === 'ACC_STATUS' || key === 'AUTH_STAT' || key === 'RECORD_STAT') {
      const isOk = value === 'NORM' || value === 'A' || value === 'O';
      displayValue = `<span class="badge ${isOk ? 'badge-teal' : 'badge-gold'}">${value}</span>`;
    } else {
      displayValue = String(value);
      if (/^[A-Z0-9_-]+$/.test(displayValue) && displayValue.length > 4) {
        isMono = true;
      }
    }

    const monoStyle = isMono ? "font-family:'DM Mono',monospace" : '';
    html += `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value" style="${monoStyle}">${displayValue}</span></div>`;
  });

  content.innerHTML = html || '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">No hay campos para mostrar con los filtros actuales</div>';

  const counter = document.getElementById('tx-modal-fields-count');
  if (counter) {
    counter.textContent = hideNulls
      ? `Mostrando ${shownCount} de ${totalCount} campos (${totalCount - shownCount} ocultos: nulos y ceros)`
      : `Mostrando ${totalCount} campos`;
  }

  // Actualizar el label del toggle
  const toggleLabel = document.querySelector('label[for=""], #tx-modal-overlay label');
  if (toggleLabel && toggleLabel.textContent.includes('Ocultar')) {
    // Buscar el span/texto del toggle y actualizar
    const labelEl = document.getElementById('hide-nulls-toggle')?.parentElement;
    if (labelEl) {
      const isCDT = document.getElementById('tx-modal-overlay').dataset.mode === 'cdt';
      labelEl.lastChild.textContent = isCDT ? ' Ocultar campos vacíos / nulos / 0' : ' Ocultar campos vacíos / nulos';
    }
  }
}

// ── Cargar archivo .js subido por el usuario ─────────────────
function handleCDTFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.js')) {
    showToast('Solo se permiten archivos .js', '⚠️');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const code = e.target.result;
    try {
      // Ejecutar el código en un scope nuevo y extraer datosCDT
      // Usamos Function constructor para ejecutar código en scope global
      const script = document.createElement('script');
      script.textContent = code;
      // Limpiamos previo
      window.datosCDT = undefined;
      document.body.appendChild(script);
      document.body.removeChild(script);

      if (!window.datosCDT || !Array.isArray(window.datosCDT) || !window.datosCDT.length) {
        showToast('El archivo no contiene una variable "datosCDT" válida', '⚠️');
        return;
      }

      allCDT = [...window.datosCDT];
      renderCDTPage();
      showToast(`✅ ${allCDT.length} CDT cargados desde ${file.name}`, '📥');
    } catch (err) {
      console.error('Error cargando archivo CDT:', err);
      showToast('Error al cargar el archivo: ' + err.message, '⚠️');
    }
  };
  reader.onerror = function() {
    showToast('Error al leer el archivo', '⚠️');
  };
  reader.readAsText(file);

  // Limpiar el input para permitir cargar el mismo archivo nuevamente
  event.target.value = '';
}

// Adaptar rerenderTxModal para que también soporte el modo CDT
const originalRerenderTxModal = typeof rerenderTxModal !== 'undefined' ? rerenderTxModal : null;
if (originalRerenderTxModal) {
  rerenderTxModal = function() {
    const overlay = document.getElementById('tx-modal-overlay');
    if (overlay && overlay.dataset.mode === 'cdt') {
      rerenderCDTModal();
    } else {
      originalRerenderTxModal();
    }
  };
}

// Limpiar el modo cdt al cerrar el modal de transacciones
const originalCloseTxModal = typeof closeTxModal !== 'undefined' ? closeTxModal : null;
if (originalCloseTxModal) {
  closeTxModal = function() {
    originalCloseTxModal();
    const overlay = document.getElementById('tx-modal-overlay');
    if (overlay) overlay.dataset.mode = '';
    currentCDTModalIdx = null;
    // Restaurar título
    const modalTitle = document.querySelector('#tx-modal-overlay .modal-header > div:first-child');
    if (modalTitle) modalTitle.textContent = 'Detalle de Transacción';
  };
}

// Inicializar al cargar la página
window.addEventListener('DOMContentLoaded', initCDTData);

// ════════════════════════════════════════════════════════════
// PÁGINA HOME — Dashboard Financiero Consolidado
// ════════════════════════════════════════════════════════════

let homeProductIndex = 0;

let homeCurrentPage = 1;
let homeFilteredTx = [];

function initHomePage() {
  renderHomePage();
  // Refresh when data might be loaded
  setTimeout(renderHomePage, 500);
  setTimeout(renderHomePage, 1500);
}

function renderHomePage() {
  renderHomeKPIs();
  initHomeFilters();
  renderHomeMovements();
}

// ── 4 KPI Cards: Cálculo segmentado ────────────────────────
function renderHomeKPIs() {
  // Cuentas
  const accounts = (typeof productList !== 'undefined') ? productList : [];
  const corrientes = accounts.filter(p => (p.Tipo_Cuenta||'').toUpperCase() === 'CORRIENTE');
  const ahorros = accounts.filter(p => (p.Tipo_Cuenta||'').toUpperCase() === 'AHORROS');
  
  const balanceCorrientes = corrientes.reduce((s, p) => s + (Number(p.Saldo_Actual) || 0), 0);
  const balanceAhorros = ahorros.reduce((s, p) => s + (Number(p.Saldo_Actual) || 0), 0);
  
  // CDTs
  const cdts = (typeof allCDT !== 'undefined') ? allCDT : [];
  const balanceCDT = cdts.reduce((s, c) => s + (Number(c.LCY_CURR_BALANCE) || 0), 0);
  
  // Total
  const total = balanceCorrientes + balanceAhorros + balanceCDT;

  // Render UI
  const fmt = (val) => '$ ' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const elTotal = document.getElementById('home-kpi-total');
  if (elTotal) elTotal.textContent = fmt(total);

  const elCorr = document.getElementById('home-kpi-corrientes');
  const elCorrCount = document.getElementById('home-kpi-corrientes-count');
  if (elCorr) elCorr.textContent = fmt(balanceCorrientes);
  if (elCorrCount) elCorrCount.textContent = `${corrientes.length} ${corrientes.length === 1 ? 'cuenta activa' : 'cuentas activas'}`;

  const elAho = document.getElementById('home-kpi-ahorros');
  const elAhoCount = document.getElementById('home-kpi-ahorros-count');
  if (elAho) elAho.textContent = fmt(balanceAhorros);
  if (elAhoCount) elAhoCount.textContent = `${ahorros.length} ${ahorros.length === 1 ? 'cuenta activa' : 'cuentas activas'}`;

  const elCdt = document.getElementById('home-kpi-cdt');
  const elCdtCount = document.getElementById('home-kpi-cdt-count');
  if (elCdt) elCdt.textContent = fmt(balanceCDT);
  if (elCdtCount) elCdtCount.textContent = `${cdts.length} ${cdts.length === 1 ? 'certificado' : 'certificados'}`;
  // Populate extra KPI metrics (placeholders or simple calculations)
  const elTotalYTD = document.getElementById('home-kpi-total-ytd');
  if (elTotalYTD) elTotalYTD.textContent = '+5.0%'; // YTD growth placeholder

  const elTotalDisp = document.getElementById('home-kpi-total-disp');
  if (elTotalDisp) elTotalDisp.textContent = fmt(total); // Immediate availability

  // Corrientes extra metrics
  const elCorrAvg = document.getElementById('home-kpi-corrientes-avg');
  if (elCorrAvg) elCorrAvg.textContent = fmt(balanceCorrientes / (corrientes.length || 1));
  const elCorrRate = document.getElementById('home-kpi-corrientes-rate');
  if (elCorrRate) elCorrRate.textContent = '—'; // Placeholder rate

  // Ahorros extra metric
  const elAhoTerm = document.getElementById('home-kpi-ahorros-term');
  if (elAhoTerm) elAhoTerm.textContent = '—'; // Placeholder term

  // CDT extra metric
  const elCdtDuration = document.getElementById('home-kpi-cdt-duration');
  if (elCdtDuration) elCdtDuration.textContent = '—'; // Placeholder duration
}

// ── Home Movements: Tabla Preview con Filtros ───────────────
function initHomeFilters() {
  const accFilter = document.getElementById('home-filter-account');
  if (!accFilter || accFilter.options.length > 1) return; // Ya poblado

  const accounts = (typeof allTx2 !== 'undefined') ? [...new Set(allTx2.map(t => t.AC_NO || t.origen).filter(Boolean))].sort() : [];
  accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc;
    opt.textContent = acc;
    accFilter.appendChild(opt);
  });
}

function applyHomeFilters() {
  homeCurrentPage = 1;
  renderHomeMovements();
}

function renderHomeMovements(page = 1) {
  homeCurrentPage = page;
  const tbody = document.getElementById('home-movements-tbody');
  if (!tbody) return;

  const data = (typeof allTx2 !== 'undefined') ? allTx2 : [];
  
  // Aplicar filtros
  const fDateFrom = document.getElementById('home-filter-date-from')?.value;
  const fDateTo = document.getElementById('home-filter-date-to')?.value;
  const fAcc = document.getElementById('home-filter-account')?.value;
  const fMin = document.getElementById('home-filter-amt-min')?.value;
  const fMax = document.getElementById('home-filter-amt-max')?.value;
  const fNature = document.getElementById('home-filter-nature')?.value;

  const fromDate = fDateFrom ? new Date(fDateFrom) : null;
  const toDate = fDateTo ? new Date(fDateTo) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  homeFilteredTx = data.filter(tx => {
    // Fecha
    if (fromDate || toDate) {
      const d = tx.dateObj;
      if (d) {
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
      }
    }
    // Cuenta
    if (fAcc !== 'all' && (tx.AC_NO || tx.origen) !== fAcc) return false;
    // Monto
    const amt = Math.abs(tx.LCY_AMOUNT || tx.monto || 0);
    if (fMin && amt < Number(fMin)) return false;
    if (fMax && amt > Number(fMax)) return false;
    // Naturaleza
    if (fNature !== 'all' && (tx.DRCR_IND || tx.nature) !== fNature) return false;

    return true;
  });

  // Paginación
  const total = homeFilteredTx.length;
  const PAGE_SIZE_HOME = 10;
  const totalPages = Math.ceil(total / PAGE_SIZE_HOME) || 1;
  const start = (homeCurrentPage - 1) * PAGE_SIZE_HOME;
  const paginated = homeFilteredTx.slice(start, start + PAGE_SIZE_HOME);

  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)">No se encontraron movimientos</td></tr>';
    renderHomePagination(0, 1);
    return;
  }

  tbody.innerHTML = paginated.map(tx => {
    const isD = (tx.DRCR_IND || tx.nature) === 'D';
    const amount = tx.LCY_AMOUNT || tx.monto || 0;
    const dateStr = tx.date || (tx.dateObj ? tx.dateObj.toLocaleDateString() : '—');
    const acc = tx.AC_NO || tx.origen || '—';
    const ref = tx.TRN_REF_NO || tx.ref || '—';
    const desc = tx.TRN_DESC || tx.name || '—';

    return `
      <tr>
        <td style="font-family:'DM Mono',monospace;font-weight:600">${dateStr}</td>
        <td style="font-family:'DM Mono',monospace;font-size:11.5px">${acc}</td>
        <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted)">${ref}</td>
        <td><div class="tx-name" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${desc}">${desc}</div></td>
        <td><span class="badge ${isD ? 'badge-gold' : 'badge-teal'}">${isD ? 'DÉBITO' : 'CRÉDITO'}</span></td>
        <td style="text-align:right;font-family:'DM Mono',monospace;font-weight:700;color:${isD ? 'var(--gold)' : 'var(--green)'}">$${Math.abs(amount).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
        <td style="text-align:right"><button class="btn btn-ghost" style="padding:4px 10px;font-size:11px" onclick="openHomeTxDetail('${ref}')">Ver</button></td>
      </tr>
    `;
  }).join('');

  renderHomePagination(total, totalPages);
}

function renderHomePagination(total, totalPages) {
  const container = document.getElementById('home-movements-pagination');
  if (!container) return;

  let html = `<div class="page-info">Página ${homeCurrentPage} de ${totalPages} · ${total} movimientos</div><div class="page-btns">`;
  html += `<button class="page-btn" onclick="renderHomeMovements(${Math.max(1, homeCurrentPage - 1)})" ${homeCurrentPage === 1 ? 'disabled' : ''}>‹</button>`;
  
  // Mostrar algunas páginas
  const startP = Math.max(1, homeCurrentPage - 1);
  const endP = Math.min(totalPages, startP + 2);
  for (let i = startP; i <= endP; i++) {
    html += `<button class="page-btn ${i === homeCurrentPage ? 'active' : ''}" onclick="renderHomeMovements(${i})">${i}</button>`;
  }

  html += `<button class="page-btn" onclick="renderHomeMovements(${Math.min(totalPages, homeCurrentPage + 1)})" ${homeCurrentPage === totalPages ? 'disabled' : ''}>›</button>`;
  html += `</div>`;
  container.innerHTML = html;
}

function openHomeTxDetail(ref) {
  // Reutilizar el modal existente
  if (typeof openTx2Modal === 'function') {
    openTx2Modal(ref);
  } else if (typeof openTxModal === 'function') {
    openTxModal(ref);
  }
}

// Inicializar página home cuando DOM esté listo
window.addEventListener('DOMContentLoaded', initHomePage);

// ── Cuentas: Tabla Resumen ──────────────────────────────────
function renderCuentasTable() {
  const tbody = document.getElementById('cuentas-resumen-tbody');
  const countLabel = document.getElementById('cuentas-total-count');
  
  if (!tbody || !countLabel) return;
  
  const cuentasData = (typeof window.datosProductos !== 'undefined') ? window.datosProductos : [];
  
  countLabel.textContent = `${cuentasData.length} CUENTAS`;
  
  if (cuentasData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">No hay cuentas disponibles</td></tr>';
    return;
  }
  
  const fmt = (val) => '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  tbody.innerHTML = cuentasData.map(c => {
    const isActiva = (c.Estado || '').toUpperCase() === 'ACTIVA';
    const num = c.Cuenta || '—';
    const tipo = (c.Tipo_Cuenta || '—').toUpperCase();
    const actual = Number(c.Saldo_Actual) || 0;
    
    // El JSON tiene un espacio en la clave " Saldo_dia_Anterior "
    let anteriorRaw = c[" Saldo_dia_Anterior "];
    if (anteriorRaw === undefined) anteriorRaw = c.Saldo_dia_Anterior;
    const anterior = Number(anteriorRaw) || 0;
    
    let varPercent = 0;
    if (anterior !== 0) {
      varPercent = ((actual - anterior) / anterior) * 100;
    }
    const isPos = varPercent >= 0;
    const varText = anterior !== 0 ? `${isPos ? '+' : ''}${varPercent.toFixed(2)}% vs ayer` : '—';
    const varColor = isPos ? 'var(--green)' : 'var(--gold)'; 
    
    return `
      <tr>
        <td style="font-family:'DM Mono',monospace;font-weight:600;font-size:13px">${num}</td>
        <td><span class="badge ${tipo==='CORRIENTE'?'badge-blue':'badge-teal'}">${tipo}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:8px;height:8px;border-radius:50%;background:${isActiva ? 'var(--green)' : 'var(--text-muted)'}"></div>
            <span style="font-size:11px;font-weight:600;color:${isActiva ? 'var(--green)' : 'var(--text-muted)'}">${c.Estado}</span>
          </div>
        </td>
        <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--text-secondary)">${fmt(anterior)}</td>
        <td style="text-align:right;font-family:'DM Mono',monospace;font-weight:700;color:var(--text-primary);font-size:13px">${fmt(actual)}</td>
        <td style="text-align:center;font-size:11px;font-weight:600;color:${varColor}">${varText}</td>
      </tr>
    `;
  }).join('');
}

// Render al cargar el DOM o después de que se cargue datosdos.js
document.addEventListener('DOMContentLoaded', renderCuentasTable);
// Llama directamente por si datosdos.js se cargó antes
renderCuentasTable();

// ════ RENDERIZADO TABLA CDT ═══════════════════════════════
window.renderCDTTable = function() {
  const tbody = document.getElementById('cdt-resumen-tbody');
  const tag = document.getElementById('cdt-active-tag');
  if (!tbody) return;

  const cdts = window.datosCDTDOS || [];
  
  if (tag) {
    tag.textContent = cdts.length + ' CERTIFICADOS';
  }

  if (cdts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px">No hay CDTs disponibles</td></tr>';
    return;
  }

  const fmt = (num) => '$' + Number(num).toLocaleString('en-US', {minimumFractionDigits: 2});

  let html = '';
  cdts.forEach(cdt => {
    const isActivo = String(cdt.ESTADO).toUpperCase() === 'ACTIVO';
    const estadoColor = isActivo ? 'var(--green)' : 'var(--gold)';
    const tasa = cdt.TASA_NOMI ? Number(cdt.TASA_NOMI).toFixed(2) + '%' : 'N/A';
    
    let fecha = 'N/A';
    if (cdt.FECHA_VCTO) {
      const d = new Date(cdt.FECHA_VCTO);
      if (!isNaN(d.getTime())) {
        fecha = d.toLocaleDateString('es-CO', { year:'numeric', month:'short', day:'2-digit' });
      }
    }

    html += `
      <tr>
        <td style="font-family:'DM Mono',monospace;font-weight:600;font-size:13px">${cdt.CDT}</td>
        <td><span class="tx-name" style="color:var(--text-primary)">${cdt.TITULAR || 'N/A'}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:8px;height:8px;border-radius:50%;background:${estadoColor}"></div>
            <span style="font-size:11px;font-weight:600;color:${estadoColor}">${cdt.ESTADO}</span>
          </div>
        </td>
        <td style="text-align:center;font-family:'DM Mono',monospace;color:var(--text-secondary)">${tasa}</td>
        <td style="text-align:right;font-family:'DM Mono',monospace;font-weight:700;color:var(--text-primary);font-size:13px">${fmt(cdt.CAPITAL)}</td>
        <td style="text-align:right;font-size:12px;color:var(--text-secondary)">${fecha}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

document.addEventListener('DOMContentLoaded', window.renderCDTTable);
window.renderCDTTable();