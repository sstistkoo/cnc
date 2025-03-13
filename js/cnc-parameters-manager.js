// CNC Parameters Manager - správa a detekce parametrů CNC programu

import { evaluateSinumerikExpression } from './sinumerik-math.js';

/**
 * Třída pro správu CNC parametrů
 */
class CNCParametersManager {
    constructor() {
        this.parameters = new Map(); // Mapa všech parametrů: R[číslo] -> hodnota
        this.paramHistory = new Map(); // Historie změn parametrů
        this.initialized = false;
        this.expressions = new Map(); // Mapa pro uchovávání výrazů
    }

    /**
     * Inicializace manageru parametrů
     */
    initialize() {
        // Přidat posluchače událostí pro tlačítko parametrů
        const cncParamsButton = document.getElementById('cncParamsButton');
        if (cncParamsButton) {
            cncParamsButton.addEventListener('click', () => {
                this.showParametersModal();
            });
        }

        this.initialized = true;
        console.log('CNC Parameters Manager inicializován');
    }

    /**
     * Parsování parametrů z kódu
     * @param {string} code - CNC kód
     */
    parseParameters(code) {
        // Vyčistit stávající parametry
        this.parameters.clear();
        this.paramHistory.clear();
        this.expressions.clear();

        if (!code) return;

        const lines = Array.isArray(code) ? code : code.split('\n');

        // Zpracovat parametry v pořadí, jak se vyskytují v kódu s podporou postupných změn
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            try {
                // Odstranit komentáře
                const commentStart = line.indexOf(';');
                const cleanLine = commentStart >= 0 ? line.substring(0, commentStart).trim() : line.trim();

                if (!cleanLine) continue;

                // Extrahovat všechny definice parametrů R na řádku
                // Různé varianty syntaxe Sinumerik:
                // R100=5.0 R101=10 R102=(R100+R101)
                // R5=0.4041
                // N20 R54=R54*R69

                // Uložit hodnoty parametrů použitých ve výrazech před aktuálním řádkem
                // To zajistí, že máme referenci na hodnotu parametru před změnou
                const usedParams = new Set();
                const paramValuesBefore = new Map();

                // Najít všechny parametry R použité ve výrazech na tomto řádku
                const rParamMatches = cleanLine.match(/R\d+/g);
                if (rParamMatches) {
                    rParamMatches.forEach(match => {
                        const paramNum = parseInt(match.substring(1), 10);
                        usedParams.add(paramNum);
                        if (this.parameters.has(paramNum)) {
                            paramValuesBefore.set(paramNum, this.parameters.get(paramNum));
                        }
                    });
                }

                // Pokračovat v parsování řádku...
                let position = 0;
                while (position < cleanLine.length) {
                    // Najít další definici R parametru
                    const rIndex = cleanLine.indexOf('R', position);
                    if (rIndex === -1) break;

                    // Zjistit, zda jde o definici (R1=...) nebo použití v rámci výrazu
                    // Musíme zkontrolovat, zda za R následuje číslice a později =
                    let numEnd = rIndex + 1;
                    while (numEnd < cleanLine.length && /\d/.test(cleanLine[numEnd])) {
                        numEnd++;
                    }

                    // Pokud za R následuje číslo, a poté =, jde o definici parametru
                    if (numEnd > rIndex + 1) {
                        const eqIndex = cleanLine.indexOf('=', numEnd);
                        if (eqIndex !== -1 && eqIndex < cleanLine.length - 1) {
                            // Získat číslo parametru
                            const paramNum = parseInt(cleanLine.substring(rIndex + 1, numEnd), 10);

                            // Najít konec hodnoty (může být ohraničena mezerou, dalším R, nebo koncem řádku)
                            let valueEnd = eqIndex + 1;
                            while (valueEnd < cleanLine.length) {
                                // Pokud narazíme na další definici R parametru, končíme
                                if (cleanLine[valueEnd] === 'R' &&
                                    valueEnd + 1 < cleanLine.length &&
                                    /\d/.test(cleanLine[valueEnd + 1])) {

                                    // Zkontrolujeme, zda toto R není součástí výrazu (např. R1+R2)
                                    // Musíme se podívat na předchozí znak, jestli je to operátor
                                    const prevChar = cleanLine[valueEnd - 1];
                                    if (!/[\+\-\*\/\(\=]/.test(prevChar)) {
                                        break;
                                    }
                                }
                                valueEnd++;
                            }

                            // Extrahovat hodnotu parametru
                            let paramValue = cleanLine.substring(eqIndex + 1, valueEnd).trim();

                            // Vyhodnotit hodnotu parametru s vědomím předchozích hodnot
                            this.processParameterDefinition(paramNum, paramValue, lineNumber, paramValuesBefore);

                            // Posunout pozici za zpracovanou definici
                            position = valueEnd;
                        } else {
                            // Nejde o definici, posunout se za R
                            position = rIndex + 1;
                        }
                    } else {
                        // Nejde o definici, posunout se za R
                        position = rIndex + 1;
                    }
                }
            } catch (err) {
                console.warn(`Chyba při parsování parametrů na řádku ${lineNumber}: ${err.message}`);
            }
        }

        // Druhý průchod pro vyhodnocení matematických výrazů
        this.evaluateExpressions();

        console.log(`Detekováno ${this.parameters.size} parametrů CNC programu`);
        return this.parameters;
    }

