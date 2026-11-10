# Checklist de Seguridad - pdf-tool

## 1. Introducción

Este checklist proporciona las verificaciones necesarias para garantizar la seguridad y consistencia en los lanzamientos del proyecto `pdf-tool`.

## 2. Verificaciones Pre-Lanzamiento

### 2.1 Estado del Repositorio
- [ ] El repositorio está limpio (no hay cambios pendientes)
- [ ] Todos los tests pasan exitosamente
- [ ] Compilación exitosa del binario final
- [ ] No hay archivos temporales o de cache en el repositorio

### 2.2 Verificación de Código
- [ ] No se han modificado archivos críticos (`tauri.conf.json`, `Cargo.toml`)
- [ ] Todos los cambios están correctamente commitados
- [ ] Se ha verificado la integridad del hash de configuración
- [ ] No hay secretos o credenciales en el código

### 2.3 Verificación de Binarios
- [ ] El binario compilado existe y tiene tamaño mayor a 0 bytes
- [ ] El hash del binario coincide con el esperado
- [ ] Se ha verificado la integridad del ejecutable
- [ ] No hay archivos maliciosos o modificados

## 3. Proceso de Lanzamiento Seguro

### 3.1 Creación de Tag
- [ ] El tag se crea con mensaje descriptivo y consistente
- [ ] El tag apunta al commit correcto
- [ ] Se ha verificado que el tag no existe previamente
- [ ] Se ha confirmado la fecha y hora del lanzamiento

### 3.2 Publicación en GitHub
- [ ] El workflow se activa manualmente desde la interfaz web
- [ ] Todos los jobs del workflow completan exitosamente
- [ ] Los artefactos son publicados correctamente
- [ ] Se verifica que los binarios son los esperados

## 4. Verificaciones Post-Lanzamiento

### 4.1 Validación de Artefactos
- [ ] Los binarios para todas las plataformas están disponibles
- [ ] Se ha verificado la integridad de cada artefacto
- [ ] Los nombres de los archivos son correctos
- [ ] Las versiones coinciden con el tag publicado

### 4.2 Seguridad del Proceso
- [ ] No se han introducido cambios en el código fuente sin revisión
- [ ] Se ha mantenido la integridad del proyecto original
- [ ] No hay modificaciones no autorizadas al workflow
- [ ] Se ha preservado la identidad de autoría institucional

## 5. Documentación y Registro

### 5.1 Registro de Lanzamiento
- [ ] El lanzamiento está documentado en `CHANGELOG.md`
- [ ] Se ha registrado el proceso en `docs/CONTINUIDAD_AGENTES.md`
- [ ] Se han actualizado los archivos de versión correspondientes
- [ ] Se ha guardado la evidencia del proceso

## 6. Responsabilidades

### 6.1 Autor del Lanzamiento
- [ ] Verificar que todos los pasos se han completado correctamente
- [ ] Confirmar que el proceso sigue las reglas institucionales
- [ ] Documentar cualquier excepción o problema encontrado
- [ ] Asegurar que no hay errores de seguridad

### 6.2 Revisión del Proceso
- [ ] Otro colaborador revisa el proceso completado
- [ ] Se confirma la integridad del lanzamiento
- [ ] Se verifican los artefactos publicados
- [ ] Se asegura que se mantienen las buenas prácticas

## 7. Notas Importantes

- Este checklist debe ser completado antes de cada lanzamiento
- Cualquier discrepancia debe ser investigada y resuelta antes de continuar
- El proceso debe seguir estrictamente las reglas definidas en `AGENTS.md`
- Todos los cambios deben estar documentados en el historial del repositorio

## 8. Contacto

Para consultas sobre este checklist, contactar a:
havel363@gmail.com