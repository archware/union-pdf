import { Injectable, signal } from '@angular/core';

export interface AppVersionInfo {
  appName: string;
  version: string;
  environment: string;
  buildDate: string;
  isTauriNative: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AppVersionService {
  readonly versionInfo = signal<AppVersionInfo>({
    appName: 'HRA Base Tauri',
    version: 'v1.6.1',
    environment: 'BETA',
    buildDate: '',
    isTauriNative: false
  });

  constructor() {
    this.initVersion();
  }

  private async initVersion(): Promise<void> {
    try {
      // Opción A: Fallback estático desde environment.ts
      const envModule = await import('../../../../environments/environment').catch(() => null);
      if (envModule?.environment) {
        const env = envModule.environment;
        this.versionInfo.set({
          appName: env.appName || 'HRA Base Tauri',
          version: env.version?.startsWith('v') ? env.version : `v${env.version || '1.6.1'}`,
          environment: env.environment || 'BETA',
          buildDate: env.buildDate || '',
          isTauriNative: false
        });
      }

      // Opción B (Híbrida): Autodetectar versión directamente del ejecutable Tauri
      const tauriApp = await import('@tauri-apps/api/app').catch(() => null);
      if (tauriApp?.getVersion) {
        const nativeVer = await tauriApp.getVersion();
        if (nativeVer) {
          this.versionInfo.update((prev) => ({
            ...prev,
            version: nativeVer.startsWith('v') ? nativeVer : `v${nativeVer}`,
            isTauriNative: true
          }));
        }
      }
    } catch {
      // Fallback a entorno estático
    }
  }
}
