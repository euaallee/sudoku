// Mostra o formulário de nome ao carregar
document.getElementById("displayNameForm").style.display = "flex";

/* ----------------- VARIÁVEIS GLOBAIS ----------------- */
const root = document.querySelector("#root");

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
let isDarkTheme = localStorage.getItem("theme") === "true";

/* ----------------- UTILIDADES ----------------- */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function updateHighScoreDisplay() {
    document.getElementById("highScoreDisplay").textContent = `${highScore}`;
}

/* ----------------- AUTENTICAÇÃO ----------------- */
const API_URL = "https://sudoku-backend-tau.vercel.app/api";
let currentUser = localStorage.getItem("user");
let accessToken = localStorage.getItem("token");
let sessionId = localStorage.getItem("sessionId");

async function handleRegister() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!email || !password) return alert("Preencha todos os campos!");

    const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    alert(data.message || data.error);
}

async function handleLogin() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!email || !password) return alert("Preencha todos os campos!");

    const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.session?.access_token) {
        accessToken = data.session.access_token;
        sessionId = data.user.id;
        localStorage.setItem("token", accessToken);
        localStorage.setItem("sessionId", sessionId);

        document.getElementById("authModal").style.display = "none";
        document.querySelector(".sessionMenu").style.display = "flex";
        loadingInfoPlayer();
        updateHUDUser();
        loadRanking();
    } else {
        alert(data.error || "Erro ao logar");
    }
}

async function setDisplayName() {
    const name = document.getElementById("displayNameInput").value.trim();
    if (!name) return alert("Digite um nome!");

    const res = await fetch(`${API_URL}/player`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ displayName: name })
    });

    const data = await res.json();
    alert(data.message || data.error);
    loadingInfoPlayer();
    loadRanking();
}

async function loadingInfoPlayer() {
    const res = await fetch(`${API_URL}/userName`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });

    const data = await res.json();
    data.forEach(item => {
        if (item.id === sessionId) {
            currentUser = item.usuario || "Desconhecido";
            localStorage.setItem("user", currentUser);
            updateHUDUser();
        }
    });
}

async function updateJogadasRestantes() {
    const res = await fetch(`${API_URL}/play`, {
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });

    const data = await res.json();
    if (res.ok) {
        document.getElementById("jogadasRestantes").innerHTML = `<strong>Jogadas:</strong> ${data.restantes}`;
        // Desativa botão de anúncio se já assistiu
        const adButton = document.querySelector("#ad button");
        if (adButton) {
            adButton.disabled = !data.podeAssistir;
            adButton.textContent = data.podeAssistir ? "Assistir Anúncio" : "Anúncio já assistido";
            adButton.style.opacity = data.podeAssistir ? "1" : "0.5";
        }
    }
}

function updateHUDUser() {
    const hud = document.getElementById("hud");
    let userLabel = document.getElementById("userLabel");
    if (!userLabel) {
        userLabel = document.createElement("span");
        userLabel.id = "userLabel";
        hud.insertBefore(userLabel, hud.secondChild);
    }
    userLabel.innerHTML = `<strong>Usuário:</strong> ${currentUser}`;
    document.getElementById("displayNameForm").style.display = "block";
}

async function loadRanking() {
    const res = await fetch(`${API_URL}/ranking`);
    const data = await res.json();
    if (!Array.isArray(data)) return;

    const list = document.getElementById("rankingList");
    list.innerHTML = "";
    data.forEach((item, i) => {
        const minutes = Math.floor(item.time / 60);
        const seconds = item.time % 60;
        list.innerHTML += `
        <li>
            <div class="bodyRanking">
                <span>#${i + 1}</span>
                <div class="infoRanking">
                    <h3>${item.username || item.email}</h3>
                    <p>${item.points} pts</p>
                    <span>${minutes}min ${seconds}s</span>
                </div>
            </div>
        </li>`;
    });

    await updateJogadasRestantes();
}

function mostrarAnuncio() {
    let segundos = 5;
    const adModal = document.getElementById("adModal");
    const timer = document.getElementById("timer");

    adModal.style.display = "flex";
    document.getElementById("ad").style.display = "none";
    timer.innerText = segundos;

    const intervalo = setInterval(() => {
        segundos--;
        timer.innerText = segundos;

        if (segundos <= 0) {
            clearInterval(intervalo);
            adModal.style.display = "none";
            registrarAnuncioAssistido();
        }
    }, 1000);
}

async function registrarAnuncioAssistido() {
    try {
        const res = await fetch(`${API_URL}/registerAd`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            }
        });

        const data = await res.json();

        if (res.ok) {
            alert("✅ Anúncio contabilizado! Você ganhou +5 jogadas hoje.");
        } else {
            alert(`❌ ${data.error || "Erro ao registrar anúncio."}`);
        }
    } catch (err) {
        console.error("Erro de rede ao registrar anúncio:", err);
        alert("Erro de conexão ao registrar anúncio.");
    }
}


