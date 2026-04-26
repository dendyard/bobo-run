const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hpBar = document.getElementById("hpBar");
const scoreEl = document.getElementById("score");
const waveEl = document.getElementById("wave");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const endTitle = document.getElementById("endTitle");
const statCoins = document.getElementById("statCoins");
const statMonsters = document.getElementById("statMonsters");
const statScore = document.getElementById("statScore");

const W = 720;
const H = 1280;
const gravity = 2100;
const groundY = 788;
const autoRunSpeed = 255;
const levelFile = "levels/level-1.json";
const defaultTileW = 180;
const bulletDamage = 18;
const keys = new Set();
const music = new Audio("assets/jungle-dash.mp3");
music.loop = true;
music.volume = 0.42;

const assets = {
  pose: loadImage("assets/ChatGPT Image Apr 25, 2026, 09_03_46 PM.png"),
  shoot: loadImage("assets/bobotembak.png"),
  run: loadImage("assets/rabbit-run-spritesheet.png"),
  idle: loadImage("assets/rabbit-idle-spritesheet.png"),
  background: loadImage("assets/mobile-background.png"),
  land: loadImage("assets/land-platform.png"),
  tree: loadImage("assets/pohon.png"),
  coin: loadImage("assets/koin.png")
};

const runFrames = [
  { sx: 0, sy: 0, sw: 500, sh: 500 },
  { sx: 500, sy: 0, sw: 500, sh: 500 },
  { sx: 1000, sy: 0, sw: 500, sh: 500 },
  { sx: 1500, sy: 0, sw: 500, sh: 500 },
  { sx: 2000, sy: 0, sw: 500, sh: 500 },
  { sx: 2500, sy: 0, sw: 500, sh: 500 }
];

const idleFrames = [
  { sx: 0, sy: 0, sw: 500, sh: 500 },
  { sx: 500, sy: 0, sw: 500, sh: 500 },
  { sx: 1000, sy: 0, sw: 500, sh: 500 },
  { sx: 1500, sy: 0, sw: 500, sh: 500 }
];

const shootFrames = [
  { sx: 0, sy: 0, sw: 500, sh: 500 },
  { sx: 500, sy: 0, sw: 500, sh: 500 },
  { sx: 1000, sy: 0, sw: 500, sh: 500 }
];

let last = performance.now();
let paused = true;
let gameOver = false;
let started = false;
let camera = 0;
let score = 0;
let coinsCollected = 0;
let monstersDefeated = 0;
let shotsFired = 0;
let elapsedTime = 0;
let wave = 1;
let spawnTimer = 0;
let shake = 0;
let levelReady = false;
let pendingLevelStart = false;
let levelObjects = [];
let monsterSpawns = [];

const world = {
  width: 30000,
  platforms: [],
  coins: []
};

const player = {
  x: 120,
  y: groundY - 104,
  w: 78,
  h: 104,
  vx: 0,
  vy: 0,
  dir: 1,
  hp: 100,
  maxHp: 100,
  grounded: false,
  shootCooldown: 0,
  invuln: 0,
  anim: 0
};

let bullets = [];
let drops = [];
let enemies = [];
let particles = [];

applyLevel(createLevelFromCodes(defaultLevelCodes()));
loadLevelFile(levelFile);

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

async function loadLevelFile(src) {
  try {
    const response = await fetch(src, { cache: "no-store" });
    if (!response.ok) throw new Error(`Level gagal dimuat: ${response.status}`);
    const text = await response.text();
    applyLevel(parseLevelData(text));
  } catch (error) {
    console.warn("Memakai level bawaan karena file level tidak bisa dibaca.", error);
  } finally {
    levelReady = true;
    if (pendingLevelStart) {
      pendingLevelStart = false;
      resetGame();
    }
  }
}

function parseLevelData(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return createLevelFromConfig(JSON.parse(trimmed));
  }
  return parseLevelText(text);
}