    /**
     * Zpracuje definici parametru
     * @param {number} paramNum - Číslo parametru
     * @param {string} valueStr - Řetězec s hodnotou nebo výrazem
     * @param {number} lineNumber - Číslo řádku
     * @param {Map} paramValuesBefore - Hodnoty parametrů před změnou (pro reference ve výrazech)
     */
    processParameterDefinition(paramNum, valueStr, lineNumber, paramValuesBefore = new Map()) {
        // Odstranit přebytečné mezery
        const value = valueStr.trim();

        // Speciální zpracování pro Sinumerik
        // Pokud hodnota obsahuje GOTO, IF apod., označit jako řídící příkaz a nepokračovat v dalším zpracování
        if (/GOTO[FB]|IF|WHILE|REPEAT/.test(value) || value.startsWith('=')) {
            this.setParameter(paramNum, `FLOW: ${value}`, lineNumber);
            return;
        }

        // Jednoduchý případ - číslo
        if (/^-?\d+(\.\d+)?$/.test(value)) {
            const numValue = parseFloat(value);
            this.setParameter(paramNum, numValue, lineNumber);
            return;
        }

        // Detekce matematických operací a výrazů
        this.setParameter(paramNum, `EXPRESSION: ${value}`, lineNumber);
        this.expressions.set(paramNum, value);

        // Pokud výraz obsahuje jiné R parametry, uložíme informaci o použitých hodnotách
        const usedRParams = value.match(/R\d+/g);
        if (usedRParams) {
            const usedParamsInfo = {};
            const missingParams = [];

            usedRParams.forEach(param => {
                const usedParamNum = parseInt(param.substring(1), 10);
                if (paramValuesBefore.has(usedParamNum)) {
                    usedParamsInfo[usedParamNum] = paramValuesBefore.get(usedParamNum);
                } else if (this.parameters.has(usedParamNum)) {
                    usedParamsInfo[usedParamNum] = this.parameters.get(usedParamNum);
                } else {
                    missingParams.push(param);
                }
            });

            // Uložit informaci o použitých parametrech pro tento výraz
            if (Object.keys(usedParamsInfo).length > 0) {
                this.setParameterDependencies(paramNum, usedParamsInfo, lineNumber);
            }
        }
    }

    /**
     * Uloží informace o závislostech parametru na jiných parametrech
     * @param {number} paramNum - Číslo parametru
     * @param {Object} dependencies - Objekt s hodnotami parametrů, na kterých závisí
     * @param {number} line - Číslo řádku
     */
    setParameterDependencies(paramNum, dependencies, line) {
        if (!this.paramHistory.has(paramNum)) {
            this.paramHistory.set(paramNum, []);
        }

        const history = this.paramHistory.get(paramNum);
        const lastEntry = history[history.length - 1];

        // Přidat informace o závislostech do posledního záznamu historie
        if (lastEntry && lastEntry.line === line) {
            lastEntry.dependencies = dependencies;
        }
    }

