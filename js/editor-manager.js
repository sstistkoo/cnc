// Editor Manager - správa editoru a funkcí pro číslování řádků

/**
 * Inicializace vylepšeného číslování řádků
 */
function setupImprovedLineNumbers() {
    const textarea = document.querySelector('#bottomEditor textarea');
    if (!textarea) {
        console.warn('Textarea element nenalezen');
        return;
    }

    console.log('Inicializace vylepšeného číslování řádků');

    // Odstranit existující číslování řádků pokud existuje
    const container = textarea.parentElement;
    const existingLineNumbers = container.querySelector('.line-numbers');
    if (existingLineNumbers) {
        existingLineNumbers.remove();
    }

    // Přidat CSS styly pro číslování řádků
    const styleId = 'improved-line-numbers-style';
    let style = document.getElementById(styleId);
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .editor {
                position: relative;
            }
            .line-numbers {
                position: absolute;
                top: 1.5rem;
                left: 0;
                width: 40px;
                height: calc(100% - 1.5rem);
                background-color: #f5f5f5;
                border-right: 1px solid #ddd;
                padding-top: 0;
                font-family: monospace;
                font-size: 1rem;
                color: #777;
                user-select: none;
                pointer-events: none;
                z-index: 2;
                overflow: hidden;
            }
            .editor textarea {
                padding-left: 45px !important;
                line-height: 1.5rem !important;
                font-family: monospace !important;
                font-size: 1rem !important;
                white-space: pre !important;
                tab-size: 4;
            }
            .line-number {
                display: block;
                height: 1.5rem;
                line-height: 1.5rem;
                text-align: right;
                padding-right: 5px;
            }
        `;
        document.head.appendChild(style);
    }

    // Vytvořit kontejner pro čísla řádků
    const lineNumbers = document.createElement('div');
    lineNumbers.className = 'line-numbers';
    container.appendChild(lineNumbers);

    // Funkce pro aktualizaci čísel řádků
    function updateLineNumbers() {
        const text = textarea.value;
        const lines = text.split('\n');

        // Vyčistit kontejner
        lineNumbers.innerHTML = '';

        // Vytvořit elementy pro každou řádku
        for (let i = 0; i < lines.length; i++) {
            const line = document.createElement('div');
            line.className = 'line-number';
            line.textContent = (i + 1);
            lineNumbers.appendChild(line);
        }

        // Synchronizovat scroll
        lineNumbers.scrollTop = textarea.scrollTop;
    }

    // Přidat event listenery
    textarea.addEventListener('input', updateLineNumbers);
    textarea.addEventListener('scroll', () => {
        lineNumbers.scrollTop = textarea.scrollTop;
    });
    textarea.addEventListener('keydown', () => {
        // Odložit aktualizaci po keydown
        setTimeout(updateLineNumbers, 10);
    });

    // Inicializovat číslování
    updateLineNumbers();

    // Pro jistotu naplánovat několik aktualizací
    setTimeout(updateLineNumbers, 100);
    setTimeout(updateLineNumbers, 500);

    // Exportovat funkci pro použití jinde
    return updateLineNumbers;
}

/**
 * Inicializace editoru
 */
function initializeEditor() {
    setupImprovedLineNumbers();

    // Naslouchání na zprávy z iframe (okno_simulator.html)
    window.addEventListener('message', (event) => {
        // Kontrola, zda zpráva obsahuje akci toggleMenu
        if (event.data && event.data.action === 'toggleMenu') {
            // Aktivace stejné funkce jako při kliknutí na tlačítko Menu
            const editorHandle = document.getElementById('editorHandle');
            if (editorHandle) {
                editorHandle.click();
            }
        }
    });
}

// Exportovat funkce pro použití v hlavním souboru
export {
    initializeEditor,
    setupImprovedLineNumbers
};
