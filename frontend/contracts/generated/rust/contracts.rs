// Archivo generado; no debe editarse manualmente.
// Fuentes: JSON Schema Draft 2020-12.
// SHA-256 del conjunto fuente: 96ca8e85b94d35ff4cc7ed40c035658ca294e00993a161e2087f861aca06001e

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ErrorCode {
    #[serde(rename = "ADMIN_BOOTSTRAP_REQUIRED")]
    AdminBootstrapRequired,
    #[serde(rename = "ADMIN_INVALID")]
    AdminInvalid,
    #[serde(rename = "ADMIN_LOCKED")]
    AdminLocked,
    #[serde(rename = "ADMIN_RECOVERY_REQUIRED")]
    AdminRecoveryRequired,
    #[serde(rename = "ADMIN_STORE_UNAVAILABLE")]
    AdminStoreUnavailable,
    #[serde(rename = "ADMIN_TIMEOUT")]
    AdminTimeout,
    #[serde(rename = "CONNECTION_UNCONFIGURED")]
    ConnectionUnconfigured,
    #[serde(rename = "CONNECTION_UNAVAILABLE")]
    ConnectionUnavailable,
    #[serde(rename = "CONNECTION_TIMEOUT")]
    ConnectionTimeout,
    #[serde(rename = "CONNECTION_CREDENTIAL_REJECTED")]
    ConnectionCredentialRejected,
    #[serde(rename = "TLS_CERTIFICATE_REJECTED")]
    TlsCertificateRejected,
    #[serde(rename = "TLS_PROTOCOL_UNSUPPORTED")]
    TlsProtocolUnsupported,
    #[serde(rename = "TLS_LEGACY_NOT_ALLOWED")]
    TlsLegacyNotAllowed,
    #[serde(rename = "DB_TIMEOUT")]
    DbTimeout,
    #[serde(rename = "DB_UNAVAILABLE")]
    DbUnavailable,
    #[serde(rename = "DB_CONTRACT_MISMATCH")]
    DbContractMismatch,
    #[serde(rename = "DB_DATA_INVALID")]
    DbDataInvalid,
    #[serde(rename = "DB_OPERATION_FAILED")]
    DbOperationFailed,
    #[serde(rename = "VALIDATION_REQUIRED")]
    ValidationRequired,
    #[serde(rename = "VALIDATION_FORMAT")]
    ValidationFormat,
    #[serde(rename = "VALIDATION_RANGE")]
    ValidationRange,
    #[serde(rename = "VALIDATION_PERIOD")]
    ValidationPeriod,
    #[serde(rename = "RUNTIME_UNAVAILABLE")]
    RuntimeUnavailable,
    #[serde(rename = "RUNTIME_CANCELLED")]
    RuntimeCancelled,
    #[serde(rename = "INTERNAL_ERROR")]
    InternalError,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ErrorCategory {
    #[serde(rename = "administration")]
    Administration,
    #[serde(rename = "connection")]
    Connection,
    #[serde(rename = "tls")]
    Tls,
    #[serde(rename = "database")]
    Database,
    #[serde(rename = "validation")]
    Validation,
    #[serde(rename = "runtime")]
    Runtime,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TlsMode {
    #[serde(rename = "strict")]
    Strict,
    #[serde(rename = "legacy")]
    Legacy,
    #[serde(rename = "unconfigured")]
    Unconfigured,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ProfileTlsMode {
    #[serde(rename = "strict")]
    Strict,
    #[serde(rename = "legacy")]
    Legacy,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ApplicationId {
    #[serde(rename = "base_python_angular")]
    BasePythonAngular,
    #[serde(rename = "base_tauri_angular")]
    BaseTauriAngular,
    #[serde(rename = "base_wails_angular")]
    BaseWailsAngular,
    #[serde(rename = "hra_dashboard_resultados")]
    HraDashboardResultados,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum EnvironmentName {
    #[serde(rename = "development")]
    Development,
    #[serde(rename = "testing")]
    Testing,
    #[serde(rename = "staging")]
    Staging,
    #[serde(rename = "production")]
    Production,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AdminSessionState {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "expired")]
    Expired,
    #[serde(rename = "revoked")]
    Revoked,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AdminScope {
    #[serde(rename = "sql.configuration")]
    SqlConfiguration,
    #[serde(rename = "maintenance")]
    Maintenance,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DatabaseCapability {
    #[serde(rename = "common")]
    Common,
    #[serde(rename = "id11-dashboard")]
    Id11Dashboard,
    #[serde(rename = "etl-reports")]
    EtlReports,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SpecificationStatus {
    #[serde(rename = "metadata_only")]
    MetadataOnly,
    #[serde(rename = "specification_complete")]
    SpecificationComplete,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum CompletionState {
    #[serde(rename = "pending_specification")]
    PendingSpecification,
    #[serde(rename = "complete")]
    Complete,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SafeErrorV1 {
    pub code: ErrorCode,
    pub category: ErrorCategory,
    pub retryable: bool,
    pub message_key: String,
    pub message_params: BTreeMap<String, Value>,
    pub stage: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ResolvedPeriodV1 {
    pub month: u8,
    pub year: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ResultMetaV1 {
    pub database_contract: Option<String>,
    pub resolved_period: Option<ResolvedPeriodV1>,
    pub tls_mode: TlsMode,
    pub duration_ms: u64,
    pub operation_stage: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ResultEnvelopeV1<T> {
    pub contract_version: String,
    pub request_id: String,
    pub ok: bool,
    pub data: Option<T>,
    pub error: Option<SafeErrorV1>,
    pub meta: ResultMetaV1,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ConnectionProfileV1 {
    pub schema_version: u8,
    pub profile_id: String,
    pub application_id: ApplicationId,
    pub environment: EnvironmentName,
    pub server: String,
    pub port: u16,
    pub database: String,
    pub user: String,
    pub tls_mode: ProfileTlsMode,
    pub credential_ref: String,
    pub legacy_tls_policy_ref: Option<String>,
    pub revision: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AdminSessionV1 {
    pub schema_version: u8,
    pub session_id: String,
    pub application_id: ApplicationId,
    pub state: AdminSessionState,
    pub issued_at: String,
    pub expires_at: String,
    pub ttl_seconds: u16,
    pub scopes: Vec<AdminScope>,
    pub process_bound: bool,
    pub persistable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DatabaseManifestV1 {
    pub schema_version: u8,
    pub contract_version: String,
    pub manifest_version: String,
    pub capability: DatabaseCapability,
    pub specification_status: SpecificationStatus,
    pub owner: String,
    pub database_engine: String,
    pub compatibility: BTreeMap<String, Option<String>>,
    pub conventions: BTreeMap<String, Value>,
    pub completion: BTreeMap<String, CompletionState>,
    pub operations: Vec<Value>,
}
