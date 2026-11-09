// Contratos generados y formalizados para la frontera IPC de pdf-tool.
// Conforme a DOCTRINA_ESCRITORIO.md y RespuestaSistemaV1<T>.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MetadatosSistemaV1 {
    pub duracion_ms: u64,
    pub etapa_operacion: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ErrorSistemaV1 {
    pub codigo: String,
    pub categoria: String,
    pub reintentable: bool,
    pub clave_mensaje: String,
    pub parametros_mensaje: serde_json::Value,
    pub etapa: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RespuestaSistemaV1<T> {
    pub version_contrato: String,
    pub identificador_solicitud: String,
    pub correcto: bool,
    pub datos: Option<T>,
    pub error: Option<ErrorSistemaV1>,
    pub metadatos: MetadatosSistemaV1,
}

impl<T> RespuestaSistemaV1<T> {
    pub fn exito(datos: T, identificador_solicitud: impl Into<String>, duracion_ms: u64) -> Self {
        Self {
            version_contrato: "hra.desktop.respuesta-sistema.v1".to_string(),
            identificador_solicitud: identificador_solicitud.into(),
            correcto: true,
            datos: Some(datos),
            error: None,
            metadatos: MetadatosSistemaV1 {
                duracion_ms,
                etapa_operacion: "completado".to_string(),
            },
        }
    }

    pub fn fallo(
        error: ErrorSistemaV1,
        identificador_solicitud: impl Into<String>,
        duracion_ms: u64,
    ) -> Self {
        Self {
            version_contrato: "hra.desktop.respuesta-sistema.v1".to_string(),
            identificador_solicitud: identificador_solicitud.into(),
            correcto: false,
            datos: None,
            error: Some(error),
            metadatos: MetadatosSistemaV1 {
                duracion_ms,
                etapa_operacion: "error".to_string(),
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EstadoSistemaDto {
    pub nombre_aplicacion: String,
    pub version: String,
    pub entorno: String,
    pub plataforma: String,
    pub runtime: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PaginaDocumentoPdfDto {
    pub indice: u32,
    pub rotacion: u32,
    pub ancho: u32,
    pub alto: u32,
    pub excluida: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MetadatosArchivoPdfDto {
    pub ruta_archivo: String,
    pub nombre_archivo: String,
    pub tamano_bytes: u64,
    pub cantidad_paginas: u32,
    pub es_protegido: bool,
    pub paginas: Vec<PaginaDocumentoPdfDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SegmentoArchivoPeticionDto {
    pub ruta_archivo: String,
    pub paginas_incluidas: Vec<u32>,
    pub rotaciones: Option<Vec<u32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PeticionUnirPdfsDto {
    pub segmentos: Vec<SegmentoArchivoPeticionDto>,
    pub ruta_destino: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResultadoUnirPdfsDto {
    pub ruta_destino: String,
    pub total_paginas: u32,
    pub tamano_bytes: u64,
}
