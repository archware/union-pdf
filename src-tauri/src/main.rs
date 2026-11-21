// Prevents the console window from appearing on Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[path = "../../contracts/generated/rust/contracts.rs"]
mod contracts;

use contracts::{
    EstadoSistemaDto, MetadatosArchivoPdfDto, PeticionGuardarPdfDto, PeticionUnirPdfsDto,
    RespuestaSistemaV1, ResultadoGuardarPdfDto, ResultadoUnirPdfsDto,
};
use lopdf::{Dictionary, Document, Object, ObjectId};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
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

fn fallo_hilo_nativo<T>(etapa: &str, detalle: String, inicio: Instant) -> RespuestaSistemaV1<T> {
    RespuestaSistemaV1::fallo(
        contracts::ErrorSistemaV1 {
            codigo: "ERROR_HILO_NATIVO".to_string(),
            categoria: "sistema".to_string(),
            reintentable: true,
            clave_mensaje: format!("No se pudo completar la tarea en el pool bloqueante: {detalle}"),
            parametros_mensaje: serde_json::json!({}),
            etapa: etapa.to_string(),
        },
        Uuid::new_v4().to_string(),
        inicio.elapsed().as_millis() as u64,
    )
}

fn ejecutar_union_archivos_pdf(
    peticion: PeticionUnirPdfsDto,
) -> RespuestaSistemaV1<ResultadoUnirPdfsDto> {
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
async fn unir_archivos_pdf(
    peticion: PeticionUnirPdfsDto,
) -> RespuestaSistemaV1<ResultadoUnirPdfsDto> {
    let inicio = Instant::now();
    tauri::async_runtime::spawn_blocking(move || ejecutar_union_archivos_pdf(peticion))
        .await
        .unwrap_or_else(|e| fallo_hilo_nativo("unir_archivos_pdf", e.to_string(), inicio))
}

fn ejecutar_seleccion_archivos_pdf() -> RespuestaSistemaV1<Vec<String>> {
    let inicio = Instant::now();
    let id_solicitud = Uuid::new_v4().to_string();

    #[cfg(test)]
    {
        if let Ok(paths_env) = std::env::var("TEST_PDF_PATHS") {
            let paths: Vec<String> = paths_env.split(';').map(|s| s.to_string()).collect();
            return RespuestaSistemaV1::exito(paths, id_solicitud, inicio.elapsed().as_millis() as u64);
        }
        RespuestaSistemaV1::exito(Vec::new(), id_solicitud, inicio.elapsed().as_millis() as u64)
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

#[tauri::command]
async fn seleccionar_archivos_pdf() -> RespuestaSistemaV1<Vec<String>> {
    let inicio = Instant::now();
    tauri::async_runtime::spawn_blocking(ejecutar_seleccion_archivos_pdf)
        .await
        .unwrap_or_else(|e| fallo_hilo_nativo("seleccionar_archivos_pdf", e.to_string(), inicio))
}

/// Decodifica una cadena Base64 estandar (RFC 4648) ignorando espacios en blanco ASCII
/// y un prefijo `data:...;base64,` opcional.
fn decodificar_base64(entrada: &str) -> Result<Vec<u8>, String> {
    let sin_prefijo = match entrada.find(";base64,") {
        Some(pos) if entrada[..pos].starts_with("data:") => &entrada[pos + 8..],
        _ => entrada,
    };

    let limpio: Vec<u8> = sin_prefijo
        .bytes()
        .filter(|b| !b.is_ascii_whitespace())
        .collect();

    if limpio.is_empty() {
        return Err("La carga Base64 esta vacia".to_string());
    }
    if (limpio.len() & 3) != 0 {
        return Err("Longitud Base64 invalida (no es multiplo de 4)".to_string());
    }

    fn valor_sexteto(b: u8) -> Option<u8> {
        match b {
            b'A'..=b'Z' => Some(b - b'A'),
            b'a'..=b'z' => Some(b - b'a' + 26),
            b'0'..=b'9' => Some(b - b'0' + 52),
            b'+' | b'-' => Some(62),
            b'/' | b'_' => Some(63),
            _ => None,
        }
    }

    let mut salida = Vec::with_capacity((limpio.len() / 4) * 3);
    let total_bloques = limpio.len() / 4;

    for (indice, bloque) in limpio.chunks_exact(4).enumerate() {
        let es_ultimo = indice + 1 == total_bloques;
        let pad = if bloque[2] == b'=' && bloque[3] == b'=' {
            2
        } else if bloque[3] == b'=' {
            1
        } else {
            0
        };

        if pad > 0 && !es_ultimo {
            return Err("Relleno '=' fuera del bloque final Base64".to_string());
        }
        if bloque[0] == b'=' || bloque[1] == b'=' || (bloque[2] == b'=' && bloque[3] != b'=') {
            return Err("Secuencia de relleno Base64 mal formada".to_string());
        }

        let v0 = valor_sexteto(bloque[0])
            .ok_or_else(|| "Caracter invalido en Base64".to_string())?;
        let v1 = valor_sexteto(bloque[1])
            .ok_or_else(|| "Caracter invalido en Base64".to_string())?;
        let v2 = if pad == 2 {
            0
        } else {
            valor_sexteto(bloque[2]).ok_or_else(|| "Caracter invalido en Base64".to_string())?
        };
        let v3 = if pad >= 1 {
            0
        } else {
            valor_sexteto(bloque[3]).ok_or_else(|| "Caracter invalido en Base64".to_string())?
        };

        salida.push((v0 << 2) | (v1 >> 4));
        if pad < 2 {
            salida.push((v1 << 4) | (v2 >> 2));
        }
        if pad < 1 {
            salida.push((v2 << 6) | v3);
        }
    }

    Ok(salida)
}

/// Limpia el nombre sugerido para el dialogo nativo «Guardar como...» garantizando extension `.pdf`.
fn normalizar_nombre_pdf_sugerido(nombre: &str) -> String {
    let ultimo_segmento = nombre
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("")
        .trim();

    let sin_ext = if ultimo_segmento.len() >= 4
        && ultimo_segmento[ultimo_segmento.len() - 4..].eq_ignore_ascii_case(".pdf")
    {
        ultimo_segmento[..ultimo_segmento.len() - 4].trim()
    } else {
        ultimo_segmento
    };

    let mut base: String = sin_ext
        .chars()
        .map(|c| {
            if c.is_control() || matches!(c, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*') {
                '_'
            } else {
                c
            }
        })
        .collect();

    base = base.trim_matches(['.', ' ']).to_string();
    if base.is_empty() || base.chars().all(|c| c == '_') {
        "documento_final.pdf".to_string()
    } else {
        format!("{base}.pdf")
    }
}

/// Asegura que la ruta elegida termine en `.pdf` sin truncar nombres con puntos (ej. `informe_v1.0` -> `informe_v1.0.pdf`).
fn asegurar_extension_pdf(ruta: PathBuf) -> PathBuf {
    let tiene_pdf = ruta
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false);
    if tiene_pdf {
        ruta
    } else {
        let mut os = ruta.into_os_string();
        os.push(".pdf");
        PathBuf::from(os)
    }
}

fn guardar_bytes_pdf_en_destino(
    bytes: &[u8],
    destino_elegido: Option<PathBuf>,
) -> Result<ResultadoGuardarPdfDto, Box<contracts::ErrorSistemaV1>> {
    let Some(ruta_bruta) = destino_elegido else {
        return Ok(ResultadoGuardarPdfDto {
            guardado: false,
            ruta_destino: None,
            tamano_bytes: 0,
        });
    };

    let ruta_final = asegurar_extension_pdf(ruta_bruta);

    if let Some(parent) = ruta_final.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| {
                Box::new(contracts::ErrorSistemaV1 {
                    codigo: "ERROR_CREACION_DIRECTORIO".to_string(),
                    categoria: "archivo".to_string(),
                    reintentable: true,
                    clave_mensaje: format!("No se pudo crear el directorio destino: {e}"),
                    parametros_mensaje: serde_json::json!({
                        "rutaDestino": ruta_final.to_string_lossy().to_string()
                    }),
                    etapa: "guardar_archivo_pdf".to_string(),
                })
            })?;
        }
    }

    std::fs::write(&ruta_final, bytes).map_err(|e| {
        Box::new(contracts::ErrorSistemaV1 {
            codigo: "ERROR_ESCRITURA_ARCHIVO".to_string(),
            categoria: "archivo".to_string(),
            reintentable: true,
            clave_mensaje: format!("No se pudo escribir el archivo PDF en disco: {e}"),
            parametros_mensaje: serde_json::json!({
                "rutaDestino": ruta_final.to_string_lossy().to_string()
            }),
            etapa: "guardar_archivo_pdf".to_string(),
        })
    })?;

    let meta = std::fs::metadata(&ruta_final).map_err(|e| {
        Box::new(contracts::ErrorSistemaV1 {
            codigo: "ERROR_METADATOS_ARCHIVO".to_string(),
            categoria: "archivo".to_string(),
            reintentable: true,
            clave_mensaje: format!("No se pudieron verificar los metadatos del PDF guardado: {e}"),
            parametros_mensaje: serde_json::json!({
                "rutaDestino": ruta_final.to_string_lossy().to_string()
            }),
            etapa: "guardar_archivo_pdf".to_string(),
        })
    })?;

    Ok(ResultadoGuardarPdfDto {
        guardado: true,
        ruta_destino: Some(ruta_final.to_string_lossy().to_string()),
        tamano_bytes: meta.len(),
    })
}

