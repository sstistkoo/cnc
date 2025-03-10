/**
 * cnc-parser.js
 * Modul pro parsování CNC kódu Sinumerik
 */

/**
 * Třída pro parsování CNC kódu
 */
export class CNCParser {
    constructor() {
        // Inicializace parseru
        this.currentX = 0;
        this.currentZ = 0;
        this.feedRate = 0;
        this.spindleSpeed = 0;
        this.activeGCodes = new Set();
        this.activeMCodes = new Set();
        this.toolNumber = 0;
    }

    /**
     * Parsuje celý CNC kód
     * @param {string} cncCode - Vstupní CNC kód
     * @returns {Array} Pole parsovaných příkazů
     */
    parseCode(cncCode) {
        console.log('Parsování CNC kódu');
        
        // Rozdělit kód na řádky
        const lines = cncCode.split('\n');
        const parsedCommands = [];
        
        // Resetovat stav
        this.currentX = 0;
        this.currentZ = 0;
        
        // Zpracovat každý řádek
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNumber = i + 1;
            
            // Přeskočit prázdné řádky
            if (line === '') continue;
            
            // Parsovat řádek
            const parsedCommand = this.parseLine(line, lineNumber);
            if (parsedCommand) {
                parsedCommands.push(parsedCommand);
            }
        }
        
        return parsedCommands;
    }

    /**
     * Parsuje jeden řádek CNC kódu
     * @param {string} line - Řádek CNC kódu
     * @param {number} lineNumber - Číslo řádku
     * @returns {Object|null} Parsovaný příkaz nebo null pro komentáře/prázdné řádky
     */
    parseLine(line, lineNumber) {
        // Odstranit komentáře
        const commentIndex = line.indexOf(';');
        const codeLine = commentIndex >= 0 ? line.substring(0, commentIndex).trim() : line.trim();
        const comment = commentIndex >= 0 ? line.substring(commentIndex + 1).trim() : '';
        
        // Přeskočit prázdné řádky nebo čisté komentáře
        if (codeLine === '') {
            if (comment) {
                return {
                    type: 'comment',
                    comment,
                    lineNumber
                };
            }
            return null;
        }
        
        // Základní struktura příkazu
        const command = {
            type: 'command',
            lineNumber,
            originalLine: line,
            comment,
            x: this.currentX,
            z: this.currentZ,
            gCodes: [],
            mCodes: [],
            feedRate: this.feedRate,
            spindleSpeed: this.spindleSpeed,
            toolNumber: this.toolNumber
        };
        
        // Rozdělit řádek na tokeny (slova)
        const tokens = codeLine.split(/\s+/);
        let hasMovement = false;
        
        // Zpracovat každý token
        for (const token of tokens) {
            const code = token.charAt(0).toUpperCase();
            const value = parseFloat(token.substring(1));
            
            switch (code) {
                case 'N': // Číslo bloku
                    command.blockNumber = value;
                    break;
                    
                case 'G': // G kód
                    command.gCodes.push(value);
                    this.activeGCodes.add(value);
                    
                    // Zpracovat specifické G kódy
                    if (value === 0 || value === 1 || value === 2 || value === 3) {
                        command.moveType = value;
                        hasMovement = true;
                    }
                    break;
                    
                case 'M': // M kód
                    command.mCodes.push(value);
                    this.activeMCodes.add(value);
                    break;
                    
                case 'X': // X souřadnice
                    command.x = value;
                    this.currentX = value;
                    hasMovement = true;
                    break;
                    
                case 'Z': // Z souřadnice
                    command.z = value;
                    this.currentZ = value;
                    hasMovement = true;
                    break;
                    
                case 'F': // Posuv
                    command.feedRate = value;
                    this.feedRate = value;
                    break;
                    
                case 'S': // Otáčky vřetene
                    command.spindleSpeed = value;
                    this.spindleSpeed = value;
                    break;
                    
                case 'T': // Nástroj
                    command.toolNumber = value;
                    this.toolNumber = value;
                    break;
                    
                case 'I': // I parametr pro kruhovou interpolaci
                    command.i = value;
                    break;
                    
                case 'K': // K parametr pro kruhovou interpolaci
                    command.k = value;
                    break;
                    
                default:
                    // Neznámý kód - ignorovat nebo přidat do poznámky
                    if (!command.unknownCodes) command.unknownCodes = [];
                    command.unknownCodes.push(token);
            }
        }
        
        // Určit typ příkazu
        if (hasMovement) {
            command.type = 'movement';
            
            // Určit typ pohybu podle aktivních G kódů
            if (command.gCodes.includes(0)) {
                command.moveType = 'rapid'; // Rychloposuv
            } else if (command.gCodes.includes(1)) {
                command.moveType = 'linear'; // Lineární interpolace
            } else if (command.gCodes.includes(2)) {
                command.moveType = 'arc_cw'; // Kruhová interpolace ve směru hodinových ručiček
            } else if (command.gCodes.includes(3)) {
                command.moveType = 'arc_ccw'; // Kruhová interpolace proti směru hodinových ručiček
            }
        } else if (command.gCodes.length > 0 || command.mCodes.length > 0) {
            command.type = 'setup'; // Nastavení bez pohybu
        }
        
        return command;
    }

    /**
     * Převede parsované příkazy na dráhu nástroje
     * @param {Array} commands - Pole parsovaných příkazů
     * @returns {Array} Pole bodů dráhy nástroje
     */
    generateToolpath(commands) {
        const toolpath = [];
        
        // Přidat počáteční bod
        toolpath.push({
            x: 0,
            z: 0,
            type: 'start'
        });
        
        // Zpracovat každý příkaz
        for (const command of commands) {
            if (command.type === 'movement') {
                // Přidat bod do dráhy
                toolpath.push({
                    x: command.x,
                    z: command.z,
                    type: command.moveType,
                    feedRate: command.feedRate,
                    lineNumber: command.lineNumber
                });
                
                // Pro kruhovou interpolaci přidat více bodů
                if (command.moveType === 'arc_cw' || command.moveType === 'arc_ccw') {
                    // Zde by byla implementace výpočtu bodů pro kruhovou interpolaci
                    // Pro jednoduchost nyní vynecháno
                }
            }
        }
        
        return toolpath;
    }
}