    /**
     * Vyhodnotí matematické výrazy parametrů s podporou postupných změn
     * Podporuje výpočty mezi parametry (R1=R2+R3, R4=R5*2, atd.)
     */
    evaluateExpressions() {
        // Před použitím běžné metody, zkusit vyhodnotit pomocí knihovny Sinumerik math
        const paramValues = {};
        const undefinedParams = new Set();
        const paramDefinitionOrder = []; // Nové pole pro sledování pořadí definic

        // Nejprve načteme všechny již známé hodnoty parametrů - ale jen ty, které jsou skutečně čísla
        for (const [paramNum, value] of this.parameters.entries()) {
            if (typeof value === 'number') {
                paramValues[paramNum] = value;
            } else if (typeof value === 'string' && !value.startsWith('FLOW:') && !value.startsWith('EXPRESSION:')) {
                // Zkusit převést na číslo
                const numVal = parseFloat(value);
                if (!isNaN(numVal)) {
                    paramValues[paramNum] = numVal;
                    this.parameters.set(paramNum, numVal); // Aktualizovat hodnotu parametru
                }
            }
        }

        console.log("Počáteční hodnoty parametrů:", JSON.stringify(paramValues));

        // Nejprve sestavíme pole parametrů v pořadí, v jakém jsou definovány v kódu
        const paramOrderMap = new Map(); // Mapa pro pamatování řádku, kde byl parametr poprvé definován

        // Projít historii všech parametrů a zjistit jejich pořadí definice
        for (const [paramNum, history] of this.paramHistory.entries()) {
            if (history && history.length > 0) {
                // První záznam v historii obsahuje řádek, kde byl parametr poprvé definován
                const firstEntry = history[0];
                paramOrderMap.set(parseInt(paramNum, 10), firstEntry.line);
            }
        }

        // Seřadit parametry podle řádku, kde byly poprvé definovány
        const sortedParams = Array.from(paramOrderMap.entries())
            .sort((a, b) => a[1] - b[1])
            .map(([paramNum]) => paramNum);

        console.log("Pořadí vyhodnocení parametrů podle definice v kódu:", sortedParams);

        // Postupně vyhodnocovat parametry v pořadí, v jakém jsou definovány v kódu
        for (const paramNum of sortedParams) {
            // Pokud má parametr výraz, pokusit se ho vyhodnotit
            if (this.expressions.has(paramNum)) {
                const expression = this.expressions.get(paramNum);

                // Přeskočit řídící příkazy
                if (typeof expression === 'string' && expression.startsWith('FLOW:')) {
                    continue;
                }

                // Odstranit případný prefix "EXPRESSION:"
                const expressionToEval = typeof expression === 'string' && expression.startsWith('EXPRESSION:') ?
                    expression.substring(11) : expression;

                console.log(`Vyhodnocování parametru R${paramNum} = ${expressionToEval}`);
                console.log(`Dostupné hodnoty:`, paramValues);

                try {
                    // Zkusit vyhodnotit výraz s aktuálně dostupnými parametry
                    const result = this.evaluateExpressionWithDependencies(expressionToEval, paramNum, paramValues);

                    if (result !== null) {
                        console.log(`Parametr R${paramNum} vyhodnocen: ${result}`);
                        this.parameters.set(paramNum, result);
                        paramValues[paramNum] = result; // Aktualizovat pro další výrazy
                    } else {
                        console.log(`Parametr R${paramNum} nelze vyhodnotit, chybí některé závislosti`);
                    }
                } catch (e) {
                    console.warn(`Chyba při vyhodnocení výrazu pro R${paramNum}: ${e.message}`);
                }
            }
        }

        // Pokusit se ještě jednou vyhodnotit výrazy, které nevyšly v prvním průchodu
        let changed = true;
        let iterations = 0;
        const MAX_ITERATIONS = 5; // Omezit počet iterací

        while (changed && iterations < MAX_ITERATIONS) {
            iterations++;
            changed = false;

            for (const paramNum of sortedParams) {
                // Přeskočit parametry, které již mají číselnou hodnotu
                if (typeof this.parameters.get(paramNum) === 'number') {
                    continue;
                }

                // Pokud má parametr výraz, pokusit se ho vyhodnotit znovu
                if (this.expressions.has(paramNum)) {
                    const expression = this.expressions.get(paramNum);

                    // Přeskočit řídící příkazy
                    if (typeof expression === 'string' && expression.startsWith('FLOW:')) {
                        continue;
                    }

                    // Odstranit případný prefix "EXPRESSION:"
                    const expressionToEval = typeof expression === 'string' && expression.startsWith('EXPRESSION:') ?
                        expression.substring(11) : expression;

                    try {
                        const result = this.evaluateExpressionWithDependencies(expressionToEval, paramNum, paramValues);

                        if (result !== null) {
                            console.log(`V iteraci ${iterations}: R${paramNum} = ${result}`);
                            this.parameters.set(paramNum, result);
                            paramValues[paramNum] = result;
                            changed = true;
                        }
                    } catch (e) {
                        // Ignorovat chyby v této fázi
                    }
                }
            }
        }

        console.log(`Vyhodnocení dokončeno po ${iterations} dodatečných iteracích`);
    }