fn ejecutar_guardado_archivo_pdf(
    peticion: PeticionGuardarPdfDto,
) -> RespuestaSistemaV1<ResultadoGuardarPdfDto> {
    let inicio = Instant::now();
    let id_solicitud = Uuid::new_v4().to_string();

    if peticion.contenido_base64.trim().is_empty() {
        return RespuestaSistemaV1::fallo(
            contracts::ErrorSistemaV1 {
                codigo: "VALIDACION_CONTENIDO_VACIO".to_string(),
                categoria: "validacion".to_string(),
                reintentable: false,
                clave_mensaje: "El contenido binario del documento PDF no puede estar vacio"
                    .to_string(),
                parametros_mensaje: serde_json::json!({}),
                etapa: "guardar_archivo_pdf".to_string(),
            },
            id_solicitud,
            inicio.elapsed().as_millis() as u64,
        );
    }

    let bytes = match decodificar_base64(&peticion.contenido_base64) {
        Ok(b) => b,
        Err(motivo) => {
            return RespuestaSistemaV1::fallo(
                contracts::ErrorSistemaV1 {
                    codigo: "VALIDACION_BASE64_INVALIDO".to_string(),
                    categoria: "validacion".to_string(),
                    reintentable: false,
                    clave_mensaje: motivo,
                    parametros_mensaje: serde_json::json!({}),
                    etapa: "guardar_archivo_pdf".to_string(),
                },
                id_solicitud,
                inicio.elapsed().as_millis() as u64,
            );
        }
    };

    if bytes.len() < 4 || &bytes[0..4] != b"%PDF" {
        return RespuestaSistemaV1::fallo(
            contracts::ErrorSistemaV1 {
                codigo: "FORMATO_PDF_INVALIDO".to_string(),
                categoria: "validacion".to_string(),
                reintentable: false,
                clave_mensaje: "Los bytes recibidos no contienen una cabecera PDF valida"
                    .to_string(),
                parametros_mensaje: serde_json::json!({}),
                etapa: "guardar_archivo_pdf".to_string(),
            },
            id_solicitud,
            inicio.elapsed().as_millis() as u64,
        );
    }

    let nombre_limpio = normalizar_nombre_pdf_sugerido(&peticion.nombre_sugerido);

    #[cfg(test)]
    let destino_elegido: Option<PathBuf> = {
        let _ = &nombre_limpio;
        None
    };

    #[cfg(not(test))]
    let destino_elegido: Option<PathBuf> = {
        desactivar_panel_vista_previa_dialogo_windows();
        rfd::FileDialog::new()
            .set_title("Guardar documento PDF")
            .set_file_name(&nombre_limpio)
            .add_filter("Documento PDF (*.pdf)", &["pdf"])
            .save_file()
    };

    match guardar_bytes_pdf_en_destino(&bytes, destino_elegido) {
        Ok(resultado) => {
            RespuestaSistemaV1::exito(resultado, id_solicitud, inicio.elapsed().as_millis() as u64)
        }
        Err(error) => {
            RespuestaSistemaV1::fallo(*error, id_solicitud, inicio.elapsed().as_millis() as u64)
        }
    }
}

