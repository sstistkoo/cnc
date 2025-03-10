/**
 * playback-controls.js
 * Modul pro ovládací prvky přehrávače simulace
 */

// Globální proměnné
let playbackSpeed = 1;
let callbacks = {};
// Změněno výchozí hodnotu na true - při načtení bude přehrávač minimalizovaný
let isMinimized = true;

/**
 * Nastaví ovládací prvky přehrávače
 * @param {Object} options - Callbacky pro různé akce přehrávače
 */
export function setupPlaybackControls(options = {}) {
    // Nastavit callbacky
    callbacks = options;

    // Získat reference na ovládací prvky
    const playPauseBtn = document.getElementById('play-pause');
    const stopBtn = document.getElementById('stop');
    const stepForwardBtn = document.getElementById('step-forward');
    const stepBackwardBtn = document.getElementById('step-backward');
    const speedUpBtn = document.getElementById('speed-up');
    const speedDownBtn = document.getElementById('speed-down');
    const speedResetBtn = document.getElementById('speed-reset');
    const speedDisplay = document.getElementById('speed-display');
    const controlsToggleBtn = document.getElementById('controls-toggle');
    const panelToggleBtn = document.getElementById('panel-toggle');
    const playbackControls = document.getElementById('playback-controls');

    // Přidat třídu pro standardní přehrávací tlačítka
    if (playPauseBtn) playPauseBtn.classList.add('playback-button');
    if (stopBtn) stopBtn.classList.add('playback-button');
    if (stepForwardBtn) stepForwardBtn.classList.add('playback-button');
    if (stepBackwardBtn) stepBackwardBtn.classList.add('playback-button');

    // Přidat nové tlačítko pro minimalizaci mezi reset rychlosti a toggle ovládání
    const minimizeButton = document.createElement('button');
    minimizeButton.id = 'toggle-minimize';
    minimizeButton.className = 'toggle-minimize';
    minimizeButton.title = 'Zobrazit/skrýt přehrávač';
    minimizeButton.setAttribute('aria-label', 'Zobrazit nebo skrýt přehrávač');
    minimizeButton.innerHTML = '&#x1F50E;'; // Unicode ikona "lupa" (zobrazit)

    // Vložit tlačítko mezi reset rychlosti a toggle ovládání
    if (controlsToggleBtn && controlsToggleBtn.parentNode) {
        controlsToggleBtn.parentNode.insertBefore(minimizeButton, controlsToggleBtn);
    } else {
        // Záložní řešení, pokud nelze vložit mezi
        playbackControls.appendChild(minimizeButton);
    }

    let speed = 1;

    if (speedUpBtn) {
        speedUpBtn.addEventListener('click', () => {
            speed *= 2;
            speedDisplay.textContent = `${speed}×`;
        });
    }

    if (speedDownBtn) {
        speedDownBtn.addEventListener('click', () => {
            speed /= 2;
            speedDisplay.textContent = `${speed}×`;
        });
    }

    if (speedResetBtn) {
        speedResetBtn.addEventListener('click', () => {
            speed = 1;
            speedDisplay.textContent = '1×';
        });
    }

    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            const isPlaying = playPauseBtn.textContent === '▶';
            playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
            if (isPlaying) {
                callbacks.onPlay?.();
            } else {
                callbacks.onPause?.();
            }
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            callbacks.onStop?.();
            if (playPauseBtn) playPauseBtn.textContent = '▶';
        });
    }

    if (stepForwardBtn) {
        stepForwardBtn.addEventListener('click', () => callbacks.onStepForward?.());
    }

    if (stepBackwardBtn) {
        stepBackwardBtn.addEventListener('click', () => callbacks.onStepBackward?.());
    }

    // Implementace funkce pro zobrazení/skrytí ovládacích prvků
    if (controlsToggleBtn) {
        controlsToggleBtn.addEventListener('click', () => {
            const controls = document.querySelector('.controls');
            if (controls) {
                controls.classList.toggle('hidden');

                // Aktualizovat ikonu tlačítka podle stavu
                controlsToggleBtn.textContent = controls.classList.contains('hidden') ? '👁️‍🗨️' : '👁️';
            }
        });
    }

    // Přidat event listener pro tlačítko minimalizace
    if (minimizeButton) {
        minimizeButton.addEventListener('click', toggleMinimizePlayback);
    }

    // Přidat event listener pro panel-toggle tlačítko, které zajistí že souřadnice zůstanou viditelné
    if (panelToggleBtn) {
        panelToggleBtn.addEventListener('click', () => {
            // Otevřít/zavřít panel
            const slidingPanel = document.getElementById('sliding-panel');
            if (slidingPanel) {
                slidingPanel.classList.toggle('open');

                // Aktualizovat třídy pro canvas-container a controls
                const canvasContainer = document.getElementById('canvas-container');
                const controls = document.querySelector('.controls');
                const playbackControls = document.getElementById('playback-controls');

                if (canvasContainer) canvasContainer.classList.toggle('panel-open');
                if (controls) controls.classList.toggle('panel-open');
                if (playbackControls) playbackControls.classList.toggle('panel-open');
            }

            // Zajistíme, že souřadnice a popisky os zůstanou pevně na místě
            setTimeout(() => {
                document.querySelectorAll('.coordinates, .axis-label, .axis-arrow').forEach(el => {
                    el.style.position = 'fixed';
                    el.style.transform = 'none';
                    el.style.transition = 'none';
                    el.style.zIndex = '2000'; // Vyšší z-index než panel
                });

                // Zajistit správnou pozici souřadnic
                const coordDisplay = document.getElementById('coord-display');
                if (coordDisplay) {
                    coordDisplay.style.position = 'fixed';
                    coordDisplay.style.bottom = '40px';
                    coordDisplay.style.left = '15px';
                    coordDisplay.style.top = 'auto';
                }
            }, 10);
        });
    }

    // Nastavit výchozí stav přehrávače - minimalizovaný
    if (playbackControls) {
        playbackControls.classList.toggle('minimized', isMinimized);
    }

    console.log('Playback controls initialized');
}

