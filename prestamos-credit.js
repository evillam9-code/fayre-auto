/* ══════════════════════════════════════════════════════════════════════
   MÓDULO PRÉSTAMOS CREDIT FAYRE  (archivo aparte del sistema)
   · Quitarlo: borrar la línea <script src="prestamos-credit.js"> del
     index.html. El resto del sistema sigue igual.
   · Apagarlo sin borrarlo: Configuración → Módulos Adicionales.
   · Llevarlo a otro sistema: copiar este archivo y ajustar solo la
     sección ADAPTADOR.
   · Solo LEE clientes y vehículos. Sus datos van aparte, en los
     documentos pcfPrestamos y pcfConfig de Firebase.
   ══════════════════════════════════════════════════════════════════════ */

// ══ ADAPTADOR: lo único que cambia de un sistema a otro ══
const PCF={
  id:'creditos',
  label:'Préstamos Credit Fayre',
  ico:'💵',
  seccion:'CLIENTES',
  keys:{prestamos:'pcfPrestamos',pagos:'pcfPagos',config:'pcfConfig'},
  clientes:()=>DB.clientes||[],
  vehiculos:()=>DB.vehiculos||[],
  // Vehículos que el cliente compró (para ponerlos primero en la lista)
  vehiculosDeCliente:cid=>(DB.ventas||[]).filter(v=>v.clienteId===cid).map(v=>v.vehiculoId),
  compradorDe:vid=>{const v=(DB.ventas||[]).filter(x=>x.vehiculoId===vid&&x.clienteId).pop();return v?v.clienteId:'';},
  leerCliente:c=>({id:c.id,nombre:c.nombre||'',tipoDoc:c.tipoDoc||'Cédula',documento:c.documento||'',
    direccion:[c.direccion,c.ciudad,c.provincia].filter(Boolean).join(', '),telefono:c.telefono||c.whatsapp||''}),
  leerVehiculo:v=>({id:v.id,codigo:v.codigo||'',tipo:v.tipo||'',marca:v.marca||'',modelo:v.modelo||'',
    anio:v.anio||'',color:v.color||'',chasis:v.vin||'',placa:v.placa||''}),
  logo:()=>(DB.config&&DB.config.logoData)||'',
  usuario:()=>currentUser?(currentUser.nombre||currentUser.username||''):'',
  esAdmin:()=>!!currentUser&&currentUser.role==='admin',
  bitacora:(accion,detalle)=>{if(typeof logBit==='function')logBit(PCF.label,accion,detalle);},
  guardar:k=>sDB(k),
  guardarLocal:(k,v)=>ss(k,v),
  leerLocal:k=>ls(k),
  // undefined = sin conexión · null = todavía no existe
  leerFirebase:async k=>{
    if(!window._fbActivo||!window._fbDB)return undefined;
    const s=await window._fbDB.collection(window._fbCol).doc(k).get();
    return s.exists?JSON.parse(s.data().valor):null;
  },
  // Caja del sistema. En otro sistema sin caja: activa:()=>false
  caja:{
    activa:()=>Array.isArray(DB.caja)&&typeof htmlBancoCuentaFiltrado==='function',
    selector:(prefix,moneda)=>{
      const m=moneda==='US$'?'USD':'RD$',o=opcionesBancoCuenta(m);
      return `<div class="pcf-grid"><div class="form-field"><label>Moneda</label><input type="text" value="${moneda==='US$'?'US$ — Dólares':'RD$ — Pesos'}" readonly style="background:#f8fafc"></div>
        <div class="form-field"><label>Banco</label><select id="${prefix}-banco" onchange="actualizarCuentasFiltrado('${prefix}','${m}')">${o.bancos}</select></div>
        <div class="form-field"><label>Cuenta</label><select id="${prefix}-cuenta">${o.cuentas}</select></div></div>`;
    },
    leer:prefix=>({banco:(document.getElementById(prefix+'-banco')||{}).value||'',cuenta:(document.getElementById(prefix+'-cuenta')||{}).value||''}),
    // movs: [{id,fecha,tipo:'ENTRADA'|'SALIDA',categoria,descripcion,monto,moneda,banco,cuenta,formaPago}]
    registrar:movs=>{
      movs.forEach(m=>DB.caja.push({id:m.id,fecha:m.fecha,tipo:m.tipo,categoria:m.categoria,descripcion:m.descripcion,monto:m.monto,
        moneda:m.moneda==='US$'?'USD':'RD$',banco:normalizarBancoGlobal(m.banco||''),cuenta:limpiarCuenta(m.cuenta||''),
        referencia:m.banco&&m.cuenta?m.banco+' / '+m.cuenta:limpiarCuenta(m.cuenta||''),formaPago:m.formaPago||'',responsable:PCF.usuario()}));
      sDB('caja');if(typeof refreshCajaIfActive==='function')refreshCajaIfActive();
    },
    actualizar:(id,cambios)=>{
      const c=DB.caja.find(x=>x.id===id);if(!c)return;
      if(cambios.moneda)cambios.moneda=cambios.moneda==='US$'?'USD':'RD$';
      Object.assign(c,cambios);sDB('caja');if(typeof refreshCajaIfActive==='function')refreshCajaIfActive();
    },
    borrar:ids=>{
      if(!ids||!ids.length)return;
      DB.caja=DB.caja.filter(c=>!ids.includes(c.id));sDB('caja');if(typeof refreshCajaIfActive==='function')refreshCajaIfActive();
    }
  },
  // Datos de la empresa que presta. Se cambian en la pestaña "Datos legales".
  // Las cédulas y domicilios personales NO van aquí (el código es público): se llenan en el sistema.
  defaults:{
    empresa:{nombre:'CREDITFAYRE SRL',razonSocial:'CREDIT FAYRE, S.R.L.',rnc:'131654037',
      telefonos:'809-770-4184 / 809-915-5053',direccion:'AV. BARTOLOME COLON NO. 13, REPARTO OQUET, STGO.',
      domicilioSocial:'la Autopista Duarte, Kilómetro catorce (14), Tramo Santiago – La Vega, de esta ciudad de Santiago de los Caballeros',
      usarLogo:true},
    representante:{nombre:'RAMON ANTONIO MORONTA LORA',genero:'M',nacionalidad:'dominicana',estadoCivil:'',profesion:'',cedula:'',domicilio:''},
    notario:{titulo:'Licenciado',nombre:'RAFAEL BENOIT MORALES',nacionalidad:'dominicano',estadoCivil:'',profesion:'Abogado',
      cedula:'',matricula:'4724',municipio:'Santiago',residencia:'esta ciudad de Santiago de los Caballeros',
      estudio:'la calle Las Orquídeas casi esquina Carretera Duarte, Condominio Residencial Montecarlo, Apartamento 1-A, Las Dianas, de esta ciudad de Santiago de los Caballeros',
      lugarActo:'la ciudad de Santiago de los Caballeros, Municipio y Provincia de Santiago, República Dominicana',
      ciudadEncabezado:'Santiago, R.D.'},
    condiciones:{moneda:'RD$',tasa:1.3,cuotas:36,forma:'Mensual',modalidad:'fijo',mora:5,diasGracia:0,
      honorarios:1000,honorariosMoneda:'US$',contratoInicial:1,redondeo:true,usarCaja:true},
    ncf:{usar:false,etiqueta:'FACTURA DE CONSUMO',prefijo:'B02',siguiente:1,vencimiento:''}
  }
};

// ══ REGISTRO EN EL SISTEMA ══
(function pcfRegistrar(){
  if(typeof MENU_DEFS!=='undefined'&&!MENU_DEFS.some(m=>m.id===PCF.id))
    MENU_DEFS.push({id:PCF.id,label:PCF.label,ico:PCF.ico,seccionDef:PCF.seccion});
  window.MODULOS_EXTRA=window.MODULOS_EXTRA||[];
  window.MODULOS_EXTRA.push({id:PCF.id,label:PCF.label,ico:PCF.ico,keys:Object.values(PCF.keys),render:()=>pcfRender()});
  const ref=document.getElementById('page-dashboard');
  if(ref&&!document.getElementById('page-'+PCF.id)){
    const d=document.createElement('div');d.className='page';d.id='page-'+PCF.id;ref.parentNode.appendChild(d);
  }
  DB[PCF.keys.prestamos]=PCF.leerLocal(PCF.keys.prestamos)||[];
  DB[PCF.keys.pagos]=PCF.leerLocal(PCF.keys.pagos)||[];
  DB[PCF.keys.config]=PCF.leerLocal(PCF.keys.config)||{};
  const st=document.createElement('style');
  st.textContent=`
.pcf-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:-8px 0 18px}
.pcf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:0 14px}
.pcf-grid .full{grid-column:1/-1}
.pcf-tipo{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.pcf-tipo label{flex:1;min-width:200px;display:flex;align-items:center;gap:10px;padding:12px 14px;border:2px solid var(--gray3);border-radius:10px;cursor:pointer;font-weight:700;font-size:14px;background:#fff}
.pcf-tipo label.on{border-color:var(--blue);background:var(--blue3);color:var(--blue2)}
.pcf-tipo input{width:18px;height:18px;accent-color:var(--blue)}
.pcf-info{background:var(--gray2);border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:12px;line-height:1.7}
.pcf-aviso{background:var(--amber2);color:#92400e;border-radius:8px;padding:8px 12px;font-size:12px;margin:0 0 12px;line-height:1.5}
.pcf-mini{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.pcf-mini>div{background:var(--gray2);border-radius:8px;padding:10px 12px}
.pcf-mini span{font-size:11px;color:var(--gray);text-transform:uppercase;font-weight:600}
.pcf-mini b{display:block;font-size:17px;margin-top:2px}
.pcf-num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.pcf-tabla-wrap{max-height:460px;overflow:auto}
#page-${PCF.id} .table-wrap{width:0;min-width:100%}
.pcf-tabla-wrap td{white-space:nowrap}
.pcf-sub{font-size:12px;font-weight:700;text-transform:uppercase;color:var(--gray);margin:6px 0 10px;letter-spacing:.4px}
.pcf-chk{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;margin:4px 0 12px}
.pcf-chk input{width:18px;height:18px;accent-color:var(--blue)}`;
  document.head.appendChild(st);
  if(typeof currentUser!=='undefined'&&currentUser&&typeof aplicarPermisosNav==='function')aplicarPermisosNav();
})();

