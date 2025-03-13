/**
 * Pomocník pro práci s dynamicky vytvořeným obsahem v modálních oknech
 * Řeší problémy s event listenery v dynamicky vytvořeném DOM
 */

/**
 * Nastaví event listenery pro přepínání zobrazení historie parametrů
 * @param {HTMLElement} container - element, ve kterém hledat tlačítka historie
 */
function setupHistoryToggleButtons(container = document) {
    // Najít všechna tlačítka pro přepínání historie
    const buttons = container.querySelectorAll('.show-history');

    buttons.forEach(button => {
        // Odstranit existující event listenery
        const newButton = button.cloneNode(true);
        if (button.parentNode) {
            button.parentNode.replaceChild(newButton, button);
        }

        // Přidat nový event listener s robustnější logikou
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const paramId = this.getAttribute('data-param');
            const historyDiv = document.getElementById('history-' + paramId);

            if (!historyDiv) {
                console.warn('Historie pro parametr', paramId, 'nebyla nalezena');
                return;
            }

            const isVisible = historyDiv.style.display !== 'none';

            if (isVisible) {
                historyDiv.style.display = 'none';
                const entriesCount = historyDiv.querySelectorAll('.history-entry').length;
                this.textContent = `Změny (${entriesCount})`;
            } else {
                // Zobrazit historii a změnit text tlačítka
                historyDiv.style.display = 'block';
                this.textContent = 'Skrýt';

                // Zajistit, že historie bude viditelná (v případě problému s CSS)
                historyDiv.style.opacity = '1';
                historyDiv.style.height = 'auto';
                historyDiv.classList.add('visible');
            }
        });
    });

    console.log(`Nastaveno ${buttons.length} tlačítek pro přepínání historie`);
}

/**
 * Globální delegovaný event listener pro tlačítka historie
 * Funguje i pro dynamicky přidaný obsah
 */
function setupGlobalHistoryListener() {
    document.addEventListener('click', function(e) {
        // Kontrola, zda bylo kliknuto na tlačítko historie
        const button = e.target.closest('.show-history');

        if (button) {
            const paramId = button.getAttribute('data-param');
            const historyDiv = document.getElementById('history-' + paramId);

            if (historyDiv) {
                const isVisible = historyDiv.style.display !== 'none';
                historyDiv.style.display = isVisible ? 'none' : 'block';
                button.textContent = isVisible ?
                    `Změny (${historyDiv.querySelectorAll('.history-entry').length})` : 'Skrýt';
            }
        }
    });
}

// Exportovat funkce pro použití v hlavním souboru
export {
    setupHistoryToggleButtons,
    setupGlobalHistoryListener
};
