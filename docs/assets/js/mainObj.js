'use strict';

/* ======================================================
   CLASE: Categoria
   ====================================================== */
class Categoria {
  constructor({idCategoria, nombre, presupuestoMensual = 0, codigoColor = '#00e5a0'}) {
    this.idCategoria = idCategoria;
    this.nombre = nombre;
    this.presupuestoMensual = parseFloat(presupuestoMensual);
    this.codigoColor = codigoColor;
  }
  obtenerMontoGastado(transacciones) {
    return transacciones
      .filter(t => t.idCategoria === this.idCategoria && t.tipo === 'gasto')
      .reduce((s, t) => s + t.monto, 0);
  }
  estaFueraDePresupuesto(transacciones) {
    if (!this.presupuestoMensual) return false;
    return this.obtenerMontoGastado(transacciones) > this.presupuestoMensual;
  }
  toJSON() {
    return {idCategoria:this.idCategoria,nombre:this.nombre,
      presupuestoMensual:this.presupuestoMensual,codigoColor:this.codigoColor};
  }
}

/* ======================================================
   CLASE: Transaccion
   ====================================================== */
class Transaccion {
  constructor({idTransaccion, monto, fecha, descripcion = '', tipo = 'gasto',
               idCategoria = null, esAutomatizada = false}) {
    this.idTransaccion = idTransaccion;
    this.monto = parseFloat(monto);
    this.fecha = fecha;
    this.descripcion = descripcion;
    this.tipo = tipo; // 'gasto' | 'ingreso'
    this.idCategoria = idCategoria;
    this.esAutomatizada = esAutomatizada;
  }
  actualizarCategoria(idCat) { this.idCategoria = idCat; }
  dividirTransaccion(montos) {
    return montos.map((m, i) => new Transaccion({
      idTransaccion: this.idTransaccion + '_' + i,
      monto: m, fecha: this.fecha,
      descripcion: this.descripcion + ' (parte ' + (i+1) + ')',
      tipo: this.tipo, idCategoria: this.idCategoria
    }));
  }
  toJSON() {
    return {idTransaccion:this.idTransaccion,monto:this.monto,
      fecha:this.fecha,descripcion:this.descripcion,
      tipo:this.tipo,idCategoria:this.idCategoria,
      esAutomatizada:this.esAutomatizada};
  }
}

/* ======================================================
   CLASE: Cuenta
   ====================================================== */
class Cuenta {
  constructor({idCuenta, tipo = 'débito', hashContrasena = '',
               saldoActual = 0, nombreInstitucion = 'FinTrack',
               ultimaSincronizacion = new Date().toISOString()}) {
    this.idCuenta = idCuenta;
    this.tipo = tipo;
    this.hashContrasena = hashContrasena;
    this.saldoActual = parseFloat(saldoActual);
    this.nombreInstitucion = nombreInstitucion;
    this.ultimaSincronizacion = ultimaSincronizacion;
  }
  sincronizarReporte(transacciones) {
    const ingresos = transacciones.filter(t=>t.tipo==='ingreso').reduce((s,t)=>s+t.monto,0);
    const gastos   = transacciones.filter(t=>t.tipo==='gasto').reduce((s,t)=>s+t.monto,0);
    this.saldoActual = ingresos - gastos;
    this.ultimaSincronizacion = new Date().toISOString();
    return [ingresos, gastos, this.saldoActual];
  }
  obtenerEstadoCuenta() {
    return `Cuenta ${this.tipo} — ${this.nombreInstitucion} | Saldo: $${this.saldoActual.toFixed(2)}`;
  }
  toJSON() {
    return {idCuenta:this.idCuenta,tipo:this.tipo,hashContrasena:this.hashContrasena,
      saldoActual:this.saldoActual,nombreInstitucion:this.nombreInstitucion,
      ultimaSincronizacion:this.ultimaSincronizacion};
  }
}

/* ======================================================
   CLASE: MetaAhorro
   ====================================================== */
class MetaAhorro {
  constructor({idMeta, nombre, emoji = '🎯', montoObjetivo, ahorroActual = 0, fechaLimite}) {
    this.idMeta = idMeta;
    this.nombre = nombre;
    this.emoji = emoji;
    this.montoObjetivo = parseFloat(montoObjetivo);
    this.ahorroActual = parseFloat(ahorroActual);
    this.fechaLimite = fechaLimite;
  }
  porcentajeProgreso() {
    if (!this.montoObjetivo) return 0;
    return Math.min(100, Math.round((this.ahorroActual / this.montoObjetivo) * 100));
  }
  aplicarRedondeo(monto) {
    const redondeo = Math.ceil(monto) - monto;
    if (redondeo > 0) this.ahorroActual += redondeo;
  }
  diasRestantes() {
    const hoy = new Date();
    const limite = new Date(this.fechaLimite);
    return Math.max(0, Math.ceil((limite - hoy) / 86400000));
  }
  toJSON() {
    return {idMeta:this.idMeta,nombre:this.nombre,emoji:this.emoji,
      montoObjetivo:this.montoObjetivo,ahorroActual:this.ahorroActual,
      fechaLimite:this.fechaLimite};
  }
}

/* ======================================================
   CLASE: Suscripcion
   ====================================================== */
class Suscripcion {
  constructor({idSuscripcion, nombreServicio, emoji='💳', costo,
               frecuenciaCobro = 'mensual', proximaFechaPago}) {
    this.idSuscripcion = idSuscripcion;
    this.nombreServicio = nombreServicio;
    this.emoji = emoji;
    this.costo = parseFloat(costo);
    this.frecuenciaCobro = frecuenciaCobro;
    this.proximaFechaPago = proximaFechaPago;
  }
  estimarCostoAnual() {
    const m = {'semanal':52,'mensual':12,'trimestral':4,'anual':1};
    return this.costo * (m[this.frecuenciaCobro] || 12);
  }
  estimarCostoMensual() {
    const m = {'semanal':4.33,'mensual':1,'trimestral':1/3,'anual':1/12};
    return this.costo * (m[this.frecuenciaCobro] || 1);
  }
  estimarCostoSemanal() {
    const m = {'semanal':1,'mensual':1/4.33,'trimestral':1/13,'anual':1/52};
    return this.costo * (m[this.frecuenciaCobro] || 1/4.33);
  }
  recordatorioCancelacion() {
    const dias = Math.ceil((new Date(this.proximaFechaPago) - new Date()) / 86400000);
    return dias <= 7 ? `⚠️ Cobro de ${this.nombreServicio} en ${dias} días` : null;
  }
  toJSON() {
    return {idSuscripcion:this.idSuscripcion,nombreServicio:this.nombreServicio,
      emoji:this.emoji,costo:this.costo,frecuenciaCobro:this.frecuenciaCobro,
      proximaFechaPago:this.proximaFechaPago};
  }
}

/* ======================================================
   CLASE: DocumentoOCR
   ====================================================== */