#[tauri::command]
async fn guardar_archivo_pdf(
    peticion: PeticionGuardarPdfDto,
) -> RespuestaSistemaV1<ResultadoGuardarPdfDto> {
    let inicio = Instant::now();
    tauri::async_runtime::spawn_blocking(move || ejecutar_guardado_archivo_pdf(peticion))
        .await
        .unwrap_or_else(|e| fallo_hilo_nativo("guardar_archivo_pdf", e.to_string(), inicio))
}

#[cfg(not(test))]
fn lanzar_visor_pdf_sistema(ruta: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut c = std::process::Command::new("rundll32.exe");
        c.arg("url.dll,FileProtocolHandler").arg(ruta);
        c
    };

    #[cfg(target_os = "macos")]
    let mut cmd = {
        let mut c = std::process::Command::new("open");
        c.arg(ruta);
        c
    };

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let mut cmd = {
        let mut c = std::process::Command::new("xdg-open");
        c.arg(ruta);
        c
    };

    cmd.spawn()
        .map(|_| ())
        .map_err(|e| format!("No se pudo abrir el archivo con el visor predeterminado: {e}"))
}

#[cfg(test)]
fn lanzar_visor_pdf_sistema(ruta: &Path) -> Result<(), String> {
    let _ = ruta;
    Ok(())
}

