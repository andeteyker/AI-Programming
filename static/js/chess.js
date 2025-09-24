const boardElement = document.getElementById("chess-board");
const statusBanner = document.getElementById("status-banner");
const moveHistoryElement = document.getElementById("move-history");
const promotionDialog = document.getElementById("promotion-dialog");
const promotionButtons = promotionDialog.querySelectorAll("button");
const whiteWinsValue = document.getElementById("white-wins-value");
const blackWinsValue = document.getElementById("black-wins-value");
const drawsValue = document.getElementById("draws-value");
const resetButton = document.getElementById("reset-button");
const resignWhiteButton = document.getElementById("resign-white");
const resignBlackButton = document.getElementById("resign-black");
const offerDrawButton = document.getElementById("offer-draw");

const statsEndpoint = "/api/results";

const pieceSymbols = {
  w: {
    k: "\u2654",
    q: "\u2655",
    r: "\u2656",
    b: "\u2657",
    n: "\u2658",
    p: "\u2659",
  },
  b: {
    k: "\u265A",
    q: "\u265B",
    r: "\u265C",
    b: "\u265D",
    n: "\u265E",
    p: "\u265F",
  },
};

let boardState = [];
let squareElements = [];
let currentPlayer = "w";
let selectedSquare = null;
let legalMoves = [];
let enPassantTarget = null;
let pendingPromotion = null;
let gameOver = false;
let fullmoveNumber = 1;
let moveHistory = [];

const directions = {
  rook: [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ],
  bishop: [
    { row: -1, col: -1 },
    { row: -1, col: 1 },
    { row: 1, col: -1 },
    { row: 1, col: 1 },
  ],
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  setupBoardElements();
  attachEventListeners();
  resetGame();
  fetchStats();
}

function attachEventListeners() {
  resetButton.addEventListener("click", resetGame);
  resignWhiteButton.addEventListener("click", () => handleResignation("white"));
  resignBlackButton.addEventListener("click", () => handleResignation("black"));
  offerDrawButton.addEventListener("click", handleDrawOffer);

  promotionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!pendingPromotion) return;
      const promotionType = button.dataset.piece;
      pendingPromotion.move.promotion = promotionType;
      promotionDialog.classList.remove("active");
      completeMove(pendingPromotion.from, pendingPromotion.move);
      pendingPromotion = null;
    });
  });
}

function setupBoardElements() {
  boardElement.innerHTML = "";
  squareElements = [];

  for (let row = 0; row < 8; row += 1) {
    const rowElements = [];
    for (let col = 0; col < 8; col += 1) {
      const square = document.createElement("button");
      square.type = "button";
      square.className = `square ${(row + col) % 2 === 0 ? "square--light" : "square--dark"}`;
      square.dataset.row = row;
      square.dataset.col = col;
      square.setAttribute("aria-label", `Feld ${notationFromCoords(row, col)}`);
      square.addEventListener("click", handleSquareClick);
      boardElement.appendChild(square);
      rowElements.push(square);
    }
    squareElements.push(rowElements);
  }
}

function resetGame() {
  boardState = createInitialBoard();
  currentPlayer = "w";
  selectedSquare = null;
  legalMoves = [];
  enPassantTarget = null;
  pendingPromotion = null;
  gameOver = false;
  fullmoveNumber = 1;
  moveHistory = [];
  clearHighlights();
  renderBoard();
  renderMoveHistory();
  updateStatus("Weiß am Zug");
  promotionDialog.classList.remove("active");
}

function createInitialBoard() {
  const layout = [
    ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
    ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
    ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"],
  ];

  return layout.map((row) =>
    row.map((code) => (code ? createPiece(code[0], code[1]) : null))
  );
}

function createPiece(color, type) {
  return { color, type, hasMoved: false };
}

function handleSquareClick(event) {
  if (gameOver) {
    return;
  }

  if (pendingPromotion) {
    return;
  }

  const { row, col } = event.currentTarget.dataset;
  const r = Number(row);
  const c = Number(col);
  const piece = boardState[r][c];

  if (selectedSquare) {
    if (selectedSquare.row === r && selectedSquare.col === c) {
      clearSelection();
      return;
    }

    const foundMove = legalMoves.find((move) => move.row === r && move.col === c);
    if (!foundMove) {
      if (piece && piece.color === currentPlayer) {
        selectSquare(r, c);
      } else {
        clearSelection();
      }
      return;
    }

    if (foundMove.requiresPromotion) {
      pendingPromotion = { from: { row: selectedSquare.row, col: selectedSquare.col }, move: foundMove };
      showPromotionDialog(pieceAt(selectedSquare));
      return;
    }

    completeMove({ row: selectedSquare.row, col: selectedSquare.col }, foundMove);
    return;
  }

  if (piece && piece.color === currentPlayer) {
    selectSquare(r, c);
  }
}

