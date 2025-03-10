/**
 * panel-manager.js
 * Modul pro správu vysouvacího informačního panelu
 */

// Globální proměnné
let root;
let slidingPanel;
let panelHandle;
let isPanelOpen = false;
let startY, startHeight;

/**
 * Nastaví vysouvací panel
 */
export function setupPanel() {
    console.log('Panel manager initialized');
    const slidingPanel = document.getElementById('sliding-panel');
    const panelToggle = document.getElementById('panel-toggle');

    if (slidingPanel && panelToggle) {
        panelToggle.addEventListener('click', () => {
            slidingPanel.classList.toggle('open');
        });
    }
}

/**
 * Přepne stav panelu (otevřený/zavřený)
 * @param {HTMLElement} canvasContainer - Reference na kontejner canvasu
 * @param {HTMLElement} controls - Reference na ovládací prvky
 * @param {HTMLElement} playbackControls - Reference na ovládací prvky přehrávače
 */
function togglePanel(canvasContainer, controls, playbackControls) {
    isPanelOpen = !isPanelOpen;

    if (slidingPanel) {
        const height = slidingPanel.offsetHeight;
        root.style.setProperty('--panel-height', `${height}px`);
        slidingPanel.classList.toggle('open');
    }

    if (canvasContainer) {
        canvasContainer.classList.toggle('panel-open');
    }

    if (controls) {
        controls.classList.toggle('panel-open');
    }

    if (playbackControls) {
        playbackControls.classList.toggle('panel-open');
    }
}

/**
 * Zahájí změnu velikosti panelu
 * @param {Event} e - Událost myši nebo dotyku
 */
function startPanelResize(e) {
    e.preventDefault();

    // Získat počáteční pozici
    if (e.type === 'touchstart') {
        startY = e.touches[0].clientY;
    } else {
        startY = e.clientY;
    }

    startHeight = slidingPanel.offsetHeight;

    // Změnit kurzor
    document.body.style.cursor = 'row-resize';

    // Přidat třídu pro indikaci změny velikosti
    if (panelHandle) {
        panelHandle.classList.add('resizing');
    }
}

/**
 * Změní velikost panelu
 * @param {Event} e - Událost myši nebo dotyku
 */
function resizePanel(e) {
    if (!panelHandle || !panelHandle.classList.contains('resizing')) return;

    let currentY;
    if (e.type === 'touchmove') {
        e.preventDefault();
        currentY = e.touches[0].clientY;
    } else {
        currentY = e.clientY;
    }

    // Vypočítat novou výšku
    const deltaY = startY - currentY;
    let newHeight = startHeight + deltaY;

    // Omezit minimální a maximální výšku
    newHeight = Math.max(100, Math.min(newHeight, window.innerHeight * 0.8));

    // Nastavit novou výšku
    slidingPanel.style.height = `${newHeight}px`;
    root.style.setProperty('--panel-height', `${newHeight}px`);

    // Aktualizovat transformace ostatních elementů
    const canvasContainer = document.getElementById('canvas-container');
    const controls = document.querySelector('.controls');
    const playbackControls = document.getElementById('playback-controls');

    if (canvasContainer && canvasContainer.classList.contains('panel-open')) {
        canvasContainer.style.transform = `translateY(-${newHeight}px)`;
    }

    if (controls && controls.classList.contains('panel-open')) {
        controls.style.transform = `translateY(-${newHeight}px)`;
    }

    if (playbackControls && playbackControls.classList.contains('panel-open')) {
        playbackControls.style.transform = `translate(-50%, -${newHeight}px)`;
    }
}

/**
 * Ukončí změnu velikosti panelu
 */
function stopPanelResize() {
    if (!panelHandle || !panelHandle.classList.contains('resizing')) return;

    // Odstranit třídu pro indikaci změny velikosti
    panelHandle.classList.remove('resizing');

    // Vrátit kurzor do normálního stavu
    document.body.style.cursor = '';

    // Resetovat inline styly a použít CSS proměnné
    const canvasContainer = document.getElementById('canvas-container');
    const controls = document.querySelector('.controls');
    const playbackControls = document.getElementById('playback-controls');

    if (canvasContainer) canvasContainer.style.transform = '';
    if (controls) controls.style.transform = '';
    if (playbackControls) playbackControls.style.transform = '';
}

/**
 * Vrátí informaci, zda je panel otevřený
 * @returns {boolean} True, pokud je panel otevřený
 */
export function isPanelVisible() {
    const panel = document.getElementById('sliding-panel');
    return panel ? panel.classList.contains('open') : false;
}
