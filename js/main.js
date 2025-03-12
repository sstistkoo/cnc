// Main - hlavní inicializační soubor

// Import modulů
import { initializeLayout, toggleLeftPanel, toggleRightPanel, toggleTopPanel } from './layout-manager.js';
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

// Inicializovat aplikaci po načtení DOM
document.addEventListener('DOMContentLoaded', initializeApp);
