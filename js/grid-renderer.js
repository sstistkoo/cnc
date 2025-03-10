/**
 * grid-renderer.js
 * Modul pro vykreslování kartézské mřížky
 */

// Globální proměnné
let canvas, ctx, root;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastX, lastY;
let touchStartX, touchStartY;
let touchStartTime;
let longPressTimer;
let isLongPress = false;
let isCrossMarkerActive = false;
let crossMarkerGridX = 0;
let crossMarkerGridY = 0;

// Konstanty
const GRID_COLOR = '#cccccc';
const AXIS_COLOR = '#000000';
const GRID_SPACING = 50; // Rozestup čar mřížky v pixelech při scale = 1
const LONG_PRESS_DURATION = 500; // Doba v ms pro dlouhé podržení
const MIN_GRID_SPACING = 30; // Přidáno - minimální mezera mezi čarami
const BASE_INTERVALS = [1, 2, 5, 10, 20, 50, 100, 200, 500];

/**
 * Inicializuje mřížku
 */
function initializeGrid() {
    console.log('Inicializace mřížky');

    // Získat reference na elementy
    canvas = document.getElementById('grid-canvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    ctx = canvas.getContext('2d');

    // Nastavit velikost canvasu
    const container = document.getElementById('canvas-container');
    if (container) {
        canvas.width = container.clientWidth || 800;
        canvas.height = container.clientHeight || 600;
    }

    // Nastavit měřítko pro zobrazení rozsahu 0-600 na vodorovné ose
    const targetRightX = 600;
    scale = canvas.width / targetRightX;

    // Umístit počátek souřadnic podle specifikace
    // Vertikální osa Z 15px od levého okraje
    // Horizontální osa X 150px od spodního okraje
    offsetX = 15; // Osa Z 15px od levého okraje
    offsetY = canvas.height - 150; // Osa X 150px od spodního okraje

    // Přidat event listenery
    setupEventListeners();

    // Vykreslit mřížku
    console.log('Drawing grid...', { width: canvas.width, height: canvas.height });
    drawGrid();
}

/**
 * Nastaví event listenery pro interakci s mřížkou
 */
function setupEventListeners() {
    // Mouse events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);

    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    // Resize event
    window.addEventListener('resize', resizeCanvas);

    // Zoom buttons
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetBtn = document.getElementById('reset');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoomAt(canvas.width / 2, canvas.height / 2, 1.2));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoomAt(canvas.width / 2, canvas.height / 2, 0.8));
    if (resetBtn) resetBtn.addEventListener('click', resetView);

    // Přidat leptavý handler pro klik mimo křížek na canvas
    // Toto umístíme zde, abychom zajistili, že canvas bude inicializovaný
    canvas.addEventListener('click', (e) => {
        // Pokud je křížek aktivní a uživatel klikl daleko od něj
        if (isCrossMarkerActive) {
            const crossMarker = document.getElementById('cross-marker');
            if (crossMarker) {
                const rect = crossMarker.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                if (Math.abs(e.clientX - centerX) > 30 || Math.abs(e.clientY - centerY) > 30) {
                    hideCrossMarker();
                }
            }
        }
    });
}

/**
 * Změní velikost canvasu podle velikosti okna a optimalizuje pro mobilní zařízení
 */
function resizeCanvas() {
    const container = document.getElementById('canvas-container');

    // Vypočítat dostupnou výšku a šířku bez překryvů systémových lišt
    const availableWidth = container.clientWidth || window.innerWidth;
    const availableHeight = container.clientHeight || window.innerHeight;

    // Nastavit správný poměr stran
    canvas.width = availableWidth;
    canvas.height = availableHeight;

    // Při změně orientace mobilního zařízení přizpůsobit zobrazení
    if (window.matchMedia("(orientation: portrait)").matches) {
        // Vertikální orientace
        offsetY = canvas.height - 150;
    } else {
        // Horizontální orientace - menší odsazení od spodního okraje
        offsetY = canvas.height - 100;
    }

    drawGrid();
}

