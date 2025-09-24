const canvas = document.getElementById("snake-board");
const ctx = canvas.getContext("2d");
const scoreValue = document.getElementById("score-value");
const highScoreValue = document.getElementById("high-score-value");
const speedValue = document.getElementById("speed-value");
const statusBanner = document.getElementById("status-banner");
const resetButton = document.getElementById("reset-button");

const tileSize = 20;
const tilesX = canvas.width / tileSize;
const tilesY = canvas.height / tileSize;
const highScoreEndpoint = "/api/high-score";

let snake = [];
let direction = { x: 1, y: 0 };
let queuedDirection = { x: 1, y: 0 };
let food = { x: 10, y: 10 };
let score = 0;
let loopDelay = 140;
let loopTimeout = null;
let paused = false;
let gameOver = false;

function init() {
  resetButton.addEventListener("click", resetGame);
  document.addEventListener("keydown", handleKeyDown);
  fetchHighScore();
  resetGame();
}

document.addEventListener("DOMContentLoaded", init);

function fetchHighScore() {
  fetch(highScoreEndpoint)
    .then((response) => response.json())
    .then((data) => {
      if (typeof data.highScore === "number") {
        highScoreValue.textContent = data.highScore;
      }
    })
    .catch((error) => console.error("Fehler beim Laden des Highscores", error));
}

function resetGame() {
  clearTimeout(loopTimeout);
  snake = [
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  queuedDirection = { x: 1, y: 0 };
  score = 0;
  loopDelay = 140;
  paused = false;
  gameOver = false;
  updateStatus("Los geht's – viel Erfolg!");
  updateScore();
  updateSpeed();
  placeFood();
  draw();
  gameLoop();
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();

  if (key === " " || key === "spacebar") {
    togglePause();
    event.preventDefault();
    return;
  }

  const newDirection = { ...direction };

  switch (key) {
    case "arrowup":
    case "w":
      newDirection.x = 0;
      newDirection.y = -1;
      break;
    case "arrowdown":
    case "s":
      newDirection.x = 0;
      newDirection.y = 1;
      break;
    case "arrowleft":
    case "a":
      newDirection.x = -1;
      newDirection.y = 0;
      break;
    case "arrowright":
    case "d":
      newDirection.x = 1;
      newDirection.y = 0;
      break;
    default:
      return;
  }

  if (
    newDirection.x === -direction.x &&
    newDirection.y === -direction.y &&
    snake.length > 1
  ) {
    return;
  }

  queuedDirection = newDirection;
}

function togglePause() {
  if (gameOver) {
    return;
  }

  paused = !paused;
  updateStatus(paused ? "Pausiert" : "Weiter geht's!");
  if (!paused) {
    gameLoop();
  } else {
    clearTimeout(loopTimeout);
  }
}

function gameLoop() {
  if (paused || gameOver) {
    return;
  }

  loopTimeout = setTimeout(() => {
    direction = { ...queuedDirection };
    const nextHead = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y,
    };

    const willEat = nextHead.x === food.x && nextHead.y === food.y;

    if (detectCollision(nextHead, willEat)) {
      endGame();
      return;
    }

    snake.unshift(nextHead);

    if (willEat) {
      score += 10;
      updateScore();
      accelerate();
      placeFood();
    } else {
      snake.pop();
    }

    draw();
    gameLoop();
  }, loopDelay);
}

function detectCollision(position, willEat) {
  const outsideField =
    position.x < 0 ||
    position.x >= tilesX ||
    position.y < 0 ||
    position.y >= tilesY;

  if (outsideField) {
    return true;
  }

  return snake.some((segment, index) => {
    const isTail = index === snake.length - 1;
    if (!willEat && isTail) {
      return false;
    }

    return segment.x === position.x && segment.y === position.y;
  });
}

function endGame() {
  gameOver = true;
  paused = true;
  clearTimeout(loopTimeout);
  updateStatus("Game Over – versuch es nochmal!");
  submitScore();
}

function submitScore() {
  fetch(highScoreEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ score }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (typeof data.highScore === "number") {
        highScoreValue.textContent = data.highScore;
      }
    })
    .catch((error) => console.error("Fehler beim Aktualisieren des Highscores", error));
}

function accelerate() {
  loopDelay = Math.max(70, loopDelay - 4);
  updateSpeed();
}

function updateScore() {
  scoreValue.textContent = score;
}

function updateSpeed() {
  const stepsPerSecond = (1000 / loopDelay).toFixed(2);
  speedValue.textContent = `${stepsPerSecond} Felder/s`;
}

function updateStatus(message) {
  statusBanner.textContent = message;
}

function placeFood() {
  let newFood;
  do {
    newFood = {
      x: Math.floor(Math.random() * tilesX),
      y: Math.floor(Math.random() * tilesY),
    };
  } while (snake.some((segment) => segment.x === newFood.x && segment.y === newFood.y));

  food = newFood;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawSnake();
  drawFood();
}

function drawGrid() {
  ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
  for (let x = tileSize; x < canvas.width; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = tileSize; y < canvas.height; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const gradient = ctx.createLinearGradient(
      segment.x * tileSize,
      segment.y * tileSize,
      (segment.x + 1) * tileSize,
      (segment.y + 1) * tileSize
    );

    if (index === 0) {
      gradient.addColorStop(0, "#38bdf8");
      gradient.addColorStop(1, "#0ea5e9");
    } else {
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.9)");
      gradient.addColorStop(1, "rgba(56, 189, 248, 0.75)");
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(segment.x * tileSize, segment.y * tileSize, tileSize, tileSize);

    ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
    ctx.strokeRect(segment.x * tileSize, segment.y * tileSize, tileSize, tileSize);
  });
}

function drawFood() {
  const centerX = food.x * tileSize + tileSize / 2;
  const centerY = food.y * tileSize + tileSize / 2;
  const radius = tileSize / 2.8;

  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.3,
    centerX,
    centerY,
    radius
  );
  gradient.addColorStop(0, "#f97316");
  gradient.addColorStop(1, "#c2410c");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(centerX - 3, centerY - 3, radius / 3, 0, Math.PI * 2);
  ctx.fill();
}