function parseLevelText(text) {
  const codes = text
    .split(/\r?\n/)
    .map(line => line.replace(/#.*/, ""))
    .join(",")
    .split(/[\s,;]+/)
    .map(value => value.trim())
    .filter(Boolean)
    .map(Number);

  if (!codes.length || codes.some(code => ![0, 1, 2, 3].includes(code))) {
    throw new Error("File level hanya boleh berisi kode 0, 1, 2, dan 3.");
  }

  return createLevelFromCodes(codes);
}

function defaultLevelCodes() {
  return [
    0, 0, 1, 0, 2, 0, 0, 3, 0, 1, 0, 2,
    0, 0, 3, 0, 0, 1, 2, 0, 0, 3, 0, 1,
    0, 2, 0, 0, 3, 0, 1, 0, 0, 2, 0, 3
  ];
}

function applyLevel(level) {
  world.width = level.width;
  world.platforms = level.platforms;
  world.coins = level.coins;
  levelObjects = level.objects;
  monsterSpawns = level.monsterSpawns;
}

function setOverlayContent(title, text, showLogo = false) {
  overlay.querySelector("h1").textContent = title;
  overlay.querySelector("p").textContent = text;
  overlay.classList.toggle("show-logo", showLogo);
  overlay.classList.remove("end-mode");
}

function resetGame() {
  if (!levelReady) {
    pendingLevelStart = true;
    setOverlayContent("Memuat Level", "Game sedang membaca file level.");
    startBtn.textContent = "Tunggu";
    return;
  }
  started = true;
  player.x = 120;
  player.y = groundY - player.h;
  player.vx = 0;
  player.vy = 0;
  player.dir = 1;
  player.hp = player.maxHp;
  player.invuln = 0;
  player.shootCooldown = 0;
  player.anim = 0;
  bullets = [];
  drops = [];
  enemies = createInitialEnemies();
  particles = [];
  world.coins.forEach(coin => {
    coin.collected = false;
    coin.spin = 0;
  });
  score = 0;
  coinsCollected = 0;
  monstersDefeated = 0;
  shotsFired = 0;
  elapsedTime = 0;
  wave = 1;
  spawnTimer = 1.15;
  camera = 0;
  shake = 0;
  gameOver = false;
  paused = false;
  pauseBtn.textContent = "II";
  overlay.classList.add("hidden");
  playMusic();
}

function playMusic() {
  music.play().catch(() => {});
}

function createLevelFromConfig(config) {
  const tileWidth = Number(config.tileWidth) || defaultTileW;
  const legend = config.legend || {};
  const cells = flattenLevelRows(config.rows || []);
  if (!cells.length) throw new Error("Level JSON harus punya rows.");

  const normalizedCells = cells.map(symbol => {
    const cell = legend[symbol];
    if (!cell) throw new Error(`Kode level "${symbol}" belum ada di legend.`);
    return {
      terrain: cell.terrain || "ground",
      decoration: cell.decoration || null,
      obstacle: cell.obstacle || null,
      spawn: cell.spawn || null,
      item: cell.item || null,
      coinPattern: cell.coinPattern || null,
      stairSteps: cell.stairSteps || null
    };
  });

  const level = createLevelFromCells(normalizedCells, tileWidth);
  (config.entities || []).forEach(entity => addLevelEntity(level, entity, tileWidth));
  return level;
}

function flattenLevelRows(rows) {
  return rows.flatMap(row => {
    if (Array.isArray(row)) return row.map(String);
    return String(row).trim().split(/\s+/).filter(Boolean);
  });
}

function createLevelFromCodes(codes) {
  return createLevelFromCells(
    codes.map(code => ({
      terrain: "ground",
      decoration: code === 1 ? "tree" : null,
      obstacle: code === 2 ? "block" : null,
      spawn: code === 3 ? "monster" : null,
      item: null,
      coinPattern: null,
      stairSteps: null
    })),
    defaultTileW
  );
}

function createLevelFromCells(cells, tileWidth) {
  const platforms = [];
  const objects = [];
  const monsterSpawns = [];
  const extraCoins = [];

  cells.forEach((cell, index) => {
    const x = index * tileWidth;
    if (cell.terrain === "ground") {
      platforms.push({ x, y: groundY, w: tileWidth, h: H - groundY });
    }

    if (cell.decoration === "tree") {
      objects.push({ type: "tree", x: x + tileWidth / 2 });
    }

    if (cell.obstacle === "block") {
      platforms.push({
        x: x + 32,
        y: groundY - 74,
        w: tileWidth - 64,
        h: 74
      });
    }

    if (cell.obstacle === "stairs-up") {
      addStairPlatforms(platforms, x, tileWidth, 1, cell.stairSteps);
    }

    if (cell.obstacle === "stairs-down") {
      addStairPlatforms(platforms, x, tileWidth, -1, cell.stairSteps);
    }

    if (cell.obstacle === "stairs-peak") {
      addPeakStairPlatforms(platforms, x, tileWidth, cell.stairSteps);
    }

    if (cell.spawn === "monster") {
      monsterSpawns.push({ x: x + tileWidth * 0.42, used: false });
    }

    if (cell.item === "coin" || cell.coinPattern) {
      addCoinPattern(extraCoins, cell.coinPattern || "line3-ground", x, tileWidth);
    }
  });

  return {
    width: Math.max(W + 400, cells.length * tileWidth),
    platforms,
    objects,
    monsterSpawns,
    coins: extraCoins
  };
}

function addStairPlatforms(platforms, x, tileWidth, direction, steps = 3) {
  const count = clamp(Math.round(Number(steps) || 3), 2, 5);
  const stepW = tileWidth / count;
  const stepH = 38;
  for (let i = 0; i < count; i++) {
    const level = direction > 0 ? i + 1 : count - i;
    const h = stepH * level;
    platforms.push({
      x: x + i * stepW,
      y: groundY - h,
      w: stepW + 2,
      h
    });
  }
}

function addPeakStairPlatforms(platforms, x, tileWidth, steps = 5) {
  const count = clamp(Math.round(Number(steps) || 5), 3, 5);
  const stepW = tileWidth / count;
  const stepH = 36;
  const peak = Math.ceil(count / 2);
  for (let i = 0; i < count; i++) {
    const level = i < peak ? i + 1 : count - i;
    const h = stepH * level;
    platforms.push({
      x: x + i * stepW,
      y: groundY - h,
      w: stepW + 2,
      h
    });
  }
}

function addLevelEntity(level, entity, tileWidth) {
  const entityX = Number(entity.x);
  const entityTile = Number(entity.tile);
  const x = Number.isFinite(entityX) ? entityX : entityTile * tileWidth + tileWidth * 0.42;
  if (!Number.isFinite(x)) return;
  if (entity.type === "monster") {
    level.monsterSpawns.push({ x, used: false, variant: entity.variant || "walker" });
  }
}

function addStairObstacle(platforms, startX) {
  const blockW = 94;
  const blockH = 42;
  const count = 3;
  for (let i = 0; i < count; i++) {
    const h = blockH * (i + 1);
    platforms.push({
      x: startX + i * blockW,
      y: groundY - h,
      w: blockW,
      h
    });
  }
  for (let i = 1; i < count; i++) {
    const h = blockH * (count - i);
    platforms.push({
      x: startX + (count + i - 1) * blockW,
      y: groundY - h,
      w: blockW,
      h
    });
  }
}

function createCoins(platforms) {
  const coins = [];
  platforms
    .filter(platform => platform.y === groundY)
    .forEach((platform, index) => {
      if (index === 0) {
        addCoinArc(coins, platform.x + 520, groundY - 150, 5, 44, 42);
      } else {
        addCoinArc(coins, platform.x + 150, groundY - 188, 5, 42, 46);
        if (index % 2 === 0) addCoinArc(coins, platform.x + platform.w * 0.55, groundY - 132, 4, 42, 28);
      }
    });
  return coins;
}

function addCoinPattern(coins, pattern, tileX, tileWidth) {
  const centerX = tileX + tileWidth / 2;
  if (pattern === "line3-ground") {
    addCoinLine(coins, centerX, groundY - 92, 3, 42);
  } else if (pattern === "line4-jump") {
    addCoinLine(coins, centerX, groundY - 218, 4, 42);
  } else if (pattern === "line6-ground") {
    addCoinLine(coins, centerX, groundY - 96, 6, 38);
  } else if (pattern === "arc6-jump") {
    addCoinArc(coins, centerX - 105, groundY - 190, 6, 42, 58);
  }
}

function addCoinLine(coins, centerX, y, count, spacing) {
  const startX = centerX - ((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i++) {
    addCoin(coins, startX + i * spacing, y);
  }
}

function addCoinArc(coins, startX, baseY, count, spacing, lift) {
  for (let i = 0; i < count; i++) {
    const center = (count - 1) / 2;
    addCoin(coins, startX + i * spacing, baseY - lift * Math.max(0, 1 - Math.abs(i - center) / (center + 0.01)));
  }
}

function addCoin(coins, x, y) {
  coins.push({
    x,
    y,
    r: 14,
    spin: 0,
    collected: false
  });
}

function spawnEnemy(x = camera + W + 80, forcedType = null) {
  const type = forcedType || (Math.random() < 0.82 ? "walker" : "spitter");
  const hp = type === "walker" ? bulletDamage : bulletDamage * 2;
  const h = type === "walker" ? 86 : 104;
  enemies.push({
    type,
    x,
    y: groundY - h,
    w: type === "walker" ? 70 : 88,
    h,
    vx: -(82 + wave * 12 + Math.random() * 35),
    hp,
    maxHp: hp,
    attack: 0.6 + Math.random() * 1.2,
    grounded: false,
    phase: Math.random() * 10
  });
}

function shoot() {
  if (player.shootCooldown > 0 || paused || gameOver) return;
  player.shootCooldown = 0.24;
  shotsFired++;
  const muzzleX = player.x + (player.dir > 0 ? 78 : -8);
  const muzzleY = player.y + 48;
  bullets.push({
    x: muzzleX,
    y: muzzleY,
    vx: player.dir * 680,
    life: 0.95,
    r: 8
  });
  for (let i = 0; i < 9; i++) {
    particles.push({
      x: muzzleX,
      y: muzzleY,
      vx: player.dir * (220 + Math.random() * 240),
      vy: -90 + Math.random() * 180,
      life: 0.18 + Math.random() * 0.18,
      max: 0.36,
      color: Math.random() < 0.55 ? "#83f1ff" : "#1ab7ff",
      size: 2 + Math.random() * 5
    });
  }
}

function update(dt) {
  if (paused) return;

  if (gameOver) {
    particles.forEach(p => p.life -= dt);
    particles = particles.filter(p => p.life > 0);
    return;
  }

  const speed = autoRunSpeed + Math.min(75, wave * 7);
  elapsedTime += dt;
  player.vx = speed;
  player.dir = 1;
  if (shouldAutoShoot()) shoot();

  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  player.anim += dt * 9;
  player.vy += gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = clamp(player.x, 12, world.width - player.w - 40);
  collideWithPlatforms(player);

  if (player.y > H + 260) damagePlayer(100);
  if (player.x >= world.width - player.w - 70) completeLevel();

  camera = clamp(player.x - W * 0.28, 0, world.width - W);
  spawnLevelMonsters();
  if (!monsterSpawns.length) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = Math.max(1.25, 2.35 - wave * 0.06) + Math.random() * 1.15;
    }
  }
  wave = 1 + Math.floor(score / 700);
  score += dt * speed * 0.06;

  bullets.forEach(b => {
    b.x += b.vx * dt;
    b.life -= dt;
    b.y += Math.sin((b.life + b.x) * 0.08) * 0.8;
  });

  drops.forEach(d => {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vy += gravity * 0.18 * dt;
    d.life -= dt;
    if (rectsOverlap(d.x - 9, d.y - 9, 18, 18, player.x, player.y, player.w, player.h)) {
      d.life = 0;
      damagePlayer(9);
    }
  });

  world.coins.forEach(coin => {
    if (coin.collected) return;
    coin.spin += dt * 8;
    if (rectsOverlap(player.x + 8, player.y + 8, player.w - 16, player.h - 16, coin.x - coin.r, coin.y - coin.r, coin.r * 2, coin.r * 2)) {
      coin.collected = true;
      coinsCollected++;
      score += 25;
      splash(coin.x, coin.y, 10, "#ffd84d");
    }
  });

  enemies.forEach(enemy => {
    enemy.phase += dt;
    enemy.vy = (enemy.vy || 0) + gravity * dt;
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    collideWithPlatforms(enemy);
    if (enemy.grounded) enemy.y = groundY - enemy.h;
    if (enemy.x < camera - 220) enemy.hp = 0;

    enemy.attack -= dt;
    if (enemy.type === "spitter" && enemy.attack <= 0 && Math.abs(enemy.x - player.x) < 760) {
      enemy.attack = Math.max(0.8, 2.1 - wave * 0.06);
      const angle = Math.atan2(player.y + 38 - enemy.y, player.x - enemy.x);
      drops.push({
        x: enemy.x + 20,
        y: enemy.y + 32,
        vx: Math.cos(angle) * 260,
        vy: Math.sin(angle) * 260,
        life: 3
      });
    }

    if (rectsOverlap(player.x + 10, player.y + 8, player.w - 20, player.h - 14, enemy.x, enemy.y, enemy.w, enemy.h)) {
      damagePlayer(enemy.type === "spitter" ? 15 : 12);
      player.vx = -player.dir * 180;
    }
  });

  bullets.forEach(b => {
    enemies.forEach(enemy => {
      if (enemy.hp > 0 && rectsOverlap(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, enemy.x, enemy.y, enemy.w, enemy.h)) {
        enemy.hp -= bulletDamage;
        b.life = 0;
        shake = 5;
        splash(b.x, b.y, 16);
      }
    });
  });

  enemies = enemies.filter(enemy => {
    if (enemy.hp > 0) return true;
    if (enemy.x > camera - 200) {
      monstersDefeated++;
      score += 110;
    }
    splash(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 28, "#7df36f");
    return false;
  });

  bullets = bullets.filter(b => b.life > 0 && b.x > camera - 80 && b.x < camera + W + 120);
  drops = drops.filter(d => d.life > 0 && d.x > camera - 100 && d.x < camera + W + 100);
  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 520 * dt;
    p.life -= dt;
  });
  particles = particles.filter(p => p.life > 0);
  shake = Math.max(0, shake - dt * 18);

  hpBar.style.transform = `scaleX(${Math.max(0, player.hp / player.maxHp)})`;
  scoreEl.textContent = String(Math.floor(score));
  waveEl.textContent = String(wave);
}

