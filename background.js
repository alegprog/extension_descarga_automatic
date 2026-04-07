let proximaDescarga = null;
let descargasPendientesParaSubir = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "prepararDescarga") {
        proximaDescarga = request.data;
        sendResponse({ status: "ok" });
    }
    return true;
});

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
            
            // Ojo: Añadimos el tipo de comprobante que pide el backend
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

            if (!apiResponse.ok) throw new Error(`API respondió con ${apiResponse.status}`);
            console.log(`✅ Archivo ${baseFileName} subido a la nube.`);

        } catch (error) {
            console.error("❌ Error enviando a la API:", error);
        } finally {
            delete descargasPendientesParaSubir[delta.id];
        }
    }
});