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
 * Oprava funkcionality tlačítka Menu pro mobilní zařízení
 */
function fixMobileMenuButton() {
    // Získat referenci na tlačítko Menu
    const editorHandle = document.getElementById('editorHandle');
    if (!editorHandle) return;

    // Odstranit všechny existující event listenery (klonováním prvku)
    const newEditorHandle = editorHandle.cloneNode(true);
    if (editorHandle.parentNode) {
        editorHandle.parentNode.replaceChild(newEditorHandle, editorHandle);
    }

    // Proměnné pro sledování stavu a zamezení duplicitních akcí
    let isMenuProcessing = false;

    // Pomocná funkce pro nastavení "skutečného" stavu UI
    function setMenuState(open) {
        const middleWindow = document.getElementById('middleWindow');
        const topEditor = document.getElementById('topEditor');
        const bottomEditor = document.getElementById('bottomEditor');
        const middleContent = document.querySelector('.middle-content');

        // Zajistíme, že všechny elementy existují
        if (!middleWindow || !topEditor || !bottomEditor || !middleContent) {
            console.error('Některé potřebné elementy nebyly nalezeny');
            return;
        }

        // Aplikujeme stav přímo bez přepínání
        if (open) {
            // Otevřít okno - explicitně nastavíme všechny hodnoty
            middleWindow.style.height = '10vh';
            middleContent.classList.remove('hidden');
            topEditor.style.height = '70vh';
            bottomEditor.style.height = '20vh';
        } else {
            // Zavřít okno - explicitně nastavíme všechny hodnoty
            middleWindow.style.height = '1vh';
            middleContent.classList.add('hidden');
            topEditor.style.height = '99vh';
            bottomEditor.style.height = '1vh';
        }

        // Aktualizujeme globální stav v layout manageru (pokud existuje)
        if (window.updateGlobalMenuState) {
            window.updateGlobalMenuState(open);
        }
    }

    // Určení počátečního stavu podle aktuálního UI
    const middleWindow = document.getElementById('middleWindow');
    const currentHeight = middleWindow ? parseInt(middleWindow.style.height || '1') : 1;

    // Defaultně začínáme se zavřeným menu, ale pro jistotu ověříme aktuální stav
    let isMiddleOpen = currentHeight > 5;

    // Pro jistotu zajistíme konzistentní počáteční stav
    setMenuState(isMiddleOpen);

    console.log('Inicializace Menu tlačítka - počáteční stav:', isMiddleOpen ? 'otevřeno' : 'zavřeno');

    // Přidat vylepšené event listenery s důrazem na mobilní zařízení
    newEditorHandle.addEventListener('click', handleMenuClick);

    // Přidat podporu pro tažení v dolní části tlačítka
    newEditorHandle.addEventListener('mousedown', function(e) {
        // Zjistit, jestli uživatel klikl na spodní část tlačítka
        const rect = newEditorHandle.getBoundingClientRect();
        const isBottomArea = (e.clientY > rect.bottom - 10);

        if (isBottomArea) {
            // Pokud je klik v dolní části, delegujeme ho do layout-manager
            if (window.handleEditorMouseDown) {
                // Nevolat sebe sama, ale funkci z layout-manageru přímo
                window.handleEditorMouseDown(e);
            }
        } else {
            // Jinak jde o normální klik - neděláme nic
            // (Kliknutí se zpracuje v handleru 'click')
        }
    });

    // Vylepšený handler pro kliknutí
    function handleMenuClick(e) {
        e.preventDefault();
        e.stopPropagation();

        // Zabraňuje vícenásobnému spuštění během animace
        if (isMenuProcessing) {
            console.log('Menu stále zpracovává předchozí akci, ignoruji kliknutí');
            return;
        }
        isMenuProcessing = true;

        // Zjistit aktuální stav menu podle výšky prvku (vizuálně)
        const middleWindow = document.getElementById('middleWindow');
        const currentHeight = middleWindow ? parseInt(middleWindow.style.height || '1') : 1;
        isMiddleOpen = currentHeight > 5;

        console.log('Menu tlačítko kliknuto - aktuální stav:', isMiddleOpen ? 'otevřeno' : 'zavřeno');

        // Přepnout stav (negace předchozího stavu)
        isMiddleOpen = !isMiddleOpen;
        console.log('Menu tlačítko kliknuto - nový stav bude:', isMiddleOpen ? 'otevřeno' : 'zavřeno');

        // Nastavit nový stav explicitně
        setMenuState(isMiddleOpen);

        // Aktualizovat číslování řádků po změně velikosti a povolit další kliknutí
        setTimeout(function() {
            // Ověřit, že změna proběhla správně
            const newHeight = middleWindow ? parseInt(middleWindow.style.height || '1') : 1;
            const actuallyOpen = newHeight > 5;

            console.log('Nová výška middle window:', newHeight + 'vh');

            if (actuallyOpen !== isMiddleOpen) {
                console.warn('Nesoulad mezi očekávaným a skutečným stavem menu!');
                // Opravit nesoulad explicitním nastavením
                setMenuState(isMiddleOpen);
            }

            // Aktualizace číslování řádků
            if (window.setupImprovedLineNumbers) {
                window.setupImprovedLineNumbers();
            }

            // Povolení dalšího kliknutí
            isMenuProcessing = false;
        }, 400); // Zvýšeno na 400ms pro jistotu dokončení animace
    }

    // Přidat speciální třídu pro mobilní zařízení
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        newEditorHandle.classList.add('mobile-menu-button');

        // Přidat explicitní zvýraznění pro mobilní zařízení
        newEditorHandle.style.padding = '12px 16px 16px';
        newEditorHandle.style.fontSize = '16px';
        newEditorHandle.style.fontWeight = 'bold';

        // Přidat krátké vibrační odezvy při kliknutí na mobilních zařízeních
        newEditorHandle.addEventListener('click', () => {
            if ('vibrate' in navigator) {
                navigator.vibrate(50); // 50ms vibrace
            }
        });
    }

    // Přidat speciální handler pro posun z uzavřeného stavu
    document.addEventListener('touchstart', handleClosedMenuTouch, { passive: false });
}

/**
 * Handler pro detekci tažení z dolní části obrazovky k otevření menu
 * Nové chování: Neprovede otevření menu, ale pouze umožní tažení hranic
 */
function handleClosedMenuTouch(e) {
    // Pouze pokud je klepnutí v dolní části obrazovky
    if (e.touches && e.touches[0]) {
        const touchY = e.touches[0].clientY;
        const windowHeight = window.innerHeight;
        const bottomArea = windowHeight - 60; // 60px od spodního okraje

        // Zkontrolovat, jestli jsme v oblasti pro tažení
        if (touchY > bottomArea) {
            console.log("Detekováno tažení ve spodní oblasti obrazovky");

            // Místo automatického otevření menu pouze zahájíme tažení
            if (window.handleEditorMouseDown) {
                const touchEvent = new MouseEvent('mousedown', {
                    clientY: touchY,
                    bubbles: true,
                    cancelable: true
                });
                window.handleEditorMouseDown(touchEvent);
                e.preventDefault(); // Zabránit výchozímu chování
            }
        }
    }
}

/**
 * Inicializace editoru
 */
function initializeEditor() {
    setupImprovedLineNumbers();
    fixMobileMenuButton();  // Přidána oprava pro mobilní zařízení

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
    setupImprovedLineNumbers,
    fixMobileMenuButton
};