function shouldAutoShoot() {
  return enemies.some(enemy => {
    const distance = enemy.x - player.x;
    return enemy.hp > 0 && distance > 40 && distance < 700 && Math.abs(enemy.y - player.y) < 160;
  });
}

function createInitialEnemies() {
  monsterSpawns.forEach(spawn => {
    spawn.used = false;
  });
  return [];
}

function spawnLevelMonsters() {
  monsterSpawns.forEach(spawn => {
    if (spawn.used) return;
    if (spawn.x > player.x + 130 && spawn.x < camera + W + 180) {
      spawnEnemy(spawn.x, spawn.variant);
      spawn.used = true;
    }
  });
}

function jump() {
  if (paused || gameOver) return;
  if (player.grounded) {
    player.vy = -820;
    player.grounded = false;
    splash(player.x + 24, player.y + player.h, 10, "#d7fff2");
  }
}

function damagePlayer(amount) {
  if (player.invuln > 0 || gameOver) return;
  player.hp -= amount;
  player.invuln = 0.82;
  shake = 12;
  splash(player.x + player.w / 2, player.y + player.h / 2, 22, "#ff6c6c");
  if (player.hp <= 0) {
    player.hp = 0;
    gameOver = true;
    paused = true;
    showEndGamePanel("End Game!");
    startBtn.textContent = "Main Lagi";
    overlay.classList.remove("hidden");
    music.pause();
  }
}

