// Configure PDF.js worker from local assets
pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/js/vendor/pdf.worker.min.js';

// Initialize Lucide icons
lucide.createIcons();

// Application state
let uploadedFiles = [];
let globalPageOrder = [];
let selectedPageId = null;
let previewRenderToken = 0;

const pdfPreviewCache = new Map();
const pageThumbnailCache = new Map();

// DOM elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const listContainer = document.getElementById('list-container');
const fileListElements = document.getElementById('file-list-elements');
const fileCountBadge = document.getElementById('file-count');
const clearAllBtn = document.getElementById('clear-all-btn');
const mergeBtn = document.getElementById('merge-btn');
const statusPanel = document.getElementById('status-panel');

const viewerContainer = document.getElementById('visual-viewer-container');
const emptyViewer = document.getElementById('empty-viewer');
const viewerTitle = document.getElementById('viewer-title');
const thumbnailList = document.getElementById('thumbnail-list');
const thumbnailCount = document.getElementById('thumbnail-count');
const previewStage = document.getElementById('preview-stage');
const previewCanvas = document.getElementById('preview-canvas');
const previewPageTitle = document.getElementById('preview-page-title');
const previewPageSubtitle = document.getElementById('preview-page-subtitle');
const previewToggleBtn = document.getElementById('preview-toggle-btn');
const previewUpBtn = document.getElementById('preview-up-btn');
const previewDownBtn = document.getElementById('preview-down-btn');

// Drag-and-drop and file selectors
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragover');

    if (event.dataTransfer.files.length > 0) {
        processFiles(event.dataTransfer.files);
    }
});

clearAllBtn.addEventListener('click', () => {
    uploadedFiles = [];
    globalPageOrder = [];
    selectedPageId = null;
    previewRenderToken += 1;
    pdfPreviewCache.clear();
    pageThumbnailCache.clear();

    updateUI();
    renderVisualViewer();
    hideStatus();
});

mergeBtn.addEventListener('click', mergeSelectedPDFs);

previewToggleBtn.addEventListener('click', () => {
    if (selectedPageId) {
        togglePageActive(selectedPageId);
    }
});

previewUpBtn.addEventListener('click', (event) => {
    if (selectedPageId) {
        movePagePosition(selectedPageId, -1, event);
    }
});

previewDownBtn.addEventListener('click', (event) => {
    if (selectedPageId) {
        movePagePosition(selectedPageId, 1, event);
    }
});

let resizeTimer = null;
window.addEventListener('resize', () => {
    if (!selectedPageId) {
        return;
    }

    if (resizeTimer) {
        clearTimeout(resizeTimer);
    }

    resizeTimer = setTimeout(() => {
        const pageIndex = buildPageIndex();
        const entry = pageIndex.get(selectedPageId);
        if (entry) {
            renderSelectedPageCanvas(entry);
        }
    }, 120);
});

function handleFileSelect(event) {
    if (event.target.files.length > 0) {
        processFiles(event.target.files);
        fileInput.value = '';
    }
}