/**
 * Vykreslí mřížku na canvas
 */
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Určit interval mřížky podle aktuálního měřítka
    const interval = determineGridInterval(scale);

    // Vykreslit hlavní mřížku
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    drawGridLines(interval);

    // Vykreslit podpůrnou mřížku (jemnější)
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.25;
    drawGridLines(interval / 5);

    // Vykreslit osy
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    drawAxes();

    // Vykreslit popisky
    const viewportLeft = -offsetX / scale;
    const viewportRight = (canvas.width - offsetX) / scale;
    const viewportTop = (offsetY - canvas.height) / scale;
    const viewportBottom = offsetY / scale;
    drawAxisLabels(viewportLeft, viewportRight, viewportTop, viewportBottom);
}

/**
 * Vykreslí čáry mřížky
 */
function drawGridLines(interval) {
    // Určit viditelnou oblast
    const viewportLeft = -offsetX / scale;
    const viewportRight = (canvas.width - offsetX) / scale;
    const viewportTop = (offsetY - canvas.height) / scale;
    const viewportBottom = offsetY / scale;

    // Vykreslit vertikální čáry
    ctx.beginPath();
    for (let x = Math.floor(viewportLeft / interval) * interval; x <= viewportRight; x += interval) {
        const screenX = Math.round(offsetX + x * scale);
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
    }
    ctx.stroke();

    // Vykreslit horizontální čáry
    ctx.beginPath();
    for (let y = Math.floor(viewportTop / interval) * interval; y <= viewportBottom; y += interval) {
        const screenY = Math.round(offsetY - y * scale);
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
    }
    ctx.stroke();
}

/**
 * Vykreslí osy
 */
function drawAxes() {
    const isOriginXVisible = offsetX > 0 && offsetX < canvas.width;
    const isOriginYVisible = offsetY > 0 && offsetY < canvas.height;

    if (isOriginXVisible || isOriginYVisible) {
        ctx.beginPath();

        // X-osa
        if (isOriginYVisible) {
            ctx.moveTo(0, offsetY);
            ctx.lineTo(canvas.width, offsetY);
        }

        // Y-osa
        if (isOriginXVisible) {
            ctx.moveTo(offsetX, 0);
            ctx.lineTo(offsetX, canvas.height);
        }
        ctx.stroke();
    }
}

/**
 * Určí vhodný interval mřížky
 */
function determineGridInterval(scale) {
    const idealPixelsBetweenLines = 100;
    const targetInterval = idealPixelsBetweenLines / scale;

    // Najít nejbližší vhodný interval
    let magnitude = Math.pow(10, Math.floor(Math.log10(targetInterval)));
    let bestInterval = magnitude;
    let minDiff = Math.abs(targetInterval - magnitude);

    for (const base of BASE_INTERVALS) {
        const interval = base * magnitude;
        const diff = Math.abs(targetInterval - interval);
        if (diff < minDiff) {
            minDiff = diff;
            bestInterval = interval;
        }
    }

    return bestInterval;
}

/**
 * Vykreslí popisky os
 */
