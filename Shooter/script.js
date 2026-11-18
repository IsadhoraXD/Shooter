const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreE1 = document.getElementById("score");
const livesE1 = document.getElementById("lives");
const wavesE1 = document.getElementById("wave");

const KEYS = {};

const NORMAL_COOLDOWN = 0.22;
const SPECIAL_COOLDOWN = 2.0;

// Carregamento dos sprites na pasta "Mídias"
function loadSprite(path) {
    const img = new Image();
    img.src = path;
    return img;
}

const SPRITES = {
    player: loadSprite("Mídias/nave.png"),
    basic: loadSprite("Mídias/inimigo_basico.png"),
    medium: loadSprite("Mídias/inimigo_medio.png"),
    hard: loadSprite("Mídias/inimigo_dificil.png"),
    boss: loadSprite("Mídias/chefao.png")
};

// Desenha o sprite centralizado sobre a hitbox sem esticar a imagem
function drawSpriteCentered(img, x, y, w, h, flash = false) {
    if (!img || !img.complete || img.naturalWidth === 0) {
        return false; // Retorna false para desenhar o bloquinho de reserva
    }

    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const drawX = x + (w - drawW) / 2;
    const drawY = y + (h - drawH) / 2;

    ctx.save();
    if (flash) {
        ctx.filter = "brightness(3)";
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
    return true;
}

window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    KEYS[key] = true;

    if ([" ", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
        e.preventDefault();
    }

    if (key === "p" && !gameOver && !victory) {
        pause = !pause;
    }

    if (key === "r" && (gameOver || victory)) {
        startGame();
    }
});

window.addEventListener("keyup", (e) => {
    KEYS[e.key.toLowerCase()] = false;
});

function aabb(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

class Player {
    constructor() {
        this.w = 36;
        this.h = 28;
        this.x = canvas.width / 2 - 18;
        this.y = canvas.height - 56;
        this.speed = 290;
        this.cooldown = 0;
        this.specialCooldown = 0;
        this.invulnTimer = 0;
    }

    update(dt) {
        const left = KEYS["arrowleft"] || KEYS["a"];
        const right = KEYS["arrowright"] || KEYS["d"];

        if (left) this.x -= this.speed * dt;
        if (right) this.x += this.speed * dt;

        this.x = Math.max(8, Math.min(canvas.width - this.w - 8, this.x));

        this.cooldown = Math.max(0, this.cooldown - dt);
        this.specialCooldown = Math.max(0, this.specialCooldown - dt);
        if (this.invulnTimer > 0) this.invulnTimer -= dt;

        if ((KEYS[" "] || KEYS["arrowup"] || KEYS["w"]) && this.cooldown === 0) {
            bullets.push(new Bullet(this.x + this.w / 2 - 2, this.y - 8, false));
            this.cooldown = NORMAL_COOLDOWN;
        }

        if (KEYS["x"] && this.specialCooldown === 0) {
            bullets.push(new Bullet(this.x + this.w / 2 - 6, this.y - 14, true));
            this.specialCooldown = SPECIAL_COOLDOWN;
        }
    }

    draw() {
        if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 15) % 2 === 0) {
            return;
        }

        const drewSprite = drawSpriteCentered(SPRITES.player, this.x, this.y, this.w, this.h);
        if (!drewSprite) {
            ctx.fillStyle = "#38bdf8";
            ctx.beginPath();
            ctx.moveTo(this.x + this.w / 2, this.y);
            ctx.lineTo(this.x + this.w, this.y + this.h);
            ctx.lineTo(this.x, this.y + this.h);
            ctx.closePath();
            ctx.fill();
        }
    }
}

class Bullet {
    constructor(x, y, isSpecial = false) {
        this.x = x;
        this.y = y;
        this.isSpecial = isSpecial;
        this.w = isSpecial ? 12 : 4;
        this.h = isSpecial ? 18 : 10;
        this.speed = isSpecial ? 520 : 450;
        this.damage = isSpecial ? 4 : 1;
        this.dead = false;
    }

    update(dt) {
        this.y -= this.speed * dt;
        if (this.y + this.h < 0) {
            this.dead = true;
        }
    }