function pieceAt(position) {
  return boardState[position.row][position.col];
}

function selectSquare(row, col) {
  selectedSquare = { row, col };
  legalMoves = getLegalMoves(row, col);
  clearHighlights();
  squareElements[row][col].classList.add("square--selected");
  legalMoves.forEach((move) => {
    const square = squareElements[move.row][move.col];
    square.classList.add("square--legal");
    if (move.captures) {
      square.classList.add("square--capture");
    }
  });
}

function clearSelection() {
  selectedSquare = null;
  legalMoves = [];
  clearHighlights();
}

function clearHighlights() {
  squareElements.flat().forEach((square) => {
    square.classList.remove("square--selected", "square--legal", "square--capture");
  });
}

function getLegalMoves(row, col) {
  const piece = boardState[row][col];
  if (!piece || piece.color !== currentPlayer) {
    return [];
  }

  const pseudoMoves = generatePseudoLegalMoves(row, col, piece);
  const legal = [];

  pseudoMoves.forEach((move) => {
    const simulatedBoard = applyMove(cloneBoard(boardState), { row, col }, move);
    if (!isKingInCheck(simulatedBoard, currentPlayer)) {
      legal.push(move);
    }
  });

  return legal;
}

function generatePseudoLegalMoves(row, col, piece) {
  const moves = [];
  if (piece.type === "p") {
    generatePawnMoves(row, col, piece, moves);
  } else if (piece.type === "n") {
    generateKnightMoves(row, col, piece, moves);
  } else if (piece.type === "b") {
    generateSlidingMoves(row, col, piece, directions.bishop, moves);
  } else if (piece.type === "r") {
    generateSlidingMoves(row, col, piece, directions.rook, moves);
  } else if (piece.type === "q") {
    generateSlidingMoves(row, col, piece, directions.rook.concat(directions.bishop), moves);
  } else if (piece.type === "k") {
    generateKingMoves(row, col, piece, moves);
  }
  return moves;
}

function generatePawnMoves(row, col, piece, moves) {
  const direction = piece.color === "w" ? -1 : 1;
  const startRow = piece.color === "w" ? 6 : 1;
  const promotionRow = piece.color === "w" ? 0 : 7;

  const oneAhead = { row: row + direction, col };
  if (isOnBoard(oneAhead.row, oneAhead.col) && !boardState[oneAhead.row][oneAhead.col]) {
    const move = createMove(oneAhead.row, oneAhead.col);
    if (oneAhead.row === promotionRow) {
      move.requiresPromotion = true;
    }
    moves.push(move);

    if (row === startRow) {
      const twoAhead = { row: row + 2 * direction, col };
      if (isOnBoard(twoAhead.row, twoAhead.col) && !boardState[twoAhead.row][twoAhead.col]) {
        moves.push({
          row: twoAhead.row,
          col: twoAhead.col,
          doubleStep: true,
        });
      }
    }
  }

  [-1, 1].forEach((colOffset) => {
    const target = { row: row + direction, col: col + colOffset };
    if (!isOnBoard(target.row, target.col)) return;

    const targetPiece = boardState[target.row][target.col];
    if (targetPiece && targetPiece.color !== piece.color) {
      const captureMove = createMove(target.row, target.col, true);
      if (target.row === promotionRow) {
        captureMove.requiresPromotion = true;
      }
      moves.push(captureMove);
    }
  });

  if (enPassantTarget && enPassantTarget.color !== piece.color) {
    if (enPassantTarget.row === row && Math.abs(enPassantTarget.col - col) === 1) {
      moves.push({
        row: row + direction,
        col: enPassantTarget.col,
        enPassant: true,
        captures: true,
      });
    }
  }
}

