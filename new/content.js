// --- FUNCIONES DE INTERFAZ ---
const SELECTOR_PAGINADOR_SELECT = '.ui-paginator-rpp-options';

function inyectarPanel() {
    if (document.getElementById('sri-automation-panel')) return;

    const style = document.createElement('style');
    style.textContent = `
        #sri-automation-panel {
            position: fixed; bottom: 25px; left: 25px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(226, 232, 240, 0.8);
            padding: 20px; border-radius: 16px;
            z-index: 999999;
            box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2);
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            width: 260px; color: #334155; transition: all 0.3s ease;
        }
        #sri-automation-panel h3 {
            margin: 0 0 16px 0; font-size: 16px; color: #0f172a; 
            text-align: center; font-weight: 800; letter-spacing: -0.5px;
            display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .sri-btn {
            width: 100%; padding: 10px 14px; margin-bottom: 10px;
            border: none; border-radius: 8px; cursor: pointer;
            font-weight: 600; font-size: 13px; letter-spacing: 0.3px;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .sri-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); filter: brightness(1.05); }
        .sri-btn:active { transform: translateY(0); box-shadow: none; }
        .sri-btn-primary { background: linear-gradient(135deg, #0ea5e9, #0284c7); margin-bottom: 0; }
        .sri-btn-xml { background: linear-gradient(135deg, #10b981, #059669); }
        .sri-btn-pdf { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .sri-btn-ambos { background: linear-gradient(135deg, #8b5cf6, #6d28d9); margin-bottom: 0; }
        .sri-btn-config { background: #334155; margin-top: 10px; }
        .sri-btn-logout { background: #ef4444; padding: 8px; margin-top: 10px; }
        .sri-divider { height: 1px; background: #e2e8f0; margin: 16px 0; border: none; }
        #sri-estado {
            margin-top: 16px; font-size: 12px; color: #475569; 
            text-align: center; font-weight: 600; background: #f8fafc; 
            padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; 
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); word-break: break-all;
        }
        .sri-icon { font-size: 16px; }
        .sri-config-box { display: none; margin-top: 10px; background: #f1f5f9; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;}
        .sri-input { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 10px; font-size: 12px; outline:none;}
        .sri-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 2px rgba(14,165,233,0.2); }
        .logged-in-text { text-align: center; font-size: 13px; font-weight: bold; color: #059669; margin-bottom: 10px; }
        .license-alert { font-size: 10px; color: #b45309; background: #fef3c7; padding: 6px; border-radius: 4px; margin-bottom: 8px; font-weight: bold; text-align: center; border-left: 3px solid #f59e0b; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'sri-automation-panel';

    panel.innerHTML = `
        <h3><span class="sri-icon">⚡</span> SRI Toolkit</h3>
        <button id="btnPaginacion" class="sri-btn sri-btn-primary"><span class="sri-icon">📑</span> 1. Ver 6000 Registros</button>
        <hr class="sri-divider">
        <button id="btnBajarXML" class="sri-btn sri-btn-xml"><span class="sri-icon">📄</span> Descargar XML</button>
        <button id="btnBajarPDF" class="sri-btn sri-btn-pdf"><span class="sri-icon">📕</span> Descargar PDF</button>
        <button id="btnBajarAmbos" class="sri-btn sri-btn-ambos"><span class="sri-icon">📦</span> Bajar AMBOS y Subir</button>
        <button id="btnConfig" class="sri-btn sri-btn-config"><span class="sri-icon">☁️</span> Conexión API</button>
        
        <div id="sriConfigBox" class="sri-config-box">
            
            <div id="sriLoginView">
                <input type="text" id="sriApiUrl" class="sri-input" placeholder="URL API (ej: http://localhost:3057)">
                <input type="text" id="sriApiUser" class="sri-input" placeholder="Usuario">
                <input type="password" id="sriApiPass" class="sri-input" placeholder="Contraseña">
                
                <div id="sriLicenseBox" style="display: none;">
                    <div class="license-alert">Equipo no registrado. Ingresa tu licencia.</div>
                    <input type="text" id="sriApiLicense" class="sri-input" placeholder="Clave de Licencia (Ej: 123E-45...)" style="border-color: #f59e0b; font-family: monospace; text-transform: uppercase;">
                </div>

                <button id="btnApiLogin" class="sri-btn sri-btn-primary" style="padding: 8px;">Conectar al Servidor</button>
            </div>

            <div id="sriConnectedView" style="display: none;">
                <div class="logged-in-text"><i class="fas fa-check-circle"></i> Conectado a la Nube</div>
                <button id="btnApiLogout" class="sri-btn sri-btn-logout">Cerrar Sesión</button>
            </div>

        </div>

        <div id="sri-estado">Esperando orden...</div>
    `;
    document.body.appendChild(panel);

    let localDeviceId = '';

    chrome.storage.local.get(['apiUrl', 'apiToken', 'deviceId'], function(result) {
        if(result.apiUrl) {
            document.getElementById('sriApiUrl').value = result.apiUrl;
        }
        if(result.apiToken) {
            document.getElementById('sriLoginView').style.display = 'none';
            document.getElementById('sriConnectedView').style.display = 'block';
        }
        if(result.deviceId) {
            localDeviceId = result.deviceId;
        } else {
            localDeviceId = 'EXT-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            chrome.storage.local.set({ deviceId: localDeviceId });
        }
    });

    document.getElementById('btnConfig').addEventListener('click', () => {
        const box = document.getElementById('sriConfigBox');
        box.style.display = box.style.display === 'block' ? 'none' : 'block';
    });

    // --- AQUÍ ESTÁ LA MAGIA: LE ENVIAMOS LA TAREA AL BACKGROUND EN LUGAR DE USAR FETCH ---
    document.getElementById('btnApiLogin').addEventListener('click', () => {
        let url = document.getElementById('sriApiUrl').value.trim();
        if(url.endsWith('/')) url = url.slice(0, -1);
        
        const user = document.getElementById('sriApiUser').value.trim();
        const pass = document.getElementById('sriApiPass').value.trim();
        const license = document.getElementById('sriApiLicense').value.trim();

        if(!url || !user || !pass) {
            mostrarEstado("⚠️ Ingresa URL, Usuario y Contraseña");
            return;
        }

        mostrarEstado("🔄 Conectando al servidor...");
        const btnLogin = document.getElementById('btnApiLogin');
        btnLogin.disabled = true;
        btnLogin.innerText = "Verificando...";

        // Enviamos el mensaje al background.js
        chrome.runtime.sendMessage({
            action: 'loginApi',
            data: { url, user, pass, deviceId: localDeviceId, license }
        }, (response) => {
            
            if (!response || response.status === false) {
                console.error("Error del background:", response ? response.error : "Sin respuesta");
                mostrarEstado("❌ Error de red. Revisa la IP.");
                btnLogin.disabled = false;
                btnLogin.innerText = "Conectar al Servidor";
                return;
            }

            const data = response.data;

            if (data.status) {
                chrome.storage.local.set({ apiUrl: url, apiToken: data.token }, () => {
                    mostrarEstado(`✅ Sesión iniciada como ${data.username}`);
                    document.getElementById('sriLoginView').style.display = 'none';
                    document.getElementById('sriConnectedView').style.display = 'block';
                    document.getElementById('sriLicenseBox').style.display = 'none';
                    
                    setTimeout(() => {
                        document.getElementById('sriConfigBox').style.display = 'none';
                    }, 1000);
                });
            } else if (data.require_license) {
                document.getElementById('sriLicenseBox').style.display = 'block';
                btnLogin.innerText = "Asociar Extensión y Entrar";
                mostrarEstado(`⚠️ ${data.error}`);
                btnLogin.disabled = false;
            } else {
                mostrarEstado(`❌ Error: ${data.error}`);
                btnLogin.disabled = false;
                if(document.getElementById('sriLicenseBox').style.display === 'none') {
                    btnLogin.innerText = "Conectar al Servidor";
                }
            }
        });
    });

    document.getElementById('btnApiLogout').addEventListener('click', () => {
        chrome.storage.local.remove(['apiToken'], () => {
            document.getElementById('sriApiPass').value = ''; 
            document.getElementById('sriApiLicense').value = ''; 
            document.getElementById('sriLicenseBox').style.display = 'none';
            document.getElementById('sriLoginView').style.display = 'block';
            document.getElementById('sriConnectedView').style.display = 'none';
            mostrarEstado("ℹ️ Sesión cerrada en la nube");
            document.getElementById('btnApiLogin').innerText = "Conectar al Servidor";
        });
    });

    document.getElementById('btnPaginacion').addEventListener('click', forzarPaginacion);
    document.getElementById('btnBajarXML').addEventListener('click', () => procesarDescargas('xml'));
    document.getElementById('btnBajarPDF').addEventListener('click', () => procesarDescargas('pdf'));
    document.getElementById('btnBajarAmbos').addEventListener('click', () => procesarDescargas('ambos'));
}

function forzarPaginacion() {
    const selectElem = document.querySelector(SELECTOR_PAGINADOR_SELECT);
    if (!selectElem) { mostrarEstado("⚠️ No se encontró el paginador."); return; }
    if ([...selectElem.options].some(opt => opt.value === '6000')) { selectElem.value = '6000'; } 
    else { const option = document.createElement("option"); option.text = "6000"; option.value = "6000"; selectElem.add(option); selectElem.value = "6000"; }
    const event = new Event("change", { bubbles: true });
    selectElem.dispatchEvent(event);
    mostrarEstado("Paginación a 6000 inyectada. Espera a la tabla.");
}

const delay = ms => new Promise(res => setTimeout(res, ms));
function mostrarEstado(mensaje) { const estadoDiv = document.getElementById('sri-estado'); if (estadoDiv) estadoDiv.innerText = mensaje; }

function extraerDataFila(filaHtml) {
    const clave = filaHtml.cells[3].innerText.trim();
    const rawFecha = filaHtml.cells[5].innerText.trim();
    const partesFecha = rawFecha.split('/');
    const anio_mes = partesFecha.length === 3 ? `${partesFecha[2]}_${partesFecha[1]}` : 'SinFecha';
    return { anio_mes, clave };
}

async function notificarBackground(datos, tipo, url, token) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            action: "prepararDescarga",
            data: { ...datos, tipo: tipo, apiUrl: url, apiToken: token }
        }, resolve);
    });
}

const audioSilencio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
audioSilencio.loop = true;

async function procesarDescargas(tipo) {
    const filas = document.querySelectorAll('#frmPrincipal\\:tablaCompRecibidos_data tr');
    const totalFilas = filas.length;

    if (totalFilas === 0 || (filas[0] && filas[0].querySelector('td') && filas[0].querySelector('td').innerText === "No records found.")) {
        mostrarEstado("⚠️ No hay comprobantes en pantalla."); return;
    }

    const storageData = await new Promise((resolve) => {
        chrome.storage.local.get(['apiUrl', 'apiToken'], function(result) {
            resolve(result || {});
        });
    });
    
    const apiUrl = storageData.apiUrl || '';
    const apiToken = storageData.apiToken || '';

    if (!apiToken) {
        mostrarEstado("⚠️ Inicia sesión en '☁️ Conexión API' primero."); 
        document.getElementById('sriConfigBox').style.display = 'block';
        return;
    }

    const inputRuc = document.getElementById('frmPrincipal:txtParametro');
    const rucUsuario = inputRuc ? inputRuc.value.trim() : 'Sin_RUC';
    const cmbAnio = document.getElementById('frmPrincipal:ano');
    const anio = cmbAnio ? cmbAnio.value : new Date().getFullYear().toString();
    const cmbMes = document.getElementById('frmPrincipal:mes');
    const mes = cmbMes ? cmbMes.value.padStart(2, '0') : '00'; 
    const anio_mes_carpeta = `${anio}_${mes}`;
    const cmbTipo = document.getElementById('frmPrincipal:cmbTipoComprobante');
    const tipoComprobante = cmbTipo ? cmbTipo.value : '0';

    let nameFull = '';
    switch (String(tipoComprobante)) {
        case "1": nameFull = 'FACTURA'; break;
        case "2": nameFull = 'LIQUIDACION_COMPRA'; break;
        case "3": nameFull = 'NOTAS_DE_CREDITO'; break;
        case "4": nameFull = 'NOTAS_DE_DEBITO'; break;
        case "6": nameFull = 'RETENCION'; break;
        case "7": nameFull = 'GUIA_REMISION'; break;
        default: nameFull = 'DOCUMENTO';
    }

    const txtFileName = `Reporte_${rucUsuario}_${nameFull}_${anio}_${mes}.txt`;
    const tiempoEsperaMs = 1000; 

    try { await audioSilencio.play(); } catch (e) {}

    const btnTxt = document.getElementById('frmPrincipal:lnkTxtlistado');
    if (btnTxt) {
        mostrarEstado("📥 Bajando reporte TXT...");
        await notificarBackground({
            ruc: rucUsuario, anio_mes: anio_mes_carpeta, nombreArchivo: txtFileName, esTxt: true, tipoComprobante: tipoComprobante
        }, 'txt', apiUrl, apiToken);
        
        await delay(200);
        btnTxt.click();
        await delay(4000); 
    }

    for (let i = 0; i < totalFilas; i++) {
        const filaActual = filas[i];
        const datosExtraidos = extraerDataFila(filaActual);
        datosExtraidos.ruc = rucUsuario; 
        datosExtraidos.tipoComprobante = tipoComprobante;
        
        const btnXml = filaActual.querySelector('a[id$=":lnkXml"]');
        const btnPdf = filaActual.querySelector('a[id$=":lnkPdf"]');

        if (tipo === 'xml' || tipo === 'ambos') {
            if (btnXml) {
                mostrarEstado(`Descargando XML ${i + 1}/${totalFilas}...`);
                await notificarBackground(datosExtraidos, 'xml', apiUrl, apiToken);
                await delay(150); btnXml.click(); await delay(tiempoEsperaMs);
            }
        }

        if (tipo === 'pdf' || tipo === 'ambos') {
            if (btnPdf) {
                mostrarEstado(`Descargando PDF ${i + 1}/${totalFilas}...`);
                await notificarBackground(datosExtraidos, 'pdf', apiUrl, apiToken);
                await delay(150); btnPdf.click(); await delay(tiempoEsperaMs);
            }
        }
    }

    audioSilencio.pause();
    mostrarEstado("✅ ¡Proceso finalizado y subido!");
}

const observer = new MutationObserver(() => { inyectarPanel(); });
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('load', inyectarPanel);