function drawAxisLabels(startX, endX, startY, endY) {
    const interval = determineGridInterval(scale);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Formátování hodnot pro osy - více detailů na mřížce
    const formatAxisValue = (value) => {
        // Pokud je hodnota velmi blízko nule, zobrazíme 0
        if (Math.abs(value) < 0.001) return '0';

        // Pro osy použijeme až 2 desetinná místa, bez zbytečných koncových nul
        return value.toFixed(2).replace(/\.?0+$/, '');
    };

    // Určit, zda je viditelný středový kříž
    const isOriginXVisible = offsetX > 0 && offsetX < canvas.width;
    const isOriginYVisible = offsetY > 0 && offsetY < canvas.height;

    // Vykreslit popisky pro celé intervaly
    for (let x = Math.ceil(startX / interval) * interval; x <= endX; x += interval) {
        if (x === 0) continue; // Přeskočit 0, protože je to průsečík os

        const screenX = Math.round(offsetX + x * scale);
        // Rozhodnutí, kde vykreslit hodnotu X
        let screenY;
        if (isOriginYVisible) {
            // Pokud je viditelná osa X, vykresli hodnotu na ose
            screenY = offsetY + 15;
        } else if (offsetY > canvas.height / 2) {
            // Střed je pod dolní polovinou - vykresli nahoře
            screenY = 20;
        } else {
            // Střed je nad horní polovinou - vykresli dole
            screenY = canvas.height - 20;
        }

        ctx.fillText(formatAxisValue(x), screenX, screenY);
    }

    for (let y = Math.ceil(startY / interval) * interval; y <= endY; y += interval) {
        if (y === 0) continue; // Přeskočit 0, protože je to průsečík os

        const screenY = Math.round(offsetY - y * scale);
        // Rozhodnutí, kde vykreslit hodnotu Y
        let screenX;
        if (isOriginXVisible) {
            // Pokud je viditelná osa Y, vykresli hodnotu na ose
            screenX = offsetX + 15;
        } else if (offsetX > canvas.width / 2) {
            // Střed je vpravo - vykresli vlevo
            screenX = 20;
        } else {
            // Střed je vlevo - vykresli vpravo
            screenX = canvas.width - 20;
        }

        ctx.fillText(formatAxisValue(y), screenX, screenY);
    }

    // Označení počátku (0, 0)
    if (isOriginXVisible && isOriginYVisible) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillText('0', offsetX - 15, offsetY + 15);
    }
}

/**
 * Aktualizuje zobrazení souřadnic
 * @param {number} x - X souřadnice na obrazovce
 * @param {number} y - Y souřadnice na obrazovce
 * @param {boolean} fixed - Zda zobrazit tučně (pro křížek)
 */
function updateCoordinatesDisplay(x, y, fixed = false) {
    const coordDisplay = document.getElementById('coord-display');
    if (coordDisplay) {
        // Převést pozici na souřadnice mřížky
        const gridX = (x - offsetX) / scale;
        const gridY = (offsetY - y) / scale;

        // Formátovat hodnoty s nanejvýš 3 desetinnými místy
        const formatValue = (value) => {
            // Pokud je hodnota velmi blízko nule, zobrazíme 0
            if (Math.abs(value) < 0.001) return '0';

            // Pro ostatní hodnoty - zobrazit až 3 desetinná místa bez zbytečných nul
            // např. 10.000 -> 10, 10.100 -> 10.1, 10.123 -> 10.123
            return value.toFixed(3).replace(/\.?0+$/, '');
        };

        // Formátovat souřadnice
        const formattedX = formatValue(gridX);
        const formattedY = formatValue(gridY);

        // Zobrazit souřadnice
        coordDisplay.textContent = `X: ${formattedX}, Z: ${formattedY}`;
        coordDisplay.style.fontWeight = fixed ? 'bold' : 'normal';
    }
}

/**
 * Zpracuje událost stisknutí tlačítka myši
 */
function handleMouseDown(e) {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;

    // Kontrola, zda byl křížek již vytvořen a uživatel na něj klikl
    const crossMarker = document.getElementById('cross-marker');
    if (crossMarker && crossMarker.style.display === 'block') {
        // Získat pozici křížku
        const rect = crossMarker.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Pokud kliknul blízko křížku, začneme pohybovat křížkem
        if (Math.abs(e.clientX - centerX) < 30 && Math.abs(e.clientY - centerY) < 30) {
            isCrossMarkerActive = true;
            // Není potřeba měnit pozici křížku při kliknutí, jen aktivovat režim pohybu
            canvas.style.cursor = 'move';
            return;
        } else {
            hideCrossMarker();
        }
    }

    // Standardní chování - spustit časovač pro dlouhé podržení
    isLongPress = false;
    isCrossMarkerActive = false;
    longPressTimer = setTimeout(() => {
        isLongPress = true;
        // Získat pozici kurzoru
        // Použijeme pozici kurzoru přímo, offset bude aplikován ve funkci showCrossMarker
        showCrossMarker(e.clientX, e.clientY);

        // Aktivovat režim pohybu křížku
        isCrossMarkerActive = true;
        canvas.style.cursor = 'move';
    }, LONG_PRESS_DURATION);

    canvas.style.cursor = 'grabbing';
}