    /**
     * Vyhodnotí jednoduchý matematický výraz s podporou parametrů
     * @param {string} expression - výraz k vyhodnocení
     * @param {Object} paramValues - hodnoty parametrů
     * @returns {number|null} - vyhodnocená hodnota nebo null při chybě
     */
    evaluateSimpleExpression(expression, paramValues) {
        try {
            // Nahradit R parametry hodnotami
            let jsExpression = expression;
            const rParams = expression.match(/R\d+/g);

            // Kontrola, zda máme všechny potřebné parametry
            if (rParams) {
                for (const param of rParams) {
                    const paramNum = parseInt(param.substring(1), 10);
                    if (paramValues[paramNum] === undefined) {
                        console.log(`Chybí parametr ${param} pro výraz ${expression}`);
                        return null;
                    }
                }

                // Nahradit parametry hodnotami
                for (const param of rParams) {
                    const paramNum = parseInt(param.substring(1), 10);
                    jsExpression = jsExpression.replace(
                        new RegExp(`\\b${param}\\b`, 'g'),
                        paramValues[paramNum]
                    );
                }
            }

            // Vyhodnotit výraz
            const result = new Function('return ' + jsExpression)();
            if (typeof result === 'number' && !isNaN(result)) {
                return result;
            }
            return null;
        } catch (e) {
            console.log(`Chyba při vyhodnocení výrazu '${expression}': ${e.message}`);
            return null;
        }
    }

    /**
     * Pokusí se vyřešit zbývající výrazy, které se nepodařilo vyřešit v prvním průchodu
     */
    resolveRemainingExpressions() {
        // Najít nevyřešené výrazy
        const unresolved = [];
        for (const [paramNum, value] of this.parameters.entries()) {
            if (typeof value === 'string' && !value.startsWith('FLOW:')) {
                unresolved.push(paramNum);
            }
        }

        // Pokud už nemáme co řešit, končíme
        if (unresolved.length === 0) {
            return;
        }

        console.log(`Pokus o řešení ${unresolved.length} nevyřešených výrazů`);

        // Pro demonstrační účely nastavíme výchozí hodnoty pro nevyřešené parametry
        for (const paramNum of unresolved) {
            // Pokud parametr není nastaven, nastavíme výchozí hodnotu 0
            if (!this.parameters.has(paramNum)) {
                this.parameters.set(paramNum, 0);
            }
        }
    }

    /**
     * Nastavení parametru s historií
     * @param {number|string} key - číslo parametru nebo název makra
     * @param {number|string} value - hodnota parametru
     * @param {number} line - číslo řádku
     */
    setParameter(key, value, line) {
        // Přidat do historie změn
        if (!this.paramHistory.has(key)) {
            this.paramHistory.set(key, []);
        }

        this.paramHistory.get(key).push({
            value,
            line,
            timestamp: Date.now()
        });

        // Nastavit aktuální hodnotu
        this.parameters.set(key, value);
    }

