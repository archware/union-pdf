// Prevents the console window from appearing on Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[path = "../../contracts/generated/rust/contracts.rs"]
mod contracts;

use contracts::{
    EstadoSistemaDto, MetadatosArchivoPdfDto, PeticionUnirPdfsDto, RespuestaSistemaV1,
    ResultadoUnirPdfsDto,
};
use lopdf::{Dictionary, Document, Object, ObjectId};
use std::collections::BTreeMap;
use std::path::Path;
use std::time::Instant;
use uuid::Uuid;

/// Contrato D regla 4: un comando sin implementacion real no devuelve exito falso.
fn no_implementado<T>(etapa: &str, id_solicitud: String, inicio: Instant) -> RespuestaSistemaV1<T> {
    RespuestaSistemaV1::fallo(
        contracts::ErrorSistemaV1 {
            codigo: "NO_IMPLEMENTADO".to_string(),
            categoria: "sistema".to_string(),
            reintentable: false,
            clave_mensaje: "La operacion aun no esta implementada en el backend nativo".to_string(),
            parametros_mensaje: serde_json::json!({}),
            etapa: etapa.to_string(),
        },
        id_solicitud,
        inicio.elapsed().as_millis() as u64,
    )
}
/// Normaliza el buffer binario `DetailsContainer` de `IFileOpenDialog` en Windows
/// (`HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Modules\GlobalSettings\DetailsContainer`)
/// desactivando el bit `0x02` (Panel de Vista Previa / Preview Pane) que bloquea `WM_LBUTTONDOWN`
/// al inicializar `PdfPreviewHandler.dll` e inicia un arrastre OLE (`DoDragDrop`) involuntario
/// al hacer un solo clic sobre un archivo PDF. Devuelve `Some(bytes_actualizados)` solo si el
/// bit `0x02` estaba activo; de lo contrario devuelve `None`.
fn normalizar_bytes_details_container(bytes: &[u8]) -> Option<Vec<u8>> {
    if bytes.len() < 8 {
        return None;
    }
    let flags = bytes[4];
    if (flags & 0x02) == 0 {
        return None;
    }
    let mut actualizado = bytes.to_vec();
    let sin_preview = flags & !0x02;
    actualizado[4] = if sin_preview == 0 { 0x01 } else { sin_preview };
    Some(actualizado)
}

#[cfg(all(target_os = "windows", not(test)))]
fn desactivar_panel_vista_previa_dialogo_windows() {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    type Hkey = isize;
    const HKEY_CURRENT_USER: Hkey = -2147483647i32 as isize; // 0x80000001
    const KEY_QUERY_VALUE: u32 = 0x0001;
    const KEY_SET_VALUE: u32 = 0x0002;
    const REG_BINARY: u32 = 3;

    #[link(name = "advapi32")]
    extern "system" {
        fn RegOpenKeyExW(
            hkey: Hkey,
            lpsubkey: *const u16,
            uloptions: u32,
            samdesired: u32,
            phkresult: *mut Hkey,
        ) -> i32;
        fn RegQueryValueExW(
            hkey: Hkey,
            lpvaluename: *const u16,
            lpreserved: *const u32,
            lptype: *mut u32,
            lpdata: *mut u8,
            lpcbdata: *mut u32,
        ) -> i32;
        fn RegSetValueExW(
            hkey: Hkey,
            lpvaluename: *const u16,
            reserved: u32,
            dwtype: u32,
            lpdata: *const u8,
            cbdata: u32,
        ) -> i32;
        fn RegCloseKey(hkey: Hkey) -> i32;
    }

    fn a_utf16_nulo(texto: &str) -> Vec<u16> {
        OsStr::new(texto)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    }

    fn normalizar_valor_binario(
        subclave_ruta: &str,
        nombres_valores: &[&str],
        transformador: fn(&[u8]) -> Option<Vec<u8>>,
    ) {
        let subclave = a_utf16_nulo(subclave_ruta);
        unsafe {
            let mut hkey: Hkey = 0;
            if RegOpenKeyExW(
                HKEY_CURRENT_USER,
                subclave.as_ptr(),
                0,
                KEY_QUERY_VALUE | KEY_SET_VALUE,
                &mut hkey,
            ) != 0
            {
                return;
            }

            for nombre in nombres_valores {
                let nombre_valor = a_utf16_nulo(nombre);
                let mut tipo_reg: u32 = 0;
                let mut buffer = [0u8; 64];
                let mut tamano: u32 = buffer.len() as u32;
                let estado_lectura = RegQueryValueExW(
                    hkey,
                    nombre_valor.as_ptr(),
                    std::ptr::null(),
                    &mut tipo_reg,
                    buffer.as_mut_ptr(),
                    &mut tamano,
                );

                if estado_lectura == 0 && tipo_reg == REG_BINARY {
                    let actual = &buffer[..(tamano as usize).min(buffer.len())];
                    if let Some(actualizado) = transformador(actual) {
                        let _ = RegSetValueExW(
                            hkey,
                            nombre_valor.as_ptr(),
                            0,
                            REG_BINARY,
                            actualizado.as_ptr(),
                            actualizado.len() as u32,
                        );
                    }
                }
            }

            let _ = RegCloseKey(hkey);
        }
    }

    const SUBCLAVES_DETAILS_CONTAINER: &[&str] = &[
        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Modules\\GlobalSettings\\DetailsContainer",
        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CIDOpen\\Modules\\GlobalSettings\\DetailsContainer",
        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CIDSave\\Modules\\GlobalSettings\\DetailsContainer",
    ];
    for subclave in SUBCLAVES_DETAILS_CONTAINER {
        normalizar_valor_binario(subclave, &["DetailsContainer"], normalizar_bytes_details_container);
    }

    const SUBCLAVES_SIZER: &[&str] = &[
        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CIDOpen\\Modules\\GlobalSettings\\Sizer",
        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CIDSave\\Modules\\GlobalSettings\\Sizer",
        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Modules\\GlobalSettings\\Sizer",
    ];
    const VALORES_SIZER: &[&str] = &["ReadingPaneSizer", "PreviewPaneSizer", "DetailsContainerSizer"];
    for subclave in SUBCLAVES_SIZER {
        normalizar_valor_binario(
            subclave,
            VALORES_SIZER,
            normalizar_bytes_sizer_panel_vista_previa,
        );
    }

    configurar_umbral_arrastre_clic_firme_windows();
}