/**
 * Zpracuje událost pohybu myši
 */
function handleMouseMove(e) {
    if (!isDragging) {
        // Pokud netlačíme myš, jen aktualizujeme souřadnice
        updateCoordinatesDisplay(e.clientX, e.clientY);
        return;
    }

    if (isCrossMarkerActive) {
        // Režim pohybu křížku
        const screenX = e.clientX;
        const screenY = e.clientY - 80; // Offset 80px nad bodem

        // Přepočítat souřadnice v mřížce pro pozici křížku
        const gridX = (screenX - offsetX) / scale;
        const gridY = (offsetY - screenY) / scale;

        // Aktualizovat pozici křížku
        const crossMarker = document.getElementById('cross-marker');
        if (crossMarker) {
            crossMarker.style.left = `${screenX}px`;
            crossMarker.style.top = `${screenY}px`;

            // Uložit aktuální souřadnice
            crossMarker.dataset.gridX = gridX.toString();
            crossMarker.dataset.gridY = gridY.toString();

            // Aktualizovat zobrazení souřadnic
            const coordDisplay = document.getElementById('coord-display');
            if (coordDisplay) {
                const formattedX = formatCoordinate(gridX);
                const formattedZ = formatCoordinate(gridY);
                coordDisplay.textContent = `X: ${formattedX}, Z: ${formattedZ}`;
                coordDisplay.style.fontWeight = 'bold';
            }
        }
    } else {
        // Standardní posun mapy
        // Zrušit dlouhé podržení, pokud se myš pohne
        if (Math.abs(e.clientX - lastX) > 5 || Math.abs(e.clientY - lastY) > 5) {
            clearTimeout(longPressTimer);
        }

        // Posunout mřížku
        offsetX += e.clientX - lastX;
        offsetY += e.clientY - lastY;

        // Aktualizovat vizuální zobrazení
        drawGrid();
    }

    lastX = e.clientX;
    lastY = e.clientY;
}

/**
 * Zpracuje událost uvolnění tlačítka myši
 */
function handleMouseUp() {
    isDragging = false;
    clearTimeout(longPressTimer);

    if (!isCrossMarkerActive) {
        canvas.style.cursor = 'default';
    }

    // Neukončovat režim pohybu křížku při uvolnění myši
    // Křížek zůstává aktivní dokud uživatel neklikne mimo něj
}

/**
 * Zpracuje událost kolečka myši pro zoom
 */
function handleWheel(e) {
    e.preventDefault();

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomAt(e.clientX, e.clientY, zoomFactor);
}

/**
 * Zpracuje událost dotyku na obrazovce
 */
function handleTouchStart(e) {
    e.preventDefault();

    if (e.touches.length === 1) {
        // Jeden prst - posun
        isDragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;

        // Zaznamenat čas a pozici pro detekci dlouhého podržení
        touchStartTime = Date.now();
        touchStartX = lastX;
        touchStartY = lastY;

        // Spustit časovač pro dlouhé podržení pouze pokud se prst nehýbe
        longPressTimer = setTimeout(() => {
            // Kontrola, zda se prst nepohnul během čekání
            if (Math.abs(lastX - touchStartX) < 5 && Math.abs(lastY - touchStartY) < 5) {
                isLongPress = true;
                // Přidat vibraci pro zpětnou vazbu
                if (window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate(50);
                }

                const gridX = (touchStartX - offsetX) / scale;
                const gridY = (offsetY - touchStartY) / scale;
                showCrossMarker(touchStartX, touchStartY, gridX, gridY);
            }
        }, LONG_PRESS_DURATION);
    } else if (e.touches.length === 2) {
        // Dva prsty - pinch zoom
        clearTimeout(longPressTimer);
        isLongPress = false;
        isDragging = false;
        hideCrossMarker();

        // Zaznamenat počáteční vzdálenost mezi prsty
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDistance = Math.sqrt(dx * dx + dy * dy);

        // Zaznamenat počáteční scale pro tento pinch
        initialScale = scale;

        // Získat střed pinch gesta
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        lastPinchCenter = { x: centerX, y: centerY };
    }
}

