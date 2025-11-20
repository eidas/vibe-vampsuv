import Phaser from 'phaser';

type EnemySprite = Phaser.Physics.Arcade.Sprite & { hp: number };
type OrbSprite = Phaser.Physics.Arcade.Sprite & { xp: number };

class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private orbs!: Phaser.Physics.Arcade.Group;
  private stats = { hp: 5, level: 1, xp: 0, xpToNext: 5 };
  private lastDamageTime = 0;
  private uiText!: Phaser.GameObjects.Text;
  private attackDelay = 650;
  private enemySpawnDelay = 1200;
  private attackEvent?: Phaser.Time.TimerEvent;
  private spawnEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super('MainScene');
  }

  preload() {
    this.createPrimitiveTextures();
  }

  create() {
    this.cursors = this.input.keyboard!.createCursorKeys();

    this.physics.world.setBounds(-600, -450, 1200, 900);

    this.player = this.physics.add.sprite(0, 0, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDamping(true);
    this.player.setDrag(300, 300);
    this.player.setMaxVelocity(240);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBackgroundColor('#0e0d1a');

    this.enemies = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite });
    this.projectiles = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 50 });
    this.orbs = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite });

    this.physics.add.overlap(this.projectiles, this.enemies, this.handleProjectileHit as any);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit as any);
    this.physics.add.overlap(this.player, this.orbs, this.handleOrbPickup as any);

    this.uiText = this.add.text(16, 16, '', { fontSize: '16px', color: '#f6f6f6' }).setScrollFactor(0);
    this.updateUi();

    this.attackEvent = this.time.addEvent({ delay: this.attackDelay, loop: true, callback: () => this.fireProjectile() });
    this.spawnEvent = this.time.addEvent({ delay: this.enemySpawnDelay, loop: true, callback: () => this.spawnEnemy() });

    this.time.addEvent({ delay: 15000, loop: true, callback: () => this.scaleDifficulty() });
  }

  update() {
    this.handleMovement();
  }

  private handleMovement() {
    const speed = 220;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setAcceleration(0);

    if (this.cursors.left?.isDown) {
      body.setAccelerationX(-speed * 2);
    } else if (this.cursors.right?.isDown) {
      body.setAccelerationX(speed * 2);
    }

    if (this.cursors.up?.isDown) {
      body.setAccelerationY(-speed * 2);
    } else if (this.cursors.down?.isDown) {
      body.setAccelerationY(speed * 2);
    }
  }

  private fireProjectile() {
    if (!this.player.active) return;

    const target = this.findNearestEnemy();
    const direction = target
      ? new Phaser.Math.Vector2(target.x - this.player.x, target.y - this.player.y).normalize()
      : new Phaser.Math.Vector2(1, 0).rotate(Math.random() * Math.PI * 2);

    const projectile = this.projectiles.get(this.player.x, this.player.y, 'projectile');
    if (!projectile) return;

    projectile.setActive(true).setVisible(true);
    projectile.body.reset(this.player.x, this.player.y);
    projectile.setVelocity(direction.x * 360, direction.y * 360);
    projectile.setLifetime(900);

    this.time.delayedCall(900, () => {
      projectile.disableBody(true, true);
    });
  }

  private spawnEnemy() {
    const spawnRadius = 520;
    const angle = Math.random() * Math.PI * 2;
    const x = this.player.x + Math.cos(angle) * spawnRadius;
    const y = this.player.y + Math.sin(angle) * spawnRadius;
    const enemy = this.enemies.get(x, y, 'enemy') as EnemySprite | null;

    if (!enemy) return;

    enemy.setActive(true).setVisible(true);
    enemy.body.reset(x, y);
    enemy.hp = 3 + Math.floor(this.stats.level / 2);
    enemy.setVelocity(0, 0);
    enemy.setData('spawnTime', this.time.now);
  }

  private handleProjectileHit = (_projectile: Phaser.GameObjects.GameObject, target: Phaser.GameObjects.GameObject) => {
    const projectile = _projectile as Phaser.Physics.Arcade.Sprite;
    const enemy = target as EnemySprite;

    enemy.hp -= 1;
    projectile.disableBody(true, true);

    if (enemy.hp <= 0) {
      this.spawnOrb(enemy.x, enemy.y);
      enemy.disableBody(true, true);
    } else {
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      const knockback = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - this.player.y).normalize().scale(80);
      body.velocity.add(knockback);
    }
  };

  private handlePlayerHit = (_player: Phaser.GameObjects.GameObject, enemy: Phaser.GameObjects.GameObject) => {
    const now = this.time.now;
    if (now - this.lastDamageTime < 800) return;
    this.lastDamageTime = now;
    this.stats.hp -= 1;
    this.tweens.add({ targets: this.cameras.main, duration: 100, zoom: 1.03, yoyo: true });
    if (this.stats.hp <= 0) {
      this.gameOver();
    }
    this.updateUi();
  };

  private handleOrbPickup = (_player: Phaser.GameObjects.GameObject, orbObj: Phaser.GameObjects.GameObject) => {
    const orb = orbObj as OrbSprite;
    orb.disableBody(true, true);
    this.stats.xp += orb.xp;
    if (this.stats.xp >= this.stats.xpToNext) {
      this.levelUp();
    }
    this.updateUi();
  };

  private levelUp() {
    this.stats.xp -= this.stats.xpToNext;
    this.stats.level += 1;
    this.stats.xpToNext = Math.ceil(this.stats.xpToNext * 1.35 + 2);
    this.attackDelay = Math.max(250, this.attackDelay - 30);
    this.enemySpawnDelay = Math.max(500, this.enemySpawnDelay - 30);

    if (this.attackEvent) {
      this.attackEvent.reset({ delay: this.attackDelay, loop: true, callback: () => this.fireProjectile() });
    }
    if (this.spawnEvent) {
      this.spawnEvent.reset({ delay: this.enemySpawnDelay, loop: true, callback: () => this.spawnEnemy() });
    }
  }

  private spawnOrb(x: number, y: number) {
    const orb = this.orbs.get(x, y, 'orb') as OrbSprite | null;
    if (!orb) return;

    const xpValue = Phaser.Math.Between(1, 2);
    orb.xp = xpValue;
    orb.setActive(true).setVisible(true);
    orb.body.reset(x, y);
    orb.setVelocity(0, 0);
  }

  private findNearestEnemy(): EnemySprite | null {
    let nearest: EnemySprite | null = null;
    let distanceSq = Infinity;
    this.enemies.getChildren().forEach(child => {
      const enemy = child as EnemySprite;
      if (!enemy.active) return;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = dx * dx + dy * dy;
      if (dist < distanceSq) {
        distanceSq = dist;
        nearest = enemy;
      }
    });
    return nearest;
  }

  private scaleDifficulty() {
    this.enemySpawnDelay = Math.max(400, this.enemySpawnDelay - 80);
    if (this.spawnEvent) {
      this.spawnEvent.reset({ delay: this.enemySpawnDelay, loop: true, callback: () => this.spawnEnemy() });
    }
  }

  private gameOver() {
    this.player.setTint(0xff3355);
    this.physics.pause();
    this.uiText.setText('GAME OVER\nPress R to restart');
    this.input.keyboard?.on('keydown-R', () => this.scene.restart());
  }

  private updateUi() {
    const lines = [
      `HP: ${this.stats.hp}`,
      `Level: ${this.stats.level}`,
      `XP: ${this.stats.xp}/${this.stats.xpToNext}`,
      `Attack: every ${(this.attackDelay / 1000).toFixed(2)}s`,
      `Spawn: every ${(this.enemySpawnDelay / 1000).toFixed(2)}s`
    ];
    this.uiText.setText(lines.join('\n'));
  }

  private createPrimitiveTextures() {
    const g = this.add.graphics();

    g.fillStyle(0x5de4c7, 1);
    g.fillCircle(16, 16, 14);
    g.generateTexture('player', 32, 32);
    g.clear();

    g.fillStyle(0xffb454, 1);
    g.fillCircle(14, 14, 12);
    g.generateTexture('enemy', 28, 28);
    g.clear();

    g.fillStyle(0x00c1e0, 1);
    g.fillRect(0, 0, 10, 10);
    g.generateTexture('projectile', 10, 10);
    g.clear();

    g.fillStyle(0x9ef01a, 1);
    g.fillCircle(10, 10, 9);
    g.generateTexture('orb', 20, 20);
    g.destroy();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 720,
  parent: 'app',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: MainScene
};

new Phaser.Game(config);