/// Normaliza el buffer binario de 16 bytes `CSizerElement` (`ReadingPaneSizer`, `PreviewPaneSizer`
/// y `DetailsContainerSizer`) en `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\CIDOpen\Modules\GlobalSettings\Sizer`
/// (y `CIDSave` / `Explorer\Modules`). El segundo `DWORD` (`bytes[4..8]`) almacena `fVisible` (`BOOL`);
/// cuando vale `1` (`[1, 0, 0, 0]`), `IFileOpenDialog` abre el Panel de Vista Previa (`ReadingPane`)
/// de ~494 px a la derecha del dialogo `Abrir` y bloquea `WM_LBUTTONDOWN` al seleccionar un PDF.
/// Devuelve `Some(bytes_actualizados)` con `bytes[4..8] = [0, 0, 0, 0]` si estaba visible, o `None`
/// si ya estaba oculto.
fn normalizar_bytes_sizer_panel_vista_previa(bytes: &[u8]) -> Option<Vec<u8>> {
    if bytes.len() < 8 {
        return None;
    }
    if bytes[4..8] == [0, 0, 0, 0] {
        return None;
    }
    let mut actualizado = bytes.to_vec();
    actualizado[4..8].copy_from_slice(&[0, 0, 0, 0]);
    Some(actualizado)
}

fn calcular_umbral_arrastre_inicial(
    cx_actual: i32,
    cy_actual: i32,
    umbral_firme: u32,
) -> (u32, u32) {
    let cx = cx_actual.max(4) as u32;
    let cy = cy_actual.max(4) as u32;
    let cx_base = if cx >= umbral_firme { 4 } else { cx };
    let cy_base = if cy >= umbral_firme { 4 } else { cy };
    (cx_base, cy_base)
}

#[cfg(all(target_os = "windows", not(test)))]
static UMBRAL_ARRASTRE_INICIAL: std::sync::OnceLock<(u32, u32)> = std::sync::OnceLock::new();

#[cfg(all(target_os = "windows", not(test)))]
fn configurar_umbral_arrastre_clic_firme_windows() {
    const SM_CXDRAG: i32 = 68;
    const SM_CYDRAG: i32 = 69;
    const SPI_SETDRAGWIDTH: u32 = 0x004C;
    const SPI_SETDRAGHEIGHT: u32 = 0x004D;
    const UMBRAL_CLIC_FIRME_PX: u32 = 48;

    #[link(name = "user32")]
    extern "system" {
        fn GetSystemMetrics(nindex: i32) -> i32;
        fn SystemParametersInfoW(
            uiaction: u32,
            uiparam: u32,
            pvparam: *mut std::ffi::c_void,
            fwinini: u32,
        ) -> i32;
    }

    unsafe {
        let cx_metric = GetSystemMetrics(SM_CXDRAG);
        let cy_metric = GetSystemMetrics(SM_CYDRAG);
        let base = calcular_umbral_arrastre_inicial(cx_metric, cy_metric, UMBRAL_CLIC_FIRME_PX);
        let _ = UMBRAL_ARRASTRE_INICIAL.set(base);

        let cx_actual = cx_metric.max(4) as u32;
        let cy_actual = cy_metric.max(4) as u32;
        if cx_actual < UMBRAL_CLIC_FIRME_PX {
            let _ = SystemParametersInfoW(
                SPI_SETDRAGWIDTH,
                UMBRAL_CLIC_FIRME_PX,
                std::ptr::null_mut(),
                0,
            );
        }
        if cy_actual < UMBRAL_CLIC_FIRME_PX {
            let _ = SystemParametersInfoW(
                SPI_SETDRAGHEIGHT,
                UMBRAL_CLIC_FIRME_PX,
                std::ptr::null_mut(),
                0,
            );
        }
    }
}