function generateKnightMoves(row, col, piece, moves) {
  const offsets = [
    { row: -2, col: -1 },
    { row: -2, col: 1 },
    { row: -1, col: -2 },
    { row: -1, col: 2 },
    { row: 1, col: -2 },
    { row: 1, col: 2 },
    { row: 2, col: -1 },
    { row: 2, col: 1 },
  ];

  offsets.forEach((offset) => {
    const targetRow = row + offset.row;
    const targetCol = col + offset.col;
    if (!isOnBoard(targetRow, targetCol)) return;

    const targetPiece = boardState[targetRow][targetCol];
    if (!targetPiece || targetPiece.color !== piece.color) {
      moves.push(createMove(targetRow, targetCol, Boolean(targetPiece)));
    }
  });
}

function generateSlidingMoves(row, col, piece, dirs, moves) {
  dirs.forEach((dir) => {
    let step = 1;
    while (true) {
      const targetRow = row + dir.row * step;
      const targetCol = col + dir.col * step;
      if (!isOnBoard(targetRow, targetCol)) break;

      const targetPiece = boardState[targetRow][targetCol];
      if (!targetPiece) {
        moves.push(createMove(targetRow, targetCol));
      } else {
        if (targetPiece.color !== piece.color) {
          moves.push(createMove(targetRow, targetCol, true));
        }
        break;
      }
      step += 1;
    }
  });
}

function generateKingMoves(row, col, piece, moves) {
  for (let r = -1; r <= 1; r += 1) {
    for (let c = -1; c <= 1; c += 1) {
      if (r === 0 && c === 0) continue;
      const targetRow = row + r;
      const targetCol = col + c;
      if (!isOnBoard(targetRow, targetCol)) continue;
      const targetPiece = boardState[targetRow][targetCol];
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push(createMove(targetRow, targetCol, Boolean(targetPiece)));
      }
    }
  }

  if (!piece.hasMoved && !isKingInCheck(boardState, piece.color)) {
    tryAddCastleMove(row, col, piece, moves, true);
    tryAddCastleMove(row, col, piece, moves, false);
  }
}

function tryAddCastleMove(row, col, kingPiece, moves, kingSide) {
  const rookCol = kingSide ? 7 : 0;
  const step = kingSide ? 1 : -1;
  const spaces = kingSide ? [5, 6] : [1, 2, 3];
  const rook = boardState[row][rookCol];
  if (!rook || rook.type !== "r" || rook.color !== kingPiece.color || rook.hasMoved) {
    return;
  }

  const pathClear = spaces.every((c) => !boardState[row][c]);
  if (!pathClear) {
    return;
  }

  const squaresToCheck = kingSide ? [col, col + step, col + 2 * step] : [col, col + step, col + 2 * step];
  const enemy = kingPiece.color === "w" ? "b" : "w";
  const safe = squaresToCheck.every((c) => !isSquareAttacked(boardState, row, c, enemy));
  if (!safe) {
    return;
  }

  moves.push({
    row,
    col: col + 2 * step,
    castle: kingSide ? "kingside" : "queenside",
  });
}

function createMove(row, col, captures = false) {
  return { row, col, captures };
}

function applyMove(board, from, move) {
  const newBoard = board;
  const piece = clonePiece(newBoard[from.row][from.col]);
  newBoard[from.row][from.col] = null;
  let newEnPassant = null;

  if (piece.type === "p") {
    if (move.enPassant) {
      const direction = piece.color === "w" ? -1 : 1;
      newBoard[from.row][move.col] = null;
    }
    if (move.doubleStep) {
      newEnPassant = { row: move.row, col: move.col, color: piece.color };
    }
    if (move.promotion) {
      piece.type = move.promotion;
    }
  }

  if (move.castle) {
    const row = from.row;
    if (move.castle === "kingside") {
      const rook = clonePiece(newBoard[row][7]);
      newBoard[row][7] = null;
      newBoard[row][5] = rook;
      if (rook) rook.hasMoved = true;
    } else {
      const rook = clonePiece(newBoard[row][0]);
      newBoard[row][0] = null;
      newBoard[row][3] = rook;
      if (rook) rook.hasMoved = true;
    }
  }

  piece.hasMoved = true;
  newBoard[move.row][move.col] = piece;
  newBoard.enPassantTarget = newEnPassant;
  return newBoard;
}

