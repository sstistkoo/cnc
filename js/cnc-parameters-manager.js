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

        // Procházet řádky jeden po druhém
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            try {
                // Odstranit komentáře
                const commentStart = line.indexOf(';');
                const cleanLine = commentStart >= 0 ? line.substring(0, commentStart).trim() : line.trim();

                if (!cleanLine) continue;

                console.log(`Zpracovávám řádek ${lineNumber}: ${cleanLine}`);

                // Najít všechny definice parametrů R na řádku
                const paramDefinitions = this.findParameterDefinitions(cleanLine);

                // Zpracovat všechny nalezené definice parametrů
                for (const def of paramDefinitions) {
                    const paramNum = def.paramNum;
                    const paramValue = def.value;

                    console.log(`Nalezen parametr R${paramNum} = ${paramValue}`);

                    // Zpracovat hodnotu parametru (číslo, výraz, příkaz)
                    this.processParameterValue(paramNum, paramValue, lineNumber);
                }
            } catch (err) {
                console.warn(`Chyba při parsování parametrů na řádku ${lineNumber}: ${err.message}`);
            }
        }

        console.log(`Celkem zpracováno ${this.parameters.size} parametrů CNC programu`);
        return this.parameters;
    }

    /**
     * Najde všechny definice parametrů na řádku
     * @param {string} line - řádek CNC kódu
     * @returns {Array} - pole objektů s definicemi parametrů {paramNum, value}
     */
    findParameterDefinitions(line) {
        const result = [];
        let remainingLine = line;

        // Pokračovat v hledání, dokud jsou na řádku definice parametrů
        while (remainingLine.length > 0) {
            // Hledat vzor typu "R123=hodnota"
            const paramMatch = remainingLine.match(/R(\d+)\s*=\s*([^R\s;][^R\s;]*)/);

            if (!paramMatch) break;

            const paramNum = parseInt(paramMatch[1], 10);
            let paramValue = paramMatch[2].trim();

            // Odstranit zpracovanou část řádku
            const matchIndex = remainingLine.indexOf(paramMatch[0]);
            const matchLength = paramMatch[0].length;
            remainingLine = remainingLine.substring(matchIndex + matchLength);

            // Zpracovat speciální případy - výrazy v závorkách, atd.
            if (paramValue.startsWith('(') && !paramValue.endsWith(')')) {
                // Hledáme odpovídající uzavírací závorku
                let openBrackets = 1;
                let endPos = 1;

                while (openBrackets > 0 && endPos < paramValue.length) {
                    if (paramValue[endPos] === '(') openBrackets++;
                    if (paramValue[endPos] === ')') openBrackets--;
                    endPos++;
                }

                if (openBrackets === 0) {
                    // Našli jsme odpovídající závorku v aktuální hodnotě
                    paramValue = paramValue.substring(0, endPos);
                } else {
                    // Závorka může pokračovat do další části řádku
                    const closingPos = remainingLine.indexOf(')');
                    if (closingPos !== -1) {
                        paramValue += remainingLine.substring(0, closingPos + 1);
                        remainingLine = remainingLine.substring(closingPos + 1);
                    }
                }
            }

            // Přidat nalezenou definici do výsledku
            result.push({
                paramNum,
                value: paramValue
            });
        }

        return result;
    }

    /**
     * Zpracuje hodnotu parametru a uloží ji
     * @param {number} paramNum - číslo parametru
     * @param {string} value - řetězec s hodnotou parametru
     * @param {number} lineNumber - číslo řádku
     */
    processParameterValue(paramNum, value, lineNumber) {
        // Odstranit bílé znaky
        const trimmedValue = value.trim();

        // Speciální zpracování pro příkazy řízení toku programu
        if (/GOTO[FB]|IF|WHILE|REPEAT/.test(trimmedValue) || trimmedValue.startsWith('=')) {
            this.setParameter(paramNum, `FLOW: ${trimmedValue}`, lineNumber);
            return;
        }

        // Jednoduchý případ - číslo
        if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
            const numValue = parseFloat(trimmedValue);
            this.setParameter(paramNum, numValue, lineNumber);
            return;
        }

        // Výraz v závorkách typu (409+0) - přímé vyhodnocení
        if (trimmedValue.startsWith('(') && trimmedValue.endsWith(')')) {
            try {
                // Extrahovat výraz ze závorek
                const expr = trimmedValue.substring(1, trimmedValue.length - 1);

                // Zkontrolovat, jestli výraz obsahuje další parametry
                if (!/R\d+/.test(expr)) {
                    // Jednoduchý matematický výraz - vyhodnotit přímo
                    const result = eval(expr);
                    if (typeof result === 'number' && !isNaN(result)) {
                        console.log(`Vyhodnocen přímý výraz ${trimmedValue} = ${result}`);
                        this.setParameter(paramNum, result, lineNumber);
                        return;
                    }
                }
            } catch (e) {
                console.warn(`Nelze přímo vyhodnotit výraz v závorkách: ${trimmedValue}`);
            }
        }

        // Matematický výraz s parametry - uložíme jako výraz a vyhodnotíme později
        console.log(`Ukládám výraz pro R${paramNum}: ${trimmedValue}`);
        this.setParameter(paramNum, `EXPRESSION: ${trimmedValue}`, lineNumber);
        this.expressions.set(paramNum, trimmedValue);

        // Extrahovat použité parametry a jejich hodnoty
        const usedParams = trimmedValue.match(/R\d+/g);
        if (usedParams) {
            const dependencies = {};
            let missingDependency = false;

            for (const param of usedParams) {
                const depParamNum = parseInt(param.substring(1), 10);

                // Zjistit hodnotu parametru z aktuální tabulky parametrů
                if (this.parameters.has(depParamNum)) {
                    const paramValue = this.parameters.get(depParamNum);

                    // Uložit pouze numerické hodnoty nebo výsledky vyhodnocených výrazů
                    if (typeof paramValue === 'number') {
                        dependencies[depParamNum] = paramValue;
                    } else if (typeof paramValue === 'string' && !paramValue.startsWith('EXPRESSION:')) {
                        // Převést na číslo, pokud je to možné
                        const numValue = parseFloat(paramValue);
                        if (!isNaN(numValue)) {
                            dependencies[depParamNum] = numValue;
                        } else {
                            console.log(`Nelze převést hodnotu parametru R${depParamNum} na číslo: ${paramValue}`);
                        }
                    } else {
                        console.log(`Parametr R${depParamNum} obsahuje nevyhodnocený výraz`);
                        missingDependency = true;
                    }
                } else {
                    console.log(`Parametr R${depParamNum} ještě není definován`);
                    missingDependency = true;
                }
            }

            // Uložit závislosti parametru
            if (Object.keys(dependencies).length > 0) {
                this.setParameterDependencies(paramNum, dependencies, lineNumber);
            }

            // Pokud máme všechny potřebné hodnoty, můžeme zkusit vyhodnotit výraz
            if (!missingDependency) {
                try {
                    const result = this.evaluateSimpleExpression(trimmedValue, dependencies);
                    if (result !== null) {
                        console.log(`Výraz pro parametr R${paramNum} byl vyhodnocen okamžitě: ${result}`);
                        this.setParameter(paramNum, result, lineNumber);
                    }
                } catch (e) {
                    console.warn(`Nelze vyhodnotit výraz pro R${paramNum}: ${e.message}`);
                }
            }
        }
    }

    /**
     * Vyhodnotí matematické výrazy parametrů
     * Podporuje výpočty mezi parametry (R1=R2+R3, R4=R5*2, atd.)
     */
    evaluateExpressions() {
        // Inicializovat objekt s hodnotami parametrů
        const paramValues = {};

        // Nejprve načteme všechny známé hodnoty parametrů
        for (const [paramNum, value] of this.parameters.entries()) {
            if (typeof value === 'number') {
                paramValues[paramNum] = value;
            } else if (typeof value === 'string' && !value.startsWith('FLOW:') && !value.startsWith('EXPRESSION:')) {
                // Zkusit převést na číslo
                const numVal = parseFloat(value);
                if (!isNaN(numVal)) {
                    paramValues[paramNum] = numVal;
                    this.parameters.set(paramNum, numVal);
                }
            }
        }

        console.log("Hodnoty parametrů před vyhodnocením:", paramValues);

        // Najít nevyhodnocené výrazy
        const pendingExpressions = [];
        for (const [paramNum, value] of this.parameters.entries()) {
            if (typeof value === 'string' && value.startsWith('EXPRESSION:')) {
                const expr = value.substring(11);
                pendingExpressions.push({
                    paramNum,
                    expression: expr,
                    dependencies: this.getParameterHistory(paramNum)[0]?.dependencies || {}
                });
            }
        }

        if (pendingExpressions.length === 0) {
            console.log("Žádné výrazy k vyhodnocení");
            return;
        }

        console.log(`Nalezeno ${pendingExpressions.length} nevyhodnocených výrazů`);

        // Maximální počet iterací pro zabránění nekonečné smyčce
        const maxIterations = 10;
        let iterationCount = 0;
        let madeProgress = true;

        // Opakovat, dokud se daří vyhodnocovat výrazy nebo dokud nedosáhneme limitu iterací
        while (madeProgress && pendingExpressions.length > 0 && iterationCount < maxIterations) {
            iterationCount++;
            madeProgress = false;

            console.log(`Iterace ${iterationCount}: Zbývá ${pendingExpressions.length} výrazů k vyhodnocení`);

            // Pole pro výrazy, které se nepodařilo vyhodnotit v této iteraci
            const remainingExpressions = [];

            // Zkusit vyhodnotit každý zbývající výraz
            for (const item of pendingExpressions) {
                const { paramNum, expression } = item;

                try {
                    // Vyhodnotit výraz s aktuálními hodnotami parametrů
                    console.log(`Vyhodnocuji výraz pro R${paramNum}: ${expression}`);
                    const result = this.evaluateExpressionWithContext(expression, paramValues);

                    if (result !== null) {
                        // Výraz se podařilo vyhodnotit
                        console.log(`Parametr R${paramNum} vyhodnocen: ${result}`);
                        this.parameters.set(paramNum, result);
                        paramValues[paramNum] = result;
                        madeProgress = true;
                    } else {
                        // Výraz se nepodařilo vyhodnotit, zkusíme v další iteraci
                        remainingExpressions.push(item);
                    }
                } catch (e) {
                    console.warn(`Chyba při vyhodnocení výrazu pro R${paramNum}: ${e.message}`);
                    remainingExpressions.push(item);
                }
            }

            // Aktualizovat seznam nevyhodnocených výrazů
            pendingExpressions.length = 0;
            pendingExpressions.push(...remainingExpressions);

            console.log(`Dokončena iterace ${iterationCount}, vyřešeno ${madeProgress ? "několik" : "0"} výrazů`);
        }

        // Informace o výsledku
        if (pendingExpressions.length === 0) {
            console.log(`Všechny výrazy byly úspěšně vyhodnoceny`);
        } else {
            console.warn(`Nepodařilo se vyhodnotit ${pendingExpressions.length} výrazů:`);
            for (const item of pendingExpressions) {
                console.warn(`  R${item.paramNum} = ${item.expression}`);
            }
        }
    }

    /**
     * Vyhodnotí výraz s použitím kontextu hodnot parametrů
     * @param {string} expression - výraz k vyhodnocení
     * @param {Object} context - objekt s hodnotami parametrů
     * @returns {number|null} - vyhodnocená hodnota nebo null při chybě
     */
    evaluateExpressionWithContext(expression, context) {
        // Najít všechny parametry R ve výrazu
        const rParams = expression.match(/R\d+/g);
        if (!rParams) {
            // Výraz neobsahuje parametry, můžeme ho přímo vyhodnotit
            try {
                return eval(expression);
            } catch (e) {
                console.warn(`Chyba při vyhodnocení výrazu bez parametrů: ${expression}`);
                return null;
            }
        }

        // Zkontrolovat, zda máme všechny potřebné parametry
        for (const param of rParams) {
            const paramNum = parseInt(param.substring(1), 10);
            if (context[paramNum] === undefined) {
                console.log(`Pro výraz ${expression} chybí parametr ${param}`);
                return null;
            }
        }

        // Nahradit parametry hodnotami
        let jsExpression = expression;
        for (const param of rParams) {
            const paramNum = parseInt(param.substring(1), 10);
            jsExpression = jsExpression.replace(
                new RegExp(`\\b${param}\\b`, 'g'),
                context[paramNum]
            );
        }

        // Vyhodnotit výraz
        try {
            console.log(`Upravený výraz k vyhodnocení: ${jsExpression}`);
            const result = eval(jsExpression);
            if (typeof result === 'number' && !isNaN(result)) {
                return result;
            }
            return null;
        } catch (e) {
            console.warn(`Chyba při vyhodnocení výrazu ${jsExpression}: ${e.message}`);
            return null;
        }
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
     * Vyhodnotí výraz s podporou všech závislostí
     * @param {string} expression - Výraz k vyhodnocení
     * @param {number} paramNum - Číslo parametru, pro který se vyhodnocuje výraz
     * @param {Object} currentValues - Aktuální hodnoty všech parametrů
     * @returns {number|null} - Vyhodnocená hodnota nebo null při chybě
     */
    evaluateExpressionWithDependencies(expression, paramNum, currentValues) {
        try {
            // Získat historii parametru
            const history = this.getParameterHistory(paramNum);
            const firstDefinition = history && history.length > 0 ? history[0] : null;

            if (!firstDefinition) {
                return null;
            }

            // Kombinovat aktuální hodnoty s hodnotami ze závislostí
            const evaluationContext = {...currentValues};

            // Použít hodnoty závislostí, pokud existují (mají přednost před aktuálními hodnotami)
            if (firstDefinition.dependencies) {
                for (const [depNum, depValue] of Object.entries(firstDefinition.dependencies)) {
                    if (typeof depValue === 'number') {
                        evaluationContext[depNum] = depValue;
                    }
                }
            }

            // OPRAVA: Upravit rekurzivní vyhodnocování
            // Zjistit, zda máme všechny potřebné parametry
            const rParams = expression.match(/R\d+/g);
            if (rParams) {
                const missingParams = [];
                const recursiveParams = new Set(); // Pro sledování rekurzivních závislostí

                // DŮLEŽITÁ ZMĚNA: Vytvořit mapu řádků, kde byly parametry definovány
                const paramLineNumbers = new Map();

                // Naplnit mapu řádků z historie parametrů
                for (const [histParamNum, histEntries] of this.paramHistory.entries()) {
                    if (histEntries && histEntries.length > 0) {
                        paramLineNumbers.set(parseInt(histParamNum, 10), histEntries[0].line);
                    }
                }

                // První průchod - detekujeme chybějící parametry a rekurzivní závislosti
                for (const param of rParams) {
                    const paramNumber = parseInt(param.substring(1), 10);

                    // Kontrola rekurzivních závislostí (parametr odkazuje sám na sebe)
                    if (paramNumber === paramNum) {
                        recursiveParams.add(paramNumber);
                        continue;
                    }

                    // KLÍČOVÁ ZMĚNA: Parametry na stejném řádku jsou VŽDY dostupné
                    // bez ohledu na pořadí jejich vyhodnocení
                    if (paramLineNumbers.has(paramNumber) && paramLineNumbers.has(paramNum)) {
                        const paramLine = paramLineNumbers.get(paramNumber);
                        const currentParamLine = paramLineNumbers.get(paramNum);

                        // Pokud je parametr definován na pozdějším řádku než aktuální parametr, nemůžeme ho použít
                        if (paramLine > currentParamLine) {
                            console.warn(`Parametr R${paramNumber} je definován na řádku ${paramLine}, ale R${paramNum} je definován na řádku ${currentParamLine}.`);
                            console.warn(`Nelze použít parametr, který je definován později v programu.`);
                            missingParams.push(param);
                            continue;
                        }
                        // DŮLEŽITÁ ZMĚNA: Všechny parametry na stejném řádku jsou považovány za dostupné
                        else if (paramLine === currentParamLine) {
                            console.log(`Parametr R${paramNumber} je definován na stejném řádku ${paramLine} jako R${paramNum}. Používám jeho aktuální hodnotu.`);

                            // Pro parametry na stejném řádku zkusíme najít hodnotu:
                            // 1. Z evaluationContext (přednostně)
                            // 2. Z currentValues
                            // 3. Z parametrů v paměti this.parameters

                            if (evaluationContext[paramNumber] !== undefined) {
                                console.log(`Parametr R${paramNumber} je dostupný v evaluationContext: ${evaluationContext[paramNumber]}`);
                                continue;  // Parametr má hodnotu, pokračujeme
                            } else if (currentValues[paramNumber] !== undefined) {
                                evaluationContext[paramNumber] = currentValues[paramNumber];
                                console.log(`Parametr R${paramNumber} použijeme z currentValues: ${currentValues[paramNumber]}`);
                                continue;
                            } else if (this.parameters.has(paramNumber)) {
                                evaluationContext[paramNumber] = this.parameters.get(paramNumber);
                                console.log(`Parametr R${paramNumber} použijeme z this.parameters: ${this.parameters.get(paramNumber)}`);
                                continue;
                            } else {
                                // Pokud parametr nemá žádnou hodnotu, zkusíme pro něj spočítat výchozí hodnotu
                                // Pro účely výpočtu na stejném řádku použijeme výchozí hodnotu 0
                                console.log(`Parametr R${paramNumber} nemá známou hodnotu, použijeme výchozí hodnotu 0`);
                                evaluationContext[paramNumber] = 0;
                                continue;
                            }
                        }
                    }

                    if (evaluationContext[paramNumber] === undefined) {
                        // OPRAVA: Vylepšený algoritmus pro vyhledávání hodnoty parametru
                        // Nejprve zkontrolujeme, zda je parametr v závislosti aktuálního parametru
                        if (firstDefinition.dependencies && firstDefinition.dependencies[paramNumber] !== undefined) {
                            evaluationContext[paramNumber] = firstDefinition.dependencies[paramNumber];
                            continue;
                        }

                        // Zkontrolovat historii změn parametru
                        const depHistory = this.getParameterHistory(paramNumber);
                        if (depHistory && depHistory.length > 0) {
                            // KLÍČOVÁ ZMĚNA: Najít poslední změnu před definicí aktuálního parametru
                            // Pouze řádky před aktuálním řádkem
                            const validEntries = depHistory.filter(entry => entry.line < firstDefinition.line);

                            if (validEntries.length > 0) {
                                const lastValidEntry = validEntries[validEntries.length - 1];
                                if (typeof lastValidEntry.value === 'number') {
                                    evaluationContext[paramNumber] = lastValidEntry.value;
                                    console.log(`Nalezena hodnota parametru R${paramNumber} = ${lastValidEntry.value} z řádku ${lastValidEntry.line} (před R${paramNum} na řádku ${firstDefinition.line})`);
                                    continue;
                                } else if (typeof lastValidEntry.value === 'string' && lastValidEntry.value.startsWith('EXPRESSION:')) {
                                    // Zkusit vyhodnotit výraz
                                    const depExpr = lastValidEntry.value.substring(11);
                                    try {
                                        // Pokud hodnota z historie je výraz, vyhodnotit rekurzivně
                                        if (lastValidEntry.line < firstDefinition.line) { // Pouze předchozí řádky
                                            const result = this.evaluateSimpleExpressionWithHistory(depExpr, paramNumber, lastValidEntry.line, currentValues);
                                            if (result !== null) {
                                                evaluationContext[paramNumber] = result;
                                                console.log(`Vyhodnocen výraz pro R${paramNumber} = ${result} z řádku ${lastValidEntry.line}`);
                                                continue;
                                            }
                                        }
                                    } catch (e) {
                                        console.warn(`Chyba při vyhodnocení výrazu pro R${paramNumber}: ${e.message}`);
                                    }
                                }
                            } else {
                                console.warn(`Nenalezena žádná validní definice pro R${paramNumber} před řádkem ${firstDefinition.line}`);
                            }
                        }

                        // Pokud parametr není v závislosti ani v historii, zkusit, zda ho nemáme v aktuálních hodnotách
                        if (currentValues[paramNumber] !== undefined) {
                            // DŮLEŽITÉ: Kontrolovat, zda tento parametr není definován později v programu
                            if (paramLineNumbers.has(paramNumber) &&
                                paramLineNumbers.has(paramNum) &&
                                paramLineNumbers.get(paramNumber) <= paramLineNumbers.get(paramNum)) {

                                evaluationContext[paramNumber] = currentValues[paramNumber];
                                continue;
                            }
                        }

                        // Pokud se parametr nepodařilo vyhodnotit, přidáme ho do seznamu chybějících
                        missingParams.push(param);
                    }
                }

                // Řešení rekurzivních závislostí - vzít aktuální hodnotu, pokud existuje
                recursiveParams.forEach(paramNumber => {
                    // OPRAVA: Vylepšené hledání hodnoty rekurzivní závislosti
                    const history = this.getParameterHistory(paramNumber);
                    let foundValue = false;

                    // Zkusit najít nejnovější známou hodnotu z historie
                    if (history && history.length > 1) {
                        // Najít všechny záznamy před aktuálním řádkem
                        const prevEntries = history.filter(entry => entry.line < firstDefinition.line);

                        if (prevEntries.length > 0) {
                            // Vzít poslední záznam před aktuálním
                            const previousEntry = prevEntries[prevEntries.length - 1];

                            if (typeof previousEntry.value === 'number') {
                                evaluationContext[paramNumber] = previousEntry.value;
                                console.log(`Pro rekurzivní parametr R${paramNumber} použita předchozí hodnota: ${previousEntry.value} z řádku ${previousEntry.line}`);
                                foundValue = true;
                            }
                        }
                    }

                    // Pokud nemáme předchozí hodnotu, zkusit vzít aktuální hodnotu
                    if (!foundValue) {
                        const currentValue = this.parameters.get(paramNumber);
                        if (typeof currentValue === 'number') {
                            evaluationContext[paramNumber] = currentValue;
                            console.log(`Použita aktuální hodnota pro rekurzivní parametr R${paramNumber}: ${currentValue}`);
                        } else {
                            // Pokud nemá hodnotu, použijeme 0 jako výchozí hodnotu
                            evaluationContext[paramNumber] = 0;
                            console.log(`Pro rekurzivní parametr R${paramNumber} není hodnota, použijeme 0`);
                        }
                    }
                });

                // Druhý průchod - kontrolujeme, zda stále chybí nějaké parametry
                const stillMissingParams = missingParams.filter(param => {
                    const paramNumber = parseInt(param.substring(1), 10);
                    return evaluationContext[paramNumber] === undefined;
                });

                if (stillMissingParams.length > 0) {
                    console.log(`Nelze vyhodnotit R${paramNum} = ${expression}, chybí parametry: ${stillMissingParams.join(', ')}`);
                    return null;
                }
            }

            // Nahradit parametry hodnotami a vyhodnotit výraz
            let jsExpression = expression;

            if (rParams) {
                for (const param of rParams) {
                    const paramNumber = parseInt(param.substring(1), 10);
                    const value = evaluationContext[paramNumber];

                    if (value !== undefined) {
                        jsExpression = jsExpression.replace(
                            new RegExp(`\\b${param}\\b`, 'g'),
                            value
                        );
                    }
                }
            }

            console.log(`Vyhodnocuji výraz: ${jsExpression}`);

            // Řešení výrazů v závorkách typu (409+0)
            if (jsExpression.includes('(') && jsExpression.includes(')')) {
                try {
                    // Zpracovat matematický výraz v závorkách
                    const result = eval(jsExpression);
                    if (typeof result === 'number' && !isNaN(result)) {
                        console.log(`Výraz v závorkách vyhodnocen: ${result}`);
                        return result;
                    }
                } catch (e) {
                    console.warn(`Nelze vyhodnotit výraz v závorkách ${jsExpression}: ${e.message}`);
                }
            }

            // Provést výpočet standardním způsobem
            const result = new Function('return ' + jsExpression)();

            if (typeof result === 'number' && !isNaN(result)) {
                return result;
            }

            return null;
        } catch (e) {
            console.warn(`Chyba při vyhodnocení výrazu ${expression} pro R${paramNum}: ${e.message}`);
            return null;
        }
    }

    /**
     * Vyhodnotí jednoduchý výraz pouze s použitím historie parametrů před daným řádkem
     * @param {string} expression - Výraz k vyhodnocení
     * @param {number} paramNum - Číslo parametru
     * @param {number} lineNum - Číslo řádku definice parametru
     * @param {Object} currentValues - Aktuální hodnoty parametrů
     * @returns {number|null} - Výsledek výrazu nebo null při chybě
     */
    evaluateSimpleExpressionWithHistory(expression, paramNum, lineNum, currentValues) {
        try {
            // Získat hodnoty parametrů z historie před daným řádkem
            const evalParams = {};
            const rParams = expression.match(/R\d+/g);

            if (!rParams) {
                // Výraz bez parametrů, přímé vyhodnocení
                return this.evaluateSimpleExpression(expression, {});
            }

            // Pro každý parametr v expression najít hodnotu z historie
            for (const param of rParams) {
                const paramNumber = parseInt(param.substring(1), 10);

                // Rekurzivní závislost - parametr odkazuje sám na sebe
                if (paramNumber === paramNum) {
                    const history = this.getParameterHistory(paramNumber);
                    if (history && history.length > 1) {
                        // Najít předcházející definici
                        const prevEntries = history.filter(entry => entry.line < lineNum);
                        if (prevEntries.length > 0) {
                            const prevEntry = prevEntries[prevEntries.length - 1];
                            if (typeof prevEntry.value === 'number') {
                                evalParams[paramNumber] = prevEntry.value;
                                continue;
                            }
                        }
                    }
                    // Pokud nenajdeme předchozí hodnotu, použijeme 0
                    evalParams[paramNumber] = 0;
                    continue;
                }

                // Získat historii parametru
                const history = this.getParameterHistory(paramNumber);
                if (history && history.length > 0) {
                    // Najít poslední definici před lineNum
                    const prevEntries = history.filter(entry => entry.line < lineNum);
                    if (prevEntries.length > 0) {
                        const lastEntry = prevEntries[prevEntries.length - 1];
                        if (typeof lastEntry.value === 'number') {
                            evalParams[paramNumber] = lastEntry.value;
                        } else if (typeof lastEntry.value === 'string' && lastEntry.value.startsWith('EXPRESSION:')) {
                            // Rekurzivní vyhodnocení parametru
                            const subExpr = lastEntry.value.substring(11);
                            const result = this.evaluateSimpleExpressionWithHistory(subExpr, paramNumber, lastEntry.line, currentValues);
                            if (result !== null) {
                                evalParams[paramNumber] = result;
                            } else {
                                return null; // Nelze vyhodnotit podvýraz
                            }
                        } else {
                            // Jiný typ hodnoty, zkusit využít
                            evalParams[paramNumber] = currentValues[paramNumber];
                        }
                    } else {
                        // Nenalezena žádná definice před daným řádkem
                        console.warn(`Parametr R${paramNumber} není definován před řádkem ${lineNum}`);
                        return null;
                    }
                } else if (currentValues[paramNumber] !== undefined) {
                    // Pokud nemáme historii, zkusit aktuální hodnotu
                    evalParams[paramNumber] = currentValues[paramNumber];
                } else {
                    // Parametr není definován
                    console.warn(`Parametr R${paramNumber} není definován`);
                    return null;
                }
            }

            // Vyhodnotit výraz s hodnotami z historie
            return this.evaluateSimpleExpression(expression, evalParams);
        } catch (e) {
            console.warn(`Chyba při vyhodnocení výrazu s historií: ${e.message}`);
            return null;
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

        // VYLEPŠENÍ: Nejprve vyhodnotíme všechny výrazy v závorkách typu (409+0), (462.2-40)
        this.evaluateBracketExpressions(paramValues);

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

        // VYLEPŠENÍ: První průchod zpracuje jen parametry s přímou hodnotou nebo výrazy bez závislostí
        for (const paramNum of sortedParams) {
            if (this.expressions.has(paramNum)) {
                const expression = this.expressions.get(paramNum);

                // Přeskočit řídící příkazy
                if (typeof expression === 'string' && expression.startsWith('FLOW:')) {
                    continue;
                }

                // Odstranit případný prefix "EXPRESSION:"
                const expressionToEval = typeof expression === 'string' && expression.startsWith('EXPRESSION:') ?
                    expression.substring(11) : expression;

                // Detekujeme, zda výraz obsahuje nějaké parametry R
                const containsRParams = /R\d+/.test(expressionToEval);

                // Pro výrazy bez parametrů R nebo s výrazy v závorkách, vyhodnotit ihned
                if (!containsRParams || (expressionToEval.includes('(') && expressionToEval.includes(')'))) {
                    try {
                        const result = this.evaluateSimpleExpression(expressionToEval, paramValues);
                        if (result !== null) {
                            console.log(`Parametr R${paramNum} vyhodnocen v prvním průchodu: ${result}`);
                            this.parameters.set(paramNum, result);
                            paramValues[paramNum] = result;
                        }
                    } catch (e) {
                        // Ignorovat chyby v této fázi
                    }
                }
            }
        }

        // Postupně vyhodnocovat parametry v pořadí, v jakém jsou definovány v kódu
        let totalIterations = 0; // Celkový počet iterací
        const MAX_TOTAL_ITERATIONS = 10; // Maximální celkový počet iterací

        // HLAVNÍ CYKLUS: Opakovaně procházet všechny parametry, dokud se něco mění
        let changed = true;
        while (changed && totalIterations < MAX_TOTAL_ITERATIONS) {
            changed = false;
            totalIterations++;

            // Procházíme parametry v pořadí definice
            for (const paramNum of sortedParams) {
                // Pokud parametr již má číselnou hodnotu, přeskočíme ho
                if (typeof this.parameters.get(paramNum) === 'number') {
                    continue;
                }

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

                    console.log(`Iterace ${totalIterations}: Vyhodnocuji parametr R${paramNum} = ${expressionToEval}`);

                    try {
                        // VYLEPŠENO: Použití nové metody pro vyhodnocení s podporou závislostí
                        const result = this.evaluateExpressionWithDependencies(expressionToEval, paramNum, paramValues);

                        if (result !== null) {
                            console.log(`Iterace ${totalIterations}: Parametr R${paramNum} vyhodnocen: ${result}`);
                            this.parameters.set(paramNum, result);
                            paramValues[paramNum] = result;
                            changed = true;
                        }
                    } catch (e) {
                        console.warn(`Chyba při vyhodnocení výrazu pro R${paramNum}: ${e.message}`);
                    }
                }
            }

            console.log(`Dokončena iterace ${totalIterations}, změněné parametry: ${changed}`);
        }

        console.log(`Vyhodnocení dokončeno po ${totalIterations} iteracích`);

        // Výpis nevyřešených parametrů
        const unresolved = [];
        for (const [paramNum, value] of this.parameters.entries()) {
            if (typeof value === 'string' && (value.startsWith('EXPRESSION:') || /R\d+/.test(value))) {
                unresolved.push(`R${paramNum} = ${value}`);
            }
        }

        if (unresolved.length > 0) {
            console.warn(`Nevyřešené parametry: ${unresolved.join(', ')}`);
        }
    }

    /**
     * Vyhodnotí výrazy v závorkách jako (409+0), (462.2-40)
     * @param {Object} paramValues - Aktuální hodnoty parametrů
     */
    evaluateBracketExpressions(paramValues) {
        for (const [paramNum, value] of this.parameters.entries()) {
            // Hledáme řetězce typu "(číslo+číslo)" nebo "(číslo-číslo)"
            if (typeof value === 'string' && value.startsWith('(') && value.endsWith(')')) {
                try {
                    // Pokusit se vyhodnotit výraz v závorkách
                    const jsExpression = value.substring(1, value.length - 1);

                    // Zkontrolovat, zda výraz neobsahuje parametry R
                    if (!/R\d+/.test(jsExpression)) {
                        const result = eval(jsExpression);
                        if (typeof result === 'number' && !isNaN(result)) {
                            console.log(`Vyhodnocen výraz v závorkách pro R${paramNum}: ${value} => ${result}`);
                            this.parameters.set(paramNum, result);
                            paramValues[paramNum] = result;
                        }
                    }
                } catch (e) {
                    console.warn(`Nelze vyhodnotit výraz v závorkách pro R${paramNum}: ${value}`);
                }
            }

            // Případy, kdy máme stringový výraz s hodnotou např. "EXPRESSION: (409+0)"
            if (typeof value === 'string' && value.startsWith('EXPRESSION: (') && value.endsWith(')')) {
                try {
                    const jsExpression = value.substring(12, value.length - 1);

                    // Zkontrolovat, zda výraz neobsahuje parametry R
                    if (!/R\d+/.test(jsExpression)) {
                        const result = eval(jsExpression);
                        if (typeof result === 'number' && !isNaN(result)) {
                            console.log(`Vyhodnocen výraz EXPRESSION v závorkách pro R${paramNum}: ${value} => ${result}`);
                            this.parameters.set(paramNum, result);
                            paramValues[paramNum] = result;
                        }
                    }
                } catch (e) {
                    console.warn(`Nelze vyhodnotit EXPRESSION v závorkách pro R${paramNum}: ${value}`);
                }
            }
        }
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
            timestamp: Date.now() // Důležité: obsahuje timestamp pro určení pořadí definice na stejném řádku
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