#[cfg(all(target_os = "windows", not(test)))]
fn restaurar_umbral_arrastre_windows() {
    const SPI_SETDRAGWIDTH: u32 = 0x004C;
    const SPI_SETDRAGHEIGHT: u32 = 0x004D;

    #[link(name = "user32")]
    extern "system" {
        fn SystemParametersInfoW(
            uiaction: u32,
            uiparam: u32,
            pvparam: *mut std::ffi::c_void,
            fwinini: u32,
        ) -> i32;
    }

    if let Some(&(cx_inicial, cy_inicial)) = UMBRAL_ARRASTRE_INICIAL.get() {
        unsafe {
            let _ = SystemParametersInfoW(SPI_SETDRAGWIDTH, cx_inicial, std::ptr::null_mut(), 0);
            let _ = SystemParametersInfoW(SPI_SETDRAGHEIGHT, cy_inicial, std::ptr::null_mut(), 0);
        }
    }
}

#[cfg(not(all(target_os = "windows", not(test))))]
fn restaurar_umbral_arrastre_windows() {}

#[cfg(not(all(target_os = "windows", not(test))))]
fn desactivar_panel_vista_previa_dialogo_windows() {
    let _ = normalizar_bytes_details_container(&[]);
    let _ = normalizar_bytes_sizer_panel_vista_previa(&[]);
    let _ = calcular_umbral_arrastre_inicial(4, 4, 48);
    restaurar_umbral_arrastre_windows();
}

#[tauri::command]
fn obtener_estado_sistema() -> RespuestaSistemaV1<EstadoSistemaDto> {
    let inicio = Instant::now();
    let id_solicitud = Uuid::new_v4().to_string();
    desactivar_panel_vista_previa_dialogo_windows();
    let estado = EstadoSistemaDto {
        nombre_aplicacion: "union-pdf".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        entorno: if cfg!(debug_assertions) {
            "desarrollo".to_string()
        } else {
            "produccion".to_string()
        },
        plataforma: std::env::consts::OS.to_string(),
        runtime: "tauri-v1.5".to_string(),
    };
    RespuestaSistemaV1::exito(estado, id_solicitud, inicio.elapsed().as_millis() as u64)
}

#[tauri::command]
fn inspeccionar_archivo_pdf(ruta_archivo: String) -> RespuestaSistemaV1<MetadatosArchivoPdfDto> {
    let inicio = Instant::now();
    let id_solicitud = Uuid::new_v4().to_string();
    let path = Path::new(&ruta_archivo);

    if !path.exists() {
        return RespuestaSistemaV1::fallo(
            contracts::ErrorSistemaV1 {
                codigo: "ARCHIVO_NO_ENCONTRADO".to_string(),
                categoria: "archivo".to_string(),
                reintentable: false,
                clave_mensaje: "El archivo especificado no existe en el sistema".to_string(),
                parametros_mensaje: serde_json::json!({ "ruta": ruta_archivo }),
                etapa: "inspeccionar_archivo_pdf".to_string(),
            },
            id_solicitud,
            inicio.elapsed().as_millis() as u64,
        );
    }

    if !path.is_file() {
        return RespuestaSistemaV1::fallo(
            contracts::ErrorSistemaV1 {
                codigo: "NO_ES_UN_ARCHIVO".to_string(),
                categoria: "archivo".to_string(),
                reintentable: false,
                clave_mensaje: "La ruta especificada no corresponde a un archivo regular".to_string(),
                parametros_mensaje: serde_json::json!({ "ruta": ruta_archivo }),
                etapa: "inspeccionar_archivo_pdf".to_string(),
            },
            id_solicitud,
            inicio.elapsed().as_millis() as u64,
        );
    }

    let metadata = match std::fs::metadata(path) {
        Ok(m) => m,
        Err(e) => {
            return RespuestaSistemaV1::fallo(
                contracts::ErrorSistemaV1 {
                    codigo: "ERROR_ACCESO_ARCHIVO".to_string(),
                    categoria: "archivo".to_string(),
                    reintentable: true,
                    clave_mensaje: e.to_string(),
                    parametros_mensaje: serde_json::json!({ "ruta": ruta_archivo }),
                    etapa: "inspeccionar_archivo_pdf".to_string(),
                },
                id_solicitud,
                inicio.elapsed().as_millis() as u64,
            );
        }
    };

    let mut header = [0u8; 4];
    let es_pdf = match std::fs::File::open(path) {
        Ok(mut f) => {
            use std::io::Read;
            f.read_exact(&mut header).is_ok() && &header == b"%PDF"
        }
        Err(e) => {
            return RespuestaSistemaV1::fallo(
                contracts::ErrorSistemaV1 {
                    codigo: "ERROR_ACCESO_ARCHIVO".to_string(),
                    categoria: "archivo".to_string(),
                    reintentable: true,
                    clave_mensaje: e.to_string(),
                    parametros_mensaje: serde_json::json!({ "ruta": ruta_archivo }),
                    etapa: "inspeccionar_archivo_pdf".to_string(),
                },
                id_solicitud,
                inicio.elapsed().as_millis() as u64,
            );
        }
    };

    if !es_pdf {
        return RespuestaSistemaV1::fallo(
            contracts::ErrorSistemaV1 {
                codigo: "FORMATO_PDF_INVALIDO".to_string(),
                categoria: "archivo".to_string(),
                reintentable: false,
                clave_mensaje: "El archivo no contiene una cabecera PDF valida".to_string(),
                parametros_mensaje: serde_json::json!({ "ruta": ruta_archivo }),
                etapa: "inspeccionar_archivo_pdf".to_string(),
            },
            id_solicitud,
            inicio.elapsed().as_millis() as u64,
        );
    }

    let nombre = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "desconocido.pdf".to_string());

    let _ = (metadata, nombre);
    no_implementado("inspeccionar_archivo_pdf", id_solicitud, inicio)
}