function completeMove(from, move) {
  pendingPromotion = null;
  promotionDialog.classList.remove("active");
  const piece = boardState[from.row][from.col];
  const enemyColor = currentPlayer === "w" ? "b" : "w";
  const captures = move.captures || move.enPassant;

  boardState = applyMove(cloneBoard(boardState), from, move);
  enPassantTarget = boardState.enPassantTarget || null;
  delete boardState.enPassantTarget;

  const opponentInCheck = isKingInCheck(boardState, enemyColor);
  const opponentHasMoves = playerHasMoves(boardState, enemyColor);
  const isMate = opponentInCheck && !opponentHasMoves;
  const isStalemate = !opponentInCheck && !opponentHasMoves;

  const notation = buildNotation(
    piece,
    from,
    move,
    captures,
    isMate,
    opponentInCheck && !isMate
  );
  registerMove(notation, captures, piece.color);

  currentPlayer = enemyColor;
  selectedSquare = null;
  legalMoves = [];
  clearHighlights();
  renderBoard();

  if (isMate) {
    const winner = piece.color === "w" ? "white" : "black";
    updateStatus(`Schachmatt! ${piece.color === "w" ? "Weiß" : "Schwarz"} gewinnt.`);
    gameOver = true;
    submitResult(winner);
  } else if (isStalemate) {
    updateStatus("Patt! Unentschieden.");
    gameOver = true;
    submitResult("draw");
  } else {
    updateStatus(`${currentPlayer === "w" ? "Weiß" : "Schwarz"} am Zug${
      opponentInCheck ? " – Schach!" : ""
    }`);
  }
}

function buildNotation(piece, from, move, captures, mate, check) {
  let notation = "";
  const pieceLetter = piece.type === "p" ? "" : piece.type.toUpperCase();
  if (move.castle === "kingside") {
    notation = "O-O";
  } else if (move.castle === "queenside") {
    notation = "O-O-O";
  } else {
    if (piece.type !== "p") {
      notation += pieceLetter;
    } else if (captures) {
      notation += notationFromCoords(from.row, from.col)[0];
    }
    if (captures) {
      notation += "x";
    }
    notation += notationFromCoords(move.row, move.col);
    if (move.promotion) {
      notation += `=${move.promotion.toUpperCase()}`;
    }
  }
  if (mate) {
    notation += "#";
  } else if (check) {
    notation += "+";
  }
  return notation;
}

function registerMove(notation, capture, color) {
  if (color === "w") {
    moveHistory.push({ move: fullmoveNumber, white: notation, black: "" });
  } else {
    const lastEntry = moveHistory[moveHistory.length - 1];
    if (lastEntry) {
      lastEntry.black = notation;
    }
    fullmoveNumber += 1;
  }
  renderMoveHistory();
}