/**
 * Přepíná minimalizaci přehrávače
 */
function toggleMinimizePlayback() {
    const playbackControls = document.getElementById('playback-controls');
    const minimizeButton = document.getElementById('toggle-minimize');

    if (!playbackControls || !minimizeButton) return;

    isMinimized = !isMinimized;

    // Přepnout třídu pro minimalizaci
    playbackControls.classList.toggle('minimized', isMinimized);

    // Změnit ikonu tlačítka
    minimizeButton.innerHTML = isMinimized ? '&#x1F50E;' : '&#x1F4A0;'; // Lupa nebo skrýt
    minimizeButton.title = isMinimized ? 'Zobrazit přehrávač' : 'Skrýt přehrávač';
}

/**
 * Změní rychlost přehrávání
 * @param {number} newSpeed - Nová rychlost přehrávání
 */
function changePlaybackSpeed(newSpeed) {
    // Omezit rychlost na rozumný rozsah (0.25x až 16x)
    playbackSpeed = Math.max(0.25, Math.min(newSpeed, 16));

    // Aktualizovat zobrazení
    const speedDisplay = document.getElementById('speed-display');
    if (speedDisplay) {
        speedDisplay.textContent = `${playbackSpeed}×`;
    }

    // Zavolat callback
    callbacks.onSpeedChange?.(playbackSpeed);
}

/**
 * Aktualizuje stav přehrávače
 * @param {Object} state - Stav simulace
 */
export function updatePlaybackState(state) {
    const playPauseBtn = document.getElementById('play-pause');
    if (playPauseBtn) {
        playPauseBtn.textContent = state.isRunning ? '⏸' : '▶';
    }
}

/**
 * Získá aktuální rychlost přehrávání
 * @returns {number} Aktuální rychlost přehrávání
 */
export function getPlaybackSpeed() {
    return playbackSpeed;
}

/**
 * Vrací informaci, zda je přehrávač minimalizován
 * @returns {boolean} True, pokud je přehrávač minimalizován
 */
export function isPlaybackMinimized() {
    return isMinimized;
}
