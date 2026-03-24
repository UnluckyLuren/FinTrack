'use strict';
/* ============================================================
   API CLIENT — Comunicación con backend PHP
   ============================================================ */
class ApiClient {
  static BASE = 'https://hide-biblical-flows-trivia.trycloudflare.com/api';

  static async request(endpoint, method = 'GET', body = null) {
    const opts = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(`${this.BASE}/${endpoint}`, opts);
      return await res.json();
    } catch (error) {
      console.error("Error API:", error);
      return { success: false, error: "Error de red" };
    }
  }

  static async upload(endpoint, formData) {
    try {
      const res = await fetch(`${this.BASE}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: "Error de subida" };
    }
  }

  static get(ep)           { return this.request(ep); }
  static post(ep, body)    { return this.request(ep, 'POST', body); }
  static put(ep, body)     { return this.request(ep, 'PUT', body); }
  static delete(ep)        { return this.request(ep, 'DELETE'); }
}

/* ============================================================
   CHART ENGINE — Canvas puro
   ============================================================ */
class ChartEngine {
  static drawDonut(id, data, labels, colors) {
    const c = document.getElementById(id); if(!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio||1;
    const r = c.getBoundingClientRect();
    c.width = r.width*dpr; c.height = r.height*dpr;
    ctx.scale(dpr,dpr);
    const W=r.width, H=r.height;
    ctx.clearRect(0,0,W,H);
    
    if(!data.length||data.every(d=>d===0)){
      ctx.fillStyle='#8896b0';ctx.font='13px Plus Jakarta Sans';ctx.textAlign='center';
      ctx.fillText('Sin datos',W/2,H/2);return;
    }
    
    const total=data.reduce((s,d)=>s+d,0);
    const cx=W/2,cy=H/2,rad=Math.min(W,H)*0.38,ri=rad*0.58;
    let angle=-Math.PI/2;
    data.forEach((d,i)=>{
      const sl=(d/total)*2*Math.PI;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,rad,angle,angle+sl);
      ctx.closePath();ctx.fillStyle=colors[i%colors.length];ctx.fill();angle+=sl;
    });
    
    ctx.beginPath();ctx.arc(cx,cy,ri,0,2*Math.PI);ctx.fillStyle='#0f1623';ctx.fill();
    ctx.fillStyle='#e8edf5';ctx.font='bold 13px JetBrains Mono,monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('$'+total.toFixed(0),cx,cy);
    
    const lx=14,ly=H*0.08;
    const limit = Math.min(labels.length, 5);
    for(let i=0; i<limit; i++) {
      const y=ly+i*22;
      ctx.fillStyle=colors[i%colors.length];ctx.fillRect(lx,y-6,10,10);
      ctx.fillStyle='#8896b0';ctx.font='11px Plus Jakarta Sans';
      ctx.textAlign='left';ctx.textBaseline='middle';
      const text = labels[i].length>14 ? labels[i].substr(0,12)+'…' : labels[i];
      ctx.fillText(`${text} (${((data[i]/total)*100).toFixed(0)}%)`, lx+14, y);
    }
  }
  
  static drawBars(id, labels, inc, gas) {
    const c = document.getElementById(id); if(!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio||1;
    const r = c.getBoundingClientRect();
    c.width = r.width*dpr; c.height = r.height*dpr;
    ctx.scale(dpr,dpr);
    const W=r.width, H=r.height;
    ctx.clearRect(0,0,W,H);
    
    if(!labels.length){
      ctx.fillStyle='#8896b0';ctx.font='13px Plus Jakarta Sans';
      ctx.textAlign='center';ctx.fillText('Sin datos',W/2,H/2);return;
    }
    
    const pad={l:48,r:12,t:12,b:28};
    const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
    const maxV=Math.max(...inc,...gas,1);
    const bw=(cW/labels.length)*0.3;
    
    for(let i=0;i<=4;i++){
      const y=pad.t+cH-(i/4)*cH;
      ctx.strokeStyle='#1e2d45';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
      ctx.fillStyle='#4a5568';ctx.font='10px JetBrains Mono,monospace';
      ctx.textAlign='right';ctx.textBaseline='middle';
      ctx.fillText('$'+(maxV*i/4).toFixed(0),pad.l-4,y);
    }
    
    labels.forEach((l,i)=>{
      const x=pad.l+i*(cW/labels.length)+(cW/labels.length)*0.2;
      const ih=(inc[i]/maxV)*cH;
      ctx.fillStyle='#00e5a0';
      try{ctx.beginPath();ctx.roundRect(x,pad.t+cH-ih,bw,ih,3);ctx.fill();}
      catch{ctx.fillRect(x,pad.t+cH-ih,bw,ih);}
      
      const gh=(gas[i]/maxV)*cH;
      ctx.fillStyle='#f43f5e';
      try{ctx.beginPath();ctx.roundRect(x+bw+2,pad.t+cH-gh,bw,gh,3);ctx.fill();}
      catch{ctx.fillRect(x+bw+2,pad.t+cH-gh,bw,gh);}
      
      ctx.fillStyle='#4a5568';ctx.font='10px Plus Jakarta Sans';
      ctx.textAlign='center';ctx.textBaseline='top';
      const label=typeof l==='string'?l.substr(0,3):String(l).substr(0,3);
      ctx.fillText(label,x+bw,pad.t+cH+4);
    });
    
    ctx.fillStyle='#00e5a0';ctx.fillRect(W-110,8,10,10);
    ctx.fillStyle='#f43f5e';ctx.fillRect(W-60,8,10,10);
    ctx.fillStyle='#8896b0';ctx.font='10px Plus Jakarta Sans';
    ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText('Ingresos',W-97,13);ctx.fillText('Gastos',W-47,13);
  }
}

/* ============================================================
   TOAST
   ============================================================ */
class Toast {
  static show(msg,type='info',dur=3500){
    const c=document.getElementById('toast-container');
    if(!c) return;
    const icons={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
    const t=document.createElement('div');
    t.className='toast '+type;
    t.innerHTML=`<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(()=>{
      t.style.animation='slideIn .3s ease reverse forwards';
      setTimeout(()=>t.remove(),300);
    },dur);
  }
}

/* ============================================================
   APP
   ============================================================ */
const App = (() => {
  let _seccion = 'dashboard';
  let _movTipo = 'gasto';
  let _pendingOCR = null;
  let _cats = [];
  let _isLogin = true;

  const TITLES = {
    dashboard:'Dashboard',transacciones:'Transacciones',
    ocr:'Escanear PDF',suscripciones:'Suscripciones',
    metas:'Metas de Ahorro',soporte:'Asistencia Técnica',perfil:'Perfil'
  };

  function showPage(id) {
    document.querySelectorAll('.page').forEach(p=>{
      p.classList.remove('active');p.style.position='fixed';
    });
    const p=document.getElementById(id);
    if(p){p.classList.add('active');p.style.position='relative';}
  }

  function txTableHTML(txs) {
    if(!txs || !txs.length) return '<div class="empty-state"><div class="empty-icon">💸</div><div class="empty-title">Sin transacciones</div></div>';
    return `<table><thead><tr><th>Categoría</th><th>Descripción</th><th>Fecha</th><th>Monto</th><th>Tipo</th><th></th></tr></thead><tbody>
      ${txs.map(t=>`<tr>
        <td><span class="cat-dot" style="background:${t.codigo_color||'#8896b0'}"></span>${t.categoria_nombre||'—'}</td>
        <td>${t.descripcion||'—'}</td>
        <td class="mono">${new Date(t.fecha+'T12:00:00').toLocaleDateString('es-MX')}</td>
        <td class="mono" style="font-weight:700;color:${t.tipo==='ingreso'?'var(--accent)':'var(--danger)'}">
          ${t.tipo==='ingreso'?'+':'-'}$${parseFloat(t.monto).toFixed(2)}</td>
        <td><span class="pill ${t.tipo==='ingreso'?'pill-green':'pill-red'}">${t.tipo==='ingreso'?'Ingreso':'Gasto'}</span></td>
        <td><button class="btn btn-xs btn-ghost" onclick="App.deleteTx(${t.id_transaccion})">🗑</button></td>
      </tr>`).join('')}
    </tbody></table>`;
  }

  return {
    init() {
      document.getElementById('btn-login')?.addEventListener('click', this.handleLogin.bind(this));
      ['login-email','login-pass'].forEach(id=>{
        document.getElementById(id)?.addEventListener('keypress',e=>{if(e.key==='Enter')this.handleLogin();});
      });

      document.getElementById('toggle-auth-mode')?.addEventListener('click', (e) => {
        e.preventDefault();
        _isLogin = !_isLogin;
        document.getElementById('group-pass-confirm')?.classList.toggle('hidden', _isLogin);
        document.getElementById('btn-login-text').textContent = _isLogin ? 'Iniciar sesión' : 'Crear cuenta';
        document.querySelector('.login-title').textContent = _isLogin ? 'Bienvenido 👋' : 'Nueva Cuenta 🚀';
        document.querySelector('.login-sub').textContent = _isLogin ? 'Ingresa tus credenciales para acceder a tu gestor financiero.' : 'Crea tus credenciales para comenzar a gestionar tu dinero.';
        e.target.textContent = _isLogin ? 'Crear una cuenta nueva' : '¿Ya tienes cuenta? Inicia sesión';
        ['err-email','err-pass','err-general'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));
      });

      document.getElementById('btn-logout')?.addEventListener('click',this.logout.bind(this));

      document.querySelectorAll('.nav-item[data-section]').forEach(btn=>{
        btn.addEventListener('click',()=>{
          this.navigate(btn.dataset.section);
          document.getElementById('sidebar')?.classList.remove('open');
          document.getElementById('sidebar-backdrop')?.classList.remove('open');
        });
      });

      document.getElementById('hamburger')?.addEventListener('click',()=>{
        document.getElementById('sidebar')?.classList.toggle('open');
        document.getElementById('sidebar-backdrop')?.classList.toggle('open');
      });
      document.getElementById('sidebar-backdrop')?.addEventListener('click',()=>{
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebar-backdrop')?.classList.remove('open');
      });
      
      const dz=document.getElementById('drop-zone');
      if(dz) {
        dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('dragover');});
        dz.addEventListener('dragleave',()=>dz.classList.remove('dragover'));
        dz.addEventListener('drop',e=>{
          e.preventDefault();dz.classList.remove('dragover');
          const f=e.dataTransfer.files[0];
          const ocrInput = document.getElementById('file-ocr');
          if(f && ocrInput){const dt=new DataTransfer();dt.items.add(f);ocrInput.files=dt.files;this.processOCR();}
        });
      }
      
      document.getElementById('file-ocr')?.addEventListener('change',()=>this.processOCR());
      
      document.querySelectorAll('.modal-overlay').forEach(o=>{
        o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');});
      });
      
      ApiClient.get('auth.php?action=me').then(r=>{
        if(r.success && r.data && r.data.usuario) this._initApp(r.data.usuario);
      });
      
      window.addEventListener('resize',()=>{ if(document.getElementById('page-app')?.classList.contains('active')) this._drawCharts(); });
    },

    async handleLogin() {
      const emailEl = document.getElementById('login-email');
      const passEl = document.getElementById('login-pass');
      const email = emailEl?.value.trim() || '';
      const pass = passEl?.value || '';
      
      ['err-email','err-pass','err-general'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));
      ['login-email','login-pass'].forEach(id=>document.getElementById(id)?.classList.remove('error'));
      
      if(!email){
        const errE = document.getElementById('err-email');
        if(errE) { errE.textContent='El correo es requerido.'; errE.classList.remove('hidden'); }
        if(emailEl) emailEl.classList.add('error'); return;
      }
      if(!pass){
        const errP = document.getElementById('err-pass');
        if(errP) { errP.textContent='La contraseña es requerida.'; errP.classList.remove('hidden'); }
        if(passEl) passEl.classList.add('error'); return;
      }
      
      const btnTxt = document.getElementById('btn-login-text');
      const btnSpin = document.getElementById('btn-spin');
      const btnLog = document.getElementById('btn-login');
      
      // --- NUEVA VALIDACIÓN DE REGISTRO ---
      if(!_isLogin){
        const passConf = document.getElementById('login-pass-confirm')?.value;
        if(pass !== passConf){
          const errG = document.getElementById('err-general');
          if(errG) { errG.textContent='Las contraseñas no coinciden.'; errG.classList.remove('hidden'); }
          return;
        }
      }

      if(btnTxt) btnTxt.textContent = _isLogin ? 'Verificando...' : 'Creando cuenta...';
      if(btnSpin) btnSpin.classList.remove('hidden');
      if(btnLog) btnLog.disabled=true;

      try {
        // --- ENVÍO DINÁMICO ---
        const endpoint = _isLogin ? 'auth.php?action=login' : 'auth.php?action=register';
        const res = await ApiClient.post(endpoint, {correo:email, password:pass});
        // ----------------------

        if(btnTxt) btnTxt.textContent = _isLogin ? 'Iniciar sesión' : 'Crear cuenta';
        if(btnSpin) btnSpin.classList.add('hidden');
        if(btnLog) btnLog.disabled=false;

        if(res.success){
          if(!_isLogin) Toast.show('Cuenta creada exitosamente.','success');
          this._initApp(res.data.usuario);
        } else if(res.error==='bloqueado'){
          document.getElementById('lock-notice')?.classList.remove('hidden');
          if(btnLog) btnLog.disabled=true;
          let s=res.data?.segundos||60;
          const t=setInterval(()=>{
            const lt = document.getElementById('lock-timer');
            if(lt) lt.textContent=--s;
            if(s<=0){
              clearInterval(t);
              document.getElementById('lock-notice')?.classList.add('hidden');
              if(btnLog) btnLog.disabled=false;
            }
          },1000);
        } else {
          const e=document.getElementById('err-general');
          if(e) {
            e.textContent=res.error+(res.data?.restantes?' ('+res.data.restantes+' intentos restantes)':'');
            e.classList.remove('hidden');
          }
          ['login-email','login-pass'].forEach(id=>document.getElementById(id)?.classList.add('error'));
        }
      } catch(err) {
        if(btnTxt) btnTxt.textContent='Iniciar sesión';
        if(btnSpin) btnSpin.classList.add('hidden');
        if(btnLog) btnLog.disabled=false;
        Toast.show('Error de conexión con el servidor.','error');
      }
    },

    _initApp(usuario) {
      showPage('page-app');
      if(!usuario) return;
      
      // Asignación segura del correo
      const correo = usuario.correo_electronico || usuario.correoElectronico || '';
      const ini = correo ? correo.charAt(0).toUpperCase() : 'U';
      const nombre = correo ? correo.split('@')[0] : 'Usuario';
      
      // Función Helper para inyectar texto de forma segura sin congelar el código
      const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };

      setTxt('sidebar-avatar', ini);
      setTxt('profile-avatar', ini);
      setTxt('sidebar-name', nombre);
      setTxt('profile-name', nombre);
      setTxt('profile-email-show', correo);
      
      const ua = usuario.ultimo_acceso || usuario.ultimoAcceso;
      setTxt('profile-last-access', ua ? new Date(ua).toLocaleString('es-MX') : '—');

      // 🔥 Cargar categorías (ahora garantizado porque el código no se congela arriba)
      ApiClient.get('categorias.php?action=list').then(r=>{
        if(r.success){
          _cats = r.data || [];
          this._populateCatSelect();
        }
      }).catch(e => console.error("Error cargando categorías"));

      this.navigate('dashboard');
      Toast.show(`Bienvenido, ${nombre} 👋`,'success');
    },

    async logout() {
      await ApiClient.post('auth.php?action=logout');
      showPage('page-login');
      ['login-email','login-pass'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
      Toast.show('Sesión cerrada.','info');
    },

    navigate(section) {
      _seccion=section;
      document.querySelectorAll('.section-panel').forEach(s=>s.classList.remove('active'));
      const sec=document.getElementById('sec-'+section);
      if(sec) sec.classList.add('active');
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.section===section));
      
      const tit = document.getElementById('topbar-title');
      if(tit) tit.textContent = TITLES[section]||section;
      
      const map={
        dashboard:()=>this._renderDashboard(),
        transacciones:()=>this.renderTransactions(),
        ocr:()=>this._loadOCRDocs(),
        suscripciones:()=>this._renderSubs(),
        metas:()=>this._renderMetas(),
        soporte:()=>this._renderTickets(),
        perfil:()=>this._renderPerfil(),
      };
      if(map[section]) setTimeout(map[section].bind(this),60);
    },

    async _renderDashboard() {
      const r=await ApiClient.get('dashboard.php');
      if(!r.success){Toast.show('Error cargando dashboard.','error');return;}
      const d=r.data || {};
      const saldo = parseFloat(d.saldo_actual) || 0;
      const tIng = parseFloat(d.total_ingresos) || 0;
      const tGas = parseFloat(d.total_gastos) || 0;
      const tTxs = d.total_transacciones || 0;
      const inst = d.cuenta?.nombre_institucion || 'FinTrack';
      
      const statsGrid = document.getElementById('stats-grid');
      if(statsGrid){
        statsGrid.innerHTML=`
          <div class="stat-card green"><div class="stat-label">Saldo Disponible</div><div class="stat-value ${saldo>=0?'green':'red'} mono">$${saldo.toFixed(2)}</div><div class="stat-delta">${inst}</div></div>
          <div class="stat-card blue"><div class="stat-label">Ingresos Totales</div><div class="stat-value blue mono">$${tIng.toFixed(2)}</div><div class="stat-delta">Acumulado</div></div>
          <div class="stat-card red"><div class="stat-label">Gastos Totales</div><div class="stat-value red mono">$${tGas.toFixed(2)}</div><div class="stat-delta">Acumulado</div></div>
          <div class="stat-card purple"><div class="stat-label">Transacciones</div><div class="stat-value purple mono">${tTxs}</div><div class="stat-delta">Registros</div></div>
        `;
      }
      const dashTxs = document.getElementById('dash-transactions');
      if(dashTxs) dashTxs.innerHTML = txTableHTML(d.ultimas_transacciones||[]);
      setTimeout(()=>this._drawCharts(d)+'', 100);
    },

    _drawCharts(d) {
      if(!d){ApiClient.get('dashboard.php').then(r=>{if(r.success)this._drawCharts(r.data);});return;}
      const cats=d.gastos_por_categoria||[];
      ChartEngine.drawDonut('chart-donut',cats.map(c=>parseFloat(c.total)),cats.map(c=>c.nombre),cats.map(c=>c.codigo_color||'#8896b0'));
      const flujo=d.flujo_mensual||[];
      const meses=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      ChartEngine.drawBars('chart-bar',
        flujo.map(f=>{const[y,m]=f.mes.split('-');return meses[parseInt(m)-1]||f.mes;}),
        flujo.map(f=>parseFloat(f.ingresos)),
        flujo.map(f=>parseFloat(f.gastos))
      );
    },

    async renderTransactions() {
      const catF=document.getElementById('filter-cat')?.value || '';
      const typeF=document.getElementById('filter-type')?.value || '';
      let ep='transacciones.php?action=list';
      if(catF) ep+='&id_categoria='+catF;
      if(typeF) ep+='&tipo='+typeF;
      
      const r=await ApiClient.get(ep);
      const sel=document.getElementById('filter-cat');
      if(sel) {
        const cur=sel.value;
        sel.innerHTML='<option value="">Todas las categorías</option>';
        _cats.forEach(c=>sel.innerHTML+=`<option value="${c.id_categoria}" ${c.id_categoria==cur?'selected':''}>${c.nombre}</option>`);
      }
      
      const full = document.getElementById('full-transactions');
      if(full) full.innerHTML = r.success ? txTableHTML(r.data) : '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error cargando transacciones</div></div>';
    },

    async deleteTx(id) {
      const r=await ApiClient.delete('transacciones.php?action=delete&id='+id);
      if(r.success){
        Toast.show('Transacción eliminada.','info');
        if(_seccion==='transacciones') this.renderTransactions();
        if(_seccion==='dashboard') this._renderDashboard();
      } else Toast.show(r.error||'Error al eliminar.','error');
    },

    _populateCatSelect() {
      const sel=document.getElementById('mov-cat');
      if(!sel) return;
      sel.innerHTML='<option value="">Seleccionar...</option>';
      _cats.forEach(c=>sel.innerHTML+=`<option value="${c.id_categoria}">${c.nombre}</option>`);
    },

    setMovType(t) {
      _movTipo=t;
      document.getElementById('seg-gasto')?.classList.toggle('active',t==='gasto');
      document.getElementById('seg-ingreso')?.classList.toggle('active',t==='ingreso');
      this.onCatChange(); 
    },

    async onCatChange() {
      const id=document.getElementById('mov-cat')?.value;
      const sug=document.getElementById('monto-sug');
      if(!id||_movTipo!=='gasto'){ if(sug) sug.style.display='none'; return;}
      
      const r=await ApiClient.get('transacciones.php?action=sugerir&id_categoria='+id);
      if(r.success&&r.data&&r.data.monto){
        if(sug) {
          sug.textContent='💡 Promedio histórico: $'+r.data.monto;
          sug.style.display='block';
        }
      } else {
        if(sug) sug.style.display='none';
      }
    },

    onMontoChange(){ const s = document.getElementById('monto-sug'); if(s) s.style.display='none'; },

    async saveMovimiento() {
      const elMonto=document.getElementById('mov-monto');
      const elFecha=document.getElementById('mov-fecha');
      const elCat=document.getElementById('mov-cat');
      const elDesc=document.getElementById('mov-desc');
      const elRound=document.getElementById('mov-round');

      const monto=parseFloat(elMonto?.value||0);
      const fecha=elFecha?.value||'';
      const cat=elCat?.value||'';
      const desc=elDesc?.value.trim()||'';
      const round=elRound?.checked||false;
      
      ['err-monto','err-cat'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));
      ['mov-monto','mov-cat'].forEach(id=>document.getElementById(id)?.classList.remove('error'));
      
      let err=false;
      if(!monto||monto<=0){
        const em = document.getElementById('err-monto');
        if(em) { em.textContent='Monto positivo requerido.'; em.classList.remove('hidden'); }
        if(elMonto) elMonto.classList.add('error');
        err=true;
      }
      if(!cat){
        const ec = document.getElementById('err-cat');
        if(ec) { ec.textContent='Selecciona una categoría.'; ec.classList.remove('hidden'); }
        if(elCat) elCat.classList.add('error');
        err=true;
      }
      if(!fecha){Toast.show('Fecha requerida.','error');err=true;}
      if(err)return;
      
      const r=await ApiClient.post('transacciones.php?action=create',{
        monto,fecha,tipo:_movTipo,id_categoria:parseInt(cat),
        descripcion:desc,aplicar_redondeo:round?1:0
      });
      
      if(r.success){
        Toast.show('Movimiento guardado. Saldo: $'+parseFloat(r.data.saldo_actual).toFixed(2),'success');
        if(r.data.redondeo>0)Toast.show('💰 Redondeo $'+r.data.redondeo.toFixed(2)+' aplicado a meta.','info');
        this.closeModal('modal-gasto');
        if(elMonto) elMonto.value='';
        if(elDesc) elDesc.value='';
        if(elCat) elCat.value='';
        if(elRound) elRound.checked=false;
        const sug=document.getElementById('monto-sug'); if(sug) sug.style.display='none';
        
        if(_seccion==='dashboard')this._renderDashboard();
        if(_seccion==='transacciones')this.renderTransactions();
      } else Toast.show(r.error||'Error al guardar.','error');
    },

    async processOCR() {
      const fileEl=document.getElementById('file-ocr');
      if(!fileEl || !fileEl.files[0]){Toast.show('Selecciona un archivo.','error');return;}
      
      Toast.show('Procesando OCR...','info',2000);
      const fd=new FormData();fd.append('archivo',fileEl.files[0]);
      const r=await ApiClient.upload('ocr.php?action=procesar',fd);
      
      if(r.success){
        _pendingOCR=r.data;
        const el=document.getElementById('ocr-fields-render');
        if(el){
          el.innerHTML=Object.entries(r.data.campos_extraidos).map(([k,v])=>
            `<div class="ocr-field"><span class="ocr-key">${k}</span><span class="ocr-val">${v}</span></div>`
          ).join('');
        }
        const block = document.getElementById('ocr-result-block');
        if(block) block.style.display='block';
        Toast.show('OCR completado. Confirma los datos.','success');
      } else Toast.show(r.error||'Error OCR.','error');
    },

    async confirmOCR() {
      if(!_pendingOCR){Toast.show('Sin datos pendientes.','error');return;}
      const r=await ApiClient.post('ocr.php?action=confirmar',_pendingOCR);
      if(r.success){
        Toast.show(`Guardado. Hash: ${r.data.hash_documento.substr(0,24)}…`,'success',5000);
        document.getElementById('ocr-result-block')?.style.setProperty('display', 'none');
        const f = document.getElementById('file-ocr'); if(f) f.value='';
        _pendingOCR=null;
        this._loadOCRDocs();
        if(_seccion==='dashboard')this._renderDashboard();
      }else Toast.show(r.error||'Error al confirmar.','error');
    },

    cancelOCR(){
      _pendingOCR=null;
      document.getElementById('ocr-result-block')?.style.setProperty('display', 'none');
      const f = document.getElementById('file-ocr'); if(f) f.value='';
    },

    async _loadOCRDocs(){
      const r=await ApiClient.get('ocr.php?action=list');
      const el=document.getElementById('ocr-docs-list');
      if(!el) return;
      if(!r.success||!r.data||!r.data.length){el.innerHTML='<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">📄</div><div class="empty-title">Sin documentos</div></div>';return;}
      el.innerHTML=r.data.map(d=>`<div class="ticket-item" style="margin-bottom:10px;">
        <div style="font-size:1.4rem;">📄</div>
        <div class="ticket-body">
          <div class="ticket-subject">${d.url_archivo}</div>
          <div class="ticket-meta">Folio: ${d.campos_extraidos?.Folio||'—'} · ${d.campos_extraidos?.MontoTotal||''}</div>
          <div class="ticket-meta mono" style="color:var(--accent);font-size:.72rem;margin-top:4px;">${d.hash_documento?.substr(0,36)||''}…</div>
        </div></div>`).join('');
    },

    async _renderSubs(){
      const r=await ApiClient.get('suscripciones.php?action=list');
      if(!r.success){Toast.show('Error cargando suscripciones.','error');return;}
      const {suscripciones:subs,total_mensual,total_anual}=r.data;
      
      const stats = document.getElementById('sub-stats');
      if(stats){
        stats.innerHTML=`
          <div class="stat-card blue"><div class="stat-label">Gasto Mensual</div><div class="stat-value blue mono">$${parseFloat(total_mensual).toFixed(2)}</div><div class="stat-delta">${subs.length} suscripciones</div></div>
          <div class="stat-card purple"><div class="stat-label">Gasto Anual</div><div class="stat-value purple mono">$${parseFloat(total_anual).toFixed(2)}</div><div class="stat-delta">Proyección</div></div>
          <div class="stat-card red"><div class="stat-label">Próximo Cobro</div><div class="stat-value red mono">${subs.length?'$'+parseFloat(subs[0].costo).toFixed(2):'—'}</div><div class="stat-delta">${subs[0]?.nombre_servicio||''}</div></div>
        `;
      }
      
      const list = document.getElementById('sub-list');
      if(list){
        list.innerHTML=subs.map(s=>`
          <div class="sub-card" style="margin-bottom:10px;">
            <div class="sub-logo">${s.emoji||'💳'}</div>
            <div class="sub-info">
              <div class="sub-name">${s.nombre_servicio}</div>
              <div class="sub-freq">${s.frecuencia_cobro}${s.recordatorio?` · <span style="color:var(--warn)">${s.recordatorio}</span>`:''}</div>
            </div>
            <div>
              <div class="sub-cost">$${parseFloat(s.costo_mensual).toFixed(2)}<span style="font-size:.7rem;font-weight:400;color:var(--t2)">/mo</span></div>
              <button class="btn btn-xs btn-ghost" style="margin-top:6px;display:block;" onclick="App.deleteSub(${s.id_suscripcion})">🗑 Eliminar</button>
            </div>
          </div>`).join('')||'<div class="empty-state"><div class="empty-icon">🔄</div><div class="empty-title">Sin suscripciones</div></div>';
      }
      
      const alerts = document.getElementById('sub-alerts');
      if(alerts) alerts.innerHTML=subs.filter(s=>s.recordatorio).map(s=>`<div class="alert alert-warning">⚠️ ${s.recordatorio}</div>`).join('');
      
      setTimeout(()=>{
        const ctx=document.getElementById('chart-subs');
        if(!ctx)return;
        const dpr=window.devicePixelRatio||1;
        const rect=ctx.getBoundingClientRect();
        ctx.width=rect.width*dpr;ctx.height=rect.height*dpr;
        const c=ctx.getContext('2d');c.scale(dpr,dpr);
        const W=rect.width,H=rect.height;
        if(!subs.length){c.fillStyle='#8896b0';c.font='13px Plus Jakarta Sans';c.textAlign='center';c.fillText('Sin suscripciones',W/2,H/2);return;}
        const colors=['#3b82f6','#8b5cf6','#f59e0b','#ef4444','#10b981','#ec4899'];
        const data=subs.map(s=>parseFloat(s.costo_mensual));
        const total=data.reduce((a,b)=>a+b,0);
        const cx=W*0.38,cy=H/2,rad=Math.min(W,H)*0.38;
        let angle=-Math.PI/2;
        data.forEach((d,i)=>{
          const sl=(d/total)*2*Math.PI;
          c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,rad,angle,angle+sl);c.closePath();
          c.fillStyle=colors[i%colors.length];c.fill();angle+=sl;
        });
        c.beginPath();c.arc(cx,cy,rad*0.55,0,2*Math.PI);c.fillStyle='#0f1623';c.fill();
        c.fillStyle='#e8edf5';c.font='bold 12px JetBrains Mono,monospace';c.textAlign='center';c.textBaseline='middle';
        c.fillText('$'+total.toFixed(0)+'/mo',cx,cy);
        const lx=W*0.66,ly=H*0.1;
        subs.slice(0,5).forEach((s,i)=>{
          const y=ly+i*22;c.fillStyle=colors[i%colors.length];c.fillRect(lx,y-6,10,10);
          c.fillStyle='#8896b0';c.font='11px Plus Jakarta Sans';c.textAlign='left';c.textBaseline='middle';
          c.fillText(s.nombre_servicio.substr(0,12),lx+14,y);
        });
      },100);
    },

    async deleteSub(id){
      const r=await ApiClient.delete('suscripciones.php?action=delete&id='+id);
      if(r.success){Toast.show('Suscripción eliminada.','info');this._renderSubs();}
      else Toast.show(r.error||'Error.','error');
    },

    async saveSub(){
      const nom=document.getElementById('sub-nombre')?.value.trim();
      const emoji=document.getElementById('sub-emoji')?.value.trim()||'💳';
      const costo=parseFloat(document.getElementById('sub-costo')?.value);
      const freq=document.getElementById('sub-freq')?.value;
      const fecha=document.getElementById('sub-fecha')?.value;
      
      if(!nom||!costo||!fecha){Toast.show('Completa los campos requeridos.','error');return;}
      const r=await ApiClient.post('suscripciones.php?action=create',{nombre_servicio:nom,emoji,costo,frecuencia_cobro:freq,proxima_fecha_pago:fecha});
      if(r.success){
        Toast.show('Suscripción creada.','success');this.closeModal('modal-sub');
        ['sub-nombre','sub-emoji','sub-costo','sub-fecha'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
        this._renderSubs();
      }else Toast.show(r.error||'Error.','error');
    },

    async _renderMetas(){
      const r=await ApiClient.get('metas.php?action=list');
      const grid=document.getElementById('metas-grid');
      if(!grid) return;
      if(!r.success||!r.data||!r.data.length){grid.innerHTML='<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">Sin espacios</div><div class="empty-sub">Crea tu primera meta de ahorro.</div></div>';return;}
      grid.innerHTML=r.data.map(m=>{
        const pct=m.porcentaje_progreso||0;
        const dias=m.dias_restantes||0;
        const bc=pct>=100?'':pct<50?'danger':'warning';
        return `<div class="goal-card">
          <div class="goal-emoji">${m.emoji||'🎯'}</div>
          <div class="goal-name">${m.nombre}</div>
          <div class="goal-amounts">
            <span class="goal-current">$${parseFloat(m.ahorro_actual).toFixed(0)}</span>
            <span class="goal-target">/ $${parseFloat(m.monto_objetivo).toFixed(0)}</span>
            <span class="goal-pct">${pct}%</span>
          </div>
          <div class="progress-wrap"><div class="progress-bar ${bc}" style="width:${pct}%"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:12px;">
            <span style="font-size:.78rem;color:var(--t2);">⏰ ${dias} días restantes</span>
            <span class="pill ${pct>=100?'pill-green':dias<30?'pill-red':'pill-yellow'}">${pct>=100?'✅ Lograda':dias<30?'⚠️ Urgente':'En progreso'}</span>
          </div>
          ${pct>=100?`<div class="alert alert-success" style="margin-top:12px;">🎉 ¡Meta alcanzada! <button class="btn btn-xs" style="background:var(--accent);color:#000;margin-left:8px;" onclick="App.transferirMeta(${m.id_meta})">Mover a cuenta</button></div>`:''}
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="btn btn-ghost btn-xs" style="flex:1;" onclick="App.abonarMeta(${m.id_meta})">＋ Abonar</button>
            <button class="btn btn-ghost btn-xs" onclick="App.deleteMeta(${m.id_meta})">🗑</button>
          </div>
        </div>`;
      }).join('');
    },

    async saveMeta(){
      const nom=document.getElementById('meta-nombre')?.value.trim();
      const emoji=document.getElementById('meta-emoji')?.value.trim()||'🎯';
      const obj=parseFloat(document.getElementById('meta-obj')?.value);
      const actual=parseFloat(document.getElementById('meta-actual')?.value)||0;
      const fecha=document.getElementById('meta-fecha')?.value;
      
      if(!nom||!obj||!fecha){Toast.show('Completa los campos requeridos.','error');return;}
      const r=await ApiClient.post('metas.php?action=create',{nombre:nom,emoji,monto_objetivo:obj,ahorro_actual:actual,fecha_limite:fecha});
      if(r.success){
        Toast.show('Espacio creado.','success');this.closeModal('modal-meta');
        ['meta-nombre','meta-emoji','meta-obj','meta-actual','meta-fecha'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
        this._renderMetas();
      } else Toast.show(r.error||'Error.','error');
    },

    async abonarMeta(id){
      const monto=prompt('¿Cuánto deseas abonar?');
      if(!monto||isNaN(parseFloat(monto)))return;
      const r=await ApiClient.put('metas.php?action=abonar&id='+id,{monto:parseFloat(monto)});
      if(r.success){
        Toast.show('Abono registrado. Progreso: '+r.data.porcentaje+'%',r.data.porcentaje>=100?'success':'info');
        if(r.data.porcentaje>=100)Toast.show('🎉 ¡Meta alcanzada!','success',5000);
        this._renderMetas();
      }else Toast.show(r.error||'Error.','error');
    },

    async transferirMeta(id){
      const r=await ApiClient.put('metas.php?action=transferir&id='+id,{});
      if(r.success){Toast.show(r.message,'success');this._renderMetas();this._renderDashboard();}
      else Toast.show(r.error||'Error.','error');
    },

    async deleteMeta(id){
      const r=await ApiClient.delete('metas.php?action=delete&id='+id);
      if(r.success){Toast.show('Meta eliminada.','info');this._renderMetas();}
      else Toast.show(r.error||'Error.','error');
    },

    async submitTicket(){
      const asunto=document.getElementById('tkt-subject')?.value.trim();
      const tipo=document.getElementById('tkt-type')?.value;
      const desc=document.getElementById('tkt-desc')?.value.trim();
      
      if(!asunto||!desc){Toast.show('Completa asunto y descripción.','error');return;}
      const r=await ApiClient.post('soporte.php?action=crear',{asunto,tipo,descripcion:desc});
      if(r.success){
        Toast.show('Ticket enviado. Folio: '+r.data.folio,'success',5000);
        const sub=document.getElementById('tkt-subject'); if(sub) sub.value='';
        const tdesc=document.getElementById('tkt-desc'); if(tdesc) tdesc.value='';
        this._renderTickets();
      }else Toast.show(r.error||'Error.','error');
    },

    async _renderTickets(){
      const r=await ApiClient.get('soporte.php?action=list');
      const el=document.getElementById('ticket-list');
      if(!el) return;
      if(!r.success||!r.data||!r.data.length){el.innerHTML='<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">🎧</div><div class="empty-title">Sin tickets</div></div>';return;}
      const icons={error:'🔴',duda:'🟡',sugerencia:'💡',seguridad:'🔐'};
      el.innerHTML=r.data.map(t=>`<div class="ticket-item">
        <div style="font-size:1.4rem;margin-top:2px;">${icons[t.tipo]||'🔵'}</div>
        <div class="ticket-body">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div class="ticket-subject">${t.asunto}</div>
            <span class="pill ${t.status==='respondido'?'pill-green':'pill-yellow'}">${t.status}</span>
          </div>
          <div class="ticket-meta">${t.folio} · ${new Date(t.created_at).toLocaleString('es-MX')}</div>
          ${t.respuesta?`<div class="alert alert-success" style="margin-top:8px;font-size:.8rem;">💬 ${t.respuesta}</div>`:''}
        </div></div>`).join('');
    },

    async _renderPerfil(){
      const r=await ApiClient.get('perfil.php?action=get');
      if(!r.success)return;
      const {cuenta}=r.data;
      const p = document.getElementById('cuenta-info-profile');
      if(p){
        p.innerHTML=cuenta?`
          <div class="ocr-field"><span class="ocr-key">Tipo</span><span class="ocr-val">${cuenta.tipo}</span></div>
          <div class="ocr-field"><span class="ocr-key">Institución</span><span class="ocr-val">${cuenta.nombre_institucion}</span></div>
          <div class="ocr-field"><span class="ocr-key">Saldo</span><span class="ocr-val mono" style="color:var(--accent)">$${parseFloat(cuenta.saldo_actual).toFixed(2)}</span></div>
          <div class="ocr-field" style="border:none;"><span class="ocr-key">Últ. Sync</span><span class="ocr-val" style="font-size:.78rem;">${new Date(cuenta.ultima_sincronizacion).toLocaleString('es-MX')}</span></div>
        `:'<div style="color:var(--t2);font-size:.85rem;">Sin cuenta vinculada</div>';
      }
    },

    async cambiarPassword(){
      const actual=document.getElementById('pass-actual')?.value;
      const nuevo=document.getElementById('pass-new')?.value;
      const conf=document.getElementById('pass-confirm')?.value;
      
      if(nuevo.length<8){Toast.show('Mínimo 8 caracteres.','error');return;}
      if(nuevo!==conf){Toast.show('Las contraseñas no coinciden.','error');return;}
      
      const r=await ApiClient.put('perfil.php?action=update_password',{password_actual:actual,password_nuevo:nuevo});
      if(r.success){
        Toast.show('Contraseña actualizada.','success');
        ['pass-actual','pass-new','pass-confirm'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
      } else Toast.show(r.error||'Error.','error');
    },

    exportarDatos(){ window.open(ApiClient.BASE + '/perfil.php?action=exportar', '_blank'); },

    openModal(id){ const el=document.getElementById(id); if(el) el.classList.add('open'); document.body.style.overflow='hidden'; },
    closeModal(id){ const el=document.getElementById(id); if(el) el.classList.remove('open'); document.body.style.overflow=''; }
  };
})();

document.addEventListener('DOMContentLoaded',()=>App.init());
document.getElementById('btn-confirm-ocr')?.addEventListener('click',()=>App.confirmOCR());