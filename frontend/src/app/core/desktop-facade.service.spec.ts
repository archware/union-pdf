import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  DesktopFacadeService,
  INVOCADOR_ESCRITORIO,
  InvocadorEscritorio,
} from './desktop-facade.service';
import type {
  EstadoSistemaDto,
  MetadatosArchivoPdfDto,
  PeticionUnirPdfsDto,
  RespuestaSistemaV1,
} from '../../../contracts/generated/typescript/contracts';

describe('DesktopFacadeService', () => {
  let mockInvocador: InvocadorEscritorio;

  const mockEstado: RespuestaSistemaV1<EstadoSistemaDto> = {
    versionContrato: 'hra.desktop.respuesta-sistema.v1',
    identificadorSolicitud: 'req-test-1',
    correcto: true,
    datos: {
      nombreAplicacion: 'union-pdf',
      version: '0.3.0',
      entorno: 'desarrollo',
      plataforma: 'windows',
      runtime: 'tauri-v1.5',
    },
    error: null,
    metadatos: {
      duracionMs: 1,
      etapaOperacion: 'completado',
    },
  };

  beforeEach(() => {
    mockInvocador = vi.fn().mockImplementation(async (cmd: string) => {
      if (cmd === 'obtener_estado_sistema') {
        return mockEstado;
      }
      return {
        versionContrato: 'hra.desktop.respuesta-sistema.v1',
        identificadorSolicitud: 'req-generic',
        correcto: true,
        datos: null,
        error: null,
        metadatos: { duracionMs: 0, etapaOperacion: 'completado' },
      };
    });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        DesktopFacadeService,
        { provide: INVOCADOR_ESCRITORIO, useValue: mockInvocador },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('obtiene el estado del sistema a traves del invocador IPC', async () => {
    const service = TestBed.inject(DesktopFacadeService);
    const resultado = await service.obtenerEstadoSistema();

    expect(mockInvocador).toHaveBeenCalledWith('obtener_estado_sistema');
    expect(resultado.correcto).toBe(true);
    expect(resultado.datos?.nombreAplicacion).toBe('union-pdf');
  });

  it('desenvuelve exitosamente una respuesta valida', () => {
    const service = TestBed.inject(DesktopFacadeService);
    const datos = service.desenvolver(mockEstado);

    expect(datos.nombreAplicacion).toBe('union-pdf');
    expect(datos.version).toBe('0.3.0');
  });

  it('lanza error al desenvolver una respuesta fallida', () => {
    const service = TestBed.inject(DesktopFacadeService);
    const respuestaFallo: RespuestaSistemaV1<null> = {
      versionContrato: 'hra.desktop.respuesta-sistema.v1',
      identificadorSolicitud: 'req-err-1',
      correcto: false,
      datos: null,
      error: {
        codigo: 'ARCHIVO_NO_ENCONTRADO',
        categoria: 'archivo',
        reintentable: false,
        claveMensaje: 'Archivo no existe',
        parametrosMensaje: {},
        etapa: 'lectura',
      },
      metadatos: {
        duracionMs: 2,
        etapaOperacion: 'error',
      },
    };

    expect(() => service.desenvolver(respuestaFallo)).toThrowError(
      /ARCHIVO_NO_ENCONTRADO/
    );
  });

  it('lanza error al intentar desenvolver una respuesta correcta sin datos', () => {
    const service = TestBed.inject(DesktopFacadeService);
    const respuestaSinDatos: any = {
      versionContrato: 'hra.desktop.respuesta-sistema.v1',
      identificadorSolicitud: 'req-err-2',
      correcto: true,
      datos: null,
      error: null,
      metadatos: { duracionMs: 1, etapaOperacion: 'completado' },
    };

    expect(() => service.desenvolver(respuestaSinDatos)).toThrowError(
      /operacion correcta sin datos/
    );
  });

  it('inspecciona un archivo PDF invocando el comando con rutaArchivo', async () => {
    const service = TestBed.inject(DesktopFacadeService);
    await service.inspeccionarArchivoPdf('C:/documentos/prueba.pdf');

    expect(mockInvocador).toHaveBeenCalledWith('inspeccionar_archivo_pdf', {
      rutaArchivo: 'C:/documentos/prueba.pdf',
    });
  });

  it('une archivos PDF invocando el comando con el dto de peticion', async () => {
    const service = TestBed.inject(DesktopFacadeService);
    const peticion: PeticionUnirPdfsDto = {
      segmentos: [
        {
          rutaArchivo: 'C:/doc1.pdf',
          paginasIncluidas: [1, 2],
        },
      ],
      rutaDestino: 'C:/salida.pdf',
    };
    await service.unirArchivosPdf(peticion);

    expect(mockInvocador).toHaveBeenCalledWith('unir_archivos_pdf', { peticion });
  });

  it('selecciona archivos PDF invocando seleccionar_archivos_pdf', async () => {
    const service = TestBed.inject(DesktopFacadeService);
    await service.seleccionarArchivosPdf();

    expect(mockInvocador).toHaveBeenCalledWith('seleccionar_archivos_pdf');
  });

  it('detecta correctamente si esta o no en modo escritorio', () => {
    const service = TestBed.inject(DesktopFacadeService);
    const originalTauri = (window as any).__TAURI__;
    const originalInternals = (window as any).__TAURI_INTERNALS__;
    const originalInvoke = (window as any).__TAURI_INVOKE__;

    try {
      delete (window as any).__TAURI__;
      delete (window as any).__TAURI_INTERNALS__;
      delete (window as any).__TAURI_INVOKE__;
      expect(service.estaEnModoEscritorio()).toBe(false);

      (window as any).__TAURI__ = { invoke: vi.fn() };
      expect(service.estaEnModoEscritorio()).toBe(true);

      delete (window as any).__TAURI__;
      (window as any).__TAURI_INTERNALS__ = { invoke: vi.fn() };
      expect(service.estaEnModoEscritorio()).toBe(true);

      delete (window as any).__TAURI_INTERNALS__;
      (window as any).__TAURI_INVOKE__ = vi.fn();
      expect(service.estaEnModoEscritorio()).toBe(true);
    } finally {
      (window as any).__TAURI__ = originalTauri;
      (window as any).__TAURI_INTERNALS__ = originalInternals;
      (window as any).__TAURI_INVOKE__ = originalInvoke;
    }
  });

  it('usa fallback estructurado cuando se ejecuta fuera del entorno nativo', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        DesktopFacadeService,
      ],
    });

    const originalTauri = (window as any).__TAURI__;
    const originalInternals = (window as any).__TAURI_INTERNALS__;
    const originalInvoke = (window as any).__TAURI_INVOKE__;

    try {
      delete (window as any).__TAURI__;
      delete (window as any).__TAURI_INTERNALS__;
      delete (window as any).__TAURI_INVOKE__;

      const service = TestBed.inject(DesktopFacadeService);
      const resultado = await service.obtenerEstadoSistema();

      expect(resultado.correcto).toBe(false);
      expect(resultado.versionContrato).toBe('hra.desktop.respuesta-sistema.v1');
      expect(resultado.error?.codigo).toBe('ENTORNO_EJECUCION_NO_DISPONIBLE');
    } finally {
      (window as any).__TAURI__ = originalTauri;
      (window as any).__TAURI_INTERNALS__ = originalInternals;
      (window as any).__TAURI_INVOKE__ = originalInvoke;
    }
  });
});
