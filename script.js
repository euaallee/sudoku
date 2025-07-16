/* -------------------Importações----------------------- */


/* ----------------- Variáveis e constantes ----------------- */
const root = document.querySelector("#root");
const btnTgTheme = document.querySelector("#tgTheme")
const SIZE = 9;
const TOTAL_BLOCK = 9;

const DIFFICULTIES = {
    easy: { holes: 30, maxErrors: 5 },
    medium: { holes: 40, maxErrors: 5 },
    hard: { holes: 50, maxErrors: 4 },
    hardcore: { holes: 60, maxErrors: 3 },
};

let seconds = 0;
let timerInterval = null;
let score = 100;
let solution = [];
let selectedCell = null;
let errors = 0;
let maxErrors = 5;
let userInputs = {};
let highScore = localStorage.getItem("sudokuHighScore") || 0;
/* ----------------- Utilidades gerais ----------------- */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function updateHighScoreDisplay() {
    document.getElementById("highScoreDisplay").textContent = `Maior pontuação: ${highScore}`;
}

/* ----------------- Timer ----------------- */
function startTimer() {
    clearInterval(timerInterval);
    seconds = 0;
    document.getElementById("timer").textContent = "00:00";
    timerInterval = setInterval(() => {
        seconds++;
        const min = String(Math.floor(seconds / 60)).padStart(2, "0");
        const sec = String(seconds % 60).padStart(2, "0");
        document.getElementById("timer").textContent = `${min}:${sec}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

/* ----------------- Pontuação & erros ----------------- */
function updateScore(change = 0) {
    score += change;
    if (score < 0) score = 0;
    document.getElementById("score").textContent = score;
}

function updateErrors() {
    document.getElementById("errors").textContent = errors;
    if (errors >= maxErrors) {
        document.getElementById("fail-sound").play();
        setTimeout(() => {
            alert("❌ Você excedeu o limite de erros. Tente novamente!");
            goToMenu();
        }, 100);
    }
}

/* ----------------- Sudoku – geração da solução e do puzzle ----------------- */
function generateSudokuBoard(holes = 40) {
    const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

    function isValid(board, row, col, num) {
        for (let x = 0; x < SIZE; x++) {
            if (board[row][x] === num || board[x][col] === num) return false;
        }
        const startRow = row - (row % 3);
        const startCol = col - (col % 3);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[startRow + i][startCol + j] === num) return false;
            }
        }
        return true;
    }

    function fillBoard(board) {
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                if (board[row][col] === 0) {
                    const nums = shuffle([...Array(9).keys()].map(n => n + 1));
                    for (let num of nums) {
                        if (isValid(board, row, col, num)) {
                            board[row][col] = num;
                            if (fillBoard(board)) return true;
                            board[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    function createPuzzle(board, holes) {
        const puzzle = board.map(row => row.slice());
        let removed = 0;
        while (removed < holes) {
            const row = Math.floor(Math.random() * SIZE);
            const col = Math.floor(Math.random() * SIZE);
            if (puzzle[row][col] !== 0) {
                puzzle[row][col] = 0;
                removed++;
            }
        }
        return puzzle;
    }

    fillBoard(board);
    solution = board;                         // guarda solução global
    return createPuzzle(board, holes);        // devolve puzzle com buracos
}

/* ----------------- Criação visual do tabuleiro ----------------- */
function creatSmallBlock(parent, row, col, value) {
    const cell = document.createElement("div");
    cell.classList.add("select-block");
    cell.style.border = "1px solid #444444ff";
    //cell.style.backgroundColor = "#fddbb4";
    cell.style.height = "66px";
    cell.style.width = "66px";
    cell.dataset.row = row;
    cell.dataset.col = col;

    if (value !== 0) {
        cell.textContent = value;
        cell.classList.add("fixed");
    } else {
        cell.addEventListener("click", () => { selectedCell = cell; });
    }

    cell.addEventListener("mouseover", () => highlightAxis(row, col, true));
    cell.addEventListener("mouseout", () => highlightAxis(row, col, false));

    parent.append(cell);
}

function creatBlock(parent, blockIndex, puzzle) {
    const block = document.createElement("div");
    block.style.border = "2px solid #000000ff";
    block.style.display = "inline-grid";
    block.style.placeSelf = "anchor-center"
    block.style.gridTemplateColumns = "repeat(3, 66px)";
    block.style.gridTemplateRows = "repeat(3, 66px)";
    parent.append(block);

    const blockRow = Math.floor(blockIndex / 3);
    const blockCol = blockIndex % 3;

    for (let i = 0; i < TOTAL_BLOCK; i++) {
        const cellRowInBlock = Math.floor(i / 3);
        const cellColInBlock = i % 3;
        const row = blockRow * 3 + cellRowInBlock;
        const col = blockCol * 3 + cellColInBlock;
        const value = puzzle[row][col];
        creatSmallBlock(block, row, col, value);
    }
}

function creatSquare(puzzle) {
    root.innerHTML = "";
    const square = document.createElement("div");
    square.style.border = "3px solid #000";
    square.style.display = "grid";
    square.style.gridTemplateColumns = "repeat(3, 200px)";
    square.style.gridTemplateRows = "repeat(3, 200px)";

    for (let i = 0; i < TOTAL_BLOCK; i++) creatBlock(square, i, puzzle);
    root.append(square);
}

/* ----------------- Realce de linha/coluna ----------------- */
function highlightAxis(row, col, enable) {
    document.querySelectorAll(".select-block").forEach(cell => {
        if (cell.dataset.row == row) cell.classList.toggle("highlight-y", enable);
        if (cell.dataset.col == col) cell.classList.toggle("highlight-x", enable);
    });
}

/* ----------------- Botões de números ----------------- */
function createNumberButtons() {
    const container = document.getElementById("number-buttons");
    container.innerHTML = "";
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.dataset.num = i;
        btn.classList.add("num-btn");
        btn.addEventListener("click", () => handleNumberClick(i));
        container.appendChild(btn);
    }
    checkUsedNumbers();
}

function handleNumberClick(num) {
    if (!selectedCell || selectedCell.classList.contains("fixed")) return;

    const row = +selectedCell.dataset.row;
    const col = +selectedCell.dataset.col;
    const key = `${row}-${col}`;
    const current = parseInt(selectedCell.textContent);

    // Se já está correto, não faz nada
    if (current === solution[row][col]) return;

    // Resposta correta
    if (num === solution[row][col]) {
        selectedCell.textContent = num;
        selectedCell.style.color = "blue";

        // Remove erro anterior se houver
        if (userInputs[key]?.wasWrong) {
            // (não desconta ponto aqui, só remove marca de erro)
            delete userInputs[key];
        }

        updateScore(10 - Math.floor(seconds / 30));
        checkFullLinesAndBlocks();
        checkVictory();
        checkUsedNumbers();
    } else {
        // Evita contar erro duplicado na mesma célula
        if (userInputs[key]?.wasWrong) return;

        selectedCell.textContent = num;
        selectedCell.style.color = "red";
        updateScore(-5);
        errors++;
        updateErrors();

        // Marca que essa célula já teve erro
        userInputs[key] = { wasWrong: true };
    }
}

function checkUsedNumbers() {
    const usedCount = Array(10).fill(0);
    document.querySelectorAll(".select-block").forEach(cell => {
        const val = parseInt(cell.textContent);
        if (val >= 1 && val <= 9) usedCount[val]++;
    });
    for (let i = 1; i <= 9; i++) {
        const btn = document.querySelector(`.num-btn[data-num='${i}']`);
        if (!btn) continue;
        btn.style.display = usedCount[i] >= 9 ? "none" : "inline-block";
    }
}

/* ----------------- Regras extras de pontuação ----------------- */
function checkFullLinesAndBlocks() {
    const cells = document.querySelectorAll(".select-block");
    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    cells.forEach(cell => {
        const row = +cell.dataset.row;
        const col = +cell.dataset.col;
        const val = parseInt(cell.textContent);
        if (!isNaN(val)) grid[row][col] = val;
    });

    // Linhas & colunas completas
    for (let i = 0; i < SIZE; i++) {
        if (grid[i].every((v, idx) => v === solution[i][idx])) updateScore(30);
        if (grid.every((row, idx) => row[i] === solution[idx][i])) updateScore(30);
    }

    // Blocos 3x3 completos
    for (let block = 0; block < 9; block++) {
        const startRow = Math.floor(block / 3) * 3;
        const startCol = (block % 3) * 3;
        let correct = true;
        for (let r = 0; r < 3 && correct; r++) {
            for (let c = 0; c < 3; c++) {
                if (grid[startRow + r][startCol + c] !== solution[startRow + r][startCol + c]) {
                    correct = false; break;
                }
            }
        }
        if (correct) updateScore(50);
    }
}

/* ----------------- Verificação de vitória ----------------- */
function checkVictory() {
    const cells = document.querySelectorAll(".select-block");
    for (const cell of cells) {
        const { row, col } = cell.dataset;
        const expected = solution[+row][+col];
        if (!cell.classList.contains("fixed") && parseInt(cell.textContent) !== expected) return;
    }
    stopTimer();
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("sudokuHighScore", highScore);
        updateHighScoreDisplay();
    }
    document.getElementById("win-sound").play();
    setTimeout(() => alert("✨ Parabéns! Você completou o Sudoku! ✨"), 100);
    setTimeout(goToMenu, 200);
}

/* ----------------- Tema claro/escuro ----------------- */
function toggleTheme() {
    const isDark = document.body.classList.toggle("dark");
    document.querySelector("#home").setAttribute("style", isDark ? "color: white" : "color: black");
    btnTgTheme.innerHTML = "";

    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", isDark ? "sun" : "moon");
    icon.style.color = isDark ? "white" : "black"
    btnTgTheme.appendChild(icon)


    lucide.createIcons();
}

/* ----------------- Menu & HUD ----------------- */
function goToMenu() {
    stopTimer();
    root.innerHTML = "";
    document.getElementById("number-buttons").innerHTML = "";
    document.getElementById("menu").style.display = "flex";
    document.getElementById("hud").style.display = "none";
    document.getElementById("root").style.display = "none";
}

document.getElementById("btnStart").addEventListener("click", () => {
    document.getElementById("difficultyModal").style.display = "flex";
});

function startGame(difficultyKey) {
    document.getElementById("difficultyModal").style.display = "none";

    // guarda limites conforme dificuldade
    const { holes, maxErrors: me } = DIFFICULTIES[difficultyKey];
    maxErrors = me;

    // estado inicial
    score = 100;
    errors = 0;
    userInputs = {};
    updateScore(0);     // força atualizar HUD
    updateErrors();

    // UI: esconde menu, mostra HUD
    document.getElementById("menu").style.display = "none";
    document.getElementById("hud").style.display = "flex";
    document.getElementById("root").style.display = "block";

    // Gera puzzle e cria tabuleiro
    const puzzle = generateSudokuBoard(holes);
    creatSquare(puzzle);
    createNumberButtons();
    startTimer();
}

/* ----------------- Eventos globais ----------------- */

// Pressionar Backspace/Delete remove número se não for fixo
window.addEventListener("keydown", e => {
    if (!selectedCell || selectedCell.classList.contains("fixed")) return;
    if (e.key === "Backspace" || e.key === "Delete") {
        selectedCell.textContent = "";
        checkUsedNumbers();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    updateHighScoreDisplay();
    lucide.createIcons();
});