#[tauri::command]
fn abrir_archivo_pdf(ruta_archivo: String) -> RespuestaSistemaV1<bool> {
    let inicio = Instant::now();
    let id_solicitud = Uuid::new_v4().to_string();
    let ruta_limpia = ruta_archivo.trim();

    if ruta_limpia.is_empty() {
        return RespuestaSistemaV1::fallo(
            contracts::ErrorSistemaV1 {
                codigo: "VALIDACION_RUTA_ARCHIVO_VACIA".to_string(),
                categoria: "validacion".to_string(),
                reintentable: false,
                clave_mensaje: "La ruta del archivo PDF a abrir no puede estar vacia".to_string(),
                parametros_mensaje: serde_json::json!({}),
                etapa: "abrir_archivo_pdf".to_string(),
            },
            id_solicitud,
            inicio.elapsed().as_millis() as u64,
        );
    }

    let path = Path::new(ruta_limpia);
    if !path.exists() {
        return RespuestaSistemaV1::fallo(
            contracts::ErrorSistemaV1 {
                codigo: "ARCHIVO_NO_ENCONTRADO".to_string(),
                categoria: "archivo".to_string(),
                reintentable: false,
                clave_mensaje: "El archivo PDF especificado no existe en el sistema".to_string(),
                parametros_mensaje: serde_json::json!({ "ruta": ruta_limpia }),
                etapa: "abrir_archivo_pdf".to_string(),
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
                parametros_mensaje: serde_json::json!({ "ruta": ruta_limpia }),
                etapa: "abrir_archivo_pdf".to_string(),
            },
            id_solicitud,
            inicio.elapsed().as_millis() as u64,
        );
    }

    let mut cabecera = [0u8; 4];
    let es_pdf = match std::fs::File::open(path) {
        Ok(mut f) => {
            use std::io::Read;
            f.read_exact(&mut cabecera).is_ok() && &cabecera == b"%PDF"
        }
        Err(e) => {
            return RespuestaSistemaV1::fallo(
                contracts::ErrorSistemaV1 {
                    codigo: "ERROR_ACCESO_ARCHIVO".to_string(),
                    categoria: "archivo".to_string(),
                    reintentable: true,
                    clave_mensaje: e.to_string(),
                    parametros_mensaje: serde_json::json!({ "ruta": ruta_limpia }),
                    etapa: "abrir_archivo_pdf".to_string(),
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
                clave_mensaje: "Por seguridad solo se permite abrir archivos con cabecera PDF valida"
                    .to_string(),
                parametros_mensaje: serde_json::json!({ "ruta": ruta_limpia }),
                etapa: "abrir_archivo_pdf".to_string(),
            },
            id_solicitud,
            inicio.elapsed().as_millis() as u64,
        );
    }

    match lanzar_visor_pdf_sistema(path) {
        Ok(()) => RespuestaSistemaV1::exito(true, id_solicitud, inicio.elapsed().as_millis() as u64),
        Err(motivo) => RespuestaSistemaV1::fallo(
            contracts::ErrorSistemaV1 {
                codigo: "ERROR_APERTURA_ARCHIVO".to_string(),
                categoria: "sistema".to_string(),
                reintentable: true,
                clave_mensaje: motivo,
                parametros_mensaje: serde_json::json!({ "ruta": ruta_limpia }),
                etapa: "abrir_archivo_pdf".to_string(),
            },
            id_solicitud,
            inicio.elapsed().as_millis() as u64,
        ),
    }
}

/// Determina el valor efectivo de `WEBKIT_DISABLE_DMABUF_RENDERER` en Linux para evitar
/// ventanas en blanco o fallos EGL/GBM (`AcceleratedSurfaceDMABuf`) en WebKit2GTK 2.42+
/// sobre drivers NVIDIA, Wayland o servidores X11 sin DRI3. Respeta `"0"` / `"false"`
/// definido explicitamente por el usuario y aplica `"1"` por defecto.
fn resolver_valor_dmabuf_linux(actual: Option<&str>) -> &'static str {
    match actual.map(str::trim) {
        Some("0") | Some("false") | Some("FALSE") => "0",
        _ => "1",
    }
}

