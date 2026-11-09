// Contratos generados y formalizados para la frontera IPC de pdf-tool.
// Conforme a DOCTRINA_ESCRITORIO.md y RespuestaSistemaV1<T>.

export interface ErrorSistemaV1 {
  readonly codigo: string;
  readonly categoria: 'administracion' | 'sistema' | 'archivo' | 'validacion' | 'entornoEjecucion';
  readonly reintentable: boolean;
  readonly claveMensaje: string;
  readonly parametrosMensaje: Readonly<Record<string, unknown>>;
  readonly etapa: string;
}

export interface MetadatosSistemaV1 {
  readonly duracionMs: number;
  readonly etapaOperacion: string;
}

export interface RespuestaSistemaV1<T = unknown> {
  readonly versionContrato: 'hra.desktop.respuesta-sistema.v1';
  readonly identificadorSolicitud: string;
  readonly correcto: boolean;
  readonly datos: T | null;
  readonly error: ErrorSistemaV1 | null;
  readonly metadatos: MetadatosSistemaV1;
}

export interface EstadoSistemaDto {
  readonly nombreAplicacion: string;
  readonly version: string;
  readonly entorno: string;
  readonly plataforma: string;
  readonly runtime: string;
}

export interface PaginaDocumentoPdfDto {
  readonly indice: number;
  readonly rotacion: number;
  readonly ancho: number;
  readonly alto: number;
  readonly excluida: boolean;
}

export interface MetadatosArchivoPdfDto {
  readonly rutaArchivo: string;
  readonly nombreArchivo: string;
  readonly tamanoBytes: number;
  readonly cantidadPaginas: number;
  readonly esProtegido: boolean;
  readonly paginas: readonly PaginaDocumentoPdfDto[];
}

export interface SegmentoArchivoPeticionDto {
  readonly rutaArchivo: string;
  readonly paginasIncluidas: readonly number[];
  readonly rotaciones?: readonly number[];
}

export interface PeticionUnirPdfsDto {
  readonly segmentos: readonly SegmentoArchivoPeticionDto[];
  readonly rutaDestino: string;
}

export interface ResultadoUnirPdfsDto {
  readonly rutaDestino: string;
  readonly totalPaginas: number;
  readonly tamanoBytes: number;
}

export function desenvolverRespuestaSistema<T>(respuesta: RespuestaSistemaV1<T>): T {
  if (!respuesta || respuesta.versionContrato !== 'hra.desktop.respuesta-sistema.v1') {
    throw new Error('Violacion de contrato IPC: versionContrato invalida o faltante.');
  }
  if (!respuesta.correcto) {
    const error = respuesta.error;
    const mensaje = error?.claveMensaje || error?.codigo || 'Operacion nativa fallida sin detalle';
    throw new Error(`[${error?.codigo ?? 'ERROR_DESCONOCIDO'}] ${mensaje}`);
  }
  if (respuesta.datos === null || respuesta.datos === undefined) {
    throw new Error('Violacion de contrato IPC: operacion correcta sin datos.');
  }
  return respuesta.datos;
}