fn ejecutar_fusion_lopdf(peticion: &PeticionUnirPdfsDto) -> Result<ResultadoUnirPdfsDto, String> {
    let mut result_doc = Document::with_version("1.5");
    let pages_id = result_doc.new_object_id();
    let mut max_id: u32 = pages_id.0 + 1;

    let mut documents_objects: BTreeMap<ObjectId, Object> = BTreeMap::new();
    let mut combined_page_ids: Vec<ObjectId> = Vec::new();
    let mut page_objects: BTreeMap<ObjectId, Object> = BTreeMap::new();

    for seg in &peticion.segmentos {
        let mut doc = Document::load(&seg.ruta_archivo)
            .map_err(|e| format!("Error al cargar {}: {}", seg.ruta_archivo, e))?;

        // Renombrar IDs de objetos para evitar colisiones
        doc.renumber_objects_with(max_id);
        max_id = doc.max_id + 1;

        let doc_pages = doc.get_pages(); // BTreeMap<u32, ObjectId>, 1-indexed

        // Determinar que paginas incluir
        let pages_to_include: Vec<(usize, u32, ObjectId)> = if seg.paginas_incluidas.is_empty() {
            doc_pages.into_iter().enumerate().map(|(idx, (pnum, pid))| (idx, pnum, pid)).collect()
        } else {
            let mut selected = Vec::new();
            for (idx, &pnum) in seg.paginas_incluidas.iter().enumerate() {
                if let Some(&pid) = doc_pages.get(&pnum) {
                    selected.push((idx, pnum, pid));
                } else {
                    return Err(format!("La pagina {} no existe en {}", pnum, seg.ruta_archivo));
                }
            }
            selected
        };

        for (idx, _pnum, page_id) in pages_to_include {
            let mut page_obj = doc
                .get_object(page_id)
                .map_err(|e| format!("Error al obtener objeto de pagina {:?}: {}", page_id, e))?
                .to_owned();

            // Aplicar rotacion si fue especificada
            if let Some(ref rots) = seg.rotaciones {
                if let Some(&rot_val) = rots.get(idx) {
                    if rot_val != 0 {
                        if let Object::Dictionary(ref mut dict) = page_obj {
                            let existing_rot = dict
                                .get(b"Rotate")
                                .ok()
                                .and_then(|o| o.as_i64().ok())
                                .unwrap_or(0);
                            let new_rot = (existing_rot + rot_val as i64).rem_euclid(360);
                            dict.set("Rotate", Object::Integer(new_rot));
                        }
                    }
                }
            }

            page_objects.insert(page_id, page_obj);
            combined_page_ids.push(page_id);
        }

        // Agregar el resto de los objetos del documento
        documents_objects.extend(doc.objects);
    }

    if combined_page_ids.is_empty() {
        return Err("No se incluyeron paginas para la fusion".to_string());
    }

    // Actualizar el Parent de cada pagina para que apunte al nuevo objeto Pages
    for (page_id, mut page_obj) in page_objects {
        if let Object::Dictionary(ref mut dict) = page_obj {
            dict.set("Parent", Object::Reference(pages_id));
        }
        documents_objects.insert(page_id, page_obj);
    }

    // Construir el diccionario de Pages raiz
    let mut pages_dict = Dictionary::new();
    pages_dict.set("Type", Object::Name(b"Pages".to_vec()));
    pages_dict.set(
        "Kids",
        Object::Array(combined_page_ids.iter().map(|&id| Object::Reference(id)).collect()),
    );
    pages_dict.set("Count", Object::Integer(combined_page_ids.len() as i64));

    result_doc.objects.extend(documents_objects);
    result_doc.objects.insert(pages_id, Object::Dictionary(pages_dict));

    // Agregar Catalog con ID libre garantizado (sin colisionar con ningun objeto)
    let catalog_id = (max_id, 0);
    max_id += 1;
    let mut catalog_dict = Dictionary::new();
    catalog_dict.set("Type", Object::Name(b"Catalog".to_vec()));
    catalog_dict.set("Pages", Object::Reference(pages_id));
    result_doc.objects.insert(catalog_id, Object::Dictionary(catalog_dict));
    result_doc.trailer.set("Root", Object::Reference(catalog_id));
    result_doc.max_id = max_id;

    // Asegurar directorio destino
    if let Some(parent) = Path::new(&peticion.ruta_destino).parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Error al crear directorio destino {:?}: {}", parent, e))?;
        }
    }

    // Guardar documento
    result_doc
        .save(&peticion.ruta_destino)
        .map_err(|e| format!("Error al guardar PDF en {}: {}", peticion.ruta_destino, e))?;

    let meta = std::fs::metadata(&peticion.ruta_destino)
        .map_err(|e| format!("Error al leer metadatos del archivo generado: {}", e))?;

    Ok(ResultadoUnirPdfsDto {
        ruta_destino: peticion.ruta_destino.clone(),
        total_paginas: combined_page_ids.len() as u32,
        tamano_bytes: meta.len(),
    })
}