/// Determina como restaurar `LD_LIBRARY_PATH` tras la carga inicial del binario en Linux cuando
/// el lanzador auto-contenido activo el puente de compatibilidad `libwebkit2gtk-4.1` -> `4.0`
/// (`UNION_PDF_SHIM_LD=1`), evitando que procesos hijos lanzados por `xdg-open` o portales de
/// escritorio hereden el directorio de shims (`libsoup-2.4.so.1` -> `libsoup-3.0.so.0`).
/// Devuelve:
/// - `None` si el puente no fue activado por el lanzador (`shim_activo != Some("1")`).
/// - `Some(Some(valor))` si habia un `LD_LIBRARY_PATH` previo no vacio que debe restaurarse.
/// - `Some(None)` si `LD_LIBRARY_PATH` no existia antes del lanzador y debe limpiarse.
fn resolver_restauracion_ld_library_path_linux(
    shim_activo: Option<&str>,
    ld_original: Option<&str>,
) -> Option<Option<String>> {
    if shim_activo != Some("1") {
        return None;
    }
    match ld_original {
        Some(v) if !v.is_empty() => Some(Some(v.to_string())),
        _ => Some(None),
    }
}

#[cfg(target_os = "linux")]
fn configurar_entorno_webkit_linux() {
    let actual = std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").ok();
    let efectivo = resolver_valor_dmabuf_linux(actual.as_deref());
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", efectivo);

    let shim_activo = std::env::var("UNION_PDF_SHIM_LD").ok();
    let ld_original = std::env::var("UNION_PDF_ORIG_LD_LIBRARY_PATH").ok();
    if let Some(restaurar) = resolver_restauracion_ld_library_path_linux(
        shim_activo.as_deref(),
        ld_original.as_deref(),
    ) {
        match restaurar {
            Some(valor) => std::env::set_var("LD_LIBRARY_PATH", valor),
            None => std::env::remove_var("LD_LIBRARY_PATH"),
        }
        std::env::remove_var("UNION_PDF_SHIM_LD");
        std::env::remove_var("UNION_PDF_ORIG_LD_LIBRARY_PATH");
    }
}

