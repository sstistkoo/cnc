// Program Manager - správa CNC programů, načítání a ukládání

// Globální proměnná pro aktuálně aktivní program
let activeProgram = null;

/**
 * Funkce pro přidání programu do seznamu
 * @param {Object} program - Objekt programu
 * @param {HTMLElement} programList - Element seznamu programů (může být null, pak se použije pravý panel)
 * @param {boolean} activate - Má být program aktivován po přidání?
 * @returns {HTMLElement} - Vytvořený element programu
 */
function addProgramToList(program, programList, activate = false) {
    // Pokud není zadán konkrétní seznam, použijeme pravý panel
    if (!programList) {
        programList = document.getElementById('rightPanelProgramList');
    }

    if (!programList) {
        console.error('Nenalezen kontejner pro programy');
        return null;
    }

    // Vytvořím element pro program podle typu panelu
    let programItem;
    let displayName = program.name;
    // Odstranit příponu .spf z názvu, pokud existuje
    if (program.type === 'SPF' && displayName.toLowerCase().endsWith('.spf')) {
        displayName = displayName.substring(0, displayName.length - 4);
    }

    // Zjistit počet řádků kódu
    let codeLines = 0;
    if (program.code) {
        if (Array.isArray(program.code)) {
            codeLines = program.code.length;
        } else {
            codeLines = program.code.split('\n').length;
        }
    }

    // Kontrola jestli jde o pravý panel (třída "panel-section")
    if (programList.classList.contains('panel-section')) {
        // Pokud jde o pravý panel, vytvoříme bohatší element
        programItem = document.createElement('div');
        programItem.className = 'right-panel-program';

        // Struktura pro zobrazení programu
        programItem.innerHTML = `
            <div class="program-name">${displayName}</div>
            <div class="program-meta">
                <div>Typ: ${program.type || 'Neurčeno'}</div>
                <div>Řádků: ${codeLines}</div>
            </div>
        `;
    } else {
        // Pro ostatní případy (např. horní panel) použít původní styl
        programItem = document.createElement('div');
        programItem.className = 'program-item';
        programItem.textContent = displayName;
    }

    programItem.dataset.originalName = program.name;
    programItem.dataset.code = Array.isArray(program.code) ? program.code.join('\n') : program.code;

    // Načíst kód programu do editoru a parsovat
    programItem.onclick = () => {
        const editorTextarea = document.querySelector('#bottomEditor textarea');
        if (editorTextarea) {
            editorTextarea.value = programItem.dataset.code;
        }

        // Zrušit aktivní třídu u všech programů (v obou panelech)
        document.querySelectorAll('.program-item.active, .right-panel-program.active').forEach(item => {
            item.classList.remove('active');
        });

        // Zvýraznění aktivního programu
        programItem.classList.add('active');
        activeProgram = programItem;

        // Aktualizovat informace v levém panelu
        updateActiveProgramInfo({
            name: displayName,
            type: program.type,
            code: programItem.dataset.code
        });

        // Parsování programu
        console.clear();
        console.log(`Parsování programu: ${program.name}`);

        import('./cnc-line-parser.js').then(module => {
            const parsedProgram = module.parseProgram(programItem.dataset.code);

            console.log(`Celkem ${parsedProgram.length} řádků parsováno`);
            const typeCounts = {};

            // Statistiky o typech řádků
            parsedProgram.forEach(line => {
                if (!typeCounts[line.type]) typeCounts[line.type] = 0;
                typeCounts[line.type]++;
            });

            console.group('Statistika typů řádků');
            Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
                console.log(`${type}: ${count}`);
            });
            console.groupEnd();
        }).catch(error => {
            console.error('Chyba při parsování programu:', error);
        });
    };

    programList.appendChild(programItem);

    // Pokud je označen jako aktivní, nastavit jako aktivní
    if (activate) {
        const editorTextarea = document.querySelector('#bottomEditor textarea');
        if (editorTextarea) {
            editorTextarea.value = programItem.dataset.code;
        }

        // Zrušit aktivní třídu u všech programů
        document.querySelectorAll('.program-item.active, .right-panel-program.active').forEach(item => {
            item.classList.remove('active');
        });

        programItem.classList.add('active');
        activeProgram = programItem;

        // Aktualizovat informace v levém panelu
        updateActiveProgramInfo({
            name: displayName,
            type: program.type,
            code: programItem.dataset.code
        });
    }

    return programItem;
}

