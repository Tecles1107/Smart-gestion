// ================= AUDIO SINTETIZADO =================
function generarWavBeep(freq, durMs) {
    const sampleRate = 8000; const numSamples = Math.floor(sampleRate * (durMs / 1000)); const buffer = new Uint8Array(44 + numSamples);
    function writeStr(o, s) { for(let i=0; i<s.length; i++) buffer[o+i] = s.charCodeAt(i); }
    function writeU32(o, v) { buffer[o]=v&0xff; buffer[o+1]=(v>>8)&0xff; buffer[o+2]=(v>>16)&0xff; buffer[o+3]=(v>>24)&0xff; }
    function writeU16(o, v) { buffer[o]=v&0xff; buffer[o+1]=(v>>8)&0xff; }
    writeStr(0, 'RIFF'); writeU32(4, 36 + numSamples); writeStr(8, 'WAVE'); writeStr(12, 'fmt '); writeU32(16, 16); writeU16(20, 1); writeU16(22, 1); writeU32(24, sampleRate); writeU32(28, sampleRate); writeU16(32, 1); writeU16(34, 8); writeStr(36, 'data'); writeU32(40, numSamples);
    for(let i=0; i<numSamples; i++) { const t = i/sampleRate; buffer[44+i] = Math.floor(((Math.sin(2*Math.PI*freq*t) * (1-(i/numSamples))) * 0.5 + 0.5) * 255); }
    let bin = ''; for(let i=0; i<buffer.byteLength; i++) bin += String.fromCharCode(buffer[i]); return "data:audio/wav;base64," + btoa(bin);
}
const beepEx = new Audio(generarWavBeep(2400, 80));
const beepRe = new Audio(generarWavBeep(880, 130));
const beepIn = new Audio(generarWavBeep(1600, 100));
let audOK = false, sonidoHabilitado = true;
window.addEventListener('touchstart', ()=>{ if(!audOK){ beepEx.play().then(()=>{ beepEx.pause(); beepEx.currentTime=0; audOK=true; }).catch(()=>{}); }}, {once:true});

function playBeep(t='ex') {
    if(!sonidoHabilitado) return;
    try { let s=beepEx; if(t==='re') s=beepRe; if(t==='in') s=beepIn; s.currentTime=0; s.play().catch(()=>{}); } catch(e){}
}

function toggleSonido() {
    sonidoHabilitado = !sonidoHabilitado;
    const btn = document.getElementById('btnSonidoToggle');
    if(btn) {
        btn.innerHTML = sonidoHabilitado ? '<i class="fa-solid fa-volume-high"></i> Bip' : '<i class="fa-solid fa-volume-xmark"></i> Mudo';
        btn.className = sonidoHabilitado ? 'btn btn-sm btn-outline-secondary py-0 px-2 text-white' : 'btn btn-sm btn-danger py-0 px-2';
    }
}

function hideKbd() { if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); }

// ================= GLOBALES Y ESTADO =================
function sParse(k, fb) { try { let v = localStorage.getItem(k); return (!v || v==="undefined" || v==="null") ? fb : (JSON.parse(v) || fb); } catch(e) { return fb; } }
function cleanNum(c) { return c ? String(c).replace(/\D/g, "").trim() : ""; }
function getSKU(i) { return cleanNum(i["Código"] || i["SKU"] || i["UPC"]); }
function getNom(i) { return String(i["Nombre"] || i["Producto"] || "S/N").trim().toUpperCase(); }
function getPz(i) { let p = parseInt(i["Piezas"])||0; if(p<=0 && i["Total"] && parseInt(i["Bultos"])>0) p = Math.round(i["Total"]/i["Bultos"]); return p>0?p:(parseInt(i["Total"])||1); }
function getPre(i) { return parseFloat(i["Precio"] || (i["_extraData"] ? i["_extraData"]["Precio"] : 0)) || 0; }
function getFch() { let f = new Date(); return `${String(f.getDate()).padStart(2,'0')}/${String(f.getMonth()+1).padStart(2,'0')} ${String(f.getHours()).padStart(2,'0')}:${String(f.getMinutes()).padStart(2,'0')}`; }

let arcActivo = localStorage.getItem('inventario_archivo_activo') || 'Inventario_General';
arcActivo = arcActivo.replace(/\s+/g, '_');
let archIdx = sParse('inventario_lista_archivos', ['Inventario_General', 'Hogar', 'Fiesta', 'Ferreteria']);
if(!archIdx.includes('Inventario_General')) archIdx.unshift('Inventario_General');
if(!archIdx.includes(arcActivo)) archIdx.push(arcActivo);
localStorage.setItem('inventario_lista_archivos', JSON.stringify(archIdx));

let inv = sParse('inventario_' + arcActivo, []);
let modo = 'entrada', qrCode = null, camOn = false, camPausa = false, pzCache = 1, prodAud = null;
let modoRapido = false, cajaMixtaActiva = false, idCajaMixtaActual = "", linternaOn = false, camFacingMode = "environment";
let importacionTemporal = { nombreArchivo: "", filas: [], columnas: [] };
let chartAreaObj = null, chartTopObj = null, chartCadObj = null;

window.addEventListener('DOMContentLoaded', () => {
    try { qrCode = new Html5Qrcode("reader"); } catch(e){}
    syncGenSilent(); uiArc(); uiDataList(); rendTab(); uiBtn(); hideKbd();
    verificarCaducidadesGlobales();

    fetch('/api/ping').then(r=>r.json()).then(()=>{
        console.log("Servidor Python responsivo.");
    }).catch(()=>{});

    fetch('/api/cargar_todo').then(r=>r.json()).then(d=>{
        if(d && d.archivos && Object.keys(d.archivos).length>0) {
            Object.keys(d.archivos).forEach(n=>{
                let nl = n.replace(/\s+/g,'_');
                localStorage.setItem('inventario_'+nl, JSON.stringify(d.archivos[n]));
                if(!archIdx.includes(nl)) archIdx.push(nl);
            });
            localStorage.setItem('inventario_lista_archivos', JSON.stringify(archIdx));
            inv = sParse('inventario_' + arcActivo, []);
            rendTab();
            verificarCaducidadesGlobales();
        }
    }).catch(()=>{});
});

