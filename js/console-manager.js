// Console Manager - mobilní konzole pro ladění

/**
 * Přepíná viditelnost mobilní konzole
 */
function toggleMobileConsole() {
    const mobileConsole = document.getElementById('mobileConsole');
    if (mobileConsole) {
        mobileConsole.classList.toggle('open');
    }
}

/**
 * Nastavuje přesměrování konzolového výstupu do mobilní konzole
 */
function setupMobileConsoleOutput() {
    const consoleContent = document.getElementById('mobileConsoleContent');
    if (!consoleContent) return;

    // Uložit originální metody konzole
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalClear = console.clear;

    // Funkce pro přidání záznamu do mobilní konzole
    function addLogEntry(message, type = 'log') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        let messageText;
        // Převést různé typy vstupů na string
        if (typeof message === 'object') {
            try {
                messageText = JSON.stringify(message, null, 2);
            } catch (e) {
                messageText = String(message);
            }
        } else {
            messageText = String(message);
        }
        entry.textContent = messageText;
        consoleContent.appendChild(entry);
        consoleContent.scrollTop = consoleContent.scrollHeight;
    }

    // Přepsat metody konzole
    console.log = function(...args) {
        originalLog.apply(console, args);
        args.forEach(msg => addLogEntry(msg, 'log'));
    };
    console.error = function(...args) {
        originalError.apply(console, args);
        args.forEach(msg => addLogEntry(msg, 'error'));
    };
    console.warn = function(...args) {
        originalWarn.apply(console, args);
        args.forEach(msg => addLogEntry(msg, 'warn'));
    };
    console.info = function(...args) {
        originalInfo.apply(console, args);
        args.forEach(msg => addLogEntry(msg, 'info'));
    };
    console.clear = function() {
        originalClear.apply(console);
        consoleContent.innerHTML = '';
        addLogEntry('Konzole byla vyčištěna', 'info');
    };
}

/**
 * Inicializace mobilní konzole
 */
function initializeConsole() {
    // Přidat event listenery k tlačítkům
    const consoleButton = document.getElementById('consoleButton');
    const consoleCloseButton = document.getElementById('mobileConsoleClose');

    if (consoleButton) {
        consoleButton.addEventListener('click', toggleMobileConsole);
    }

    if (consoleCloseButton) {
        consoleCloseButton.addEventListener('click', toggleMobileConsole);
    }

    // Přesměrovat konzolový výstup
    setupMobileConsoleOutput();
}

// Exportovat funkce pro použití v hlavním souboru
export {
    initializeConsole,
    toggleMobileConsole,
    setupMobileConsoleOutput
};