#[tauri::command]
fn unir_archivos_pdf(peticion: PeticionUnirPdfsDto) -> RespuestaSistemaV1<ResultadoUnirPdfsDto> {
    let inicio = Instant::now();
    let id_solicitud = Uuid::new_v4().to_string();

    if peticion.segmentos.is_empty() {
        return RespuestaSistemaV1::fallo(
            contracts::ErrorSistemaV1 {
                codigo: "VALIDACION_SEGMENTOS_VACIOS".to_string(),
                categoria: "validacion".to_string(),
                reintentable: false,
                clave_mensaje: "Se debe especificar al menos un segmento de archivo PDF para unir".to_string(),
                parametros_mensaje: serde_json::json!({}),
                etapa: "unir_archivos_pdf".to_string(),
            },
            id_solicitud,
            inicio.elapsed().as_millis() as u64,
        );
    }

    if peticion.ruta_destino.trim().is_empty() {
        return RespuestaSistemaV1::fallo(
            contracts::ErrorSistemaV1 {
                codigo: "VALIDACION_RUTA_DESTINO_VACIA".to_string(),
                categoria: "validacion".to_string(),
                reintentable: false,
                clave_mensaje: "La ruta de destino no puede estar vacia".to_string(),
                parametros_mensaje: serde_json::json!({}),
                etapa: "unir_archivos_pdf".to_string(),
            },
            id_solicitud,
            inicio.elapsed().as_millis() as u64,
        );
    }

    // Validar existencia fisica de cada archivo
    for seg in &peticion.segmentos {
        let path = Path::new(&seg.ruta_archivo);
        if !path.exists() {
            return RespuestaSistemaV1::fallo(
                contracts::ErrorSistemaV1 {
                    codigo: "ARCHIVO_NO_ENCONTRADO".to_string(),
                    categoria: "archivo".to_string(),
                    reintentable: false,
                    clave_mensaje: format!("El archivo {} no existe en el sistema", seg.ruta_archivo),
                    parametros_mensaje: serde_json::json!({ "ruta": seg.ruta_archivo }),
                    etapa: "unir_archivos_pdf".to_string(),
                },
                id_solicitud,
                inicio.elapsed().as_millis() as u64,
            );
        }
        if !path.is_file() {
            return RespuestaSistemaV1::fallo(
                contracts::ErrorSistemaV1 {
                    codigo: "NO_ES_UN_ARCHIVO".to_string(),
                    categoria: "archivo".to_string(),
                    reintentable: false,
                    clave_mensaje: format!("La ruta {} no corresponde a un archivo regular", seg.ruta_archivo),
                    parametros_mensaje: serde_json::json!({ "ruta": seg.ruta_archivo }),
                    etapa: "unir_archivos_pdf".to_string(),
                },
                id_solicitud,
                inicio.elapsed().as_millis() as u64,
            );
        }
    }

    match ejecutar_fusion_lopdf(&peticion) {
        Ok(resultado) => {
            RespuestaSistemaV1::exito(resultado, id_solicitud, inicio.elapsed().as_millis() as u64)
        }
        Err(err) => {
            RespuestaSistemaV1::fallo(
                contracts::ErrorSistemaV1 {
                    codigo: "ERROR_FUSION_PDF".to_string(),
                    categoria: "procesamiento".to_string(),
                    reintentable: false,
                    clave_mensaje: err,
                    parametros_mensaje: serde_json::json!({ "ruta_destino": peticion.ruta_destino }),
                    etapa: "unir_archivos_pdf".to_string(),
                },
                id_solicitud,
                inicio.elapsed().as_millis() as u64,
            )
        }
    }
}