class DocumentoOCR {
  constructor({idDocumento, urlArchivo = '', textPlano = '', camposExtraidos = {}}) {
    this.idDocumento = idDocumento;
    this.urlArchivo = urlArchivo;
    this.textPlano = textPlano;
    this.camposExtraidos = camposExtraidos;
  }
  procesarArchivo(archivo) {
    // Simulación OCR: extrae campos del nombre del archivo
    this.urlArchivo = archivo.name;
    this.camposExtraidos = {
      RFC_Emisor: 'SAT0000000' + Math.floor(Math.random()*999),
      Folio: 'CFDI-' + Math.random().toString(36).substr(2,9).toUpperCase(),
      IVA: '$' + (Math.random() * 500 + 10).toFixed(2),
      MontoTotal: '$' + (Math.random() * 5000 + 100).toFixed(2),
      FechaEmision: new Date().toISOString().split('T')[0]
    };
    this.textPlano = JSON.stringify(this.camposExtraidos);
    return this.camposExtraidos;
  }
  generarHash() {
    // Simulación hash SHA-256 (checksum rápido para demo)
    let h = 0;
    for(let i=0;i<this.textPlano.length;i++) h=((h<<5)-h)+this.textPlano.charCodeAt(i)|0;
    return 'sha256:' + Math.abs(h).toString(16).padStart(8,'0') + '...';
  }
  toJSON() {
    return {idDocumento:this.idDocumento,urlArchivo:this.urlArchivo,
      textPlano:this.textPlano,camposExtraidos:this.camposExtraidos};
  }
}

/* ======================================================
   CLASE: Usuario
   ====================================================== */
class Usuario {
  constructor({idUsuario, correoElectronico, hashContrasena,
               secretoMFA = '', consentimiento = true, ultimoAcceso = null}) {
    this.idUsuario = idUsuario;
    this.correoElectronico = correoElectronico;
    this.hashContrasena = hashContrasena;
    this.secretoMFA = secretoMFA;
    this.consentimiento = consentimiento;
    this.ultimoAcceso = ultimoAcceso || new Date().toISOString();
  }
  autenticar(pass) {
    return this._hashSimple(pass) === this.hashContrasena;
  }
  cerrarSesion() {
    this.ultimoAcceso = new Date().toISOString();
    return true;
  }
  habilitarMFA() { this.secretoMFA = Math.random().toString(36).substr(2,16); }
  exportarDatosPersonales() {
    return JSON.stringify({
      idUsuario:this.idUsuario,
      correoElectronico:this.correoElectronico,
      consentimiento:this.consentimiento,
      ultimoAcceso:this.ultimoAcceso
    }, null, 2);
  }
  _hashSimple(str) {
    let h = 5381;
    for(let i=0;i<str.length;i++) h=((h<<5)+h)+str.charCodeAt(i)|0;
    return 'h' + Math.abs(h).toString(16);
  }
  static crearHash(pass) {
    let h = 5381;
    for(let i=0;i<pass.length;i++) h=((h<<5)+h)+pass.charCodeAt(i)|0;
    return 'h' + Math.abs(h).toString(16);
  }
  toJSON() {
    return {idUsuario:this.idUsuario,correoElectronico:this.correoElectronico,
      hashContrasena:this.hashContrasena,consentimiento:this.consentimiento,
      ultimoAcceso:this.ultimoAcceso};
  }
}

/* ======================================================
   CLASE: GestorFinanciero
   ====================================================== */
class GestorFinanciero {
  constructor(cuenta, transacciones, categorias) {
    this.cuenta = cuenta;
    this.transacciones = transacciones;
    this.categorias = categorias;
  }
  crearMovimiento(datos) {
    const id = 'tx-' + Date.now();
    const tx = new Transaccion({idTransaccion:id, ...datos});
    this.transacciones.push(tx);
    if(datos.aplicarRedondeo && datos.tipo==='gasto') {
      // Notificación de redondeo - será manejado por App
      tx._redondeo = Math.ceil(datos.monto) - datos.monto;
    }
    this.cuenta.sincronizarReporte(this.transacciones);
    return tx;
  }
  calcularPresupuestos() {
    return this.categorias.map(cat => ({
      categoria: cat,
      gastado: cat.obtenerMontoGastado(this.transacciones),
      presupuesto: cat.presupuestoMensual,
      fueraDePresupuesto: cat.estaFueraDePresupuesto(this.transacciones)
    }));
  }
  sincronizarAPIBancaria() {
    // Simula sincronización
    this.cuenta.ultimaSincronizacion = new Date().toISOString();
    return true;
  }
  gastosPorCategoria() {
    const map = {};
    this.transacciones.filter(t=>t.tipo==='gasto').forEach(t => {
      const k = t.idCategoria || 'sin-cat';
      map[k] = (map[k] || 0) + t.monto;
    });
    return map;
  }
  totalIngresos() {
    return this.transacciones.filter(t=>t.tipo==='ingreso').reduce((s,t)=>s+t.monto,0);
  }
  totalGastos() {
    return this.transacciones.filter(t=>t.tipo==='gasto').reduce((s,t)=>s+t.monto,0);
  }
  sugerirMonto(idCategoria) {
    const txCat = this.transacciones.filter(t=>t.idCategoria===idCategoria&&t.tipo==='gasto');
    if(!txCat.length) return null;
    return (txCat.reduce((s,t)=>s+t.monto,0)/txCat.length).toFixed(2);
  }
}

/* ======================================================
   CLASE: ControladorAutenticacion
   ====================================================== */
class ControladorAutenticacion {
  constructor() {
    this._intentos = 0;
    this._maxIntentos = 3;
    this._bloqueado = false;
    this._timerLock = null;
  }
  validarCredenciales(correo, pass, usuarios) {
    if(this._bloqueado) return {ok:false, error:'bloqueado'};
    const u = usuarios.find(u => u.correoElectronico === correo);
    if(!u || !u.autenticar(pass)) {
      this._intentos++;
      if(this._intentos >= this._maxIntentos) {
        this._bloqueado = true;
        return {ok:false, error:'bloqueado'};
      }
      return {ok:false, error:'credenciales', restantes: this._maxIntentos - this._intentos};
    }
    this._intentos = 0;
    u.ultimoAcceso = new Date().toISOString();
    return {ok:true, usuario:u};
  }
  gestionarMFA(usuario) { usuario.habilitarMFA(); }
  resetBloqueo() { this._bloqueado = false; this._intentos = 0; }
}

/* ======================================================
   CLASE: EnrutadorPrincipal
   ====================================================== */
class EnrutadorPrincipal {
  constructor() { this._seccion = 'dashboard'; }
  despacharRuta(url) {
    this._seccion = url;
    document.querySelectorAll('.section-panel').forEach(s => s.classList.remove('active'));
    const sec = document.getElementById('sec-' + url);
    if(sec) sec.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.section === url);
    });
    const titles = {
      dashboard:'Dashboard',transacciones:'Transacciones',
      ocr:'Escanear PDF',suscripciones:'Suscripciones',
      metas:'Metas de Ahorro',soporte:'Asistencia Técnica',perfil:'Perfil'
    };
    document.getElementById('topbar-title').textContent = titles[url] || url;
  }
  getSeccion() { return this._seccion; }
}

/* ======================================================
   CLASE: VistaDashboard
   ====================================================== */
class VistaDashboard {
  constructor(gestorFinanciero) { this.gf = gestorFinanciero; }
  actualizarSaldos() {
    const [ing, gas, saldo] = this.gf.cuenta.sincronizarReporte(this.gf.transacciones);
    const grid = document.getElementById('stats-grid');
    if(!grid) return;
    grid.innerHTML = `
      <div class="stat-card green">
        <div class="stat-label">Saldo Disponible</div>
        <div class="stat-value ${saldo>=0?'green':'red'} mono">$${saldo.toFixed(2)}</div>
        <div class="stat-delta">${this.gf.cuenta.nombreInstitucion}</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">Ingresos Totales</div>
        <div class="stat-value blue mono">$${ing.toFixed(2)}</div>
        <div class="stat-delta">Este mes</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Gastos Totales</div>
        <div class="stat-value red mono">$${gas.toFixed(2)}</div>
        <div class="stat-delta">Este mes</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-label">Transacciones</div>
        <div class="stat-value purple mono">${this.gf.transacciones.length}</div>
        <div class="stat-delta">Registros totales</div>
      </div>
    `;
  }
}

