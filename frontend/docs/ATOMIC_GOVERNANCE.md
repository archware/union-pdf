# Política obligatoria Atomic-first

> Marcador normativo: `ATOMIC_GOVERNANCE_REQUIRED`
>
> Versión de política: `1.2.3`

Este documento es un contrato, no una recomendación. `-Atomic-UI` es la única
fuente de verdad para átomos, moléculas, organismos, superficies, plantillas,
tokens y patrones visuales reutilizables de todas las aplicaciones consumidoras.

## Invariantes

1. Ningún objeto visual reutilizable nace en una aplicación consumidora.
2. Si un objeto no existe, el trabajo visual se detiene en el consumidor: se
   crea, prueba, documenta y valida primero en `-Atomic-UI`.
3. Solo después de quedar verde en Atomic puede propagarse al consumidor.
4. Cada componente local debe figurar en `docs/atomic-provenance.json` con su
   ruta fuente. El manifiesto debe fijar la referencia Git, la versión y la
   huella SHA-256 del árbol de fuentes Atomic.
5. Una copia `exact` debe conservar hashes idénticos. Una copia `adapted` exige
   una justificación concreta y un registro de decisión versionado.
6. Las features no pueden recrear botones, diálogos, tablas ni controles de
   formulario nativos, ni aplicar CSS sobre su estructura interna.
7. Los estilos visuales deben usar tokens Atomic; quedan prohibidos estilos
   inline y colores fijos en features o componentes UI consumidores.
8. `npm run check:atomic` es obligatorio antes de pruebas y build, y en CI.
9. Queda prohibido el uso de píxeles hardcodeados (`px`) en reglas CSS de consumidores (`width: 220px`, `padding: 20px`); se deben utilizar obligatoriamente Design Tokens (`var(--space-*)`, `var(--radius-*)`).
10. El layer base de Tokens debe estilizar los scrollbars globales (`::-webkit-scrollbar`) para evitar que el navegador renderice la barra gris nativa en temas oscuros, y los organismos de tablas no pueden imponer scrollbars anidados compitiendo contra el layout global.
11. (Política 1.1.0) Las plantillas y estilos embebidos en archivos `.ts` de
    features quedan sujetos al mismo escaneo que `.html`/`.css`: sin primitivas
    visuales nativas, sin `style=` inline en el marcado, sin colores fijos y
    sin negaciones inválidas de tokens (`-var(...)`; la forma correcta es
    `calc(-1 * var(...))`). Los archivos `*.spec.ts` quedan exentos.
12. (Política 1.2.0) Los servicios de presentación compartidos quedan gobernados.
    El manifiesto debe declarar `governedServices` con `theme.service.ts`,
    `app-version.service.ts`, `modal.service.ts`, `popup.service.ts` y
    `toast.service.ts` (rutas `<uiRoot>/services/` en el consumidor y
    `src/app/shared/ui/services/` en Atomic), cada uno exactamente una vez y en
    una de dos modalidades: `exact` exige hash idéntico entre copia local y
    fuente Atomic; `adapted` exige un snapshot (`localSha256`/`atomicSha256`)
    que debe coincidir con ambos archivos reales — toda deriva local o cambio
    de la fuente Atomic invalida el snapshot y bloquea el gate. Servicios
    adicionales declarados se verifican con las mismas reglas.
13. (Política 1.2.1) El shell de la aplicación es superficie gobernada. El
    manifiesto debe declarar `shellRoot` (p. ej. `src/app`) y el gate escanea
    los archivos directos de ese directorio (`.ts`/`.html`/`.css`/`.scss`;
    `*.spec.ts` exentos; no recursivo) con las mismas reglas que las features:
    sin primitivas visuales nativas, sin `style=` inline (incluidas plantillas
    embebidas en `.ts`), sin colores fijos y sin fragmentos `NNvar(` ni
    `-var(`. Motivo: un estilo inline con token fantasma
    `var(--surface-base, #f8fafc)` en el shell del tablero rompió el modo
    oscuro porque `app.component.ts` no pertenecía a ningún `featureRoot`.