/**
 * Pomocná funkce pro analýzu Sinumerik CNC kódu
 * @param {string} cncCode - Vstupní CNC kód
 * @returns {Object} Informace o CNC programu
 */
export function analyzeCNCProgram(cncCode) {
    const parser = new CNCParser();
    const commands = parser.parseCode(cncCode);
    
    // Základní analýza programu
    const analysis = {
        totalLines: cncCode.split('\n').length,
        totalCommands: commands.length,
        movementCommands: commands.filter(cmd => cmd.type === 'movement').length,
        setupCommands: commands.filter(cmd => cmd.type === 'setup').length,
        commentLines: commands.filter(cmd => cmd.type === 'comment').length,
        gCodes: new Set(),
        mCodes: new Set(),
        maxX: -Infinity,
        minX: Infinity,
        maxZ: -Infinity,
        minZ: Infinity,
        tools: new Set()
    };
    
    // Projít všechny příkazy a shromáždit informace
    for (const cmd of commands) {
        // Sbírat G kódy
        if (cmd.gCodes) {
            for (const gCode of cmd.gCodes) {
                analysis.gCodes.add(gCode);
            }
        }
        
        // Sbírat M kódy
        if (cmd.mCodes) {
            for (const mCode of cmd.mCodes) {
                analysis.mCodes.add(mCode);
            }
        }
        
        // Sledovat rozsah souřadnic
        if (cmd.type === 'movement') {
            if (cmd.x !== undefined) {
                analysis.maxX = Math.max(analysis.maxX, cmd.x);
                analysis.minX = Math.min(analysis.minX, cmd.x);
            }
            
            if (cmd.z !== undefined) {
                analysis.maxZ = Math.max(analysis.maxZ, cmd.z);
                analysis.minZ = Math.min(analysis.minZ, cmd.z);
            }
        }
        
        // Sledovat použité nástroje
        if (cmd.toolNumber !== undefined) {
            analysis.tools.add(cmd.toolNumber);
        }
    }
    
    // Převést sety na pole pro lepší použitelnost
    analysis.gCodes = Array.from(analysis.gCodes).sort((a, b) => a - b);
    analysis.mCodes = Array.from(analysis.mCodes).sort((a, b) => a - b);
    analysis.tools = Array.from(analysis.tools).sort((a, b) => a - b);
    
    // Vypočítat rozměry obrobku
    analysis.workpieceWidth = analysis.maxX - analysis.minX;
    analysis.workpieceLength = analysis.maxZ - analysis.minZ;
    
    return analysis;
}