/* ======================================================
   CLASE: ModalRegistroGasto
   ====================================================== */
class ModalRegistroGasto {
  constructor() { this._tipo = 'gasto'; }
  abrir() {
    App.openModal('modal-gasto');
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('mov-fecha').value = hoy;
  }
  cerrar() { App.closeModal('modal-gasto'); }
  setTipo(t) {
    this._tipo = t;
    document.getElementById('seg-gasto').classList.toggle('active', t==='gasto');
    document.getElementById('seg-ingreso').classList.toggle('active', t==='ingreso');
  }
  getTipo() { return this._tipo; }
}

/* ======================================================
   CLASE: ChartEngine (Canvas puro)
   ====================================================== */
class ChartEngine {
  static drawDonut(canvasId, data, labels, colors) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0,0,W,H);
    if(!data.length || data.every(d=>d===0)) {
      ctx.fillStyle='#8896b0'; ctx.font='13px Plus Jakarta Sans';
      ctx.textAlign='center'; ctx.fillText('Sin datos', W/2, H/2); return;
    }
    const total = data.reduce((s,d)=>s+d,0);
    const cx=W/2, cy=H/2;
    const r=Math.min(W,H)*0.38, ri=r*0.58;
    let angle=-Math.PI/2;
    data.forEach((d,i) => {
      const slice = (d/total)*2*Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,angle,angle+slice);
      ctx.closePath();
      ctx.fillStyle=colors[i%colors.length];
      ctx.fill();
      angle+=slice;
    });
    // Donut hole
    ctx.beginPath();
    ctx.arc(cx,cy,ri,0,2*Math.PI);
    ctx.fillStyle='#0f1623';
    ctx.fill();
    // Center text
    ctx.fillStyle='#e8edf5';
    ctx.font='bold 14px JetBrains Mono,monospace';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('$'+total.toFixed(0), cx, cy);
    // Legend
    const legendX = 14, legendY = H*0.1;
    const visibleLabels = Math.min(labels.length, 5);
    for(let i=0;i<visibleLabels;i++) {
      const y = legendY + i*22;
      ctx.fillStyle=colors[i%colors.length];
      ctx.fillRect(legendX, y-6, 10, 10);
      ctx.fillStyle='#8896b0';
      ctx.font='11px Plus Jakarta Sans';
      ctx.textAlign='left';
      ctx.textBaseline='middle';
      const label = labels[i].length>14 ? labels[i].substr(0,12)+'…' : labels[i];
      ctx.fillText(label+' ('+((data[i]/total)*100).toFixed(0)+'%)', legendX+14, y);
    }
  }
  static drawBars(canvasId, labels, incData, gasData) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0,0,W,H);
    if(!labels.length) {
      ctx.fillStyle='#8896b0'; ctx.font='13px Plus Jakarta Sans';
      ctx.textAlign='center'; ctx.fillText('Sin datos', W/2, H/2); return;
    }
    const pad={l:45,r:10,t:10,b:30};
    const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
    const allVals=[...incData,...gasData];
    const maxV=Math.max(...allVals,1);
    const bw=(cW/labels.length)*0.3;
    const gap=(cW/labels.length)*0.4;
    // Grid lines
    for(let i=0;i<=4;i++) {
      const y=pad.t+cH-(i/4)*cH;
      ctx.strokeStyle='#1e2d45'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
      ctx.fillStyle='#4a5568'; ctx.font='10px JetBrains Mono,monospace';
      ctx.textAlign='right'; ctx.textBaseline='middle';
      ctx.fillText('$'+(maxV*i/4).toFixed(0), pad.l-4, y);
    }
    labels.forEach((lbl,i) => {
      const x=pad.l + i*(cW/labels.length) + gap/2;
      // Income bar
      const ih=(incData[i]/maxV)*cH;
      ctx.fillStyle='#00e5a0';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x,pad.t+cH-ih,bw,ih,3) :
        ctx.rect(x,pad.t+cH-ih,bw,ih);
      ctx.fill();
      // Expense bar
      const gh=(gasData[i]/maxV)*cH;
      ctx.fillStyle='#f43f5e';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x+bw+2,pad.t+cH-gh,bw,gh,3) :
        ctx.rect(x+bw+2,pad.t+cH-gh,bw,gh);
      ctx.fill();
      ctx.fillStyle='#4a5568'; ctx.font='10px Plus Jakarta Sans';
      ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.fillText(lbl.substr(0,3), x+bw, pad.t+cH+4);
    });
    // Legend
    ctx.fillStyle='#00e5a0'; ctx.fillRect(W-110,8,10,10);
    ctx.fillStyle='#f43f5e'; ctx.fillRect(W-60,8,10,10);
    ctx.fillStyle='#8896b0'; ctx.font='10px Plus Jakarta Sans';
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText('Ingresos', W-97, 13); ctx.fillText('Gastos', W-47, 13);
  }
  static drawSubsPie(canvasId, subs) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio||1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width*dpr; canvas.height = rect.height*dpr;
    ctx.scale(dpr,dpr);
    const W=rect.width, H=rect.height;
    ctx.clearRect(0,0,W,H);
    if(!subs.length){
      ctx.fillStyle='#8896b0'; ctx.font='13px Plus Jakarta Sans';
      ctx.textAlign='center'; ctx.fillText('Sin suscripciones', W/2, H/2); return;
    }
    const colors=['#3b82f6','#8b5cf6','#f59e0b','#ef4444','#10b981','#ec4899'];
    const data=subs.map(s=>s.estimarCostoMensual());
    const total=data.reduce((a,b)=>a+b,0);
    const cx=W*0.38, cy=H/2, r=Math.min(W,H)*0.38;
    let angle=-Math.PI/2;
    data.forEach((d,i)=>{
      const slice=(d/total)*2*Math.PI;
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,angle,angle+slice);
      ctx.closePath();
      ctx.fillStyle=colors[i%colors.length]; ctx.fill();
      angle+=slice;
    });
    ctx.beginPath(); ctx.arc(cx,cy,r*0.55,0,2*Math.PI);
    ctx.fillStyle='#0f1623'; ctx.fill();
    ctx.fillStyle='#e8edf5'; ctx.font='bold 12px JetBrains Mono,monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('$'+total.toFixed(0)+'/mo', cx, cy);
    const lx=W*0.66, ly=H*0.1;
    subs.slice(0,5).forEach((s,i)=>{
      const y=ly+i*22;
      ctx.fillStyle=colors[i%colors.length]; ctx.fillRect(lx,y-6,10,10);
      ctx.fillStyle='#8896b0'; ctx.font='11px Plus Jakarta Sans';
      ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(s.nombreServicio.substr(0,12), lx+14, y);
    });
  }
}

/* ======================================================
   CLASE: StorageManager (localStorage OOP)
   ====================================================== */