// Přidáme inicializaci pinch proměnných a opravíme deklaraci
let lastPinchDistance = 0;
let initialScale = 0;
let lastPinchCenter = { x: 0, y: 0 };

/**
 * Zpracuje událost pohybu prstu na obrazovce
 */
function handleTouchMove(e) {
    e.preventDefault();

    if (e.touches.length === 1 && isDragging) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        // Vypočítat vzdálenost pohybu od počátečního dotyku
        const moveDistanceX = Math.abs(touchX - touchStartX);
        const moveDistanceY = Math.abs(touchY - touchStartY);
        const moveDistance = Math.sqrt(moveDistanceX * moveDistanceX + moveDistanceY * moveDistanceY);

        // Pokud se posunul prst o více než 10px, zrušit časovač dlouhého podržení
        if (moveDistance > 10 && !isLongPress) {
            clearTimeout(longPressTimer);
        }

        if (isCrossMarkerActive) {
            // Režim pohybu křížku
            const screenX = touchX;
            const screenY = touchY - 80; // Offset 80px nad bodem

            // Přepočítat souřadnice v mřížce pro pozici křížku
            const gridX = (screenX - offsetX) / scale;
            const gridY = (offsetY - screenY) / scale;

            // Aktualizovat pozici křížku
            const crossMarker = document.getElementById('cross-marker');
            if (crossMarker) {
                crossMarker.style.left = `${screenX}px`;
                crossMarker.style.top = `${screenY}px`;
                crossMarker.dataset.gridX = gridX.toString();
                crossMarker.dataset.gridY = gridY.toString();

                // Aktualizovat zobrazení souřadnic
                const coordDisplay = document.getElementById('coord-display');
                if (coordDisplay) {
                    const formattedX = formatCoordinate(gridX);
                    const formattedZ = formatCoordinate(gridY);
                    coordDisplay.textContent = `X: ${formattedX}, Z: ${formattedZ}`;
                    coordDisplay.style.fontWeight = 'bold';
                }
            }
        } else {
            // Standardní posun mapy, pokud se nejedná o dlouhé podržení
            if (!isLongPress) {
                // Aktualizovat souřadnice pro zobrazení
                updateCoordinatesDisplay(touchX, touchY);

                // Posunout mřížku
                offsetX += touchX - lastX;
                offsetY += touchY - lastY;

                // Překreslit mřížku
                drawGrid();
            }
        }

        // Aktualizovat poslední pozici
        lastX = touchX;
        lastY = touchY;
    } else if (e.touches.length === 2) {
        // Optimalizovaný pinch-to-zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        // Vypočítat vzdálenost mezi prsty
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Vypočítat střed mezi prsty
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        // Pokud máme počáteční vzdálenost, můžeme spočítat zoom
        if (lastPinchDistance > 0) {
            // Určit změnu měřítka
            const zoomRatio = distance / lastPinchDistance;

            // Použít plynulejší změnu měřítka pro pinch-to-zoom
            const smoothZoomFactor = 1 + (zoomRatio - 1) * 0.7;

            // Vypočítat nové měřítko
            const newScale = initialScale * zoomRatio;

            // Aplikovat zoom na centrum mezi prsty
            zoomAt(centerX, centerY, smoothZoomFactor);
        }

        // Aktualizovat hodnoty pro příští událost
        lastPinchDistance = distance;
        lastPinchCenter = { x: centerX, y: centerY };
    }
}

/**
 * Zpracuje událost zvednutí prstu z obrazovky
 */
function handleTouchEnd(e) {
    // Zrušit časovač pro dlouhé podržení
    clearTimeout(longPressTimer);

    // Pokud všechny prsty byly zvednuty
    if (e.touches.length === 0) {
        isDragging = false;

        // Neukončovat režim křížku hned při zvednutí prstu
        // Tím umožníme uživateli kliknout mimo křížek pro jeho zrušení

        // Resetovat pinch proměnné
        lastPinchDistance = 0;
        initialScale = 0;
    } else if (e.touches.length === 1) {
        // Pokud zůstal jeden prst (při ukončení pinch-to-zoom)
        isDragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;

        // Resetovat pinch proměnné
        lastPinchDistance = 0;
        initialScale = 0;
    }
}

