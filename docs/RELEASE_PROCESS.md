# Proceso de Lanzamiento - pdf-tool

## 1. Introducción

Este documento detalla el proceso completo para realizar lanzamientos del proyecto `pdf-tool`, asegurando consistencia, calidad y seguridad en cada versión publicada.

## 2. Requisitos Previos

- Acceso a GitHub con permisos de escritura
- Tag válido creado en el repositorio
- Compilación exitosa del proyecto
- Verificación completa de todos los controles

## 3. Flujo de Lanzamiento

### 3.1 Preparación del Lanzamiento

1. **Verificar estado del repositorio:**
   ```bash
   git status
   git log --oneline -5
   ```

2. **Ejecutar verificación completa:**
   ```bash
   powershell -ExecutionPolicy Bypass -File scripts/verificar-todo.ps1
   ```

3. **Compilar el proyecto:**
   ```bash
   powershell -ExecutionPolicy Bypass -File scripts/probar-compilacion.ps1
   ```

### 3.2 Creación del Tag

1. **Crear tag anotado:**
   ```bash
   git tag -a v0.5.2 -m "release: union-pdf v0.5.2"
   ```

2. **Verificar tag creado:**
   ```bash
   git tag -l
   ```

### 3.3 Publicación del Lanzamiento

1. **Subir cambios al repositorio:**
   ```bash
   git push origin main
   git push origin v0.5.2
   ```

2. **Activar workflow manualmente en GitHub:**
   - Acceder a https://github.com/archware/union-pdf
   - Ir a la pestaña "Actions"
   - Seleccionar "Release Multiplataforma (Windows, macOS, Linux)"
   - Hacer clic en "Run workflow" y confirmar

## 4. Verificación Post-Lanzamiento

1. **Verificar ejecución del workflow:**
   - Confirmar que todos los jobs se completan exitosamente
   - Verificar que los artefactos son publicados en GitHub Releases

2. **Validar binarios:**
   ```bash
   # Verificar existencia de binarios
   ls src-tauri/target/release/
   ```

## 5. Documentación de Problemas Comunes

### 5.1 Error en Workflow de GitHub Actions

**Problema:** Sintaxis incorrecta en YAML del workflow.

**Solución:**
- Verificar que dentro de `${{ }}` solo se usan comillas simples
- Usar comillas dobles para envolver la línea YAML completa
- Ejemplo correcto:
  ```yaml
  name: "Unión PDF ${{ github.ref_type == 'tag' && github.ref_name || inputs.tag_version || 'v0.5.1' }}"
  ```

### 5.2 Compilación Fallida

**Solución:**
- Verificar que se ejecuta `scripts/verificar-todo.ps1` antes de compilar
- Asegurar que no hay cambios en `tauri.conf.json`
- Confirmar que se tienen todas las dependencias instaladas

## 6. Checklist de Lanzamiento

- [ ] Repositorio limpio y sin cambios pendientes
- [ ] Todos los tests pasan exitosamente
- [ ] Compilación exitosa del binario final
- [ ] Tag creado correctamente
- [ ] Workflow activado manualmente en GitHub
- [ ] Artefactos publicados en GitHub Releases
- [ ] Verificación de integridad de binarios

## 7. Responsabilidades

- **Autor:** Ing. Havel CONTRERAS TAPAHUASCO (@archware)
- **Revisión:** Todos los colaboradores del proyecto
- **Aprobación:** Solo el dueño autorizado puede aprobar lanzamientos

## 8. Contacto

Para consultas sobre este proceso, contactar a:
havel363@gmail.com