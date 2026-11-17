const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreE1 = document.getElementById("score");
const livesE1 = document.getElementById("lives");
const wavesE1 = document.getElementById("wave");

const KEYS = {};

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
        this.invulnTimer = 0; // Breve proteção ao tomar dano
    }

    update(dt) {
        const left = KEYS["arrowleft"] || KEYS["a"];
        const right = KEYS["arrowright"] || KEYS["d"];

        if (left) this.x -= this.speed * dt;
        if (right) this.x += this.speed * dt;

        this.x = Math.max(8, Math.min(canvas.width - this.w - 8, this.x));
        this.cooldown = Math.max(0, this.cooldown - dt);
        if (this.invulnTimer > 0) this.invulnTimer -= dt;

        if ((KEYS[" "] || KEYS["arrowup"] || KEYS["w"]) && this.cooldown === 0) {
            bullets.push(new Bullet(this.x + this.w / 2 - 2, this.y - 8));
            this.cooldown = 0.22;
        }
    }

    draw() {
        // Pisca se estiver invulnerável após tomar dano
        if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 15) % 2 === 0) {
            return;
        }
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.moveTo(this.x + this.w / 2, this.y);
        ctx.lineTo(this.x + this.w, this.y + this.h);
        ctx.lineTo(this.x, this.y + this.h);
        ctx.closePath();
        ctx.fill();
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.h = 10;
        this.w = 4;
        this.speed = 450;
        this.dead = false;
    }

    update(dt) {
        this.y -= this.speed * dt;
        if (this.y + this.h < 0) {
            this.dead = true;
        }
    }

    draw() {
        ctx.fillStyle = "#fde047";
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

// Tiros exclusivos do Chefão da Onda 5
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

class Enemy {
    constructor(x, y, type) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.dead = false;
        this.hitFlash = 0; // Temporizador para piscar branco ao levar tiro

        // Configurações balanceadas por tipo
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
            this.speed = baseSpeed * 0.5; // Metade da velocidade do básico
            this.color = "#f97316";
            this.detailColor = "#7c2d12";
            this.points = 35;
        } else if (type === "hard") {
            this.w = 46;
            this.h = 46;
            this.maxHp = 9;
            this.speed = baseSpeed * 0.38; // Um pouco menos que o médio
            this.color = "#a855f7";
            this.detailColor = "#4c1d95";
            this.points = 80;
        } else if (type === "boss") {
            this.w = 110;
            this.h = 65;
            this.maxHp = 45;
            this.speed = 18; // Desce bem devagar para dar tempo de lutar
            this.vx = 95; // Velocidade lateral
            this.shootTimer = 1.5;
            this.color = "#e11d48";
            this.detailColor = "#facc15";
            this.points = 500;
        }

        this.hp = this.maxHp;
    }

    takeDamage() {
        this.hp -= 1;
        this.hitFlash = 0.08; // Pisca branco por 80ms
        if (this.hp <= 0) {
            this.dead = true;
            score += this.points;
        }
    }

    update(dt) {
        if (this.hitFlash > 0) {
            this.hitFlash -= dt;
        }

        this.y += this.speed * dt;

        // Comportamento especial do Chefão
        if (this.type === "boss") {
            // Para de descer quando chega na altura y = 110 e fica patrulhando
            if (this.y > 110) {
                this.y = 110;
            }
            this.x += this.vx * dt;
            if (this.x <= 15 || this.x + this.w >= canvas.width - 15) {
                this.vx *= -1;
            }

            // Chefão atira periodicamente
            this.shootTimer -= dt;
            if (this.shootTimer <= 0) {
                enemyBullets.push(new EnemyBullet(this.x + 20, this.y + this.h));
                enemyBullets.push(new EnemyBullet(this.x + this.w - 26, this.y + this.h));
                this.shootTimer = 1.4;
            }
        }

        // Perde vida se passar do fim da tela
        if (this.y > canvas.height && !this.dead) {
            this.dead = true;
            loseLife();
        }
    }

    draw() {
        // Corpo do inimigo (branco se acabou de levar dano)
        ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);

        // Detalhe visual interno proporcional ao tamanho
        ctx.fillStyle = this.hitFlash > 0 ? "#e2e8f0" : this.detailColor;
        const pad = Math.floor(this.w * 0.2);
        ctx.fillRect(this.x + pad, this.y + pad, this.w - pad * 2, Math.floor(this.h * 0.3));

        // Barra de vida (para inimigos médios, difíceis e chefão)
        if (this.maxHp > 2) {
            const barWidth = this.w;
            const barHeight = this.type === "boss" ? 8 : 5;
            const barY = this.y - barHeight - 5;

            // Fundo da barra
            ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
            ctx.fillRect(this.x, barY, barWidth, barHeight);

            // Vida atual
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

// Monta a fila de inimigos de cada uma das 5 ondas
function buildWaveQueue(waveNum) {
    let list = [];

    if (waveNum === 1) {
        // Onda 1: Apenas básicos
        list = Array(8).fill("basic");
    } else if (waveNum === 2) {
        // Onda 2: Maioria básicos + alguns médios
        list = [...Array(7).fill("basic"), ...Array(3).fill("medium")];
    } else if (waveNum === 3) {
        // Onda 3: Básicos, médios + introdução de 2 difíceis
        list = [...Array(5).fill("basic"), ...Array(4).fill("medium"), ...Array(2).fill("hard")];
    } else if (waveNum === 4) {
        // Onda 4: Todos os tipos, maioria difíceis
        list = [...Array(3).fill("basic"), ...Array(3).fill("medium"), ...Array(6).fill("hard")];
    } else if (waveNum === 5) {
        // Onda 5: Básicos primeiro e o Chefão por último!
        const escorts = Array(6).fill("basic");
        return [...escorts, "boss"];
    }

    // Embaralha os inimigos para não virem sempre na mesma ordem
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Estrelas de fundo
    ctx.fillStyle = "#7dd3fc";
    for (let i = 0; i < 40; i++) {
        ctx.fillRect((i * 97) % canvas.width, (i * 53) % canvas.height, 2, 2);
    }

    player.draw();
    enemies.forEach((e) => e.draw());
    bullets.forEach((b) => b.draw());
    enemyBullets.forEach((eb) => eb.draw());

    // Aviso de transição de onda
    if (waveBannerTimer > 0 && !pause && !gameOver && !victory) {
        ctx.fillStyle = "#38bdf8";
        ctx.textAlign = "center";
        ctx.font = "bold 28px Segoe UI";
        const title = waves === 5 ? "ONDA 5 - CHEFÃO FINAL!" : `ONDA ${waves}`;
        ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 40);
    }

    if (pause) {
        drawOverlay("PAUSA", "Pressione P para continuar");
    }
    if (gameOver) {
        drawOverlay("GAME OVER", `Pontuação: ${score} | Pressione R para reiniciar`);
    }
    if (victory) {
        drawOverlay("VITÓRIA!", `Você venceu todas as ondas! Pontos: ${score} | Pressione R`);
    }
}