// ================= VISTAS ESCÁNER / DASHBOARD =================
function mostrarVista(v) {
    if(v === 'dashboard') {
        document.getElementById('seccionEscaner').style.display = 'none';
        document.getElementById('seccionDashboard').style.display = 'flex';
        document.getElementById('btnTabDashboard').classList.add('btn-primary', 'active');
        document.getElementById('btnTabDashboard').classList.remove('btn-outline-info');
        document.getElementById('btnTabEscaner').classList.remove('btn-primary', 'active');
        document.getElementById('btnTabEscaner').classList.add('btn-outline-info');
        actualizarGraficosDashboard();
    } else {
        document.getElementById('seccionDashboard').style.display = 'none';
        document.getElementById('seccionEscaner').style.display = 'block';
        document.getElementById('btnTabEscaner').classList.add('btn-primary', 'active');
        document.getElementById('btnTabEscaner').classList.remove('btn-outline-info');
        document.getElementById('btnTabDashboard').classList.remove('btn-primary', 'active');
        document.getElementById('btnTabDashboard').classList.add('btn-outline-info');
    }
}

function actualizarGraficosDashboard() {
    syncGenSilent();
    let areasMap = {}, productosMap = {}, porVencer = 0, vencidos = 0, okCount = 0;
    let hoy = new Date();

    archIdx.forEach(ar => {
        if(ar === 'Inventario_General') return;
        let items = sParse('inventario_' + ar, []);
        let areaNom = ar.replace(/_/g, " ");
        let totalPzs = 0;

        items.forEach(it => {
            let pz = parseInt(it["Total"])||0;
            totalPzs += pz;
            let nom = getNom(it);
            if(nom !== "S/N") productosMap[nom] = (productosMap[nom]||0) + pz;

            let cad = it["Caducidad"];
            if(cad) {
                let fCad = new Date(cad);
                let diffDias = Math.ceil((fCad - hoy) / (1000 * 60 * 60 * 24));
                if(diffDias < 0) vencidos++;
                else if(diffDias <= 30) porVencer++;
                else okCount++;
            } else {
                okCount++;
            }
        });
        areasMap[areaNom] = totalPzs;
    });

    // Chart 1: Stock por Área
    let ctxArea = document.getElementById('chartStockPorArea')?.getContext('2d');
    if(ctxArea) {
        if(chartAreaObj) chartAreaObj.destroy();
        chartAreaObj = new Chart(ctxArea, {
            type: 'bar',
            data: {
                labels: Object.keys(areasMap),
                datasets: [{ label: 'Piezas Totales', data: Object.values(areasMap), backgroundColor: '#38bdf8' }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    // Chart 2: Top Productos
    let sortedProds = Object.entries(productosMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
    let ctxTop = document.getElementById('chartTopProductos')?.getContext('2d');
    if(ctxTop) {
        if(chartTopObj) chartTopObj.destroy();
        chartTopObj = new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: sortedProds.map(p => p[0].substring(0,15)),
                datasets: [{ label: 'Stock Total', data: sortedProds.map(p => p[1]), backgroundColor: '#10b981' }]
            },
            options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
        });
    }

    // Chart 3: Caducidades
    let ctxCad = document.getElementById('chartCaducidades')?.getContext('2d');
    if(ctxCad) {
        if(chartCadObj) chartCadObj.destroy();
        chartCadObj = new Chart(ctxCad, {
            type: 'doughnut',
            data: {
                labels: ['Vencidos', 'Próximos (30d)', 'Correctos / Sin Fecha'],
                datasets: [{ data: [vencidos, porVencer, okCount], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'] }]
            },
            options: { responsive: true }
        });
    }
}

// ================= RECORDATORIO DE CADUCIDAD =================
function verificarCaducidadesGlobales() {
    let hoy = new Date();
    let alertas = [];

    archIdx.forEach(ar => {
        let items = sParse('inventario_' + ar, []);
        items.forEach(it => {
            if(it["Caducidad"]) {
                let fCad = new Date(it["Caducidad"]);
                let diffDias = Math.ceil((fCad - hoy) / (1000 * 60 * 60 * 24));
                if(diffDias <= 30) {
                    alertas.push({ nom: getNom(it), cad: it["Caducidad"], dias: diffDias, area: ar });
                }
            }
        });
    });

    let banner = document.getElementById('bannerCaducidad');
    if(banner) {
        if(alertas.length > 0) {
            banner.classList.remove('d-none');
            banner.classList.add('d-flex');
            document.getElementById('lblCantCaducados').innerText = alertas.length;
            document.getElementById('lblDetalleCaducidad').innerText = `Ejemplo: ${alertas[0].nom} (${alertas[0].dias < 0 ? '¡VENCIDO!' : alertas[0].dias + ' días restantes'})`;
        } else {
            banner.classList.add('d-none');
            banner.classList.remove('d-flex');
        }
    }
}

function filtrarCaducadosEnTabla() {
    let inp = document.getElementById('inputBuscarTabla');
    if(inp) {
        inp.value = "caducidad";
        rendTab();
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}

// ================= CAJA MIXTA & MODOS =================
function toggleCajaMixta() {
    let chk = document.getElementById('chkCajaMixta');
    let banner = document.getElementById('bannerCajaMixta');
    cajaMixtaActiva = chk.checked;

    if(cajaMixtaActiva) {
        idCajaMixtaActual = "MIX-" + String(Math.floor(Math.random() * 900) + 100);
        document.getElementById('lblCodigoCajaMixta').innerText = idCajaMixtaActual;
        banner.classList.remove('d-none');
        document.getElementById('bultos').value = "1";
        document.getElementById('piezas').value = "1";
    } else {
        banner.classList.add('d-none');
        idCajaMixtaActual = "";
    }
}

function finalizarCajaMixta() {
    document.getElementById('chkCajaMixta').checked = false;
    toggleCajaMixta();
    playBeep('ex');
    alert("Caja Mixta finalizada y guardada.");
}

function toggleModoRapido() {
    modoRapido = !modoRapido;
    let lbl = document.getElementById('lblModoRapido');
    let btn = document.getElementById('btnEscaneoRapido');
    if(modoRapido) {
        lbl.innerText = "ON";
        btn.className = "btn btn-sm btn-warning fw-bold py-1 px-2 text-dark";
    } else {
        lbl.innerText = "OFF";
        btn.className = "btn btn-sm btn-outline-warning fw-bold py-1 px-2";
    }
    playBeep('in');
}

// ================= SINCRONIZACIÓN Y TERMUX =================
function saveToTermux(n, it) {
    fetch('/api/guardar_sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: n.replace(/\s+/g, '_'), items: it })
    }).catch(() => {});
}

function saveMem() {
    if(!archIdx.includes(arcActivo)) archIdx.push(arcActivo);
    localStorage.setItem('inventario_'+arcActivo, JSON.stringify(inv));
    localStorage.setItem('inventario_archivo_activo', arcActivo);
    localStorage.setItem('inventario_lista_archivos', JSON.stringify(archIdx));
    saveToTermux(arcActivo, inv);
    verificarCaducidadesGlobales();
}

function guardarArchivoActualManual() {
    saveMem();
    if(arcActivo !== 'Inventario_General') syncGenSilent();
    hideKbd();
    playBeep('ex');
    alert(`💾 Guardado exitoso de "${arcActivo.replace(/_/g, ' ')}".`);
}

function syncGenSilent() {
    let otras = archIdx.filter(a => a !== 'Inventario_General');
    if(otras.length === 0) return;
    let mapG = {};

    otras.forEach(nArea => {
        let items = sParse('inventario_' + nArea, []);
        if(!Array.isArray(items)) return;
        let etq = nArea.replace(/_/g, " ");

        items.forEach(it => {
            let sku = getSKU(it);
            if(!sku) return;
            let b = parseInt(it["Bultos"])||0, p = getPz(it), t = parseInt(it["Total"])||0, pr = getPre(it), cad = it["Caducidad"]||"", clv = cad ? `${sku}_${cad}` : sku;
            if(!mapG[clv]) {
                mapG[clv] = { "Fecha_Captura": it["Fecha_Captura"]||getFch(), "Código": sku, "Nombre": getNom(it), "Caducidad": cad, "Bultos": 0, "Piezas": p, "Total": 0, "Precio": pr, "_am": {}, "_extraData": Object.assign({}, it["_extraData"]||{}) };
            }
            if(mapG[clv]["Nombre"]==="S/N" && getNom(it)!=="S/N") mapG[clv]["Nombre"] = getNom(it);
            if(pr>0) mapG[clv]["Precio"] = pr;
            mapG[clv]._am[etq] = { b, p, t };
            mapG[clv]["Bultos"] += b;
            mapG[clv]["Total"] += t;
        });
    });

    let listG = Object.values(mapG).map(pr => {
        let ar = Object.keys(pr._am);
        pr["Área"] = ar.join(", ");
        delete pr._am;
        return pr;
    });

    localStorage.setItem('inventario_Inventario_General', JSON.stringify(listG));
    saveToTermux('Inventario_General', listG);
    if(arcActivo === 'Inventario_General') inv = listG;
}

// ================= CÁMARA ROBUSTA CON CAMBIO DE LENTE =================
async function toggleLinterna() {
    if(!camOn || !qrCode) return;
    try {
        linternaOn = !linternaOn;
        await qrCode.applyVideoConstraints({
            advanced: [{ torch: linternaOn }]
        });
        const btn = document.getElementById('btnLinterna');
        if(btn) {
            btn.className = linternaOn ? 'btn btn-sm btn-warning py-0 px-2 fw-bold text-dark' : 'btn btn-sm btn-outline-warning py-0 px-2';
        }
    } catch(e) {
        alert("La linterna/flash no está soportada por el navegador o lente de esta cámara.");
    }
}

async function cambiarLenteCamara() {
    camFacingMode = (camFacingMode === "environment") ? "user" : "environment";
    if(camOn) {
        await detenerCamara();
        await iniciarCamara();
    }
}

async function iniciarCamara() {
    hideKbd();
    if(camOn) return;
    const errBox = document.getElementById('alertaErrorCamara');
    if(errBox) errBox.classList.add('d-none');

    if(!qrCode) qrCode = new Html5Qrcode("reader");

    const config = { fps: 12, qrbox: { width: 280, height: 130 } };

    try {
        await qrCode.start({ facingMode: camFacingMode }, config, (txt) => { procCode(txt); }, () => {});
        onCamSuccess();
        return;
    } catch(e1) {
        try {
            let altMode = (camFacingMode === "environment") ? "user" : "environment";
            await qrCode.start({ facingMode: altMode }, config, (txt) => { procCode(txt); }, () => {});
            onCamSuccess();
            return;
        } catch(e2) {
            if(errBox) {
                document.getElementById('txtErrorCamara').innerText = "Permiso de cámara o lente no disponible. Puedes usar el botón 'Foto'.";
                errBox.classList.remove('d-none');
            }
        }
    }
}

function onCamSuccess() {
    camOn = true;
    camPausa = false;
    document.getElementById('btnIniciar').classList.add('d-none');
    document.getElementById('btnDetener').classList.remove('d-none');
    const btnFlash = document.getElementById('btnLinterna');
    if(btnFlash) btnFlash.disabled = false;
    const errBox = document.getElementById('alertaErrorCamara');
    if(errBox) errBox.classList.add('d-none');
}

async function procesarFotoCodigo(e) {
    const file = e.target.files?.[0];
    if(!file) return;
    if(!qrCode) qrCode = new Html5Qrcode("reader");
    if(camOn) { await detenerCamara(); }
    try {
        const decoded = await qrCode.scanFile(file, true);
        if(decoded) {
            procCode(decoded);
            playBeep('ex');
        }
    } catch(err) {
        alert("No se detectó un código claro en la foto.");
    } finally {
        e.target.value = "";
    }
}

function detenerCamara() {
    if(camOn && qrCode) {
        qrCode.stop().then(() => {
            camOn = false; camPausa = false;
            document.getElementById('btnIniciar').classList.remove('d-none');
            document.getElementById('btnDetener').classList.add('d-none');
            document.getElementById('alertaPausa').classList.add('d-none');
            document.getElementById('reader').innerHTML = "";
            hideKbd();
        }).catch(()=>{});
    }
}

function procCode(txt) {
    if(!txt || camPausa) return;
    let sku = cleanNum(txt);
    if(sku.length < 3) return;

    try { qrCode.pause(true); camPausa = true; document.getElementById('alertaPausa').classList.remove('d-none'); } catch(e){}
    let inSKU = document.getElementById('sku');
    inSKU.value = sku;
    inSKU.blur();
    hideKbd();

    if(navigator.vibrate) navigator.vibrate([80, 40, 80]);
    inSKU.classList.add('bg-success', 'text-white');
    setTimeout(() => inSKU.classList.remove('bg-success', 'text-white'), 300);

    playBeep('ex');
    autoRellenar(sku);

    if(modoRapido) {
        setTimeout(() => {
            agregarRegistro();
            descongelarCamara();
        }, 300);
    }
}

function descongelarCamara() {
    if(camOn && camPausa) {
        try { qrCode.resume(); camPausa = false; } catch(e){}
    }
    document.getElementById('alertaPausa').classList.add('d-none');
    document.getElementById('sku').value = "";
    document.getElementById('nombre').value = "";
    document.getElementById('bultos').value = "0";
    document.getElementById('piezas').value = "0";
    document.getElementById('total').value = "0";
    pzCache = 1;
    hideKbd();
}

// ================= UI Y FORMULARIO =================
function toggleOpciones() {
    document.getElementById('colCaducidad').style.display = document.getElementById('chkCaducidad').checked ? 'block' : 'none';
    document.getElementById('colPrecio').style.display = document.getElementById('chkPrecio').checked ? 'block' : 'none';
}

function uiBtn() {
    let b = document.getElementById('btnGuardarRegistro');
    if(!b) return;
    if(modo === 'consulta') {
        b.className = "btn btn-info w-100 py-2.5 fw-bold text-dark";
        b.innerHTML = "🔍 Consultar Auditoría";
    } else if(modo === 'salida') {
        b.className = "btn btn-danger w-100 py-2.5 fw-bold";
        b.innerHTML = "➖ Restar del Inventario";
    } else {
        b.className = "btn btn-success w-100 py-2.5 fw-bold";
        b.innerHTML = "➕ Sumar al Inventario";
    }
}

function cambiarModo(m) { modo = m; hideKbd(); uiBtn(); playBeep('in'); }
function calcTot() {
    let b = parseFloat(document.getElementById('bultos').value) || 0;
    let p = parseFloat(document.getElementById('piezas').value) || 0;
    document.getElementById('total').value = (b === 0) ? p : (b * p);
}
function alCambiarBultos() {
    let b = parseFloat(document.getElementById('bultos').value) || 0;
    let p = parseFloat(document.getElementById('piezas').value) || 0;
    if(b > 0 && p === 0) document.getElementById('piezas').value = pzCache || 1;
    calcTot();
}
function alCambiarPiezas() { calcTot(); }
function activarSoloPiezas() {
    document.getElementById('bultos').value = "0";
    calcTot();
    let pi = document.getElementById('piezas');
    if(pi) { pi.focus(); pi.select(); }
}

function autoRellenar(sku) {
    let skuL = cleanNum(sku);
    if(!skuL) return;
    let enc = inv.find(i => getSKU(i) === skuL);
    if(!enc) {
        for(let a of archIdx) {
            let its = sParse('inventario_' + a, []);
            enc = its.find(i => getSKU(i) === skuL);
            if(enc && getNom(enc) !== "S/N") break;
        }
    }
    if(enc && getNom(enc) !== "S/N") {
        document.getElementById('nombre').value = getNom(enc);
        pzCache = getPz(enc);
        if(document.getElementById('chkCaducidad').checked && enc["Caducidad"]) {
            document.getElementById('caducidad').value = enc["Caducidad"];
        }
        if(document.getElementById('chkPrecio').checked && getPre(enc) > 0) {
            document.getElementById('precio').value = getPre(enc);
        }
    } else {
        pzCache = 1;
    }
    document.getElementById('bultos').value = "0";
    document.getElementById('piezas').value = "0";
    document.getElementById('total').value = "0";
}

function alEscribirSKU() {
    let ip = document.getElementById('sku');
    let l = cleanNum(ip.value);
    if(ip.value !== l) ip.value = l;
    if(l.length >= 3) {
        autoRellenar(l);
    }
}

function alEscribirNombre() {
    let s = cleanNum(document.getElementById('sku')?.value);
    if(s) return;
    let n = (document.getElementById('nombre')?.value || "").trim().toUpperCase();
    if(!n) return;
    let enc = inv.find(i => getNom(i) === n);
    if(!enc) {
        for(let a of archIdx) {
            let its = sParse('inventario_' + a, []);
            enc = its.find(i => getNom(i) === n);
            if(enc) break;
        }
    }
    if(enc) {
        document.getElementById('sku').value = getSKU(enc);
        pzCache = getPz(enc);
    }
}

function agregarRegistro() {
    let sku = cleanNum(document.getElementById('sku').value);
    let nom = (document.getElementById('nombre').value.trim() || "S/N").toUpperCase();
    let b = parseInt(document.getElementById('bultos').value) || 0;
    let p = parseInt(document.getElementById('piezas').value) || 0;
    let t = parseInt(document.getElementById('total').value) || 0;
    let cad = document.getElementById('chkCaducidad').checked ? document.getElementById('caducidad').value : "";
    let pre = document.getElementById('chkPrecio').checked ? parseFloat(document.getElementById('precio').value) || 0 : 0;

    if(!sku) return alert("Por favor ingresa o escanea un código.");
    if(modo === 'consulta') return consultarProducto(sku);
    if(t <= 0 && b <= 0 && p <= 0) {
        b = 1; p = 1; t = 1;
    }

    let extraData = {};
    if(cajaMixtaActiva) {
        extraData["CajaMixta"] = idCajaMixtaActual;
    }

    let idx = inv.findIndex(i => getSKU(i) === sku && (i["Caducidad"] || "") === cad && (i["_extraData"]?.CajaMixta || "") === (extraData.CajaMixta || ""));

    if(modo === 'salida') {
        if(idx === -1) { playBeep('re'); return alert("No existe el código en esta área para restar."); }
        inv[idx]["Bultos"] = Math.max(0, (parseInt(inv[idx]["Bultos"])||0) - b);
        inv[idx]["Total"] = Math.max(0, (parseInt(inv[idx]["Total"])||0) - t);
        inv[idx]["Fecha_Captura"] = getFch() + " (-)";
        playBeep('re');
    } else {
        if(idx !== -1) {
            inv[idx]["Bultos"] = (parseInt(inv[idx]["Bultos"])||0) + b;
            inv[idx]["Total"] = (parseInt(inv[idx]["Total"])||0) + t;
            if(pre > 0) inv[idx]["Precio"] = pre;
            inv[idx]["Fecha_Captura"] = getFch();
        } else {
            inv.unshift({
                "Fecha_Captura": getFch(),
                "Área": arcActivo.replace(/_/g, " "),
                "Código": sku,
                "Nombre": nom,
                "Caducidad": cad,
                "Bultos": b,
                "Piezas": p || t || 1,
                "Total": t,
                "Precio": pre,
                "_extraData": extraData
            });
        }
        playBeep('ex');
    }

    saveMem();
    if(arcActivo !== 'Inventario_General') syncGenSilent();
    uiDataList();
    rendTab();
    document.getElementById('formInventario').reset();
    document.getElementById('bultos').value = "0";
    document.getElementById('piezas').value = "0";
    document.getElementById('total').value = "0";
    if(document.getElementById('chkCaducidad').checked) document.getElementById('caducidad').value = "";
    if(document.getElementById('chkPrecio').checked) document.getElementById('precio').value = "";
    pzCache = 1;
    descongelarCamara();
    hideKbd();
}

// ================= TABLA Y CONTROLES =================
function rendTab() {
    let tb = document.getElementById('tablaBody');
    if(!tb) return;
    let fl = document.getElementById('inputBuscarTabla')?.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
    let ord = document.getElementById('selOrdenTabla')?.value || 'defecto';

    let res = inv.map((it, x) => ({ it, x }));

    if(fl) {
        if(fl === 'caducidad') {
            let hoy = new Date();
            res = res.filter(({ it }) => {
                if(!it["Caducidad"]) return false;
                let diff = Math.ceil((new Date(it["Caducidad"]) - hoy) / (1000 * 60 * 60 * 24));
                return diff <= 30;
            });
        } else {
            let pw = fl.split(' ').filter(p => p.length > 0);
            res = res.filter(({ it }) => {
                let txt = Object.values(it).map(v => (typeof v === 'object' ? Object.values(v).join(' ') : String(v || ""))).join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
                return pw.every(p => txt.includes(p));
            });
        }
    }

    // Ordenamiento
    if(ord === 'nombre') res.sort((a,b) => getNom(a.it).localeCompare(getNom(b.it)));
    else if(ord === 'codigo') res.sort((a,b) => getSKU(a.it).localeCompare(getSKU(b.it)));
    else if(ord === 'total') res.sort((a,b) => (parseInt(b.it["Total"])||0) - (parseInt(a.it["Total"])||0));

    let tbultos = 0, tpzs = 0, valorTotalEst = 0;
    inv.forEach(i => {
        let b = parseInt(i["Bultos"])||0;
        let t = parseInt(i["Total"])||0;
        let pr = getPre(i);
        tbultos += b;
        tpzs += t;
        valorTotalEst += (pr * t);
    });

    // Actualizar Widgets de Resumen
    if(document.getElementById('statCantItems')) document.getElementById('statCantItems').innerText = inv.length;
    if(document.getElementById('statCantBultos')) document.getElementById('statCantBultos').innerText = tbultos;
    if(document.getElementById('statCantPiezas')) document.getElementById('statCantPiezas').innerText = tpzs;
    if(document.getElementById('statValorTotal')) document.getElementById('statValorTotal').innerText = `$${valorTotalEst.toFixed(2)}`;

    document.getElementById('resumenTotales').innerText = `Bultos: ${tbultos} | Pzs: ${tpzs}`;
    document.getElementById('contadorRegistros').innerText = fl ? `${res.length}/${inv.length}` : inv.length;

    if(res.length === 0) {
        tb.innerHTML = `<tr><td colSpan="8" class="text-white-50 py-4 fs-6">Sin productos registrados. Escanea un código para comenzar.</td></tr>`;
        return;
    }

    tb.innerHTML = "";
    res.forEach(({ it, x }) => {
        let pzn = getPz(it), b = parseInt(it["Bultos"])||0;
        let cjMixtaTag = it["_extraData"]?.CajaMixta ? `<span class="badge bg-warning text-dark ms-1">📦 ${it["_extraData"].CajaMixta}</span>` : "";
        let xt = (it["Caducidad"] ? `<br><span class="badge bg-danger">⏳${it["Caducidad"]}</span>` : "") + (getPre(it) > 0 ? `<span class="badge bg-success ms-1">$${getPre(it)}</span>` : "") + cjMixtaTag;

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="small text-white-50">${it["Fecha_Captura"]}</td>
            <td><span class="badge bg-primary text-white fs-6">${it["Área"] || arcActivo.replace(/_/g," ")}</span></td>
            <td><span class="badge-sku">${getSKU(it)}</span></td>
            <td class="fw-bold text-start text-white">${getNom(it)}${xt}</td>
            <td>
                <div class="d-flex gap-1 justify-content-center align-items-center">
                    <button class="btn btn-sm btn-outline-danger py-0 px-2 fw-bold" onclick="chgB(${x},-1)">-</button>
                    <span class="badge bg-secondary fs-6 text-white">${b}</span>
                    <button class="btn btn-sm btn-outline-success py-0 px-2 fw-bold" onclick="chgB(${x},1)">+</button>
                </div>
            </td>
            <td>
                <div class="d-flex gap-1 justify-content-center align-items-center">
                    <button class="btn btn-sm btn-outline-danger py-0 px-2 fw-bold" onclick="chgP(${x},-1)">-</button>
                    <span class="badge bg-dark border text-info fs-6">${pzn}</span>
                    <button class="btn btn-sm btn-outline-success py-0 px-2 fw-bold" onclick="chgP(${x},1)">+</button>
                </div>
            </td>
            <td class="fw-bold text-success fs-5">${it["Total"]}</td>
            <td>
                <button class="btn btn-sm btn-outline-info py-1 px-2 me-1" onclick="abrirModalEditar(${x})" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="eliminarFila(${x})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tb.appendChild(tr);
    });
}

function eliminarFila(x) {
    if(confirm("¿Seguro de eliminar este producto del inventario?")) {
        inv.splice(x, 1);
        saveMem();
        if(arcActivo !== 'Inventario_General') syncGenSilent();
        rendTab();
        playBeep('re');
    }
}

function chgB(x, d) {
    hideKbd();
    let it = inv[x], nb = (parseInt(it["Bultos"])||0) + d;
    if(nb <= 0) {
        eliminarFila(x);
        return;
    }
    it["Bultos"] = nb;
    it["Total"] = Math.max(0, (parseInt(it["Total"])||0) + (d * getPz(it)));
    it["Fecha_Captura"] = getFch();
    playBeep('ex');
    saveMem();
    rendTab();
}

function chgP(x, d) {
    hideKbd();
    let it = inv[x], nt = (parseInt(it["Total"])||0) + d;
    if(nt <= 0) {
        eliminarFila(x);
        return;
    }
    it["Total"] = nt;
    it["Fecha_Captura"] = getFch();
    playBeep('ex');
    saveMem();
    rendTab();
}

function filtrarTabla() { rendTab(); }
function limpiarBuscador() { document.getElementById('inputBuscarTabla').value = ""; rendTab(); hideKbd(); }

function abrirModalEditar(x) {
    let it = inv[x];
    document.getElementById('editIndex').value = x;
    document.getElementById('editSKU').value = getSKU(it);
    document.getElementById('editNombre').value = getNom(it);
    document.getElementById('editBultos').value = it["Bultos"]||0;
    document.getElementById('editPiezas').value = getPz(it);
    document.getElementById('editCaducidad').value = it["Caducidad"]||"";
    document.getElementById('editPrecio').value = getPre(it);
    new bootstrap.Modal(document.getElementById('modalEditarFila')).show();
}

function guardarEdicionFila() {
    let x = document.getElementById('editIndex').value, it = inv[x];
    it["Nombre"] = (document.getElementById('editNombre').value || "S/N").toUpperCase();
    it["Bultos"] = parseInt(document.getElementById('editBultos').value) || 0;
    it["Piezas"] = parseInt(document.getElementById('editPiezas').value) || 1;
    it["Total"] = it["Bultos"] * it["Piezas"];
    it["Caducidad"] = document.getElementById('editCaducidad').value;
    it["Precio"] = parseFloat(document.getElementById('editPrecio').value) || 0;
    it["Fecha_Captura"] = getFch() + " (Ed)";
    playBeep('ex');
    saveMem();
    rendTab();
    bootstrap.Modal.getInstance(document.getElementById('modalEditarFila')).hide();
}

// ================= BÚSQUEDA Y CONSULTA RÁPIDA =================
function abrirModalConsultaRapida() {
    document.getElementById('inputLookupSKU').value = "";
    document.getElementById('resultadoLookup').classList.add('d-none');
    new bootstrap.Modal(document.getElementById('modalLookup')).show();
}

function alBuscarLookup() {
    let sku = cleanNum(document.getElementById('inputLookupSKU').value);
    let box = document.getElementById('resultadoLookup');
    if(!sku) { box.classList.add('d-none'); return; }

    let encs = [];
    archIdx.forEach(ar => {
        let items = sParse('inventario_' + ar, []);
        items.filter(i => getSKU(i) === sku).forEach(i => {
            encs.push({ area: ar.replace(/_/g, " "), nom: getNom(i), b: i["Bultos"], t: i["Total"] });
        });
    });

    if(encs.length === 0) {
        box.innerHTML = `<span class="text-warning fw-bold">Código <strong>${sku}</strong> no registrado en ninguna área.</span>`;
    } else {
        let htm = `<h6 class="fw-bold text-info mb-1">${encs[0].nom}</h6>`;
        htm += `<small class="text-white-50 d-block mb-2">Código SKU: ${sku}</small>`;
        htm += `<ul class="list-group list-group-flush mb-0 small text-white">`;
        encs.forEach(e => {
            htm += `<li class="list-group-item d-flex justify-content-between py-1"><span>${e.area}</span><strong>${e.b} bultos | ${e.t} pzs</strong></li>`;
        });
        htm += `</ul>`;
        box.innerHTML = htm;
    }
    box.classList.remove('d-none');
}

// ================= GESTIÓN DE ÁREAS =================
function uiArc() {
    let b = document.getElementById('badgeArchivoActivo');
    if(b) {
        b.innerText = arcActivo.replace(/_/g, " ");
        b.className = `badge text-truncate fs-6 ${arcActivo === 'Inventario_General' ? 'bg-success' : 'bg-primary'}`;
    }
}

function uiDataList() {
    let dl = document.getElementById('sugerenciasNombres');
    if(!dl) return;
    dl.innerHTML = "";
    let sts = new Set();
    archIdx.forEach(ar => {
        let ls = sParse('inventario_' + ar, []);
        ls.forEach(i => {
            let n = getNom(i);
            if(n !== "S/N" && !sts.has(n)) {
                sts.add(n);
                let o = document.createElement('option');
                o.value = n;
                dl.appendChild(o);
            }
        });
    });
}

function abrirGestorArchivos() {
    let ls = document.getElementById('listaArchivosGuardados');
    ls.innerHTML = "";
    archIdx.forEach((a, x) => {
        let dt = sParse('inventario_' + a, []);
        let tp = 0;
        dt.forEach(d => tp += (parseInt(d["Total"])||0));
        let g = (a === 'Inventario_General'), c = (a === arcActivo);
        let dv = document.createElement('div');
        dv.className = `list-group-item d-flex justify-content-between align-items-center p-2 mb-1 border rounded ${c ? 'bg-primary bg-opacity-25 border-primary' : (g ? 'bg-success bg-opacity-10 border-success' : '')}`;
        
        let deleteBtn = g ? "" : `<button class="btn btn-sm btn-outline-danger py-0 px-2 ms-2" onclick="event.stopPropagation(); eliminarArea(${x});" title="Eliminar Área"><i class="fa-solid fa-trash"></i></button>`;

        dv.innerHTML = `
            <div onclick="cambiarDeArchivoPorIndice(${x})" class="cursor-pointer flex-grow-1">
                <strong class="text-white">${a.replace(/_/g, " ")}</strong><br>
                <small class="text-white-50">${dt.length} productos | ${tp} piezas</small>
            </div>
            <div class="d-flex align-items-center">
                <span class="badge ${c ? 'bg-primary' : 'bg-secondary'} cursor-pointer" onclick="cambiarDeArchivoPorIndice(${x})">${c ? 'Activa' : 'Abrir'}</span>
                ${deleteBtn}
            </div>
        `;
        ls.appendChild(dv);
    });
    document.getElementById('panelGestorArchivos').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function eliminarArea(x) {
    let areaNom = archIdx[x];
    if(confirm(`¿Seguro de eliminar el área "${areaNom.replace(/_/g, ' ')}"?`)) {
        archIdx.splice(x, 1);
        localStorage.removeItem('inventario_' + areaNom);
        if(arcActivo === areaNom) arcActivo = 'Inventario_General';
        saveMem();
        syncGenSilent();
        inv = sParse('inventario_' + arcActivo, []);
        uiArc(); uiDataList(); rendTab(); abrirGestorArchivos();

        fetch('/api/eliminar_area', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: areaNom })
        }).catch(()=>{});
        playBeep('re');
    }
}

function cerrarGestorArchivos() { document.getElementById('panelGestorArchivos').style.display = 'none'; }
function cambiarDeArchivoPorIndice(x) {
    saveMem();
    arcActivo = archIdx[x];
    if(arcActivo === 'Inventario_General') syncGenSilent();
    inv = sParse('inventario_' + arcActivo, []);
    uiArc(); uiDataList(); rendTab(); cerrarGestorArchivos();
}
function crearSesionAreaRapida(n) {
    saveMem();
    arcActivo = n.trim().replace(/\s+/g, '_');
    if(!archIdx.includes(arcActivo)) archIdx.push(arcActivo);
    inv = sParse('inventario_' + arcActivo, []);
    saveMem(); uiArc(); uiDataList(); rendTab(); cerrarGestorArchivos();
}
function crearNuevoArchivo() {
    let n = prompt("Nombre del nueva área:");
    if(n) crearSesionAreaRapida(n);
}
function forzarSincronizacionTotal() {
    syncGenSilent(); rendTab(); playBeep('ex'); alert("Inventario General sincronizado.");
}

// ================= EXPORTACIÓN CON AUTO-AJUSTE DE CELDAS =================
function descargarDocumento(td, tf) {
    if(inv.length === 0) return alert("Sin datos para exportar.");
    let da = tf === 'basico'
        ? inv.map(i => ({ "CÓDIGO (UPC)": getSKU(i), "NOMBRE": getNom(i), "TOTAL PZAS": parseInt(i["Total"])||0 }))
        : inv.map(i => ({ "FECHA": i["Fecha_Captura"], "ÁREA": i["Área"]||arcActivo, "CÓDIGO (UPC)": getSKU(i), "NOMBRE": getNom(i), "BULTOS": parseInt(i["Bultos"])||0, "PZ/BTO": getPz(i), "TOTAL PZAS": parseInt(i["Total"])||0, "PRECIO UNIT": getPre(i), "VALOR TOTAL ($)": getPre(i)*(parseInt(i["Total"])||0), "CADUCIDAD": i["Caducidad"]||"" }));

    let nDoc = `Inventario_${arcActivo}_${tf.toUpperCase()}_${new Date().toISOString().slice(0,10)}`;

    if(td === 'excel') {
        const ws = XLSX.utils.json_to_sheet(da);

        // AUTO-AJUSTE DE CELDAS EXCEL
        const colWidths = Object.keys(da[0]).map(key => {
            let maxLen = key.length;
            da.forEach(row => {
                let valStr = String(row[key] || '');
                if (valStr.length > maxLen) maxLen = valStr.length;
            });
            return { wch: Math.max(maxLen + 4, 12) };
        });
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        XLSX.writeFile(wb, `${nDoc}.xlsx`);
    } else if(td === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: tf === 'completo' ? 'landscape' : 'portrait' });
        doc.text(`SMART SCANNER PRO - ${arcActivo.replace(/_/g," ")}`, 14, 15);
        let h = tf === 'basico' ? [["CÓDIGO", "NOMBRE", "TOTAL PZAS"]] : [["FECHA", "ÁREA", "CÓDIGO", "NOMBRE", "BULTOS", "TOTAL", "PRECIO", "CAD"]];
        let b = tf === 'basico' ? inv.map(i => [getSKU(i), getNom(i), parseInt(i["Total"])||0]) : inv.map(i => [i["Fecha_Captura"], i["Área"]||arcActivo, getSKU(i), getNom(i), parseInt(i["Bultos"])||0, parseInt(i["Total"])||0, `$${getPre(i)}`, i["Caducidad"]||""]);
        
        doc.autoTable({ 
            head: h, 
            body: b, 
            startY: 20, 
            styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
            columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 'auto' } }
        });
        doc.save(`${nDoc}.pdf`);
    } else if(td === 'word') {
        let head = tf === 'basico' ? `<tr><th style="padding:8px;">CÓDIGO</th><th style="padding:8px;">NOMBRE</th><th style="padding:8px;">TOTAL PZAS</th></tr>` : `<tr><th style="padding:8px;">FECHA</th><th style="padding:8px;">ÁREA</th><th style="padding:8px;">CÓDIGO</th><th style="padding:8px;">NOMBRE</th><th style="padding:8px;">BULTOS</th><th style="padding:8px;">TOTAL</th><th style="padding:8px;">PRECIO</th><th style="padding:8px;">CADUCIDAD</th></tr>`;
        let row = inv.map(i => tf === 'basico' ? `<tr><td style="mso-number-format:'\\@'; padding:6px;">${getSKU(i)}</td><td style="padding:6px;">${getNom(i)}</td><td style="padding:6px;">${parseInt(i["Total"])||0}</td></tr>` : `<tr><td style="padding:6px;">${i["Fecha_Captura"]}</td><td style="padding:6px;">${i["Área"]||arcActivo}</td><td style="mso-number-format:'\\@'; padding:6px;">${getSKU(i)}</td><td style="padding:6px;">${getNom(i)}</td><td style="padding:6px;">${parseInt(i["Bultos"])||0}</td><td style="padding:6px;">${parseInt(i["Total"])||0}</td><td style="padding:6px;">$${getPre(i)}</td><td style="padding:6px;">${i["Caducidad"]||""}</td></tr>`).join("");
        let htm = `<html xmlns:w='urn:schemas-microsoft-com:office:word'><body><h3>Inventario ${arcActivo}</h3><table border="1" style="border-collapse:collapse; width:100%;">${head}${row}</table></body></html>`;
        let blb = new Blob(['\ufeff'+htm], { type: 'application/msword' });
        let lk = document.createElement('a'); lk.href = URL.createObjectURL(blb); lk.download = `${nDoc}.doc`; lk.click();
    }
    playBeep('ex');
}