async function processFiles(files) {
    const pdfFiles = Array.from(files).filter((file) => file.type === 'application/pdf');

    if (pdfFiles.length === 0 && files.length > 0) {
        showStatus('Por favor, selecciona unicamente archivos con extension .pdf', 'error');
        return;
    }

    showStatus('Cargando y analizando archivos...', 'loading');

    try {
        for (const file of pdfFiles) {
            const tempBuffer = await file.arrayBuffer();
            let pageCount = 0;

            try {
                const pdfDoc = await PDFLib.PDFDocument.load(tempBuffer, { ignoreEncryption: true });
                pageCount = pdfDoc.getPageCount();
            } catch (loadError) {
                showStatus(`El archivo "${file.name}" esta danado, protegido o tiene restricciones severas.`, 'error');
                continue;
            }

            const fileId = crypto.randomUUID();
            const pages = Array.from({ length: pageCount }, (_, index) => ({
                id: crypto.randomUUID(),
                pageNum: index + 1,
                active: true
            }));

            uploadedFiles.push({
                id: fileId,
                fileObject: file,
                name: file.name,
                size: formatBytes(file.size),
                pageCount: pageCount,
                pagesToKeep: pageCount > 0 ? `1-${pageCount}` : '',
                pages: pages
            });

            globalPageOrder.push(...pages.map((page) => page.id));
        }

        syncGlobalPageOrder();

        if (!selectedPageId || !globalPageOrder.includes(selectedPageId)) {
            selectedPageId = globalPageOrder.length > 0 ? globalPageOrder[0] : null;
        }

        updateUI();
        await renderVisualViewer(true);
        hideStatus();
    } catch (error) {
        console.error(error);
        showStatus('Ocurrio un error al cargar los archivos.', 'error');
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileBadgeText(file) {
    const activeCount = file.pages.filter((page) => page.active).length;
    if (activeCount < file.pageCount) {
        return `Conservando ${activeCount} de ${file.pageCount} pag.`;
    }
    return `${file.pageCount} ${file.pageCount === 1 ? 'pagina' : 'paginas'}`;
}

function updateUI() {
    if (uploadedFiles.length === 0) {
        listContainer.style.display = 'none';
        mergeBtn.innerHTML = '<i data-lucide="combine" style="width: 18px; height: 18px;"></i> Unir PDFs y Descargar';
        lucide.createIcons();
        return;
    }

    listContainer.style.display = 'flex';
    fileCountBadge.textContent = uploadedFiles.length;
    fileListElements.innerHTML = '';

    uploadedFiles.forEach((file) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.fileId = file.id;

        item.innerHTML = `
            <div class="file-main-info">
                <div class="file-info">
                    <i data-lucide="file-text" class="file-pdf-icon" style="width: 18px; height: 18px;"></i>
                    <div class="file-details">
                        <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
                        <div class="file-size">${file.size} • <span class="page-count-badge-text" id="badge-${file.id}">${getFileBadgeText(file)}</span></div>
                    </div>
                </div>
                <div class="file-actions">
                    <button type="button" class="action-btn btn-delete" onclick="removeItem('${file.id}', event)" title="Eliminar archivo">
                        <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </div>
            <div class="page-select-container">
                <label for="pages-${file.id}">
                    <i data-lucide="sliders-horizontal" style="width: 12px; height: 12px;"></i>
                    Rangos a conservar:
                </label>
                <input type="text"
                    id="pages-${file.id}"
                    class="page-input"
                    value="${file.pagesToKeep}"
                    placeholder="Ej: 1-3, 5"
                    oninput="updatePageInput('${file.id}', this.value)"
                >
            </div>
        `;

        fileListElements.appendChild(item);
    });

    if (uploadedFiles.length === 1) {
        mergeBtn.innerHTML = '<i data-lucide="scissors" style="width: 18px; height: 18px;"></i> Guardar PDF y Descargar';
    } else {
        mergeBtn.innerHTML = '<i data-lucide="combine" style="width: 18px; height: 18px;"></i> Unir, Ordenar y Descargar';
    }

    lucide.createIcons();
}

window.removeItem = function(id, event) {
    if (event) {
        event.stopPropagation();
    }

    const fileIndex = uploadedFiles.findIndex((file) => file.id === id);
    if (fileIndex < 0) {
        return;
    }

    const removedFile = uploadedFiles[fileIndex];
    const pageIds = removedFile.pages.map((page) => page.id);
    const pageIdSet = new Set(pageIds);

    uploadedFiles.splice(fileIndex, 1);
    globalPageOrder = globalPageOrder.filter((pageId) => !pageIdSet.has(pageId));

    pdfPreviewCache.delete(id);
    pageIds.forEach((pageId) => pageThumbnailCache.delete(pageId));

    if (selectedPageId && pageIdSet.has(selectedPageId)) {
        selectedPageId = null;
    }

    syncGlobalPageOrder();

    if (!selectedPageId || !globalPageOrder.includes(selectedPageId)) {
        selectedPageId = globalPageOrder.length > 0 ? globalPageOrder[0] : null;
    }

    updateUI();
    renderVisualViewer();
    hideStatus();
};

window.updatePageInput = function(id, value) {
    const file = uploadedFiles.find((entry) => entry.id === id);
    if (!file) {
        return;
    }

    file.pagesToKeep = value;
    const pageIndices = parsePageRange(value, file.pageCount);

    file.pages.forEach((page, index) => {
        page.active = pageIndices.includes(index);
    });

    const badge = document.getElementById(`badge-${file.id}`);
    if (badge) {
        badge.textContent = getFileBadgeText(file);
    }

    updateViewerTitle();
    refreshThumbnailStatuses();
    renderPreviewPanel();
};

function syncGlobalPageOrder() {
    const validPageIds = new Set();
    for (const file of uploadedFiles) {
        for (const page of file.pages) {
            validPageIds.add(page.id);
        }
    }

    globalPageOrder = globalPageOrder.filter((pageId) => validPageIds.has(pageId));

    const currentSet = new Set(globalPageOrder);
    for (const file of uploadedFiles) {
        for (const page of file.pages) {
            if (!currentSet.has(page.id)) {
                globalPageOrder.push(page.id);
                currentSet.add(page.id);
            }
        }
    }
}

function buildPageIndex() {
    const index = new Map();
    for (const file of uploadedFiles) {
        for (const page of file.pages) {
            index.set(page.id, { pageId: page.id, file, page });
        }
    }
    return index;
}

function getOrderedPageEntries() {
    const pageIndex = buildPageIndex();
    const orderedEntries = [];

    for (const pageId of globalPageOrder) {
        const entry = pageIndex.get(pageId);
        if (entry) {
            orderedEntries.push(entry);
        }
    }

    return orderedEntries;
}

function updateViewerTitle() {
    const totalPages = globalPageOrder.length;
    let activePages = 0;

    const pageIndex = buildPageIndex();
    for (const pageId of globalPageOrder) {
        const entry = pageIndex.get(pageId);
        if (entry && entry.page.active) {
            activePages += 1;
        }
    }

    viewerTitle.textContent = `Vista global de paginas (${activePages}/${totalPages} activas)`;
}

async function renderVisualViewer(showLoading = false) {
    if (uploadedFiles.length === 0) {
        viewerContainer.style.display = 'none';
        emptyViewer.style.display = 'flex';
        thumbnailList.innerHTML = '';
        thumbnailCount.textContent = '0';
        resetPreviewPanel();
        return;
    }

    syncGlobalPageOrder();

    if (!selectedPageId || !globalPageOrder.includes(selectedPageId)) {
        selectedPageId = globalPageOrder.length > 0 ? globalPageOrder[0] : null;
    }

    emptyViewer.style.display = 'none';
    viewerContainer.style.display = 'flex';

    updateViewerTitle();
    thumbnailCount.textContent = String(globalPageOrder.length);

    await renderThumbnailColumn(showLoading);
    refreshThumbnailSelection();
    refreshThumbnailStatuses();
    renderPreviewPanel();
}

async function renderThumbnailColumn(showLoading = false) {
    const orderedEntries = getOrderedPageEntries();

    if (orderedEntries.length === 0) {
        thumbnailList.innerHTML = '<div class="thumbnail-empty">No hay hojas disponibles para mostrar.</div>';
        return;
    }

    if (showLoading) {
        thumbnailList.innerHTML = '<div class="thumbnail-empty">Cargando miniaturas...</div>';
    } else {
        thumbnailList.innerHTML = '';
    }

    const fragment = document.createDocumentFragment();
    orderedEntries.forEach((entry) => {
        fragment.appendChild(createThumbnailCard(entry));
    });

    thumbnailList.innerHTML = '';
    thumbnailList.appendChild(fragment);

    const thumbnailTasks = orderedEntries.map((entry) => loadThumbnailIntoCard(entry));
    await Promise.allSettled(thumbnailTasks);
}

function createThumbnailCard(entry) {
    const { file, page } = entry;
    const card = document.createElement('div');
    card.className = `thumbnail-item ${page.active ? 'active' : 'discarded'}`;
    card.dataset.pageId = page.id;
    card.dataset.fileId = file.id;
    card.title = `${file.name} - Pag. ${page.pageNum}`;

    card.innerHTML = `
        <div class="thumb-preview-shell">
            <img class="thumb-image" alt="Miniatura pagina ${page.pageNum}">
            <div class="thumb-image-placeholder">Cargando...</div>
            <div class="thumb-overlay-meta">
                <span class="thumb-page-chip">Pag. ${page.pageNum}</span>
                <span class="thumb-state-dot" title="${page.active ? 'Activa' : 'Excluida'}"></span>
            </div>
        </div>
    `;

    card.addEventListener('click', (event) => {
        event.preventDefault();
        setSelectedPage(page.id);
    });

    card.addEventListener('dblclick', () => {
        togglePageActive(page.id);
    });

    return card;
}

async function loadThumbnailIntoCard(entry) {
    const { file, page } = entry;
    const card = thumbnailList.querySelector(`.thumbnail-item[data-page-id="${page.id}"]`);
    if (!card) {
        return;
    }

    const img = card.querySelector('.thumb-image');
    const placeholder = card.querySelector('.thumb-image-placeholder');

    try {
        const dataUrl = await ensureThumbnail(file, page);

        const liveCard = thumbnailList.querySelector(`.thumbnail-item[data-page-id="${page.id}"]`);
        if (!liveCard) {
            return;
        }

        const liveImg = liveCard.querySelector('.thumb-image');
        const livePlaceholder = liveCard.querySelector('.thumb-image-placeholder');

        liveImg.src = dataUrl;
        liveImg.classList.add('loaded');
        livePlaceholder.style.display = 'none';
    } catch (error) {
        console.error('Thumbnail generation error:', error);
        if (img) {
            img.classList.remove('loaded');
        }
        if (placeholder) {
            placeholder.textContent = 'Sin vista';
        }
    }
}

function setSelectedPage(pageId) {
    selectedPageId = pageId;
    refreshThumbnailSelection();

    const selectedCard = thumbnailList.querySelector(`.thumbnail-item[data-page-id="${pageId}"]`);
    if (selectedCard) {
        selectedCard.scrollIntoView({ block: 'nearest' });
    }

    renderPreviewPanel();
}

function refreshThumbnailSelection() {
    const cards = thumbnailList.querySelectorAll('.thumbnail-item');
    cards.forEach((card) => {
        card.classList.toggle('selected', card.dataset.pageId === selectedPageId);
    });
}

function refreshThumbnailStatuses() {
    const pageIndex = buildPageIndex();
    const cards = thumbnailList.querySelectorAll('.thumbnail-item');

    cards.forEach((card) => {
        const pageId = card.dataset.pageId;
        const entry = pageIndex.get(pageId);
        if (!entry) {
            return;
        }

        const isActive = entry.page.active;
        card.classList.toggle('active', isActive);
        card.classList.toggle('discarded', !isActive);

        const stateDot = card.querySelector('.thumb-state-dot');
        if (stateDot) {
            stateDot.title = isActive ? 'Activa' : 'Excluida';
        }
    });
}

function resetPreviewPanel() {
    previewPageTitle.textContent = 'Selecciona una hoja';
    previewPageSubtitle.textContent = 'Aqui se mostrara la vista previa ampliada de la hoja seleccionada.';
    previewToggleBtn.disabled = true;
    previewUpBtn.disabled = true;
    previewDownBtn.disabled = true;
    previewStage.classList.remove('discarded-preview');

    const context = previewCanvas.getContext('2d');
    if (context) {
        context.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    }
}

function renderPreviewPanel() {
    if (!selectedPageId) {
        resetPreviewPanel();
        return;
    }

    const pageIndex = buildPageIndex();
    const entry = pageIndex.get(selectedPageId);
    if (!entry) {
        resetPreviewPanel();
        return;
    }

    const { file, page } = entry;
    const orderPosition = globalPageOrder.indexOf(page.id) + 1;

    previewPageTitle.textContent = file.name;
    previewPageSubtitle.textContent = `Hoja ${page.pageNum} de ${file.pageCount} • Posicion final ${orderPosition} de ${globalPageOrder.length} • ${page.active ? 'Activa' : 'Excluida'}`;

    previewToggleBtn.disabled = false;
    previewToggleBtn.textContent = page.active ? 'Excluir hoja' : 'Restaurar hoja';

    previewUpBtn.disabled = orderPosition <= 1;
    previewDownBtn.disabled = orderPosition >= globalPageOrder.length;

    previewStage.classList.toggle('discarded-preview', !page.active);
    renderSelectedPageCanvas(entry);
}

async function renderSelectedPageCanvas(entry) {
    const token = ++previewRenderToken;

    try {
        const pdf = await getPreviewDocument(entry.file);
        if (token !== previewRenderToken) {
            return;
        }

        const maxWidth = Math.max(220, previewStage.clientWidth - 12);
        const maxHeight = Math.max(220, previewStage.clientHeight - 12);
        await renderPageToCanvas(pdf, entry.page.pageNum, previewCanvas, { maxWidth, maxHeight });
    } catch (error) {
        console.error('Large preview render error:', error);
    }
}

async function getPreviewDocument(file) {
    if (pdfPreviewCache.has(file.id)) {
        return pdfPreviewCache.get(file.id);
    }

    const buffer = await file.fileObject.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;

    pdfPreviewCache.set(file.id, pdf);
    return pdf;
}

async function renderPageToCanvas(pdf, pageNum, canvas, size) {
    const page = await pdf.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });
    let scale = 1;

    if (typeof size === 'number') {
        scale = size / unscaledViewport.width;
    } else if (size && typeof size === 'object') {
        const widthScale = size.maxWidth ? (size.maxWidth / unscaledViewport.width) : Number.POSITIVE_INFINITY;
        const heightScale = size.maxHeight ? (size.maxHeight / unscaledViewport.height) : Number.POSITIVE_INFINITY;
        scale = Math.min(widthScale, heightScale);
    }

    if (!isFinite(scale) || scale <= 0) {
        scale = 1;
    }

    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };
    await page.render(renderContext).promise;
}