function renderMoveHistory() {
  moveHistoryElement.innerHTML = "";
  moveHistory.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.move}. ${entry.white}${entry.black ? `  … ${entry.black}` : ""}`;
    moveHistoryElement.appendChild(li);
  });
  moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;
}

function renderBoard() {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const square = squareElements[row][col];
      square.innerHTML = "";
      const piece = boardState[row][col];
      if (piece) {
        const span = document.createElement("span");
        span.className = "piece";
        span.textContent = pieceSymbols[piece.color][piece.type];
        span.setAttribute(
          "aria-label",
          `${piece.color === "w" ? "Weiße" : "Schwarze"} ${pieceName(piece.type)}`
        );
        square.appendChild(span);
      }
    }
  }
}

function pieceName(type) {
  switch (type) {
    case "p":
      return "Bauer";
    case "n":
      return "Springer";
    case "b":
      return "Läufer";
    case "r":
      return "Turm";
    case "q":
      return "Dame";
    case "k":
      return "König";
    default:
      return "Figur";
  }
}

function isOnBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => clonePiece(piece)));
}

function clonePiece(piece) {
  return piece ? { ...piece } : null;
}

function isKingInCheck(board, color) {
  const kingPosition = findKing(board, color);
  if (!kingPosition) return false;
  const enemy = color === "w" ? "b" : "w";
  return isSquareAttacked(board, kingPosition.row, kingPosition.col, enemy);
}

function findKing(board, color) {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (piece && piece.type === "k" && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

function isSquareAttacked(board, row, col, attackerColor) {
  const pawnDirection = attackerColor === "w" ? -1 : 1;
  const pawnRow = row + pawnDirection;
  if (isOnBoard(pawnRow, col - 1)) {
    const piece = board[pawnRow][col - 1];
    if (piece && piece.color === attackerColor && piece.type === "p") {
      return true;
    }
  }
  if (isOnBoard(pawnRow, col + 1)) {
    const piece = board[pawnRow][col + 1];
    if (piece && piece.color === attackerColor && piece.type === "p") {
      return true;
    }
  }

  const knightOffsets = [
    { row: -2, col: -1 },
    { row: -2, col: 1 },
    { row: -1, col: -2 },
    { row: -1, col: 2 },
    { row: 1, col: -2 },
    { row: 1, col: 2 },
    { row: 2, col: -1 },
    { row: 2, col: 1 },
  ];
  if (
    knightOffsets.some(({ row: r, col: c }) => {
      const nr = row + r;
      const nc = col + c;
      if (!isOnBoard(nr, nc)) return false;
      const piece = board[nr][nc];
      return piece && piece.color === attackerColor && piece.type === "n";
    })
  ) {
    return true;
  }

  const rookDirs = directions.rook;
  if (isAttackedInDirections(board, row, col, attackerColor, rookDirs, ["r", "q"])) {
    return true;
  }

  const bishopDirs = directions.bishop;
  if (isAttackedInDirections(board, row, col, attackerColor, bishopDirs, ["b", "q"])) {
    return true;
  }

  for (let r = -1; r <= 1; r += 1) {
    for (let c = -1; c <= 1; c += 1) {
      if (r === 0 && c === 0) continue;
      const nr = row + r;
      const nc = col + c;
      if (!isOnBoard(nr, nc)) continue;
      const piece = board[nr][nc];
      if (piece && piece.color === attackerColor && piece.type === "k") {
        return true;
      }
    }
  }

  return false;
}

function isAttackedInDirections(board, row, col, attackerColor, dirs, validTypes) {
  return dirs.some((dir) => {
    let step = 1;
    while (true) {
      const nr = row + dir.row * step;
      const nc = col + dir.col * step;
      if (!isOnBoard(nr, nc)) return false;
      const piece = board[nr][nc];
      if (!piece) {
        step += 1;
        continue;
      }
      if (piece.color !== attackerColor) {
        return false;
      }
      return validTypes.includes(piece.type);
    }
  });
}

function playerHasMoves(board, color) {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const pseudoMoves = generatePseudoLegalMoves(row, col, piece);
        for (let i = 0; i < pseudoMoves.length; i += 1) {
          const simulatedBoard = applyMove(cloneBoard(board), { row, col }, pseudoMoves[i]);
          if (!isKingInCheck(simulatedBoard, color)) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function updateStatus(message) {
  statusBanner.textContent = message;
}

function notationFromCoords(row, col) {
  return "abcdefgh"[col] + (8 - row);
}

function showPromotionDialog(piece) {
  promotionDialog.classList.add("active");
  const color = piece.color;
  promotionButtons.forEach((button) => {
    const type = button.dataset.piece;
    const symbol = pieceSymbols[color][type];
    button.textContent = `${symbol} ${promotionLabel(type)}`;
  });
}

function promotionLabel(type) {
  switch (type) {
    case "q":
      return "Dame";
    case "r":
      return "Turm";
    case "b":
      return "Läufer";
    case "n":
      return "Springer";
    default:
      return "Figur";
  }
}

function handleResignation(color) {
  if (gameOver) return;
  gameOver = true;
  clearSelection();
  promotionDialog.classList.remove("active");
  pendingPromotion = null;
  const winner = color === "white" ? "black" : "white";
  updateStatus(`${color === "white" ? "Weiß" : "Schwarz"} gibt auf – ${
    winner === "white" ? "Weiß" : "Schwarz"
  } gewinnt.`);
  submitResult(winner);
}

function handleDrawOffer() {
  if (gameOver) return;
  gameOver = true;
  clearSelection();
  promotionDialog.classList.remove("active");
  pendingPromotion = null;
  updateStatus("Die Partie endet remis.");
  submitResult("draw");
}

function fetchStats() {
  fetch(statsEndpoint)
    .then((response) => response.json())
    .then((data) => updateStatsUI(data))
    .catch((error) => console.error("Fehler beim Laden der Statistik", error));
}

function submitResult(result) {
  fetch(statsEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ result }),
  })
    .then((response) => response.json())
    .then((data) => updateStatsUI(data))
    .catch((error) => console.error("Fehler beim Aktualisieren der Statistik", error));
}

function updateStatsUI(stats) {
  if (!stats) return;
  if (typeof stats.whiteWins === "number") {
    whiteWinsValue.textContent = stats.whiteWins;
  }
  if (typeof stats.blackWins === "number") {
    blackWinsValue.textContent = stats.blackWins;
  }
  if (typeof stats.draws === "number") {
    drawsValue.textContent = stats.draws;
  }
}