/**
 * Aktualizace informací o aktivním programu v panelu
 * @param {Object} program - Objekt programu
 */
function updateActiveProgramInfo(program) {
    const activeProgramInfo = document.getElementById('activeProgram');
    if (!activeProgramInfo) return;

    if (!program) {
        activeProgramInfo.innerHTML = '<p class="no-program">Žádný aktivní program</p>';
        return;
    }

    // Zjistit počet řádků kódu
    let codeLines = 0;
    if (program.code) {
        if (Array.isArray(program.code)) {
            codeLines = program.code.length;
        } else if (typeof program.code === 'string') {
            codeLines = program.code.split('\n').length;
        }
    }

    let html = `
        <div class="program-name">${program.name || 'Nepojmenovaný program'}</div>
        <div class="program-meta">
            <div>Typ: ${program.type || 'Neurčeno'}</div>
            <div>Řádků: ${codeLines}</div>
        </div>
    `;

    activeProgramInfo.innerHTML = html;
}

/**
 * Zpracování vybraných souborů
 * @param {FileList} files - Seznam vybraných souborů
 */
function handleFileSelection(files) {
    if (!files || files.length === 0) return;

    // Pravý panel pro zobrazení programů
    const programList = document.getElementById('rightPanelProgramList');
    if (!programList) return;

    // Vyčistit seznam, pokud bylo vybráno více souborů najednou
    if (files.length > 1) {
        programList.innerHTML = '';
    }

    // Zpracování každého vybraného souboru
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const fileContent = event.target.result;

            // Vytvořit nový objekt program
            const program = {
                name: file.name,
                description: `Program ${file.name}`,
                type: file.name.toLowerCase().endsWith('.mpf') ? 'MPF' : 'SPF',
                code: fileContent.split('\n')
            };

            // Přidat program do seznamu
            addProgramToList(program, programList, true);

            console.log(`Načten soubor: ${file.name}`);

            // Zavřít levý panel po načtení
            const toggleLeftPanel = window.toggleLeftPanel;
            if (typeof toggleLeftPanel === 'function') {
                toggleLeftPanel();
            }

            // Otevřít pravý panel, aby uživatel viděl načtené programy
            const toggleRightPanel = window.toggleRightPanel;
            if (typeof toggleRightPanel === 'function') {
                // Pokud není otevřen, otevřeme ho
                const rightPanel = document.getElementById('rightPanel');
                if (rightPanel && !rightPanel.classList.contains('open')) {
                    toggleRightPanel();
                }
            }
        };
        reader.readAsText(file);
    });
}

/**
 * Načtení CNC programů z JSON souboru
 */
function loadCNCProgramFromJSON() {
    console.log('Načítám CNC program z JSON souboru...');

    fetch('./program/K1_03_4431.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Soubor nebyl nalezen nebo nastala síťová chyba');
            }
            return response.json();
        })
        .then(data => {
            console.log('Program načten:', data.name);

            // Použití pravého panelu pro zobrazení programů
            const programList = document.getElementById('rightPanelProgramList');
            if (!programList) return;

            // Vyčistit a znovu naplnit seznam programů
            programList.innerHTML = '';

            // Přidat programy do seznamu
            const mainProgram = data.programs.find(p => p.type === 'MPF');
            if (mainProgram) {
                addProgramToList(mainProgram, programList, true);
            }

            data.programs.filter(p => p.type === 'SPF').forEach(program => {
                addProgramToList(program, programList);
            });

            // Otevřít pravý panel s programy
            const rightPanel = document.getElementById('rightPanel');
            if (rightPanel && !rightPanel.classList.contains('open')) {
                const toggleRightPanel = window.toggleRightPanel;
                if (typeof toggleRightPanel === 'function') {
                    toggleRightPanel();
                } else {
                    rightPanel.classList.add('open');
                }
            }
        })
        .catch(error => {
            console.error('Chyba při načítání CNC programu:', error);
        });
}