async function ensureThumbnail(file, page) {
    if (pageThumbnailCache.has(page.id)) {
        return pageThumbnailCache.get(page.id);
    }

    const pdf = await getPreviewDocument(file);
    const tempCanvas = document.createElement('canvas');
    await renderPageToCanvas(pdf, page.pageNum, tempCanvas, { maxWidth: 210, maxHeight: 290 });

    const dataUrl = tempCanvas.toDataURL('image/png');
    pageThumbnailCache.set(page.id, dataUrl);
    return dataUrl;
}

function setFileRangeFromActivePages(file) {
    const activePageNumbers = file.pages
        .filter((page) => page.active)
        .map((page) => page.pageNum);

    file.pagesToKeep = pagesToRangeString(activePageNumbers);
}

function refreshFileCard(fileId) {
    const file = uploadedFiles.find((entry) => entry.id === fileId);
    if (!file) {
        return;
    }

    const badge = document.getElementById(`badge-${file.id}`);
    if (badge) {
        badge.textContent = getFileBadgeText(file);
    }

    const input = document.getElementById(`pages-${file.id}`);
    if (input) {
        input.value = file.pagesToKeep;
    }
}

function togglePageActive(pageId) {
    const pageIndex = buildPageIndex();
    const entry = pageIndex.get(pageId);
    if (!entry) {
        return;
    }

    entry.page.active = !entry.page.active;
    setFileRangeFromActivePages(entry.file);
    refreshFileCard(entry.file.id);

    updateViewerTitle();
    refreshThumbnailStatuses();
    renderPreviewPanel();
}

