/**
 * Nástroje pro debugování parametrů Sinumerik
 */

/**
 * Vypíše detailní analýzu definic parametrů na stejné řádce
 * @param {Map} paramHistory - Historie parametrů (z cncParametersManager.paramHistory)
 */
export function analyzeSameLineParameters(paramHistory) {
    if (!paramHistory || paramHistory.size === 0) {
        console.info("Žádná historie parametrů k analýze.");
        return;
    }

    // Seskupit parametry podle řádků
    const lineParamMap = new Map();

    for (const [paramNum, history] of paramHistory.entries()) {
        if (!history || history.length === 0) continue;

        const paramDef = history[0]; // První definice
        const line = paramDef.line;

        if (!lineParamMap.has(line)) {
            lineParamMap.set(line, []);
        }

        lineParamMap.get(line).push({
            paramNum: parseInt(paramNum),
            timestamp: paramDef.timestamp,
            value: paramDef.value,
            history
        });
    }

    // Najít řádky s více parametry
    console.group("Analýza řádků s více parametry:");

    let foundMultipleParams = false;

    for (const [line, params] of lineParamMap.entries()) {
        if (params.length > 1) {
            foundMultipleParams = true;

            // Seřadit podle timestampu
            params.sort((a, b) => a.timestamp - b.timestamp);

            console.group(`Řádek ${line} (${params.length} parametrů):`);

            params.forEach((param, index) => {
                let valueDisplay = typeof param.value === 'number'
                    ? param.value
                    : (typeof param.value === 'string' && param.value.startsWith('EXPRESSION:'))
                        ? param.value.substring(11)
                        : param.value;

                console.log(`${index + 1}. R${param.paramNum} = ${valueDisplay} (timestamp: ${param.timestamp})`);

                // PŘIDÁNO: Zobrazit výraz a závislosti
                if (typeof param.value === 'string' && param.value.startsWith('EXPRESSION:')) {
                    const expression = param.value.substring(11);
                    const usedParams = expression.match(/R\d+/g) || [];

                    // Najít, které parametry jsou definovány na stejném řádku
                    const sameLineParams = usedParams.filter(p => {
                        const usedParamNum = parseInt(p.substring(1), 10);
                        return params.some(op => op.paramNum === usedParamNum);
                    });

                    if (sameLineParams.length > 0) {
                        console.log(`   Používá parametry ze stejného řádku: ${sameLineParams.join(', ')}`);
                        console.log(`   DŮLEŽITÉ: Všechny parametry ze stejného řádku jsou dostupné pro výpočet!`);
                    }
                }
            });

            console.log("Pořadí vyhodnocení: " + params.map(p => `R${p.paramNum}`).join(" → "));
            console.log("Poznámka: Všechny parametry na tomto řádku se vzájemně vidí bez ohledu na pořadí.");
            console.groupEnd();
        }
    }

    if (!foundMultipleParams) {
        console.log("Žádné řádky s více parametry.");
    }

    console.groupEnd();
}

/**
 * Zobrazí detailní informace o parametru
 * @param {number} paramNum - Číslo parametru
 * @param {Map} paramHistory - Historie parametrů (z cncParametersManager.paramHistory)
 * @param {Map} parameters - Aktuální hodnoty parametrů (z cncParametersManager.parameters)
 */
export function inspectParameter(paramNum, paramHistory, parameters) {
    console.group(`Inspekce parametru R${paramNum}:`);

    // Aktuální hodnota
    const currentValue = parameters.get(paramNum);
    console.log(`Aktuální hodnota: ${currentValue}`);

    // Historie
    const history = paramHistory.get(paramNum);
    if (history && history.length > 0) {
        console.group(`Historie (${history.length} změn):`);

        history.forEach((entry, index) => {
            let valueDisplay = typeof entry.value === 'number'
                ? entry.value
                : (typeof entry.value === 'string' && entry.value.startsWith('EXPRESSION:'))
                    ? entry.value.substring(11)
                    : entry.value;

            const time = new Date(entry.timestamp).toISOString().substr(11, 12);
            console.log(`${index + 1}. Řádek ${entry.line}: R${paramNum} = ${valueDisplay} (${time})`);

            // Zobrazit závislosti, pokud existují
            if (entry.dependencies) {
                console.group("Závislosti:");
                for (const [depNum, depValue] of Object.entries(entry.dependencies)) {
                    console.log(`  R${depNum} = ${depValue}`);
                }
                console.groupEnd();
            }
        });

        console.groupEnd();
    } else {
        console.log("Žádná historie parametru.");
    }

    console.groupEnd();
}

/**
 * Zobrazí přehled definice parametrů v pořadí řádků
 * @param {Map} paramHistory - Historie parametrů (z cncParametersManager.paramHistory)
 */
export function showParametersInLineOrder(paramHistory) {
    if (!paramHistory || paramHistory.size === 0) {
        console.info("Žádná historie parametrů k analýze.");
        return;
    }

    console.group("Parametry podle řádků:");

    // Seskupit parametry podle řádků, na kterých byly definovány
    const lineParamMap = new Map();

    for (const [paramNum, history] of paramHistory.entries()) {
        if (!history || history.length === 0) continue;

        const firstDef = history[0]; // První definice parametru
        const line = firstDef.line;

        if (!lineParamMap.has(line)) {
            lineParamMap.set(line, []);
        }

        lineParamMap.get(line).push({
            paramNum: parseInt(paramNum),
            value: firstDef.value,
            timestamp: firstDef.timestamp
        });
    }

    // Seřadit řádky vzestupně
    const sortedLines = Array.from(lineParamMap.keys()).sort((a, b) => a - b);

    // Vypsat parametry podle řádků
    for (const line of sortedLines) {
        const params = lineParamMap.get(line);

        // Seřadit parametry na řádku podle času definice
        params.sort((a, b) => a.timestamp - b.timestamp);

        console.group(`Řádek ${line}: ${params.length} parametr(ů)`);

        for (const param of params) {
            let valueDisplay;

            if (typeof param.value === 'number') {
                valueDisplay = param.value;
            } else if (typeof param.value === 'string') {
                if (param.value.startsWith('EXPRESSION:')) {
                    valueDisplay = param.value.substring(11);
                } else if (param.value.startsWith('FLOW:')) {
                    valueDisplay = param.value.substring(5);
                } else {
                    valueDisplay = param.value;
                }
            } else {
                valueDisplay = String(param.value);
            }

            console.log(`  R${param.paramNum} = ${valueDisplay}`);
        }

        console.groupEnd();
    }

    console.groupEnd();
}