// ══ UTILIDADES ══
const pcfR2=x=>{x=+x||0;return Math.round((x+(x>=0?1e-9:-1e-9))*100)/100;};
const pcfN=x=>parseFloat(String(x==null?'':x).replace(/,/g,''))||0;
const pcfFmt=x=>(+x||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const pcfMon=(x,m)=>(m||'RD$')+' '+pcfFmt(x);
const pcfEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const pcfISO=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const pcfHoy=()=>pcfISO(new Date());
const pcfFecha=d=>{if(!d)return '';const p=d.split('-');return p[2]+'-'+p[1]+'-'+p[0];};
const PCF_MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const PCF_MODALIDADES={fijo:'Capital + interés fijo',saldo:'Capital + interés sobre saldo',interes:'Solo interés (capital al final)'};
const PCF_PERIODO={Mensual:['mensual','mensuales'],Quincenal:['quincenal','quincenales'],Semanal:['semanal','semanales']};
const PCF_CIVIL={soltero:['soltero','soltera'],casado:['casado','casada'],union:['en unión libre','en unión libre'],divorciado:['divorciado','divorciada'],viudo:['viudo','viuda']};

function pcfMoneyInput(el){
  let raw=el.value.replace(/[^0-9.]/g,'');const p=raw.split('.');
  let ent=(p[0]||'').replace(/^0+(?=\d)/,'');const dec=p.length>1?'.'+p[1].slice(0,2):'';
  el.value=ent.replace(/\B(?=(\d{3})+(?!\d))/g,',')+dec;
}

// Fecha i períodos después de base (mensual conserva el día; si el mes es corto, usa el último día)
function pcfSumar(base,forma,i){
  const [y,m,d]=base.split('-').map(Number);
  if(forma==='Quincenal'||forma==='Semanal')return pcfISO(new Date(y,m-1,d+(forma==='Semanal'?7:15)*i,12));
  const tm=m-1+i,yy=y+Math.floor(tm/12),mm=((tm%12)+12)%12,max=new Date(yy,mm+1,0).getDate();
  return pcfISO(new Date(yy,mm,Math.min(d,max),12));
}

// ══ NÚMEROS EN LETRAS ══
function pcfNum(n){
  const U=['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE',
    'DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE','VEINTIUNO','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO',
    'VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
  const D=['','','','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  const C=['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
  const m100=x=>x<30?U[x]:D[Math.floor(x/10)]+(x%10?' Y '+U[x%10]:'');
  const m1000=x=>{if(x===100)return 'CIEN';const c=Math.floor(x/100),r=x%100;return (c?C[c]:'')+(c&&r?' ':'')+(r?m100(r):'');};
  n=Math.floor(n);
  if(n===0)return 'CERO';
  const mill=Math.floor(n/1e6),miles=Math.floor((n%1e6)/1000),resto=n%1000,out=[];
  if(mill)out.push(mill===1?'UN MILLÓN':pcfApoc(pcfNum(mill))+' MILLONES');
  if(miles)out.push(miles===1?'MIL':pcfApoc(m1000(miles))+' MIL');
  if(resto)out.push(m1000(resto));
  return out.join(' ');
}
const pcfApoc=s=>s.replace(/VEINTIUNO$/,'VEINTIÚN').replace(/(^|\s)UNO$/,'$1UN');
// conCentavos: true = siempre ("CON CERO CENTAVOS"); false = solo si hay centavos
function pcfMontoLetras(x,mon,larga,conCentavos){
  const v=pcfR2(x),ent=Math.floor(v+1e-9),cts=Math.round((v-ent)*100),usd=mon==='US$';
  let noun=usd?(ent===1?'DÓLAR':'DÓLARES'):(ent===1?'PESO':'PESOS');
  if(larga)noun+=usd?(ent===1?' ESTADOUNIDENSE':' ESTADOUNIDENSES'):(ent===1?' DOMINICANO':' DOMINICANOS');
  const de=ent>=1e6&&ent%1e6===0?' DE':'';
  let s=pcfApoc(pcfNum(ent))+de+' '+noun;
  if(cts||conCentavos)s+=' CON '+(cts?pcfApoc(pcfNum(cts)):'CERO')+' CENTAVO'+(cts===1?'':'S');
  return s;
}
function pcfDecLetras(t){
  const [e,d]=String(+t||0).split('.');
  let s=pcfNum(+e).toLowerCase();
  if(d)s+=' punto '+(d.startsWith('0')?d.split('').map(x=>pcfNum(+x).toLowerCase()).join(' '):pcfNum(+d).toLowerCase());
  return s;
}
function pcfFechaLarga(iso){
  const [y,m,d]=iso.split('-').map(Number);
  return `(${d}) del mes de ${PCF_MESES[m-1]} del año ${pcfNum(y).toLowerCase()} (${y})`;
}

// ══ CÁLCULO DE LA TABLA (versión 1) ══
// La tasa es mensual: en quincenal se cobra la mitad por cuota y en semanal 12/52
const PCF_FACTOR={Mensual:1,Quincenal:0.5,Semanal:12/52};
function pcfTabla(p){
  const cap=pcfR2(p.capital),n=Math.max(1,parseInt(p.cuotas)||1),t=(+p.tasa||0)/100*(PCF_FACTOR[p.forma]||1),com=pcfR2(p.comision);
  const capBase=pcfR2(cap/n),intFijo=pcfR2(cap*t);
  const filas=[];let saldo=cap;
  for(let i=1;i<=n;i++){
    const interes=p.modalidad==='saldo'?pcfR2(saldo*t):intFijo;
    let capital;
    if(i===n)capital=saldo;
    else{
      const exacta=pcfR2((p.modalidad==='interes'?0:capBase)+interes+com);
      const cuota=p.redondeo?Math.ceil(exacta-1e-9):exacta;
      capital=pcfR2(Math.max(0,Math.min(saldo,cuota-interes-com)));
    }
    saldo=pcfR2(saldo-capital);
    filas.push({n:i,fecha:pcfSumar(p.primerPago||pcfSumar(p.fecha,p.forma,1),p.forma,i-1),capital,interes,comision:com,cuota:pcfR2(capital+interes+com),saldoCapital:saldo});
  }
  let resta=pcfR2(filas.reduce((a,f)=>a+f.cuota,0));
  filas.forEach(f=>{resta=pcfR2(resta-f.cuota);f.balance=resta;});
  return filas;
}
function pcfResumen(filas){
  const sum=k=>pcfR2(filas.reduce((a,f)=>a+f[k],0));
  const n=filas.length,primera=filas[0].cuota,ultima=filas[n-1].cuota;
  return {n,cuota:primera,ultima,iguales:filas.slice(0,-1).every(f=>f.cuota===primera),
    intereses:sum('interes'),comisiones:sum('comision'),total:sum('cuota'),inicio:filas[0].fecha,fin:filas[n-1].fecha};
}

// ══ DATOS ══
let pcfTab='resumen',pcfEditId=null,_pcfCarga=0;
const pcfPrestamos=()=>DB[PCF.keys.prestamos]||[];
const pcfId=pref=>pref+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function pcfCfg(){
  const c=DB[PCF.keys.config]||{},out={};
  Object.keys(PCF.defaults).forEach(k=>{out[k]=Object.assign({},PCF.defaults[k],c[k]||{});});
  // Datos guardados antes de que el peso fuera la moneda por defecto
  if(!out.condiciones.monedaRevisada)out.condiciones.moneda='RD$';
  return out;
}
const pcfPagos=()=>DB[PCF.keys.pagos]||[];
const pcfPagosDe=id=>pcfPagos().filter(x=>x.prestamoId===id&&!x.anulado);
// Tabla vigente: la original, recalculada desde cada abono a capital (reajustes)
function pcfTablaActual(p){
  let filas=pcfTabla(p);
  (p.reajustes||[]).forEach(r=>{
    const nuevas=pcfTabla(Object.assign({},p,{capital:r.capital,cuotas:r.cuotas,primerPago:r.primerPago}));
    filas=filas.slice(0,r.desde-1).concat(nuevas.map((f,i)=>Object.assign(f,{n:r.desde+i})));
  });
  let resta=pcfR2(filas.reduce((a,f)=>a+f.cuota,0));
  filas.forEach(f=>{resta=pcfR2(resta-f.cuota);f.balance=resta;});
  return filas;
}
const pcfDias=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);
// Estado del préstamo a una fecha: lo pagado y lo pendiente de cada cuota, con mora
function pcfEstado(p,fechaRef,soloHastaFecha){
  fechaRef=fechaRef||pcfHoy();
  const gracia=parseInt(pcfCfg().condiciones.diasGracia)||0,tasaMora=(+p.mora||0)/100;
  const pagos=pcfPagosDe(p.id).filter(x=>!soloHastaFecha||x.fecha<=fechaRef);
  const filas=pcfTablaActual(p).map(f=>{
    const pag={mora:0,moraExo:0,interes:0,comision:0,capital:0};
    pagos.forEach(x=>(x.detalle||[]).forEach(d=>{if(d.n===f.n)Object.keys(pag).forEach(k=>{pag[k]+=+d[k]||0;});}));
    Object.keys(pag).forEach(k=>{pag[k]=pcfR2(pag[k]);});
    const pendCap=pcfR2(Math.max(0,f.capital-pag.capital)),pendInt=pcfR2(Math.max(0,f.interes-pag.interes)),pendCom=pcfR2(Math.max(0,f.comision-pag.comision));
    const pend=pcfR2(pendCap+pendInt+pendCom);
    const dias=pcfDias(f.fecha,fechaRef);
    let moraPend=0;
    if(pend>0&&dias>gracia&&tasaMora>0)moraPend=pcfR2(Math.max(0,pend*tasaMora*Math.ceil(dias/30)-pag.mora-pag.moraExo));
    const pagado=pcfR2(pag.capital+pag.interes+pag.comision);
    const estado=pend<=0?'PAGADA':dias>0?'VENCIDA':pagado>0?'PARCIAL':'PENDIENTE';
    return Object.assign({},f,{pag,pendCap,pendInt,pendCom,pend,moraPend,dias:Math.max(0,dias),pagado,estado});
  });
  const s=k=>pcfR2(filas.reduce((a,f)=>a+f[k],0));
  const venc=filas.filter(f=>f.estado==='VENCIDA');
  return {filas,saldoCapital:s('pendCap'),interesPend:s('pendInt'),balance:s('pend'),moraPend:s('moraPend'),
    vencido:pcfR2(venc.reduce((a,f)=>a+f.pend,0)),cuotasVencidas:venc.length,pagadas:filas.filter(f=>f.estado==='PAGADA').length,
    n:filas.length,saldado:s('pend')<=0};
}
const pcfSaldoCapital=p=>pcfEstado(p).saldoCapital;
const pcfInteresPendiente=p=>pcfEstado(p).interesPend;
function pcfBadgeEstado(e){
  if(e.saldado)return '<span class="badge badge-green">✅ Saldado</span>';
  if(e.cuotasVencidas)return `<span class="badge badge-red">⚠️ Atrasado (${e.cuotasVencidas})</span>`;
  return '<span class="badge badge-amber">⏳ Al día</span>';
}
// true = datos frescos de Firebase. Sin conexión no se guarda nada (evita borrar datos de otros).
async function pcfCargar(forzar){
  if(!forzar&&_pcfCarga&&Date.now()-_pcfCarga<30000)return true;
  try{
    for(const k of Object.values(PCF.keys)){
      const v=await PCF.leerFirebase(k);
      if(v===undefined)return false;
      if(v!==null){DB[k]=v;PCF.guardarLocal(k,v);}
    }
    _pcfCarga=Date.now();return true;
  }catch(e){console.warn('Préstamos Credit Fayre: no se pudo cargar —',e.message);return false;}
}
function pcfSiguienteContrato(lista){
  const max=lista.reduce((a,p)=>Math.max(a,parseInt(p.contrato)||0),0);
  const ini=parseInt(pcfCfg().condiciones.contratoInicial)||1;
  return String(Math.max(max+1,ini)).padStart(10,'0');
}
function pcfDescVehiculo(v){
  if(!v)return '';
  return [v.marca,v.modelo,v.anio].filter(Boolean).join(' ')+(v.color?' · '+v.color:'');
}

// ══ PANTALLA ══
async function pcfRender(tab){
  // Al volver al módulo no se borra un préstamo a medio escribir; solo se refrescan las listas
  if(!tab&&pcfTab==='nuevo'&&document.getElementById('pcf-monto')){
    pcfFiltrarClientes();const vs=document.getElementById('pcf-veh');pcfLlenarVehiculos(vs?vs.value:'');return;
  }
  if(tab)pcfTab=tab;
  const pg=document.getElementById('page-'+PCF.id);if(!pg)return;
  if(!_pcfCarga)pg.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--gray)">⏳ Cargando préstamos…</div>';
  await pcfCargar();
  const tabs=[['resumen','📊 Resumen'],['nuevo',pcfEditId?'✏️ Editar préstamo':'➕ Nuevo préstamo'],['prestamos','📋 Préstamos'],['cobros','💳 Cobros'],['vencidas','⚠️ Vencidas'],['informes','📊 Informes'],['legal','⚖️ Datos legales']];
  pg.innerHTML=`
    <div class="page-header"><div><h1>${PCF.ico} ${pcfEsc(PCF.label)}</h1><p>Financiamiento de vehículos y préstamos personales a clientes</p></div></div>
    <div class="pcf-tabs">${tabs.map(([id,l])=>`<button class="btn ${id===pcfTab?'btn-primary':'btn-secondary'}" onclick="pcfIr('${id}')">${l}</button>`).join('')}</div>
    <div id="pcf-body"></div>`;
  ({resumen:pcfTabResumen,nuevo:pcfTabNuevo,prestamos:pcfTabPrestamos,cobros:pcfTabCobros,vencidas:pcfTabVencidas,informes:pcfTabInformes,legal:pcfTabLegal}[pcfTab]||pcfTabResumen)();
}
function pcfIr(tab){if(tab!=='nuevo')pcfEditId=null;pcfRender(tab);}

// ── Resumen ──
function pcfTabResumen(){
  const est=pcfPrestamos().map(p=>({p,e:pcfEstado(p)}));
  const act=est.filter(x=>!x.e.saldado);
  const suma=(arr,m,f)=>pcfR2(arr.filter(x=>x.p.moneda===m).reduce((a,x)=>a+f(x),0));
  const dos=(arr,f)=>`${pcfMon(suma(arr,'RD$',f),'RD$')}<div class="stat-sub">${pcfMon(suma(arr,'US$',f),'US$')}</div>`;
  const nV=act.filter(x=>x.p.tipo==='vehiculo').length,atr=act.filter(x=>x.e.cuotasVencidas);
  const mes=pcfHoy().slice(0,7);
  const pagosMes=pcfPagos().filter(x=>!x.anulado&&(x.fecha||'').startsWith(mes)).map(x=>({p:{moneda:x.moneda},x}));
  const ult=pcfPrestamos().slice().sort((a,b)=>(b.contrato||'').localeCompare(a.contrato||'')).slice(0,8);
  document.getElementById('pcf-body').innerHTML=`
    <div class="stats-grid">
      <div class="stat-card blue"><div class="stat-ico">💵</div><div class="stat-label">Capital en la calle</div><div class="stat-value">${dos(act,x=>x.e.saldoCapital)}</div></div>
      <div class="stat-card green"><div class="stat-ico">💳</div><div class="stat-label">Cobrado este mes</div><div class="stat-value">${dos(pagosMes,y=>y.x.monto)}</div></div>
      <div class="stat-card purple"><div class="stat-ico">📋</div><div class="stat-label">Préstamos activos</div><div class="stat-value">${act.length}</div><div class="stat-sub">${nV} de vehículo · ${act.length-nV} personales</div></div>
      <div class="stat-card red" style="cursor:pointer" onclick="pcfIr('vencidas')"><div class="stat-ico">⚠️</div><div class="stat-label">Atrasados: ${atr.length}</div><div class="stat-value">${dos(atr,x=>x.e.vencido)}</div></div>
      <div class="stat-card amber"><div class="stat-ico">📈</div><div class="stat-label">Intereses por cobrar</div><div class="stat-value">${dos(act,x=>x.e.interesPend)}</div></div>
      <div class="stat-card green"><div class="stat-ico">💰</div><div class="stat-label">Intereses cobrados este mes</div><div class="stat-value">${dos(pagosMes,y=>y.x.interes)}</div></div>
      <div class="stat-card amber"><div class="stat-ico">⏱️</div><div class="stat-label">Mora cobrada este mes</div><div class="stat-value">${dos(pagosMes,y=>y.x.mora)}</div></div>
      <div class="stat-card blue"><div class="stat-ico">🧾</div><div class="stat-label">Recibos este mes</div><div class="stat-value">${pagosMes.length}</div></div>
    </div>
    ${ult.length?`<div class="card"><div class="card-title">🕒 Últimos préstamos</div>
      <div class="table-wrap"><table><thead><tr><th>Contrato</th><th>Fecha</th><th>Cliente</th><th>Tipo</th><th class="pcf-num">Capital</th><th class="pcf-num">Saldo capital</th><th>Estado</th></tr></thead><tbody>
      ${ult.map(p=>{const e=pcfEstado(p);return `<tr style="cursor:pointer" onclick="pcfVer('${p.id}')"><td style="font-weight:700">${pcfEsc(p.contrato)}</td><td>${pcfFecha(p.fecha)}</td><td>${pcfEsc(p.cliente.nombre)}</td><td>${pcfBadgeTipo(p)}</td><td class="pcf-num">${pcfMon(p.capital,p.moneda)}</td><td class="pcf-num">${pcfMon(e.saldoCapital,p.moneda)}</td><td>${pcfBadgeEstado(e)}</td></tr>`;}).join('')}
      </tbody></table></div></div>`
    :`<div class="card" style="text-align:center;padding:48px">
      <div style="font-size:48px;margin-bottom:12px">💵</div>
      <div style="font-size:16px;font-weight:700">Crea tu primer préstamo</div>
      <p style="color:var(--gray);margin-top:8px">Los clientes y los vehículos se toman de FAYRE.</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="pcfIr('nuevo')">➕ Nuevo préstamo</button></div>`}`;
}
function pcfBadgeTipo(p){
  return p.tipo==='vehiculo'?`<span class="badge badge-blue">🚗 Vehículo</span>`:`<span class="badge badge-purple">👤 Personal</span>`;
}

// ── Nuevo / editar préstamo ──
function pcfTabNuevo(){
  const co=pcfCfg().condiciones;
  let p=pcfEditId?pcfPrestamos().find(x=>x.id===pcfEditId):null;
  if(pcfEditId&&!p)pcfEditId=null;
  const v=p||{tipo:'vehiculo',moneda:co.moneda,tasa:co.tasa,cuotas:co.cuotas,forma:co.forma,modalidad:co.modalidad,
    redondeo:co.redondeo,mora:co.mora,comision:0,gastosLegales:0,fecha:pcfHoy(),cliente:{},vehiculo:null,garantia:'',notas:''};
  const sel=(id,ops,val,extra)=>`<select id="${id}" ${extra||''}>${ops.map(o=>{const [k,l]=Array.isArray(o)?o:[o,o];return `<option value="${pcfEsc(k)}" ${String(k)===String(val)?'selected':''}>${pcfEsc(l)}</option>`;}).join('')}</select>`;
  const f=(label,html,cls)=>`<div class="form-field ${cls||''}"><label>${label}</label>${html}</div>`;
  const vh=v.vehiculo||{};
  document.getElementById('pcf-body').innerHTML=`
    <div class="card" style="border-top:3px solid var(--blue)">
      <div class="card-title">${pcfEditId?'✏️ Editar préstamo — Contrato '+pcfEsc(p.contrato):'📋 Datos del préstamo'}</div>
      <div class="pcf-tipo">
        <label id="pcf-tipo-veh" class="${v.tipo==='vehiculo'?'on':''}"><input type="radio" name="pcf-tipo" value="vehiculo" ${v.tipo==='vehiculo'?'checked':''} onchange="pcfTipoCambio()">🚗 Financiamiento de vehículo</label>
        <label id="pcf-tipo-per" class="${v.tipo==='personal'?'on':''}"><input type="radio" name="pcf-tipo" value="personal" ${v.tipo==='personal'?'checked':''} onchange="pcfTipoCambio()">👤 Préstamo personal</label>
      </div>

      <div id="pcf-veh-box" style="display:${v.tipo==='vehiculo'?'block':'none'}">
        <div class="pcf-sub">🚗 Vehículo financiado (al elegirlo se llena el cliente que lo compró)</div>
        ${f('Vehículo vendido','<select id="pcf-veh" onchange="pcfVehiculoCambio()"></select>')}
        <div class="pcf-grid">
          ${f('Tipo','<input type="text" id="pcf-v-tipo" placeholder="AUTOMÓVIL" value="'+pcfEsc(vh.tipo||'')+'">')}
          ${f('Marca','<input type="text" id="pcf-v-marca" value="'+pcfEsc(vh.marca||'')+'">')}
          ${f('Modelo','<input type="text" id="pcf-v-modelo" value="'+pcfEsc(vh.modelo||'')+'">')}
          ${f('Año','<input type="text" id="pcf-v-anio" value="'+pcfEsc(vh.anio||'')+'">')}
          ${f('Color','<input type="text" id="pcf-v-color" value="'+pcfEsc(vh.color||'')+'">')}
          ${f('Chasis','<input type="text" id="pcf-v-chasis" value="'+pcfEsc(vh.chasis||'')+'">')}
          ${f('Placa','<input type="text" id="pcf-v-placa" placeholder="EN TRÁMITE" value="'+pcfEsc(vh.placa||'')+'">')}
          ${f('Puertas','<input type="number" id="pcf-v-puertas" min="0" max="9" value="'+pcfEsc(vh.puertas||'')+'">')}
        </div>
      </div>
      <div class="pcf-sub">👤 Cliente (se toma de Clientes, no se modifica)</div>
      <div class="pcf-grid">
        ${f('Buscar cliente','<input type="text" id="pcf-cli-buscar" placeholder="Nombre o documento" oninput="pcfFiltrarClientes()">')}
        ${f('Cliente','<select id="pcf-cli" onchange="pcfClienteCambio()"></select>')}
      </div>
      <div id="pcf-cli-info"></div>
      <div class="pcf-grid">
        ${f('Nacionalidad','<input type="text" id="pcf-c-nac" placeholder="dominicana" value="'+pcfEsc(v.cliente.nacionalidad||'')+'">')}
        ${f('Género',sel('pcf-c-gen',[['M','Masculino'],['F','Femenino']],v.cliente.genero||'M'))}
        ${f('Estado civil',sel('pcf-c-civil',[['soltero','Soltero(a)'],['casado','Casado(a)'],['union','Unión libre'],['divorciado','Divorciado(a)'],['viudo','Viudo(a)']],v.cliente.estadoCivil||'soltero'))}
        ${f('Ocupación','<input type="text" id="pcf-c-ocup" placeholder="empleado privado" value="'+pcfEsc(v.cliente.ocupacion||'')+'">')}
      </div>

      <div id="pcf-per-box" style="display:${v.tipo==='personal'?'block':'none'}">
        <div class="pcf-sub">🔒 Garantía (opcional)</div>
        ${f('Descripción de la garantía','<input type="text" id="pcf-garantia" placeholder="Déjalo vacío si no hay garantía" value="'+pcfEsc(v.garantia||'')+'">')}
      </div>

      <div class="pcf-sub">💰 Condiciones</div>
      <div class="pcf-grid" oninput="pcfActualizar()" onchange="pcfActualizar()">
        ${f('Moneda',sel('pcf-moneda',[['RD$','RD$ — Pesos'],['US$','US$ — Dólares']],v.moneda,'onchange="pcfEntregaBox()"'))}
        ${f('Monto del préstamo','<input type="text" id="pcf-monto" inputmode="decimal" placeholder="0.00" oninput="pcfMoneyInput(this)" value="'+(v.capital?pcfFmt(v.capital):'')+'">')}
        ${f('Tasa mensual %','<input type="number" id="pcf-tasa" step="0.01" min="0" value="'+pcfEsc(v.tasa)+'">')}
        ${f('Número de cuotas','<input type="number" id="pcf-cuotas" step="1" min="1" value="'+pcfEsc(v.cuotas)+'">')}
        ${f('Forma de pago',sel('pcf-forma',['Mensual','Quincenal','Semanal'],v.forma,'onchange="pcfPrimerPagoAuto()"'))}
        ${f('Modalidad',sel('pcf-modalidad',Object.entries(PCF_MODALIDADES),v.modalidad))}
        ${f('Fecha del préstamo','<input type="date" id="pcf-fecha" value="'+pcfEsc(v.fecha)+'" onchange="pcfPrimerPagoAuto()">')}
        ${f('Fecha del primer pago','<input type="date" id="pcf-primer" value="'+pcfEsc(v.primerPago||'')+'" '+(v.primerPago?'data-manual="1"':'')+' onchange="this.dataset.manual=\'1\'">')}
        ${f('Comisión por cuota','<input type="text" id="pcf-comision" inputmode="decimal" placeholder="0.00" oninput="pcfMoneyInput(this)" value="'+(v.comision?pcfFmt(v.comision):'')+'">')}
        ${f('Gastos legales','<input type="text" id="pcf-gastos" inputmode="decimal" placeholder="0.00" oninput="pcfMoneyInput(this)" value="'+(v.gastosLegales?pcfFmt(v.gastosLegales):'')+'">')}
        ${f('Mora % por mes de atraso','<input type="number" id="pcf-mora" step="0.1" min="0" value="'+pcfEsc(v.mora)+'">')}
        ${f('Notas','<input type="text" id="pcf-notas" value="'+pcfEsc(v.notas||'')+'">')}
        <label class="pcf-chk full"><input type="checkbox" id="pcf-redondeo" ${v.redondeo?'checked':''}> Redondear la cuota hacia arriba (la última cuota se ajusta)</label>
      </div>
      <div id="pcf-entrega"></div>
      <div class="btn-row">
        <button class="btn btn-secondary" onclick="pcfDoc('pagare')">📄 Vista previa pagaré</button>
        <button class="btn btn-secondary" onclick="pcfDoc('notarial')">⚖️ Vista previa pagaré notarial</button>
        <button class="btn btn-secondary" onclick="pcfDoc('tabla')">📋 Vista previa tabla</button>
        <button class="btn btn-primary" onclick="pcfConfirmarGuardar()">💾 ${pcfEditId?'Guardar cambios':'Crear préstamo'}</button>
        ${pcfEditId?`<button class="btn btn-secondary" onclick="pcfIr('prestamos')">✕ Cancelar</button>`:''}
      </div>
    </div>
    <div class="card" style="border-top:3px solid var(--green)"><div class="card-title">📊 Resumen</div><div id="pcf-res"></div></div>
    <div class="card"><div class="card-title">📅 Tabla de amortización</div><div id="pcf-tabla"></div></div>`;
  pcfFiltrarClientes(v.cliente.id||'',v.cliente);
  pcfLlenarVehiculos(vh.id||(p&&p.vehiculo?'manual':''));
  pcfClienteInfo();
  pcfPrimerPagoAuto();
  pcfEntregaBox();
  pcfActualizar();
}
// Salida del dinero prestado en Caja (solo al crear; al editar se ajusta la misma salida)
function pcfEntregaBox(){
  const box=document.getElementById('pcf-entrega');if(!box)return;
  const co=pcfCfg().condiciones;
  if(!(co.usarCaja&&PCF.caja.activa())){box.innerHTML='';return;}
  const p=pcfEditId?pcfPrestamos().find(x=>x.id===pcfEditId):null;
  if(p){box.innerHTML=p.entrega&&p.entrega.cajaId?'<div class="pcf-info">💳 La salida del dinero ya está en Caja. Si cambias el monto, la fecha o la moneda, se corrige ahí también.</div>':'';return;}
  const mon=document.getElementById('pcf-moneda').value;
  const forma=(document.getElementById('pcf-ent-forma')||{}).value||'Transferencia';
  box.innerHTML=`<div class="pcf-sub">💳 Entrega del dinero: de dónde sale</div>
    <div class="pcf-grid"><div class="form-field"><label>Forma de entrega</label><select id="pcf-ent-forma">${['Efectivo','Cheque','Transferencia'].map(x=>`<option ${x===forma?'selected':''}>${x}</option>`).join('')}</select></div></div>
    ${PCF.caja.selector('pcf-ent',mon)}`;
}
function pcfTipoCambio(){
  const t=document.querySelector('input[name=pcf-tipo]:checked').value;
  document.getElementById('pcf-tipo-veh').classList.toggle('on',t==='vehiculo');
  document.getElementById('pcf-tipo-per').classList.toggle('on',t==='personal');
  document.getElementById('pcf-veh-box').style.display=t==='vehiculo'?'block':'none';
  document.getElementById('pcf-per-box').style.display=t==='personal'?'block':'none';
}
// guardado = datos del cliente guardados en el préstamo (por si ya no está en Clientes)
function pcfFiltrarClientes(selId,guardado){
  const s=document.getElementById('pcf-cli');if(!s)return;
  const actual=selId!==undefined&&typeof selId==='string'?selId:s.value;
  const q=(document.getElementById('pcf-cli-buscar')?.value||'').toLowerCase().trim();
  const lista=PCF.clientes().slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  const ver=lista.filter(c=>c.id===actual||!q||(c.nombre||'').toLowerCase().includes(q)||(c.documento||'').toLowerCase().includes(q));
  let html='<option value="">— Seleccionar cliente —</option>';
  if(actual&&guardado&&!lista.some(c=>c.id===actual))html+=`<option value="${pcfEsc(actual)}">${pcfEsc(guardado.nombre)} (guardado en el préstamo)</option>`;
  html+=ver.map(c=>`<option value="${pcfEsc(c.id)}">${pcfEsc(c.nombre)}${c.documento?' — '+pcfEsc(c.documento):''}</option>`).join('');
  s.innerHTML=html;s.value=actual;
  if(q&&!actual&&ver.length===1){s.value=ver[0].id;pcfClienteCambio();}
}
function pcfClienteCambio(desdeVehiculo){
  const cid=document.getElementById('pcf-cli').value;
  // Copia nacionalidad, estado civil, etc. del último préstamo del mismo cliente
  const prev=pcfPrestamos().filter(p=>p.cliente&&p.cliente.id===cid&&p.id!==pcfEditId).pop();
  if(prev){
    const c=prev.cliente;
    [['pcf-c-nac',c.nacionalidad],['pcf-c-gen',c.genero],['pcf-c-civil',c.estadoCivil],['pcf-c-ocup',c.ocupacion]].forEach(([id,val])=>{if(val)document.getElementById(id).value=val;});
  }
  pcfClienteInfo();
  if(!desdeVehiculo)pcfLlenarVehiculos('');
}
function pcfClienteInfo(){
  const box=document.getElementById('pcf-cli-info');if(!box)return;
  const cid=document.getElementById('pcf-cli').value;
  const c0=PCF.clientes().find(x=>x.id===cid);
  const prev=pcfEditId?pcfPrestamos().find(x=>x.id===pcfEditId):null;
  const c=c0?PCF.leerCliente(c0):(prev&&prev.cliente.id===cid?prev.cliente:null);
  if(!c){box.innerHTML='';return;}
  const falta=[];if(!c.documento)falta.push('documento');if(!c.direccion)falta.push('dirección');
  box.innerHTML=`<div class="pcf-info"><b>${pcfEsc(c.nombre)}</b><br>${pcfEsc(c.tipoDoc)}: ${pcfEsc(c.documento||'—')} · Tel: ${pcfEsc(c.telefono||'—')}<br>Dirección: ${pcfEsc(c.direccion||'—')}</div>
    ${falta.length?`<div class="pcf-aviso">⚠️ Al cliente le falta: ${falta.join(' y ')}. Complétalo en Clientes, o los documentos saldrán con espacio en blanco.</div>`:''}`;
}
// Vehículos: primero los del cliente elegido, luego los vendidos (con su comprador) y luego el inventario
function pcfLlenarVehiculos(selId){
  const s=document.getElementById('pcf-veh');if(!s)return;
  const cid=document.getElementById('pcf-cli')?.value||'';
  const suyos=cid?PCF.vehiculosDeCliente(cid):[];
  const todos=PCF.vehiculos(),clientes=PCF.clientes();
  const comprador=v=>{const c=clientes.find(x=>x.id===PCF.compradorDe(v.id));return c?c.nombre:'';};
  const op=v=>{const c=comprador(v);return `<option value="${pcfEsc(v.id)}">${c?pcfEsc(c)+' — ':''}${pcfEsc([v.marca,v.modelo,v.anio].filter(Boolean).join(' '))}${v.color?' · '+pcfEsc(v.color):''}${v.codigo?' · '+pcfEsc(v.codigo):''}${v.vin?' · …'+pcfEsc(String(v.vin).slice(-6)):''}</option>`;};
  const deCliente=todos.filter(v=>suyos.includes(v.id));
  const vendidos=todos.filter(v=>!suyos.includes(v.id)&&PCF.compradorDe(v.id)).sort((a,b)=>comprador(a).localeCompare(comprador(b)));
  const resto=todos.filter(v=>!suyos.includes(v.id)&&!PCF.compradorDe(v.id));
  s.innerHTML='<option value="">— Seleccionar vehículo —</option>'
    +(deCliente.length?`<optgroup label="Comprados por este cliente">${deCliente.map(op).join('')}</optgroup>`:'')
    +(vendidos.length?`<optgroup label="Vendidos (cliente — vehículo)">${vendidos.map(op).join('')}</optgroup>`:'')
    +(resto.length?`<optgroup label="Inventario sin venta">${resto.map(op).join('')}</optgroup>`:'')
    +'<option value="manual">✍️ Otro vehículo (escribir a mano)</option>';
  if(selId){s.value=selId;}
  else if(deCliente.length===1&&!document.getElementById('pcf-v-marca').value){s.value=deCliente[0].id;pcfVehiculoCambio();}
}
// Al elegir el vehículo se llenan sus datos y el cliente que lo compró
function pcfVehiculoCambio(){
  const id=document.getElementById('pcf-veh').value;
  const v0=PCF.vehiculos().find(x=>x.id===id);
  if(!v0)return;
  const v=PCF.leerVehiculo(v0);
  [['tipo',v.tipo],['marca',v.marca],['modelo',v.modelo],['anio',v.anio],['color',v.color],['chasis',v.chasis],['placa',v.placa]]
    .forEach(([k,val])=>{document.getElementById('pcf-v-'+k).value=val||'';});
  const cid=PCF.compradorDe(id),sel=document.getElementById('pcf-cli');
  if(cid&&sel.value!==cid&&PCF.clientes().some(c=>c.id===cid)){
    document.getElementById('pcf-cli-buscar').value='';
    pcfFiltrarClientes(cid);pcfClienteCambio(true);
    pcfLlenarVehiculos(id);
  }
}
function pcfPrimerPagoAuto(){
  const el=document.getElementById('pcf-primer'),fe=document.getElementById('pcf-fecha').value;
  if(el&&fe&&!el.dataset.manual)el.value=pcfSumar(fe,document.getElementById('pcf-forma').value,1);
  pcfActualizar();
}
function pcfLeerForm(){
  const g=id=>document.getElementById(id),val=id=>((g(id)&&g(id).value)||'').trim();
  const tipo=(document.querySelector('input[name=pcf-tipo]:checked')||{}).value||'vehiculo';
  const cid=val('pcf-cli');
  const c0=PCF.clientes().find(x=>x.id===cid);
  const prev=pcfEditId?pcfPrestamos().find(x=>x.id===pcfEditId):null;
  const base=c0?PCF.leerCliente(c0):(prev&&prev.cliente.id===cid?prev.cliente:{});
  const vid=val('pcf-veh');
  return {
    tipo,
    cliente:Object.assign({},base,{nacionalidad:val('pcf-c-nac'),genero:val('pcf-c-gen')||'M',estadoCivil:val('pcf-c-civil'),ocupacion:val('pcf-c-ocup')}),
    vehiculo:tipo==='vehiculo'?{id:vid&&vid!=='manual'?vid:'',tipo:val('pcf-v-tipo'),marca:val('pcf-v-marca'),modelo:val('pcf-v-modelo'),
      anio:val('pcf-v-anio'),color:val('pcf-v-color'),chasis:val('pcf-v-chasis'),placa:val('pcf-v-placa'),puertas:val('pcf-v-puertas')}:null,
    garantia:tipo==='personal'?val('pcf-garantia'):'',
    moneda:val('pcf-moneda')||'RD$',capital:pcfR2(pcfN(val('pcf-monto'))),tasa:pcfN(val('pcf-tasa')),
    cuotas:parseInt(val('pcf-cuotas'))||0,forma:val('pcf-forma')||'Mensual',modalidad:val('pcf-modalidad')||'fijo',
    fecha:val('pcf-fecha'),primerPago:val('pcf-primer'),redondeo:!!(g('pcf-redondeo')&&g('pcf-redondeo').checked),
    comision:pcfR2(pcfN(val('pcf-comision'))),gastosLegales:pcfR2(pcfN(val('pcf-gastos'))),mora:pcfN(val('pcf-mora')),
    notas:val('pcf-notas'),calc:1
  };
}
function pcfValidar(d){
  const e=[];
  if(!d.cliente.id)e.push('Selecciona el cliente');
  if(!(d.capital>0))e.push('Escribe el monto del préstamo');
  if(!(d.cuotas>=1&&d.cuotas<=600))e.push('El número de cuotas debe ser entre 1 y 600');
  if(!(d.tasa>=0&&d.tasa<=100))e.push('La tasa mensual no es válida');
  if(!d.fecha)e.push('Escribe la fecha del préstamo');
  if(!d.primerPago)e.push('Escribe la fecha del primer pago');
  else if(d.fecha&&d.primerPago<d.fecha)e.push('El primer pago no puede ser antes de la fecha del préstamo');
  if(d.tipo==='vehiculo'&&!(d.vehiculo.marca&&d.vehiculo.modelo))e.push('Escribe la marca y el modelo del vehículo');
  return e;
}
function pcfActualizar(){
  const res=document.getElementById('pcf-res'),tb=document.getElementById('pcf-tabla');if(!res||!tb)return;
  const d=pcfLeerForm();
  if(!(d.capital>0&&d.cuotas>=1&&d.cuotas<=600&&d.tasa>=0&&d.fecha&&d.primerPago)){
    res.innerHTML=tb.innerHTML='<p style="color:var(--gray);font-size:13px">Completa monto, tasa, cuotas y fechas para ver el cálculo.</p>';return;
  }
  const filas=pcfTabla(d),r=pcfResumen(filas),m=d.moneda;
  res.innerHTML=`<div class="pcf-mini">
    <div><span>Cuota ${PCF_PERIODO[d.forma][0]}</span><b style="color:var(--blue)">${pcfMon(r.cuota,m)}</b></div>
    ${r.ultima!==r.cuota?`<div><span>Última cuota</span><b>${pcfMon(r.ultima,m)}</b></div>`:''}
    <div><span>Total intereses</span><b>${pcfMon(r.intereses,m)}</b></div>
    ${r.comisiones?`<div><span>Total comisiones</span><b>${pcfMon(r.comisiones,m)}</b></div>`:''}
    <div><span>Total a pagar</span><b>${pcfMon(r.total,m)}</b></div>
    <div><span>Primer pago</span><b>${pcfFecha(r.inicio)}</b></div>
    <div><span>Último pago</span><b>${pcfFecha(r.fin)}</b></div>
    ${d.gastosLegales?`<div><span>Gastos legales</span><b>${pcfMon(d.gastosLegales,m)}</b></div>`:''}
  </div>`;
  tb.innerHTML=`<div class="table-wrap pcf-tabla-wrap">${pcfTablaHTML(filas,r)}</div>`;
}
function pcfTablaHTML(filas,r){
  const conCom=r.comisiones>0;
  return `<table><thead><tr><th>Fecha</th><th>Cuota</th><th class="pcf-num">Capital</th><th class="pcf-num">Interés</th>${conCom?'<th class="pcf-num">Comisión</th>':''}<th class="pcf-num">Pago</th><th class="pcf-num">Balance</th><th class="pcf-num">Saldo capital</th></tr></thead><tbody>
    ${filas.map(f=>`<tr><td>${pcfFecha(f.fecha)}</td><td>${f.n}/${r.n}</td><td class="pcf-num">${pcfFmt(f.capital)}</td><td class="pcf-num">${pcfFmt(f.interes)}</td>${conCom?`<td class="pcf-num">${pcfFmt(f.comision)}</td>`:''}<td class="pcf-num" style="font-weight:700">${pcfFmt(f.cuota)}</td><td class="pcf-num">${pcfFmt(f.balance)}</td><td class="pcf-num">${pcfFmt(f.saldoCapital)}</td></tr>`).join('')}
    <tr style="font-weight:800;background:var(--gray2)"><td colspan="2">Totales</td><td class="pcf-num">${pcfFmt(pcfR2(r.total-r.intereses-r.comisiones))}</td><td class="pcf-num">${pcfFmt(r.intereses)}</td>${conCom?`<td class="pcf-num">${pcfFmt(r.comisiones)}</td>`:''}<td class="pcf-num">${pcfFmt(r.total)}</td><td></td><td></td></tr>
  </tbody></table>`;
}
function pcfConfirmarGuardar(){
  const d=pcfLeerForm(),e=pcfValidar(d);
  if(e.length){toast(e[0],'error');return;}
  if(!pcfEditId&&document.getElementById('pcf-ent-banco')){const bc=PCF.caja.leer('pcf-ent');if(!(bc.banco&&bc.cuenta)){toast('Elige el banco y la cuenta de donde sale el dinero','error');return;}}
  const r=pcfResumen(pcfTabla(d));
  openModal(pcfEditId?'💾 Guardar cambios del préstamo':'💾 Crear préstamo',`
    <div style="font-size:14px;line-height:1.8">
      <div><b>Cliente:</b> ${pcfEsc(d.cliente.nombre)}</div>
      <div><b>Tipo:</b> ${d.tipo==='vehiculo'?'Financiamiento de vehículo — '+pcfEsc(pcfDescVehiculo(d.vehiculo)):'Préstamo personal'}</div>
      <div><b>Monto:</b> ${pcfMon(d.capital,d.moneda)} al ${d.tasa}% mensual</div>
      <div><b>Cuotas:</b> ${r.n} ${PCF_PERIODO[d.forma][1]} de ${pcfMon(r.cuota,d.moneda)}${r.ultima!==r.cuota?' (última: '+pcfMon(r.ultima,d.moneda)+')':''}</div>
      <div><b>Total a pagar:</b> ${pcfMon(r.total,d.moneda)}</div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" id="pcf-btn-ok" onclick="pcfGuardar()">💾 Sí, guardar</button>`);
}
async function pcfGuardar(){
  const btn=document.getElementById('pcf-btn-ok');if(btn){btn.disabled=true;btn.textContent='⏳ Guardando…';}
  const d=pcfLeerForm(),e=pcfValidar(d);
  if(e.length){toast(e[0],'error');closeModal();return;}
  const entrega=!pcfEditId&&document.getElementById('pcf-ent-banco')?Object.assign({forma:(document.getElementById('pcf-ent-forma')||{}).value||''},PCF.caja.leer('pcf-ent')):null;
  if(entrega&&!(entrega.banco&&entrega.cuenta)){toast('Elige el banco y la cuenta de donde sale el dinero','error');closeModal();return;}
  if(!await pcfCargar(true)){
    toast('Sin conexión con la base de datos. No se guardó; intenta de nuevo.','error');
    if(btn){btn.disabled=false;btn.textContent='💾 Sí, guardar';}return;
  }
  if(pcfEditId&&pcfPagosDe(pcfEditId).length){toast('Este préstamo ya tiene pagos; no se puede editar','error');closeModal();return;}
  const lista=pcfPrestamos().slice(),ahora=new Date().toISOString();
  let p;
  if(pcfEditId){
    const i=lista.findIndex(x=>x.id===pcfEditId);
    if(i<0){toast('Ese préstamo ya no existe','error');closeModal();pcfIr('prestamos');return;}
    p=Object.assign({},lista[i],d,{editado:{usuario:PCF.usuario(),fecha:ahora}});lista[i]=p;
    if(p.entrega&&p.entrega.cajaId)PCF.caja.actualizar(p.entrega.cajaId,{fecha:p.fecha,monto:p.capital,moneda:p.moneda,descripcion:`Préstamo ${p.contrato}: ${p.cliente.nombre}`});
  } else {
    p=Object.assign({id:pcfId('pcf'),contrato:pcfSiguienteContrato(lista),estado:'ACTIVO',creado:{usuario:PCF.usuario(),fecha:ahora}},d);
    if(entrega)p.entrega=Object.assign(entrega,{fecha:p.fecha,cajaId:pcfId('pcfc')});
    lista.push(p);
  }
  DB[PCF.keys.prestamos]=lista;PCF.guardar(PCF.keys.prestamos);
  if(entrega)PCF.caja.registrar([{id:p.entrega.cajaId,fecha:p.fecha,tipo:'SALIDA',categoria:'Préstamo Otorgado',
    descripcion:`Préstamo ${p.contrato}: ${p.cliente.nombre}`,monto:p.capital,moneda:p.moneda,banco:entrega.banco,cuenta:entrega.cuenta,formaPago:entrega.forma}]);
  const eraEdit=!!pcfEditId;
  PCF.bitacora(eraEdit?'Editó préstamo':'Creó préstamo',`Contrato ${p.contrato} — ${p.cliente.nombre} — ${pcfMon(p.capital,p.moneda)}`);
  pcfEditId=null;closeModal();
  toast(eraEdit?'Préstamo actualizado ✓':'Préstamo creado ✓ Contrato '+p.contrato,'success');
  await pcfRender('prestamos');
  pcfDocsModal(p.id,eraEdit?'✏️ Cambios guardados':'✅ Préstamo creado');
}
function pcfDocsModal(id,titulo){
  const p=pcfPrestamos().find(x=>x.id===id);if(!p)return;
  openModal(titulo+' — Contrato '+p.contrato,`
    <p style="font-size:14px;margin-bottom:14px">${pcfEsc(p.cliente.nombre)} · ${pcfMon(p.capital,p.moneda)}. ¿Qué deseas imprimir?</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-secondary" onclick="pcfDoc('pagare','${id}')">📄 Pagaré</button>
      <button class="btn btn-secondary" onclick="pcfDoc('notarial','${id}')">⚖️ Pagaré notarial</button>
      <button class="btn btn-secondary" onclick="pcfWordNotarial('${id}')">📝 Pagaré notarial en Word</button>
      <button class="btn btn-secondary" onclick="pcfDoc('tabla','${id}')">📋 Tabla de amortización</button>
    </div>`,
    `<button class="btn btn-primary" onclick="closeModal()">Listo</button>`);
}

// ── Lista de préstamos ──
function pcfTabPrestamos(){
  document.getElementById('pcf-body').innerHTML=`
    <div class="card">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <input type="text" id="pcf-buscar" placeholder="Buscar por cliente, contrato o chasis" oninput="pcfPintarLista()" style="flex:2;min-width:200px">
        <select id="pcf-f-tipo" onchange="pcfPintarLista()" style="flex:1;min-width:150px"><option value="">Todos los tipos</option><option value="vehiculo">🚗 Vehículo</option><option value="personal">👤 Personal</option></select>
        <button class="btn btn-primary" onclick="pcfIr('nuevo')">➕ Nuevo préstamo</button>
      </div>
      <div id="pcf-lista"></div>
    </div>`;
  pcfPintarLista();
}
function pcfPintarLista(){
  const q=(document.getElementById('pcf-buscar')?.value||'').toLowerCase().trim();
  const t=document.getElementById('pcf-f-tipo')?.value||'';
  const ps=pcfPrestamos().filter(p=>(!t||p.tipo===t)&&(!q||[p.contrato,p.cliente.nombre,p.cliente.documento,p.vehiculo&&p.vehiculo.chasis].some(x=>String(x||'').toLowerCase().includes(q))))
    .sort((a,b)=>(b.contrato||'').localeCompare(a.contrato||''));
  const box=document.getElementById('pcf-lista');if(!box)return;
  if(!ps.length){box.innerHTML=`<p style="text-align:center;color:var(--gray);padding:30px">${pcfPrestamos().length?'Ningún préstamo coincide con la búsqueda.':'Todavía no hay préstamos.'}</p>`;return;}
  box.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Contrato</th><th>Fecha</th><th>Cliente</th><th>Tipo</th><th class="pcf-num">Capital</th><th class="pcf-num">Saldo capital</th><th class="pcf-num">Cuota</th><th>Pagadas</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
    ${ps.map(p=>{const r=pcfResumen(pcfTabla(p)),e=pcfEstado(p);return `<tr>
      <td style="font-weight:700">${pcfEsc(p.contrato)}</td><td>${pcfFecha(p.fecha)}</td>
      <td><b>${pcfEsc(p.cliente.nombre)}</b><div style="font-size:11px;color:var(--gray)">${pcfEsc(p.cliente.documento||'')}</div></td>
      <td>${pcfBadgeTipo(p)}${p.vehiculo?`<div style="font-size:11px;color:var(--gray);margin-top:2px">${pcfEsc(pcfDescVehiculo(p.vehiculo))}</div>`:''}</td>
      <td class="pcf-num">${pcfMon(p.capital,p.moneda)}</td><td class="pcf-num" style="font-weight:700">${pcfMon(e.saldoCapital,p.moneda)}</td>
      <td class="pcf-num">${pcfFmt(r.cuota)}</td><td>${e.pagadas} de ${e.n} ${PCF_PERIODO[p.forma][1]}</td>
      <td>${pcfBadgeEstado(e)}</td>
      <td><div style="display:flex;gap:4px;flex-wrap:wrap">
        ${e.saldado?'':`<button class="btn btn-sm btn-primary" onclick="pcfIrCobrar('${p.id}')">💳 Cobrar</button>`}
        <button class="btn btn-sm btn-secondary" onclick="pcfVer('${p.id}')">🔍 Ver</button>
        <button class="btn btn-sm btn-secondary" onclick="pcfDoc('estado','${p.id}')">📑 Estado de cuenta</button>
        <button class="btn btn-sm btn-secondary" onclick="pcfDoc('pagare','${p.id}')">📄 Pagaré</button>
        <button class="btn btn-sm btn-secondary" onclick="pcfDoc('notarial','${p.id}')">⚖️ Notarial</button>
        <button class="btn btn-sm btn-secondary" onclick="pcfDoc('tabla','${p.id}')">📋 Tabla</button>
      </div></td></tr>`;}).join('')}
  </tbody></table></div>`;
}
function pcfVer(id){
  const p=pcfPrestamos().find(x=>x.id===id);if(!p)return;
  const r=pcfResumen(pcfTabla(p)),c=p.cliente,v=p.vehiculo,m=p.moneda,e=pcfEstado(p),conPagos=pcfPagosDe(id).length>0;
  const fila=(l,x)=>x?`<div><b>${l}:</b> ${pcfEsc(x)}</div>`:'';
  const co=pcfCfg().condiciones,sinEntrega=co.usarCaja&&PCF.caja.activa()&&!(p.entrega&&p.entrega.cajaId);
  openModal('💵 Contrato '+p.contrato,`
    <div class="pcf-mini" style="margin-bottom:12px">
      <div><span>Saldo capital</span><b>${pcfMon(e.saldoCapital,m)}</b></div>
      <div><span>Balance total</span><b>${pcfMon(e.balance,m)}</b></div>
      <div><span>Cuotas pagadas</span><b>${e.pagadas} de ${e.n}</b></div>
      <div><span>Estado</span><b style="font-size:13px">${pcfBadgeEstado(e)}</b></div>
    </div>
    ${sinEntrega?`<div class="pcf-aviso">💳 La salida del dinero de este préstamo no está en Caja. <a href="#" onclick="event.preventDefault();pcfEntregaTardia('${id}')">Registrarla ahora</a></div>`:''}
    <div style="font-size:13px;line-height:1.8">
      <div class="pcf-sub">Cliente</div>
      ${fila('Nombre',c.nombre)}${fila(c.tipoDoc||'Documento',c.documento)}${fila('Dirección',c.direccion)}${fila('Teléfono',c.telefono)}
      ${fila('Nacionalidad',c.nacionalidad)}${fila('Estado civil',(PCF_CIVIL[c.estadoCivil]||[c.estadoCivil])[c.genero==='F'?1:0])}${fila('Ocupación',c.ocupacion)}
      ${v?`<div class="pcf-sub" style="margin-top:12px">Vehículo en garantía</div>${fila('Vehículo',[v.tipo,pcfDescVehiculo(v)].filter(Boolean).join(' '))}${fila('Chasis',v.chasis)}${fila('Placa',v.placa||'EN TRÁMITE')}${fila('Puertas',v.puertas)}`:''}
      ${p.garantia?`<div class="pcf-sub" style="margin-top:12px">Garantía</div><div>${pcfEsc(p.garantia)}</div>`:''}
      <div class="pcf-sub" style="margin-top:12px">Condiciones</div>
      ${fila('Monto',pcfMon(p.capital,m))}${fila('Tasa',p.tasa+'% mensual')}${fila('Modalidad',PCF_MODALIDADES[p.modalidad])}
      ${fila('Cuotas',r.n+' '+PCF_PERIODO[p.forma][1]+' de '+pcfMon(r.cuota,m)+(r.ultima!==r.cuota?' (última: '+pcfMon(r.ultima,m)+')':''))}
      ${fila('Total a pagar',pcfMon(r.total,m))}${fila('Fecha',pcfFecha(p.fecha))}${fila('Pagos',pcfFecha(r.inicio)+' al '+pcfFecha(r.fin))}
      ${fila('Mora',p.mora+'% por mes de atraso')}${p.gastosLegales?fila('Gastos legales',pcfMon(p.gastosLegales,m)):''}${fila('Notas',p.notas)}
      <div style="font-size:11px;color:var(--gray);margin-top:10px">Creado por ${pcfEsc(p.creado&&p.creado.usuario||'—')}${p.editado?' · editado por '+pcfEsc(p.editado.usuario):''}</div>
    </div>
    <div class="btn-row">
      <button class="btn btn-sm btn-secondary" onclick="pcfDoc('pagare','${id}')">📄 Pagaré</button>
      <button class="btn btn-sm btn-secondary" onclick="pcfDoc('notarial','${id}')">⚖️ Notarial</button>
      <button class="btn btn-sm btn-secondary" onclick="pcfWordNotarial('${id}')">📝 Word</button>
      <button class="btn btn-sm btn-secondary" onclick="pcfDoc('tabla','${id}')">📋 Tabla</button>
      <button class="btn btn-sm btn-secondary" onclick="pcfDoc('estado','${id}')">📑 Estado de cuenta</button>
      ${e.saldado?'':`<button class="btn btn-sm btn-primary" onclick="closeModal();pcfIrCobrar('${id}')">💳 Cobrar</button>`}
    </div>`,
    `${PCF.esAdmin()&&!conPagos?`<button class="btn btn-red" onclick="pcfConfirmarBorrar('${id}')">🗑️ Eliminar</button>
     <button class="btn btn-secondary" onclick="closeModal();pcfEditId='${id}';pcfRender('nuevo')">✏️ Editar</button>`:''}
     <button class="btn btn-primary" onclick="closeModal()">Cerrar</button>`);
}
function pcfConfirmarBorrar(id){
  const p=pcfPrestamos().find(x=>x.id===id);if(!p)return;
  openModal('🗑️ Eliminar préstamo',`<p style="font-size:14px;line-height:1.7">¿Eliminar el contrato <b>${pcfEsc(p.contrato)}</b> de <b>${pcfEsc(p.cliente.nombre)}</b> por ${pcfMon(p.capital,p.moneda)}?<br>${p.entrega&&p.entrega.cajaId?'También se borra su salida de Caja.<br>':''}No se puede deshacer.</p>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-red" id="pcf-btn-del" onclick="pcfBorrar('${id}')">🗑️ Sí, eliminar</button>`);
}
async function pcfBorrar(id){
  if(!PCF.esAdmin()){toast('Solo el administrador puede eliminar préstamos','error');return;}
  const btn=document.getElementById('pcf-btn-del');if(btn)btn.disabled=true;
  if(!await pcfCargar(true)){toast('Sin conexión con la base de datos. No se eliminó.','error');if(btn)btn.disabled=false;return;}
  const p=pcfPrestamos().find(x=>x.id===id);
  if(pcfPagosDe(id).length){toast('Este préstamo tiene pagos; anúlalos primero','error');closeModal();return;}
  DB[PCF.keys.prestamos]=pcfPrestamos().filter(x=>x.id!==id);PCF.guardar(PCF.keys.prestamos);
  if(p&&p.entrega&&p.entrega.cajaId)PCF.caja.borrar([p.entrega.cajaId]);
  if(p)PCF.bitacora('Eliminó préstamo',`Contrato ${p.contrato} — ${p.cliente.nombre} — ${pcfMon(p.capital,p.moneda)}`);
  closeModal();toast('Préstamo eliminado ✓','success');pcfRender('prestamos');
}

// ── Entrega registrada después (préstamos creados antes de usar Caja) ──
function pcfEntregaTardia(id){
  const p=pcfPrestamos().find(x=>x.id===id);if(!p)return;
  openModal('💳 Registrar salida en Caja — Contrato '+p.contrato,`
    <p style="font-size:13px;margin-bottom:12px">${pcfEsc(p.cliente.nombre)} · ${pcfMon(p.capital,p.moneda)}</p>
    <div class="pcf-grid">
      <div class="form-field"><label>Fecha</label><input type="date" id="pcf-et-fecha" value="${pcfEsc(p.fecha)}"></div>
      <div class="form-field"><label>Forma de entrega</label><select id="pcf-et-forma"><option>Transferencia</option><option>Efectivo</option><option>Cheque</option></select></div>
    </div>
    ${PCF.caja.selector('pcf-et',p.moneda)}`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" id="pcf-btn-et" onclick="pcfEntregaTardiaGuardar('${id}')">💾 Registrar</button>`);
}
async function pcfEntregaTardiaGuardar(id){
  const btn=document.getElementById('pcf-btn-et');if(btn)btn.disabled=true;
  const fecha=document.getElementById('pcf-et-fecha').value,forma=document.getElementById('pcf-et-forma').value,bc=PCF.caja.leer('pcf-et');
  if(!await pcfCargar(true)){toast('Sin conexión con la base de datos. No se guardó.','error');if(btn)btn.disabled=false;return;}
  const p=pcfPrestamos().find(x=>x.id===id);if(!p||(p.entrega&&p.entrega.cajaId)){closeModal();return;}
  p.entrega=Object.assign({forma,fecha,cajaId:pcfId('pcfc')},bc);
  PCF.guardar(PCF.keys.prestamos);
  PCF.caja.registrar([{id:p.entrega.cajaId,fecha,tipo:'SALIDA',categoria:'Préstamo Otorgado',descripcion:`Préstamo ${p.contrato}: ${p.cliente.nombre}`,
    monto:p.capital,moneda:p.moneda,banco:bc.banco,cuenta:bc.cuenta,formaPago:forma}]);
  PCF.bitacora('Registró entrega en Caja',`Contrato ${p.contrato} — ${pcfMon(p.capital,p.moneda)}`);
  closeModal();toast('Salida registrada en Caja ✓','success');pcfRender();
}

// ── Cobros ──
let pcfCobroId='';
function pcfIrCobrar(id){pcfCobroId=id;pcfIr('cobros');}
function pcfTabCobros(){
  document.getElementById('pcf-body').innerHTML=`
    <div class="card" style="border-top:3px solid var(--green)">
      <div class="card-title">💳 Cobrar</div>
      <div class="pcf-grid">
        <div class="form-field"><label>Buscar</label><input type="text" id="pcf-cb-buscar" placeholder="Cliente, contrato o documento" oninput="pcfCbFiltrar()"></div>
        <div class="form-field"><label>Préstamo</label><select id="pcf-cb-sel" onchange="pcfCobroId=this.value;pcfCbPintar()"></select></div>
      </div>
      <div id="pcf-cb-det"></div>
    </div>
    <div class="card"><div class="card-title" id="pcf-cb-rtit">🧾 Últimos recibos</div><div id="pcf-cb-recibos"></div></div>`;
  pcfCbFiltrar();pcfCbPintar();
}
function pcfCbFiltrar(){
  const s=document.getElementById('pcf-cb-sel');if(!s)return;
  const q=(document.getElementById('pcf-cb-buscar').value||'').toLowerCase().trim();
  const lista=pcfPrestamos().map(p=>({p,e:pcfEstado(p)})).filter(x=>x.p.id===pcfCobroId||!x.e.saldado)
    .filter(x=>x.p.id===pcfCobroId||!q||[x.p.contrato,x.p.cliente.nombre,x.p.cliente.documento].some(t=>String(t||'').toLowerCase().includes(q)))
    .sort((a,b)=>(a.p.cliente.nombre||'').localeCompare(b.p.cliente.nombre||''));
  s.innerHTML='<option value="">— Seleccionar préstamo —</option>'+lista.map(x=>`<option value="${pcfEsc(x.p.id)}">${pcfEsc(x.p.contrato)} — ${pcfEsc(x.p.cliente.nombre)} — saldo ${pcfMon(x.e.saldoCapital,x.p.moneda)}</option>`).join('');
  s.value=pcfCobroId;
  if(q&&!s.value&&lista.length===1){pcfCobroId=lista[0].p.id;s.value=pcfCobroId;pcfCbPintar();}
}
function pcfCbPintar(){
  const det=document.getElementById('pcf-cb-det');if(!det)return;
  const p=pcfPrestamos().find(x=>x.id===pcfCobroId);
  pcfCbRecibos(p);
  if(!p){det.innerHTML='<p style="color:var(--gray);font-size:13px">Selecciona el préstamo que vas a cobrar.</p>';return;}
  const cfg=pcfCfg(),usaCaja=cfg.condiciones.usarCaja&&PCF.caja.activa();
  const ncf=cfg.ncf.usar?cfg.ncf.prefijo+String(parseInt(cfg.ncf.siguiente)||1).padStart(8,'0'):'';
  const admin=PCF.esAdmin(),soloInteres=p.modalidad==='interes';
  det.innerHTML=`
    <div id="pcf-cb-info"></div>
    <div class="pcf-sub">Cuotas</div>
    <div class="table-wrap pcf-tabla-wrap" style="max-height:300px" id="pcf-cb-cuotas"></div>
    <div class="pcf-sub" style="margin-top:14px">Registrar pago</div>
    <div class="pcf-tipo">
      <label id="pcf-cb-t1" class="on"><input type="radio" name="pcf-cb-tipo" value="cuota" checked onchange="pcfCbTipo()">💳 Pago de cuotas</label>
      <label id="pcf-cb-t2"><input type="radio" name="pcf-cb-tipo" value="abono" onchange="pcfCbTipo()">⚡ Abono a capital</label>
    </div>
    <div class="pcf-grid">
      <div class="form-field"><label>Fecha del pago</label><input type="date" id="pcf-cb-fecha" value="${pcfHoy()}" onchange="pcfCbCalc()"></div>
      <div class="form-field"><label>Monto recibido (${pcfEsc(p.moneda)})</label><input type="text" id="pcf-cb-monto" inputmode="decimal" placeholder="0.00" oninput="pcfMoneyInput(this);pcfCbPrevia()"></div>
      <div class="form-field"><label>Forma de pago</label><select id="pcf-cb-forma">${['Efectivo','Cheque','Tarjeta','Transferencia'].map(x=>`<option>${x}</option>`).join('')}</select></div>
      <div class="form-field"><label>Referencia o número de cheque</label><input type="text" id="pcf-cb-ref"></div>
    </div>
    <div id="pcf-cb-rapidos" class="btn-row" style="margin:0 0 12px"></div>
    <div id="pcf-cb-op-cuota">
      <label class="pcf-chk"><input type="checkbox" id="pcf-cb-exo" ${admin?'':'disabled'} onchange="pcfCbCalc()"> Exonerar la mora${admin?'':' (solo el administrador)'}</label>
    </div>
    <div id="pcf-cb-op-abono" style="display:none">
      <div class="pcf-grid"><div class="form-field"><label>Con el abono</label><select id="pcf-cb-modo" onchange="pcfCbPrevia()">
        <option value="cuota">Bajar la cuota (mismo número de cuotas)</option>
        ${soloInteres?'':'<option value="plazo">Bajar el número de cuotas</option>'}</select></div></div>
    </div>
    ${usaCaja?'<div class="pcf-sub">🏦 Dónde entra el dinero</div>'+PCF.caja.selector('pcf-cb',p.moneda):''}
    <div class="pcf-grid">
      <div class="form-field full"><label>Observación</label><input type="text" id="pcf-cb-obs"></div>
    </div>
    ${ncf?`<label class="pcf-chk"><input type="checkbox" id="pcf-cb-ncf"> Con comprobante fiscal (NCF) — próximo: ${pcfEsc(ncf)}</label>`:''}
    <div id="pcf-cb-prev"></div>
    <div class="btn-row"><button class="btn btn-green" onclick="pcfCbConfirmar()">💾 Cobrar e imprimir recibo</button></div>`;
  pcfCbCalc();
}
function pcfCbTipo(){
  const t=document.querySelector('input[name=pcf-cb-tipo]:checked').value;
  document.getElementById('pcf-cb-t1').classList.toggle('on',t==='cuota');
  document.getElementById('pcf-cb-t2').classList.toggle('on',t==='abono');
  document.getElementById('pcf-cb-op-cuota').style.display=t==='cuota'?'block':'none';
  document.getElementById('pcf-cb-op-abono').style.display=t==='abono'?'block':'none';
  pcfCbCalc();
}
// Reparte el dinero: por cada cuota, de la más vieja a la más nueva: mora, interés, comisión y capital
function pcfDistribuir(p,monto,fecha,exonerar){
  const e=pcfEstado(p,fecha);let resto=pcfR2(monto);const det=[];
  for(const f of e.filas){
    if(resto<=0)break;
    if(f.pend<=0)continue;
    const d={n:f.n,mora:0,moraExo:0,interes:0,comision:0,capital:0};
    if(f.moraPend>0){if(exonerar)d.moraExo=f.moraPend;else{d.mora=pcfR2(Math.min(resto,f.moraPend));resto=pcfR2(resto-d.mora);}}
    [['interes','pendInt'],['comision','pendCom'],['capital','pendCap']].forEach(([k,pk])=>{const t=pcfR2(Math.min(resto,f[pk]));d[k]=t;resto=pcfR2(resto-t);});
    d.completa=pcfR2(d.interes+d.comision+d.capital)>=pcfR2(f.pend)&&(exonerar||d.mora>=f.moraPend);
    d.previo=f.pagado>0||f.pag.mora>0;
    det.push(d);
  }
  const lista=det.filter(d=>d.mora+d.moraExo+d.interes+d.comision+d.capital>0);
  const tot=k=>pcfR2(lista.reduce((a,d)=>a+d[k],0));
  return {det:lista,sobra:resto,e,mora:tot('mora'),moraExo:tot('moraExo'),interes:tot('interes'),comision:tot('comision'),capital:tot('capital')};
}
function pcfConcepto(det,n){
  const c=det.filter(d=>d.interes+d.comision+d.capital>0).map(d=>(d.completa?(d.previo?'Saldo cuota':'Cuota'):'Abono cuota')+' #'+d.n+'/'+n);
  if(det.some(d=>d.mora>0))c.push('Mora');
  return c.join(', ')||'Mora';
}
// Abono a capital: desde qué cuota se recalcula y cuántas cuotas quedan
function pcfPlanAbono(p,monto,fecha,modo){
  const e=pcfEstado(p,fecha);
  if(e.cuotasVencidas)return {error:'Tiene cuotas vencidas. Primero cobra lo vencido y después haz el abono.'};
  if(e.filas.some(f=>f.pagado>0&&f.pend>0))return {error:'Hay una cuota pagada a medias. Complétala primero.'};
  const sig=e.filas.find(f=>f.pend>0);
  if(!sig)return {error:'Este préstamo ya está saldado.'};
  if(!(monto>0))return {error:'Escribe el monto del abono'};
  if(monto>e.saldoCapital)return {error:'El abono no puede ser mayor que el saldo de capital ('+pcfMon(e.saldoCapital,p.moneda)+')'};
  const nuevoCap=pcfR2(e.saldoCapital-monto),quedan=e.n-sig.n+1;
  let cuotas=quedan;
  if(nuevoCap<=0)cuotas=1;
  else if(modo==='plazo')cuotas=Math.max(1,Math.min(quedan,Math.ceil(nuevoCap/(p.capital/p.cuotas)-1e-9)));
  const reajuste={desde:sig.n,capital:nuevoCap,cuotas,primerPago:sig.fecha};
  const nueva=pcfTablaActual(Object.assign({},p,{reajustes:(p.reajustes||[]).concat(reajuste)})).slice(sig.n-1);
  return {e,reajuste,nuevoCap,cuota:nueva.length?nueva[0].cuota:0,cuotas:nueva.length};
}
function pcfCbCalc(){
  const p=pcfPrestamos().find(x=>x.id===pcfCobroId);if(!p)return;
  const fecha=document.getElementById('pcf-cb-fecha').value||pcfHoy(),e=pcfEstado(p,fecha),m=p.moneda;
  const exo=document.getElementById('pcf-cb-exo')&&document.getElementById('pcf-cb-exo').checked;
  const sigCuota=e.filas.find(f=>f.pend>0);
  document.getElementById('pcf-cb-info').innerHTML=`<div class="pcf-info"><b>${pcfEsc(p.cliente.nombre)}</b> · Contrato ${pcfEsc(p.contrato)} · ${pcfBadgeTipo(p)} ${pcfBadgeEstado(e)}</div>
    <div class="pcf-mini" style="margin-bottom:12px">
      <div><span>Saldo capital</span><b>${pcfMon(e.saldoCapital,m)}</b></div>
      <div><span>Balance total</span><b>${pcfMon(e.balance,m)}</b></div>
      <div><span>Vencido</span><b style="color:${e.vencido?'var(--red)':'inherit'}">${pcfMon(e.vencido,m)}</b></div>
      <div><span>Mora al ${pcfFecha(fecha)}</span><b style="color:${e.moraPend?'var(--red)':'inherit'}">${pcfMon(e.moraPend,m)}</b></div>
      <div><span>Cuota</span><b>${pcfMon(sigCuota?sigCuota.cuota:0,m)}</b></div>
    </div>`;
  const color={PAGADA:'badge-green',PARCIAL:'badge-amber',VENCIDA:'badge-red',PENDIENTE:'badge-blue'};
  document.getElementById('pcf-cb-cuotas').innerHTML=`<table><thead><tr><th>Cuota</th><th>Fecha</th><th class="pcf-num">Valor</th><th class="pcf-num">Pagado</th><th class="pcf-num">Pendiente</th><th class="pcf-num">Mora</th><th>Estado</th></tr></thead><tbody>
    ${e.filas.map(f=>`<tr><td>${f.n}/${e.n}</td><td>${pcfFecha(f.fecha)}</td><td class="pcf-num">${pcfFmt(f.cuota)}</td><td class="pcf-num">${pcfFmt(f.pagado)}</td><td class="pcf-num" style="font-weight:700">${pcfFmt(f.pend)}</td><td class="pcf-num" style="color:${f.moraPend?'var(--red)':'inherit'}">${pcfFmt(f.moraPend)}</td><td><span class="badge ${color[f.estado]}">${f.estado}${f.estado==='VENCIDA'?' '+f.dias+' días':''}</span></td></tr>`).join('')}
  </tbody></table>`;
  const tipo=document.querySelector('input[name=pcf-cb-tipo]:checked').value;
  const sig=e.filas.find(f=>f.pend>0&&f.estado!=='VENCIDA');
  const mora=exo?0:e.moraPend;
  const bot=(t,v)=>v>0?`<button class="btn btn-sm btn-secondary" onclick="pcfCbPoner(${v})">${t}: ${pcfFmt(v)}</button>`:'';
  document.getElementById('pcf-cb-rapidos').innerHTML=tipo==='cuota'
    ?bot('Lo vencido + mora',pcfR2(e.vencido+mora))+bot('Vencido + próxima cuota',sig?pcfR2(e.vencido+mora+sig.pend):0)+bot('Todas las cuotas',pcfR2(e.balance+mora))
    :bot('Todo el capital',e.saldoCapital);
  pcfCbPrevia();
}
function pcfCbPoner(v){document.getElementById('pcf-cb-monto').value=pcfFmt(v);pcfCbPrevia();}
function pcfCbLeer(){
  const g=id=>document.getElementById(id);
  return {p:pcfPrestamos().find(x=>x.id===pcfCobroId),tipo:document.querySelector('input[name=pcf-cb-tipo]:checked').value,fecha:g('pcf-cb-fecha').value,
    monto:pcfR2(pcfN(g('pcf-cb-monto').value)),exo:!!(g('pcf-cb-exo')&&g('pcf-cb-exo').checked&&PCF.esAdmin()),modo:(g('pcf-cb-modo')||{}).value||'cuota',
    forma:g('pcf-cb-forma').value,ref:g('pcf-cb-ref').value.trim(),obs:g('pcf-cb-obs').value.trim(),
    ncf:!!(g('pcf-cb-ncf')&&g('pcf-cb-ncf').checked),bc:g('pcf-cb-banco')?PCF.caja.leer('pcf-cb'):null};
}
// Revisa el pago y dice a qué se aplica. Devuelve {error} o el plan.
function pcfCbPlan(x){
  if(!x.p)return {error:'Selecciona el préstamo'};
  if(!x.fecha)return {error:'Escribe la fecha del pago'};
  if(x.fecha<x.p.fecha)return {error:'La fecha del pago no puede ser antes del préstamo'};
  if(x.tipo==='abono'){
    if(x.bc&&!(x.bc.banco&&x.bc.cuenta))return {error:'Elige el banco y la cuenta donde entra el dinero'};
    const a=pcfPlanAbono(x.p,x.monto,x.fecha,x.modo);if(a.error)return a;
    return Object.assign(a,{concepto:'Abono a capital',capital:x.monto,interes:0,comision:0,mora:0,moraExo:0,det:[]});
  }
  if(!(x.monto>0))return {error:'Escribe el monto recibido'};
  if(x.bc&&!(x.bc.banco&&x.bc.cuenta))return {error:'Elige el banco y la cuenta donde entra el dinero'};
  const d=pcfDistribuir(x.p,x.monto,x.fecha,x.exo);
  if(d.sobra>0)return {error:'El monto es mayor que lo que debe ('+pcfMon(pcfR2(x.monto-d.sobra),x.p.moneda)+')'};
  return Object.assign(d,{concepto:pcfConcepto(d.det,d.e.n)});
}
function pcfCbPrevia(){
  const box=document.getElementById('pcf-cb-prev');if(!box)return;
  const x=pcfCbLeer();
  if(!(x.monto>0)){box.innerHTML='';return;}
  const pl=pcfCbPlan(x),m=x.p.moneda;
  if(pl.error){box.innerHTML=`<div class="pcf-aviso">⚠️ ${pcfEsc(pl.error)}</div>`;return;}
  box.innerHTML=x.tipo==='abono'
    ?`<div class="pcf-info">⚡ Abono a capital de ${pcfMon(x.monto,m)}. Nuevo saldo de capital: <b>${pcfMon(pl.nuevoCap,m)}</b>.${pl.nuevoCap>0?` Quedan <b>${pl.cuotas}</b> cuotas de <b>${pcfMon(pl.cuota,m)}</b>.`:' El préstamo queda saldado.'}</div>`
    :`<div class="pcf-info">Se aplica a: <b>${pcfEsc(pl.concepto)}</b><br>Capital ${pcfMon(pl.capital,m)} · Interés ${pcfMon(pl.interes,m)}${pl.comision?' · Comisión '+pcfMon(pl.comision,m):''} · Mora ${pcfMon(pl.mora,m)}${pl.moraExo?' · Mora exonerada '+pcfMon(pl.moraExo,m):''}</div>`;
}
function pcfCbConfirmar(){
  const x=pcfCbLeer(),pl=pcfCbPlan(x);
  if(pl.error){toast(pl.error,'error');return;}
  openModal('💳 Confirmar cobro',`<div style="font-size:14px;line-height:1.8">
      <div><b>Cliente:</b> ${pcfEsc(x.p.cliente.nombre)} · Contrato ${pcfEsc(x.p.contrato)}</div>
      <div><b>Monto:</b> ${pcfMon(x.monto,x.p.moneda)} · ${pcfEsc(x.forma)}</div>
      <div><b>Concepto:</b> ${pcfEsc(pl.concepto)}</div>
      ${x.ncf?'<div><b>Con comprobante fiscal (NCF)</b></div>':''}
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-green" id="pcf-btn-cb" onclick="pcfCbGuardar()">💾 Sí, cobrar</button>`);
}
async function pcfCbGuardar(){
  const btn=document.getElementById('pcf-btn-cb');if(btn){btn.disabled=true;btn.textContent='⏳ Guardando…';}
  const x0=pcfCbLeer();
  if(!await pcfCargar(true)){toast('Sin conexión con la base de datos. No se cobró; intenta de nuevo.','error');if(btn){btn.disabled=false;btn.textContent='💾 Sí, cobrar';}return;}
  // Se recalcula con los datos recién cargados (otro usuario pudo haber cobrado)
  const x=Object.assign({},x0,{p:pcfPrestamos().find(p=>p.id===x0.p.id)});
  const pl=pcfCbPlan(x);
  if(pl.error){toast(pl.error,'error');closeModal();pcfRender();return;}
  const p=x.p,cfg=pcfCfg(),pagos=pcfPagos().slice();
  const recibo=String(pagos.reduce((a,y)=>Math.max(a,parseInt(y.recibo)||0),0)+1).padStart(10,'0');
  let ncf='';
  if(x.ncf&&cfg.ncf.usar){
    const sigN=parseInt(cfg.ncf.siguiente)||1;
    ncf=cfg.ncf.prefijo+String(sigN).padStart(8,'0');
    DB[PCF.keys.config]=Object.assign({},DB[PCF.keys.config],{ncf:Object.assign({},cfg.ncf,{siguiente:sigN+1})});
    PCF.guardar(PCF.keys.config);
  }
  const pago={id:pcfId('pcfp'),recibo,prestamoId:p.id,contrato:p.contrato,cliente:p.cliente.nombre,moneda:p.moneda,fecha:x.fecha,tipo:x.tipo,
    monto:x.monto,capital:pl.capital,interes:pl.interes,comision:pl.comision,mora:pl.mora,moraExo:pl.moraExo,
    detalle:(pl.det||[]).map(d=>({n:d.n,mora:d.mora,moraExo:d.moraExo,interes:d.interes,comision:d.comision,capital:d.capital})),
    concepto:pl.concepto,forma:x.forma,referencia:x.ref,observacion:x.obs,ncf,ncfVence:ncf?cfg.ncf.vencimiento:'',ncfEtiqueta:ncf?cfg.ncf.etiqueta:'',
    banco:x.bc?x.bc.banco:'',cuenta:x.bc?x.bc.cuenta:'',cajaIds:[],usuario:PCF.usuario(),creado:new Date().toISOString()};
  if(x.tipo==='abono'){
    p.reajustes=(p.reajustes||[]).concat(Object.assign({pagoId:pago.id},pl.reajuste));
    PCF.guardar(PCF.keys.prestamos);
  }
  pagos.push(pago);DB[PCF.keys.pagos]=pagos;
  const e=pcfEstado(p);pago.saldoCapital=e.saldoCapital;pago.balance=e.balance;
  if(x.bc&&cfg.condiciones.usarCaja&&PCF.caja.activa()){
    const desc=`Recibo ${recibo} — Contrato ${p.contrato}: ${p.cliente.nombre}`,base={fecha:x.fecha,tipo:'ENTRADA',moneda:p.moneda,banco:x.bc.banco,cuenta:x.bc.cuenta,formaPago:x.forma};
    const movs=[['Cobro Préstamo — Capital',pago.capital],['Cobro Préstamo — Interés',pcfR2(pago.interes+pago.comision)],['Cobro Préstamo — Mora',pago.mora]]
      .filter(([,v])=>v>0).map(([cat,v])=>Object.assign({id:pcfId('pcfc'),categoria:cat,descripcion:desc,monto:v},base));
    pago.cajaIds=movs.map(mv=>mv.id);
    PCF.caja.registrar(movs);
  }
  PCF.guardar(PCF.keys.pagos);
  PCF.bitacora('Cobró',`Recibo ${recibo} — Contrato ${p.contrato} — ${p.cliente.nombre} — ${pcfMon(x.monto,p.moneda)} — ${pl.concepto}`);
  closeModal();toast('Cobro registrado ✓ Recibo '+recibo,'success');
  pcfCobroId=p.id;await pcfRender('cobros');
  pcfRecibo(pago.id);
}
// ¿Es el último pago válido de su préstamo? (solo ese se puede anular)
const pcfEsUltimoPago=y=>!pcfPagos().some(z=>z.prestamoId===y.prestamoId&&!z.anulado&&(z.recibo||'')>(y.recibo||''));
function pcfCbRecibos(p){
  const box=document.getElementById('pcf-cb-recibos');if(!box)return;
  document.getElementById('pcf-cb-rtit').textContent=p?'🧾 Pagos de este préstamo':'🧾 Últimos recibos';
  const lista=(p?pcfPagos().filter(x=>x.prestamoId===p.id):pcfPagos().slice()).sort((a,b)=>(b.recibo||'').localeCompare(a.recibo||'')).slice(0,p?500:15);
  if(!lista.length){box.innerHTML='<p style="color:var(--gray);font-size:13px">Todavía no hay pagos.</p>';return;}
  box.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Recibo</th><th>Fecha</th>${p?'':'<th>Cliente</th>'}<th>Concepto</th><th class="pcf-num">Monto</th><th>Estado</th><th></th></tr></thead><tbody>
    ${lista.map(y=>`<tr style="${y.anulado?'opacity:.55':''}"><td style="font-weight:700">${pcfEsc(y.recibo)}</td><td>${pcfFecha(y.fecha)}</td>${p?'':`<td>${pcfEsc(y.cliente)}</td>`}
      <td style="font-size:12px">${pcfEsc(y.concepto)}${y.ncf?'<div style="color:var(--gray)">NCF '+pcfEsc(y.ncf)+'</div>':''}</td><td class="pcf-num" style="font-weight:700">${pcfMon(y.monto,y.moneda)}</td>
      <td>${y.anulado?'<span class="badge badge-red">Anulado</span>':'<span class="badge badge-green">Válido</span>'}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-sm btn-secondary" onclick="pcfRecibo('${y.id}')">🖨️ Recibo</button>
        ${!y.anulado&&PCF.esAdmin()&&pcfEsUltimoPago(y)?`<button class="btn btn-sm" style="background:var(--red2);color:var(--red)" onclick="pcfConfirmarAnular('${y.id}')">🚫 Anular</button>`:''}
      </div></td></tr>`).join('')}
  </tbody></table></div>`;
}
function pcfConfirmarAnular(id){
  const y=pcfPagos().find(z=>z.id===id);if(!y)return;
  openModal('🚫 Anular recibo '+y.recibo,`<p style="font-size:14px;line-height:1.7">${pcfEsc(y.cliente)} · ${pcfMon(y.monto,y.moneda)}<br>${pcfEsc(y.concepto)}</p>
    <p style="font-size:13px;color:var(--gray);margin:8px 0">El pago deja de contar${(y.cajaIds||[]).length?' y se borra su entrada de Caja':''}. El recibo queda en el historial como anulado.</p>
    <div class="form-field"><label>Motivo</label><input type="text" id="pcf-an-motivo"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-red" id="pcf-btn-an" onclick="pcfAnular('${id}')">🚫 Sí, anular</button>`);
}
async function pcfAnular(id){
  if(!PCF.esAdmin()){toast('Solo el administrador puede anular pagos','error');return;}
  const motivo=((document.getElementById('pcf-an-motivo')||{}).value||'').trim();
  if(!motivo){toast('Escribe el motivo','error');return;}
  const btn=document.getElementById('pcf-btn-an');if(btn)btn.disabled=true;
  if(!await pcfCargar(true)){toast('Sin conexión con la base de datos. No se anuló.','error');if(btn)btn.disabled=false;return;}
  const y=pcfPagos().find(z=>z.id===id);
  if(!y||y.anulado){closeModal();pcfRender();return;}
  if(!pcfEsUltimoPago(y)){toast('Solo se puede anular el último pago del préstamo','error');closeModal();return;}
  y.anulado={usuario:PCF.usuario(),fecha:new Date().toISOString(),motivo};
  if(y.tipo==='abono'){const p=pcfPrestamos().find(z=>z.id===y.prestamoId);if(p){p.reajustes=(p.reajustes||[]).filter(r=>r.pagoId!==y.id);PCF.guardar(PCF.keys.prestamos);}}
  PCF.guardar(PCF.keys.pagos);
  PCF.caja.borrar(y.cajaIds||[]);
  PCF.bitacora('Anuló recibo',`Recibo ${y.recibo} — Contrato ${y.contrato} — ${pcfMon(y.monto,y.moneda)} — ${motivo}`);
  closeModal();toast('Recibo anulado ✓','success');pcfRender();
}

// ── Recibo de ingreso (original cliente arriba, copia empresa abajo) ──
function pcfRecibo(id){
  const y=pcfPagos().find(z=>z.id===id);if(!y)return;
  const p=pcfPrestamos().find(z=>z.id===y.prestamoId)||{cliente:{nombre:y.cliente}};
  const cfg=pcfCfg(),e=cfg.empresa,logo=e.usarLogo?PCF.logo():'',m=y.moneda,c=p.cliente||{};
  const ab={Efectivo:'EF',Cheque:'CH',Tarjeta:'TAR',Transferencia:'TRANS'};
  const copia=t=>`<div class="rec mono">
    <div class="caja fila" style="align-items:flex-start">
      <div><div class="b" style="font-size:15px">*${pcfEsc(e.nombre)}*</div><div>${pcfEsc(e.direccion)}</div><div>${pcfEsc(e.telefonos)}${e.rnc?' RNC: '+pcfEsc(e.rnc):''}</div>
        <div style="margin-top:4px"><b>Fecha</b> ${pcfFecha(y.fecha)}</div></div>
      <div style="text-align:right">${logo?`<img class="logo" src="${logo}"><br>`:''}<span style="font-size:11px">IMPRESO: ${pcfFecha(pcfHoy())} ${pcfHora()}</span></div>
    </div>
    <div class="fila" style="margin:8px 0 4px;align-items:flex-start">
      <div class="tit">RECIBO DE INGRESO</div>
      <div style="text-align:right">${y.ncf?`<b>${pcfEsc(y.ncfEtiqueta||'')}</b><br>NCF: <b>${pcfEsc(y.ncf)}</b>${y.ncfVence?'<br>Fecha vencimiento: '+pcfFecha(y.ncfVence):''}`:''}${y.anulado?'<div style="color:#b91c1c;font-weight:bold;font-size:15px">*** ANULADO ***</div>':''}</div>
    </div>
    <div style="border-top:1.5px solid #000;padding-top:6px">
      <div class="fila"><span><b>Número recibo:</b> ${pcfEsc(y.recibo)}</span><span><b>Fecha:</b> ${pcfFecha(y.fecha)}</span><span><b>Préstamo:</b> ${pcfEsc(y.contrato)}</span></div>
      <div><b>Señor(es).....:</b> ${pcfEsc((c.nombre||y.cliente||'').toUpperCase())}${c.documento?' · '+pcfEsc(c.tipoDoc||'')+' '+pcfEsc(c.documento):''}</div>
      <div><b>Monto ingreso.:</b> (${pcfMontoLetras(y.monto,m,false,true)} )</div>
      <div><b>Concepto......:</b> ${pcfEsc(y.concepto)}</div>
      <div><b>Observación...:</b> ${pcfEsc(y.observacion||'')}${y.referencia?' Ref. '+pcfEsc(y.referencia):''}</div>
    </div>
    <div class="fila" style="border-top:1.5px solid #000;margin-top:6px;padding-top:6px">
      <span style="font-size:14px"><b>Pago recibido.: ${pcfFmt(y.monto)} ${pcfEsc(m)}</b></span>
      <span style="font-size:14px"><b>Balance actual....: ${pcfFmt(y.balance)}</b></span>
    </div>
    <div style="font-size:11.5px">Capital ${pcfFmt(y.capital)} · Interés ${pcfFmt(pcfR2(y.interes+y.comision))} · Mora ${pcfFmt(y.mora)}${y.moraExo?' · Mora exonerada '+pcfFmt(y.moraExo):''} · Saldo de capital ${pcfFmt(y.saldoCapital)}</div>
    <div style="margin-top:6px"><b>Detalles de pago</b><br>${Object.keys(ab).map(k=>`${ab[k]}.: ${pcfFmt(y.forma===k?y.monto:0)}`).join('&nbsp;&nbsp;&nbsp;&nbsp;')}</div>
    <div class="fila" style="margin-top:12px;align-items:flex-end">
      <div><b>Le atendió....:</b> ${pcfEsc((y.usuario||'').toUpperCase())}<br><span style="font-size:11.5px">Válido si está debidamente sellado.</span></div>
      <div style="text-align:center;min-width:220px"><div style="border-bottom:1px solid #000;height:38px"></div>Recibido por</div>
    </div>
    <div style="text-align:right;font-weight:bold;margin-top:4px">${t}</div>
  </div>`;
  pcfVentana('Recibo '+y.recibo,`<div class="hoja rec-hoja">${copia('ORIGINAL CLIENTE')}<div class="corte">✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>${copia('COPIA EMPRESA')}</div>`,
    PCF_CSS_MONO+`.rec-hoja{padding:1cm 1.3cm}@media print{.rec-hoja{padding:0}}
    .rec{height:11.9cm;overflow:hidden;box-sizing:border-box}
    .tit{border:1.5px solid #000;padding:4px 18px;font-weight:bold;font-size:16px;font-family:"Times New Roman",serif}
    .corte{text-align:center;color:#666;margin:.3cm 0;font-family:Arial,sans-serif;font-size:11px;white-space:nowrap;overflow:hidden}`);
}

// ── Estado de cuenta ──
function pcfHtmlEstado(p,cfg){
  const e=pcfEstado(p),c=p.cliente||{},m=p.moneda;
  const pagos=pcfPagos().filter(x=>x.prestamoId===p.id).sort((a,b)=>(a.recibo||'').localeCompare(b.recibo||''));
  const L=(l,v)=>`<div><span>${(l+' ').padEnd(18,'.').replace(/ /g,'&nbsp;')}:</span> <b>${v}</b></div>`;
  return `<div class="hoja"><div class="mono">
    ${pcfEncabezadoMono(cfg,'FECHA.: '+pcfFecha(pcfHoy())+'<br>HORA..: '+pcfHora())}
    <div style="text-align:center;font-size:16px;font-weight:bold;margin:12px 0 6px;letter-spacing:1px">ESTADO DE CUENTA</div>
    <div class="info">
      ${L('Contrato',pcfEsc(p.contrato))}${L('Fecha préstamo',pcfFecha(p.fecha))}
      ${L('Cliente',pcfEsc(c.nombre))}${L(c.tipoDoc||'Documento',pcfEsc(c.documento||'—'))}
      ${L('Capital',pcfFmt(p.capital)+' '+pcfEsc(m))}${L('Tasa',(+p.tasa).toFixed(2)+' % mensual')}
      ${L('Saldo capital',pcfFmt(e.saldoCapital))}${L('Balance total',pcfFmt(e.balance))}
      ${L('Vencido',pcfFmt(e.vencido))}${L('Mora al día',pcfFmt(e.moraPend))}
      ${L('Cuotas pagadas',e.pagadas+' de '+e.n)}${L('Estado',e.saldado?'SALDADO':e.cuotasVencidas?'ATRASADO':'AL DÍA')}
    </div>
    <table class="t"><thead><tr><th>Fecha</th><th>Cuota</th><th>Valor</th><th>Pagado</th><th>Pendiente</th><th>Mora</th><th>Estado</th></tr></thead><tbody>
      ${e.filas.map(f=>`<tr><td>${pcfFecha(f.fecha)}</td><td>${f.n}/${e.n}</td><td>${pcfFmt(f.cuota)}</td><td>${pcfFmt(f.pagado)}</td><td>${pcfFmt(f.pend)}</td><td>${pcfFmt(f.moraPend)}</td><td>${f.estado}</td></tr>`).join('')}
    </tbody></table>
    <div style="font-weight:bold;margin:16px 0 4px">PAGOS RECIBIDOS</div>
    ${pagos.length?`<table class="t"><thead><tr><th>Recibo</th><th>Fecha</th><th>Concepto</th><th>Monto</th><th>Capital</th><th>Interés</th><th>Mora</th></tr></thead><tbody>
      ${pagos.map(x=>`<tr style="${x.anulado?'text-decoration:line-through;color:#888':''}"><td>${pcfEsc(x.recibo)}</td><td>${pcfFecha(x.fecha)}</td><td style="text-align:left">${pcfEsc(x.concepto)}${x.anulado?' (ANULADO)':''}</td><td>${pcfFmt(x.monto)}</td><td>${pcfFmt(x.capital)}</td><td>${pcfFmt(pcfR2(x.interes+x.comision))}</td><td>${pcfFmt(x.mora)}</td></tr>`).join('')}
    </tbody></table>`:'<div>Sin pagos.</div>'}
  </div></div>`;
}

// ── Vencidas ──
function pcfAtrasados(){
  return pcfPrestamos().map(p=>{
    const e=pcfEstado(p),venc=e.filas.filter(f=>f.estado==='VENCIDA');
    const ult=pcfPagosDe(p.id).reduce((a,x)=>x.fecha>a?x.fecha:a,'');
    return {p,e,dias:venc.reduce((a,f)=>Math.max(a,f.dias),0),ult};
  }).filter(x=>x.e.cuotasVencidas>0).sort((a,b)=>b.dias-a.dias);
}
function pcfColorDias(d){return d>60?'badge-red':d>30?'badge-amber':'badge-blue';}
function pcfWhatsApp(x){
  let t=String(x.p.cliente.telefono||'').replace(/\D/g,'');
  if(t.length===10)t='1'+t;
  if(t.length<10)return '';
  const msg=`Saludos ${x.p.cliente.nombre}. Le recordamos que su préstamo ${x.p.contrato} con ${pcfCfg().empresa.nombre} tiene ${x.e.cuotasVencidas} cuota(s) vencida(s) por ${pcfMon(x.e.vencido,x.p.moneda)}${x.e.moraPend?' más '+pcfMon(x.e.moraPend,x.p.moneda)+' de mora':''}. Favor comunicarse con nosotros.`;
  return 'https://wa.me/'+t+'?text='+encodeURIComponent(msg);
}
function pcfTabVencidas(){
  const lista=pcfAtrasados(),hoy=pcfHoy(),en7=pcfSumar(hoy,'Semanal',1);
  const prox=pcfPrestamos().map(p=>({p,f:pcfEstado(p).filas.find(f=>f.pend>0&&f.estado!=='VENCIDA'&&f.fecha>=hoy&&f.fecha<=en7)})).filter(x=>x.f).sort((a,b)=>a.f.fecha.localeCompare(b.f.fecha));
  const suma=m=>pcfR2(lista.filter(x=>x.p.moneda===m).reduce((a,x)=>a+x.e.vencido+x.e.moraPend,0));
  document.getElementById('pcf-body').innerHTML=`
    <div class="stats-grid">
      <div class="stat-card red"><div class="stat-ico">⚠️</div><div class="stat-label">Préstamos atrasados</div><div class="stat-value">${lista.length}</div></div>
      <div class="stat-card red"><div class="stat-ico">🟢</div><div class="stat-label">Por cobrar con mora RD$</div><div class="stat-value">${pcfMon(suma('RD$'),'RD$')}</div></div>
      <div class="stat-card red"><div class="stat-ico">💵</div><div class="stat-label">Por cobrar con mora US$</div><div class="stat-value">${pcfMon(suma('US$'),'US$')}</div></div>
      <div class="stat-card amber"><div class="stat-ico">📅</div><div class="stat-label">Vencen en 7 días</div><div class="stat-value">${prox.length}</div></div>
    </div>
    <div class="card"><div class="card-title" style="justify-content:space-between">⚠️ Cuotas vencidas
      ${lista.length?'<button class="btn btn-sm btn-secondary" onclick="pcfImprimirVencidas()">🖨️ Imprimir lista</button>':''}</div>
      ${lista.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Contrato</th><th>Cuotas</th><th>Atraso</th><th class="pcf-num">Vencido</th><th class="pcf-num">Mora</th><th class="pcf-num">Total</th><th></th></tr></thead><tbody>
        ${lista.map(x=>{const wa=pcfWhatsApp(x);return `<tr>
          <td style="white-space:nowrap"><b>${pcfEsc(x.p.cliente.nombre)}</b><div style="font-size:11px;color:var(--gray)">${pcfEsc(x.p.cliente.telefono||'')}</div></td>
          <td>${pcfEsc(x.p.contrato)}</td><td>${x.e.cuotasVencidas}</td>
          <td style="white-space:nowrap"><span class="badge ${pcfColorDias(x.dias)}">${x.dias} días</span><div style="font-size:11px;color:var(--gray)">Último pago: ${x.ult?pcfFecha(x.ult):'nunca'}</div></td>
          <td class="pcf-num">${pcfMon(x.e.vencido,x.p.moneda)}</td><td class="pcf-num" style="color:var(--red)">${pcfFmt(x.e.moraPend)}</td>
          <td class="pcf-num" style="font-weight:800">${pcfMon(pcfR2(x.e.vencido+x.e.moraPend),x.p.moneda)}</td>
          <td><div style="display:flex;gap:4px">
            <button class="btn btn-sm btn-primary" onclick="pcfIrCobrar('${x.p.id}')">💳 Cobrar</button>
            <button class="btn btn-sm btn-secondary" onclick="pcfDoc('estado','${x.p.id}')">📑 Estado</button>
            ${wa?`<a class="btn btn-sm btn-green" href="${wa}" target="_blank" rel="noopener">💬 WhatsApp</a>`:''}
          </div></td></tr>`;}).join('')}
      </tbody></table></div>`:'<p style="text-align:center;color:var(--gray);padding:24px">✅ No hay cuotas vencidas.</p>'}
    </div>
    <div class="card"><div class="card-title">📅 Cuotas que vencen en los próximos 7 días</div>
      ${prox.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Contrato</th><th>Cuota</th><th class="pcf-num">Pendiente</th><th></th></tr></thead><tbody>
        ${prox.map(x=>`<tr><td>${pcfFecha(x.f.fecha)}</td><td>${pcfEsc(x.p.cliente.nombre)}<div style="font-size:11px;color:var(--gray)">${pcfEsc(x.p.cliente.telefono||'')}</div></td><td>${pcfEsc(x.p.contrato)}</td><td>${x.f.n}</td><td class="pcf-num">${pcfMon(x.f.pend,x.p.moneda)}</td>
          <td><button class="btn btn-sm btn-secondary" onclick="pcfIrCobrar('${x.p.id}')">💳 Cobrar</button></td></tr>`).join('')}
      </tbody></table></div>`:'<p style="color:var(--gray);font-size:13px">No hay cuotas por vencer esta semana.</p>'}
    </div>`;
}
function pcfImprimirVencidas(){
  const lista=pcfAtrasados(),cfg=pcfCfg();
  pcfVentana('Cuotas vencidas',`<div class="hoja"><div class="mono">
    ${pcfEncabezadoMono(cfg,'FECHA.: '+pcfFecha(pcfHoy())+'<br>HORA..: '+pcfHora())}
    <div style="text-align:center;font-size:16px;font-weight:bold;margin:12px 0">CUOTAS VENCIDAS AL ${pcfFecha(pcfHoy())}</div>
    <table class="t"><thead><tr><th>Cliente</th><th>Teléfono</th><th>Contrato</th><th>Cuotas</th><th>Días</th><th>Vencido</th><th>Mora</th><th>Total</th></tr></thead><tbody>
      ${lista.map(x=>`<tr><td>${pcfEsc(x.p.cliente.nombre)}</td><td>${pcfEsc(x.p.cliente.telefono||'')}</td><td>${pcfEsc(x.p.contrato)}</td><td>${x.e.cuotasVencidas}</td><td>${x.dias}</td><td>${pcfFmt(x.e.vencido)} ${pcfEsc(x.p.moneda)}</td><td>${pcfFmt(x.e.moraPend)}</td><td><b>${pcfFmt(pcfR2(x.e.vencido+x.e.moraPend))}</b></td></tr>`).join('')}
    </tbody></table></div></div>`,PCF_CSS_MONO);
}

// ── Informes ──
function pcfTabInformes(){
  const hoy=pcfHoy();
  document.getElementById('pcf-body').innerHTML=`
    <div class="card">
      <div class="pcf-grid">
        <div class="form-field"><label>Desde</label><input type="date" id="pcf-inf-desde" value="${hoy.slice(0,8)}01" onchange="pcfPintarInforme()"></div>
        <div class="form-field"><label>Hasta</label><input type="date" id="pcf-inf-hasta" value="${hoy}" onchange="pcfPintarInforme()"></div>
        <div class="form-field"><label>Tipo</label><select id="pcf-inf-tipo" onchange="pcfPintarInforme()"><option value="">Todos</option><option value="vehiculo">🚗 Vehículo</option><option value="personal">👤 Personal</option></select></div>
      </div>
      <div class="btn-row" style="margin-top:0"><button class="btn btn-primary" onclick="pcfImprimirInforme()">🖨️ Imprimir informe</button></div>
    </div>
    <div id="pcf-inf"></div>`;
  pcfPintarInforme();
}
// Datos del informe del período (los mismos en pantalla y en el impreso)
function pcfDatosInforme(){
  const desde=document.getElementById('pcf-inf-desde').value,hasta=document.getElementById('pcf-inf-hasta').value,tipo=document.getElementById('pcf-inf-tipo').value;
  const ps=pcfPrestamos().filter(p=>!tipo||p.tipo===tipo),ids=ps.map(p=>p.id);
  const pagos=pcfPagos().filter(x=>!x.anulado&&ids.includes(x.prestamoId)&&x.fecha>=desde&&x.fecha<=hasta).sort((a,b)=>(a.recibo||'').localeCompare(b.recibo||''));
  const nuevos=ps.filter(p=>p.fecha>=desde&&p.fecha<=hasta);
  const est=ps.filter(p=>p.fecha<=hasta).map(p=>({p,e:pcfEstado(p,hasta,true)}));
  const mon=['RD$','US$'].map(m=>{
    const pg=pagos.filter(x=>x.moneda===m),es=est.filter(x=>x.p.moneda===m),act=es.filter(x=>!x.e.saldado);
    const s=(arr,f)=>pcfR2(arr.reduce((a,x)=>a+f(x),0));
    const cartera=s(act,x=>x.e.saldoCapital),vencido=s(act,x=>x.e.vencido);
    return {m,cobrado:s(pg,x=>x.monto),capital:s(pg,x=>x.capital),interes:s(pg,x=>x.interes+x.comision),mora:s(pg,x=>x.mora),moraExo:s(pg,x=>x.moraExo||0),recibos:pg.length,
      prestado:s(nuevos.filter(p=>p.moneda===m),p=>p.capital),nPrestados:nuevos.filter(p=>p.moneda===m).length,
      cartera,interesPend:s(act,x=>x.e.interesPend),vencido,moraPend:s(act,x=>x.e.moraPend),activos:act.length,atrasados:act.filter(x=>x.e.cuotasVencidas).length,
      morosidad:cartera>0?pcfR2(vencido/cartera*100):0};
  });
  // Dónde salió y entró el dinero: préstamos entregados y cobros, por moneda, banco y cuenta
  const grupos={};
  const g=(m,b,c)=>{const k=m+'|'+(b||'Sin banco')+'|'+(c||'');return grupos[k]=grupos[k]||{moneda:m,banco:b||'Sin banco',cuenta:c||'',prestado:0,nPrestados:0,cobrado:0,capital:0,interes:0,mora:0,recibos:0};};
  ps.filter(p=>p.entrega&&p.entrega.fecha>=desde&&p.entrega.fecha<=hasta).forEach(p=>{const x=g(p.moneda,p.entrega.banco,p.entrega.cuenta);x.prestado+=p.capital;x.nPrestados++;});
  pagos.forEach(y=>{const x=g(y.moneda,y.banco,y.cuenta);x.cobrado+=y.monto;x.capital+=y.capital;x.interes+=y.interes+y.comision;x.mora+=y.mora;x.recibos++;});
  const bancos=Object.values(grupos).map(x=>Object.assign(x,{prestado:pcfR2(x.prestado),cobrado:pcfR2(x.cobrado),capital:pcfR2(x.capital),interes:pcfR2(x.interes),mora:pcfR2(x.mora),neto:pcfR2(x.cobrado-x.prestado)}))
    .sort((a,b)=>b.moneda.localeCompare(a.moneda)||a.banco.localeCompare(b.banco)||a.cuenta.localeCompare(b.cuenta));
  return {desde,hasta,tipo,pagos,mon,bancos};
}
// Tabla del resumen por banco y cuenta (pantalla e impreso)
function pcfTablaBancos(d,impreso){
  if(!d.bancos.length)return '<p style="color:#6b7280;font-size:13px">No hay entregas ni cobros en este período.</p>';
  const n=impreso?'':' class="pcf-num"';
  const fila=x=>`<tr><td style="text-align:left">${pcfEsc(x.banco)}</td><td style="text-align:left">${pcfEsc(x.cuenta)}</td><td${n}>${pcfFmt(x.prestado)}</td><td${n}>${pcfFmt(x.cobrado)}</td><td${n}>${pcfFmt(x.capital)}</td><td${n}>${pcfFmt(x.interes)}</td><td${n}>${pcfFmt(x.mora)}</td><td${n} style="font-weight:800;color:${x.neto<0?'#b91c1c':'#15803d'}">${pcfFmt(x.neto)}</td></tr>`;
  return ['RD$','US$'].map(m=>{
    const xs=d.bancos.filter(x=>x.moneda===m);if(!xs.length)return '';
    const t=k=>pcfFmt(pcfR2(xs.reduce((a,x)=>a+x[k],0)));
    return `<div style="font-weight:800;margin:12px 0 4px">${m==='RD$'?'💰 En pesos (RD$)':'💵 En dólares (US$)'}</div>
      <table class="${impreso?'t':''}"><thead><tr><th>Banco</th><th>Cuenta</th><th${n}>Salió en préstamos</th><th${n}>Entró en cobros</th><th${n}>Capital</th><th${n}>Interés</th><th${n}>Mora</th><th${n}>Neto</th></tr></thead><tbody>
      ${xs.map(fila).join('')}
      <tr class="tot" style="font-weight:800"><td colspan="2" style="text-align:left">TOTAL ${m}</td><td${n}>${t('prestado')}</td><td${n}>${t('cobrado')}</td><td${n}>${t('capital')}</td><td${n}>${t('interes')}</td><td${n}>${t('mora')}</td><td${n}>${t('neto')}</td></tr>
      </tbody></table>`;
  }).join('');
}
function pcfPintarInforme(){
  const d=pcfDatosInforme(),box=document.getElementById('pcf-inf');if(!box)return;
  const col=(t,f)=>`<tr><td>${t}</td>${d.mon.map(x=>`<td class="pcf-num">${f(x)}</td>`).join('')}</tr>`;
  const fm=k=>x=>pcfFmt(x[k]);
  box.innerHTML=`
    <div class="card"><div class="card-title">📊 Resumen del ${pcfFecha(d.desde)} al ${pcfFecha(d.hasta)}</div>
      <div class="table-wrap"><table><thead><tr><th></th><th class="pcf-num">RD$</th><th class="pcf-num">US$</th></tr></thead><tbody>
        <tr><td colspan="3" style="background:var(--gray2);font-weight:800">Cobros del período</td></tr>
        ${col('Total cobrado',x=>'<b>'+pcfFmt(x.cobrado)+'</b>')}${col('Capital',fm('capital'))}${col('Interés',fm('interes'))}${col('Mora',fm('mora'))}${col('Mora exonerada',fm('moraExo'))}${col('Recibos',x=>x.recibos)}
        <tr><td colspan="3" style="background:var(--gray2);font-weight:800">Préstamos entregados en el período</td></tr>
        ${col('Cantidad',x=>x.nPrestados)}${col('Monto prestado',fm('prestado'))}
        <tr><td colspan="3" style="background:var(--gray2);font-weight:800">Cartera al ${pcfFecha(d.hasta)}</td></tr>
        ${col('Préstamos activos',x=>x.activos)}${col('Capital en la calle',x=>'<b>'+pcfFmt(x.cartera)+'</b>')}${col('Intereses por cobrar',fm('interesPend'))}
        ${col('Préstamos atrasados',x=>x.atrasados)}${col('Monto vencido',fm('vencido'))}${col('Mora pendiente',fm('moraPend'))}${col('Morosidad (% de la cartera vencida)',x=>x.morosidad+' %')}
      </tbody></table></div></div>
    <div class="card"><div class="card-title">🏦 Resumen por banco y cuenta</div>
      <p style="font-size:12px;color:var(--gray);margin:-6px 0 6px">Neto = lo que entró en cobros menos lo que salió en préstamos.</p>
      <div class="table-wrap">${pcfTablaBancos(d,false)}</div></div>
    <div class="card"><div class="card-title">🧾 Recibos del período (${d.pagos.length})</div>
      ${d.pagos.length?`<div class="table-wrap pcf-tabla-wrap"><table><thead><tr><th>Recibo</th><th>Fecha</th><th>Cliente</th><th>Contrato</th><th>Concepto</th><th class="pcf-num">Capital</th><th class="pcf-num">Interés</th><th class="pcf-num">Mora</th><th class="pcf-num">Total</th></tr></thead><tbody>
        ${d.pagos.map(x=>`<tr><td>${pcfEsc(x.recibo)}</td><td>${pcfFecha(x.fecha)}</td><td>${pcfEsc(x.cliente)}</td><td>${pcfEsc(x.contrato)}</td><td style="white-space:normal;font-size:12px">${pcfEsc(x.concepto)}</td><td class="pcf-num">${pcfFmt(x.capital)}</td><td class="pcf-num">${pcfFmt(pcfR2(x.interes+x.comision))}</td><td class="pcf-num">${pcfFmt(x.mora)}</td><td class="pcf-num"><b>${pcfMon(x.monto,x.moneda)}</b></td></tr>`).join('')}
      </tbody></table></div>`:'<p style="color:var(--gray);font-size:13px">No hay cobros en este período.</p>'}
    </div>`;
}
function pcfImprimirInforme(){
  const d=pcfDatosInforme(),cfg=pcfCfg();
  const col=(t,f)=>`<tr><td>${t}</td>${d.mon.map(x=>`<td>${f(x)}</td>`).join('')}</tr>`;
  const fm=k=>x=>pcfFmt(x[k]);
  const sec=t=>`<tr><td colspan="3" style="text-align:left;font-weight:bold;padding-top:10px">${t}</td></tr>`;
  pcfVentana('Informe de préstamos',`<div class="hoja"><div class="mono">
    ${pcfEncabezadoMono(cfg,'FECHA.: '+pcfFecha(pcfHoy())+'<br>HORA..: '+pcfHora())}
    <div style="text-align:center;font-size:16px;font-weight:bold;margin:12px 0 2px">INFORME DE PRÉSTAMOS</div>
    <div style="text-align:center;margin-bottom:10px">Del ${pcfFecha(d.desde)} al ${pcfFecha(d.hasta)}${d.tipo?' · '+(d.tipo==='vehiculo'?'Vehículos':'Personales'):''}</div>
    <table class="t" style="max-width:520px;margin:0 auto"><thead><tr><th></th><th>RD$</th><th>US$</th></tr></thead><tbody>
      ${sec('COBROS DEL PERÍODO')}${col('Total cobrado',x=>'<b>'+pcfFmt(x.cobrado)+'</b>')}${col('Capital',fm('capital'))}${col('Interés',fm('interes'))}${col('Mora',fm('mora'))}${col('Mora exonerada',fm('moraExo'))}${col('Recibos',x=>x.recibos)}
      ${sec('PRÉSTAMOS ENTREGADOS')}${col('Cantidad',x=>x.nPrestados)}${col('Monto prestado',fm('prestado'))}
      ${sec('CARTERA AL '+pcfFecha(d.hasta))}${col('Préstamos activos',x=>x.activos)}${col('Capital en la calle',x=>'<b>'+pcfFmt(x.cartera)+'</b>')}${col('Intereses por cobrar',fm('interesPend'))}
      ${col('Préstamos atrasados',x=>x.atrasados)}${col('Monto vencido',fm('vencido'))}${col('Mora pendiente',fm('moraPend'))}${col('Morosidad',x=>x.morosidad+' %')}
    </tbody></table>
    <div style="page-break-before:always;font-weight:bold;margin:18px 0 4px">RECIBOS DEL PERÍODO</div>
    ${d.pagos.length?`<table class="t"><thead><tr><th>Recibo</th><th>Fecha</th><th>Cliente</th><th>Contrato</th><th>Capital</th><th>Interés</th><th>Mora</th><th>Total</th></tr></thead><tbody>
      ${d.pagos.map(x=>`<tr><td>${pcfEsc(x.recibo)}</td><td>${pcfFecha(x.fecha)}</td><td style="text-align:left">${pcfEsc(x.cliente)}</td><td>${pcfEsc(x.contrato)}</td><td>${pcfFmt(x.capital)}</td><td>${pcfFmt(pcfR2(x.interes+x.comision))}</td><td>${pcfFmt(x.mora)}</td><td><b>${pcfFmt(x.monto)} ${pcfEsc(x.moneda)}</b></td></tr>`).join('')}
    </tbody></table>`:'<div>No hay cobros en este período.</div>'}
    <div style="page-break-before:always;text-align:center;font-size:16px;font-weight:bold;margin:18px 0 2px">RESUMEN POR BANCO Y CUENTA</div>
    <div style="text-align:center;margin-bottom:6px">Del ${pcfFecha(d.desde)} al ${pcfFecha(d.hasta)} · Neto = entró en cobros menos salió en préstamos</div>
    ${pcfTablaBancos(d,true)}
  </div></div>`,PCF_CSS_MONO);
}

// ── Datos legales ──
const PCF_LEGAL=[
  ['empresa','🏢 Empresa que presta',[
    ['nombre','Nombre en pagaré, tabla y recibos'],['razonSocial','Razón social (pagaré notarial)'],['rnc','RNC'],['telefonos','Teléfonos'],
    ['direccion','Dirección (pagaré, tabla y recibos)','',1],['domicilioSocial','Domicilio social (pagaré notarial)','',1],
    ['usarLogo','Poner el logo del sistema en los documentos','chk']]],
  ['representante','✍️ Representante que firma por la empresa',[
    ['nombre','Nombre completo'],['genero','Género','M=Masculino|F=Femenino'],['nacionalidad','Nacionalidad'],['estadoCivil','Estado civil'],
    ['profesion','Profesión u ocupación'],['cedula','Cédula'],['domicilio','Domicilio','',1]]],
  ['notario','⚖️ Notario',[
    ['titulo','Título','Licenciado|Licenciada|Doctor|Doctora'],['nombre','Nombre completo'],['nacionalidad','Nacionalidad'],['estadoCivil','Estado civil'],
    ['profesion','Profesión'],['cedula','Cédula'],['matricula','Matrícula del Colegio de Notarios'],['municipio','Notario del número del municipio de'],
    ['ciudadEncabezado','Ciudad en el encabezado'],['residencia','Domiciliado y residente en','',1],['estudio','Dirección del estudio','',1],
    ['lugarActo','Lugar del acto (En …)','',1]]],
  ['condiciones','⚙️ Condiciones por defecto',[
    ['moneda','Moneda','RD$|US$'],['tasa','Tasa mensual %','num'],['cuotas','Número de cuotas','num'],['forma','Forma de pago','Mensual|Quincenal|Semanal'],
    ['modalidad','Modalidad',Object.entries(PCF_MODALIDADES).map(([k,l])=>k+'='+l).join('|')],['mora','Mora % por mes de atraso','num'],
    ['honorarios','Honorarios de abogados (pagaré notarial)','num'],['honorariosMoneda','Moneda de los honorarios','RD$|US$'],
    ['contratoInicial','Empezar los contratos en el número','num'],['diasGracia','Días de gracia antes de cobrar mora','num'],
    ['redondeo','Redondear la cuota hacia arriba','chk'],['usarCaja','Registrar entregas y cobros en Caja','chk']]],
  ['ncf','🧾 Comprobante fiscal (NCF) en los recibos',[
    ['usar','Permitir poner NCF en los recibos','chk'],['etiqueta','Tipo de comprobante'],['prefijo','Serie (ej. B02)'],
    ['siguiente','Próximo número de la secuencia','num'],['vencimiento','Vencimiento de la secuencia','date']]]
];
const PCF_REQUERIDOS={empresa:['razonSocial','rnc','domicilioSocial'],representante:['nombre','nacionalidad','estadoCivil','profesion','cedula','domicilio'],
  notario:['nombre','nacionalidad','estadoCivil','profesion','cedula','matricula','municipio','residencia','estudio','lugarActo']};
// Ej: ["Representante: cédula y domicilio", "Notario: cédula"]
function pcfFaltantesLegales(){
  const cfg=pcfCfg(),out=[],nombres={empresa:'Empresa',representante:'Representante',notario:'Notario'};
  PCF_LEGAL.forEach(([sec,,campos])=>{
    const f=(PCF_REQUERIDOS[sec]||[]).filter(k=>!String(cfg[sec][k]||'').trim()).map(k=>campos.find(c=>c[0]===k)[1].toLowerCase());
    if(f.length)out.push(nombres[sec]+': '+(f.length>1?f.slice(0,-1).join(', ')+' y '+f[f.length-1]:f[0]));
  });
  return out;
}
function pcfTabLegal(){
  const cfg=pcfCfg(),admin=PCF.esAdmin(),dis=admin?'':'disabled';
  const campo=(sec,[k,label,tipo,ancho])=>{
    const val=cfg[sec][k],id=`pcf-l-${sec}-${k}`;
    if(tipo==='chk')return `<label class="pcf-chk full"><input type="checkbox" id="${id}" ${val?'checked':''} ${dis}> ${label}</label>`;
    let html;
    if(tipo&&tipo!=='num'&&tipo!=='date')html=`<select id="${id}" ${dis}>${tipo.split('|').map(o=>{const [k2,l2]=o.split('=');return `<option value="${pcfEsc(k2)}" ${String(k2)===String(val)?'selected':''}>${pcfEsc(l2||k2)}</option>`;}).join('')}</select>`;
    else html=`<input type="${tipo==='num'?'number':tipo==='date'?'date':'text'}" ${tipo==='num'?'step="any"':''} id="${id}" value="${pcfEsc(val)}" ${dis}>`;
    return `<div class="form-field ${ancho?'full':''}"><label>${label}</label>${html}</div>`;
  };
  const falta=pcfFaltantesLegales();
  document.getElementById('pcf-body').innerHTML=`
    ${falta.length?`<div class="pcf-aviso" style="font-size:13px">⚠️ Para que el pagaré notarial salga completo, falta llenar:<br>${falta.map(pcfEsc).join('.<br>')}.<br>Mientras tanto esos datos saldrán con espacio en blanco.</div>`:''}
    ${admin?'':'<div class="pcf-aviso">🔒 Solo el administrador puede cambiar estos datos.</div>'}
    ${PCF_LEGAL.map(([sec,titulo,campos])=>`<div class="card"><div class="card-title">${titulo}</div><div class="pcf-grid">${campos.map(c=>campo(sec,c)).join('')}</div></div>`).join('')}
    ${admin?'<div class="btn-row"><button class="btn btn-primary" onclick="pcfGuardarLegal()">💾 Guardar datos legales</button></div>':''}`;
}
async function pcfGuardarLegal(){
  if(!PCF.esAdmin()){toast('Solo el administrador puede cambiar estos datos','error');return;}
  const nuevo={};
  PCF_LEGAL.forEach(([sec,,campos])=>{
    nuevo[sec]={};
    campos.forEach(([k,,tipo])=>{
      const el=document.getElementById(`pcf-l-${sec}-${k}`);if(!el)return;
      nuevo[sec][k]=tipo==='chk'?el.checked:tipo==='num'?pcfN(el.value):el.value.trim();
    });
  });
  nuevo.condiciones.monedaRevisada=true;
  DB[PCF.keys.config]=nuevo;PCF.guardar(PCF.keys.config);
  PCF.bitacora('Guardó datos legales','');
  toast('Datos legales guardados ✓','success');pcfRender('legal');
}

// ══ DOCUMENTOS ══
function pcfDoc(tipo,id){
  let p;
  if(id)p=pcfPrestamos().find(x=>x.id===id);
  else{
    p=pcfLeerForm();const e=pcfValidar(p);if(e.length){toast(e[0],'error');return;}
    const prev=pcfEditId?pcfPrestamos().find(x=>x.id===pcfEditId):null;
    p.contrato=prev?prev.contrato:'';p._borrador=true;
  }
  if(!p)return;
  const cfg=pcfCfg();
  if(tipo==='notarial'){
    const falta=pcfFaltantesLegales();
    if(falta.length)toast('Faltan datos legales; saldrán en blanco. Complétalos en la pestaña Datos legales.','error');
    pcfVentana('Pagaré notarial '+(p.contrato||''),pcfHtmlNotarial(p,cfg,true),PCF_CSS_NOTARIAL,p._borrador);
  } else if(tipo==='pagare')pcfVentana('Pagaré '+(p.contrato||''),pcfHtmlPagare(p,cfg),PCF_CSS_MONO,p._borrador);
  else if(tipo==='estado')pcfVentana('Estado de cuenta '+p.contrato,pcfHtmlEstado(p,cfg),PCF_CSS_MONO);
  else pcfVentana('Tabla de amortización '+(p.contrato||''),pcfHtmlTabla(p,cfg),PCF_CSS_MONO,p._borrador);
}
function pcfVentana(titulo,html,css,borrador){
  const w=window.open('','_blank','width=900,height=1000');
  if(!w){toast('El navegador bloqueó la ventana. Permite las ventanas emergentes para imprimir.','error');return;}
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${pcfEsc(titulo)}</title><style>
    @page{size:letter;margin:12mm}
    body{margin:0;background:#e5e7eb}
    .pcf-bar{position:sticky;top:0;background:#0f172a;padding:10px;display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;z-index:9;font-family:Arial,sans-serif}
    .pcf-bar button{padding:9px 22px;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
    .pcf-bar span{color:#fbbf24;font-size:13px;font-weight:700}
    .hoja{background:#fff;width:21.59cm;max-width:100%;min-height:27.94cm;margin:16px auto;padding:1.3cm 1.5cm;box-sizing:border-box;color:#000}
    @media print{body{background:#fff}.pcf-bar{display:none}.hoja{margin:0;width:auto;min-height:0;padding:0}}
    ${css}</style></head><body>
    <div class="pcf-bar">${borrador?'<span>VISTA PREVIA — el préstamo aún no está guardado</span>':''}
      <button style="background:#2563eb;color:#fff" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
      <button style="background:#e5e7eb" onclick="window.close()">✕ Cerrar</button></div>
    ${html}</body></html>`);
  w.document.close();
}
const PCF_CSS_MONO=`
  .mono{font-family:"Courier New",Courier,monospace;font-size:12.5px;line-height:1.45}
  .caja{border:1.5px solid #000;border-radius:12px;padding:10px 14px}
  .fila{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .u{text-decoration:underline}.b{font-weight:bold}
  .logo{max-height:60px;max-width:200px;object-fit:contain}
  .linea{border-bottom:1px solid #000;height:26px;margin:4px 0}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:1px 24px;margin:8px 0}
  table.t{width:100%;border-collapse:collapse;font-family:"Courier New",Courier,monospace;font-size:11.5px;margin-top:6px}
  table.t th{border-top:1.5px solid #000;border-bottom:1.5px solid #000;padding:4px 6px;text-align:right;font-weight:bold}
  table.t td{padding:2px 6px;text-align:right}
  table.t th:first-child,table.t td:first-child{text-align:left}
  table.t tr.tot td{border-top:1.5px solid #000;font-weight:bold}`;
const PCF_CSS_NOTARIAL=`
  .not{font-family:"Times New Roman",Times,serif;font-size:12pt;line-height:1.9;text-align:justify}
  .not .c{text-align:center;margin:0;line-height:1.3}
  .not .escudo{display:block;margin:0 auto 6px;width:80px}
  .not h2{text-align:center;font-size:12.5pt;text-decoration:underline;margin:14px 0 6px}
  .not .firmas{margin-top:34px;text-align:left;line-height:1.4}
  .not .firma{margin:34px 0 0 0}
  .not .firma .l{border-bottom:1px solid #000;width:300px;height:40px}
  .not .firma div{margin-left:0}`;
function pcfEncabezadoMono(cfg,der){
  const e=cfg.empresa,logo=e.usarLogo?PCF.logo():'';
  return `<div class="fila" style="align-items:flex-start">
    <div><div class="b" style="font-size:15px">*${pcfEsc(e.nombre)}*</div><div>${pcfEsc(e.direccion)}</div><div>${pcfEsc(e.telefonos)}${e.rnc?' RNC: '+pcfEsc(e.rnc):''}</div></div>
    <div style="text-align:right">${logo?`<img class="logo" src="${logo}"><br>`:''}${der||''}</div></div>`;
}
const pcfHora=()=>new Date().toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});

// ── Pagaré ──
function pcfHtmlPagare(p,cfg){
  const e=cfg.empresa,c=p.cliente||{};
  const bl=(x,n)=>x?pcfEsc(x):'_'.repeat(n||20);
  return `<div class="hoja"><div class="mono">
    <div class="caja">${pcfEncabezadoMono(cfg,'HORA..: '+pcfHora())}</div>
    <div class="caja" style="margin-top:8px;padding:14px 18px">
      <div class="fila"><span class="b u">CONTRATO NO. ${bl(p.contrato,10)}</span><span>Fecha.: <span class="b u">${pcfFecha(p.fecha)}</span></span></div>
      <div class="fila" style="margin-top:14px"><span>Debo y pagaré a</span><span class="b">*${pcfEsc(e.nombre)}*</span><span>, o su orden</span></div>
      <p style="margin:12px 0 4px">La cantidad de: <span class="b u">(${pcfMontoLetras(p.capital,p.moneda,false,true)} )</span></p>
      <p style="margin:4px 0">A mi entera satisfacción y que me comprometo a pagar en la fecha indicada. Al incumplimiento de pago quedan afectados todos mis bienes habidos y por haber, con renuncia del fuero de domicilio y de cualquier otra ley que pudiera favorecerme.</p>
      <p style="margin:16px 0 4px">Espacio reservado para que de su puño y letra el cliente ponga BUENO Y VÁLIDO y el monto de esta obligación en letras.</p>
      <div class="linea"></div><div class="linea"></div>
      <p style="margin:22px 0 14px">VALOR <span class="b u">${p.moneda==='US$'?'US$':'RD$'}</span> : <span class="b u">&nbsp;&nbsp;&nbsp;${pcfFmt(p.capital)}&nbsp;&nbsp;&nbsp;</span></p>
      <div class="fila" style="align-items:flex-end">
        <div>
          <div><span class="b">Nombre&nbsp;&nbsp;&nbsp;:</span> ${bl((c.nombre||'').toUpperCase(),30)}</div>
          <div><span class="b">Dirección:</span> ${bl((c.direccion||'').toUpperCase(),30)}</div>
          <div><span class="b">${pcfEsc((c.tipoDoc||'Cédula').padEnd(9,' ').replace(/ /g,'&nbsp;'))}:</span> ${bl(c.documento,15)}</div>
        </div>
        <div style="text-align:center;min-width:220px"><div style="border-bottom:1px solid #000;height:34px"></div><div class="b">FIRMA</div></div>
      </div>
    </div></div></div>`;
}

// ── Tabla de amortización ──
function pcfHtmlTabla(p,cfg){
  const filas=pcfTablaActual(p),r=pcfResumen(filas),c=p.cliente||{};
  const L=(l,v)=>`<div><span>${(l+' ').padEnd(20,'.').replace(/ /g,'&nbsp;')}:</span> <b>${v}</b></div>`;
  const garantia=p.vehiculo?pcfEsc([p.vehiculo.tipo,pcfDescVehiculo(p.vehiculo)].filter(Boolean).join(' ')):(p.garantia?pcfEsc(p.garantia):'Ninguna');
  return `<div class="hoja"><div class="mono">
    ${pcfEncabezadoMono(cfg,'FECHA.: '+pcfFecha(pcfHoy())+'<br>HORA..: '+pcfHora())}
    <div style="text-align:center;font-size:16px;font-weight:bold;margin:12px 0 6px;letter-spacing:1px">TABLA DE AMORTIZACIÓN</div>
    <div class="info">
      ${L('Número de contrato',pcfEsc(p.contrato||'(sin guardar)'))}${L('Forma de pago',pcfEsc(p.forma))}
      ${L('Cliente',pcfEsc(c.nombre))}${L('Modalidad',pcfEsc(PCF_MODALIDADES[p.modalidad]))}
      ${L(c.tipoDoc||'Documento',pcfEsc(c.documento||'—'))}${L('Fecha del préstamo',pcfFecha(p.fecha))}
      ${L('Capital',pcfFmt(p.capital)+' '+pcfEsc(p.moneda))}${L('Gastos legales',pcfFmt(p.gastosLegales))}
      ${L('Tasa de interés',(+p.tasa).toFixed(2)+' % mensual')}${L('Mora por atraso',pcfEsc(p.mora)+' % mensual')}
      ${L('Cantidad de cuotas',r.n)}${L('Cuota',pcfFmt(r.cuota)+(r.ultima!==r.cuota?' (última '+pcfFmt(r.ultima)+')':''))}
      <div style="grid-column:1/-1">${L('Garantía',garantia)}</div>
    </div>
    <table class="t"><thead><tr><th>Fecha</th><th>Cuota</th><th>Capital</th><th>Interés</th><th>Comisión</th><th>Pago</th><th>Balance</th><th>Saldo capital</th></tr></thead><tbody>
      ${filas.map(f=>`<tr><td>${pcfFecha(f.fecha)}</td><td>${f.n}/${r.n}</td><td>${pcfFmt(f.capital)}</td><td>${pcfFmt(f.interes)}</td><td>${pcfFmt(f.comision)}</td><td><b>${pcfFmt(f.cuota)}</b></td><td>${pcfFmt(f.balance)}</td><td>${pcfFmt(f.saldoCapital)}</td></tr>`).join('')}
      <tr class="tot"><td colspan="2">TOTALES</td><td>${pcfFmt(pcfR2(r.total-r.intereses-r.comisiones))}</td><td>${pcfFmt(r.intereses)}</td><td>${pcfFmt(r.comisiones)}</td><td>${pcfFmt(r.total)}</td><td></td><td></td></tr>
    </tbody></table>
  </div></div>`;
}

// ── Pagaré notarial ──
function pcfHtmlNotarial(p,cfg,conEscudo){
  const e=cfg.empresa,rep=cfg.representante,no=cfg.notario,co=cfg.condiciones,c=p.cliente||{};
  const B=(x,n)=>x?pcfEsc(x):'_'.repeat(n||18);
  const filas=pcfTabla(p),r=pcfResumen(filas),m=p.moneda,per=PCF_PERIODO[p.forma];
  const sim=m==='US$'?'US$':'RD$';
  const gC=c.genero==='F'?'a':'o',gR=rep.genero==='F'?'a':'o',gN=/a$/i.test(no.titulo||'')?'a':'o';
  const civilC=(PCF_CIVIL[c.estadoCivil]||[c.estadoCivil||'',c.estadoCivil||''])[c.genero==='F'?1:0];
  const docC=(c.tipoDoc==='Pasaporte')?`portador${gC==='a'?'a':''} del pasaporte número ${B(c.documento)}`
    :(c.tipoDoc==='RNC')?`titular del Registro Nacional de Contribuyentes número ${B(c.documento)}`
    :`portador${gC==='a'?'a':''} de la cédula de identidad y electoral número ${B(c.documento)}`;
  const rnc=String(e.rnc||'').replace(/\D/g,'');
  const rncF=rnc.length===9?rnc[0]+'-'+rnc.slice(1,3)+'-'+rnc.slice(3,8)+'-'+rnc[8]:(e.rnc||'');
  const [fy,fm,fd]=p.fecha.split('-').map(Number);
  const letrasCuota=x=>pcfMontoLetras(x,m,true,false).toLowerCase()+` (${sim}${pcfFmt(x)})`;
  const nL=x=>pcfNum(x).toLowerCase()+` (${x})`;
  let pagos;
  if(r.iguales&&r.ultima===r.cuota)pagos=`Mediante ${nL(r.n)} pagos ${per[1]} de ${letrasCuota(r.cuota)}`;
  else if(r.iguales)pagos=r.n===2?`Mediante un (1) pago ${per[0]} de ${letrasCuota(r.cuota)} y un último pago de ${letrasCuota(r.ultima)}`
    :`Mediante ${nL(r.n-1)} pagos ${per[1]} de ${letrasCuota(r.cuota)} y un último pago de ${letrasCuota(r.ultima)}`;
  else pagos=`Mediante ${nL(r.n)} pagos ${per[1]} consecutivos, según la tabla de amortización que forma parte de este acto, por un total de ${letrasCuota(r.total)}`;
  if(r.n===1)pagos=`Mediante un (1) único pago de ${letrasCuota(r.cuota)}`;
  const v=p.vehiculo;
  let garantia='';
  if(p.tipo==='vehiculo'&&v){
    const pu=parseInt(v.puertas);
    garantia=`Que EL DEUDOR deja como garantía el vehículo que se describe a continuación: Un ${B((v.tipo||'').toUpperCase(),10)}, Marca ${B((v.marca||'').toUpperCase())}, Modelo ${B((v.modelo||'').toUpperCase())}, Año ${B(v.anio,6)}, Color ${B((v.color||'').toUpperCase())}, Chasis número ${B((v.chasis||'').toUpperCase())}${pu?`, ${pcfNum(pu).toLowerCase()} (${pu}) puertas`:''}, Registro y Placa No: ${pcfEsc((v.placa||'EN TRÁMITE').toUpperCase())};`;
  } else if(p.garantia)garantia=`Que EL DEUDOR deja como garantía lo siguiente: ${pcfEsc(p.garantia)};`;
  const hon=pcfR2(co.honorarios),honM=co.honorariosMoneda||'US$';
  const clausulas=[
    `Que EL DEUDOR por medio de este acto reconoce adeudar, a favor de EL ACREEDOR, la suma de <b>${pcfMontoLetras(p.capital,m,true,false)} (${sim}${pcfFmt(p.capital)})</b>, la cual será saldada de la siguiente manera: ${pagos}, ${r.n===1?'a pagar el día '+pcfFechaLarga(r.fin):'iniciando el día '+pcfFechaLarga(r.inicio)+' hasta el día '+pcfFechaLarga(r.fin)};`,
    `El monto establecido anteriormente generará intereses de ${pcfDecLetras(p.tasa)} por ciento (${+p.tasa}%) de interés mensual; luego de la fecha acordada.`,
    `En caso de mora en la fecha antes indicada, el monto establecido anteriormente generará intereses de un ${pcfDecLetras(p.mora)} por ciento (${+p.mora}%) por cada mes de atraso;`,
    `La suma antes indicada deberá ser pagada sin requerimiento alguno en manos de EL ACREEDOR, en el lugar y mediante el modo que este designe, sin necesidad de puesta en mora ni requerimiento previo, hasta la completa amortización de la deuda, de acuerdo a los términos y condiciones de este acto. En caso de incumplimiento del pago de una de las cuotas arriba expresadas, incluyendo las de intereses, por parte de EL DEUDOR, el presente documento servirá como título ejecutorio en beneficio y provecho de EL ACREEDOR, conforme lo establecido por el artículo 545 del Código de Procedimiento Civil, y todos los gastos relativos al procedimiento o a las vías de ejecución a las cuales tenga que recurrir EL ACREEDOR, en persecución de su crédito, correrán siempre por cuenta de EL DEUDOR, y para los efectos y el cumplimiento de su obligación de pago quedan afectados sus bienes habidos y por haber;`,
    `Que no obstante lo indicado en los puntos anteriores, EL ACREEDOR tendrá la facultad de aceptar el pago con posterioridad a su fecha de pago o vencimiento, a manera de prórroga, y sin que ello implique caducidad alguna del derecho de EL ACREEDOR, de exigir en cualquier momento el pago total de los valores adeudados;`,
    `Que EL DEUDOR por medio de este acto reconoce ser deudor${gC==='a'?'a':''} de EL ACREEDOR, por lo que si no pagara el monto antes estipulado en el plazo señalado anteriormente, se compromete a pagar la totalidad de la deuda con sus bienes muebles e inmuebles, presentes y futuros, para el pago de dichos valores;`,
    `Que EL DEUDOR declara que en caso de incumplimiento de la presente obligación se compromete a pagar todas las costas, gastos y honorarios de abogados en que pudiera incurrir EL ACREEDOR para el cobro de la misma, bien sea mediante procedimientos judiciales o extrajudiciales, estipulándose además que, en caso de que se iniciara un procedimiento judicial para el cobro de esta obligación, se compromete a pagar una suma líquida para cubrir honorarios del o los abogados tenedores de esta obligación ascendente a ${pcfMontoLetras(hon,honM,true,false)} (${honM==='RD$'?'RD$':'US$'}${pcfFmt(hon)}), y dicha suma será cierta, exigible y pagadera por el solo hecho del inicio de los procedimientos de cobro, sin perjuicio de las costas y honorarios de abogados a que el proceso pudiera haber dado lugar;`,
    `Que EL DEUDOR renuncia a todo derecho de presentación, protesto, demanda y aviso por falta de pago y consiente a cualquier prórroga de tiempo, renovación, renuncia de derechos o modificaciones que puedan ser concedidos por EL ACREEDOR, todo sin necesidad de aviso o consentimiento adicional de EL DEUDOR;`
  ];
  if(garantia)clausulas.push(garantia);
  clausulas.push(`Para la ejecución del presente acto y sus posibles consecuencias, las partes eligen domicilio de la manera siguiente: en sus respectivos domicilios más arriba indicados. De todo lo anterior di lectura a EL DEUDOR y a EL ACREEDOR, quienes, al encontrarlo conforme a sus declaraciones, lo firmaron ante mí y junto conmigo, Abogado-Notario Público que certifico y doy fe.`);
  const ORD=['PRIMERO','SEGUNDO','TERCERO','CUARTO','QUINTO','SEXTO','SÉPTIMO','OCTAVO','NOVENO','DÉCIMO','DÉCIMO PRIMERO','DÉCIMO SEGUNDO'];
  const dia=fd===1?'al primer (1) día':`a los (${fd}) días`;
  return `<div class="hoja"><div class="not">
    ${conEscudo?`<img class="escudo" src="${PCF_ESCUDO}">`:''}
    <p class="c"><b>${pcfEsc((no.titulo||'').startsWith('Doct')?'DR.':'LIC.')} ${B((no.nombre||'').toUpperCase(),25)}</b></p>
    <p class="c">Notario Público.</p>
    <p class="c">${pcfEsc(no.ciudadEncabezado)}</p>
    <h2>PAGARÉ NOTARIAL</h2>
    <p><b>ACTO NÚMERO: ____________ (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</b></p>
    <p>En ${B(no.lugarActo,40)}, ${dia} del mes de ${PCF_MESES[fm-1]} del año ${pcfNum(fy).toLowerCase()} (${fy}). Por ante mí ${pcfEsc(no.titulo)} <b>${B((no.nombre||'').toUpperCase(),25)}</b>, ${B(no.nacionalidad,10)}, mayor de edad, ${B(no.estadoCivil,10)}, ${B(no.profesion,10)}, domiciliad${gN} y residente en ${B(no.residencia,30)}, portador${gN==='a'?'a':''} de la cédula de identidad y electoral número ${B(no.cedula,14)}, Notario Público de los del Número para el Municipio de ${B(no.municipio,12)}, portador${gN==='a'?'a':''} de la matrícula del Colegio de Notarios número ${B(no.matricula,6)}, estando en mi estudio profesional abierto en ${B(no.estudio,40)}; <b>COMPARECEN:</b> Los señores <b>${B((c.nombre||'').toUpperCase(),30)}</b>, quien declara ser de nacionalidad ${B(c.nacionalidad,12)}, mayor de edad, ${B(civilC,10)}, ${B(c.ocupacion,14)}, ${docC}, domiciliad${gC} y residente en ${B(c.direccion,40)}; quien en el presente acto se designará con su nombre y/o se denominará <b>EL DEUDOR</b>, de una parte; <b>${B((rep.nombre||'').toUpperCase(),30)}</b>, quien declara ser de nacionalidad ${B(rep.nacionalidad,12)}, mayor de edad, ${B(rep.estadoCivil,10)}, ${B(rep.profesion,14)}, titular de la cédula de identidad y electoral número ${B(rep.cedula,14)}, domiciliad${gR} y residente en ${B(rep.domicilio,40)}, quien actúa en nombre y representación de <b>${B(e.razonSocial,20)}</b>, sociedad comercial organizada y existente de conformidad con las leyes de la República Dominicana, titular del Registro Nacional de Contribuyentes número ${B(rncF,12)}, con su domicilio social ubicado en ${B(e.domicilioSocial,40)}; quien en el presente acto se designará con su nombre y/o razón social y/o se denominará <b>EL ACREEDOR</b>, de la otra parte; personas a quienes doy fe de conocer y he identificado por medio de sus respectivos documentos de identidad personal, quienes me han declarado lo siguiente: ${clausulas.map((t,i)=>`<b>${ORD[i]}:</b> ${t}`).join(' ')} _______________________________</p>
    <div class="firmas">
      <div class="firma"><b>POR EL DEUDOR:</b><div class="l"></div><div><b>${B((c.nombre||'').toUpperCase(),30)}</b></div></div>
      <div class="firma"><b>POR EL ACREEDOR:</b><div class="l"></div><div><b>${B((rep.nombre||'').toUpperCase(),30)}</b>,<br>En nombre y representación de ${B(e.razonSocial,20)}</div></div>
      <div class="firma"><div class="l"></div><div><b>${pcfEsc((no.titulo||'').startsWith('Doct')?'DR.':'LIC.')} ${B((no.nombre||'').toUpperCase(),25)}</b><br>Notario Público</div></div>
    </div>
  </div></div>`;
}
function pcfWordNotarial(id){
  const p=pcfPrestamos().find(x=>x.id===id);if(!p)return;
  const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="UTF-8"><title>Pagaré notarial</title><style>
    @page WordSection1{size:8.5in 11.0in;margin:1in 1in 1in 1in}div.WordSection1{page:WordSection1}
    ${PCF_CSS_NOTARIAL}.not .firma .l{border-bottom:1px solid #000;width:300px;height:40px}</style></head>
    <body><div class="WordSection1">${pcfHtmlNotarial(p,pcfCfg(),false)}</div></body></html>`;
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['﻿'+html],{type:'application/msword'}));
  a.download='Pagare_notarial_'+p.contrato+'.doc';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  toast('Pagaré notarial descargado en Word ✓','success');
}

const PCF_ESCUDO='data:image/png;base64,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';
