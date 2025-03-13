/**
 * Pomocné funkce pro lepší práci s CNC parametry
 */

/**
 * Formátuje hodnotu parametru pro zobrazení - zkracuje nuly na konci
 * @param {number|string} value - hodnota parametru
 * @returns {string} - formátovaná hodnota
 */
export function formatParameterValue(value) {
    if (typeof value === 'number') {
        return value.toFixed(4).replace(/\.?0+$/, '');
    }
    if (typeof value === 'string') {
        if (value.startsWith('EXPRESSION:')) {
            return value.substring(11);
        }
        if (value.startsWith('FLOW:')) {
            return value.substring(6);
        }
    }
    return String(value);
}

/**
 * Extrahuje parametry R z výrazu
 * @param {string} expression - výraz obsahující parametry
 * @returns {Array} - pole parametrů R
 */
export function extractParameters(expression) {
    if (!expression) return [];
    const matches = expression.match(/R\d+/g);
    return matches || [];
}

/**
 * Vytváří vysvětlující text s hodnotami parametrů pro výraz
 * @param {string} expression - výraz s parametry
 * @param {Object} dependencies - objekt s hodnotami parametrů
 * @returns {string} - text s vysvětlením hodnot parametrů
 */
export function createParameterExplanation(expression, dependencies) {
    const params = extractParameters(expression);
    if (!params.length || !dependencies) return "";

    let explanation = " (";
    params.forEach((param, i) => {
        const paramNum = parseInt(param.substring(1), 10);
        if (dependencies[paramNum] !== undefined) {
            const value = formatParameterValue(dependencies[paramNum]);
            explanation += `${param}=${value}`;
            if (i < params.length - 1) explanation += ", ";
        }
    });
    explanation += ")";

    return explanation;
}

/**
 * Aktualizuje text na tlačítkách historie podle počtu záznamů
 * @param {HTMLElement} container - kontejner s tlačítky
 */
export function updateHistoryButtonsText(container = document) {
    const buttons = container.querySelectorAll('.show-history');
    buttons.forEach(button => {
        const paramId = button.getAttribute('data-param');
        const historyDiv = document.getElementById('history-' + paramId);

        if (historyDiv) {
            const isVisible = historyDiv.style.display !== 'none';
            if (!isVisible) {
                const entriesCount = historyDiv.querySelectorAll('.history-entry').length;
                button.textContent = `Změny (${entriesCount})`;
            }
        }
    });
}
