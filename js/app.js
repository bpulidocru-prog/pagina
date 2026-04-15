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
  if (typeof window.datosBancarios === 'undefined' || !window.datosBancarios.length) {
    showToast('No se encontró datos.js o está vacío', '⚠️');
    return;
  }
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

  const uniqueOrigins = [...new Set(allTx.map(t => t.origen).filter(Boolean))].sort();
  const accFilter = document.getElementById('account-filter');
  if (accFilter) {
    accFilter.innerHTML = '<option value="all">Cuenta Origen: Todas</option>' + 
      uniqueOrigins.map(acc => `<option value="${acc}">${acc}</option>`).join('');
  }

  renderTransactions(1);
  showToast(`Datos cargados: ${allTx.length} registros`, '📥');
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

// ════ NAVIGATION ══════════════════════════════════════════
function navigate(page) {
  ['home','cuentas','creditos','pagos','flujo'].forEach(p => {
    document.getElementById('page-'+p).classList.remove('active');
    const n = document.getElementById('nav-'+p);
    if(n) n.classList.remove('active');
  });
  document.getElementById('page-'+page).classList.add('active');
  const nav = document.getElementById('nav-'+page);
  if(nav) nav.classList.add('active');

  if(page==='home') setTimeout(initHomeChart, 80);
  if(page==='cuentas') { renderTransactions(); setTimeout(()=>{ const bi=document.getElementById('bar-in'); const bo=document.getElementById('bar-out'); if(bi)bi.style.width='70%'; if(bo)bo.style.width='30%'; },150); }
  if(page==='pagos') { renderApprovals(); setTimeout(()=>{ const lp=document.getElementById('lote-progress'); if(lp)lp.style.width='78%'; },200); }
  if(page==='flujo') setTimeout(()=>{ initFlujoChart(); initDonut(); },80);

  // scroll to top
  window.scrollTo({top: 0, behavior: 'instant'});

  // sync bottom nav active state
  ['home','cuentas','pagos','flujo'].forEach(p => {
    const btn = document.getElementById('bnav-' + p);
    if (btn) btn.classList.toggle('active', p === page);
  });

  // sync pagos badge in bottom nav
  if (typeof approvalsData !== 'undefined') {
    const pending = approvalsData.filter(a => a.state === 'pendiente').length;
    const bb = document.getElementById('bnav-badge');
    if (bb) bb.textContent = pending > 0 ? pending : '';
  }
}

