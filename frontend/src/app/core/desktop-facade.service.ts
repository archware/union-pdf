import { Inject, Injectable, InjectionToken } from '@angular/core';
import type {
  EstadoSistemaDto,
  MetadatosArchivoPdfDto,
  PeticionUnirPdfsDto,
  ResultadoUnirPdfsDto,
  RespuestaSistemaV1,
} from '../../../contracts/generated/typescript/contracts';
import { desenvolverRespuestaSistema } from '../../../contracts/generated/typescript/contracts';

export type {
  EstadoSistemaDto,
  MetadatosArchivoPdfDto,
  PeticionUnirPdfsDto,
  ResultadoUnirPdfsDto,
  RespuestaSistemaV1,
};

export type InvocadorEscritorio = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

interface SuperficieInvocacion {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
}

interface VentanaTauri {
  __TAURI_INTERNALS__?: Partial<SuperficieInvocacion>;
  __TAURI__?: Partial<SuperficieInvocacion>;
  __TAURI_INVOKE__?: SuperficieInvocacion['invoke'];
}

function ventanaTauri(): VentanaTauri | null {
  return typeof window === 'undefined' ? null : (window as unknown as VentanaTauri);
}

export const INVOCADOR_ESCRITORIO = new InjectionToken<InvocadorEscritorio>(
  'INVOCADOR_ESCRITORIO',
  {
    providedIn: 'root',
    factory: () => {
      const win = ventanaTauri();
      if (win) {
        const internos = win.__TAURI_INTERNALS__;
        if (internos && typeof internos.invoke === 'function') {
          return internos.invoke.bind(internos) as InvocadorEscritorio;
        }
        const tauriGlobal = win.__TAURI__;
        if (tauriGlobal && typeof tauriGlobal.invoke === 'function') {
          return tauriGlobal.invoke.bind(tauriGlobal) as InvocadorEscritorio;
        }
        if (typeof win.__TAURI_INVOKE__ === 'function') {
          return win.__TAURI_INVOKE__.bind(win) as InvocadorEscritorio;
        }
      }
      return async <T>(cmd: string, _args?: Record<string, unknown>): Promise<T> => {
        return {
          versionContrato: 'hra.desktop.respuesta-sistema.v1',
          identificadorSolicitud: 'web-fallback',
          correcto: false,
          datos: null,
          error: {
            codigo: 'ENTORNO_EJECUCION_NO_DISPONIBLE',
            categoria: 'entornoEjecucion',
            reintentable: false,
            claveMensaje: `El comando ${cmd} no esta disponible fuera del runtime nativo`,
            parametrosMensaje: {},
            etapa: 'invocacion',
          },
          metadatos: {
            duracionMs: 0,
            etapaOperacion: 'error',
          },
        } as unknown as T;
      };
    },
  },
);

@Injectable({ providedIn: 'root' })
export class DesktopFacadeService {
  constructor(
    @Inject(INVOCADOR_ESCRITORIO)
    private readonly invocador: InvocadorEscritorio,
  ) {}

  estaEnModoEscritorio(): boolean {
    const win = ventanaTauri();
    return Boolean(win && (win.__TAURI_INTERNALS__ || win.__TAURI__ || typeof win.__TAURI_INVOKE__ === 'function'));
  }

  async obtenerEstadoSistema(): Promise<RespuestaSistemaV1<EstadoSistemaDto>> {
    return this.invocador<RespuestaSistemaV1<EstadoSistemaDto>>('obtener_estado_sistema');
  }

  async inspeccionarArchivoPdf(
    rutaArchivo: string,
  ): Promise<RespuestaSistemaV1<MetadatosArchivoPdfDto>> {
    return this.invocador<RespuestaSistemaV1<MetadatosArchivoPdfDto>>('inspeccionar_archivo_pdf', {
      rutaArchivo,
    });
  }

  async unirArchivosPdf(
    peticion: PeticionUnirPdfsDto,
  ): Promise<RespuestaSistemaV1<ResultadoUnirPdfsDto>> {
    return this.invocador<RespuestaSistemaV1<ResultadoUnirPdfsDto>>('unir_archivos_pdf', {
      peticion,
    });
  }

  async seleccionarArchivosPdf(): Promise<RespuestaSistemaV1<string[]>> {
    return this.invocador<RespuestaSistemaV1<string[]>>('seleccionar_archivos_pdf');
  }

  desenvolver<T>(respuesta: RespuestaSistemaV1<T>): T {
    return desenvolverRespuestaSistema(respuesta);
  }
}
