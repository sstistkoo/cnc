/**
 * playback-controls.js
 * Modul pro ovládací prvky přehrávače simulace
 */

// Globální proměnné
let playbackSpeed = 1;
let callbacks = {};

/**
 * Nastaví ovládací prvky přehrávače
 * @param {Object} options - Callbacky pro různé akce přehrávače
 */
export function setupPlaybackControls(options = {}) {
    const playPauseBtn = document.getElementById('play-pause');
    const stopBtn = document.getElementById('stop');
    const stepForwardBtn = document.getElementById('step-forward');
    const stepBackwardBtn = document.getElementById('step-backward');
    const speedUpBtn = document.getElementById('speed-up');
    const speedDownBtn = document.getElementById('speed-down');
    const speedResetBtn = document.getElementById('speed-reset');
    const speedDisplay = document.getElementById('speed-display');
    const controlsToggleBtn = document.getElementById('controls-toggle');

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

    console.log('Playback controls initialized');
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
    callbacks.onSpeedChange(playbackSpeed);
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
    return 1; // Výchozí rychlost
}
