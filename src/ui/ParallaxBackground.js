// HiValley — reusable parallax menu background.
//
// Layers (back -> front):
//   1. Sky gradient
//   2. Sun + halo
//   3. Drifting clouds
//   4. Far mountain ridge
//   5. Hills / tree silhouettes (mid)
//   6. Foreground: house, fences, trees, flowers, grass tufts
//   7. Floating sparkles for menu "magic"
//
// The background scrolls slowly. Cloud + sparkle positions are seeded so
// each menu session looks consistent.

import Phaser from 'phaser';
import { TEXTURES } from '../utils/textures.js';
import { PALETTE } from '../utils/palette.js';

export class ParallaxBackground {
  constructor(scene) {
    this.scene = scene;
    this.layers = [];
    this.clouds = [];
    this.sparkles = [];
    this._build();
  }

  _build() {
    const { scene } = this;

    // Sky fills the whole game canvas.
    this.sky = scene.add
      .image(scene.scale.width / 2, scene.scale.height / 2, TEXTURES.sky())
      .setDisplaySize(scene.scale.width, scene.scale.height);
    this.layers.push({ obj: this.sky, factor: 0 });

    // Sun (slow drift)
    this.sun = scene.add.image(180, 130, TEXTURES.sun()).setScale(2.2);
    this.layers.push({ obj: this.sun, factor: 0.05 });

    // Halo glow ring
    this.sunHalo = scene.add
      .circle(180, 130, 90, PALETTE.uiAccent, 0.06)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Mountains
    this.mountainFar = scene.add
      .image(scene.scale.width / 2 - 220, scene.scale.height - 220, TEXTURES.mountain())
      .setOrigin(0.5, 1)
      .setScale(1.4)
      .setAlpha(0.85);
    this.mountainNear = scene.add
      .image(scene.scale.width / 2 + 220, scene.scale.height - 180, TEXTURES.mountain())
      .setOrigin(0.5, 1)
      .setScale(1.8);
    this.layers.push({ obj: this.mountainFar, factor: 0.15 });
    this.layers.push({ obj: this.mountainNear, factor: 0.25 });

    // Drifting clouds — distributed across the sky at different depths.
    const cloudY = [40, 70, 95, 50, 110];
    const cloudX = [120, 320, 540, 760, 880];
    const cloudScales = [1.4, 1.0, 1.6, 1.2, 0.9];
    for (let i = 0; i < cloudY.length; i++) {
      const c = scene.add
        .image(cloudX[i], cloudY[i], TEXTURES.cloud())
        .setScale(cloudScales[i])
        .setAlpha(0.92);
      this.clouds.push({ obj: c, speed: 0.08 + Math.random() * 0.12, baseX: c.x });
    }

    // Hills band (a slightly darker grass strip behind foreground trees).
    this.hillBand = scene.add
      .rectangle(
        0,
        scene.scale.height - 110,
        scene.scale.width * 2,
        80,
        PALETTE.grassDark,
        1
      )
      .setOrigin(0, 0);
    this.layers.push({ obj: this.hillBand, factor: 0.5 });

    // Foreground ground (grass)
    this.ground = scene.add
      .rectangle(
        0,
        scene.scale.height - 70,
        scene.scale.width * 2,
        90,
        PALETTE.grassLight,
        1
      )
      .setOrigin(0, 0);

    // Path strip across the middle ground
    this.path = scene.add
      .rectangle(
        scene.scale.width / 2 - 220,
        scene.scale.height - 78,
        440,
        24,
        PALETTE.dirt,
        1
      )
      .setOrigin(0, 0)
      .setAngle(-4);

    // House on the right
    this.house = scene.add
      .image(scene.scale.width - 200, scene.scale.height - 158, TEXTURES.house())
      .setScale(2.2)
      .setOrigin(0.5, 1);

    // Fences (a few segments along the foreground)
    for (let i = 0; i < 5; i++) {
      scene.add
        .image(80 + i * 90, scene.scale.height - 88, TEXTURES.fence())
        .setScale(1.6)
        .setOrigin(0, 1);
    }

    // Trees scattered
    const treePositions = [
      { x: 60, y: scene.scale.height - 90, scale: 2.2, type: 'oak' },
      { x: 220, y: scene.scale.height - 90, scale: 1.9, type: 'pine' },
      { x: 360, y: scene.scale.height - 90, scale: 2.4, type: 'oak' },
      { x: 480, y: scene.scale.height - 90, scale: 2.0, type: 'pine' },
      { x: 600, y: scene.scale.height - 90, scale: 2.3, type: 'oak' },
      { x: 720, y: scene.scale.height - 90, scale: 1.9, type: 'pine' },
    ];
    for (const t of treePositions) {
      const key = t.type === 'pine' ? TEXTURES.treePine() : TEXTURES.treeOak();
      scene.add
        .image(t.x, t.y, key)
        .setScale(t.scale)
        .setOrigin(0.5, 1);
    }

    // Grass tufts and flowers along the very front
    for (let x = 0; x < scene.scale.width; x += 18) {
      if (Math.random() < 0.4) {
        scene.add
          .image(x + (Math.random() * 6 - 3), scene.scale.height - 22, TEXTURES.grassTuft())
          .setScale(1 + Math.random() * 0.5)
          .setOrigin(0.5, 1);
      }
      if (Math.random() < 0.12) {
        scene.add
          .image(x + (Math.random() * 6 - 3), scene.scale.height - 22, TEXTURES.flower())
          .setScale(1.4)
          .setOrigin(0.5, 1);
      }
    }

    // Sparkles drifting in the air
    for (let i = 0; i < 14; i++) {
      const s = scene.add
        .image(
          Math.random() * scene.scale.width,
          60 + Math.random() * (scene.scale.height - 200),
          TEXTURES.sparkle()
        )
        .setScale(2)
        .setAlpha(0.5 + Math.random() * 0.5)
        .setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: s,
        alpha: { from: 0.2, to: 1 },
        yoyo: true,
        repeat: -1,
        duration: 1500 + Math.random() * 1500,
        ease: 'Sine.easeInOut',
      });
      scene.tweens.add({
        targets: s,
        x: s.x + (Math.random() * 30 - 15),
        duration: 3000 + Math.random() * 2500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.sparkles.push(s);
    }
  }

  update(time, delta, pointer) {
    // Drift clouds
    for (const c of this.clouds) {
      c.obj.x += c.speed * (delta / 16);
      if (c.obj.x > this.scene.scale.width + 80) {
        c.obj.x = -80;
      }
    }

    // Subtle sun pulse
    const t = time * 0.001;
    const sunScale = 2.2 + Math.sin(t * 0.7) * 0.05;
    this.sun.setScale(sunScale);

    // Cursor follows the sun glow softly
    if (pointer) {
      const haloAlpha =
        0.05 + 0.04 * (1 + Math.sin(t * 1.2)) * 0.5 + 0.02 * (pointer.y / this.scene.scale.height);
      this.sunHalo.setAlpha(Math.max(0.04, Math.min(0.18, haloAlpha)));
    }

    // Slow vertical sway on foreground grass band (cheap "wind")
    this.ground.y =
      this.scene.scale.height - 70 + Math.sin(t * 0.6) * 0.4;
    this.path.y = this.scene.scale.height - 78 + Math.sin(t * 0.7) * 0.3;
  }
}