/**
 * Provede zoom na určitou pozici s daným faktorem
 */
function zoomAt(x, y, factor) {
    // Převést pozici kurzoru/dotyku na souřadnice mřížky
    const gridX = (x - offsetX) / scale;
    const gridY = (offsetY - y) / scale;

    // Změnit měřítko
    scale *= factor;

    // ODSTRANĚNO: Odstranili jsme limit na měřítko
    // scale = Math.max(0.1, Math.min(scale, 10));

    // Aktualizovat offset, aby zůstal bod pod kurzorem/dotykem na stejném místě
    offsetX = x - gridX * scale;
    offsetY = y + gridY * scale;

    drawGrid();
}

/**
 * Resetuje pohled na výchozí pozici
 */
function resetView() {
    if (!canvas) return;

    // Nastavit měřítko pro zobrazení rozsahu 0-600 na vodorovné ose
    const targetRightX = 600;
    scale = canvas.width / targetRightX;

    // Umístit počátek souřadnic podle specifikace
    offsetX = 15; // Osa Z 15px od levého okraje
    offsetY = canvas.height - 150; // Osa X 150px od spodního okraje

    drawGrid();
}

/**
 * Zobrazí křížek na dané pozici
 * @param {number} screenX - X souřadnice na obrazovce
 * @param {number} screenY - Y souřadnice na obrazovce
 * @param {number} gridX - X souřadnice v mřížce (nepovinné)
 * @param {number} gridY - Y souřadnice v mřížce (nepovinné)
 */
function showCrossMarker(screenX, screenY, gridX, gridY) {
    const crossMarker = document.getElementById('cross-marker');
    if (crossMarker) {
        // Offset 80px nad bodem pro lepší viditelnost
        const markerY = screenY - 80;
        const markerX = screenX;

        // Použít dodané souřadnice mřížky nebo vypočítat nové
        if (gridX === undefined || gridY === undefined) {
            gridX = (markerX - offsetX) / scale;
            gridY = (offsetY - markerY) / scale; // Použít markerY s offsetem pro správné souřadnice
        }

        // Uložit souřadnice mřížky do atributů pro pozdější použití
        crossMarker.dataset.gridX = gridX.toString();
        crossMarker.dataset.gridY = gridY.toString();

        // Zobrazit křížek
        crossMarker.style.display = 'block';
        crossMarker.style.left = `${markerX}px`;
        crossMarker.style.top = `${markerY}px`;

        // Aktualizovat zobrazení souřadnic s pozicí křížku a offsetem v ose Z
        const coordDisplay = document.getElementById('coord-display');
        if (coordDisplay) {
            const formattedX = formatCoordinate(gridX);
            const formattedZ = formatCoordinate(gridY); // Použijeme Z místo Y pro správný popis os
            coordDisplay.textContent = `X: ${formattedX}, Z: ${formattedZ}`;
            coordDisplay.style.fontWeight = 'bold';
        }

        // Aktivovat režim pohybu křížku
        isCrossMarkerActive = true;
    }
}

/**
 * Skryje křížek
 */
function hideCrossMarker() {
    const crossMarker = document.getElementById('cross-marker');
    if (crossMarker) {
        crossMarker.style.display = 'none';
        isCrossMarkerActive = false;
        canvas.style.cursor = 'default';
    }
}

/**
 * Formátuje souřadnici pro zobrazení
 * @param {number} value - Hodnota souřadnice
 * @returns {string} Formátovaná souřadnice
 */
function formatCoordinate(value) {
    if (Math.abs(value) < 0.001) return '0';
    return value.toFixed(3).replace(/\.?0+$/, '');
}

// Smazat starý export a nahradit jediným správným exportem
export {
    initializeGrid,
    drawGrid,
    resetView,
    resizeCanvas,
    updateCoordinatesDisplay,
    showCrossMarker,
    hideCrossMarker
};
