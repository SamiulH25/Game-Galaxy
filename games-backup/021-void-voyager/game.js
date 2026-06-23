// Void Voyager - Main Game

const WIN_SCORE = 1000;

class VoidVoyager {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        
        this.player = new Player();
        this.projectiles = [];
        this.crystals = [];
        this.asteroids = [];
        this.drones = [];
        this.powerUps = [];
        this.particles = [];
        
        this.input = { keys: {}, mouse: { x: 0, y: 0, down: false } };
        this.time = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.paused = false;
        
        this.spawnTimer = 0;
        this.crystalTimer = 0;
        this.difficulty = 1;
        
        this.bindEvents();
        this.start();
    }
    
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            this.input.keys[e.key.toLowerCase()] = true;
            
            if (e.key === 'p' || e.key === 'Escape') {
                this.paused = !this.paused;
                this.updatePauseUI();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.input.keys[e.key.toLowerCase()] = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.input.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.input.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        });
        
        this.canvas.addEventListener('mousedown', () => {
            this.input.mouse.down = true;
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.input.mouse.down = false;
        });
        
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    start() {
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    gameLoop(timestamp = 0) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;
        
        if (!this.gameOver && !this.gameWon && !this.paused) {
            this.update(dt);
        }
        
        this.render();
        this.updateUI();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    update(dt) {
        this.time += dt;
        this.player.update(dt, this.input);
        
        if (this.input.mouse.down && this.player.canShoot()) {
            this.player.shoot();
            this.spawnPlayerProjectile();
        }
        
        this.projectiles.forEach(p => p.update(dt));
        this.crystals.forEach(c => c.update(dt, this.time));
        this.asteroids.forEach(a => a.update(dt));
        this.drones.forEach(d => d.update(dt, this.player.position));
        this.powerUps.forEach(p => p.update(dt, this.time));
        this.particles.forEach(p => p.update(dt));
        
        this.checkCollisions();
        this.spawnEntities(dt);
        this.cleanup();
        
        this.difficulty = 1 + Math.floor(this.player.score / 100) * 0.2;
        
        if (this.player.score >= WIN_SCORE) {
            this.gameWon = true;
        }
        
        if (this.player.health <= 0) {
            this.gameOver = true;
        }
    }
    
    spawnPlayerProjectile() {
        const dir = [0, 0, -1];
        this.projectiles.push(new Projectile(
            [this.player.position[0], this.player.position[1], this.player.position[2] - 1],
            dir,
            [0.2, 0.8, 1.0],
            'player'
        ));
        
        for (let i = 0; i < 3; i++) {
            this.particles.push(new Particle(
                [this.player.position[0], this.player.position[1], this.player.position[2] - 1],
                [(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, -5],
                [0.2, 0.6, 1.0],
                0.15,
                0.3
            ));
        }
    }
    
    spawnDroneProjectile(drone) {
        const dir = [0, 0, 0];
        vec3.subtract(dir, this.player.position, drone.position);
        vec3.normalize(dir, dir);
        
        this.projectiles.push(new Projectile(
            [drone.position[0], drone.position[1], drone.position[2]],
            dir,
            [1.0, 0.3, 0.2],
            'enemy'
        ));
    }
    
    spawnEntities(dt) {
        this.spawnTimer += dt;
        this.crystalTimer += dt;
        
        const spawnInterval = Math.max(0.5, 2.0 / this.difficulty);
        if (this.spawnTimer >= spawnInterval) {
            this.spawnTimer = 0;
            
            if (Math.random() < 0.6) {
                this.spawnAsteroid();
            }
            
            if (Math.random() < 0.3 * this.difficulty) {
                this.spawnDrone();
            }
        }
        
        if (this.crystalTimer >= 1.5) {
            this.crystalTimer = 0;
            this.spawnCrystal();
        }
        
        for (const drone of this.drones) {
            if (drone.canShoot()) {
                const dist = vec3.distance(drone.position, this.player.position);
                if (dist < 20) {
                    drone.shoot();
                    this.spawnDroneProjectile(drone);
                }
            }
        }
    }
    
    spawnAsteroid() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 10;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = (Math.random() - 0.5) * 15;
        
        const vel = [0, 0, 0];
        vec3.subtract(vel, this.player.position, [x, y, z]);
        vec3.normalize(vel, vel);
        const speed = 3 + Math.random() * 3;
        vec3.scale(vel, vel, speed);
        
        this.asteroids.push(new Asteroid([x, y, z], vel));
    }
    
    spawnDrone() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 25 + Math.random() * 15;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = (Math.random() - 0.5) * 10;
        
        this.drones.push(new Drone([x, y, z]));
    }
    
    spawnCrystal() {
        const x = (Math.random() - 0.5) * 30;
        const z = (Math.random() - 0.5) * 30;
        const y = (Math.random() - 0.5) * 10;
        
        this.crystals.push(new Crystal([x, y, z]));
    }
    
    spawnPowerUp(position, type) {
        this.powerUps.push(new PowerUp(position, type));
    }
    
    checkCollisions() {
        this.projectiles = this.projectiles.filter(proj => {
            if (proj.owner === 'player') {
                for (const asteroid of this.asteroids) {
                    if (this.checkRadiusCollision(proj, asteroid)) {
                        if (asteroid.takeDamage(1)) {
                            this.player.score += 25;
                            this.spawnExplosion(asteroid.position, [0.5, 0.4, 0.3]);
                            if (Math.random() < 0.15) {
                                this.spawnPowerUp(asteroid.position, 'health');
                            }
                            return false;
                        }
                        this.spawnHitEffect(proj.position, proj.color);
                        return false;
                    }
                }
                
                for (const drone of this.drones) {
                    if (this.checkRadiusCollision(proj, drone)) {
                        if (drone.takeDamage(1)) {
                            this.player.score += 50;
                            this.spawnExplosion(drone.position, drone.color);
                            if (Math.random() < 0.3) {
                                const types = ['health', 'speed', 'shield'];
                                this.spawnPowerUp(drone.position, types[Math.floor(Math.random() * types.length)]);
                            }
                            return false;
                        }
                        this.spawnHitEffect(proj.position, proj.color);
                        return false;
                    }
                }
            } else {
                if (this.checkRadiusCollision(proj, this.player)) {
                    if (this.player.takeDamage(15)) {
                        this.spawnExplosion(this.player.position, [0.2, 0.4, 1.0]);
                    }
                    return false;
                }
            }
            
            return proj.isAlive();
        });
        
        for (const crystal of this.crystals) {
            if (!crystal.collected && this.checkRadiusCollision(this.player, crystal)) {
                this.player.score += crystal.collect();
                this.spawnCollectEffect(crystal.position, [1.0, 0.85, 0.2]);
            }
        }
        
        for (const powerUp of this.powerUps) {
            if (!powerUp.collected && this.checkRadiusCollision(this.player, powerUp)) {
                const type = powerUp.collect();
                this.applyPowerUp(type);
                this.spawnCollectEffect(powerUp.position, powerUp.color);
            }
        }
        
        for (const asteroid of this.asteroids) {
            if (this.checkRadiusCollision(this.player, asteroid)) {
                if (this.player.takeDamage(25)) {
                    this.spawnExplosion(this.player.position, [0.2, 0.4, 1.0]);
                    asteroid.takeDamage(2);
                }
            }
        }
        
        for (const drone of this.drones) {
            if (this.checkRadiusCollision(this.player, drone)) {
                if (this.player.takeDamage(20)) {
                    this.spawnExplosion(this.player.position, [0.2, 0.4, 1.0]);
                }
            }
        }
    }
    
    checkRadiusCollision(a, b) {
        const dx = a.position[0] - b.position[0];
        const dy = a.position[1] - b.position[1];
        const dz = a.position[2] - b.position[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return dist < (a.radius + b.radius);
    }
    
    applyPowerUp(type) {
        switch (type) {
            case 'health':
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
                this.showNotification('+30 Health');
                break;
            case 'speed':
                this.player.speed = 18;
                setTimeout(() => { this.player.speed = 12; }, 5000);
                this.showNotification('Speed Boost!');
                break;
            case 'shield':
                this.player.invincible = true;
                this.player.invincibleTimer = 3.0;
                this.showNotification('Shield Active!');
                break;
        }
    }
    
    spawnExplosion(position, color) {
        for (let i = 0; i < 15; i++) {
            const vel = vec3.randomSphere();
            vec3.scale(vel, vel, 3 + Math.random() * 5);
            this.particles.push(new Particle(
                [position[0], position[1], position[2]],
                vel,
                color,
                0.2 + Math.random() * 0.2,
                0.5 + Math.random() * 0.5
            ));
        }
    }
    
    spawnHitEffect(position, color) {
        for (let i = 0; i < 5; i++) {
            const vel = vec3.randomSphere();
            vec3.scale(vel, vel, 2);
            this.particles.push(new Particle(
                [position[0], position[1], position[2]],
                vel,
                color,
                0.1,
                0.2
            ));
        }
    }
    
    spawnCollectEffect(position, color) {
        for (let i = 0; i < 10; i++) {
            const vel = vec3.randomSphere();
            vec3.scale(vel, vel, 2);
            this.particles.push(new Particle(
                [position[0], position[1], position[2]],
                vel,
                color,
                0.15,
                0.4
            ));
        }
    }
    
    cleanup() {
        this.projectiles = this.projectiles.filter(p => {
            if (!p.isAlive()) return false;
            const dist = vec3.length(p.position);
            return dist < 50;
        });
        
        this.crystals = this.crystals.filter(c => !c.collected);
        this.powerUps = this.powerUps.filter(p => !p.collected);
        
        this.asteroids = this.asteroids.filter(a => {
            if (!a.isAlive()) return false;
            const dist = vec3.length(a.position);
            return dist < 60;
        });
        
        this.drones = this.drones.filter(d => {
            if (!d.isAlive()) return false;
            const dist = vec3.length(d.position);
            return dist < 60;
        });
        
        this.particles = this.particles.filter(p => p.isAlive());
    }
    
    render() {
        this.renderer.resize();
        this.renderer.clear();
        
        const camOffset = [
            this.player.position[0] * 0.3,
            this.player.position[1] * 0.3 + 5,
            this.player.position[2] + 15
        ];
        
        this.renderer.setCamera(camOffset, this.player.position);
        
        this.renderer.drawSkybox();
        
        const playerEmissive = this.player.invincible ? 0.5 : 0;
        this.renderer.drawMesh(
            this.renderer.meshes.pyramid,
            this.player.position,
            this.player.rotation,
            [0.5, 0.5, 0.5],
            [0.2, 0.6, 1.0],
            playerEmissive
        );
        
        for (const proj of this.projectiles) {
            this.renderer.drawMesh(
                this.renderer.meshes.cube,
                proj.position,
                null,
                [0.1, 0.1, 0.3],
                proj.color,
                0.8
            );
        }
        
        for (const crystal of this.crystals) {
            this.renderer.drawMesh(
                this.renderer.meshes.pyramid,
                crystal.position,
                crystal.rotation,
                [0.3, 0.3, 0.3],
                [1.0, 0.85, 0.2],
                0.6
            );
        }
        
        for (const asteroid of this.asteroids) {
            this.renderer.drawMesh(
                this.renderer.meshes.cube,
                asteroid.position,
                asteroid.rotation,
                [asteroid.radius, asteroid.radius, asteroid.radius],
                asteroid.color,
                0
            );
        }
        
        for (const drone of this.drones) {
            this.renderer.drawMesh(
                this.renderer.meshes.cube,
                drone.position,
                drone.rotation,
                [0.4, 0.4, 0.4],
                drone.color,
                0.3
            );
        }
        
        for (const powerUp of this.powerUps) {
            this.renderer.drawMesh(
                this.renderer.meshes.pyramid,
                powerUp.position,
                powerUp.rotation,
                [0.3, 0.3, 0.3],
                powerUp.color,
                0.5
            );
        }
        
        const renderParticles = this.particles.map(p => ({
            position: p.position,
            color: p.color,
            size: p.size,
            life: p.getNormalizedLife()
        }));
        this.renderer.drawParticles(renderParticles);
    }
    
    updateUI() {
        document.getElementById('scoreDisplay').textContent = this.player.score;
        document.getElementById('healthBar').style.width = `${this.player.health}%`;
        document.getElementById('healthText').textContent = `${Math.max(0, Math.floor(this.player.health))}`;
        
        const progress = (this.player.score / WIN_SCORE) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${Math.floor(progress)}%`;
        
        if (this.gameOver) {
            document.getElementById('gameOverOverlay').classList.add('active');
            document.getElementById('finalScore').textContent = `Score: ${this.player.score}`;
            document.getElementById('gameOverTitle').textContent = 'VOID CONSUMED';
        } else if (this.gameWon) {
            document.getElementById('gameOverOverlay').classList.add('active');
            document.getElementById('finalScore').textContent = `Score: ${this.player.score}`;
            document.getElementById('gameOverTitle').textContent = 'ESCAPED!';
        }
    }
    
    updatePauseUI() {
        document.getElementById('pauseOverlay').classList.toggle('active', this.paused);
    }
    
    showNotification(text) {
        const notif = document.getElementById('notification');
        notif.textContent = text;
        notif.classList.add('show');
        setTimeout(() => notif.classList.remove('show'), 2000);
    }
    
    restart() {
        this.player = new Player();
        this.projectiles = [];
        this.crystals = [];
        this.asteroids = [];
        this.drones = [];
        this.powerUps = [];
        this.particles = [];
        this.time = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.spawnTimer = 0;
        this.crystalTimer = 0;
        this.difficulty = 1;
        
        document.getElementById('gameOverOverlay').classList.remove('active');
    }
    
    async saveGame() {
        if (window.gameBridge) {
            await window.gameBridge.save({
                score: this.player.score,
                health: this.player.health,
                difficulty: this.difficulty
            });
        }
    }
    
    async loadGame() {
        if (window.gameBridge) {
            const data = await window.gameBridge.load();
            if (data && data.score !== undefined) {
                this.player.score = data.score;
                this.player.health = data.health;
                this.difficulty = data.difficulty;
                return true;
            }
        }
        return false;
    }
}

const game = new VoidVoyager();
game.loadGame();