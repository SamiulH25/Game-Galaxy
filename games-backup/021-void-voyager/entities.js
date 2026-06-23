// Void Voyager - Game Entities

class Player {
    constructor() {
        this.position = [0, 0, 0];
        this.velocity = [0, 0, 0];
        this.rotation = [0, 0, 0];
        this.health = 100;
        this.maxHealth = 100;
        this.score = 0;
        this.speed = 12;
        this.shootCooldown = 0;
        this.shootInterval = 0.15;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.radius = 0.8;
    }
    
    update(dt, input) {
        const moveDir = [0, 0, 0];
        
        if (input.keys['w'] || input.keys['arrowup']) moveDir[2] -= 1;
        if (input.keys['s'] || input.keys['arrowdown']) moveDir[2] += 1;
        if (input.keys['a'] || input.keys['arrowleft']) moveDir[0] -= 1;
        if (input.keys['d'] || input.keys['arrowright']) moveDir[0] += 1;
        if (input.keys[' '] || input.keys['q']) moveDir[1] += 1;
        if (input.keys['shift'] || input.keys['e']) moveDir[1] -= 1;
        
        const len = vec3.length(moveDir);
        if (len > 0) {
            moveDir[0] /= len;
            moveDir[1] /= len;
            moveDir[2] /= len;
        }
        
        this.velocity[0] = moveDir[0] * this.speed;
        this.velocity[1] = moveDir[1] * this.speed;
        this.velocity[2] = moveDir[2] * this.speed;
        
        this.position[0] += this.velocity[0] * dt;
        this.position[1] += this.velocity[1] * dt;
        this.position[2] += this.velocity[2] * dt;
        
        this.position[0] = Math.max(-18, Math.min(18, this.position[0]));
        this.position[1] = Math.max(-10, Math.min(10, this.position[1]));
        this.position[2] = Math.max(-18, Math.min(18, this.position[2]));
        
        this.rotation[2] = -this.velocity[0] * 0.05;
        this.rotation[0] = this.velocity[2] * 0.03;
        
        this.shootCooldown -= dt;
        
        if (this.invincible) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }
    }
    
    canShoot() {
        return this.shootCooldown <= 0;
    }
    
    shoot() {
        this.shootCooldown = this.shootInterval;
    }
    
    takeDamage(amount) {
        if (this.invincible) return false;
        this.health -= amount;
        this.invincible = true;
        this.invincibleTimer = 1.0;
        return true;
    }
}

class Projectile {
    constructor(position, velocity, color = [0.2, 0.8, 1.0], owner = 'player') {
        this.position = vec3.clone(position);
        this.velocity = vec3.clone(velocity);
        this.color = color;
        this.owner = owner;
        this.life = 2.0;
        this.radius = 0.2;
        this.speed = 40;
    }
    
    update(dt) {
        this.position[0] += this.velocity[0] * this.speed * dt;
        this.position[1] += this.velocity[1] * this.speed * dt;
        this.position[2] += this.velocity[2] * this.speed * dt;
        this.life -= dt;
    }
    
    isAlive() {
        return this.life > 0;
    }
}

class Crystal {
    constructor(position) {
        this.position = vec3.clone(position);
        this.velocity = [0, 0, 0];
        this.rotation = [0, 0, 0];
        this.value = 10;
        this.radius = 0.6;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.collected = false;
    }
    
    update(dt, time) {
        this.rotation[1] += dt * 2;
        this.position[1] += Math.sin(time * 2 + this.bobOffset) * dt * 0.5;
    }
    
    collect() {
        this.collected = true;
        return this.value;
    }
}

class Asteroid {
    constructor(position, velocity) {
        this.position = vec3.clone(position);
        this.velocity = vec3.clone(velocity);
        this.rotation = [
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        ];
        this.rotationSpeed = [
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ];
        this.radius = 0.8 + Math.random() * 0.6;
        this.health = 2;
        this.color = [0.4, 0.35, 0.3];
    }
    
    update(dt) {
        this.position[0] += this.velocity[0] * dt;
        this.position[1] += this.velocity[1] * dt;
        this.position[2] += this.velocity[2] * dt;
        
        this.rotation[0] += this.rotationSpeed[0] * dt;
        this.rotation[1] += this.rotationSpeed[1] * dt;
        this.rotation[2] += this.rotationSpeed[2] * dt;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }
    
    isAlive() {
        return this.health > 0;
    }
}

class Drone {
    constructor(position) {
        this.position = vec3.clone(position);
        this.velocity = [0, 0, 0];
        this.rotation = [0, 0, 0];
        this.health = 3;
        this.speed = 5;
        this.radius = 0.7;
        this.shootCooldown = 0;
        this.shootInterval = 2.0;
        this.color = [0.8, 0.2, 0.2];
    }
    
    update(dt, playerPos) {
        const dir = [0, 0, 0];
        vec3.subtract(dir, playerPos, this.position);
        const dist = vec3.length(dir);
        
        if (dist > 0) {
            dir[0] /= dist;
            dir[1] /= dist;
            dir[2] /= dist;
        }
        
        const targetDist = 12;
        if (dist > targetDist) {
            this.velocity[0] = dir[0] * this.speed;
            this.velocity[1] = dir[1] * this.speed;
            this.velocity[2] = dir[2] * this.speed;
        } else if (dist < targetDist - 2) {
            this.velocity[0] = -dir[0] * this.speed * 0.5;
            this.velocity[1] = -dir[1] * this.speed * 0.5;
            this.velocity[2] = -dir[2] * this.speed * 0.5;
        } else {
            this.velocity[0] *= 0.9;
            this.velocity[1] *= 0.9;
            this.velocity[2] *= 0.9;
        }
        
        this.position[0] += this.velocity[0] * dt;
        this.position[1] += this.velocity[1] * dt;
        this.position[2] += this.velocity[2] * dt;
        
        this.rotation[1] += dt * 1.5;
        
        this.shootCooldown -= dt;
    }
    
    canShoot() {
        return this.shootCooldown <= 0;
    }
    
    shoot() {
        this.shootCooldown = this.shootInterval;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }
    
    isAlive() {
        return this.health > 0;
    }
}

class PowerUp {
    constructor(position, type) {
        this.position = vec3.clone(position);
        this.type = type;
        this.rotation = [0, 0, 0];
        this.radius = 0.5;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.collected = false;
        
        switch (type) {
            case 'health':
                this.color = [0.2, 0.8, 0.3];
                break;
            case 'speed':
                this.color = [0.8, 0.8, 0.2];
                break;
            case 'shield':
                this.color = [0.2, 0.4, 0.9];
                break;
            default:
                this.color = [0.8, 0.8, 0.8];
        }
    }
    
    update(dt, time) {
        this.rotation[1] += dt * 3;
        this.position[1] += Math.sin(time * 3 + this.bobOffset) * dt * 0.3;
    }
    
    collect() {
        this.collected = true;
        return this.type;
    }
}

class Particle {
    constructor(position, velocity, color, size = 0.1, life = 1.0) {
        this.position = vec3.clone(position);
        this.velocity = vec3.clone(velocity);
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
    }
    
    update(dt) {
        this.position[0] += this.velocity[0] * dt;
        this.position[1] += this.velocity[1] * dt;
        this.position[2] += this.velocity[2] * dt;
        this.velocity[1] -= 5 * dt;
        this.life -= dt;
    }
    
    isAlive() {
        return this.life > 0;
    }
    
    getNormalizedLife() {
        return Math.max(0, this.life / this.maxLife);
    }
}