    /**
     * Získání hodnoty parametru
     * @param {number|string} key - číslo parametru nebo název makra
     * @returns {number|string|undefined} - hodnota parametru
     */
    getParameter(key) {
        return this.parameters.get(key);
    }

    /**
     * Získání historie změn parametru
     * @param {number|string} key - číslo parametru nebo název makra
     * @returns {Array} - historie změn
     */
    getParameterHistory(key) {
        return this.paramHistory.get(key) || [];
    }

    /**
     * Zobrazení parametrů v modálním okně s podporou historie změn
     */
    displayParameters() {
        const content = document.getElementById('cncParametersContent');
        if (!content) return;

        let html = '<div class="parameter-container">';
        html += '<div class="parameter-section wide">';
        // Přidat sekci s informacemi o pořadí vyhodnocení
        // Seřadit parametry podle čísla
        const sortedParams = Array.from(this.parameters.entries()).sort((a, b) => {
            const aIsNumber = !isNaN(a[0]);
            const bIsNumber = !isNaN(b[0]);
            if (aIsNumber && bIsNumber) {
                return parseInt(a[0]) - parseInt(b[0]);
            } else if (aIsNumber) {
                return -1;
            } else if (bIsNumber) {
                return 1;
            } else {
                return a[0].localeCompare(b[0]);
            }
        });

        // Sekce s R parametry - upravený nadpis a počet parametrů
        html += `<h4>Parametry <span class="parameter-count">${sortedParams.length} parametrů</span></h4>`;
        html += '<table class="parameter-table">';
        html += '<tr><th>Parametr</th><th>Hodnota</th><th>Řádek</th><th>Výraz</th><th>Historie</th></tr>';

        // Mapa pro uchování logických operací vs. skutečných parametrů
        const logicalOperations = new Set(['GOTOF', 'GOTOB', 'IF', 'WHILE', 'REPEAT']);

        sortedParams.forEach(([key, value]) => {
            const history = this.getParameterHistory(key);
            const lastChange = history[history.length - 1];
            const expression = this.expressions.has(parseInt(key, 10)) ? this.expressions.get(parseInt(key, 10)) : null;

            // Kontrola, zda jde o logickou operaci
            const isLogicalOperation = typeof expression === 'string' &&
                logicalOperations.has(expression.split(' ')[0]) ||
                (typeof value === 'string' &&
                 (value.includes('GOTOF') || value.includes('GOTOB') ||
                  value.includes('IF') || value.includes('WHILE') ||
                  value.includes('REPEAT')));

            if (isLogicalOperation) {
                // Přeskočit logické operace - nejsou to skutečné parametry
                return;
            }

            // Formátování hodnoty - pouze číslo bez R=
            let displayValue, expressionValue;

            // Pro číselné hodnoty
            if (typeof value === 'number') {
                // Formátovat s přesností na 4 desetinná místa, ale odstranit koncové nuly
                displayValue = value.toFixed(4).replace(/\.?0+$/, '');
                expressionValue = expression || "Přímá hodnota";
            }
            // Pro řetězcové hodnoty (výrazy, které se nepodařilo vyhodnotit)
            else if (typeof value === 'string') {
                if (value.startsWith('FLOW:')) {
                    // Logická operace - zobrazit jako CNC kód
                    displayValue = value.substring(6);
                    expressionValue = "<span class='flow-command'>" + value.substring(6) + "</span>";
                } else if (value.startsWith('EXPRESSION:')) {
                    // Zobrazit původní výraz bez prefixu
                    displayValue = value.substring(11);
                    expressionValue = value.substring(11);
                } else {
                    // Jiné řetězce
                    displayValue = value;
                    expressionValue = expression || value;
                }
            }
            // Pro ostatní hodnoty
            else {
                displayValue = value;
                expressionValue = expression || "Neznámá hodnota";
            }

            // Ve sloupci výraz zobrazit původní zápis z CNC kódu
            let cncExpression = expression;
            if (!cncExpression && typeof value === 'number') {
                cncExpression = displayValue; // Číselná hodnota
            }

            // Vytvořit informaci o historii změn - VYLEPŠENO S VÝPOČTY
            let historyInfo = '';
            if (history.length > 1) {
                historyInfo = `
                    <div class="history-container">
                        <button class="show-history" data-param="R${key}">Změny (${history.length})</button>
                        <div class="param-history" id="history-R${key}" style="display:none;">`;

                // Seřadit historii podle řádku
                const sortedHistory = [...history].sort((a, b) => a.line - b.line);
                sortedHistory.forEach((entry, idx) => {
                    // Pro historii zobrazit původní hodnotu včetně způsobu definice
                    let entryValue, calculatedValue = "";

                    // Zpracování hodnot s vylepšeným zobrazením výsledků výrazů
                    if (typeof entry.value === 'string' && entry.value.startsWith('EXPRESSION:')) {
                        entryValue = entry.value.substring(11);

                        // Vylepšené zobrazení s parametry a jejich hodnotami
                        const rParams = entryValue.match(/R\d+/g);
                        if (rParams && entry.dependencies) {
                            calculatedValue = " (";
                            let isFirst = true;

                            // Přidat detail ke každému parametru
                            rParams.forEach((param) => {
                                const paramNum = parseInt(param.substring(1), 10);

                                // Zjistit hodnotu pro tento parametr
                                let paramValue;
                                if (entry.dependencies[paramNum] !== undefined) {
                                    paramValue = entry.dependencies[paramNum];
                                } else {
                                    // Pokud není v dependencies, zkusit aktuální hodnotu
                                    paramValue = this.parameters.get(paramNum);
                                }

                                // Formátovat hodnotu a přidat do výstupu
                                if (!isFirst) calculatedValue += ", ";
                                if (paramValue !== undefined) {
                                    // Formátovat číselné hodnoty
                                    const displayValue = typeof paramValue === 'number' ?
                                        paramValue.toFixed(4).replace(/\.?0+$/, '') :
                                        paramValue;

                                    calculatedValue += `${param}=${displayValue}`;
                                } else {
                                    calculatedValue += `${param}=?`;
                                }

                                isFirst = false;
                            });

                            calculatedValue += ")";
                        }
                    }
                    // Pro ostatní hodnoty
                    else if (typeof entry.value === 'string' && entry.value.startsWith('FLOW:')) {
                        entryValue = entry.value.substring(6);
                    } else {
                        entryValue = typeof entry.value === 'number' ?
                            entry.value.toFixed(4).replace(/\.?0+$/, '') : entry.value;
                    }

                    historyInfo += `
                        <div class="history-entry">
                            <span class="history-line">Řádek ${entry.line}:</span>
                            <span class="history-value">${entryValue}${calculatedValue}</span>
                        </div>`;
                });

                historyInfo += `
                        </div>
                    </div>`;
            }

            html += `<tr>
                <td>R${key}</td>
                <td>${displayValue}</td>
                <td>${lastChange ? lastChange.line : 'N/A'}</td>
                <td>${cncExpression}</td>
                <td>${historyInfo}</td>
            </tr>`;
        });

        html += '</table>';

        // Přidání tabulky pro logické operace/řídící příkazy
        const logicalOps = Array.from(sortedParams)
            .filter(([key, value]) => {
                const expression = this.expressions.has(parseInt(key, 10)) ? this.expressions.get(parseInt(key, 10)) : null;
                return (typeof value === 'string' &&
                       (value.includes('GOTOF') || value.includes('GOTOB') ||
                        value.includes('IF') || value.includes('WHILE') ||
                        value.includes('REPEAT'))) ||
                       (expression &&
                        (expression.includes('GOTOF') || expression.includes('GOTOB') ||
                         expression.includes('IF') || expression.includes('WHILE') ||
                         expression.includes('REPEAT')));
            });

        if (logicalOps.length > 0) {
            html += '<h4>Řídící příkazy</h4>';
            html += '<table class="parameter-table">';
            html += '<tr><th>Příkaz</th><th>Řádek</th><th>Kód</th></tr>';

            logicalOps.forEach(([key, value]) => {
                const history = this.getParameterHistory(key);
                const lastChange = history[history.length - 1];
                let displayValue;

                // Extrahovat samotný příkaz bez prefixu FLOW:
                if (typeof value === 'string' && value.startsWith('FLOW:')) {
                    displayValue = value.substring(6);
                } else {
                    displayValue = value;
                }

                html += `<tr>
                    <td>R${key}</td>
                    <td>${lastChange ? lastChange.line : 'N/A'}</td>
                    <td>${displayValue}</td>
                </tr>`;
            });

            html += '</table>';
        }

        // Přidat JavaScript pro přepínání zobrazení historie
        html += `
        <script>
            document.querySelectorAll('.show-history').forEach(button => {
                button.addEventListener('click', function() {
                    const paramId = this.getAttribute('data-param');
                    const historyDiv = document.getElementById('history-' + paramId);
                    if (historyDiv) {
                        if (historyDiv.style.display === 'none') {
                            historyDiv.style.display = 'block';
                            this.textContent = 'Skrýt';
                        } else {
                            historyDiv.style.display = 'none';
                            this.textContent = 'Změny (' + historyDiv.querySelectorAll('.history-entry').length + ')';
                        }
                    }
                });
            });
        </script>`;

        html += '</div>'; // Uzavření parameter-section wide
        html += '</div>'; // Uzavření parameter-container

        content.innerHTML = html;
    }

