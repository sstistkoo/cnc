/**
 * Pomocná třída pro debugování a trasování vyhodnocování parametrů
 */

class ParameterDebugger {
    constructor() {
        this.debugEnabled = true;
        this.traceHistory = [];
        this.maxTraceLength = 100;
    }

    /**
     * Povolí nebo zakáže debugování
     * @param {boolean} enabled - zda je debugování povoleno
     */
    setDebugEnabled(enabled) {
        this.debugEnabled = enabled;
    }

    /**
     * Zaznamená krok vyhodnocení výrazu
     * @param {string} expression - výraz, který je vyhodnocován
     * @param {number} paramNum - číslo parametru
     * @param {Object} params - použité parametry
     * @param {number|null} result - výsledek vyhodnocení
     */
    traceEvaluation(expression, paramNum, params, result) {
        if (!this.debugEnabled) return;

        this.traceHistory.push({
            timestamp: Date.now(),
            expression,
            paramNum,
            params: {...params},
            result,
            stack: new Error().stack
        });

        // Omezit délku historie
        if (this.traceHistory.length > this.maxTraceLength) {
            this.traceHistory.shift();
        }

        // Vypsat informaci do konzole
        console.log(`[TRACE] R${paramNum} = ${expression} => ${result !== null ? result : "chyba"}`);
    }

    /**
     * Vypíše trasovací historii
     * @param {number} limit - maximální počet položek k zobrazení
     */
    printTraceHistory(limit = 10) {
        console.group("Historie vyhodnocování parametrů");
        const historyToShow = this.traceHistory.slice(-limit);

        historyToShow.forEach((item, index) => {
            const time = new Date(item.timestamp).toLocaleTimeString();
            console.log(`${index + 1}. [${time}] R${item.paramNum} = ${item.expression} => ${item.result !== null ? item.result : "chyba"}`);
        });

        console.groupEnd();
    }

    /**
     * Analyzuje parametry, které způsobují problémy
     * @returns {Array} - pole problémových parametrů
     */
    analyzeProblematicParameters() {
        const problemParams = new Map();

        // Procházet historii a hledat chyby
        this.traceHistory.forEach(item => {
            if (item.result === null) {
                if (!problemParams.has(item.paramNum)) {
                    problemParams.set(item.paramNum, {
                        count: 0,
                        expressions: new Set()
                    });
                }

                const record = problemParams.get(item.paramNum);
                record.count++;
                record.expressions.add(item.expression);
            }
        });

        // Převést na pole pro výstup
        return Array.from(problemParams.entries())
            .map(([paramNum, info]) => ({
                paramNum,
                failCount: info.count,
                expressions: Array.from(info.expressions)
            }))
            .sort((a, b) => b.failCount - a.failCount);
    }

    /**
     * Analyzuje definice parametrů na stejném řádku
     * @param {Object} paramHistory - Historie parametrů
     * @returns {Array} - Seznam parametrů definovaných na stejném řádku
     */
    analyzeParamsOnSameLine(paramHistory) {
        // Vytvořit mapu řádků a parametrů na nich
        const lineMap = new Map();

        // Procházet všechny parametry a jejich historie
        for (const [paramNum, history] of Object.entries(paramHistory)) {
            if (!history || history.length === 0) continue;

            // Vzít první definici parametru
            const firstDef = history[0];
            const line = firstDef.line;

            // Přidat do mapy řádků
            if (!lineMap.has(line)) {
                lineMap.set(line, []);
            }

            lineMap.get(line).push({
                paramNum: parseInt(paramNum, 10),
                timestamp: firstDef.timestamp,
                value: firstDef.value
            });
        }

        // Filtrovat jen řádky s více parametry
        const sameLineParams = [];
        for (const [line, params] of lineMap.entries()) {
            if (params.length > 1) {
                // Seřadit parametry podle času definice
                params.sort((a, b) => a.timestamp - b.timestamp);

                sameLineParams.push({
                    line,
                    params,
                    count: params.length
                });
            }
        }

        return sameLineParams.sort((a, b) => b.count - a.count);
    }
}

// Globální instance pro použití v aplikaci
export const paramDebugger = new ParameterDebugger();
