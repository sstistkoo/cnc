/**
 * cnc-line-parser.js
 *
 * Parser pro řádky CNC kódu Sinumerik
 * Tento modul poskytuje funkce pro parsování jednotlivých řádků CNC kódu
 */

/**
 * Rozparsuje jeden řádek CNC kódu
 * @param {string} line - Řádek CNC kódu
 * @param {number} lineNumber - Číslo řádku v programu
 * @returns {Object} - Objekt obsahující parsovaná data
 */
export function parseLine(line, lineNumber) {
    // Odstranit komentáře a získat čistý kód
    const commentStart = line.indexOf(';');
    const code = commentStart >= 0 ? line.substring(0, commentStart).trim() : line.trim();
    const comment = commentStart >= 0 ? line.substring(commentStart + 1).trim() : '';

    // Přeskočit prázdné řádky
    if (code === '' && comment === '') {
        return {
            type: 'empty',
            lineNumber,
            originalLine: line,
            isEmpty: true
        };
    }

    // Pokud je řádek pouze komentář
    if (code === '' && comment !== '') {
        return {
            type: 'comment',
            lineNumber,
            originalLine: line,
            comment,
            isEmpty: false
        };
    }

    // Základní struktura pro parsovaný řádek
    const parsed = {
        type: 'code',
        lineNumber,
        originalLine: line,
        comment,
        isEmpty: false,
        tokens: [],
        blockNumber: null,
        gCodes: [],
        mCodes: [],
        coordinates: {},
        parameters: {}
    };

    // Rozdělit řádek na jednotlivé tokeny (slova)
    const tokens = code.split(/\s+/);
    parsed.tokens = tokens;

    // Projít všechny tokeny a rozparsovat je
    for (const token of tokens) {
        if (token.length < 2) continue; // Přeskočit příliš krátké tokeny

        const addressChar = token.charAt(0).toUpperCase();
        const value = token.substring(1);

        // Zpracovat různé typy adresových znaků
        switch (addressChar) {
            case 'N': // Číslo bloku
                parsed.blockNumber = parseInt(value, 10);
                break;

            case 'G': // G kódy
                const gCode = parseFloat(value);
                parsed.gCodes.push(gCode);
                break;

            case 'M': // M kódy
                const mCode = parseInt(value, 10);
                parsed.mCodes.push(mCode);
                break;

            case 'X': // X souřadnice
            case 'Y': // Y souřadnice
            case 'Z': // Z souřadnice
                parsed.coordinates[addressChar] = parseFloatValue(value);
                break;

            case 'I': // I parametr pro kruhovou interpolaci
            case 'J': // J parametr pro kruhovou interpolaci
            case 'K': // K parametr pro kruhovou interpolaci
            case 'R': // R parametr pro rádius
                parsed.parameters[addressChar] = parseFloatValue(value);
                break;

            case 'F': // Rychlost posuvu
                parsed.feedRate = parseFloatValue(value);
                break;

            case 'S': // Otáčky vřetena
                parsed.spindleSpeed = parseFloatValue(value);
                break;

            case 'T': // Nástroj
                parsed.tool = parseInt(value, 10);
                break;

            case 'D': // Korekce nástroje
                parsed.toolOffset = parseInt(value, 10);
                break;

            case 'L': // Volání podprogramu
                parsed.subprogram = parseInt(value, 10);
                parsed.type = 'subprogram_call';
                break;

            default:
                // Neznámý typ adresového znaku
                if (!parsed.unknownTokens) parsed.unknownTokens = [];
                parsed.unknownTokens.push(token);
        }
    }

    // Určení typu řádku na základě obsahu
    determineLineType(parsed);

    return parsed;
}

/**
 * Bezpečně parsuje float hodnotu, i když obsahuje výrazy s parametry
 * @param {string} value - Hodnota k parsování
 * @returns {number|string} - Parsovaná hodnota (číslo nebo výraz)
 */
function parseFloatValue(value) {
    // Pokud hodnota obsahuje speciální znaky, vrátit hodnotu jako výraz
    if (value.includes('=') || value.includes('+') || value.includes('-') || value.includes('*') || value.includes('/')) {
        return value; // Vrátit jako výraz
    }

    // Jinak zkusit parsovat jako float
    const num = parseFloat(value);
    return isNaN(num) ? value : num;
}

/**
 * Určí typ řádku na základě obsahu
 * @param {Object} parsed - Parsovaná data řádku
 */