// ================= IMPORTACIÓN =================
function procesarArchivoSubido(e) {
    const a = e.target.files[0];
    if(!a) return;
    const ext = a.name.split('.').pop().toLowerCase();
    const nl = a.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, '_');
    const ldr = new FileReader();

    ldr.onload = function(ev) {
        try {
            let fs = [];
            if(ext === 'json') {
                fs = JSON.parse(ev.target.result);
            } else {
                const d = new Uint8Array(ev.target.result);
                const wb = XLSX.read(d, { type: 'array' });
                const hj = wb.Sheets[wb.SheetNames[0]];
                fs = XLSX.utils.sheet_to_json(hj, { defval: "" });
            }

            let cs = new Set();
            fs.forEach(f => Object.keys(f).forEach(k => { if(!k.startsWith("__EMPTY")) cs.add(k); }));
            importacionTemporal = { nombreArchivo: nl, filas: fs, columnas: Array.from(cs) };
            document.getElementById('lblArchivoMapeo').innerText = nl;
            document.getElementById('lblFilasMapeo').innerText = fs.length;
            document.getElementById('panelAsistenteMapeo').style.display = 'block';

            let sf = function(id, pvs) {
                let s = document.getElementById(id);
                s.innerHTML = "";
                importacionTemporal.columnas.forEach(c => {
                    let o = document.createElement('option');
                    o.value = c; o.innerText = c;
                    if(pvs.some(p => c.toLowerCase().includes(p))) o.selected = true;
                    s.appendChild(o);
                });
            };
            sf('selColCodigo', ['codigo', 'sku', 'upc', 'barcode']);
            sf('selColNombre', ['nombre', 'producto', 'descrip', 'articulo']);
            sf('selColBultos', ['bulto', 'caja', 'paq']);
            sf('selColPiezas', ['pieza', 'total', 'cant']);
            sf('selColPrecio', ['precio', 'costo']);
        } catch(er) {
            alert("Error al procesar archivo: " + er);
        }
    };

    if(ext === 'json') ldr.readAsText(a);
    else ldr.readAsArrayBuffer(a);
    e.target.value = "";
}