function logout() {
    accessToken = null;
    currentUser = null;
    sessionId = null;

    localStorage.removeItem("sessionId");
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    document.getElementById("authModal").style.display = "flex";
    document.querySelector(".sessionMenu").style.display = "none";

    const label = document.getElementById("userLabel");
    if (label) label.remove();

    alert("Você saiu da conta.");
}

/* ----------------- TIMER ----------------- */
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

/* ----------------- PONTUAÇÃO & ERROS ----------------- */
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

/* ----------------- GERAÇÃO DE SUDOKU ----------------- */
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
    solution = board;
    return createPuzzle(board, holes);
}

/* ----------------- INTERFACE DO TABULEIRO ----------------- */
function createSmallBlock(parent, row, col, value) {
    const cell = document.createElement("div");
    cell.classList.add("select-block");
    cell.style.border = "1px solid #444";
    cell.style.height = "66px";
    cell.style.width = "66px";
    cell.dataset.row = row;
    cell.dataset.col = col;

    if (value !== 0) {
        cell.textContent = value;
        cell.classList.add("fixed");
    } else {
        cell.addEventListener("click", () => {
            document.querySelectorAll(".select-block").forEach(c => c.classList.remove("selected"));

            selectedCell = cell;
            cell.classList.add("selected");
        });
    }

    cell.addEventListener("mouseover", () => highlightAxis(row, col, true));
    cell.addEventListener("mouseout", () => highlightAxis(row, col, false));
    parent.append(cell);
}

function createBlock(parent, blockIndex, puzzle) {
    const block = document.createElement("div");
    block.style.border = `2px solid gray`;
    block.style.display = "inline-grid";
    block.style.gridTemplateColumns = "repeat(3, 66px)";
    block.style.gridTemplateRows = "repeat(3, 66px)";
    parent.append(block);

    const blockRow = Math.floor(blockIndex / 3);
    const blockCol = blockIndex % 3;

    for (let i = 0; i < TOTAL_BLOCK; i++) {
        const row = blockRow * 3 + Math.floor(i / 3);
        const col = blockCol * 3 + i % 3;
        const value = puzzle[row][col];
        createSmallBlock(block, row, col, value);
    }
}

function createSquare(puzzle) {
    root.innerHTML = "";
    const square = document.createElement("div");
    square.style.border = `1px solid gray`;
    square.style.display = "grid";
    square.style.gridTemplateColumns = "repeat(3, 200px)";
    square.style.gridTemplateRows = "repeat(3, 200px)";
    for (let i = 0; i < TOTAL_BLOCK; i++) createBlock(square, i, puzzle);
    root.append(square);
}

/* ----------------- INTERAÇÕES E VERIFICAÇÕES ----------------- */
function highlightAxis(row, col, enable) {
    document.querySelectorAll(".select-block").forEach(cell => {
        if (cell.dataset.row == row) cell.classList.toggle("highlight-y", enable);
        if (cell.dataset.col == col) cell.classList.toggle("highlight-x", enable);
    });
}

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

    const delBtn = document.createElement("button");
    delBtn.textContent = "⌫";
    delBtn.classList.add("num-btn");
    delBtn.style.backgroundColor = "#dc3545";
    delBtn.style.fontWeight = "bold";
    delBtn.onclick = () => {
        if (!selectedCell || selectedCell.classList.contains("fixed")) return;
        selectedCell.textContent = "";
        checkUsedNumbers();
    };
    container.appendChild(delBtn);
    checkUsedNumbers();
}

function handleNumberClick(num) {
    if (!selectedCell || selectedCell.classList.contains("fixed")) return;

    const row = +selectedCell.dataset.row;
    const col = +selectedCell.dataset.col;
    const key = `${row}-${col}`;
    const current = parseInt(selectedCell.textContent);

    if (current === solution[row][col]) return;

    if (num === solution[row][col]) {
        selectedCell.textContent = num;
        selectedCell.style.color = "blue";

        if (userInputs[key]?.wasWrong) {
            delete userInputs[key];
        }

        updateScore(10 - Math.floor(seconds / 30));
        checkFullLinesAndBlocks();
        checkVictory();
        checkUsedNumbers();
    } else {
        selectedCell.textContent = num;
        selectedCell.style.color = "red";
        updateScore(-5);

        if (!userInputs[key]?.wasWrong) {
            errors++;
            updateErrors();
            userInputs[key] = { wasWrong: true };
        }
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
        if (btn) btn.style.display = usedCount[i] >= 9 ? "none" : "inline-block";
    }
}