function completeLevel() {
  if (gameOver) return;
  gameOver = true;
  paused = true;
  score += Math.max(0, Math.floor(player.hp)) * 4;
  showEndGamePanel("Berhasil!");
  startBtn.textContent = "Main Lagi";
  overlay.classList.remove("hidden");
  music.pause();
}

function showEndGamePanel(title) {
  const totalCoins = world.coins.length;
  endTitle.textContent = title;
  statCoins.textContent = `${coinsCollected}/${totalCoins}`;
  statMonsters.textContent = String(monstersDefeated);
  statScore.textContent = String(Math.floor(score));
  overlay.classList.remove("show-logo");
  overlay.classList.add("end-mode");
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function collideWithPlatforms(actor) {
  actor.grounded = false;
  for (const p of world.platforms) {
    if (!rectsOverlap(actor.x, actor.y, actor.w, actor.h, p.x, p.y, p.w, p.h)) continue;
    const wasAbove = actor.y + actor.h - actor.vy * (1 / 60) <= p.y + 12;
    if (wasAbove && actor.vy >= 0) {
      actor.y = p.y - actor.h;
      actor.vy = 0;
      actor.grounded = true;
    } else if (actor.x + actor.w / 2 < p.x + p.w / 2) {
      actor.x = p.x - actor.w;
      actor.vx = Math.min(0, actor.vx);
    } else {
      actor.x = p.x + p.w;
      actor.vx = Math.max(0, actor.vx);
    }
  }
}

function splash(x, y, amount, color = "#38dfff") {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x,
      y,
      vx: -260 + Math.random() * 520,
      vy: -260 + Math.random() * 270,
      life: 0.22 + Math.random() * 0.35,
      max: 0.58,
      color,
      size: 2 + Math.random() * 6
    });
  }
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  drawBackground();
  ctx.save();
  ctx.translate(-camera, 0);
  drawRoadTrees();
  drawPlatforms();
  drawFinishLine();
  drawCoins();
  enemies.forEach(drawEnemy);
  drops.forEach(drawDrop);
  bullets.forEach(drawBullet);
  drawPlayer();
  particles.forEach(drawParticle);
  ctx.restore();

  drawVignette();
  ctx.restore();
}