#[cfg(not(target_os = "linux"))]
fn configurar_entorno_webkit_linux() {
    let _ = resolver_valor_dmabuf_linux(None);
    let _ = resolver_restauracion_ld_library_path_linux(None, None);
}

fn main() {
    configurar_entorno_webkit_linux();
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
            guardar_archivo_pdf,
            abrir_archivo_pdf,
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
        let resp = tauri::async_runtime::block_on(unir_archivos_pdf(peticion));
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
        let resp = tauri::async_runtime::block_on(unir_archivos_pdf(peticion));
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
        let resp = tauri::async_runtime::block_on(unir_archivos_pdf(peticion));
        assert!(!resp.correcto);
        let err = resp.error.expect("debe reportar error");
        assert_eq!(err.codigo, "ARCHIVO_NO_ENCONTRADO");
    }

    #[test]
    fn test_seleccionar_archivos_pdf_funcional() {
        let sel = tauri::async_runtime::block_on(seleccionar_archivos_pdf());
        assert!(sel.correcto);
        assert_eq!(sel.version_contrato, "hra.desktop.respuesta-sistema.v1");
        assert!(sel.error.is_none());
    }

    #[test]
    fn test_seleccionar_archivos_pdf_con_env() {
        std::env::set_var("TEST_PDF_PATHS", "C:/doc_a.pdf;C:/doc_b.pdf");
        let sel = ejecutar_seleccion_archivos_pdf();
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

        let resp = tauri::async_runtime::block_on(unir_archivos_pdf(peticion));
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

        let resp = tauri::async_runtime::block_on(unir_archivos_pdf(peticion));
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

    #[test]
    fn test_resolver_valor_dmabuf_linux_desactiva_dmabuf_por_defecto() {
        configurar_entorno_webkit_linux();
        assert_eq!(resolver_valor_dmabuf_linux(None), "1");
        assert_eq!(resolver_valor_dmabuf_linux(Some("")), "1");
        assert_eq!(resolver_valor_dmabuf_linux(Some("1")), "1");
        assert_eq!(resolver_valor_dmabuf_linux(Some("0")), "0");
        assert_eq!(resolver_valor_dmabuf_linux(Some(" 0 ")), "0");
        assert_eq!(resolver_valor_dmabuf_linux(Some("false")), "0");
        assert_eq!(resolver_valor_dmabuf_linux(Some("FALSE")), "0");
    }

    #[test]
    fn test_resolver_restauracion_ld_library_path_linux_evita_fuga_shim_a_subprocesos() {
        // Si el lanzador no activo el shim (ej. ejecucion nativa en Ubuntu 22.04), no toca LD_LIBRARY_PATH:
        assert_eq!(resolver_restauracion_ld_library_path_linux(None, None), None);
        assert_eq!(
            resolver_restauracion_ld_library_path_linux(Some("0"), Some("/opt/lib")),
            None
        );

        // Si el lanzador activo el shim sin LD_LIBRARY_PATH previo, indica limpiar la variable:
        assert_eq!(
            resolver_restauracion_ld_library_path_linux(Some("1"), None),
            Some(None)
        );
        assert_eq!(
            resolver_restauracion_ld_library_path_linux(Some("1"), Some("")),
            Some(None)
        );

        // Si el lanzador activo el shim y existia un LD_LIBRARY_PATH previo del usuario, lo restaura:
        assert_eq!(
            resolver_restauracion_ld_library_path_linux(Some("1"), Some("/opt/custom/lib:/usr/local/lib")),
            Some(Some("/opt/custom/lib:/usr/local/lib".to_string()))
        );
    }

    #[test]
    fn test_decodificar_base64_casos_validos_e_invalidos() {
        // "%PDF-1.5" en Base64 es "JVBERi0xLjU="
        assert_eq!(
            decodificar_base64("JVBERi0xLjU=").expect("base64 valido"),
            b"%PDF-1.5"
        );
        // Con prefijo data URL y saltos de linea
        assert_eq!(
            decodificar_base64("data:application/pdf;base64,JVBE\nRi0x\r\nLjU=")
                .expect("data url base64"),
            b"%PDF-1.5"
        );
        // Sin padding ("JVBERg==" = "%PDF" -> 4 bytes con ==; "%PDF-1" = 6 bytes -> "JVBERi0x")
        assert_eq!(
            decodificar_base64("JVBERg==").expect("base64 doble igual"),
            b"%PDF"
        );
        assert_eq!(
            decodificar_base64("JVBERi0x").expect("base64 sin igual"),
            b"%PDF-1"
        );

        assert!(decodificar_base64("").is_err());
        assert!(decodificar_base64("   ").is_err());
        assert!(decodificar_base64("JVBER").is_err());
        assert!(decodificar_base64("JVBE====").is_err());
        assert!(decodificar_base64("JV$ERi0x").is_err());
    }

    #[test]
    fn test_normalizar_nombre_pdf_y_extension_con_puntos() {
        assert_eq!(
            normalizar_nombre_pdf_sugerido("expediente_final.pdf"),
            "expediente_final.pdf"
        );
        assert_eq!(
            normalizar_nombre_pdf_sugerido("informe_v1.0"),
            "informe_v1.0.pdf"
        );
        assert_eq!(
            normalizar_nombre_pdf_sugerido("C:\\temp\\reporte:2026*?.PDF"),
            "reporte_2026__.pdf"
        );
        assert_eq!(normalizar_nombre_pdf_sugerido("   "), "documento_final.pdf");
        assert_eq!(normalizar_nombre_pdf_sugerido("***"), "documento_final.pdf");

        let ruta_sin_ext = PathBuf::from("C:/salida/union_v1.0");
        assert_eq!(
            asegurar_extension_pdf(ruta_sin_ext),
            PathBuf::from("C:/salida/union_v1.0.pdf")
        );
        let ruta_con_ext = PathBuf::from("C:/salida/union_v1.0.PDF");
        assert_eq!(
            asegurar_extension_pdf(ruta_con_ext.clone()),
            ruta_con_ext
        );
    }

    #[test]
    fn test_guardar_archivo_pdf_validaciones_y_cancelacion() {
        let vacio = tauri::async_runtime::block_on(guardar_archivo_pdf(PeticionGuardarPdfDto {
            nombre_sugerido: "salida.pdf".to_string(),
            contenido_base64: "   ".to_string(),
        }));
        assert!(!vacio.correcto);
        assert_eq!(
            vacio.error.expect("error").codigo,
            "VALIDACION_CONTENIDO_VACIO"
        );

        let b64_invalido =
            tauri::async_runtime::block_on(guardar_archivo_pdf(PeticionGuardarPdfDto {
                nombre_sugerido: "salida.pdf".to_string(),
                contenido_base64: "no-es-base64!!!".to_string(),
            }));
        assert!(!b64_invalido.correcto);
        assert_eq!(
            b64_invalido.error.expect("error").codigo,
            "VALIDACION_BASE64_INVALIDO"
        );

        // "SG9sYSBNdW5kbw==" = "Hola Mundo" (no empieza con %PDF)
        let no_pdf = tauri::async_runtime::block_on(guardar_archivo_pdf(PeticionGuardarPdfDto {
            nombre_sugerido: "salida.pdf".to_string(),
            contenido_base64: "SG9sYSBNdW5kbw==".to_string(),
        }));
        assert!(!no_pdf.correcto);
        assert_eq!(no_pdf.error.expect("error").codigo, "FORMATO_PDF_INVALIDO");

        // En #[cfg(test)], el dialogo devuelve None simulando cancelacion limpia del usuario
        let cancelado =
            tauri::async_runtime::block_on(guardar_archivo_pdf(PeticionGuardarPdfDto {
                nombre_sugerido: "salida.pdf".to_string(),
                contenido_base64: "JVBERi0xLjU=".to_string(),
            }));
        assert!(cancelado.correcto);
        let datos = cancelado.datos.expect("datos");
        assert!(!datos.guardado);
        assert!(datos.ruta_destino.is_none());
        assert_eq!(datos.tamano_bytes, 0);
    }

    #[test]
    fn test_spawn_blocking_ejecuta_fuera_del_hilo_invocador() {
        let hilo_invocador = std::thread::current().id();
        let hilo_trabajo = tauri::async_runtime::block_on(async {
            tauri::async_runtime::spawn_blocking(|| std::thread::current().id())
                .await
                .expect("spawn_blocking debe resolverse")
        });
        assert_ne!(
            hilo_invocador, hilo_trabajo,
            "los dialogos nativos deben correr en un hilo bloqueante separado del hilo UI"
        );
    }

    #[test]
    fn test_guardar_bytes_pdf_en_destino_escribe_y_agrega_extension() {
        let temp_dir = std::env::temp_dir().join(format!("union_pdf_save_{}", Uuid::new_v4()));
        let destino_sin_ext = temp_dir.join("entrega_v1.0");
        let bytes_pdf = b"%PDF-1.5\n1 0 obj\n<<>>\nendobj\n%%EOF";

        let resultado = guardar_bytes_pdf_en_destino(bytes_pdf, Some(destino_sin_ext))
            .expect("debe escribir el PDF en disco");
        assert!(resultado.guardado);
        assert_eq!(resultado.tamano_bytes, bytes_pdf.len() as u64);

        let ruta_esperada = temp_dir.join("entrega_v1.0.pdf");
        assert_eq!(
            resultado.ruta_destino.as_deref(),
            Some(ruta_esperada.to_string_lossy().as_ref())
        );
        assert_eq!(
            std::fs::read(&ruta_esperada).expect("leer archivo escrito"),
            bytes_pdf
        );

        let _ = std::fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_abrir_archivo_pdf_seguridad_y_validaciones() {
        let vacia = abrir_archivo_pdf("   ".to_string());
        assert!(!vacia.correcto);
        assert_eq!(
            vacia.error.expect("error").codigo,
            "VALIDACION_RUTA_ARCHIVO_VACIA"
        );

        let inexistente = abrir_archivo_pdf("C:/ruta/inexistente/no_existe_999.pdf".to_string());
        assert!(!inexistente.correcto);
        assert_eq!(
            inexistente.error.expect("error").codigo,
            "ARCHIVO_NO_ENCONTRADO"
        );

        let temp_dir = std::env::temp_dir();
        let directorio = abrir_archivo_pdf(temp_dir.to_string_lossy().to_string());
        assert!(!directorio.correcto);
        assert_eq!(
            directorio.error.expect("error").codigo,
            "NO_ES_UN_ARCHIVO"
        );

        // Rechaza abrir archivos que no tengan cabecera %PDF (ej. scripts/ejecutables renombrados)
        let falso_pdf = temp_dir.join(format!("falso_{}.pdf", Uuid::new_v4()));
        std::fs::write(&falso_pdf, b"MZ\x90\x00no_soy_pdf").unwrap();
        let resp_falso = abrir_archivo_pdf(falso_pdf.to_string_lossy().to_string());
        let _ = std::fs::remove_file(&falso_pdf);
        assert!(!resp_falso.correcto);
        assert_eq!(
            resp_falso.error.expect("error").codigo,
            "FORMATO_PDF_INVALIDO"
        );

        // Acepta un archivo PDF real
        let pdf_real = temp_dir.join(format!("valido_{}.pdf", Uuid::new_v4()));
        crear_pdf_prueba(&pdf_real);
        let resp_ok = abrir_archivo_pdf(pdf_real.to_string_lossy().to_string());
        let _ = std::fs::remove_file(&pdf_real);
        assert!(resp_ok.correcto);
        assert_eq!(resp_ok.datos, Some(true));
    }
}