    draw() {
        ctx.fillStyle = this.isSpecial ? "#22d3ee" : "#fde047";
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

class EnemyBullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 6;
        this.h = 12;
        this.speed = 230;
        this.dead = false;
    }

    update(dt) {
        this.y += this.speed * dt;
        if (this.y > canvas.height) {
            this.dead = true;
        }
    }

    draw() {
        ctx.fillStyle = "#fb7185";
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

class Particle {
    constructor(x, y, color) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 140;
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 0.35 + Math.random() * 0.25;
        this.maxLife = this.life;
        this.size = 2 + Math.random() * 3;
        this.color = color;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

function spawnExplosion(x, y, color, isBoss = false) {
    const count = isBoss ? 35 : 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

class Enemy {
    constructor(x, y, type) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.dead = false;
        this.hitFlash = 0;

        const baseSpeed = 75;

        if (type === "basic") {
            this.w = 28;
            this.h = 28;
            this.maxHp = 2;
            this.speed = baseSpeed;
            this.color = "#f43f5e";
            this.detailColor = "#881337";
            this.points = 15;
        } else if (type === "medium") {
            this.w = 36;
            this.h = 36;
            this.maxHp = 4;
            this.speed = baseSpeed * 0.5;
            this.color = "#f97316";
            this.detailColor = "#7c2d12";
            this.points = 35;
        } else if (type === "hard") {
            this.w = 46;
            this.h = 46;
            this.maxHp = 9;
            this.speed = baseSpeed * 0.38;
            this.color = "#a855f7";
            this.detailColor = "#4c1d95";
            this.points = 80;
        } else if (type === "boss") {
            this.w = 110;
            this.h = 65;
            this.maxHp = 45;
            this.speed = 18;
            this.vx = 95;
            this.shootTimer = 1.5;
            this.color = "#e11d48";
            this.detailColor = "#facc15";
            this.points = 500;
        }

        this.hp = this.maxHp;
    }

    takeDamage(amount = 1) {
        this.hp -= amount;
        this.hitFlash = 0.08;
        if (this.hp <= 0 && !this.dead) {
            this.dead = true;
            score += this.points;
            spawnExplosion(
                this.x + this.w / 2,
                this.y + this.h / 2,
                this.color,
                this.type === "boss"
            );
        }
    }

    update(dt) {
        if (this.hitFlash > 0) {
            this.hitFlash -= dt;
        }

        this.y += this.speed * dt;

        if (this.type === "boss") {
            if (this.y > 110) {
                this.y = 110;
            }
            this.x += this.vx * dt;
            if (this.x <= 15 || this.x + this.w >= canvas.width - 15) {
                this.vx *= -1;
            }

            this.shootTimer -= dt;
            if (this.shootTimer <= 0) {
                enemyBullets.push(new EnemyBullet(this.x + 20, this.y + this.h));
                enemyBullets.push(new EnemyBullet(this.x + this.w - 26, this.y + this.h));
                this.shootTimer = 1.4;
            }
        }

        if (this.y > canvas.height && !this.dead) {
            this.dead = true;
            loseLife();
        }
    }

    draw() {
        const sprite = SPRITES[this.type];
        const drewSprite = drawSpriteCentered(
            sprite,
            this.x,
            this.y,
            this.w,
            this.h,
            this.hitFlash > 0
        );

        // Fallback: desenha o bloquinho caso o PNG ainda não exista na pasta Mídias
        if (!drewSprite) {
            ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : this.color;
            ctx.fillRect(this.x, this.y, this.w, this.h);

            ctx.fillStyle = this.hitFlash > 0 ? "#e2e8f0" : this.detailColor;
            const pad = Math.floor(this.w * 0.2);
            ctx.fillRect(this.x + pad, this.y + pad, this.w - pad * 2, Math.floor(this.h * 0.3));
        }

        // Barra de vida acima do inimigo/sprite
        if (this.maxHp > 2) {
            const barWidth = this.w;
            const barHeight = this.type === "boss" ? 8 : 5;
            const barY = this.y - barHeight - 6;

            ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
            ctx.fillRect(this.x, barY, barWidth, barHeight);

            const hpRatio = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = this.type === "boss" ? "#facc15" : "#4ade80";
            ctx.fillRect(this.x, barY, barWidth * hpRatio, barHeight);
        }
    }
}

function loseLife() {
    lives -= 1;
    if (lives <= 0) {
        lives = 0;
        gameOver = true;
    }
}

function buildWaveQueue(waveNum) {
    let list = [];

    if (waveNum === 1) {
        list = Array(8).fill("basic");
    } else if (waveNum === 2) {
        list = [...Array(7).fill("basic"), ...Array(3).fill("medium")];
} else if (waveNum === 3) {
list = [...Array(5).fill("basic"), ...Array(4).fill("medium"), ...Array(2).fill("hard")];
} else if (waveNum === 4) {
list = [...Array(3).fill("basic"), ...Array(3).fill("medium"), ...Array(6).fill("hard")];
} else if (waveNum === 5) {
const escorts = Array(6).fill("basic");
return [...escorts, "boss"];
}
for (let i = list.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[list[i], list[j]] = [list[j], list[i]];
}
return list;
}
// Inicializa estrelas com velocidades diferentes (efeito Parallax)
function createStars() {
const list = [];
for (let i = 0; i < 55; i++) {
const size = 1 + Math.random() * 2.2;
list.push({
x: Math.random() * canvas.width,
y: Math.random() * canvas.height,
size: size,
speed: 25 + size * 35,
alpha: 0.35 + (size / 3.2) * 0.65
});
}
return list;
}
function updateStars(dt) {
stars.forEach((s) => {
s.y += s.speed * dt;
if (s.y > canvas.height) {
s.y = -s.size;
s.x = Math.random() * canvas.width;
}
});
}
function drawStars() {
stars.forEach((s) => {
ctx.save();
ctx.globalAlpha = s.alpha;
ctx.fillStyle = "#bae6fd";
ctx.fillRect(s.x, s.y, s.size, s.size);
ctx.restore();
});
}
function draw() {
ctx.clearRect(0, 0, canvas.width, canvas.height);
// Fundo estrelado em movimento
drawStars();
player.draw();
enemies.forEach((e) => e.draw());
bullets.forEach((b) => b.draw());
enemyBullets.forEach((eb) => eb.draw());
particles.forEach((p) => p.draw());
// Indicador do Especial [X] corrigido
ctx.font = "12px Segoe UI";
ctx.textAlign = "left";
if (player.specialCooldown === 0) {
ctx.fillStyle = "#22d3ee";
ctx.fillText("Especial [X]: PRONTO", 12, canvas.height - 12);
} else {
ctx.fillStyle = "#94a3b8";
ctx.fillText("Especial [X]: " + player.specialCooldown.toFixed(1) + "s", 12, canvas.height - 12);
}
// Banner da onda corrigido
if (waveBannerTimer > 0 && !pause && !gameOver && !victory) {
ctx.fillStyle = "#38bdf8";
ctx.textAlign = "center";
ctx.font = "bold 28px Segoe UI";
const title = waves === 5 ? "ONDA 5 - CHEFÃO FINAL!" : "ONDA " + waves;
ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 40);
}
// Telas de overlay corrigidas
if (pause) {
drawOverlay("PAUSA", "Pressione P para continuar");
}
if (gameOver) {
drawOverlay("GAME OVER", "Pontuação: " + score + " | Pressione R para reiniciar");
}
if (victory) {
drawOverlay("VITÓRIA!", "Você venceu todas as ondas! Pontos: " + score + " | Pressione R");
}
}
let player, bullets, enemyBullets, enemies, particles, stars, score, lives, waves, last;
let gameOver, victory, pause, spawnTimer, waveQueue, waveBannerTimer;
function startGame() {
player = new Player();
bullets = [];
enemyBullets = [];
enemies = [];
particles = [];
stars = createStars();
score = 0;
lives = 3;
waves = 1;
waveQueue = buildWaveQueue(1);
spawnTimer = 1.0;
waveBannerTimer = 2.0;
pause = false;
gameOver = false;
victory = false;
last = 0;
syncHud();
}
function update(dt) {
if (pause || gameOver || victory) return;
if (waveBannerTimer > 0) {
waveBannerTimer -= dt;
}
updateStars(dt);
player.update(dt);
bullets.forEach((b) => b.update(dt));
enemyBullets.forEach((eb) => eb.update(dt));
enemies.forEach((e) => e.update(dt));
particles.forEach((p) => p.update(dt));
spawnWave(dt);
bullets.forEach((b) => {
enemies.forEach((e) => {
if (!b.dead && !e.dead && aabb(b, e)) {
b.dead = true;
e.takeDamage(b.damage);
}
});
});
enemies.forEach((e) => {
if (!e.dead && aabb(e, player)) {
if (e.type !== "boss") {
e.dead = true;
spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color);
}
if (player.invulnTimer <= 0) {
loseLife();
player.invulnTimer = 1.2;
}
}
});
enemyBullets.forEach((eb) => {
if (!eb.dead && aabb(eb, player)) {
eb.dead = true;
if (player.invulnTimer <= 0) {
loseLife();
player.invulnTimer = 1.2;
}
}
});
enemies = enemies.filter((e) => !e.dead);
bullets = bullets.filter((b) => !b.dead);
enemyBullets = enemyBullets.filter((eb) => !eb.dead);
particles = particles.filter((p) => p.life > 0);
if (waveQueue.length === 0 && enemies.length === 0 && !gameOver) {
if (waves < 5) {
waves += 1;
waveQueue = buildWaveQueue(waves);
waveBannerTimer = 2.2;
spawnTimer = 1.5;
} else {
victory = true;
}
}
syncHud();
}
function syncHud() {
scoreE1.textContent = score;
livesE1.textContent = lives;
wavesE1.textContent = waves + "/5";
}
/**
• TUNE DA ONDA (Balanceamento em 3 eixos):
• 
	1. QUANTIDADE (por onda):
• 
	• Onda 1: 8 inimigos (8 básicos)
• 
	• Onda 2: 10 inimigos (7 básicos, 3 médios)
• 
	• Onda 3: 11 inimigos (5 básicos, 4 médios, 2 difíceis)
• 
	• Onda 4: 12 inimigos (3 básicos, 3 médios, 6 difíceis)
• 
	• Onda 5: 7 inimigos (6 básicos de escolta + 1 Chefão Final)
• 
	2. VELOCIDADE (inversamente proporcional à vida):
• 
	• Básico (2 HP): 75 px/s
• 
	• Médio (4 HP): 37.5 px/s (0.5x do básico)
• 
	• Difícil (9 HP): 28.5 px/s (0.38x do básico)
• 
	• Chefão (45 HP): 18 px/s descendo até y=110 e 95 px/s lateralmente
• 
	3. INTERVALO DE SPAWN (cadência de entrada):
• 
	• Após Básico: 1.25s
• 
	• Após Médio: 1.70s
• 
	• Após Difícil: 2.20s
*/
function spawnWave(dt) {
if (waveQueue.length === 0) return;
spawnTimer -= dt;
if (spawnTimer <= 0) {
const nextType = waveQueue.shift();
if (nextType === "boss") {
enemies.push(new Enemy(canvas.width / 2 - 55, -70, "boss"));
} else {
const margin = 55;
const x = 15 + Math.random() * (canvas.width - margin - 15);
enemies.push(new Enemy(x, -50, nextType));
}
if (nextType === "hard") {
spawnTimer = 2.2;
} else if (nextType === "medium") {
spawnTimer = 1.7;
} else {
spawnTimer = 1.25;
}
}
}
function drawOverlay(text, sub) {
ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = victory ? "#facc15" : "#f8fafc";
ctx.textAlign = "center";
ctx.font = "bold 34px Segoe UI";
ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 10);
if (sub) {
ctx.fillStyle = "#e2e8f0";
ctx.font = "16px Segoe UI";
ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 28);
}
}
function loop(ts) {
if (!last) last = ts;
const dt = Math.min(0.033, (ts - last) / 1000);
last = ts;
update(dt);
draw();
requestAnimationFrame(loop);
}
startGame();
requestAnimationFrame(loop);