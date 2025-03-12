// Layout Manager - správa rozložení panelů a jejich velikostí

// Základní nastavení
const MIDDLE_HEIGHT = 10;
let topHeight = 95;
let bottomHeight = 5;
let isMiddleOpen = false;
let isDragging = false;
let startY, startTopHeight, startBottomHeight;
let originalTopHeight, originalBottomHeight;

// Reference na elementy DOM
let container, topEditor, middleWindow, bottomEditor, middleContent, editorHandle, leftPanel, rightPanel, topPanel;

/**
 * Inicializace referencí na DOM elementy
 */
function initializeLayoutReferences() {
    container = document.querySelector('.container');
    topEditor = document.getElementById('topEditor');
    middleWindow = document.getElementById('middleWindow');
    bottomEditor = document.getElementById('bottomEditor');
    middleContent = document.querySelector('.middle-content');
    editorHandle = document.getElementById('editorHandle');
    leftPanel = document.getElementById('leftPanel');
    rightPanel = document.getElementById('rightPanel');
    topPanel = document.getElementById('topPanel');
}

/**
 * Aktualizace výšek panelů
 */
function updateHeights() {
    const middleHeight = isMiddleOpen ? MIDDLE_HEIGHT : 1;
    if (topEditor) topEditor.style.height = `${topHeight}vh`;
    if (middleWindow) middleWindow.style.height = `${middleHeight}vh`;
    if (bottomEditor) bottomEditor.style.height = `${bottomHeight}vh`;

    if (middleContent) {
        middleContent.classList.toggle('hidden', !isMiddleOpen);
    }
}

/**
 * Nastavení ResizeObserver pro automatickou aktualizaci při změně velikosti
 */
function setupResizeObserver() {
    const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(updateHeights);
    });

    resizeObserver.observe(document.body);
    if (topPanel) resizeObserver.observe(topPanel);
    if (middleWindow) resizeObserver.observe(middleWindow);
    if (bottomEditor) resizeObserver.observe(bottomEditor);
}

/**
 * Nastavení handleru pro menu tlačítko a tažení pomocí myši/dotyku
 */
function setupEditorHandleEvents() {
    // Odstranit existující event listenery z tlačítka
    const newEditorHandle = document.createElement('div');
    newEditorHandle.id = 'editorHandle';
    newEditorHandle.className = 'editor-label';
    newEditorHandle.textContent = 'Menu';

    if (editorHandle && editorHandle.parentNode) {
        editorHandle.parentNode.replaceChild(newEditorHandle, editorHandle);
    }

    editorHandle = newEditorHandle;

    // Kliknutí pro přepínání panelu
    editorHandle.addEventListener('click', handleClick);

    // Mousedown pro zahájení tažení
    editorHandle.addEventListener('mousedown', handleMouseDown);

    // Mousemove pro tažení
    document.addEventListener('mousemove', handleMouseMove);

    // Mouseup pro ukončení tažení
    document.addEventListener('mouseup', handleMouseUp);

    // Podpora pro dotyková zařízení
    editorHandle.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
}

/**
 * Handler pro kliknutí na Menu tlačítko
 */
function handleClick(e) {
    if (isDragging) return;

    e.preventDefault();
    e.stopPropagation();

    isMiddleOpen = !isMiddleOpen;

    if (isMiddleOpen) {
        const availableSpace = 100 - MIDDLE_HEIGHT;
        topHeight = availableSpace * 0.7;
        bottomHeight = availableSpace * 0.3;
    } else {
        topHeight = 99;
        bottomHeight = 1;
    }

    updateHeights();

    // Aktualizovat číslování řádků po dokončení animace
    setTimeout(function() {
        if (window.setupImprovedLineNumbers) {
            window.setupImprovedLineNumbers();
        }
    }, 300);
}

/**
 * Handler pro zahájení tažení myší
 */
function handleMouseDown(e) {
    if (e.button !== 0) return;

    isDragging = true;
    startY = e.clientY;
    startTopHeight = topHeight;
    startBottomHeight = bottomHeight;

    document.body.style.cursor = 'row-resize';

    e.preventDefault();
    e.stopPropagation();
}

/**
 * Handler pro pohyb myši během tažení
 */
function handleMouseMove(e) {
    if (!isDragging) return;

    const deltaY = e.clientY - startY;
    const deltaPercent = (deltaY / window.innerHeight) * 100;

    const availableSpace = 100 - (isMiddleOpen ? MIDDLE_HEIGHT : 1);
    const newTopHeight = Math.max(20, Math.min(availableSpace - 20, startTopHeight + deltaPercent));
    const newBottomHeight = availableSpace - newTopHeight;

    if (newBottomHeight >= 20) {
        topHeight = newTopHeight;
        bottomHeight = newBottomHeight;
        updateHeights();
    }
}

/**
 * Handler pro ukončení tažení myší
 */
function handleMouseUp() {
    if (!isDragging) return;

    isDragging = false;
    document.body.style.cursor = '';

    setTimeout(function() {
        if (window.setupImprovedLineNumbers) {
            window.setupImprovedLineNumbers();
        }
    }, 100);
}

/**
 * Handler pro zahájení tažení dotykem
 */
function handleTouchStart(e) {
    isDragging = true;
    startY = e.touches[0].clientY;
    startTopHeight = topHeight;
    startBottomHeight = bottomHeight;

    e.preventDefault();
}

/**
 * Handler pro pohyb dotykem během tažení
 */