/**
 * Načtení programů z JSON souboru
 * @param {string} jsonContent - Obsah JSON souboru
 */
function loadProgramsFromJson(jsonContent) {
    try {
        const data = JSON.parse(jsonContent);
        if (!data.programs || !Array.isArray(data.programs)) {
            alert('Neplatný formát JSON souboru. Chybí pole "programs".');
            return;
        }

        // Použití pravého panelu pro zobrazení programů
        const programList = document.getElementById('rightPanelProgramList');
        if (!programList) return;

        programList.innerHTML = '';

        // Přidat programy do seznamu
        const mainProgram = data.programs.find(p => p.type === 'MPF');
        if (mainProgram) {
            addProgramToList(mainProgram, programList, true);
        }

        data.programs.filter(p => p.type === 'SPF').forEach(program => {
            addProgramToList(program, programList);
        });

        // Otevřít pravý panel s programy
        const rightPanel = document.getElementById('rightPanel');
        if (rightPanel && !rightPanel.classList.contains('open')) {
            const toggleRightPanel = window.toggleRightPanel;
            if (typeof toggleRightPanel === 'function') {
                toggleRightPanel();
            } else {
                rightPanel.classList.add('open');
            }
        }

        console.log(`Načteno ${data.programs.length} programů z JSON souboru`);
    } catch (error) {
        console.error('Chyba při načítání JSON souboru:', error);
        alert('Chyba při načítání JSON souboru: ' + error.message);
    }
}

/**
 * Uložení aktuálního programu
 */
function saveCurrentProgram() {
    const editorTextarea = document.querySelector('#bottomEditor textarea');
    const programContent = editorTextarea ? editorTextarea.value : '';

    if (!programContent || programContent.trim() === '') {
        alert('Žádný obsah k uložení');
        return;
    }

    // Získat název souboru
    let filename = 'program.mpf';
    if (activeProgram) {
        filename = activeProgram.textContent;
    } else {
        const userFilename = prompt('Zadejte název souboru:', 'program.mpf');
        if (userFilename) {
            filename = userFilename;
            // Přidat příponu .mpf, pokud chybí
            if (!filename.toLowerCase().endsWith('.mpf') && !filename.toLowerCase().endsWith('.spf')) {
                filename += '.mpf';
            }
        }
    }

    const blob = new Blob([programContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Uvolnit URL a odstranit element
    setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }, 100);
}

/**
 * Uložení programů do JSON souboru
 */
function saveProgramsToJson() {
    const programList = document.getElementById('programList');
    const programItems = programList ? programList.querySelectorAll('.program-item') : [];

    if (programItems.length === 0) {
        alert('Žádné programy k uložení');
        return;
    }

    const data = {
        name: "CNC_Programs_" + new Date().toISOString().split('T')[0],
        description: "Exportovaný soubor CNC programů",
        programs: []
    };

    programItems.forEach(item => {
        const name = item.textContent;
        const code = item.dataset.code || '';
        const type = name.toUpperCase().endsWith('.MPF') ? 'MPF' : 'SPF';

        data.programs.push({
            name,
            description: `Program ${name}`,
            type,
            code: code.split('\n')
        });
    });

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.name + ".json";
    document.body.appendChild(a);
    a.click();

    // Uvolnit URL a odstranit element
    setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }, 100);
}

/**
 * Nastavení handlerů pro tlačítka v levém panelu
 */