#[tauri::command]
fn seleccionar_archivos_pdf() -> RespuestaSistemaV1<Vec<String>> {
    let inicio = Instant::now();
    let id_solicitud = Uuid::new_v4().to_string();

    #[cfg(test)]
    {
        if let Ok(paths_env) = std::env::var("TEST_PDF_PATHS") {
            let paths: Vec<String> = paths_env.split(';').map(|s| s.to_string()).collect();
            return RespuestaSistemaV1::exito(paths, id_solicitud, inicio.elapsed().as_millis() as u64);
        }
        return RespuestaSistemaV1::exito(Vec::new(), id_solicitud, inicio.elapsed().as_millis() as u64);
    }

    #[cfg(not(test))]
    {
        desactivar_panel_vista_previa_dialogo_windows();
        let dialog = rfd::FileDialog::new()
            .set_title("Seleccionar archivos PDF o imagenes")
            .add_filter(
                "Documentos PDF e imagenes (*.pdf;*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp;*.svg;*.avif;*.ico;*.tif;*.tiff)",
                &[
                    "pdf", "png", "jpg", "jpeg", "jfif", "pjpeg", "pjp", "webp", "gif", "bmp",
                    "dib", "svg", "avif", "ico", "tif", "tiff",
                ],
            )
            .add_filter("Documentos PDF (*.pdf)", &["pdf"])
            .add_filter(
                "Imagenes compatibles (*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp;*.svg;*.avif;*.ico;*.tif;*.tiff)",
                &[
                    "png", "jpg", "jpeg", "jfif", "pjpeg", "pjp", "webp", "gif", "bmp", "dib",
                    "svg", "avif", "ico", "tif", "tiff",
                ],
            );

        match dialog.pick_files() {
            Some(paths) => {
                let rutas: Vec<String> = paths
                    .into_iter()
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
                RespuestaSistemaV1::exito(rutas, id_solicitud, inicio.elapsed().as_millis() as u64)
            }
            None => {
                RespuestaSistemaV1::exito(Vec::new(), id_solicitud, inicio.elapsed().as_millis() as u64)
            }
        }
    }
}