class StorageManager {
  static save(key, data) {
    try { localStorage.setItem('ft_'+key, JSON.stringify(data)); } catch(e){}
  }
  static load(key, fallback=[]) {
    try { const d=localStorage.getItem('ft_'+key); return d?JSON.parse(d):fallback; } catch(e){return fallback;}
  }
}

/* ======================================================
   CLASE: ToastManager
   ====================================================== */
class ToastManager {
  static show(msg, type='info', duration=3500) {
    const c=document.getElementById('toast-container');
    const icons={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
    const t=document.createElement('div');
    t.className='toast '+type;
    t.innerHTML=`<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(()=>{
      t.style.animation='slideInToast .3s ease reverse forwards';
      setTimeout(()=>t.remove(),300);
    },duration);
  }
}

/* ======================================================
   APP — Controlador Principal
   ====================================================== */
const App = (() => {
  // Estado
  let _usuario = null;
  let _cuenta = null;
  let _gestor = null;
  let _dashboard = null;
  let _enrutador = null;
  let _auth = new ControladorAutenticacion();
  let _modalGasto = new ModalRegistroGasto();
  let _metas = [];
  let _suscripciones = [];
  let _documentosOCR = [];
  let _tickets = [];
  let _categorias = [];
  let _transacciones = [];
  let _ocrPending = null;

  const DEMO_CATEGORIAS = [
    {idCategoria:'cat1',nombre:'Alimentación',presupuestoMensual:5000,codigoColor:'#10b981'},
    {idCategoria:'cat2',nombre:'Transporte',presupuestoMensual:1500,codigoColor:'#3b82f6'},
    {idCategoria:'cat3',nombre:'Entretenimiento',presupuestoMensual:800,codigoColor:'#8b5cf6'},
    {idCategoria:'cat4',nombre:'Salud',presupuestoMensual:2000,codigoColor:'#f43f5e'},
    {idCategoria:'cat5',nombre:'Servicios',presupuestoMensual:1200,codigoColor:'#f59e0b'},
    {idCategoria:'cat6',nombre:'Educación',presupuestoMensual:1000,codigoColor:'#ec4899'},
    {idCategoria:'cat7',nombre:'Ingresos',presupuestoMensual:0,codigoColor:'#00e5a0'},
  ];

  function _initData() {
    // Categorías
    const catData = StorageManager.load('categorias', DEMO_CATEGORIAS);
    _categorias = catData.map(c => new Categoria(c));
    // Transacciones
    const txData = StorageManager.load('transacciones', _demoTransacciones());
    _transacciones = txData.map(t => new Transaccion(t));
    // Cuenta
    const cData = StorageManager.load('cuenta', {idCuenta:'cta1',tipo:'débito',
      saldoActual:0,nombreInstitucion:'FinTrack Personal',
      hashContrasena:'',ultimaSincronizacion:new Date().toISOString()});
    _cuenta = new Cuenta(cData);
    // GestorFinanciero
    _gestor = new GestorFinanciero(_cuenta, _transacciones, _categorias);
    _cuenta.sincronizarReporte(_transacciones);
    // VistaDashboard
    _dashboard = new VistaDashboard(_gestor);
    // Enrutador
    _enrutador = new EnrutadorPrincipal();
    // Metas
    const metasData = StorageManager.load('metas', _demoMetas());
    _metas = metasData.map(m => new MetaAhorro(m));
    // Suscripciones
    const subData = StorageManager.load('suscripciones', _demoSubs());
    _suscripciones = subData.map(s => new Suscripcion(s));
    // OCR docs
    const ocrData = StorageManager.load('ocr_docs', []);
    _documentosOCR = ocrData.map(d => new DocumentoOCR(d));
    // Tickets
    _tickets = StorageManager.load('tickets', []);
  }

  function _demoTransacciones() {
    const hoy = new Date();
    const txs = [];
    const datos = [
      {tipo:'ingreso',monto:18500,desc:'Sueldo Mensual',cat:'cat7'},
      {tipo:'gasto',monto:3200,desc:'Supermercado Walmart',cat:'cat1'},
      {tipo:'gasto',monto:850,desc:'Gasolina',cat:'cat2'},
      {tipo:'gasto',monto:299,desc:'Netflix',cat:'cat3'},
      {tipo:'gasto',monto:450,desc:'Farmacia del Ahorro',cat:'cat4'},
      {tipo:'gasto',monto:650,desc:'Electricidad CFE',cat:'cat5'},
      {tipo:'gasto',monto:1200,desc:'Restaurante',cat:'cat1'},
      {tipo:'ingreso',monto:3500,desc:'Freelance proyecto web',cat:'cat7'},
      {tipo:'gasto',monto:320,desc:'Uber',cat:'cat2'},
      {tipo:'gasto',monto:180,desc:'Spotify + Apple Music',cat:'cat3'},
    ];
    datos.forEach((d,i) => {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i*2);
      txs.push({
        idTransaccion:'tx-demo-'+i,
        monto:d.monto, fecha:fecha.toISOString().split('T')[0],
        descripcion:d.desc, tipo:d.tipo, idCategoria:d.cat, esAutomatizada:false
      });
    });
    return txs;
  }
  function _demoMetas() {
    return [
      {idMeta:'m1',nombre:'Vacaciones Cancún',emoji:'🏖️',montoObjetivo:25000,ahorroActual:12500,fechaLimite:'2026-12-01'},
      {idMeta:'m2',nombre:'Fondo Emergencia',emoji:'🛡️',montoObjetivo:50000,ahorroActual:38000,fechaLimite:'2026-06-30'},
      {idMeta:'m3',nombre:'Laptop Nueva',emoji:'💻',montoObjetivo:22000,ahorroActual:5500,fechaLimite:'2026-09-15'},
    ];
  }
  function _demoSubs() {
    return [
      {idSuscripcion:'s1',nombreServicio:'Netflix',emoji:'🎬',costo:219,frecuenciaCobro:'mensual',proximaFechaPago:'2026-04-01'},
      {idSuscripcion:'s2',nombreServicio:'Spotify',emoji:'🎵',costo:99,frecuenciaCobro:'mensual',proximaFechaPago:'2026-03-28'},
      {idSuscripcion:'s3',nombreServicio:'iCloud',emoji:'☁️',costo:29,frecuenciaCobro:'mensual',proximaFechaPago:'2026-04-05'},
      {idSuscripcion:'s4',nombreServicio:'Gimnasio',emoji:'🏋️',costo:450,frecuenciaCobro:'mensual',proximaFechaPago:'2026-03-31'},
    ];
  }

  function _saveAll() {
    StorageManager.save('transacciones', _transacciones.map(t=>t.toJSON()));
    StorageManager.save('metas', _metas.map(m=>m.toJSON()));
    StorageManager.save('suscripciones', _suscripciones.map(s=>s.toJSON()));
    StorageManager.save('cuenta', _cuenta.toJSON());
    StorageManager.save('ocr_docs', _documentosOCR.map(d=>d.toJSON()));
    StorageManager.save('tickets', _tickets);
  }

  function _showPage(id) {
    document.querySelectorAll('.page').forEach(p=>{
      p.classList.remove('active');
      p.style.position='fixed';
    });
    const p=document.getElementById(id);
    if(p){ p.classList.add('active'); p.style.position='relative'; }
  }

  // ---- Public API ----
  return {
    init() {
      _initData();
      // Registrar usuario demo
      StorageManager.save('usuarios', [{
        idUsuario:1,correoElectronico:'admin@fintrack.mx',
        hashContrasena: Usuario.crearHash('fintrack123'),
        consentimiento:true,ultimoAcceso:new Date().toISOString()
      }]);
      // Evento login
      document.getElementById('btn-login').addEventListener('click', this.handleLogin.bind(this));
      ['login-email','login-pass'].forEach(id=>{
        document.getElementById(id).addEventListener('keypress',e=>{
          if(e.key==='Enter') this.handleLogin();
        });
      });
      // Logout
      document.getElementById('btn-logout').addEventListener('click',this.logout.bind(this));
      // Nav items
      document.querySelectorAll('.nav-item[data-section]').forEach(btn=>{
        btn.addEventListener('click',()=>{
          this.navigate(btn.dataset.section);
          // close sidebar on mobile
          document.getElementById('sidebar').classList.remove('open');
          document.getElementById('sidebar-backdrop').classList.remove('open');
        });
      });
      // Hamburger
      document.getElementById('hamburger').addEventListener('click',()=>{
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebar-backdrop').classList.toggle('open');
      });
      document.getElementById('sidebar-backdrop').addEventListener('click',()=>{
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-backdrop').classList.remove('open');
      });
      // Drop zone
      const dz=document.getElementById('drop-zone');
      dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('dragover');});
      dz.addEventListener('dragleave',()=>dz.classList.remove('dragover'));
      dz.addEventListener('drop',e=>{
        e.preventDefault(); dz.classList.remove('dragover');
        const f=e.dataTransfer.files[0];
        if(f) this.processOCR({files:[f]});
      });
      // Resize re-draw
      window.addEventListener('resize',()=>{ if(_usuario) this._renderCharts(); });
    },

    handleLogin() {
      const email = document.getElementById('login-email').value.trim();
      const pass  = document.getElementById('login-pass').value;
      // Validaciones
      let hasErr=false;
      document.getElementById('err-email').classList.add('hidden');
      document.getElementById('err-pass').classList.add('hidden');
      document.getElementById('err-general').classList.add('hidden');
      if(!email){
        document.getElementById('err-email').textContent='El correo es requerido.';
        document.getElementById('err-email').classList.remove('hidden');
        document.getElementById('login-email').classList.add('error');
        hasErr=true;
      }
      if(!pass){
        document.getElementById('err-pass').textContent='La contraseña es requerida.';
        document.getElementById('err-pass').classList.remove('hidden');
        document.getElementById('login-pass').classList.add('error');
        hasErr=true;
      }
      if(hasErr) return;
      // Spinner
      document.getElementById('btn-login-text').textContent='Verificando...';
      document.getElementById('btn-login-spinner').classList.remove('hidden');
      document.getElementById('btn-login').disabled=true;
      setTimeout(()=>{
        const usuarios = StorageManager.load('usuarios',[]).map(u=>new Usuario(u));
        const res = _auth.validarCredenciales(email, pass, usuarios);
        document.getElementById('btn-login-text').textContent='Iniciar sesión';
        document.getElementById('btn-login-spinner').classList.add('hidden');
        document.getElementById('btn-login').disabled=false;
        if(res.ok) {
          _usuario = res.usuario;
          this._onLoginSuccess();
        } else if(res.error==='bloqueado') {
          document.getElementById('lock-notice').classList.remove('hidden');
          document.getElementById('btn-login').disabled=true;
          let secs=60;
          const timer=setInterval(()=>{
            secs--;
            document.getElementById('lock-timer').textContent=secs;
            if(secs<=0){ clearInterval(timer); _auth.resetBloqueo();
              document.getElementById('lock-notice').classList.add('hidden');
              document.getElementById('btn-login').disabled=false; }
          },1000);
        } else {
          const err=document.getElementById('err-general');
          err.textContent=`Credenciales incorrectas. Intentos restantes: ${res.restantes}`;
          err.classList.remove('hidden');
          document.getElementById('login-email').classList.add('error');
          document.getElementById('login-pass').classList.add('error');
        }
      }, 900);
    },

    _onLoginSuccess() {
      _showPage('page-app');
      const initials = _usuario.correoElectronico.charAt(0).toUpperCase();
      document.getElementById('sidebar-avatar').textContent = initials;
      document.getElementById('sidebar-name').textContent = _usuario.correoElectronico.split('@')[0];
      document.getElementById('profile-avatar').textContent = initials;
      document.getElementById('profile-name').textContent = _usuario.correoElectronico.split('@')[0];
      document.getElementById('profile-email').textContent = _usuario.correoElectronico;
      document.getElementById('profile-email-input').value = _usuario.correoElectronico;
      document.getElementById('profile-last-access').textContent = new Date(_usuario.ultimoAcceso).toLocaleString('es-MX');
      // Populate category selects
      this._populateCatSelects();
      // Render dashboard
      this.navigate('dashboard');
      ToastManager.show(`Bienvenido, ${_usuario.correoElectronico.split('@')[0]} 👋`, 'success');
    },

    logout() {
      if(_usuario) _usuario.cerrarSesion();
      _saveAll();
      _usuario=null;
      _showPage('page-login');
      document.getElementById('login-email').value='';
      document.getElementById('login-pass').value='';
      document.getElementById('login-email').classList.remove('error');
      document.getElementById('login-pass').classList.remove('error');
      ToastManager.show('Sesión cerrada correctamente.','info');
    },

    navigate(section) {
      _enrutador.despacharRuta(section);
      const renders = {
        dashboard: () => this._renderDashboard(),
        transacciones: () => this.renderTransactions(),
        ocr: () => this._renderOCRDocs(),
        suscripciones: () => this._renderSuscripciones(),
        metas: () => this._renderMetas(),
        soporte: () => this._renderTickets(),
        perfil: () => this._renderPerfil(),
      };
      if(renders[section]) setTimeout(renders[section].bind(this), 50);
    },

    _renderDashboard() {
      _dashboard.actualizarSaldos();
      this._renderCharts();
      this._renderDashTransactions();
    },

    _renderCharts() {
      const bycat = _gestor.gastosPorCategoria();
      const labels=[], data=[], colors=[];
      Object.entries(bycat).forEach(([k,v])=>{
        const cat=_categorias.find(c=>c.idCategoria===k);
        labels.push(cat?cat.nombre:k);
        data.push(v);
        colors.push(cat?cat.codigoColor:'#8896b0');
      });
      setTimeout(()=>{
        ChartEngine.drawDonut('chart-donut',data,labels,colors);
        // Bar chart by month (last 6 months)
        const months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const now=new Date(), barLabels=[], incData=[], gasData=[];
        for(let i=5;i>=0;i--){
          const d=new Date(now.getFullYear(),now.getMonth()-i,1);
          const m=d.getMonth(), y=d.getFullYear();
          barLabels.push(months[m]);
          const txM=_transacciones.filter(t=>{
            const td=new Date(t.fecha);
            return td.getMonth()===m && td.getFullYear()===y;
          });
          incData.push(txM.filter(t=>t.tipo==='ingreso').reduce((s,t)=>s+t.monto,0));
          gasData.push(txM.filter(t=>t.tipo==='gasto').reduce((s,t)=>s+t.monto,0));
        }
        ChartEngine.drawBars('chart-bar',barLabels,incData,gasData);
      },100);
    },

    _renderDashTransactions() {
      const recent = [..._transacciones].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).slice(0,8);
      const empty = document.getElementById('dash-empty-alert');
      const wrap = document.getElementById('dash-transactions');
      if(!recent.length){
        wrap.innerHTML=''; empty.style.display='flex'; return;
      }
      empty.style.display='none';
      wrap.innerHTML = this._txTableHTML(recent);
    },

    renderTransactions() {
      // Populate filter
      const sel=document.getElementById('filter-cat');
      sel.innerHTML='<option value="">Todas las categorías</option>';
      _categorias.forEach(c=>{
        sel.innerHTML+=`<option value="${c.idCategoria}">${c.nombre}</option>`;
      });
      const catF=sel.value;
      const typeF=document.getElementById('filter-type').value;
      let txs=[..._transacciones].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
      if(catF) txs=txs.filter(t=>t.idCategoria===catF);
      if(typeF) txs=txs.filter(t=>t.tipo===typeF);
      const wrap=document.getElementById('full-transactions');
      if(!txs.length){
        wrap.innerHTML=`<div class="empty-state"><div class="empty-icon">💸</div><div class="empty-title">No hay transacciones</div><div class="empty-sub">Cambia los filtros o registra un nuevo movimiento.</div></div>`;
        return;
      }
      wrap.innerHTML=this._txTableHTML(txs);
    },

    _txTableHTML(txs) {
      const rows = txs.map(t=>{
        const cat=_categorias.find(c=>c.idCategoria===t.idCategoria);
        const color=cat?cat.codigoColor:'#8896b0';
        const pill=t.tipo==='ingreso'?'pill-green':'pill-red';
        return `<tr>
          <td><span class="cat-dot" style="background:${color}"></span>${cat?cat.nombre:'—'}</td>
          <td>${t.descripcion||'—'}</td>
          <td class="mono">${new Date(t.fecha+'T12:00:00').toLocaleDateString('es-MX')}</td>
          <td class="mono fw-600" style="color:${t.tipo==='ingreso'?'var(--accent)':'var(--danger)'}">
            ${t.tipo==='ingreso'?'+':'-'}$${t.monto.toFixed(2)}
          </td>
          <td><span class="pill ${pill}">${t.tipo==='ingreso'?'Ingreso':'Gasto'}</span></td>
          <td><button class="btn btn-xs btn-ghost" onclick="App.deleteTransaction('${t.idTransaccion}')">🗑</button></td>
        </tr>`;
      }).join('');
      return `<table><thead><tr>
        <th>Categoría</th><th>Descripción</th><th>Fecha</th>
        <th>Monto</th><th>Tipo</th><th></th>
      </tr></thead><tbody>${rows}</tbody></table>`;
    },

    deleteTransaction(id) {
      const i=_transacciones.findIndex(t=>t.idTransaccion===id);
      if(i>-1){
        _transacciones.splice(i,1);
        _gestor.transacciones=_transacciones;
        _cuenta.sincronizarReporte(_transacciones);
        _saveAll();
        ToastManager.show('Transacción eliminada.','info');
        if(_enrutador.getSeccion()==='transacciones') this.renderTransactions();
        if(_enrutador.getSeccion()==='dashboard') this._renderDashboard();
      }
    },

    _populateCatSelects() {
      const sel=document.getElementById('mov-categoria');
      sel.innerHTML='<option value="">Seleccionar categoría</option>';
      _categorias.forEach(c=>{
        sel.innerHTML+=`<option value="${c.idCategoria}">${c.nombre}</option>`;
      });
    },

    setMovType(t) { _modalGasto.setTipo(t); },
    onCatChange() {
      const id=document.getElementById('mov-categoria').value;
      const sug=_gestor.sugerirMonto(id);
      const el=document.getElementById('monto-sugerido');
      if(sug && !document.getElementById('mov-monto').value){
        el.textContent=`💡 Promedio histórico: $${sug}`;
        el.style.display='block';
      } else { el.style.display='none'; }
    },

    saveMovimiento() {
      const monto=parseFloat(document.getElementById('mov-monto').value);
      const fecha=document.getElementById('mov-fecha').value;
      const catId=document.getElementById('mov-categoria').value;
      const desc=document.getElementById('mov-desc').value.trim();
      const tipo=_modalGasto.getTipo();
      const round=document.getElementById('mov-round').checked;
      // Validaciones
      let err=false;
      document.getElementById('err-monto').classList.add('hidden');
      document.getElementById('err-cat').classList.add('hidden');
      document.getElementById('mov-monto').classList.remove('error');
      document.getElementById('mov-categoria').classList.remove('error');
      if(!monto||monto<=0){
        document.getElementById('err-monto').textContent='El monto debe ser un valor positivo.';
        document.getElementById('err-monto').classList.remove('hidden');
        document.getElementById('mov-monto').classList.add('error');
        err=true;
      }
      if(!catId){
        document.getElementById('err-cat').textContent='Selecciona una categoría.';
        document.getElementById('err-cat').classList.remove('hidden');
        document.getElementById('mov-categoria').classList.add('error');
        err=true;
      }
      if(!fecha){ ToastManager.show('Ingresa una fecha válida.','error'); err=true; }
      if(err) return;
      const tx=_gestor.crearMovimiento({monto,fecha,descripcion:desc,tipo,idCategoria:catId,
        esAutomatizada:false,aplicarRedondeo:round});
      // Redondeo a meta activa
      if(round && tx._redondeo>0 && _metas.length>0){
        _metas[0].aplicarRedondeo(monto);
        ToastManager.show(`💰 Redondeo $${tx._redondeo.toFixed(2)} añadido a "${_metas[0].nombre}"`, 'success');
      }
      _saveAll();
      this.closeModal('modal-gasto');
      document.getElementById('mov-monto').value='';
      document.getElementById('mov-desc').value='';
      document.getElementById('mov-categoria').value='';
      document.getElementById('mov-round').checked=false;
      document.getElementById('monto-sugerido').style.display='none';
      ToastManager.show('Movimiento registrado exitosamente.','success');
      if(_enrutador.getSeccion()==='dashboard') this._renderDashboard();
      if(_enrutador.getSeccion()==='transacciones') this.renderTransactions();
    },

    processOCR(input) {
      const file = input.files ? input.files[0] : null;
      if(!file){ ToastManager.show('No se seleccionó archivo.','error'); return; }
      const docOCR = new DocumentoOCR({idDocumento:'doc-'+Date.now()});
      ToastManager.show('Procesando OCR...','info',2000);
      setTimeout(()=>{
        const campos = docOCR.procesarArchivo(file);
        _ocrPending = docOCR;
        // Show result
        const fieldsEl=document.getElementById('ocr-fields');
        fieldsEl.innerHTML = Object.entries(campos).map(([k,v])=>
          `<div class="ocr-field"><span class="ocr-key">${k}</span><span class="ocr-val">${v}</span></div>`
        ).join('');
        document.getElementById('ocr-result').style.display='block';
        document.getElementById('btn-confirm-ocr').onclick=()=>this.confirmOCR();
        ToastManager.show('OCR completado. Revisa los campos extraídos.','success');
      },1500);
    },

    confirmOCR() {
      if(!_ocrPending) return;
      _ocrPending.textPlano = JSON.stringify(_ocrPending.camposExtraidos);
      const hash = _ocrPending.generarHash();
      _documentosOCR.push(_ocrPending);
      // Auto-crear transacción
      const monto=parseFloat((_ocrPending.camposExtraidos.MontoTotal||'$0').replace('$',''));
      if(monto>0){
        _gestor.crearMovimiento({monto,fecha:_ocrPending.camposExtraidos.FechaEmision||new Date().toISOString().split('T')[0],
          descripcion:'OCR: '+_ocrPending.urlArchivo,tipo:'gasto',idCategoria:'cat5',esAutomatizada:true});
      }
      _saveAll();
      document.getElementById('ocr-result').style.display='none';
      document.getElementById('file-input').value='';
      _ocrPending=null;
      this._renderOCRDocs();
      ToastManager.show(`Documento guardado. Hash: ${hash}`, 'success', 5000);
    },

    cancelOCR() {
      _ocrPending=null;
      document.getElementById('ocr-result').style.display='none';
      document.getElementById('file-input').value='';
    },

    _renderOCRDocs() {
      const el=document.getElementById('ocr-docs-list');
      if(!_documentosOCR.length){
        el.innerHTML='<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">📄</div><div class="empty-title">Sin documentos</div><div class="empty-sub">Importa un PDF para comenzar.</div></div>';
        return;
      }
      el.innerHTML=_documentosOCR.map(d=>`
        <div class="ticket-item" style="margin-bottom:10px;">
          <div class="ticket-icon">📄</div>
          <div class="ticket-body">
            <div class="ticket-subject">${d.urlArchivo}</div>
            <div class="ticket-meta">Folio: ${d.camposExtraidos.Folio||'N/A'} · Total: ${d.camposExtraidos.MontoTotal||'N/A'}</div>
            <div class="ticket-meta mono text-xs" style="margin-top:4px;color:var(--accent);">${new DocumentoOCR(d).generarHash()}</div>
          </div>
        </div>`).join('');
    },

    _renderSuscripciones() {
      const totalMensual = _suscripciones.reduce((s,sub)=>s+sub.estimarCostoMensual(),0);
      const totalAnual = _suscripciones.reduce((s,sub)=>s+sub.estimarCostoAnual(),0);
      document.getElementById('sub-stats').innerHTML=`
        <div class="stat-card blue"><div class="stat-label">Gasto Mensual</div>
          <div class="stat-value blue mono">$${totalMensual.toFixed(2)}</div>
          <div class="stat-delta">${_suscripciones.length} suscripciones activas</div></div>
        <div class="stat-card purple"><div class="stat-label">Gasto Anual</div>
          <div class="stat-value purple mono">$${totalAnual.toFixed(2)}</div>
          <div class="stat-delta">Proyección 12 meses</div></div>
        <div class="stat-card red"><div class="stat-label">Próximo Cobro</div>
          <div class="stat-value red mono">${_suscripciones.length?'$'+_suscripciones.sort((a,b)=>new Date(a.proximaFechaPago)-new Date(b.proximaFechaPago))[0].costo.toFixed(2):'—'}</div>
          <div class="stat-delta">${_suscripciones.length?_suscripciones[0].nombreServicio:''}</div></div>
      `;
      // List
      const list=document.getElementById('sub-list');
      list.innerHTML=_suscripciones.map(s=>{
        const rem=s.recordatorioCancelacion();
        return `<div class="sub-card" style="margin-bottom:10px;">
          <div class="sub-logo">${s.emoji||'💳'}</div>
          <div class="sub-info">
            <div class="sub-name">${s.nombreServicio}</div>
            <div class="sub-freq">${s.frecuenciaCobro} · ${rem?'<span style="color:var(--warning)">'+rem+'</span>':('Próximo: '+new Date(s.proximaFechaPago+'T12:00:00').toLocaleDateString('es-MX'))}</div>
          </div>
          <div>
            <div class="sub-cost mono">$${s.estimarCostoMensual().toFixed(2)}<span style="font-size:.7rem;font-weight:400;color:var(--text-2)">/mo</span></div>
            <div class="sub-next"><button class="btn btn-xs btn-ghost" onclick="App.deleteSub('${s.idSuscripcion}')">🗑 Eliminar</button></div>
          </div>
        </div>`;
      }).join('')||'<div class="empty-state"><div class="empty-icon">🔄</div><div class="empty-title">Sin suscripciones</div></div>';
      // Alerts
      const alerts=document.getElementById('sub-alerts');
      const prox=_suscripciones.filter(s=>s.recordatorioCancelacion());
      alerts.innerHTML=prox.map(s=>`
        <div class="alert alert-warning">⚠️ ${s.recordatorioCancelacion()}</div>`).join('');
      setTimeout(()=>ChartEngine.drawSubsPie('chart-subs',_suscripciones),100);
    },

    deleteSub(id) {
      const i=_suscripciones.findIndex(s=>s.idSuscripcion===id);
      if(i>-1){ _suscripciones.splice(i,1); _saveAll();
        ToastManager.show('Suscripción eliminada.','info');
        this._renderSuscripciones(); }
    },

    saveSuscripcion() {
      const nom=document.getElementById('sub-nombre').value.trim();
      const emoji=document.getElementById('sub-emoji').value.trim()||'💳';
      const costo=parseFloat(document.getElementById('sub-costo').value);
      const freq=document.getElementById('sub-frecuencia').value;
      const prox=document.getElementById('sub-proxima').value;
      if(!nom||!costo||!prox){ ToastManager.show('Completa todos los campos requeridos.','error'); return; }
      const sub=new Suscripcion({idSuscripcion:'s-'+Date.now(),nombreServicio:nom,emoji,
        costo,frecuenciaCobro:freq,proximaFechaPago:prox});
      _suscripciones.push(sub); _saveAll();
      this.closeModal('modal-suscripcion');
      document.getElementById('sub-nombre').value='';
      document.getElementById('sub-costo').value='';
      document.getElementById('sub-proxima').value='';
      ToastManager.show('Suscripción añadida.','success');
      this._renderSuscripciones();
    },

    _renderMetas() {
      const grid=document.getElementById('metas-grid');
      if(!_metas.length){
        grid.innerHTML='<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">No hay espacios de ahorro</div><div class="empty-sub">Crea tu primera meta.</div></div>';
        return;
      }
      grid.innerHTML=_metas.map(m=>{
        const pct=m.porcentajeProgreso();
        const dias=m.diasRestantes();
        const barClass=pct>=100?'':'pct<50?danger:warning';
        const bc=pct>=100?'':pct<50?'danger':'warning';
        return `<div class="goal-card">
          <div class="goal-emoji">${m.emoji||'🎯'}</div>
          <div class="goal-name">${m.nombre}</div>
          <div class="goal-amounts">
            <span class="goal-current">$${m.ahorroActual.toFixed(0)}</span>
            <span class="goal-target">/ $${m.montoObjetivo.toFixed(0)}</span>
            <span class="goal-pct">${pct}%</span>
          </div>
          <div class="progress-wrap"><div class="progress-bar ${bc}" style="width:${pct}%"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:12px;">
            <span class="text-xs" style="color:var(--text-2);">⏰ ${dias} días restantes</span>
            <span class="pill ${pct>=100?'pill-green':dias<30?'pill-red':'pill-yellow'}">${pct>=100?'✅ Lograda':dias<30?'⚠️ Urgente':'En progreso'}</span>
          </div>
          ${pct>=100?`<div class="alert alert-success" style="margin-top:12px;">🎉 ¡Meta alcanzada! <button class="btn btn-xs" style="background:var(--accent);color:#000;margin-left:8px;" onclick="App.completeMeta('${m.idMeta}')">Mover a cuenta</button></div>`:''}
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="btn btn-ghost btn-xs" style="flex:1;" onclick="App.abonarMeta('${m.idMeta}')">＋ Abonar</button>
            <button class="btn btn-ghost btn-xs" onclick="App.deleteMeta('${m.idMeta}')">🗑</button>
          </div>
        </div>`;
      }).join('');
    },

    saveMeta() {
      const nom=document.getElementById('meta-nombre').value.trim();
      const emoji=document.getElementById('meta-emoji').value.trim()||'🎯';
      const obj=parseFloat(document.getElementById('meta-objetivo').value);
      const actual=parseFloat(document.getElementById('meta-actual').value)||0;
      const fecha=document.getElementById('meta-fecha').value;
      if(!nom||!obj||!fecha){ ToastManager.show('Completa los campos requeridos.','error'); return; }
      _metas.push(new MetaAhorro({idMeta:'m-'+Date.now(),nombre:nom,emoji,
        montoObjetivo:obj,ahorroActual:actual,fechaLimite:fecha}));
      _saveAll();
      this.closeModal('modal-meta');
      ['meta-nombre','meta-emoji','meta-objetivo','meta-actual','meta-fecha'].forEach(id=>document.getElementById(id).value='');
      ToastManager.show('Espacio de ahorro creado.','success');
      this._renderMetas();
    },

    deleteMeta(id) {
      _metas=_metas.filter(m=>m.idMeta!==id); _saveAll();
      ToastManager.show('Meta eliminada.','info'); this._renderMetas();
    },

    abonarMeta(id) {
      const monto=prompt('¿Cuánto deseas abonar?');
      if(!monto||isNaN(parseFloat(monto))) return;
      const m=_metas.find(x=>x.idMeta===id);
      if(m){ m.ahorroActual+=parseFloat(monto); _saveAll();
        if(m.porcentajeProgreso()>=100) ToastManager.show(`🎉 ¡Lograste tu meta "${m.nombre}"!`,'success',5000);
        else ToastManager.show(`Abono de $${parseFloat(monto).toFixed(2)} registrado.`,'success');
        this._renderMetas(); }
    },

    completeMeta(id) {
      const m=_metas.find(x=>x.idMeta===id);
      if(m){
        _gestor.crearMovimiento({monto:m.ahorroActual,fecha:new Date().toISOString().split('T')[0],
          descripcion:`Meta "${m.nombre}" completada`,tipo:'ingreso',idCategoria:'cat7'});
        _metas=_metas.filter(x=>x.idMeta!==id); _saveAll();
        ToastManager.show(`$${m.ahorroActual.toFixed(2)} transferidos a tu cuenta.`,'success');
        this._renderMetas();
      }
    },

    submitTicket() {
      const subject=document.getElementById('ticket-subject').value.trim();
      const type=document.getElementById('ticket-type').value;
      const desc=document.getElementById('ticket-desc').value.trim();
      if(!subject||!desc){ ToastManager.show('Completa asunto y descripción.','error'); return; }
      const ticket={id:'tkt-'+Date.now(),subject,type,desc,
        status:'abierto',fecha:new Date().toISOString(),
        respuesta:null};
      _tickets.push(ticket); _saveAll();
      document.getElementById('ticket-subject').value='';
      document.getElementById('ticket-desc').value='';
      // Simular respuesta automática
      setTimeout(()=>{
        ticket.respuesta='Hola, hemos recibido tu reporte. El equipo de soporte revisará tu caso en menos de 12 horas. Folio: '+ticket.id;
        ticket.status='respondido'; _saveAll();
        ToastManager.show('📨 El equipo respondió tu ticket.','success');
        if(_enrutador.getSeccion()==='soporte') this._renderTickets();
      },4000);
      ToastManager.show('Ticket enviado. Recibirás respuesta en máx. 12 horas.','success');
      this._renderTickets();
    },

    _renderTickets() {
      const el=document.getElementById('ticket-list');
      if(!_tickets.length){
        el.innerHTML='<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">🎧</div><div class="empty-title">Sin tickets</div><div class="empty-sub">Reporta un problema para verlo aquí.</div></div>';
        return;
      }
      el.innerHTML=[..._tickets].reverse().map(t=>`
        <div class="ticket-item">
          <div class="ticket-icon">${t.type==='error'?'🔴':t.type==='seguridad'?'🔐':t.type==='sugerencia'?'💡':'🟡'}</div>
          <div class="ticket-body">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div class="ticket-subject">${t.subject}</div>
              <span class="pill ${t.status==='respondido'?'pill-green':'pill-yellow'}">${t.status==='respondido'?'Respondido':'Abierto'}</span>
            </div>
            <div class="ticket-meta">${new Date(t.fecha).toLocaleString('es-MX')}</div>
            ${t.respuesta?`<div class="alert alert-success" style="margin-top:8px;font-size:.8rem;">💬 ${t.respuesta}</div>`:''}
          </div>
        </div>`).join('');
    },

    _renderPerfil() {
      document.getElementById('cuenta-info').innerHTML=`
        <div class="ocr-field"><span class="ocr-key">Tipo</span><span class="ocr-val">${_cuenta.tipo}</span></div>
        <div class="ocr-field"><span class="ocr-key">Institución</span><span class="ocr-val">${_cuenta.nombreInstitucion}</span></div>
        <div class="ocr-field"><span class="ocr-key">Saldo Actual</span><span class="ocr-val mono" style="color:var(--accent)">$${_cuenta.saldoActual.toFixed(2)}</span></div>
        <div class="ocr-field" style="border:none;"><span class="ocr-key">Últ. Sync</span><span class="ocr-val" style="font-size:.78rem">${new Date(_cuenta.ultimaSincronizacion).toLocaleString('es-MX')}</span></div>
      `;
    },

    changePassword() {
      const np=document.getElementById('profile-new-pass').value;
      const cp=document.getElementById('profile-confirm-pass').value;
      if(!np||np.length<8){ ToastManager.show('La contraseña debe tener mínimo 8 caracteres.','error'); return; }
      if(np!==cp){ ToastManager.show('Las contraseñas no coinciden.','error'); return; }
      // Update hash
      const usuarios=StorageManager.load('usuarios',[]);
      const u=usuarios.find(x=>x.correoElectronico===_usuario.correoElectronico);
      if(u){ u.hashContrasena=Usuario.crearHash(np); StorageManager.save('usuarios',usuarios); }
      document.getElementById('profile-new-pass').value='';
      document.getElementById('profile-confirm-pass').value='';
      ToastManager.show('Contraseña actualizada correctamente.','success');
    },

    exportData() {
      const data=_usuario.exportarDatosPersonales();
      const blob=new Blob([data],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download='datos_personales.json'; a.click();
      ToastManager.show('Datos exportados correctamente.','success');
    },

    openModal(id) {
      document.getElementById(id).classList.add('open');
      document.body.style.overflow='hidden';
    },
    closeModal(id) {
      document.getElementById(id).classList.remove('open');
      document.body.style.overflow='';
    }
  };
})();

// Init
document.addEventListener('DOMContentLoaded', () => App.init());
// Close modals on backdrop click
document.querySelectorAll('.modal-overlay').forEach(overlay=>{
  overlay.addEventListener('click', e=>{
    if(e.target===overlay) overlay.classList.remove('open');
  });
});

