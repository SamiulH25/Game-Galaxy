// Cosmic Tetris - Improved Implementation with SRS Rotation System

// Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const LOCK_DELAY = 500;
const LOCK_MOVE_LIMIT = 15;
const DAS_DELAY = 170;
const DAS_REPEAT = 50;
const ARR_DELAY = 0;
const ARR_REPEAT = 0;

// Colors - Refined paper/craft aesthetic
const COLORS = {
    I: '#7BA3C4', O: '#D4B896', T: '#9B7B9B', S: '#8BB88B', Z: '#D49090', J: '#8B9BD4', L: '#D4BC96',
    explosive: '#D49070', magnetic: '#70A090', slow: '#9090B8'
};

// SRS Piece definitions - 4 rotation states each
const PIECES = {
    I: {
        size: 4,
        states: [
            [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
            [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
            [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
            [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
        ],
        kickData: {
            '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
            '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
            '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
            '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
            '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
            '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
            '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
            '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
        }
    },
    O: {
        size: 2,
        states: [
            [[1,1],[1,1]],
            [[1,1],[1,1]],
            [[1,1],[1,1]],
            [[1,1],[1,1]]
        ],
        kickData: {}
    },
    T: {
        size: 3,
        states: [
            [[0,1,0],[1,1,1],[0,0,0]],
            [[0,1,0],[0,1,1],[0,1,0]],
            [[0,0,0],[1,1,1],[0,1,0]],
            [[0,1,0],[1,1,0],[0,1,0]]
        ],
        kickData: {
            '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
            '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
            '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
            '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
            '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
            '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
            '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
            '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
        }
    },
    S: {
        size: 3,
        states: [
            [[0,1,1],[1,1,0],[0,0,0]],
            [[0,1,0],[0,1,1],[0,0,1]],
            [[0,0,0],[0,1,1],[1,1,0]],
            [[1,0,0],[1,1,0],[0,1,0]]
        ],
        kickData: {
            '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
            '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
            '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
            '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
            '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
            '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
            '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
            '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
        }
    },
    Z: {
        size: 3,
        states: [
            [[1,1,0],[0,1,1],[0,0,0]],
            [[0,0,1],[0,1,1],[0,1,0]],
            [[0,0,0],[1,1,0],[0,1,1]],
            [[0,1,0],[1,1,0],[1,0,0]]
        ],
        kickData: {
            '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
            '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
            '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
            '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
            '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
            '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
            '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
            '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
        }
    },
    J: {
        size: 3,
        states: [
            [[1,0,0],[1,1,1],[0,0,0]],
            [[0,1,1],[0,1,0],[0,1,0]],
            [[0,0,0],[1,1,1],[0,0,1]],
            [[0,1,0],[0,1,0],[1,1,0]]
        ],
        kickData: {
            '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
            '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
            '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
            '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
            '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
            '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
            '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
            '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
        }
    },
    L: {
        size: 3,
        states: [
            [[0,0,1],[1,1,1],[0,0,0]],
            [[0,1,0],[0,1,0],[0,1,1]],
            [[0,0,0],[1,1,1],[1,0,0]],
            [[1,1,0],[0,1,0],[0,1,0]]
        ],
        kickData: {
            '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
            '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
            '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
            '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
            '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
            '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
            '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
            '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
        }
    }
};

const GRAVITY_MODES = ['down', 'left', 'right', 'up'];
const GRAVITY_NAMES = ['Normal', 'Westward', 'Eastward', 'Reversed'];
const LINES_PER_SHIFT = 10;

class CosmicTetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextPieceCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.holdCanvas = document.getElementById('holdPieceCanvas');
        this.holdCtx = this.holdCanvas.getContext('2d');
        
        this.board = [];
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.totalLines = 0;
        this.gameOver = false;
        this.paused = false;
        this.currentPiece = null;
        this.nextPiece = null;
        this.holdPiece = null;
        this.canHold = true;
        this.gravityMode = 0;
        this.linesUntilShift = LINES_PER_SHIFT;
        this.powerMeter = 0;
        this.powerActive = false;
        this.slowMotion = false;
        this.slowMotionTimer = 0;
        this.combo = 0;
        
        this.specialChance = 0.15;
        this.bag = [];
        
        // Lock delay system
        this.lockTimer = 0;
        this.lockMoves = 0;
        this.isLocking = false;
        
        // DAS/ARR system
        this.keys = {};
        this.dasTimer = {};
        this.arrTimer = {};
        
        // Timing
        this.lastTime = 0;
        this.dropTimer = 0;
        this.softDropTimer = 0;
        this.softDropInterval = 50; // ms between soft drop moves
        this.softDropping = false;
        
        // Dirty flags for rendering
        this.dirty = {
            board: true,
            piece: true,
            next: true,
            hold: true,
            score: true,
            level: true,
            lines: true
        };
        
        this.initBoard();
        this.bindEvents();
        this.start();
    }

    initBoard() {
        this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    }

    // 7-bag randomizer
    createBag() {
        const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        return pieces;
    }

    getNextPiece() {
        if (this.bag.length === 0) this.bag = this.createBag();
        const type = this.bag.pop();
        const isSpecial = Math.random() < this.specialChance;
        let specialType = null;
        if (isSpecial) {
            const specials = ['explosive', 'magnetic', 'slow'];
            specialType = specials[Math.floor(Math.random() * specials.length)];
        }
        return this.createPiece(type, specialType);
    }

    createPiece(type, specialType = null) {
        const piece = PIECES[type];
        // Spawn position: centered horizontally, at top
        // I piece spawns at row -1 (partially above visible area)
        // Other pieces spawn at row 0
        return {
            type,
            state: 0,
            x: Math.floor((COLS - piece.size) / 2),
            y: 0,
            special: specialType
        };
    }

    getShape(piece, state = null) {
        return PIECES[piece.type].states[state !== null ? state : piece.state];
    }

    // SRS rotation with wall kicks
    tryRotate(piece, direction) {
        const fromState = piece.state;
        const toState = (piece.state + direction + 4) % 4;
        const kickKey = `${fromState}>${toState}`;
        const kicks = PIECES[piece.type].kickData[kickKey] || [[0,0]];
        
        for (const [dx, dy] of kicks) {
            if (this.isValidPosition(piece, dx, dy, toState)) {
                piece.state = toState;
                piece.x += dx;
                piece.y -= dy; // SRS uses y-up, we use y-down
                return true;
            }
        }
        return false;
    }

    isValidPosition(piece, offsetX = 0, offsetY = 0, state = null) {
        const shape = this.getShape(piece, state);
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const newX = piece.x + x + offsetX;
                    const newY = piece.y + y + offsetY;
                    // Check horizontal bounds
                    if (newX < 0 || newX >= COLS) return false;
                    // Check bottom bound
                    if (newY >= ROWS) return false;
                    // Only check collision if piece is on the board (y >= 0)
                    if (newY >= 0 && this.board[newY] && this.board[newY][newX]) return false;
                }
            }
        }
        return true;
    }

    // Gravity-based movement
    getGravityDirection() {
        switch (GRAVITY_MODES[this.gravityMode]) {
            case 'up': return { x: 0, y: -1 };
            case 'left': return { x: -1, y: 0 };
            case 'right': return { x: 1, y: 0 };
            default: return { x: 0, y: 1 };
        }
    }

    movePiece(dx, dy) {
        if (this.isValidPosition(this.currentPiece, dx, dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            
            // Reset lock delay on successful move
            if (this.isLocking && this.lockMoves < LOCK_MOVE_LIMIT) {
                this.lockTimer = 0;
                this.lockMoves++;
            }
            
            this.dirty.piece = true;
            return true;
        }
        return false;
    }

    hardDrop() {
        const ghostY = this.getGhostY();
        const dropDistance = ghostY - this.currentPiece.y;
        this.score += dropDistance * 2;
        this.currentPiece.y = ghostY;
        this.lockPiece();
    }

    getGhostY() {
        let ghostY = this.currentPiece.y;
        while (this.isValidPosition(this.currentPiece, 0, ghostY - this.currentPiece.y + 1)) {
            ghostY++;
        }
        return ghostY;
    }

    lockPiece() {
        const shape = this.getShape(this.currentPiece);
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const boardY = this.currentPiece.y + y;
                    const boardX = this.currentPiece.x + x;
                    // Only place block if it's within the visible board
                    if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                        this.board[boardY][boardX] = {
                            color: this.currentPiece.type,
                            special: this.currentPiece.special
                        };
                    }
                }
            }
        }
        
        if (this.currentPiece.special === 'explosive') {
            this.explodeAt(this.currentPiece.x + 1, this.currentPiece.y + 1);
        } else if (this.currentPiece.special === 'magnetic') {
            this.magnetPull();
        }
        
        this.clearLines();
        this.spawnNextPiece();
        this.isLocking = false;
        this.lockTimer = 0;
        this.lockMoves = 0;
    }

    spawnNextPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.getNextPiece();
        this.canHold = true;
        
        if (!this.isValidPosition(this.currentPiece)) {
            this.endGame();
        }
    }

    explodeAt(cx, cy) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const y = cy + dy;
                const x = cx + dx;
                if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
                    this.board[y][x] = 0;
                }
            }
        }
        this.showNotification('💥 Stellar Explosion!');
    }

    magnetPull() {
        for (let y = ROWS - 2; y >= 0; y--) {
            for (let x = 0; x < COLS; x++) {
                if (this.board[y][x] && !this.board[y + 1][x]) {
                    this.board[y + 1][x] = this.board[y][x];
                    this.board[y][x] = 0;
                }
            }
        }
        this.showNotification('🧲 Magnetic Pull!');
    }

    clearLines() {
        let linesCleared = 0;
        const linesToClear = [];
        
        for (let y = ROWS - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                linesToClear.push(y);
                linesCleared++;
            }
        }
        
        if (linesCleared > 0) {
            this.combo++;
            const lineScore = [0, 100, 300, 500, 800];
            const baseScore = lineScore[Math.min(linesCleared, 4)] * this.level;
            const comboBonus = this.combo > 1 ? 50 * this.combo * this.level : 0;
            this.score += baseScore + comboBonus;
            this.lines += linesCleared;
            this.totalLines += linesCleared;
            this.linesUntilShift -= linesCleared;
            
            this.powerMeter = Math.min(100, this.powerMeter + linesCleared * 10);
            
            if (this.linesUntilShift <= 0) {
                this.shiftGravity();
                this.linesUntilShift = LINES_PER_SHIFT;
            }
            
            if (this.lines >= this.level * 10) {
                this.level++;
            }
            
            linesToClear.forEach(y => {
                this.board.splice(y, 1);
                this.board.unshift(Array(COLS).fill(0));
            });
            
            if (this.combo > 1) {
                this.showNotification(`Combo x${this.combo}!`);
            }
            
            this.dirty.board = true;
            this.dirty.score = true;
            this.dirty.lines = true;
        } else {
            this.combo = 0;
        }
    }

    shiftGravity() {
        this.gravityMode = (this.gravityMode + 1) % GRAVITY_MODES.length;
        const dir = GRAVITY_NAMES[this.gravityMode];
        this.showNotification(`Gravity Shifts ${dir}!`);
        
        // Rotate board
        const newBoard = Array(COLS).fill(null).map(() => Array(ROWS).fill(0));
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (this.board[y][x]) {
                    const newY = x;
                    const newX = ROWS - 1 - y;
                    if (newY >= 0 && newY < COLS && newX >= 0 && newX < ROWS) {
                        newBoard[newY][newX] = this.board[y][x];
                    }
                }
            }
        }
        
        // Swap canvas dimensions
        const temp = this.canvas.width;
        this.canvas.width = this.canvas.height;
        this.canvas.height = temp;
        
        this.board = newBoard;
        this.dirty.board = true;
    }

    getDropSpeed() {
        const speeds = [800, 717, 633, 550, 467, 383, 300, 217, 133, 100, 83, 83, 83, 67, 67, 67, 50, 50, 50, 33];
        return speeds[Math.min(this.level - 1, speeds.length - 1)];
    }

    usePower() {
        if (this.powerMeter < 100 || this.powerActive) return;
        
        this.powerActive = true;
        this.slowMotion = true;
        this.slowMotionTimer = 5000;
        this.powerMeter = 0;
        
        this.showNotification('⏳ Time Warp Active!');
        this.dirty.score = true;
    }

    holdPiece() {
        if (!this.canHold) return;
        
        this.canHold = false;
        const temp = this.currentPiece;
        
        if (this.holdPiece) {
            this.currentPiece = this.createPiece(this.holdPiece.type, this.holdPiece.special);
        } else {
            this.currentPiece = this.nextPiece;
            this.nextPiece = this.getNextPiece();
        }
        
        this.holdPiece = { type: temp.type, special: temp.special };
        this.dirty.hold = true;
        this.dirty.piece = true;
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            
            // Prevent key repeat for rotation and hard drop
            if (e.repeat && ['ArrowUp', 'ArrowDown', ' ', 'c', 'C', 'Shift'].includes(e.key)) {
                return;
            }
            
            switch(e.key) {
                case 'ArrowLeft':
                case 'a':
                    if (!this.keys['left']) {
                        this.keys['left'] = true;
                        this.dasTimer['left'] = 0;
                        this.arrTimer['left'] = 0;
                        this.movePiece(-1, 0);
                    }
                    break;
                case 'ArrowRight':
                case 'd':
                    if (!this.keys['right']) {
                        this.keys['right'] = true;
                        this.dasTimer['right'] = 0;
                        this.arrTimer['right'] = 0;
                        this.movePiece(1, 0);
                    }
                    break;
                case 'ArrowDown':
                case 's':
                    if (!this.keys['down']) {
                        this.keys['down'] = true;
                        this.softDropping = true;
                    }
                    break;
                case 'ArrowUp':
                case 'w':
                    this.tryRotate(this.currentPiece, 1);
                    this.dirty.piece = true;
                    break;
                case 'z':
                case 'Z':
                    this.tryRotate(this.currentPiece, -1);
                    this.dirty.piece = true;
                    break;
                case ' ':
                    e.preventDefault();
                    this.hardDrop();
                    break;
                case 'c':
                case 'C':
                    this.holdPiece();
                    break;
                case 'Shift':
                    this.usePower();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                case 'a':
                    this.keys['left'] = false;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.keys['right'] = false;
                    break;
                case 'ArrowDown':
                case 's':
                    this.keys['down'] = false;
                    this.softDropping = false;
                    break;
            }
        });
    }

    // Rendering
    drawBlock(ctx, x, y, color, special = null, alpha = 1, size = BLOCK_SIZE) {
        const baseColor = COLORS[color] || COLORS.I;
        const px = x * size;
        const py = y * size;
        
        ctx.globalAlpha = alpha;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(px + 2, py + 2, size - 2, size - 2);
        
        // Main block
        ctx.fillStyle = baseColor;
        ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
        
        // Top highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(px + 1, py + 1, size - 2, 2);
        
        // Left highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(px + 1, py + 1, 2, size - 2);
        
        // Bottom shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(px + 1, py + size - 3, size - 2, 2);
        
        // Right shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(px + size - 3, py + 1, 2, size - 2);
        
        // Inner bevel
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 1.5, py + 1.5, size - 3, size - 3);
        
        // Special indicator
        if (special) {
            ctx.fillStyle = COLORS[special];
            ctx.shadowColor = COLORS[special];
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(px + size / 2, py + size / 2, size / 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        ctx.globalAlpha = 1;
    }

    drawBoard() {
        this.ctx.fillStyle = '#0D0B08';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Grid lines
        this.ctx.strokeStyle = '#1A1612';
        this.ctx.lineWidth = 0.5;
        for (let x = 0; x <= COLS; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * BLOCK_SIZE, 0);
            this.ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
            this.ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * BLOCK_SIZE);
            this.ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
            this.ctx.stroke();
        }
        
        // Board blocks
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(this.ctx, x, y, this.board[y][x].color, this.board[y][x].special);
                }
            }
        }
    }

    drawPiece() {
        if (!this.currentPiece) return;
        
        const shape = this.getShape(this.currentPiece);
        
        // Ghost piece
        const ghostY = this.getGhostY();
        if (ghostY !== this.currentPiece.y) {
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        this.drawBlock(this.ctx, this.currentPiece.x + x, ghostY + y, this.currentPiece.type, null, 0.3);
                    }
                }
            }
        }
        
        // Current piece
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    this.drawBlock(this.ctx, this.currentPiece.x + x, this.currentPiece.y + y, this.currentPiece.type, this.currentPiece.special);
                }
            }
        }
    }

    drawPreview(ctx, piece, canvas) {
        ctx.fillStyle = '#0D0B08';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!piece) return;
        
        const shape = PIECES[piece.type].states[0];
        const size = PIECES[piece.type].size;
        const previewBlockSize = Math.min(
            Math.floor((canvas.width - 20) / size),
            Math.floor((canvas.height - 20) / size)
        );
        const totalSize = size * previewBlockSize;
        const offsetX = Math.floor((canvas.width - totalSize) / 2);
        const offsetY = Math.floor((canvas.height - totalSize) / 2);
        
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const px = offsetX + x * previewBlockSize;
                    const py = offsetY + y * previewBlockSize;
                    // Draw directly with pixel coordinates
                    ctx.fillStyle = COLORS[piece.type] || COLORS.I;
                    ctx.fillRect(px + 1, py + 1, previewBlockSize - 2, previewBlockSize - 2);
                    
                    // Add highlight
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.fillRect(px + 1, py + 1, previewBlockSize - 2, 2);
                    
                    // Special indicator
                    if (piece.special) {
                        ctx.fillStyle = COLORS[piece.special];
                        ctx.beginPath();
                        ctx.arc(px + previewBlockSize / 2, py + previewBlockSize / 2, previewBlockSize / 6, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
    }

    updateUI() {
        if (this.dirty.score) {
            document.getElementById('scoreDisplay').textContent = this.score.toLocaleString();
            this.dirty.score = false;
        }
        if (this.dirty.level) {
            document.getElementById('levelDisplay').textContent = this.level;
            this.dirty.level = false;
        }
        if (this.dirty.lines) {
            document.getElementById('linesDisplay').textContent = this.totalLines;
            const dots = document.querySelectorAll('.line-dot');
            dots.forEach((dot, i) => {
                dot.classList.toggle('filled', i >= this.linesUntilShift);
            });
            this.dirty.lines = false;
        }
        
        const gravityArrow = document.getElementById('gravityArrow');
        const gravityLabel = document.getElementById('gravityLabel');
        gravityArrow.className = 'gravity-arrow ' + GRAVITY_MODES[this.gravityMode];
        gravityLabel.textContent = GRAVITY_NAMES[this.gravityMode];
        
        document.getElementById('powerFill').style.width = this.powerMeter + '%';
        document.getElementById('powerBar').classList.toggle('ready', this.powerMeter >= 100);
    }

    showNotification(text) {
        const notif = document.getElementById('notification');
        notif.textContent = text;
        notif.classList.add('show');
        setTimeout(() => notif.classList.remove('show'), 2000);
    }

    endGame() {
        this.gameOver = true;
        document.getElementById('finalScore').textContent = 'Score: ' + this.score.toLocaleString();
        document.getElementById('gameOverOverlay').classList.add('active');
        this.saveGame();
    }

    restart() {
        this.initBoard();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.totalLines = 0;
        this.gameOver = false;
        this.gravityMode = 0;
        this.linesUntilShift = LINES_PER_SHIFT;
        this.powerMeter = 0;
        this.powerActive = false;
        this.slowMotion = false;
        this.combo = 0;
        this.holdPiece = null;
        this.canHold = true;
        this.bag = [];
        this.isLocking = false;
        this.lockTimer = 0;
        this.lockMoves = 0;
        this.softDropTimer = 0;
        
        this.currentPiece = this.getNextPiece();
        this.nextPiece = this.getNextPiece();
        
        document.getElementById('gameOverOverlay').classList.remove('active');
        
        this.dirty = { board: true, piece: true, next: true, hold: true, score: true, level: true, lines: true };
        this.start();
    }

    async saveGame() {
        if (window.gameBridge) {
            await window.gameBridge.save({
                score: this.score,
                level: this.level,
                lines: this.totalLines,
                board: this.board.map(row => row.map(cell => cell || 0))
            });
        }
    }

    async loadGame() {
        if (window.gameBridge) {
            const data = await window.gameBridge.load();
            if (data && data.score !== undefined) {
                this.score = data.score;
                this.level = data.level;
                this.totalLines = data.lines;
                this.board = data.board.map(row => row.map(cell => cell === 0 ? 0 : cell));
                this.dirty = { board: true, piece: true, next: true, hold: true, score: true, level: true, lines: true };
                return true;
            }
        }
        return false;
    }

    start() {
        this.currentPiece = this.currentPiece || this.getNextPiece();
        this.nextPiece = this.nextPiece || this.getNextPiece();
        this.lastTime = performance.now();
        this.gameLoop();
    }

    update(dt) {
        if (this.gameOver || this.paused) return;
        
        // Handle DAS/ARR for left/right
        if (this.keys['left']) {
            this.dasTimer['left'] += dt;
            if (this.dasTimer['left'] >= DAS_DELAY) {
                this.arrTimer['left'] += dt;
                while (this.arrTimer['left'] >= ARR_REPEAT) {
                    this.movePiece(-1, 0);
                    this.arrTimer['left'] -= ARR_REPEAT;
                }
            }
        }
        if (this.keys['right']) {
            this.dasTimer['right'] += dt;
            if (this.dasTimer['right'] >= DAS_DELAY) {
                this.arrTimer['right'] += dt;
                while (this.arrTimer['right'] >= ARR_REPEAT) {
                    this.movePiece(1, 0);
                    this.arrTimer['right'] -= ARR_REPEAT;
                }
            }
        }
        
        // Soft drop with throttling
        if (this.softDropping) {
            this.softDropTimer += dt;
            if (this.softDropTimer >= this.softDropInterval) {
                this.softDropTimer -= this.softDropInterval;
                if (this.movePiece(0, 1)) {
                    this.score += 1;
                    this.dirty.score = true;
                    this.dropTimer = 0;
                }
            }
        } else {
            this.softDropTimer = 0;
        }
        
        // Gravity
        const dropSpeed = this.slowMotion ? this.getDropSpeed() * 2 : this.getDropSpeed();
        this.dropTimer += dt;
        if (this.dropTimer >= dropSpeed) {
            this.dropTimer -= dropSpeed;
            const grav = this.getGravityDirection();
            if (!this.movePiece(grav.x, grav.y)) {
                // Start or continue lock delay
                if (!this.isLocking) {
                    this.isLocking = true;
                    this.lockTimer = 0;
                }
            }
        }
        
        // Lock delay
        if (this.isLocking) {
            this.lockTimer += dt;
            if (this.lockTimer >= LOCK_DELAY || this.lockMoves >= LOCK_MOVE_LIMIT) {
                // Check if can still move down
                const grav = this.getGravityDirection();
                if (!this.isValidPosition(this.currentPiece, grav.x, grav.y)) {
                    this.lockPiece();
                } else {
                    this.isLocking = false;
                }
            }
        }
        
        // Slow motion timer
        if (this.slowMotion) {
            this.slowMotionTimer -= dt;
            if (this.slowMotionTimer <= 0) {
                this.slowMotion = false;
                this.powerActive = false;
                this.showNotification('Time Warp Ended');
            }
        }
    }

    draw() {
        this.drawBoard();
        this.drawPiece();
        this.drawPreview(this.nextCtx, this.nextPiece, this.nextCanvas);
        this.drawPreview(this.holdCtx, this.holdPiece, this.holdCanvas);
        this.updateUI();
    }

    gameLoop(timestamp = 0) {
        if (this.gameOver) return;
        
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        this.update(dt);
        this.draw();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

const game = new CosmicTetris();
game.loadGame();