/**
 * simulator-core.js
 * Hlavní modul pro CNC simulátor
 */

// Importovat ostatní moduly
import { initializeGrid, drawGrid, resetView, updateCoordinatesDisplay } from './grid-renderer.js';
import { setupPlaybackControls, updatePlaybackState, getPlaybackSpeed } from './playback-controls.js';
import { setupPanel, isPanelVisible } from './panel-manager.js';
import { CNCParser, analyzeCNCProgram } from './cnc-parser.js';

// Globální proměnné
let simulation = {
    isRunning: false,
    currentStep: 0,
    commands: [],
    playbackSpeed: 1
};

// Zjednodušení - nechat pouze základní inicializaci
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Inicializace CNC simulátoru');

        const { initializeGrid } = await import('./grid-renderer.js');
        const { setupPlaybackControls } = await import('./playback-controls.js');
        const { setupPanel } = await import('./panel-manager.js');

        // Inicializovat komponenty
        initializeGrid();
        setupPanel();
        setupPlaybackControls({
            onPlay: () => console.log('Play clicked'),
            onPause: () => console.log('Pause clicked'),
            onStop: () => console.log('Stop clicked'),
            onStepForward: () => console.log('Step forward'),
            onStepBackward: () => console.log('Step backward')
        });

        console.log('Inicializace dokončena');
    } catch (error) {
        console.error('Chyba při inicializaci:', error);
    }
});

/**
 * Nastaví ovládací prvky pro zobrazení/skrytí
 */
function setupControlsToggle() {
    const controlsToggleBtn = document.getElementById('controls-toggle');
    const controlsPanel = document.querySelector('.controls');

    if (controlsToggleBtn && controlsPanel) {
        controlsToggleBtn.addEventListener('click', () => {
            controlsPanel.classList.toggle('hidden');
        });
    }

    // Přidáme event listener pro tlačítko panel-toggle
    const panelToggleBtn = document.getElementById('panel-toggle');
    const slidingPanel = document.getElementById('sliding-panel');

    if (panelToggleBtn && slidingPanel) {
        panelToggleBtn.addEventListener('click', () => {
            slidingPanel.classList.toggle('open');

            // Aktualizovat třídy pro canvas-container a controls
            const canvasContainer = document.getElementById('canvas-container');
            const controls = document.querySelector('.controls');
            const playbackControls = document.getElementById('playback-controls');

            if (canvasContainer) canvasContainer.classList.toggle('panel-open');
            if (controls) controls.classList.toggle('panel-open');
            if (playbackControls) playbackControls.classList.toggle('panel-open');
        });
    }
}

/**
 * Nastaví naslouchání zprávám z rodičovského okna
 */
function setupMessageListener() {
    window.addEventListener('message', (event) => {
        console.log('Přijata zpráva:', event.data);
        const message = event.data;

        if (message && message.type === 'loadCNCCode') {
            console.log('Načítání CNC kódu ze zprávy');
            loadSimulation(message.code);
        }
    });
}

/**
 * Načte a zpracuje CNC kód pro simulaci
 * @param {string} cncCode - CNC kód k simulaci
 */
function loadSimulation(cncCode) {
    console.log('Načítání CNC kódu pro simulaci');

    try {
        if (!cncCode || cncCode.trim() === '') {
            console.warn('Prázdný CNC kód, nelze načíst simulaci');
            return;
        }

        // Vytvořit parser
        const parser = new CNCParser();

        // Parsovat kód
        const commands = parser.parseCode(cncCode);

        // Generovat dráhu nástroje
        const toolpath = parser.generateToolpath(commands);

        // Analyzovat program
        const analysis = analyzeCNCProgram(cncCode);

        // Uložit data simulace
        simulation.commands = commands;
        simulation.toolpath = toolpath;
        simulation.analysis = analysis;
        simulation.currentStep = 0;
        simulation.isRunning = false;

        // Aktualizovat zobrazení
        updateSimulationDisplay();

        console.log('CNC kód úspěšně načten', analysis);

        // Odeslat zprávu zpět do rodičovského okna
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'simulationLoaded',
                success: true,
                analysis: analysis
            }, '*');
        }
    } catch (error) {
        console.error('Chyba při načítání CNC kódu:', error);

        // Odeslat chybu zpět do rodičovského okna
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'simulationError',
                error: error.message
            }, '*');
        }
    }
}

/**
 * Spustí simulaci
 */
function startSimulation() {
    if (simulation.commands.length === 0) return;

    simulation.isRunning = true;
    updatePlaybackState(simulation);

    // Spustit smyčku simulace
    runSimulationLoop();
}

/**
 * Pozastaví simulaci
 */
function pauseSimulation() {
    simulation.isRunning = false;
    updatePlaybackState(simulation);
}

/**
 * Zastaví simulaci a vrátí ji na začátek
 */
function stopSimulation() {
    simulation.isRunning = false;
    simulation.currentStep = 0;

    updatePlaybackState(simulation);
    updateSimulationDisplay();
}

/**
 * Posune simulaci o jeden krok vpřed
 */
function stepForward() {
    if (simulation.currentStep < simulation.commands.length - 1) {
        simulation.currentStep++;
        updateSimulationDisplay();
    }
}

/**
 * Posune simulaci o jeden krok vzad
 */
function stepBackward() {
    if (simulation.currentStep > 0) {
        simulation.currentStep--;
        updateSimulationDisplay();
    }
}

/**
 * Změní rychlost přehrávání simulace
 * @param {number} speed - Nová rychlost přehrávání
 */
function changeSpeed(speed) {
    simulation.playbackSpeed = speed;
}

/**
 * Spustí smyčku simulace
 */
function runSimulationLoop() {
    if (!simulation.isRunning) return;

    // Posunout o jeden krok vpřed
    if (simulation.currentStep < simulation.commands.length - 1) {
        simulation.currentStep++;
        updateSimulationDisplay();

        // Naplánovat další krok podle rychlosti
        const delay = 1000 / simulation.playbackSpeed;
        setTimeout(runSimulationLoop, delay);
    } else {
        // Konec simulace
        simulation.isRunning = false;
        updatePlaybackState(simulation);
    }
}

/**
 * Aktualizuje zobrazení simulace podle aktuálního kroku
 */
function updateSimulationDisplay() {
    if (simulation.commands.length === 0) return;

    const currentCommand = simulation.commands[simulation.currentStep];

    // Aktualizovat zobrazení souřadnic
    if (currentCommand && currentCommand.type === 'movement') {
        updateCoordinatesDisplay(currentCommand.x, currentCommand.z);
    }

    // Zde by byla další logika pro aktualizaci zobrazení
}

/**
 * Získá aktuální stav simulace
 * @returns {Object} Stav simulace
 */
function getSimulationState() {
    return {
        isRunning: simulation.isRunning,
        currentStep: simulation.currentStep,
        totalSteps: simulation.commands.length,
        playbackSpeed: simulation.playbackSpeed
    };
}

// Exportovat veřejné API pro komunikaci s index.html
window.cncSimulator = {
    loadSimulation,
    getSimulationState
};