function handleTouchMove(e) {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY;
    const deltaPercent = (deltaY / window.innerHeight) * 100;

    const availableSpace = 100 - (isMiddleOpen ? MIDDLE_HEIGHT : 1);
    const newTopHeight = Math.max(20, Math.min(availableSpace - 20, startTopHeight + deltaPercent));
    const newBottomHeight = availableSpace - newTopHeight;

    if (newBottomHeight >= 20) {
        topHeight = newTopHeight;
        bottomHeight = newBottomHeight;
        updateHeights();
    }

    e.preventDefault();
}

/**
 * Handler pro ukončení tažení dotykem
 */
function handleTouchEnd() {
    if (!isDragging) return;
    isDragging = false;

    setTimeout(function() {
        if (window.setupImprovedLineNumbers) {
            window.setupImprovedLineNumbers();
        }
    }, 100);
}

/**
 * Přepínání levého panelu
 */
function toggleLeftPanel() {
    if (leftPanel) leftPanel.classList.toggle('open');
}

/**
 * Přepínání pravého panelu
 */
function toggleRightPanel() {
    if (rightPanel) rightPanel.classList.toggle('open');
}

/**
 * Přepínání horního panelu
 */
function toggleTopPanel() {
    if (!topPanel) return;

    topPanel.classList.toggle('hidden');
    const isHidden = topPanel.classList.contains('hidden');
    const simulatorButton = document.getElementById('simulatorButton');
    const toggleBtn = document.getElementById('toggleTopPanelBtn');

    if (isHidden) {
        // Panel byl právě skryt
        originalTopHeight = topHeight;
        originalBottomHeight = bottomHeight;

        if (container) container.style.marginTop = '0';

        if (toggleBtn) toggleBtn.textContent = '↓';
        if (simulatorButton) {
            simulatorButton.classList.remove('active');
            simulatorButton.title = "Zobrazit seznam programů";
        }
    } else {
        // Panel byl právě zobrazen
        if (typeof originalTopHeight !== 'undefined' && typeof originalBottomHeight !== 'undefined') {
            topHeight = originalTopHeight;
            bottomHeight = originalBottomHeight;
        }

        // Přizpůsobit výšku panelu podle počtu programů
        const programList = document.getElementById('programList');
        const items = programList ? programList.children : [];
        const controlsHeight = 45;
        const itemWidth = 150;
        const availableWidth = window.innerWidth - 150;
        const itemsPerRow = Math.floor(availableWidth / itemWidth);
        const rows = Math.ceil(items.length / itemsPerRow) || 1;
        const panelHeight = rows === 1 ? controlsHeight : controlsHeight * rows;

        topPanel.style.height = `${panelHeight}px`;
        if (container) container.style.marginTop = `${panelHeight}px`;

        // Upravit výšky editorů
        const reduction = (panelHeight / window.innerHeight) * 100;
        const ratio = topHeight / (topHeight + bottomHeight);
        const availableSpace = 100 - reduction;

        topHeight = availableSpace * ratio;
        bottomHeight = availableSpace * (1 - ratio);

        if (toggleBtn) toggleBtn.textContent = '×';
        if (simulatorButton) {
            simulatorButton.classList.add('active');
            simulatorButton.title = "Skrýt seznam programů";
        }
    }

    // Aktualizovat výšky všech elementů
    updateHeights();
}

/**
 * Nastavení event handlerů pro panely
 */
function setupPanelEventHandlers() {
    const lpButton = document.getElementById('lpButton');
    const ppButton = document.getElementById('ppButton');
    const toggleTopPanelBtn = document.getElementById('toggleTopPanelBtn');
    const simulatorButton = document.getElementById('simulatorButton');

    if (lpButton) lpButton.addEventListener('click', toggleLeftPanel);
    if (ppButton) ppButton.addEventListener('click', toggleRightPanel);
    if (toggleTopPanelBtn) toggleTopPanelBtn.addEventListener('click', toggleTopPanel);
    if (simulatorButton) simulatorButton.addEventListener('click', toggleTopPanel);

    // Zavřít panel při kliknutí mimo
    document.addEventListener('click', function(e) {
        if (leftPanel && leftPanel.classList.contains('open') &&
            !leftPanel.contains(e.target) &&
            e.target !== lpButton) {
            toggleLeftPanel();
        }
        if (rightPanel && rightPanel.classList.contains('open') &&
            !rightPanel.contains(e.target) &&
            e.target !== ppButton) {
            toggleRightPanel();
        }
    });
}

/**
 * Inicializace layoutu
 */
function initializeLayout() {
    initializeLayoutReferences();
    updateHeights();
    setupResizeObserver();
    setupEditorHandleEvents();
    setupPanelEventHandlers();

    // Event listener pro změnu velikosti okna
    window.addEventListener('resize', () => {
        if (topPanel && !topPanel.classList.contains('hidden')) {
            const programList = document.getElementById('programList');
            const items = programList ? programList.children : [];
            const controlsHeight = 45;
            const itemWidth = 150;
            const availableWidth = window.innerWidth - 150;
            const itemsPerRow = Math.floor(availableWidth / itemWidth);
            const rows = Math.ceil(items.length / itemsPerRow) || 1;
            const panelHeight = rows === 1 ? controlsHeight : controlsHeight * rows;

            topPanel.style.height = `${panelHeight}px`;
            if (container) container.style.marginTop = `${panelHeight}px`;
        }
    });
}

// Exportovat funkce pro použití v hlavním souboru
export {
    initializeLayout,
    updateHeights,
    toggleLeftPanel,
    toggleRightPanel,
    toggleTopPanel
};