function drawBackground() {
  ctx.fillStyle = "#35bff7";
  ctx.fillRect(0, 0, W, H);
  if (assets.background.complete && assets.background.naturalWidth > 0) {
    drawCoverImage(assets.background, 0, 0, W, H);
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillRect(0, 0, W, H);
}

function drawRoadTrees() {
  if (!assets.tree.complete || assets.tree.naturalWidth <= 0) return;
  const treeH = 400;
  const treeW = treeH * assets.tree.naturalWidth / assets.tree.naturalHeight;
  levelObjects
    .filter(object => object.type === "tree")
    .forEach(object => {
      if (object.x < camera - treeW || object.x > camera + W + treeW) return;
      ctx.drawImage(assets.tree, object.x - treeW / 2, groundY - treeH + 8, treeW, treeH);
    });
}

function drawCoverImage(image, x, y, w, h) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (image.naturalWidth - sw) * 0.52;
  const sy = (image.naturalHeight - sh) * 0.3;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

function drawPlatforms() {
  world.platforms.forEach(p => {
    if (assets.land.complete && assets.land.naturalWidth > 0) {
      drawLandPlatform(p);
    } else {
      ctx.fillStyle = "#7ac943";
      ctx.fillRect(p.x, p.y, p.w, 18);
      ctx.fillStyle = "#7b421b";
      ctx.fillRect(p.x, p.y + 18, p.w, p.h - 18);
    }
  });
}

function drawFinishLine() {
  const x = world.width - 112;
  if (x < camera - 80 || x > camera + W + 140) return;
  ctx.save();
  ctx.fillStyle = "#3c2413";
  ctx.fillRect(x, groundY - 190, 12, 190);
  ctx.fillStyle = "#27d7ff";
  ctx.beginPath();
  ctx.moveTo(x + 12, groundY - 184);
  ctx.lineTo(x + 108, groundY - 154);
  ctx.lineTo(x + 12, groundY - 124);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff36b";
  ctx.fillRect(x + 30, groundY - 166, 18, 18);
  ctx.fillRect(x + 66, groundY - 154, 18, 18);
  ctx.restore();
}

function drawLandPlatform(platform) {
  const scale = platform.h / assets.land.naturalHeight;
  const tileW = assets.land.naturalWidth * scale;
  const startX = platform.x - ((platform.x % tileW) + tileW) % tileW;
  ctx.save();
  ctx.beginPath();
  ctx.rect(platform.x, platform.y, platform.w, platform.h);
  ctx.clip();
  for (let x = startX; x < platform.x + platform.w; x += tileW) {
    ctx.drawImage(assets.land, x, platform.y, tileW, platform.h);
  }
  ctx.restore();
}

function drawCoins() {
  world.coins.forEach(coin => {
    if (coin.collected || coin.x < camera - 60 || coin.x > camera + W + 60) return;
    const pulse = Math.sin(coin.spin) * 0.18;
    ctx.save();
    ctx.translate(coin.x, coin.y);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
    glow.addColorStop(0, "rgba(255, 252, 172, 0.75)");
    glow.addColorStop(1, "rgba(255, 200, 38, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    if (assets.coin.complete && assets.coin.naturalWidth > 0) {
      const size = coin.r * 2.55;
      ctx.scale(0.94 + pulse, 1);
      ctx.drawImage(assets.coin, -size / 2, -size / 2, size, size);
    } else {
      ctx.scale(0.78 + pulse, 1);
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath();
      ctx.arc(0, 0, coin.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#a86412";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#fff1a6";
      ctx.beginPath();
      ctx.arc(-4, -5, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawPlayer() {
  const firing = player.shootCooldown > 0.03;
  const running = started && !paused && !gameOver;
  const bob = Math.sin(player.anim) * (running ? 4 : 1);
  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2 + bob);
  ctx.scale(player.dir, 1);
  if (player.invuln > 0 && Math.floor(player.invuln * 18) % 2 === 0) ctx.globalAlpha = 0.45;

  const image = getPlayerImage(firing, running);
  if (image.complete && image.naturalWidth > 0) {
    const frame = getPlayerFrame(firing, running);
    const draw = getPlayerDrawBox(firing, running);
    ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, draw.x, draw.y, draw.w, draw.h);
  } else {
    drawFallbackRabbit();
  }

  if (firing) {
    ctx.fillStyle = "rgba(116, 234, 255, 0.42)";
    ctx.beginPath();
    ctx.ellipse(88, -10, 52, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function getPlayerImage(firing, running) {
  if (firing) return assets.shoot;
  if (running && assets.run.complete) return assets.run;
  if (assets.idle.complete) return assets.idle;
  return assets.pose;
}

function getPlayerFrame(firing, running) {
  if (firing && assets.shoot.complete) {
    return player.shootCooldown > 0.07 ? shootFrames[1] : shootFrames[2];
  }
  if (running && assets.run.complete) {
    return runFrames[Math.floor(player.anim * 1.15) % runFrames.length];
  }
  if (assets.idle.complete) {
    return idleFrames[Math.floor(player.anim * 0.75) % idleFrames.length];
  }
  const fallbackFrame = Math.floor(player.anim / 1.8) % 2;
  return fallbackFrame === 0
    ? { sx: 540, sy: 136, sw: 420, sh: 440 }
    : { sx: 116, sy: 760, sw: 405, sh: 440 };
}

function getPlayerDrawBox(firing, running) {
  if (firing && assets.shoot.complete) return { x: -78, y: -82, w: 164, h: 164 };
  if (running && !firing) return { x: -78, y: -82, w: 164, h: 164 };
  if (!firing && assets.idle.complete) return { x: -70, y: -85, w: 150, h: 150 };
  return { x: -76, y: -72, w: 166, h: 138 };
}

function drawFallbackRabbit() {
  ctx.fillStyle = "#37b9ff";
  roundedRect(-30, -48, 62, 78, 24);
  ctx.fill();
  ctx.fillStyle = "#46d353";
  ctx.fillRect(-28, -66, 54, 18);
  ctx.fillStyle = "#ff3131";
  ctx.fillRect(-34, -14, 70, 34);
}

function drawEnemy(enemy) {
  const sway = Math.sin(enemy.phase * 5) * 4;
  ctx.save();
  ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
  ctx.fillStyle = "#1d6f3c";
  roundedRect(-enemy.w / 2 + sway, -enemy.h / 2 + 20, enemy.w, enemy.h - 20, 24);
  ctx.fill();
  ctx.fillStyle = "#2db956";
  ctx.beginPath();
  ctx.ellipse(0, -20, enemy.w * 0.48, enemy.h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffcf4a";
  ctx.beginPath();
  ctx.arc(-16, -26, 7, 0, Math.PI * 2);
  ctx.arc(16, -26, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0b2c1e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-22, -4);
  ctx.quadraticCurveTo(0, 10, 24, -4);
  ctx.stroke();
  ctx.fillStyle = "#6ee774";
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i - 2) * 0.42 + sway * 0.02);
    ctx.beginPath();
    ctx.ellipse(0, -48, 12, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#a6ff6e";
  ctx.fillRect(-enemy.w / 2, -enemy.h / 2 - 14, enemy.w * Math.max(0, enemy.hp / enemy.maxHp), 5);
  ctx.restore();
}

function drawBullet(b) {
  const glow = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, 22);
  glow.addColorStop(0, "#f1ffff");
  glow.addColorStop(0.36, "#48deff");
  glow.addColorStop(1, "rgba(42, 179, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#caffff";
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawDrop(d) {
  ctx.fillStyle = "#a9f6ff";
  ctx.beginPath();
  ctx.arc(d.x, d.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2aa8d5";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawParticle(p) {
  ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawVignette() {
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, W * 0.72);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.46)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

function roundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  if (["arrowup", " ", "w", "p"].includes(key)) {
    event.preventDefault();
  }
  keys.add(key);
  if (key === "arrowup" || key === "w" || key === " ") jump();
  if (key === "p") togglePause();
});

window.addEventListener("keyup", event => {
  keys.delete(event.key.toLowerCase());
});

document.querySelectorAll("[data-tap]").forEach(button => {
  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (button.dataset.tap === "jump") jump();
  });
});

canvas.addEventListener("pointerdown", event => {
  event.preventDefault();
  jump();
});

startBtn.addEventListener("click", () => {
  if (started && paused && !gameOver && startBtn.textContent === "Lanjut") {
    paused = false;
    pauseBtn.textContent = "II";
    overlay.classList.add("hidden");
    playMusic();
    return;
  }
  setOverlayContent("Bobo Contra", "Bobo berlari otomatis. Tap layar atau tekan panah atas untuk lompat.", true);
  startBtn.textContent = "Mulai";
  resetGame();
});

pauseBtn.addEventListener("click", togglePause);

function togglePause() {
  if (gameOver) return;
  if (!started) {
    resetGame();
    return;
  }
  paused = !paused;
  pauseBtn.textContent = paused ? "▶" : "II";
  if (paused) {
    music.pause();
    setOverlayContent("Pause", "Bobo siap lari lagi. Tap lanjut untuk kembali.");
    startBtn.textContent = "Lanjut";
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
    playMusic();
  }
}

for (let i = 0; i < 2; i++) spawnEnemy(980 + i * 760);
requestAnimationFrame(loop);
