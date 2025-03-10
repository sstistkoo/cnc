/**
 * panel-manager.js
 * Modul pro správu vysouvacího informačního panelu
 */

// Globální proměnné
let slidingPanel;
let panelHandle;
let canvasContainer;
let controls;
let playbackControls;
let isDragging = false;
let startY, startHeight;

/**
 * Nastaví vysouvací panel
 */
export function setupPanel() {
    console.log('Panel manager initialized');

    // Získat reference na elementy
    slidingPanel = document.getElementById('sliding-panel');
    panelHandle = document.getElementById('panel-handle');
    canvasContainer = document.getElementById('canvas-container');
    controls = document.querySelector('.controls');
    playbackControls = document.getElementById('playback-controls');

    const panelToggle = document.getElementById('panel-toggle');

    if (!slidingPanel || !panelHandle) {
        console.error('Panel elements not found');
        return;
    }

    // Nastavit event listenery pro panel toggle
    if (panelToggle) {
        panelToggle.addEventListener('click', togglePanel);
    }

    // Nastavit event listenery pro resize panelu
    // Pro myš
    panelHandle.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);

    // Pro dotyková zařízení
    panelHandle.addEventListener('touchstart', handleDragStart, { passive: false });
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);

    // Nastavit výchozí výšku panelu v CSS proměnné
    document.documentElement.style.setProperty('--panel-height', '50vh');

    console.log('Panel resize handlers initialized');
}

/**
 * Přepne stav panelu (otevřený/zavřený)
 */
function togglePanel() {
    const isOpen = slidingPanel.classList.toggle('open');

    // Upravit transformaci pouze pro canvas-container a kontrolní prvky
    if (canvasContainer) canvasContainer.classList.toggle('panel-open');
    if (controls) controls.classList.toggle('panel-open');
    if (playbackControls) playbackControls.classList.toggle('panel-open');

    // Zajistíme, že souřadnice a popisky os zůstanou pevně na místě
    document.querySelectorAll('.coordinates').forEach(el => {
        el.style.position = 'fixed';
        el.style.bottom = '40px';
        el.style.left = '15px';
        el.style.top = 'auto'; // Zrušit top pozici
        el.style.transform = 'none';
        el.style.transition = 'none';
        el.style.zIndex = '2000';
    });

    document.querySelectorAll('.axis-label, .axis-arrow').forEach(el => {
        el.style.position = 'fixed';
        el.style.transform = 'none';
        el.style.transition = 'none';
    });

    // Oznámíme změnu panelu, kdybychom později chtěli něco jiného nastavit
    const event = new CustomEvent('panel-toggle', { detail: { isOpen } });
    document.dispatchEvent(event);
}

// Odstraníme tuto funkci, protože ji nechceme používat
// /**
//  * Upraví zobrazení souřadnic a popisky os při otevření/zavření panelu
//  * @param {boolean} isPanelOpen - Zda je panel otevřený
//  */
// function adjustCoordinatesForPanel(isPanelOpen) {
//     // Celá funkce odstraněna - nechceme upravovat pozice souřadnic a os
// }

/**
 * Zpracuje událost začátku tažení
 * @param {Event} e - Událost myši nebo dotyku
 */
function handleDragStart(e) {
    e.preventDefault();
    isDragging = true;

    // Nastavit kurzor
    document.body.style.cursor = 'row-resize';

    // Získat počáteční pozici
    if (e.type === 'touchstart') {
        startY = e.touches[0].clientY;
    } else {
        startY = e.clientY;
    }

    // Získat počáteční výšku panelu
    startHeight = slidingPanel.offsetHeight;

    // Přidat třídu pro visuální indikaci změny velikosti
    panelHandle.classList.add('resizing');

    console.log('Panel resize started', { startY, startHeight });
}

/**
 * Zpracuje událost tažení (změna velikosti panelu)
 * @param {Event} e - Událost myši nebo dotyku
 */
function handleDragMove(e) {
    if (!isDragging) return;

    let currentY;

    if (e.type === 'touchmove') {
        e.preventDefault(); // Zabránit scrollování během změny velikosti
        currentY = e.touches[0].clientY;
    } else {
        currentY = e.clientY;
    }

    // Vypočítat změnu výšky (táhlo se pohybuje vzhůru, panel se zvětšuje)
    const delta = startY - currentY;
    let newHeight = Math.max(150, Math.min(startHeight + delta, window.innerHeight * 0.9));

    // Aktualizovat výšku panelu
    slidingPanel.style.height = `${newHeight}px`;

    // Aktualizovat CSS proměnnou pro transformace
    document.documentElement.style.setProperty('--panel-height', `${newHeight}px`);

    // Pokud je panel otevřený, aktualizovat bottom pozici
    if (slidingPanel.classList.contains('open')) {
        slidingPanel.style.bottom = `-${newHeight}px`;

        // Zajistit, že souřadnice a popisky os zůstanou pevně na místě
        document.querySelectorAll('.coordinates').forEach(el => {
            el.style.position = 'fixed';
            el.style.bottom = '40px';
            el.style.left = '15px';
            el.style.top = 'auto'; // Zrušit top pozici
            el.style.transform = 'none';
            el.style.transition = 'none';
            el.style.zIndex = '2000';
        });

        document.querySelectorAll('.axis-label, .axis-arrow').forEach(el => {
            el.style.position = 'fixed';
            el.style.transform = 'none';
            el.style.transition = 'none';
        });
    }
}

/**
 * Zpracuje událost konce tažení
 */
function handleDragEnd() {
    if (!isDragging) return;

    isDragging = false;
    document.body.style.cursor = '';
    panelHandle.classList.remove('resizing');

    console.log('Panel resize ended');
}

/**
 * Vrátí informaci, zda je panel otevřený
 * @returns {boolean} True, pokud je panel otevřený
 */
export function isPanelVisible() {
    return slidingPanel ? slidingPanel.classList.contains('open') : false;
}

/**
 * Získá aktuální výšku panelu
 * @returns {number} Výška panelu v pixelech
 */
export function getPanelHeight() {
    return slidingPanel ? slidingPanel.offsetHeight : 0;
}