function determineLineType(parsed) {
    if (parsed.type === 'subprogram_call') {
        return; // Již nastaveno
    }

    // Kontrola přítomnosti G-kódů pro určení typu řádku
    if (parsed.gCodes.length > 0) {
        if (parsed.gCodes.includes(0)) {
            parsed.type = 'rapid_move'; // Rychloposuv
        } else if (parsed.gCodes.includes(1)) {
            parsed.type = 'linear_move'; // Lineární interpolace
        } else if (parsed.gCodes.includes(2)) {
            parsed.type = 'arc_cw'; // Kruhová interpolace ve směru hodinových ručiček
        } else if (parsed.gCodes.includes(3)) {
            parsed.type = 'arc_ccw'; // Kruhová interpolace proti směru hodinových ručiček
        } else if (parsed.gCodes.includes(17) || parsed.gCodes.includes(18) || parsed.gCodes.includes(19)) {
            parsed.type = 'plane_selection'; // Výběr roviny
        } else if (parsed.gCodes.includes(90)) {
            parsed.type = 'absolute_mode'; // Absolutní programování
        } else if (parsed.gCodes.includes(91)) {
            parsed.type = 'incremental_mode'; // Přírůstkové programování
        } else if (parsed.gCodes.includes(54) || parsed.gCodes.includes(55) || parsed.gCodes.includes(56) ||
                  parsed.gCodes.includes(57) || parsed.gCodes.includes(58) || parsed.gCodes.includes(59)) {
            parsed.type = 'work_offset'; // Posunutí nulového bodu
        } else {
            parsed.type = 'g_code'; // Obecný G-kód
        }
    } else if (parsed.mCodes.length > 0) {
        // M kódy
        if (parsed.mCodes.includes(0)) {
            parsed.type = 'program_stop'; // Programový stop
        } else if (parsed.mCodes.includes(1)) {
            parsed.type = 'optional_stop'; // Volitelný stop
        } else if (parsed.mCodes.includes(2)) {
            parsed.type = 'program_end'; // Konec programu
        } else if (parsed.mCodes.includes(3) || parsed.mCodes.includes(4)) {
            parsed.type = 'spindle_control'; // Řízení vřetena
        } else if (parsed.mCodes.includes(5)) {
            parsed.type = 'spindle_stop'; // Zastavení vřetena
        } else if (parsed.mCodes.includes(6)) {
            parsed.type = 'tool_change'; // Výměna nástroje
        } else if (parsed.mCodes.includes(7) || parsed.mCodes.includes(8)) {
            parsed.type = 'coolant_control'; // Řízení chlazení
        } else if (parsed.mCodes.includes(9)) {
            parsed.type = 'coolant_stop'; // Zastavení chlazení
        } else if (parsed.mCodes.includes(30)) {
            parsed.type = 'program_end_rewind'; // Konec programu s přetokem
        } else {
            parsed.type = 'm_code'; // Obecný M-kód
        }
    } else if (Object.keys(parsed.coordinates).length > 0) {
        parsed.type = 'position_data'; // Pouze poziční data
    } else if (parsed.tool !== undefined) {
        parsed.type = 'tool_selection'; // Výběr nástroje
    } else if (parsed.subprogram !== undefined) {
        parsed.type = 'subprogram_call'; // Volání podprogramu
    } else if (parsed.blockNumber !== null && Object.keys(parsed).length <= 5) {
        parsed.type = 'block_number'; // Pouze číslo bloku
    } else {
        parsed.type = 'other'; // Ostatní typy řádků
    }
}

/**
 * Parsuje celý CNC program a vrací pole parsovaných řádků
 * @param {string} program - CNC program k parsování
 * @returns {Array} - Pole parsovaných řádků
 */
export function parseProgram(program) {
    // Rozdělit program na řádky
    const lines = program.split('\n');
    const parsedLines = [];

    // Parsovat každý řádek
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parsedLine = parseLine(line, i + 1);
        parsedLines.push(parsedLine);

        // Vypisovat do konzole každý parsovaný řádek - upraven styl pro lepší čitelnost
        console.log(`Řádek ${i + 1}: ${line}`); // Změněno z barevného na běžný formát
        console.groupCollapsed(`Detaily řádku ${i + 1}`); // Přidáno číslo řádku do popisu skupiny
        console.log(parsedLine);
        console.groupEnd();
    }

    return parsedLines;
}
