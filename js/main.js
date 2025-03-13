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

        // Přidat tlačítko pro přepnutí simulátoru do střední lišty
        addSimulatorToggleButton();

        // Přidat event listener pro tlačítko Parse
        const parseButton = document.getElementById('parseButton');
        if (parseButton) {
            parseButton.addEventListener('click', function() {
                parseCurrentProgram();
            });
        }

        // Přidat event listener pro tlačítko parsovaných řádků
        const parseModalButton = document.getElementById('parseModalButton');
        if (parseModalButton) {
            parseModalButton.addEventListener('click', function() {
                openParsedLinesModal();
            });
        }

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

        // Propojit tlačítko pro výběr souborů s file input
        const fileSelectButton = document.getElementById('fileSelectButton');
        const fileInput = document.getElementById('fileInput');
        if (fileSelectButton && fileInput) {
            fileSelectButton.addEventListener('click', () => {
                fileInput.click();
            });
        }

        // Import modálních funkcí již není potřeba, máme vlastní implementaci
        // Ponecháme pouze pro zpětnou kompatibilitu
        import('./modal-manager.js').then(module => {
            window.showParametersModal = module.showParametersModal;
        }).catch(err => {
            console.error('Chyba při importu modálních funkcí:', err);
        });

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

/**
 * Přidá tlačítko pro přepnutí simulátoru do střední lišty
 */
function addSimulatorToggleButton() {
    const middleContent = document.querySelector('.middle-content');
    if (!middleContent) return;

    // Vytvořit tlačítko pro simulátor a umístit ho do střední části před tlačítko PP
    const simulatorButton = document.createElement('button');
    simulatorButton.id = 'simulatorButton';
    simulatorButton.className = 'square-button';
    simulatorButton.title = 'Displej';  // Změna názvu tlačítka
    simulatorButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M2 12h20"></path>
        </svg>
    `;

    // Najít tlačítko PP
    const ppButton = document.getElementById('ppButton');

    if (ppButton && ppButton.parentNode) {
        // Vložit tlačítko před tlačítko PP
        ppButton.parentNode.insertBefore(simulatorButton, ppButton);

        // Přidat event listener, který volá funkci toggleTopPanel z layout-manageru
        simulatorButton.addEventListener('click', function() {
            if (typeof window.toggleTopPanel === 'function') {
                window.toggleTopPanel();
            }
        });
    }
}

/**
 * Spustí parsování aktuálního programu
 */
function parseCurrentProgram() {
    const editorTextarea = document.querySelector('#bottomEditor textarea');
    if (!editorTextarea || !editorTextarea.value.trim()) {
        console.warn('Žádný program k parsování');
        alert('Nejprve načtěte CNC program.');
        return;
    }

    console.clear();
    console.log('Parsování programu...');

    // Importujeme parser modul a zpracujeme kód
    import('./cnc-line-parser.js').then(module => {
        const code = editorTextarea.value;
        const parsedProgram = module.parseProgram(code);

        console.log(`Úspěšně parsováno ${parsedProgram.length} řádků.`);

        // Statistiky o typech řádků
        const typeCounts = {};
        parsedProgram.forEach(line => {
            if (!typeCounts[line.type]) typeCounts[line.type] = 0;
            typeCounts[line.type]++;
        });

        console.group('Statistika typů řádků');
        Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
            console.log(`${type}: ${count}`);
        });
        console.groupEnd();

        // DŮLEŽITÁ ZMĚNA: Uložit data přímo do globálního objektu, který je specificky vytvořen pro tuto funkci
        window.cncParserData = {
            program: parsedProgram,
            code: code,
            timestamp: Date.now()
        };

        // Pouze zobrazíme hlášku, že program byl parsován
        console.info('Program byl úspěšně parsován. Klikněte na "Parsované řádky" pro zobrazení detailů.');

        // Volitelně můžeme přidat animační efekt na tlačítko parsované řádky pro zvýraznění
        const parseModalButton = document.getElementById('parseModalButton');
        if (parseModalButton) {
            parseModalButton.classList.add('active');
            setTimeout(() => {
                parseModalButton.classList.remove('active');
            }, 1000);
        }

        // NOVÉ: Přímé nastavení event handleru pro parseModalButton, abychom zajistili, že naše data budou použita
        if (parseModalButton) {
            // Odstranit všechny existující handlery
            const newParseButton = parseModalButton.cloneNode(true);
            if (parseModalButton.parentNode) {
                parseModalButton.parentNode.replaceChild(newParseButton, parseModalButton);
            }

            // Přidat nový handler, který zavolá náš vlastní kód pro zobrazení parsovaných řádků
            newParseButton.addEventListener('click', function() {
                openParsedLinesModal();
            });
        }
    }).catch(error => {
        console.error('Chyba při parsování programu:', error);
        alert('Chyba při parsování programu: ' + error.message);
    });
}

/**
 * Otevře modální okno s parsovanými řádky na základě naparsovaných dat
 */
function openParsedLinesModal() {
    // Odstranit existující modální okno, pokud existuje
    const existingModal = document.getElementById('parsedLinesModal');
    if (existingModal) existingModal.remove();

    // Vytvořit nové modální okno
    const modal = document.createElement('div');
    modal.id = 'parsedLinesModal';
    modal.className = 'modal-window';
    modal.innerHTML = `
        <div class="modal-content wide">
            <div class="modal-header">
                <h3>Parsované řádky CNC programu</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div id="parsedLinesContent">
                    <p>Načítání parsovaných řádků...</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Přidat event listener pro zavření modálního okna
    modal.querySelector('.modal-close').addEventListener('click', function() {
        modal.remove();
    });

    // Přidat zavírání kliknutím mimo modální okno
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Zobrazit modální okno s animací
    setTimeout(() => modal.classList.add('open'), 10);

    // Načíst parsovaná data
    const content = document.getElementById('parsedLinesContent');
    if (!content) return;

    // Zkontrolovat jestli máme parsovaná data
    if (window.cncParserData && window.cncParserData.program) {
        console.log('Používám parsovaná data z cache');
        displayParsedLines(window.cncParserData.program, content);
    } else {
        // Pokusit se znovu naparsovat aktuální kód v editoru
        const editorTextarea = document.querySelector('#bottomEditor textarea');
        if (!editorTextarea || !editorTextarea.value.trim()) {
            content.innerHTML = '<p>Nejprve načtěte a parsujte CNC program.</p>';
            return;
        }

        // Parsovat aktuální kód
        content.innerHTML = '<p>Parsing nových dat...</p>';
        import('./cnc-line-parser.js').then(module => {
            const code = editorTextarea.value;
            try {
                const parsedProgram = module.parseProgram(code);
                window.cncParserData = {
                    program: parsedProgram,
                    code: code,
                    timestamp: Date.now()
                };
                displayParsedLines(parsedProgram, content);
            } catch (error) {
                content.innerHTML = `<p class="error">Chyba při parsování: ${error.message}</p>`;
                console.error('Chyba při parsování řádků:', error);
            }
        }).catch(error => {
            content.innerHTML = `<p class="error">Chyba při načítání parseru: ${error.message}</p>`;
        });
    }
}

