/**
 * Matematická knihovna pro podporu Sinumerik CNC operací
 * Poskytuje funkce a konstanty pro vyhodnocování matematických výrazů v Sinumerik kódu
 */

// Konstanty
const PI = Math.PI;
const E = Math.E;

/**
 * Sinusová funkce (Sinumerik používá úhly v stupních)
 * @param {number} angle - úhel ve stupních
 * @returns {number} - sinus úhlu
 */
function SIN(angle) {
    return Math.sin(angle * Math.PI / 180);
}

/**
 * Kosinová funkce (Sinumerik používá úhly ve stupních)
 * @param {number} angle - úhel ve stupních
 * @returns {number} - kosinus úhlu
 */
function COS(angle) {
    return Math.cos(angle * Math.PI / 180);
}

/**
 * Tangensová funkce (Sinumerik používá úhly ve stupních)
 * @param {number} angle - úhel ve stupních
 * @returns {number} - tangens úhlu
 */
function TAN(angle) {
    return Math.tan(angle * Math.PI / 180);
}

/**
 * Odmocnina
 * @param {number} value - hodnota
 * @returns {number} - odmocnina hodnoty
 */
function SQRT(value) {
    return Math.sqrt(value);
}

/**
 * Absolutní hodnota
 * @param {number} value - hodnota
 * @returns {number} - absolutní hodnota
 */
function ABS(value) {
    return Math.abs(value);
}

/**
 * Arkustangens (Sinumerik vrací stupně)
 * @param {number} value - hodnota
 * @returns {number} - arkustangens v stupních
 */
function ATAN(value) {
    return Math.atan(value) * 180 / Math.PI;
}

/**
 * Arkustangens ze dvou hodnot (Sinumerik vrací stupně)
 * @param {number} y - hodnota y
 * @param {number} x - hodnota x
 * @returns {number} - arkustangens v stupních
 */
function ATAN2(y, x) {
    return Math.atan2(y, x) * 180 / Math.PI;
}

/**
 * Zaokrouhlení nahoru
 * @param {number} value - hodnota
 * @returns {number} - zaokrouhlená hodnota nahoru
 */
function CEIL(value) {
    return Math.ceil(value);
}

/**
 * Zaokrouhlení dolů
 * @param {number} value - hodnota
 * @returns {number} - zaokrouhlená hodnota dolů
 */
function FLOOR(value) {
    return Math.floor(value);
}

/**
 * Zaokrouhlení na nejbližší celé číslo
 * @param {number} value - hodnota
 * @returns {number} - zaokrouhlená hodnota
 */
function ROUND(value) {
    return Math.round(value);
}

/**
 * Převede stupně na radiány
 * @param {number} degrees - úhel ve stupních
 * @returns {number} - úhel v radiánech
 */
function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Převede radiány na stupně
 * @param {number} radians - úhel v radiánech
 * @returns {number} - úhel ve stupních
 */
function toDegrees(radians) {
    return radians * 180 / Math.PI;
}

/**
 * Vyhodnotí matematický výraz podle syntaxe Sinumerik
 * @param {string} expression - matematický výraz
 * @param {Object} parameters - objekt s parametry (R hodnoty)
 * @returns {number|null} - výsledek výrazu nebo null při chybě
 */
function evaluateSinumerikExpression(expression, parameters = {}) {
    try {
        // Pro ladění vypsat hodnoty parametrů
        console.log(`Vyhodnocuji výraz: '${expression}' s parametry:`, {...parameters});

        // Speciální případ - pokud výraz obsahuje GOTOF, GOTOB, IF atd., jde o řídící příkazy, ne o výrazy
        if (/\b(GOTOF|GOTOB|IF|WHILE|REPEAT)\b/.test(expression)) {
            return null;  // Nemá smysl vyhodnocovat jako matematický výraz
        }

        // Pokud výraz začíná na '=', je to přiřazení, ne výraz k vyhodnocení
        if (expression.trim().startsWith('=')) {
            return null;  // Nemá smysl vyhodnocovat jako matematický výraz
        }

        // Detekovat konkrétní chybějící parametry pro lepší hlášení chyb
        const rParams = expression.match(/R\d+/g);
        if (rParams) {
            const missingParams = [];
            for (const param of rParams) {
                const paramNum = parseInt(param.substring(1), 10);
                if (parameters[paramNum] === undefined) {
                    missingParams.push(param);
                }
            }

            if (missingParams.length > 0) {
                // Pro lepší debugging přidáme hodnoty všech parametrů, které máme k dispozici
                console.warn(`Chyba při vyhodnocení výrazu '${expression}': Chybějící parametry: ${missingParams.join(', ')}`);
                console.log('Dostupné parametry:', Object.keys(parameters).map(k => `R${k}`).join(', '));
                return null;
            }
        }

        // Vytvořit jednoduchý výraz bez matematických funkcí
        if (!rParams) {
            // Pokud výraz neobsahuje parametry, zkusíme přímé vyhodnocení
            try {
                const value = new Function('return ' + expression)();
                if (typeof value === 'number' && !isNaN(value)) {
                    return value;
                }
            } catch (e) {
                console.warn(`Nelze vyhodnotit přímý výraz '${expression}': ${e.message}`);
            }
        }

        // Pokračovat ve vyhodnocení výrazu
        let jsExpression = expression;

        // Nahradit R parametry hodnotami
        if (rParams) {
            for (const param of rParams) {
                const paramNum = parseInt(param.substring(1), 10);
                const value = parameters[paramNum];
                if (value !== undefined) {
                    jsExpression = jsExpression.replace(
                        new RegExp(`\\b${param}\\b`, 'g'),
                        value
                    );
                } else {
                    throw new Error(`Parametr ${param} nebyl nalezen`);
                }
            }
        }

        console.log(`Výraz po substituci: ${jsExpression}`);

        // Nahradit Sinumerik funkce jejich JS ekvivalenty
        jsExpression = jsExpression
            .replace(/SIN\(/g, 'SIN(')
            .replace(/COS\(/g, 'COS(')
            .replace(/TAN\(/g, 'TAN(')
            .replace(/SQRT\(/g, 'SQRT(')
            .replace(/ABS\(/g, 'ABS(')
            .replace(/ATAN\(/g, 'ATAN(')
            .replace(/ATAN2\(/g, 'ATAN2(')
            .replace(/ROUND\(/g, 'ROUND(')
            .replace(/CEIL\(/g, 'CEIL(')
            .replace(/FLOOR\(/g, 'FLOOR(');

        // Vytvořit funkci pro vyhodnocení výrazu
        const evaluator = new Function(
            'SIN', 'COS', 'TAN', 'SQRT', 'ABS', 'ATAN', 'ATAN2', 'ROUND', 'CEIL', 'FLOOR', 'PI', 'E',
            `return ${jsExpression};`
        );

        // Vyhodnotit výraz
        return evaluator(
            SIN, COS, TAN, SQRT, ABS, ATAN, ATAN2, ROUND, CEIL, FLOOR, PI, E
        );
    } catch (error) {
        console.warn(`Chyba při vyhodnocení výrazu '${expression}': ${error.message}`);
        return null;
    }
}

export {
    SIN, COS, TAN, SQRT, ABS, ATAN, ATAN2,
    ROUND, CEIL, FLOOR,
    toRadians, toDegrees,
    evaluateSinumerikExpression,
    PI, E
};