function cerrarAsistenteMapeo() { document.getElementById('panelAsistenteMapeo').style.display = 'none'; }
function confirmarImportacionMapeada() {
    let cC = document.getElementById('selColCodigo').value;
    let cN = document.getElementById('selColNombre').value;
    let cB = document.getElementById('selColBultos').value;
    let cP = document.getElementById('selColPiezas').value;
    let cPr = document.getElementById('selColPrecio').value;

    let nw = importacionTemporal.filas.map(f => {
        let s = cleanNum(f[cC]);
        let n = String(f[cN] || "S/N").trim().toUpperCase();
        let b = cB ? (parseInt(f[cB])||0) : 0;
        let t = cP ? (parseInt(f[cP])||0) : 0;
        let p = (b > 0 && t > 0) ? Math.round(t / b) : t;
        return {
            "Fecha_Captura": getFch(),
            "Área": importacionTemporal.nombreArchivo,
            "Código": s,
            "Nombre": n,
            "Bultos": b,
            "Piezas": p || 1,
            "Total": t || (b * p),
            "Precio": cPr ? (parseFloat(f[cPr])||0) : 0,
            "_extraData": {}
        };
    }).filter(i => getSKU(i) !== "");

    if(nw.length === 0) return alert("Cero códigos válidos encontrados.");
    if(confirm("¿Abrir como nueva área independiente?")) {
        saveMem();
        arcActivo = importacionTemporal.nombreArchivo;
        if(!archIdx.includes(arcActivo)) archIdx.push(arcActivo);
        inv = nw;
    } else {
        inv = inv.concat(nw);
    }
    saveMem();
    uiArc();
    rendTab();
    cerrarAsistenteMapeo();
    alert(`Importados ${nw.length} productos con éxito.`);
}
