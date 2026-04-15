let proximaDescarga = null;
let descargasPendientesParaSubir = {};
let cuentaBloqueada = false; // <-- Control maestro de bloqueos

// --- FUNCIÓN PARA VERIFICAR EL ESTADO ---
async function verificarEstadoUsuario(url, token) {
    try {
        const response = await fetch(`${url}/api/status`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403 || data.bloqueado) {
            return false; // Está bloqueado o el token expiró
        }
        
        return true; // Está todo correcto
    } catch (error) {
        return false; // Error de red
    }
}

// --- ESCUCHA DE MENSAJES DEL PANEL ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // 0. VERIFICAR ESTADO (Opcional, si el panel quiere preguntar antes de empezar un lote)
    if (request.action === "verificarEstado") {
        verificarEstadoUsuario(request.data.url, request.data.token).then(estaActivo => {
            if (!estaActivo) {
                cuentaBloqueada = true;
            }
            sendResponse({ activo: estaActivo });
        });
        return true; // Mantiene el canal abierto para la respuesta asíncrona
    }

    // 1. PREPARAR DESCARGA
    if (request.action === "prepararDescarga") {
        // Si la cuenta fue bloqueada previamente, rechazamos la descarga al instante
        if (cuentaBloqueada) {
            sendResponse({ status: false, error: "bloqueado", bloqueado: true });
            return true;
        }

        proximaDescarga = request.data;
        sendResponse({ status: "ok" });
        return true;
    }

    // 2. HACER EL LOGIN
    if (request.action === "loginApi") {
        const { url, user, pass, deviceId, license } = request.data;

        fetch(`${url}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass, deviceId: deviceId, licenseKey: license })
        })
        .then(response => response.json())
        .then(data => {
            // Si el login es exitoso, nos aseguramos de quitar cualquier bloqueo previo
            if (data.status) {
                cuentaBloqueada = false;
            }
            sendResponse({ status: true, data: data });
        })
        .catch(error => sendResponse({ status: false, error: error.message }));

        return true; 
    }
});

// --- INTERCEPTOR DE NOMBRE DE ARCHIVOS (DESCARGAS) ---
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    if (proximaDescarga) {
        let rutaFinal = '';
        if (proximaDescarga.esTxt) {
            rutaFinal = `sridescargas/${proximaDescarga.ruc}/${proximaDescarga.anio_mes}/${proximaDescarga.nombreArchivo}`;
        } else {
            const ext = proximaDescarga.tipo === 'xml' ? 'xml' : 'pdf';
            rutaFinal = `sridescargas/${proximaDescarga.ruc}/${proximaDescarga.anio_mes}/${proximaDescarga.clave}.${ext}`;
        }
        
        descargasPendientesParaSubir[item.id] = { ...proximaDescarga, filename: rutaFinal };
        suggest({ filename: rutaFinal, conflictAction: 'overwrite' });
        proximaDescarga = null;
    } else {
        suggest(); 
    }
    return true; 
});

// --- DETECTOR DE DESCARGA COMPLETADA Y SUBIDA A LA API ---
chrome.downloads.onChanged.addListener(async (delta) => {
    if (delta.state && delta.state.current === 'complete') {
        const metadata = descargasPendientesParaSubir[delta.id];
        
        if (!metadata || !metadata.apiUrl) {
            delete descargasPendientesParaSubir[delta.id];
            return;
        }

        try {
            // Buscamos el archivo recién descargado
            const downloadItems = await new Promise(resolve => chrome.downloads.search({ id: delta.id }, resolve));
            if (!downloadItems || downloadItems.length === 0) return;
            
            const filePath = downloadItems[0].filename;
            // Corrección CRÍTICA para rutas de Windows: file:///C:/Users/...
            const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');

            const response = await fetch(fileUrl);
            const blob = await response.blob();

            const formData = new FormData();
            formData.append('ruc', metadata.ruc);
            formData.append('anio_mes', metadata.anio_mes);
            
            // Añadimos el tipo de comprobante que pide el backend
            if(metadata.tipoComprobante) {
                formData.append('tipoComprobante', metadata.tipoComprobante);
            }
            
            const baseFileName = metadata.esTxt ? metadata.nombreArchivo : `${metadata.clave}.${metadata.tipo}`;
            formData.append('archivos[]', blob, baseFileName);

            const apiResponse = await fetch(`${metadata.apiUrl}/api/guardar-archivos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${metadata.apiToken}`
                },
                body: formData
            });

            // DETECCIÓN DE BLOQUEO EN EL UPLOAD
            if (apiResponse.status === 401 || apiResponse.status === 403) {
                cuentaBloqueada = true;
                throw new Error("Acceso denegado: Token inválido o cuenta bloqueada.");
            }

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json().catch(() => ({}));
                if (errorData.bloqueado || (errorData.error && errorData.error.toLowerCase().includes('token'))) {
                    cuentaBloqueada = true;
                }
                throw new Error(`API respondió con ${apiResponse.status}`);
            }

            console.log(`✅ Archivo ${baseFileName} subido a la nube.`);

        } catch (error) {
            console.error("❌ Error enviando a la API:", error);
        } finally {
            delete descargasPendientesParaSubir[delta.id];
        }
    }
});