function setupProgramButtonHandlers() {
    // Tlačítka v levém panelu
    const loadCncButtonPanel = document.getElementById('loadCncButtonPanel');
    const saveButtonPanel = document.getElementById('saveButtonPanel');
    const loadJsonButtonPanel = document.getElementById('loadJsonButtonPanel');
    const saveJsonButtonPanel = document.getElementById('saveJsonButtonPanel');

    // Globální tlačítka
    const fileInput = document.getElementById('fileInput');
    const saveButton = document.getElementById('saveButton');
    const loadJsonButton = document.getElementById('loadJsonButton');
    const saveJsonButton = document.getElementById('saveJsonButton');

    // Funkce pro přidání handleru pro načítání souborů
    function setupFileInputHandler(button, input) {
        if (button && input) {
            button.addEventListener('click', () => {
                input.click();
            });
        }
    }

    // Nastavení handlerů pro tlačítka v levém panelu
    if (loadCncButtonPanel && fileInput) {
        setupFileInputHandler(loadCncButtonPanel, fileInput);
    }

    if (saveButtonPanel) {
        saveButtonPanel.addEventListener('click', () => {
            saveCurrentProgram();
            // Zavřít levý panel po uložení
            const toggleLeftPanel = window.toggleLeftPanel;
            if (typeof toggleLeftPanel === 'function') {
                toggleLeftPanel();
            }
        });
    }

    if (loadJsonButtonPanel) {
        loadJsonButtonPanel.addEventListener('click', () => {
            const jsonFileInput = document.createElement('input');
            jsonFileInput.type = 'file';
            jsonFileInput.accept = '.json';
            jsonFileInput.style.display = 'none';

            jsonFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    const reader = new FileReader();

                    reader.onload = (event) => {
                        loadProgramsFromJson(event.target.result);
                        // Zavřít levý panel po načtení
                        const toggleLeftPanel = window.toggleLeftPanel;
                        if (typeof toggleLeftPanel === 'function') {
                            toggleLeftPanel();
                        }
                    };

                    reader.readAsText(file);
                }
            });

            document.body.appendChild(jsonFileInput);
            jsonFileInput.click();
            document.body.removeChild(jsonFileInput);
        });
    }

    if (saveJsonButtonPanel) {
        saveJsonButtonPanel.addEventListener('click', () => {
            saveProgramsToJson();
            // Zavřít levý panel po uložení
            const toggleLeftPanel = window.toggleLeftPanel;
            if (typeof toggleLeftPanel === 'function') {
                toggleLeftPanel();
            }
        });
    }

    // Nastavení handlerů pro globální tlačítka
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelection(e.target.files);
            }
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', saveCurrentProgram);
    }

    if (loadJsonButton) {
        loadJsonButton.addEventListener('click', () => {
            const jsonFileInput = document.createElement('input');
            jsonFileInput.type = 'file';
            jsonFileInput.accept = '.json';
            jsonFileInput.style.display = 'none';

            jsonFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        loadProgramsFromJson(event.target.result);
                    };
                    reader.readAsText(file);
                }
            });

            document.body.appendChild(jsonFileInput);
            jsonFileInput.click();
            document.body.removeChild(jsonFileInput);
        });
    }

    if (saveJsonButton) {
        saveJsonButton.addEventListener('click', saveProgramsToJson);
    }
}

/**
 * Inicializace správy programů
 */
function initializeProgramManager() {
    // Nastavit handlery pro tlačítka
    setupProgramButtonHandlers();

    // Načíst ukázkový CNC program
    loadCNCProgramFromJSON();
}

// Exportovat funkce pro použití v hlavním souboru
export {
    initializeProgramManager,
    handleFileSelection,
    loadCNCProgramFromJSON,
    loadProgramsFromJson,
    saveCurrentProgram,
    saveProgramsToJson,
    addProgramToList,
    updateActiveProgramInfo
};