    /**
     * Získá vysvětlení hodnot parametrů pro výraz
     * @param {string} expression - výraz obsahující parametry R
     * @param {Object} dependencies - objekt se závislostmi parametrů
     * @returns {string} - vysvětlující text
     */
    getExpressionExplanation(expression, dependencies) {
        if (!expression || !dependencies) return "";

        // Najít všechny parametry R v expression
        const params = expression.match(/R\d+/g);
        if (!params) return "";

        let explanation = " (";
        let isFirst = true;

        for (const param of params) {
            const paramNum = parseInt(param.substring(1), 10);

            // Hodnota z dependencies nebo aktuální hodnota
            let paramValue = dependencies[paramNum];
            if (paramValue === undefined) {
                paramValue = this.parameters.get(paramNum);
            }

            if (paramValue !== undefined) {
                // Formátovat hodnotu stejným způsobem jako jinde
                const formattedValue = typeof paramValue === 'number' ?
                    paramValue.toFixed(4).replace(/\.?0+$/, '') : paramValue;

                if (!isFirst) explanation += ", ";
                explanation += `${param}=${formattedValue}`;
                isFirst = false;
            } else {
                // Pro chybějící parametry ukázat "?"
                if (!isFirst) explanation += ", ";
                explanation += `${param}=?`;
                isFirst = false;
            }
        }

        explanation += ")";
        return explanation;
    }

    /**
     * Zobrazení modálního okna s parametry
     */
    showParametersModal() {
        // Odstranit existující modální okno, pokud existuje
        const existingModal = document.getElementById('cncParametersModal');
        if (existingModal) existingModal.remove();

        // Vytvořit nové modální okno s upraveným názvem
        const modal = document.createElement('div');
        modal.id = 'cncParametersModal';
        modal.className = 'modal-window';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Parametry</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="cncParametersContent">
                        <p>Načítání parametrů CNC programu...</p>
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
        setTimeout(() => {
            modal.classList.add('open');

            // Získat parametry z aktuálního programu
            const editorTextarea = document.querySelector('#bottomEditor textarea');
            if (editorTextarea && editorTextarea.value.trim()) {
                this.parseParameters(editorTextarea.value);
                this.displayParameters();
            } else {
                const content = document.getElementById('cncParametersContent');
                if (content) {
                    content.innerHTML = '<p>Nejprve načtěte CNC program.</p>';
                }
            }
        }, 10);
    }
}

// Vytvořit a exportovat globální instanci
const cncParametersManager = new CNCParametersManager();

export { cncParametersManager };