14. (Política 1.2.2) Toda comparación y todo snapshot SHA-256 de artefactos,
    componentes y servicios gobernados usa `git-clean-eol-v1`. Cada archivo se
    evalúa con atributos versionados y una configuración Git neutral: el texto
    debe resolver a `text=auto|set` con `eol=crlf` y se representa con LF; el
    binario debe declarar `-text` y conserva exactamente sus bytes. Solo se
    acepta identidad o la transformación exacta CRLF a LF. Los atributos
    globales y de sistema se neutralizan; `.git/info/attributes` no puede
    aportar reglas. Los
    atributos `filter`, `ident` y `working-tree-encoding`, las transformaciones
    `clean` adicionales, las rutas externas, los enlaces y los archivos sin
    repositorio Git se rechazan de forma cerrada. El manifiesto debe declarar
    `contentCanonicalization` y el helper canónico debe permanecer como
    artefacto de gobierno inmutable.
15. (Política 1.2.2) `atomicRef` debe ser un OID Git completo de 40 caracteres
    para SHA-1 o 64 para SHA-256, según el formato del repositorio, y coincidir
    exactamente con `HEAD` del checkout Atomic usado por el gate.
    Los archivos gobernados, el manifiesto de fuentes y la versión deben
    existir en ese commit y permanecer limpios. Cambios auxiliares fuera de
    esas rutas no bloquean la compuerta. `atomicRemote` debe ser exactamente
    `archware/-Atomic-UI`. El workflow aplica acceso de solo lectura, no
    persiste credenciales, ejecuta primero el gate del checkout Atomic fijado y
    mantiene `ATOMIC_UI_ROOT` durante toda la verificación. El ruleset externo
    de la rama protegida debe exigir ese workflow: una solicitud no puede usar
    su propia copia modificada como prueba de que el verificador no fue degradado.

## Lo que sí pertenece al consumidor

Las páginas, navegación, permisos, contratos API, estado, validación y reglas de
negocio se implementan en la aplicación. Su interfaz se compone con objetos del
ADN Atomic. Un layout específico puede existir en una feature siempre que no se
convierta en un segundo sistema visual ni duplique un componente reutilizable.
No ampara reconstruir cabeceras, acciones, tablas, detalle o pies de modal con
marcado/CSS propio cuando corresponden a una plantilla Atomic.

## Preservación visual (política 1.2.3)

Un patrón útil observado en un consumidor se inventaría y se promueve primero
al ADN, con API tipada, estilos externos, tokens, catálogo y pruebas. No se
elimina antes de disponer de un reemplazo validado. Una corrección funcional
no autoriza cambiar iconos, colores, densidad ni geometría sin requisito.
Los bindings, validaciones, DTO, HTTP y permisos permanecen en el producto.
Las listas semánticas de detalle y la estructura reutilizable viven en Atomic,
no en formularios deshabilitados ni en composiciones visuales locales.

Las variantes nuevas conservan los valores predeterminados anteriores cuando
su cambio afectaría a otros flujos. El perfil `catalog` de acciones mantiene
los iconos compactos de consulta, edición y baja. La revisión visual autorizada
ATOMIC-20260929-005 distingue consulta (ojo neutro) de activación (marca verde);
edición conserva lápiz azul y baja `fa-trash` roja. No cambia el perfil standard
ni declara actualizadas las copias de política instaladas en consumidores.
Cerrar/Cancelar es neutro, nunca `secondary` por su color de marca.

Comparar antes/después, estados, foco, teclado y tamaños; un build o un gate
estático no certifica fidelidad visual. Preservar pruebas y adaptaciones al
propagar. Distinguir raíz Git y raíz de producto: no instalar en la raíz
compartida como atajo. La fuente debe seguir siendo limpia, verificable y
recuperable; esta revisión no rebaja los invariantes 14 y 15.

## Flujo obligatorio

1. Buscar el objeto en `-Atomic-UI/src/app/shared/ui` y en su barrel `index.ts`.
2. Si falta, crearlo en la capa Atomic correcta y agregar sus tokens.
3. Añadir pruebas de contrato, accesibilidad y responsive en Atomic.
4. Ejecutar pruebas, auditoría de tokens, gate de gobierno y build de Atomic.
5. Propagar el objeto; registrar procedencia, modo y archivos exactos.
6. Ejecutar `npm run check:atomic`, pruebas, build y E2E del consumidor.
7. Actualizar changelogs de fuente y consumidor con el mismo identificador.

## Excepciones

No existen excepciones silenciosas. Toda adaptación debe conservar la fuente
Atomic, declarar `justification` y enlazar un `decisionRecord`. Modificar o
desactivar el gate desde un consumidor constituye una violación: cualquier
cambio de política se realiza primero en `-Atomic-UI` y se propaga como una
nueva versión normativa.