function checkFullLinesAndBlocks() {
    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    document.querySelectorAll(".select-block").forEach(cell => {
        const row = +cell.dataset.row;
        const col = +cell.dataset.col;
        const val = parseInt(cell.textContent);
        if (!isNaN(val)) grid[row][col] = val;
    });

    for (let i = 0; i < SIZE; i++) {
        if (grid[i].every((v, idx) => v === solution[i][idx])) updateScore(30);
        if (grid.every((row, idx) => row[i] === solution[idx][i])) updateScore(30);
    }

    for (let block = 0; block < 9; block++) {
        const startRow = Math.floor(block / 3) * 3;
        const startCol = (block % 3) * 3;
        let correct = true;
        for (let r = 0; r < 3 && correct; r++) {
            for (let c = 0; c < 3; c++) {
                if (grid[startRow + r][startCol + c] !== solution[startRow + r][startCol + c]) {
                    correct = false;
                    break;
                }
            }
        }
        if (correct) updateScore(50);
    }
}

async function checkVictory() {
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

    if (accessToken) {
        try {
            const res = await fetch(`${API_URL}/score`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify({ points: score, time_in_seconds: seconds })
            });

            const data = await res.json();
            if (!res.ok) {
                console.error("Erro ao registrar pontuação:", data.error);
                document.querySelector(".sessionMenu").style.display = "none";

                const ad = document.getElementById("ad");
                ad.style.display = "flex";
                const avisoAd = document.createElement("div");
                const btnAd = document.createElement("button");
                avisoAd.classList.add("avisoAd");
                btnAd.innerText = "Assistir Anúncio";
                btnAd.addEventListener("click", () => {
                    mostrarAnuncio();
                });

                avisoAd.innerHTML += `<p>${data.error}</p>`;
                avisoAd.appendChild(btnAd);
                ad.appendChild(avisoAd);

            } else {
                console.log("Pontuação registrada!");
            }
        } catch (err) {
            console.error("Erro de rede ao salvar score:", err);
        }
    }

    document.getElementById("win-sound").play();
    setTimeout(() => alert("✨ Parabéns! Você completou o Sudoku! ✨"), 100);
    setTimeout(goToMenu, 200);
}

/* ----------------- TEMA CLARO/ESCURO ----------------- */
const btnTgTheme = document.querySelector("#tgTheme");
const icon = document.createElement("i");
icon.setAttribute("data-lucide", isDarkTheme ? "sun" : "moon");
btnTgTheme.appendChild(icon);

function toggleTheme() {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("theme", isDark);
    btnTgTheme.firstChild.remove();

    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", isDark ? "sun" : "moon");

    btnTgTheme.append(icon);
    lucide.createIcons();
}

/* ----------------- MENU ----------------- */
function goToMenu() {
    stopTimer();
    root.innerHTML = "";
    document.getElementById("number-buttons").innerHTML = "";
    document.querySelector(".sessionMenu").style.display = "flex";
    document.querySelector(".game").style.display = "none";
    loadRanking();
}

document.getElementById("btnStart").addEventListener("click", () => {
    document.querySelector(".difficultyModal").style.display = "flex";
});

function startGame(difficultyKey) {
    document.querySelector(".difficultyModal").style.display = "none";
    document.querySelector(".game").style.display = "flex";

    const { holes, maxErrors: me } = DIFFICULTIES[difficultyKey];
    maxErrors = me;
    score = 100;
    errors = 0;
    userInputs = {};
    updateScore(0);
    updateErrors();

    document.querySelector(".sessionMenu").style.display = "none";
    document.getElementById("hud").style.display = "flex";
    document.getElementById("root").style.display = "block";

    const puzzle = generateSudokuBoard(holes);
    createSquare(puzzle);
    createNumberButtons();
    startTimer();
}

/* ----------------- EVENTOS GLOBAIS ----------------- */
window.addEventListener("keydown", e => {
    if (!selectedCell || selectedCell.classList.contains("fixed")) return;
    if (e.key === "Backspace" || e.key === "Delete") {
        selectedCell.textContent = "";
        checkUsedNumbers();
    }
});

const closeDifficultyModal = () => {
    document.querySelector(".difficultyModal").style.display = "none";
};

document.addEventListener("DOMContentLoaded", () => {
    updateHighScoreDisplay();
    lucide.createIcons();
    if (isDarkTheme) document.body.classList.add("dark");
});

if (!accessToken) {
    alert("Sessão finalizada!")
    document.querySelector("#authModal").style.display = "flex";
    document.querySelector(".sessionMenu").style.display = "none";
    localStorage.removeItem("token");
} else {
    document.getElementById("authModal").style.display = "none";
    document.querySelector(".sessionMenu").style.display = "flex";
    updateHUDUser();
    loadRanking();
}