function switchTab(tab) {
  document.querySelectorAll('.topbar-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  if(tab==='liquidez') navigate('flujo');
  else if(tab==='tesoreria') navigate('home');
  else showToast('Módulo Inversiones — próximamente','📈');
}

// ════ HOME CHART ══════════════════════════════════════════
let homeChart = null;
const hcd = {
  diario: { labels:['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'], income:[18000,24000,15000,58000,32000,12000,8000], expense:[12000,8000,22000,14000,28000,5000,3000] },
  semanal: { labels:['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5'], income:[112000,145000,98000,187000,76000], expense:[89000,102000,71000,143000,55000] }
};
function initHomeChart(mode='diario') {
  const ctx = document.getElementById('homeChart'); if(!ctx)return;
  if(homeChart) homeChart.destroy();
  const d = hcd[mode];
  homeChart = new Chart(ctx, { type:'bar', data:{ labels:d.labels, datasets:[
    { label:'Ingresos', data:d.income, backgroundColor:d.income.map((v,i)=>v===Math.max(...d.income)?'rgba(232,160,32,0.85)':'rgba(62,207,142,0.25)'), borderRadius:5, borderSkipped:false, barPercentage:0.5 },
    { label:'Egresos', data:d.expense, backgroundColor:'rgba(26,46,90,0.08)', borderRadius:5, borderSkipped:false, barPercentage:0.5 }
  ]}, options:{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#1a3352', borderColor:'rgba(255,255,255,0.1)', borderWidth:1, titleColor:'#f0f4f8', bodyColor:'#8fa8c0', callbacks:{ label:c=>` $${c.raw.toLocaleString('es-CO')}` }}}, scales:{ x:{ grid:{display:false}, ticks:{color:'#516a80',font:{family:'Sora',size:11}}, border:{display:false} }, y:{display:false} }, animation:{duration:500,easing:'easeOutQuart'} }});
}
function switchHomeChart(mode) {
  document.getElementById('btn-diario').classList.toggle('active',mode==='diario');
  document.getElementById('btn-semanal').classList.toggle('active',mode==='semanal');
  initHomeChart(mode);
}

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

  document.getElementById('tx-tbody').innerHTML = paginated.map(tx=>`
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

// ════ APPROVALS ═══════════════════════════════════════════
function renderApprovals() {
  const pending = approvalsData.filter(a=>a.state==='pendiente').length;
  const badge = document.getElementById('approval-badge');
  const navBadge = document.getElementById('pagos-badge');
  if(badge) badge.textContent = pending > 0 ? `${pending} Acción Requerida` : 'Todo aprobado ✓';
  if(navBadge) navBadge.textContent = pending;

  // sync badge
  setTimeout(() => {
    const pending = approvalsData.filter(a => a.state === 'pendiente').length;
    const bb = document.getElementById('bnav-badge');
    if (bb) bb.textContent = pending > 0 ? pending : '';
    const nb = document.getElementById('pagos-badge');
    if (nb) nb.textContent = pending;
  }, 0);
  document.getElementById('approvals-tbody').innerHTML = approvalsData.map((a,i)=>`
    <tr>
      <td><div class="avatar-chip">${a.initials}</div></td>
      <td><div class="tx-name">${a.name}</div><div class="tx-ref">${a.sub}</div></td>
      <td><span class="badge ${a.cat==='IMPUESTOS'?'badge-red':'badge-teal'}">${a.cat}</span></td>
      <td><div class="tx-amount" style="${a.state==='rechazado'?'color:var(--text-muted)':''}">$${a.amount.toLocaleString('en-US',{minimumFractionDigits:2})}</div><div class="tx-ref">${a.currency}</div></td>
      <td style="font-size:12px;color:var(--text-secondary)">${a.date}</td>
      <td>
        ${a.state==='rechazado'
          ? `<div><span style="font-size:11px;color:var(--red);font-weight:600">RECHAZADO</span><div class="tx-ref">${a.note||''}</div></div>`
          : a.state==='completado'
          ? `<span style="font-size:11px;color:var(--green);font-weight:600">✓ APROBADO</span>`
          : `<div style="display:flex;gap:6px"><button class="action-btn action-approve" onclick="approveItem(${i})">Aprobar</button><button class="action-btn action-reject" onclick="rejectItem(${i})">✕</button><button class="action-btn action-reject" onclick="showToast('Vista detalle: ${a.name}','👁️')">👁</button></div>`}
      </td>
    </tr>`).join('');
}

function approveItem(i) {
  approvalsData[i].state = 'completado';
  showToast(`✅ Aprobado: ${approvalsData[i].name}`, '✅');
  renderApprovals();
}
function rejectItem(i) {
  approvalsData[i].state = 'rechazado';
  approvalsData[i].note = 'Rechazado por Mario Botina';
  showToast(`Rechazado: ${approvalsData[i].name}`, '❌');
  renderApprovals();
}
function approveAll() {
  approvalsData.forEach(a=>{ if(a.state==='pendiente') a.state='completado'; });
  showToast('Lote completo aprobado — Mario Botina', '✅');
  renderApprovals();
}

// ════ FLUJO CHARTS ════════════════════════════════════════
let flujoChart = null, donutChart = null, scenarioOn = false;
const fcd = {
  baseline: { labels:['AGO','SEP','OCT','NOV','DIC','ENE'], data:[18000000,19500000,21200000,22800000,23900000,24850200] },
  expansion: { labels:['AGO','SEP','OCT','NOV','DIC','ENE'], data:[18000000,20100000,22500000,25000000,27200000,29800000] }
};

function initFlujoChart(sc='baseline') {
  const ctx = document.getElementById('flujoChart'); if(!ctx)return;
  if(flujoChart) flujoChart.destroy();
  const d = fcd[sc];
  flujoChart = new Chart(ctx, { type:'line', data:{ labels:d.labels, datasets:[{ data:d.data,
    borderColor: sc==='expansion'?'rgba(62,207,142,0.9)':'rgba(232,160,32,0.9)',
    backgroundColor: sc==='expansion'?'rgba(62,207,142,0.07)':'rgba(232,160,32,0.07)',
    fill:true, tension:0.45, borderWidth:2.5, pointRadius:3,
    pointBackgroundColor: sc==='expansion'?'var(--green)':'var(--gold)'
  }]}, options:{ responsive:true, maintainAspectRatio:true,
    plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#1a3352', borderColor:'rgba(255,255,255,0.1)', borderWidth:1, titleColor:'#f0f4f8', bodyColor:'#8fa8c0', callbacks:{ label:c=>` $${(c.raw/1000000).toFixed(1)}M` }}},
    scales:{ x:{ grid:{display:false}, ticks:{color:'#516a80',font:{family:'Sora',size:11}}, border:{display:false} }, y:{display:false} },
    animation:{duration:600,easing:'easeOutQuart'} }});
}

function switchFlujo(sc) {
  document.getElementById('btn-baseline').classList.toggle('active', sc==='baseline');
  document.getElementById('btn-expansion').classList.toggle('active', sc==='expansion');
  const amt = sc==='baseline' ? '24,850,200.00' : '29,800,000.00';
  document.getElementById('flujo-amount').innerHTML = `<span>$</span>${amt}`;
  initFlujoChart(sc);
  updateDonut(sc==='expansion'?92:85);
}

function initDonut(score=85) {
  const ctx = document.getElementById('donutChart'); if(!ctx)return;
  if(donutChart) donutChart.destroy();
  donutChart = new Chart(ctx, { type:'doughnut', data:{ datasets:[{ data:[score,100-score], backgroundColor:['rgba(232,160,32,0.9)','rgba(26,46,90,0.08)'], borderWidth:0, borderRadius:4 }]}, options:{ cutout:'75%', responsive:false, plugins:{legend:{display:false},tooltip:{enabled:false}}, animation:{duration:800,easing:'easeOutQuart'} }});
  document.getElementById('health-num').textContent = score;
}

function updateDonut(score) {
  if(!donutChart)return;
  donutChart.data.datasets[0].data = [score, 100-score];
  donutChart.data.datasets[0].backgroundColor[0] = score>=90?'rgba(62,207,142,0.9)':'rgba(232,160,32,0.9)';
  donutChart.update();
  document.getElementById('health-num').textContent = score;
  document.getElementById('health-label').textContent = score>=90?'EXCEPCIONAL+':'EXCEPCIONAL';
  document.getElementById('health-label').style.color = score>=90?'var(--green)':'var(--gold)';
}

function toggleScenario() {
  scenarioOn = !scenarioOn;
  const track = document.getElementById('sw-track');
  const thumb = document.getElementById('sw-thumb');
  const warning = document.getElementById('scenario-warning');
  track.classList.toggle('sw-on', scenarioOn);
  thumb.style.transform = scenarioOn ? 'translateX(18px)' : 'translateX(0)';
  warning.style.display = scenarioOn ? 'block' : 'none';
  if(scenarioOn) showToast('Escenario estrés activado: -15% en cobros','⚠️');
  else showToast('Escenario hipotético desactivado','ℹ️');
}

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
  initHomeChart();
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

// navigateMobile: thin wrapper — navigate() handles bnav sync internally
function navigateMobile(page) {
  navigate(page);
}