fn main() {
    desactivar_panel_vista_previa_dialogo_windows();
    tauri::Builder::default()
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::Focused(_) => {
                desactivar_panel_vista_previa_dialogo_windows();
            }
            tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed => {
                restaurar_umbral_arrastre_windows();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            obtener_estado_sistema,
            inspeccionar_archivo_pdf,
            unir_archivos_pdf,
            seleccionar_archivos_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn crear_pdf_prueba(ruta: &Path) {
        let mut doc = Document::with_version("1.5");
        let pages_id = doc.new_object_id();

        let mut page_dict = Dictionary::new();
        page_dict.set("Type", Object::Name(b"Page".to_vec()));
        page_dict.set("Parent", Object::Reference(pages_id));
        page_dict.set(
            "MediaBox",
            Object::Array(vec![
                Object::Integer(0),
                Object::Integer(0),
                Object::Integer(612),
                Object::Integer(792),
            ]),
        );
        let page_id = doc.add_object(Object::Dictionary(page_dict));

        let mut pages_dict = Dictionary::new();
        pages_dict.set("Type", Object::Name(b"Pages".to_vec()));
        pages_dict.set("Kids", Object::Array(vec![Object::Reference(page_id)]));
        pages_dict.set("Count", Object::Integer(1));
        doc.objects.insert(pages_id, Object::Dictionary(pages_dict));

        let mut cat_dict = Dictionary::new();
        cat_dict.set("Type", Object::Name(b"Catalog".to_vec()));
        cat_dict.set("Pages", Object::Reference(pages_id));
        let cat_id = doc.add_object(Object::Dictionary(cat_dict));

        doc.trailer.set("Root", Object::Reference(cat_id));
        doc.save(ruta).expect("guardar pdf de prueba");
    }

    #[test]
    fn test_obtener_estado_sistema_exito() {
        let resp = obtener_estado_sistema();
        assert!(resp.correcto);
        assert_eq!(resp.version_contrato, "hra.desktop.respuesta-sistema.v1");
        assert!(resp.error.is_none());
        let datos = resp.datos.expect("debe contener datos");
        assert_eq!(datos.nombre_aplicacion, "union-pdf");
        assert_eq!(datos.version, env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn test_inspeccionar_archivo_inexistente() {
        let resp = inspeccionar_archivo_pdf("C:/ruta/inexistente/archivo.pdf".to_string());
        assert!(!resp.correcto);
        let err = resp.error.expect("debe reportar error");
        assert_eq!(err.codigo, "ARCHIVO_NO_ENCONTRADO");
        assert_eq!(err.categoria, "archivo");
    }

    #[test]
    fn test_inspeccionar_directorio_rechazado() {
        let temp_dir = std::env::temp_dir();
        let resp = inspeccionar_archivo_pdf(temp_dir.to_string_lossy().to_string());
        assert!(!resp.correcto);
        let err = resp.error.expect("debe reportar error");
        assert_eq!(err.codigo, "NO_ES_UN_ARCHIVO");
    }

    #[test]
    fn test_inspeccionar_archivo_no_pdf() {
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("test_invalido.txt");
        std::fs::write(&test_file, b"Hola mundo no soy PDF").unwrap();

        let resp = inspeccionar_archivo_pdf(test_file.to_string_lossy().to_string());
        assert!(!resp.correcto);
        let err = resp.error.expect("debe reportar error");
        assert_eq!(err.codigo, "FORMATO_PDF_INVALIDO");
        let _ = std::fs::remove_file(test_file);
    }

    #[test]
    fn test_inspeccionar_archivo_pdf_valido() {
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("test_valido.pdf");
        std::fs::write(&test_file, b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF").unwrap();

        let resp = inspeccionar_archivo_pdf(test_file.to_string_lossy().to_string());
        assert!(!resp.correcto, "no debe devolver exito falso sin conteo real de paginas");
        let err = resp.error.expect("debe reportar error");
        assert_eq!(err.codigo, "NO_IMPLEMENTADO");
        let _ = std::fs::remove_file(test_file);
    }

    #[test]
    fn test_comandos_pendientes_no_devuelven_exito_falso() {
        // inspeccionar_archivo_pdf permanece como comando pendiente con contrato NO_IMPLEMENTADO
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("test_pendiente.pdf");
        std::fs::write(&test_file, b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF").unwrap();

        let resp = inspeccionar_archivo_pdf(test_file.to_string_lossy().to_string());
        assert!(!resp.correcto);
        assert_eq!(resp.error.expect("error").codigo, "NO_IMPLEMENTADO");
        let _ = std::fs::remove_file(test_file);
    }

    #[test]
    fn test_unir_archivos_segmentos_vacios() {
        let peticion = PeticionUnirPdfsDto {
            segmentos: vec![],
            ruta_destino: "C:/salida.pdf".to_string(),
        };
        let resp = unir_archivos_pdf(peticion);
        assert!(!resp.correcto);
        let err = resp.error.expect("debe reportar error");
        assert_eq!(err.codigo, "VALIDACION_SEGMENTOS_VACIOS");
    }

    #[test]
    fn test_unir_archivos_ruta_destino_vacia() {
        let peticion = contracts::PeticionUnirPdfsDto {
            segmentos: vec![contracts::SegmentoArchivoPeticionDto {
                ruta_archivo: "C:/doc1.pdf".to_string(),
                paginas_incluidas: vec![1],
                rotaciones: None,
            }],
            ruta_destino: "   ".to_string(),
        };
        let resp = unir_archivos_pdf(peticion);
        assert!(!resp.correcto);
        let err = resp.error.expect("debe reportar error");
        assert_eq!(err.codigo, "VALIDACION_RUTA_DESTINO_VACIA");
    }

    #[test]
    fn test_unir_archivos_archivo_inexistente() {
        let peticion = PeticionUnirPdfsDto {
            segmentos: vec![contracts::SegmentoArchivoPeticionDto {
                ruta_archivo: "C:/ruta/ficticia/inexistente_12345.pdf".to_string(),
                paginas_incluidas: vec![1],
                rotaciones: None,
            }],
            ruta_destino: "C:/salida.pdf".to_string(),
        };
        let resp = unir_archivos_pdf(peticion);
        assert!(!resp.correcto);
        let err = resp.error.expect("debe reportar error");
        assert_eq!(err.codigo, "ARCHIVO_NO_ENCONTRADO");
    }

    #[test]
    fn test_seleccionar_archivos_pdf_funcional() {
        let sel = seleccionar_archivos_pdf();
        assert!(sel.correcto);
        assert_eq!(sel.version_contrato, "hra.desktop.respuesta-sistema.v1");
        assert!(sel.error.is_none());
    }

    #[test]
    fn test_seleccionar_archivos_pdf_con_env() {
        std::env::set_var("TEST_PDF_PATHS", "C:/doc_a.pdf;C:/doc_b.pdf");
        let sel = seleccionar_archivos_pdf();
        std::env::remove_var("TEST_PDF_PATHS");
        assert!(sel.correcto);
        let paths = sel.datos.expect("debe contener lista de rutas");
        assert_eq!(paths.len(), 2);
        assert_eq!(paths[0], "C:/doc_a.pdf");
        assert_eq!(paths[1], "C:/doc_b.pdf");
    }

    #[test]
    fn test_unir_archivos_pagina_inexistente() {
        let temp_dir = std::env::temp_dir();
        let pdf = temp_dir.join("test_doc_single.pdf");
        let salida = temp_dir.join("test_salida_err.pdf");
        crear_pdf_prueba(&pdf);

        let peticion = PeticionUnirPdfsDto {
            segmentos: vec![
                contracts::SegmentoArchivoPeticionDto {
                    ruta_archivo: pdf.to_string_lossy().to_string(),
                    paginas_incluidas: vec![999], // Pagina 999 no existe en documento de 1 pagina
                    rotaciones: None,
                },
            ],
            ruta_destino: salida.to_string_lossy().to_string(),
        };

        let resp = unir_archivos_pdf(peticion);
        assert!(!resp.correcto, "debe fallar si se solicita una pagina inexistente");
        let err = resp.error.expect("debe contener error");
        assert_eq!(err.codigo, "ERROR_FUSION_PDF");
        assert!(err.clave_mensaje.contains("999"));

        let _ = std::fs::remove_file(pdf);
        let _ = std::fs::remove_file(salida);
    }

    #[test]
    fn test_unir_archivos_pdf_real_exito() {
        let temp_dir = std::env::temp_dir();
        let pdf1 = temp_dir.join("test_doc1.pdf");
        let pdf2 = temp_dir.join("test_doc2.pdf");
        let salida = temp_dir.join("test_salida_unida.pdf");

        if salida.exists() {
            let _ = std::fs::remove_file(&salida);
        }

        crear_pdf_prueba(&pdf1);
        crear_pdf_prueba(&pdf2);

        let peticion = PeticionUnirPdfsDto {
            segmentos: vec![
                contracts::SegmentoArchivoPeticionDto {
                    ruta_archivo: pdf1.to_string_lossy().to_string(),
                    paginas_incluidas: vec![1],
                    rotaciones: Some(vec![90]),
                },
                contracts::SegmentoArchivoPeticionDto {
                    ruta_archivo: pdf2.to_string_lossy().to_string(),
                    paginas_incluidas: vec![1],
                    rotaciones: None,
                },
            ],
            ruta_destino: salida.to_string_lossy().to_string(),
        };

        let resp = unir_archivos_pdf(peticion);
        assert!(resp.correcto, "la fusion real con lopdf debe ser exitosa: {:?}", resp.error);
        assert!(resp.error.is_none());

        let datos = resp.datos.expect("debe contener datos de resultado");
        assert_eq!(datos.total_paginas, 2);
        assert!(datos.tamano_bytes > 0);
        assert!(salida.exists(), "el archivo de salida debe existir fisicamente");
        assert!(std::fs::metadata(&salida).unwrap().len() > 0);

        // Verificar con lopdf que el PDF generado es valido y contiene 2 paginas
        let doc_verif = Document::load(&salida).expect("el PDF generado debe ser valido para lopdf");
        let paginas = doc_verif.get_pages();
        assert_eq!(paginas.len(), 2, "el documento fusionado debe contener exactamente 2 paginas");

        let _ = std::fs::remove_file(pdf1);
        let _ = std::fs::remove_file(pdf2);
        let _ = std::fs::remove_file(salida);
    }

    #[test]
    fn test_normalizar_bytes_details_container_desactiva_preview_pane() {
        // Caso real de Windows Explorer con Preview Pane activo (bit 0x02): [1,0,0,0, 2,0,0,0] -> [1,0,0,0, 1,0,0,0]
        let con_preview = [1u8, 0, 0, 0, 2, 0, 0, 0];
        assert_eq!(
            normalizar_bytes_details_container(&con_preview),
            Some(vec![1u8, 0, 0, 0, 1, 0, 0, 0])
        );

        // Si ambos bits (0x01 | 0x02 = 3) estan activos, preserva 0x01 y apaga 0x02:
        let ambos_bits = [1u8, 0, 0, 0, 3, 0, 0, 0];
        assert_eq!(
            normalizar_bytes_details_container(&ambos_bits),
            Some(vec![1u8, 0, 0, 0, 1, 0, 0, 0])
        );

        // Si el Preview Pane ya esta desactivado ([1,0,0,0, 1,0,0,0]), no requiere escritura (None):
        let sin_preview = [1u8, 0, 0, 0, 1, 0, 0, 0];
        assert_eq!(normalizar_bytes_details_container(&sin_preview), None);

        // Buffers cortos (< 8 bytes) no se modifican:
        assert_eq!(normalizar_bytes_details_container(&[1u8, 0, 0, 0]), None);
    }

    #[test]
    fn test_normalizar_bytes_sizer_panel_vista_previa_oculta_reading_pane() {
        // Caso real de Windows IFileOpenDialog (CIDOpen\Modules\GlobalSettings\Sizer -> ReadingPaneSizer):
        // Ancho 494px ([238, 1, 0, 0]), fVisible = 1 ([1, 0, 0, 0]), flags = 0, total = 970px ([202, 3, 0, 0])
        let reading_pane_visible = [
            238u8, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 202, 3, 0, 0,
        ];
        assert_eq!(
            normalizar_bytes_sizer_panel_vista_previa(&reading_pane_visible),
            Some(vec![
                238u8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 202, 3, 0, 0,
            ])
        );

        // Caso real de DetailsContainerSizer con fVisible = 1:
        let details_sizer_visible = [
            3u8, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 225, 4, 0, 0,
        ];
        assert_eq!(
            normalizar_bytes_sizer_panel_vista_previa(&details_sizer_visible),
            Some(vec![
                3u8, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 225, 4, 0, 0,
            ])
        );

        // Si fVisible ya es 0 ([0, 0, 0, 0]), no requiere escritura (None):
        let reading_pane_oculto = [
            238u8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 202, 3, 0, 0,
        ];
        assert_eq!(
            normalizar_bytes_sizer_panel_vista_previa(&reading_pane_oculto),
            None
        );

        // Buffers cortos (< 8 bytes) no se modifican:
        assert_eq!(
            normalizar_bytes_sizer_panel_vista_previa(&[238u8, 1, 0, 0]),
            None
        );
    }

    #[test]
    fn test_calcular_umbral_arrastre_inicial_recupera_base_ante_cierre_abrupto() {
        assert_eq!(calcular_umbral_arrastre_inicial(4, 4, 48), (4, 4));
        assert_eq!(calcular_umbral_arrastre_inicial(8, 8, 48), (8, 8));
        // Si un proceso previo termino con TerminateProcess dejando 48x48 en sesion, restaura a 4x4:
        assert_eq!(calcular_umbral_arrastre_inicial(48, 48, 48), (4, 4));
        assert_eq!(calcular_umbral_arrastre_inicial(0, -1, 48), (4, 4));
    }
}
