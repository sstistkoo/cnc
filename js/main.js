// Main - hlavní inicializační soubor

// Import modulů
import { initializeLayout, toggleLeftPanel, toggleRightPanel, toggleTopPanel, updateGlobalMenuState, handleMouseDown } from './layout-manager.js';
import { initializeEditor, setupImprovedLineNumbers } from './editor-manager.js';
import { initializeProgramManager, loadCNCProgramFromJSON } from './program-manager.js';
import { initializeModals } from './modal-manager.js';
import { initializeConsole } from './console-manager.js';

/**
 * Inicializace celé aplikace
 */
function initializeApp() {
    console.log('Inicializace aplikace...');

    // Detekce mobilního zařízení
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        console.log('Detekováno mobilní zařízení:', navigator.userAgent);
        document.body.classList.add('mobile-device');

        // Optimalizovat nastavení pro mobilní zařízení
        setupMobileOptimizations();
    }

    try {
        // Inicializovat jednotlivé moduly
        initializeLayout();
        initializeEditor();
        initializeProgramManager();
        initializeModals();
        initializeConsole();

        // Exponování funkcí do globálního prostoru pro použití v inline handlery
        window.toggleLeftPanel = toggleLeftPanel;
        window.toggleRightPanel = toggleRightPanel;
        window.toggleTopPanel = toggleTopPanel;
        window.setupImprovedLineNumbers = setupImprovedLineNumbers;
        window.updateGlobalMenuState = updateGlobalMenuState;

        // Exponovat funkci z layout-manageru pro manipulaci s drag&drop chováním
        window.handleEditorMouseDown = handleMouseDown;

        // Přidáno pro ladění tlačítka Menu
        console.info("Důležité: Pro správnou funkci tlačítka Menu může být potřeba vyčistit cache prohlížeče (Ctrl+F5)");

        // Přidáno pro zajištění správné funkce tlačítka Menu
        setTimeout(() => {
            const middleWindow = document.getElementById('middleWindow');
            const middleContent = document.querySelector('.middle-content');
            const topEditor = document.getElementById('topEditor');
            const bottomEditor = document.getElementById('bottomEditor');

            // Kontrola a reset stavu menu pro stabilní chování
            if (middleWindow) middleWindow.style.height = '1vh';
            if (middleContent) middleContent.classList.add('hidden');
            if (topEditor) topEditor.style.height = '99vh';
            if (bottomEditor) bottomEditor.style.height = '1vh';

            // Vytvořit zónu pro tažení ve spodní části obrazovky
            addBottomDragZone();

            console.log('Stav menu resetován do výchozího stavu.');
        }, 500);

        console.log('Aplikace úspěšně inicializována');
    } catch (error) {
        console.error('Chyba během inicializace aplikace:', error);

        // Zobrazit uživatelsky přívětivou chybu
        const errorMessage = document.createElement('div');
        errorMessage.style.position = 'fixed';
        errorMessage.style.top = '50%';
        errorMessage.style.left = '50%';
        errorMessage.style.transform = 'translate(-50%, -50%)';
        errorMessage.style.padding = '20px';
        errorMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        errorMessage.style.color = 'white';
        errorMessage.style.borderRadius = '10px';
        errorMessage.style.maxWidth = '80%';
        errorMessage.style.textAlign = 'center';
        errorMessage.textContent = 'Chyba při načítání aplikace. Zkuste obnovit stránku.';
        document.body.appendChild(errorMessage);
    }
}

/**
 * Nastavení optimalizací pro mobilní zařízení
 */
function setupMobileOptimizations() {
    // Pokud je dostupné, informujeme prohlížeč, že očekáváme animace
    // pro potenciální hardware akceleraci
    document.body.style.willChange = 'transform';

    // Zakázat zbytečné události pro lepší výkon
    document.addEventListener('touchmove', e => {
        // Povolit pouze na aktivních prvcích UI
        if (!e.target.closest('.editor-label, #middleWindow, textarea')) {
            e.preventDefault();
        }
    }, { passive: false });

    // Optimalizace vykreslování
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
        viewport.setAttribute('content',
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
}

/**
 * Přidá neviditelnou zónu pro tažení ve spodní části obrazovky
 */
function addBottomDragZone() {
    const dragZone = document.createElement('div');
    dragZone.className = 'bottom-drag-zone';
    document.body.appendChild(dragZone);

    dragZone.addEventListener('mousedown', startBottomDrag);
    dragZone.addEventListener('touchstart', startBottomDrag, { passive: false });

    function startBottomDrag(e) {
        e.preventDefault();
        console.log("Bottom drag zone aktivována");

        // Získat výchozí rozměry pro tažení (přímo použijeme aktuální hodnoty)
        const topEditor = document.getElementById('topEditor');
        const bottomEditor = document.getElementById('bottomEditor');

        if (topEditor && bottomEditor && window.handleEditorMouseDown) {
            // Před předáním eventu nastavíme aktuální velikost, aby nedošlo k přeskokům
            const topHeight = parseFloat(getComputedStyle(topEditor).height);
            const bottomHeight = parseFloat(getComputedStyle(bottomEditor).height);

            // Nastavit třídy pro vizuální zpětnou vazbu
            document.body.classList.add('can-resize-editors');

            // Vytvořit a poslat událost pro zahájení tažení
            // Poznámka: Necháváme zavřené menu, pokud je zavřené - neotevíráme ho
            const dragEvent = new MouseEvent('mousedown', {
                clientY: e.clientY || (e.touches && e.touches[0].clientY),
                bubbles: true,
                cancelable: true
            });

            window.handleEditorMouseDown(dragEvent);
        }
    }
}

// Inicializovat aplikaci po načtení DOM
document.addEventListener('DOMContentLoaded', initializeApp);