/**
 * Zobrazí parsované řádky v elementu content
 * @param {Array} parsedProgram - Parsovaný program
 * @param {HTMLElement} content - Element, do kterého se mají zobrazit řádky
 */
function displayParsedLines(parsedProgram, content) {
    // Vytvoření tabulky parsovaných řádků
    let html = '<table class="parsed-lines-table">';
    html += '<tr><th>Řádek</th><th>Kód</th><th>Typ</th><th>G-kódy</th><th>M-kódy</th><th>Souřadnice</th><th>Komentář</th></tr>';

    parsedProgram.forEach(line => {
        const lineNumber = line.lineNumber;
        const originalLine = line.originalLine || '';
        const type = line.type || 'neuvedeno';

        // G-kódy
        let gCodes = '';
        if (line.gCodes && line.gCodes.length > 0) {
            gCodes = line.gCodes.map(code => `G${code}`).join(', ');
        }

        // M-kódy
        let mCodes = '';
        if (line.mCodes && line.mCodes.length > 0) {
            mCodes = line.mCodes.map(code => `M${code}`).join(', ');
        }

        // Souřadnice
        let coords = '';
        if (line.coordinates) {
            const coordStr = Object.entries(line.coordinates)
                .map(([key, value]) => `${key}${value >= 0 ? '+' : ''}${value.toFixed(3)}`)
                .join(' ');
            coords = coordStr;
        }

        // Komentář
        const comment = line.comment || '';

        // Přidání řádku do tabulky s barevným zvýrazněním podle typu
        html += `<tr class="line-type-${type.replace(/\s+/g, '_').toLowerCase()}">`;
        html += `<td>${lineNumber}</td>`;
        html += `<td><code>${escapeHtml(originalLine)}</code></td>`;
        html += `<td>${type}</td>`;
        html += `<td>${gCodes}</td>`;
        html += `<td>${mCodes}</td>`;
        html += `<td>${coords}</td>`;
        html += `<td>${comment}</td>`;
        html += `</tr>`;
    });

    html += '</table>';
    content.innerHTML = html;
}

/**
 * Pomocná funkce pro escapování HTML
 * @param {string} text - Text k escapování
 * @returns {string} - Escapovaný text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inicializovat aplikaci po načtení DOM
document.addEventListener('DOMContentLoaded', initializeApp);