function movePagePosition(pageId, direction, event) {
    if (event) {
        event.stopPropagation();
    }

    const currentIndex = globalPageOrder.indexOf(pageId);
    if (currentIndex < 0) {
        return;
    }

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= globalPageOrder.length) {
        return;
    }

    const swapPageId = globalPageOrder[nextIndex];
    globalPageOrder[nextIndex] = pageId;
    globalPageOrder[currentIndex] = swapPageId;

    renderVisualViewer();
}

window.movePagePosition = movePagePosition;

function pagesToRangeString(activePages) {
    if (activePages.length === 0) {
        return '';
    }

    const ranges = [];
    let start = activePages[0];
    let end = activePages[0];

    for (let i = 1; i < activePages.length; i += 1) {
        if (activePages[i] === end + 1) {
            end = activePages[i];
        } else {
            ranges.push(start === end ? `${start}` : `${start}-${end}`);
            start = activePages[i];
            end = activePages[i];
        }
    }

    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(', ');
}

function parsePageRange(rangeStr, maxPages) {
    if (!rangeStr || rangeStr.trim().toLowerCase() === 'todas' || rangeStr.trim() === '') {
        return Array.from({ length: maxPages }, (_, index) => index);
    }

    const pages = new Set();
    const parts = rangeStr.split(',');

    for (let part of parts) {
        part = part.trim();

        if (part.includes('-')) {
            const rangeParts = part.split('-');
            const start = parseInt(rangeParts[0], 10);
            const end = parseInt(rangeParts[1], 10);

            if (!isNaN(start) && !isNaN(end)) {
                const minRange = Math.min(start, end);
                const maxRange = Math.max(start, end);

                for (let pageNum = minRange; pageNum <= maxRange; pageNum += 1) {
                    if (pageNum >= 1 && pageNum <= maxPages) {
                        pages.add(pageNum - 1);
                    }
                }
            }
        } else {
            const pageNum = parseInt(part, 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
                pages.add(pageNum - 1);
            }
        }
    }

    if (pages.size === 0) {
        return Array.from({ length: maxPages }, (_, index) => index);
    }

    return Array.from(pages).sort((a, b) => a - b);
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showStatus(message, type) {
    statusPanel.style.display = 'flex';
    statusPanel.className = `status-container ${type}`;

    if (type === 'loading') {
        statusPanel.innerHTML = `<div class="spinner"></div><span>${message}</span>`;
    } else {
        const icon = type === 'success' ? 'check-circle-2' : 'alert-circle';
        statusPanel.innerHTML = `<i data-lucide="${icon}" style="width: 18px; height: 18px; flex-shrink:0;"></i><span>${message}</span>`;
        lucide.createIcons();
    }
}

function hideStatus() {
    statusPanel.style.display = 'none';
}

async function mergeSelectedPDFs() {
    if (uploadedFiles.length === 0) {
        showStatus('Por favor, anade al menos 1 archivo PDF.', 'error');
        return;
    }

    try {
        showStatus('Procesando y generando archivo final... Por favor espera.', 'loading');
        mergeBtn.disabled = true;

        syncGlobalPageOrder();
        const pageIndex = buildPageIndex();
        const orderedActivePages = [];

        for (const pageId of globalPageOrder) {
            const entry = pageIndex.get(pageId);
            if (entry && entry.page.active) {
                orderedActivePages.push(entry);
            }
        }

        if (orderedActivePages.length === 0) {
            throw new Error('El PDF resultante esta vacio. Activa al menos una hoja.');
        }

        const mergedPdf = await PDFLib.PDFDocument.create();
        const sourcePdfCache = new Map();

        for (const entry of orderedActivePages) {
            const { file, page } = entry;
            let sourcePdf = sourcePdfCache.get(file.id);

            if (!sourcePdf) {
                const fileData = await file.fileObject.arrayBuffer();
                sourcePdf = await PDFLib.PDFDocument.load(fileData, { ignoreEncryption: true });
                sourcePdfCache.set(file.id, sourcePdf);
            }

            const copiedPages = await mergedPdf.copyPages(sourcePdf, [page.pageNum - 1]);
            mergedPdf.addPage(copiedPages[0]);
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = downloadUrl;

        if (uploadedFiles.length === 1) {
            const originalName = uploadedFiles[0].name.replace(/\.pdf$/i, '');
            link.download = `${originalName}_editado.pdf`;
        } else {
            link.download = `pdf_fusionado_${getTimestamp()}.pdf`;
        }

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        showStatus('PDF procesado con exito. Tu descarga ha comenzado.', 'success');
    } catch (error) {
        console.error('Error al procesar los PDFs:', error);
        showStatus(`Ocurrio un error: ${error.message}`, 'error');
    } finally {
        mergeBtn.disabled = false;
    }
}

function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
}

// Initial render
renderVisualViewer();