let player, bullets, enemyBullets, enemies, score, lives, waves, last;
let gameOver, victory, pause, spawnTimer, waveQueue, waveBannerTimer;

function startGame() {
    player = new Player();
    bullets = [];
    enemyBullets = [];
    enemies = [];
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
player.update(dt);
bullets.forEach((b) => b.update(dt));
enemyBullets.forEach((eb) => eb.update(dt));
enemies.forEach((e) => e.update(dt));
spawnFromQueue(dt);
// Colisão: Tiros do jogador x Inimigos
bullets.forEach((b) => {
enemies.forEach((e) => {
if (!b.dead && !e.dead && aabb(b, e)) {
b.dead = true;
e.takeDamage();
}
});
});
// Colisão: Inimigos x Jogador
enemies.forEach((e) => {
if (!e.dead && aabb(e, player)) {
if (e.type !== "boss") {
e.dead = true;
}
if (player.invulnTimer <= 0) {
loseLife();
player.invulnTimer = 1.2;
}
}
});
// Colisão: Tiros do Chefão x Jogador
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
// Verifica se a onda atual terminou (fila vazia e nenhum inimigo vivo)
if (waveQueue.length === 0 && enemies.length === 0 && !gameOver) {
if (waves < 5) {
waves += 1;
waveQueue = buildWaveQueue(waves);
waveBannerTimer = 2.2;
spawnTimer = 1.5; // Pequena pausa antes da próxima onda começar
} else {
victory = true;
}
}
syncHud();
}
function syncHud() {
scoreE1.textContent = score;
livesE1.textContent = lives;
wavesE1.textContent = ${waves}/5;
}
function spawnFromQueue(dt) {
if (waveQueue.length === 0) return;
spawnTimer -= dt;
if (spawnTimer <= 0) {
const nextType = waveQueue.shift();
// Se for o chefão, espera os básicos da onda 5 sumirem ou nasce centralizado
if (nextType === "boss") {
enemies.push(new Enemy(canvas.width / 2 - 55, -70, "boss"));
} else {
const margin = 55;
const x = 15 + Math.random() * (canvas.width - margin - 15);
enemies.push(new Enemy(x, -50, nextType));
}
// Intervalo dinâmico: ondas mais lentas e cadenciadas
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