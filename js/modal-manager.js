// Modal Manager - správa modálních oken pro parametry a parsované řádky

/**
 * Zobrazení modálního okna s parametry programu
 */
function showParametersModal() {
    // Odstranit existující modální okno, pokud existuje
    const existingModal = document.getElementById('parametersModal');
    if (existingModal) existingModal.remove();

    // Vytvořit nové modální okno
    const modal = document.createElement('div');
    modal.id = 'parametersModal';
    modal.className = 'modal-window';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Parametry CNC programu</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div id="parametersContent">
                    <p>Načtěte CNC program pro zobrazení parametrů.</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Přidat event listener pro zavření modálního okna
    modal.querySelector('.modal-close').addEventListener('click', function() {
        modal.remove();
    });

    // Pokud máme aktivní program, analyzujeme jeho parametry
    const activeProgram = getActiveProgram();
    if (activeProgram) {
        const code = activeProgram.dataset.code;
        analyzeProgramParameters(code);
    }

    // Přidat zavírání kliknutím mimo modální okno
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Zobrazit modální okno s animací
    setTimeout(() => modal.classList.add('open'), 10);
}

/**
 * Zobrazení modálního okna s parsovanými řádky
 */
function showParsedLinesModal() {
    // Odstranit existující modální okno, pokud existuje
    const existingModal = document.getElementById('parsedLinesModal');
    if (existingModal) existingModal.remove();

    // Vytvořit nové modální okno
    const modal = document.createElement('div');
    modal.id = 'parsedLinesModal';
    modal.className = 'modal-window';
    modal.innerHTML = `
        <div class="modal-content wide">
            <div class="modal-header">
                <h3>Parsované řádky CNC programu</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div id="parsedLinesContent">
                    <p>Načtěte CNC program pro zobrazení parsovaných řádků.</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Přidat event listener pro zavření modálního okna
    modal.querySelector('.modal-close').addEventListener('click', function() {
        modal.remove();
    });

    // Pokud máme aktivní program, parsujeme jeho řádky
    const activeProgram = getActiveProgram();
    if (activeProgram) {
        const code = activeProgram.dataset.code;
        showParsedLines(code);
    }

    // Přidat zavírání kliknutím mimo modální okno
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Zobrazit modální okno s animací
    setTimeout(() => modal.classList.add('open'), 10);
}

/**
 * Získání reference na aktivní program
 * @returns {HTMLElement|null} Reference na aktivní program
 */
function getActiveProgram() {
    return document.querySelector('.program-item.active');
}

/**
 * Analýza parametrů programu
 * @param {string} code - Kód programu
 */
function analyzeProgramParameters(code) {
    const content = document.getElementById('parametersContent');
    if (!content) return;

    content.innerHTML = '<p>Probíhá analýza parametrů...</p>';

    import('./cnc-line-parser.js').then(module => {
        const parsedProgram = module.parseProgram(code);

        // Extrakce relevantních parametrů
        const parameters = {
            gCodes: new Set(),
            mCodes: new Set(),
            tools: new Set(),
            coordinates: {
                minX: Infinity,
                maxX: -Infinity,
                minY: Infinity,
                maxY: -Infinity,
                minZ: Infinity,
                maxZ: -Infinity
            },
            feedRates: new Set(),
            spindleSpeeds: new Set()
        };

        parsedProgram.forEach(line => {
            // G-kódy
            if (line.gCodes) {
                line.gCodes.forEach(code => parameters.gCodes.add(code));
            }

            // M-kódy
            if (line.mCodes) {
                line.mCodes.forEach(code => parameters.mCodes.add(code));
            }

            // Nástroje
            if (line.tool) {
                parameters.tools.add(line.tool);
            }

            // Souřadnice
            if (line.coordinates) {
                if (line.coordinates.X !== undefined) {
                    parameters.coordinates.minX = Math.min(parameters.coordinates.minX, line.coordinates.X);
                    parameters.coordinates.maxX = Math.max(parameters.coordinates.maxX, line.coordinates.X);
                }
                if (line.coordinates.Y !== undefined) {
                    parameters.coordinates.minY = Math.min(parameters.coordinates.minY, line.coordinates.Y);
                    parameters.coordinates.maxY = Math.max(parameters.coordinates.maxY, line.coordinates.Y);
                }
                if (line.coordinates.Z !== undefined) {
                    parameters.coordinates.minZ = Math.min(parameters.coordinates.minZ, line.coordinates.Z);
                    parameters.coordinates.maxZ = Math.max(parameters.coordinates.maxZ, line.coordinates.Z);
                }
            }

            // Posuvy
            if (line.feedRate) {
                parameters.feedRates.add(line.feedRate);
            }

            // Otáčky vřetena
            if (line.spindleSpeed) {
                parameters.spindleSpeeds.add(line.spindleSpeed);
            }
        });

        // Formátování výstupu
        let html = '<div class="parameter-grid">';

        // G-kódy
        html += '<div class="parameter-section">';
        html += '<h4>G-kódy</h4>';
        html += '<div class="parameter-list">';
        if (parameters.gCodes.size > 0) {
            Array.from(parameters.gCodes).sort((a, b) => a - b).forEach(code => {
                html += `<span class="parameter-tag">G${code}</span>`;
            });
        } else {
            html += '<span class="parameter-none">Žádné G-kódy</span>';
        }
        html += '</div></div>';

        // M-kódy
        html += '<div class="parameter-section">';
        html += '<h4>M-kódy</h4>';
        html += '<div class="parameter-list">';
        if (parameters.mCodes.size > 0) {
            Array.from(parameters.mCodes).sort((a, b) => a - b).forEach(code => {
                html += `<span class="parameter-tag">M${code}</span>`;
            });
        } else {
            html += '<span class="parameter-none">Žádné M-kódy</span>';
        }
        html += '</div></div>';

        // Nástroje
        html += '<div class="parameter-section">';
        html += '<h4>Nástroje</h4>';
        html += '<div class="parameter-list">';
        if (parameters.tools.size > 0) {
            Array.from(parameters.tools).sort((a, b) => a - b).forEach(tool => {
                html += `<span class="parameter-tag">T${tool}</span>`;
            });
        } else {
            html += '<span class="parameter-none">Žádné nástroje</span>';
        }
        html += '</div></div>';

        // Posuvy
        html += '<div class="parameter-section">';
        html += '<h4>Posuvy (F)</h4>';
        html += '<div class="parameter-list">';
        if (parameters.feedRates.size > 0) {
            Array.from(parameters.feedRates).sort((a, b) => a - b).forEach(feedRate => {
                html += `<span class="parameter-tag">F${feedRate}</span>`;
            });
        } else {
            html += '<span class="parameter-none">Žádné posuvy</span>';
        }
        html += '</div></div>';

        // Otáčky vřetena
        html += '<div class="parameter-section">';
        html += '<h4>Otáčky vřetena (S)</h4>';
        html += '<div class="parameter-list">';
        if (parameters.spindleSpeeds.size > 0) {
            Array.from(parameters.spindleSpeeds).sort((a, b) => a - b).forEach(speed => {
                html += `<span class="parameter-tag">S${speed}</span>`;
            });
        } else {
            html += '<span class="parameter-none">Žádné otáčky</span>';
        }
        html += '</div></div>';

        // Rozsahy souřadnic
        html += '<div class="parameter-section wide">';
        html += '<h4>Rozsahy souřadnic</h4>';
        html += '<table class="parameter-table">';
        html += '<tr><th></th><th>Min</th><th>Max</th><th>Rozsah</th></tr>';

        // X souřadnice
        if (parameters.coordinates.minX !== Infinity && parameters.coordinates.maxX !== -Infinity) {
            const rangeX = parameters.coordinates.maxX - parameters.coordinates.minX;
            html += `<tr>
                <td>X:</td>
                <td>${parameters.coordinates.minX.toFixed(3)}</td>
                <td>${parameters.coordinates.maxX.toFixed(3)}</td>
                <td>${rangeX.toFixed(3)}</td>
            </tr>`;
        } else {
            html += `<tr><td>X:</td><td colspan="3">Nepoužito</td></tr>`;
        }

        // Y souřadnice
        if (parameters.coordinates.minY !== Infinity && parameters.coordinates.maxY !== -Infinity) {
            const rangeY = parameters.coordinates.maxY - parameters.coordinates.minY;
            html += `<tr>
                <td>Y:</td>
                <td>${parameters.coordinates.minY.toFixed(3)}</td>
                <td>${parameters.coordinates.maxY.toFixed(3)}</td>
                <td>${rangeY.toFixed(3)}</td>
            </tr>`;
        } else {
            html += `<tr><td>Y:</td><td colspan="3">Nepoužito</td></tr>`;
        }

        // Z souřadnice
        if (parameters.coordinates.minZ !== Infinity && parameters.coordinates.maxZ !== -Infinity) {
            const rangeZ = parameters.coordinates.maxZ - parameters.coordinates.minZ;
            html += `<tr>
                <td>Z:</td>
                <td>${parameters.coordinates.minZ.toFixed(3)}</td>
                <td>${parameters.coordinates.maxZ.toFixed(3)}</td>
                <td>${rangeZ.toFixed(3)}</td>
            </tr>`;
        } else {
            html += `<tr><td>Z:</td><td colspan="3">Nepoužito</td></tr>`;
        }

        html += '</table></div>';

        // Statistika
        html += '<div class="parameter-section wide">';
        html += '<h4>Statistika programu</h4>';
        html += `<p>Celkem řádků: ${parsedProgram.length}</p>`;
        html += `<p>G-kódy: ${parameters.gCodes.size}</p>`;
        html += `<p>M-kódy: ${parameters.mCodes.size}</p>`;
        html += `<p>Nástroje: ${parameters.tools.size}</p>`;

        // Typy řádků
        const lineTypes = {};
        parsedProgram.forEach(line => {
            if (!lineTypes[line.type]) lineTypes[line.type] = 0;
            lineTypes[line.type]++;
        });

        html += '<table class="parameter-table">';
        html += '<tr><th>Typ řádku</th><th>Počet</th></tr>';
        Object.entries(lineTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
            html += `<tr><td>${type}</td><td>${count}</td></tr>`;
        });
        html += '</table>';

        html += '</div>';

        html += '</div>'; // Uzavření parameter-grid

        content.innerHTML = html;
    }).catch(error => {
        content.innerHTML = `<p class="error">Chyba při parsování programu: ${error.message}</p>`;
        console.error('Chyba při analýze parametrů:', error);
    });
}

/**
 * Zobrazení parsovaných řádků programu
 * @param {string} code - Kód programu (volitelný, pokud není zadán, použije se z editoru)
 */
function showParsedLines(code) {
    const content = document.getElementById('parsedLinesContent');
    if (!content) return;

    content.innerHTML = '<p>Probíhá načítání parsovaných řádků...</p>';

    // DŮLEŽITÁ ZMĚNA: Kontrolujeme nově pojmenovanou proměnnou
    if (window.lastParsedCNCProgram) {
        console.log('Používám již parsovaná data pro zobrazení.');
        displayParsedLines(window.lastParsedCNCProgram, content);
        return;
    }

    // Pokud nemáme žádný kód ani uložená parsovaná data, použijeme kód z editoru
    if (!code) {
        const editorTextarea = document.querySelector('#bottomEditor textarea');
        if (editorTextarea && editorTextarea.value.trim()) {
            code = editorTextarea.value;
        } else {
            content.innerHTML = '<p>Nejprve parsujte CNC program tlačítkem "Parse".</p>';
            return;
        }
    }

    // Provádíme nové parsování
    console.log('Parsování nových dat...');
    import('./cnc-line-parser.js').then(module => {
        try {
            const parsedProgram = module.parseProgram(code);

            // DŮLEŽITÁ ZMĚNA: Ukládáme parsovaná data pod novým názvem
            window.lastParsedCNCProgram = parsedProgram;
            window.lastParsedCNCCode = code;

            displayParsedLines(parsedProgram, content);
        } catch (error) {
            content.innerHTML = `<p class="error">Chyba při parsování: ${error.message}</p>`;
            console.error('Chyba při parsování řádků:', error);
        }
    }).catch(error => {
        content.innerHTML = `<p class="error">Chyba při načítání parseru: ${error.message}</p>`;
        console.error('Chyba při načítání modulu parser:', error);
    });
}

/**
 * Zobrazí parsované řádky v elementu content
 * @param {Array} parsedProgram - Parsovaný program
 * @param {HTMLElement} content - Element, do kterého se mají zobrazit řádky
 */
function displayParsedLines(parsedProgram, content) {
    // Vytvoření tabulky parsovaných řádků
    let html = '<table class="parsed-lines-table">';
    html += '<tr><th>Řádek</th><th>Kód</th><th>Typ</th><th>G-kódy</th><th>M-kódy</th><th>Souřadnice</th><th>Komentář</th></tr>';

    parsedProgram.forEach(line => {
        const lineNumber = line.lineNumber;
        const originalLine = line.originalLine || '';
        const type = line.type || 'neuvedeno';

        // G-kódy
        let gCodes = '';
        if (line.gCodes && line.gCodes.length > 0) {
            gCodes = line.gCodes.map(code => `G${code}`).join(', ');
        }

        // M-kódy
        let mCodes = '';
        if (line.mCodes && line.mCodes.length > 0) {
            mCodes = line.mCodes.map(code => `M${code}`).join(', ');
        }

        // Souřadnice
        let coords = '';
        if (line.coordinates) {
            const coordStr = Object.entries(line.coordinates)
                .map(([key, value]) => `${key}${value >= 0 ? '+' : ''}${value.toFixed(3)}`)
                .join(' ');
            coords = coordStr;
        }

        // Komentář
        const comment = line.comment || '';

        // Přidání řádku do tabulky s barevným zvýrazněním podle typu
        html += `<tr class="line-type-${type.replace(/\s+/g, '_').toLowerCase()}">`;
        html += `<td>${lineNumber}</td>`;
        html += `<td><code>${escapeHtml(originalLine)}</code></td>`;
        html += `<td>${type}</td>`;
        html += `<td>${gCodes}</td>`;
        html += `<td>${mCodes}</td>`;
        html += `<td>${coords}</td>`;
        html += `<td>${comment}</td>`;
        html += `</tr>`;
    });

    html += '</table>';
    content.innerHTML = html;
}

/**
 * Pomocná funkce pro escapování HTML
 * @param {string} text - Text k escapování
 * @returns {string} - Escapovaný text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Inicializace modálních oken
 */
function initializeModals() {
    // Přidat event listenery k tlačítkům
    const parametersButton = document.getElementById('parametersButton');
    const parseModalButton = document.getElementById('parseModalButton');

    if (parametersButton) {
        parametersButton.addEventListener('click', showParametersModal);
    }

    if (parseModalButton) {
        parseModalButton.addEventListener('click', showParsedLinesModal);
    }
}

// Exportovat funkce pro použití v hlavním souboru
export {
    initializeModals,
    showParametersModal,
    showParsedLinesModal
};
