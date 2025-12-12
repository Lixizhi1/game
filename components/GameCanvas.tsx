import React, { useEffect, useRef } from 'react';
import { GameState, ClassType, ItemType, Item, PlayerStats, MinimapData } from '../types';
import { 
  MAP_WIDTH, MAP_HEIGHT, 
  CLASS_CONFIG, ITEM_CONFIG, EXTRACTION_TIME, MANDEL_DECODE_TIME 
} from '../constants';

// Access global p5 from script tags
const p5 = (window as any).p5;

interface GameCanvasProps {
  gameState: GameState;
  selectedClass: ClassType;
  difficulty: number;
  onUpdateHUD: (stats: PlayerStats, inventory: Item[], msg: string | null, zoneTime: number, extTime: number, minimap: MinimapData) => void;
  onGameOver: (finalStats: PlayerStats, extracted: boolean) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, selectedClass, difficulty, onUpdateHUD, onGameOver }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Instance = useRef<any>(null);

  // Refs for game state accessible inside closure
  const gameStateRef = useRef(gameState);
  const selectedClassRef = useRef(selectedClass);
  const difficultyRef = useRef(difficulty);
  const droppedItemRef = useRef<number | null>(null);

  // Mobile Input Refs
  const mobileMoveRef = useRef({ x: 0, y: 0 });
  const mobileAimRef = useRef({ x: 0, y: 0 });
  const isMobileFiringRef = useRef(false);

  // Sync props to refs
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { selectedClassRef.current = selectedClass; }, [selectedClass]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  // Restart game logic when entering PLAYING state
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      if (p5Instance.current && typeof p5Instance.current.resetGame === 'function') {
        p5Instance.current.resetGame();
      }
    }
  }, [gameState]);

  // Event Listeners for UI interaction
  useEffect(() => {
    const handleDrop = (e: CustomEvent) => { droppedItemRef.current = e.detail.index; };
    
    // Mobile Control Listeners
    const handleMobileMove = (e: CustomEvent) => { mobileMoveRef.current = e.detail; };
    const handleMobileAim = (e: CustomEvent) => { mobileAimRef.current = e.detail; };
    const handleMobileFire = (e: CustomEvent) => { isMobileFiringRef.current = e.detail.pressed; };
    
    // We bind interact to a global dispatch in p5 instance, but here we can just set a flag or trigger directly
    // Since p5 loop is running, we can just trigger the interact check function if it were exposed, 
    // or set a "interactPressed" flag for one frame.
    // Easier way: expose tryInteract on p5 instance and call it.
    const handleMobileInteract = () => { 
        if (p5Instance.current && p5Instance.current.tryInteract) {
            p5Instance.current.tryInteract();
        }
    };

    window.addEventListener('drop-item', handleDrop as EventListener);
    window.addEventListener('mobile-move', handleMobileMove as EventListener);
    window.addEventListener('mobile-aim', handleMobileAim as EventListener);
    window.addEventListener('mobile-fire', handleMobileFire as EventListener);
    window.addEventListener('mobile-interact', handleMobileInteract as EventListener);

    return () => {
      window.removeEventListener('drop-item', handleDrop as EventListener);
      window.removeEventListener('mobile-move', handleMobileMove as EventListener);
      window.removeEventListener('mobile-aim', handleMobileAim as EventListener);
      window.removeEventListener('mobile-fire', handleMobileFire as EventListener);
      window.removeEventListener('mobile-interact', handleMobileInteract as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !p5) return;

    const sketch = (p: any) => {
      // --- Game Entities ---
      let player: any;
      let enemies: any[] = [];
      let loot: any[] = [];
      let obstacles: any[] = [];
      let bullets: any[] = [];
      let particles: any[] = [];
      let extractionPoints: any[] = [];
      
      // --- Game Variables ---
      let cameraOffset: any;
      let gameTime = 0;
      let extractionTimer = 0;
      let mandelDecodeTimer = 0;
      let isExtracting = false;
      let hudUpdateCounter = 0;
      let mandelPickedUp = false;
      let alertLevel = 0;
      let currentMessage: string | null = null;
      let messageTimer = 0;
      let lastFireTime = 0;
      
      // Sounds
      let sfxShoot: any, sfxHit: any, sfxPickup: any, sfxAlarm: any;

      // ... (Map Generation functions same as before)
      const generateMap = () => {
        obstacles = [];
        obstacles.push({ x: -50, y: -50, w: MAP_WIDTH + 100, h: 50 });
        obstacles.push({ x: -50, y: MAP_HEIGHT, w: MAP_WIDTH + 100, h: 50 });
        obstacles.push({ x: -50, y: 0, w: 50, h: MAP_HEIGHT });
        obstacles.push({ x: MAP_WIDTH, y: 0, w: 50, h: MAP_HEIGHT });

        for (let i = 0; i < 60; i++) {
          let w = p.random(100, 300);
          let h = p.random(100, 300);
          let x = p.random(100, MAP_WIDTH - w - 100);
          let y = p.random(100, MAP_HEIGHT - h - 100);
          if (p.dist(x, y, MAP_WIDTH/2, MAP_HEIGHT/2) > 500) {
            obstacles.push({ x, y, w, h });
          }
        }
      };

      const spawnLoot = () => {
        loot = [];
        for (let i = 0; i < 40; i++) loot.push(createItem(p.random(MAP_WIDTH), p.random(MAP_HEIGHT), ItemType.LOOT_COMMON));
        for (let i = 0; i < 15; i++) loot.push(createItem(p.random(MAP_WIDTH), p.random(MAP_HEIGHT), ItemType.LOOT_RARE));
        for (let i = 0; i < 20; i++) loot.push(createItem(p.random(MAP_WIDTH), p.random(MAP_HEIGHT), ItemType.MEDKIT));
        for (let i = 0; i < 40; i++) loot.push(createItem(p.random(MAP_WIDTH), p.random(MAP_HEIGHT), ItemType.AMMO));
        loot.push(createItem(MAP_WIDTH/2, MAP_HEIGHT/2, ItemType.MANDEL_BRICK));
      };

      const spawnEnemies = (count: number, isBossWave: boolean = false) => {
        for (let i = 0; i < count; i++) {
          let x, y;
          if (isBossWave) {
            let angle = p.random(p.TWO_PI);
            x = player.pos.x + p.cos(angle) * 800;
            y = player.pos.y + p.sin(angle) * 800;
          } else {
            x = p.random(MAP_WIDTH);
            y = p.random(MAP_HEIGHT);
          }
          enemies.push(createEnemy(x, y, isBossWave ? 2 : 1));
        }
      };

      const spawnExtractions = () => {
        extractionPoints = [];
        for(let i=0; i<2; i++) {
          let side = p.floor(p.random(4));
          let x, y;
          if (side === 0) { x = p.random(MAP_WIDTH); y = 100; }
          else if (side === 1) { x = MAP_WIDTH - 100; y = p.random(MAP_HEIGHT); }
          else if (side === 2) { x = p.random(MAP_WIDTH); y = MAP_HEIGHT - 100; }
          else { x = 100; y = p.random(MAP_HEIGHT); }
          extractionPoints.push({ pos: p.createVector(x, y), active: true, r: 150 });
        }
      };

      const createItem = (x: number, y: number, type: ItemType) => {
        const conf = ITEM_CONFIG[type];
        return {
          id: p.random(100000).toString(),
          pos: p.createVector(x, y),
          type,
          value: conf.value,
          weight: conf.weight,
          color: conf.color,
          bobOffset: p.random(100)
        };
      };

      const createEnemy = (x: number, y: number, tier: number) => {
        return {
          pos: p.createVector(x, y),
          vel: p.createVector(0, 0),
          hp: tier === 2 ? 200 : 60,
          maxHp: tier === 2 ? 200 : 60,
          tier, 
          state: 'IDLE',
          lastShot: 0,
          angle: 0
        };
      };

      const resetGame = () => {
        const cls = CLASS_CONFIG[selectedClassRef.current];
        generateMap();

        let spawnX, spawnY;
        let safeSpawn = false;
        let attempts = 0;
        
        while (!safeSpawn && attempts < 100) {
          spawnX = p.random(200, MAP_WIDTH - 200);
          spawnY = p.random(200, MAP_HEIGHT - 200);
          if (!checkCollision(spawnX, spawnY)) safeSpawn = true;
          attempts++;
        }

        player = {
          pos: p.createVector(spawnX, spawnY),
          vel: p.createVector(0, 0),
          hp: cls.hp,
          maxHp: cls.hp,
          ammo: 60,
          maxAmmo: 120,
          inventory: [] as Item[],
          weight: 0,
          maxWeight: 50,
          score: 0,
          speed: cls.speed
        };

        spawnLoot();
        spawnEnemies(10 * difficultyRef.current);
        spawnExtractions();
        
        gameTime = 0;
        extractionTimer = 0;
        mandelDecodeTimer = 0;
        mandelPickedUp = false;
        alertLevel = 0;
        particles = [];
        bullets = [];
        currentMessage = null;
        
        // Reset Mobile inputs
        mobileMoveRef.current = { x: 0, y: 0 };
        mobileAimRef.current = { x: 0, y: 0 };
        isMobileFiringRef.current = false;
      };

      p.setup = () => {
        p.createCanvas(window.innerWidth, window.innerHeight).parent(containerRef.current!);
        cameraOffset = p.createVector(0, 0);
        
        try {
          sfxShoot = new p5.Oscillator('square');
          sfxHit = new p5.Oscillator('sawtooth');
          sfxPickup = new p5.Oscillator('sine');
          sfxAlarm = new p5.Oscillator('triangle');
        } catch(e) {}
        
        resetGame();
      };
      
      p.resetGame = resetGame;

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
      };

      p.draw = () => {
        if (gameStateRef.current !== GameState.PLAYING) return;

        p.background(30);
        
        // Handle Inputs
        handleInput();

        // Handle Shooting (Auto-fire logic)
        if (player.ammo > 0) {
           // Allow mouse click hold OR mobile button hold
           // 10 frame cooldown = 6 shots/sec approx
           if ((p.mouseIsPressed || isMobileFiringRef.current) && p.frameCount - lastFireTime > 10) {
              shoot();
              lastFireTime = p.frameCount;
           }
        }

        // Update Physics
        updatePlayer();
        updateBullets();
        updateEnemies();
        updateParticles();
        
        // Camera Follow
        let targetCamX = player.pos.x - p.width / 2;
        let targetCamY = player.pos.y - p.height / 2;
        cameraOffset.x = p.lerp(cameraOffset.x, targetCamX, 0.1);
        cameraOffset.y = p.lerp(cameraOffset.y, targetCamY, 0.1);

        // --- Render World ---
        p.push();
        p.translate(-cameraOffset.x, -cameraOffset.y);

        // Draw Map
        p.stroke(40);
        p.strokeWeight(1);
        for(let x=0; x<MAP_WIDTH; x+=100) p.line(x, 0, x, MAP_HEIGHT);
        for(let y=0; y<MAP_HEIGHT; y+=100) p.line(0, y, MAP_WIDTH, y);

        // Draw Extraction Points
        extractionPoints.forEach(ep => {
          if (!ep.active) return;
          p.noStroke();
          p.fill(0, 255, 0, 50 + p.sin(p.frameCount * 0.1) * 20);
          p.ellipse(ep.pos.x, ep.pos.y, ep.r * 2);
          p.fill(0, 255, 0);
          p.textAlign(p.CENTER);
          p.text("撤离点 (停留3秒)", ep.pos.x, ep.pos.y);
        });

        // Draw Loot
        loot.forEach(l => {
          p.fill(l.color);
          p.noStroke();
          let bob = p.sin(p.frameCount * 0.1 + l.bobOffset) * 5;
          p.rect(l.pos.x - 10, l.pos.y - 10 + bob, 20, 20);
          if (l.type === ItemType.MANDEL_BRICK) {
             p.stroke(255, 200, 0, 150);
             p.noFill();
             p.ellipse(l.pos.x, l.pos.y, 40 + bob);
          }
        });

        // Draw Obstacles
        p.fill(50, 45, 40);
        p.stroke(20);
        p.strokeWeight(2);
        obstacles.forEach(o => {
          p.rect(o.x, o.y, o.w, o.h);
          p.fill(70, 65, 60);
          p.rect(o.x + 5, o.y + 5, o.w - 10, o.h - 10);
          p.fill(50, 45, 40);
        });

        // Draw Enemies
        enemies.forEach(e => {
          p.push();
          p.translate(e.pos.x, e.pos.y);
          p.rotate(e.angle);
          p.fill(e.tier === 2 ? 150 : 200, 50, 50);
          p.ellipse(0, 0, 30, 30);
          p.fill(100);
          p.rect(10, 5, 20, 5);
          p.pop();
          p.fill(255, 0, 0);
          p.rect(e.pos.x - 15, e.pos.y - 25, 30 * (e.hp / e.maxHp), 4);
        });

        // Draw Player
        p.push();
        p.translate(player.pos.x, player.pos.y);
        
        // Aim Rotation Logic
        let angle = 0;
        const mobileAim = mobileAimRef.current;
        if (Math.abs(mobileAim.x) > 0.1 || Math.abs(mobileAim.y) > 0.1) {
           angle = p.atan2(mobileAim.y, mobileAim.x);
        } else {
           angle = p.atan2(p.mouseY + cameraOffset.y - player.pos.y, p.mouseX + cameraOffset.x - player.pos.x);
        }
        
        p.rotate(angle);
        p.fill(CLASS_CONFIG[selectedClassRef.current].color);
        p.stroke(255);
        p.strokeWeight(2);
        p.ellipse(0, 0, 30, 30);
        p.fill(50);
        p.rect(10, 5, 25, 6);
        p.pop();
        
        if (mandelDecodeTimer > 0) {
           p.noStroke();
           p.fill(255, 255, 0);
           p.rect(player.pos.x - 20, player.pos.y - 40, 40 * (mandelDecodeTimer / MANDEL_DECODE_TIME), 6);
           p.stroke(0);
           p.noFill();
           p.rect(player.pos.x - 20, player.pos.y - 40, 40, 6);
        }

        // Draw Bullets
        p.stroke(255, 255, 0);
        p.strokeWeight(3);
        bullets.forEach(b => {
           p.line(b.pos.x, b.pos.y, b.pos.x - b.vel.x * 2, b.pos.y - b.vel.y * 2);
        });

        // Draw Particles
        p.noStroke();
        particles.forEach(pt => {
          p.fill(pt.r, pt.g, pt.b, pt.life);
          p.ellipse(pt.pos.x, pt.pos.y, pt.size);
        });

        p.pop();

        // --- Logic & Checks ---
        gameTime++;

        // Drop Item
        if (droppedItemRef.current !== null) {
           const idx = droppedItemRef.current;
           if (player.inventory[idx]) {
             const itm = player.inventory[idx];
             player.weight -= itm.weight;
             itm.pos = player.pos.copy();
             itm.bobOffset = p.random(100);
             itm.pos.x += p.random(-40, 40);
             itm.pos.y += p.random(-40, 40);
             loot.push(itm);
             player.inventory.splice(idx, 1);
           }
           droppedItemRef.current = null;
        }

        // Messages
        if (messageTimer > 0) {
          messageTimer--;
          if (messageTimer === 0) currentMessage = null;
        }

        // Extraction Logic
        isExtracting = false;
        extractionPoints.forEach(ep => {
          if (p.dist(player.pos.x, player.pos.y, ep.pos.x, ep.pos.y) < ep.r/2) {
             isExtracting = true;
          }
        });

        if (isExtracting) {
          extractionTimer += p.deltaTime;
          if (extractionTimer > EXTRACTION_TIME) {
             finishGame(true);
          }
        } else {
          if (extractionTimer > 0) extractionTimer -= p.deltaTime * 2;
          if (extractionTimer < 0) extractionTimer = 0;
        }
        
        hudUpdateCounter++;
        if (hudUpdateCounter % 10 === 0) {
          const minimap: MinimapData = {
            player: { x: player.pos.x, y: player.pos.y },
            enemies: enemies.map(e => ({ x: e.pos.x, y: e.pos.y })),
            extraction: extractionPoints.filter(ep => ep.active).map(ep => ({ x: ep.pos.x, y: ep.pos.y })),
            mandel: loot.find(l => l.type === ItemType.MANDEL_BRICK) ? { 
               x: loot.find(l => l.type === ItemType.MANDEL_BRICK).pos.x, 
               y: loot.find(l => l.type === ItemType.MANDEL_BRICK).pos.y 
            } : null,
            zoneRadius: 0
          };

          onUpdateHUD(
            { ...player, maxWeight: 50 }, 
            player.inventory,
            currentMessage,
            0,
            extractionTimer,
            minimap
          );
        }
      };

      // --- Helper Functions ---

      function handleInput() {
        let moveVec = p.createVector(0, 0);
        // Keyboard
        if (p.keyIsDown(87)) moveVec.y -= 1; // W
        if (p.keyIsDown(83)) moveVec.y += 1; // S
        if (p.keyIsDown(65)) moveVec.x -= 1; // A
        if (p.keyIsDown(68)) moveVec.x += 1; // D

        // Mobile Joystick Overrides
        if (mobileMoveRef.current.x !== 0 || mobileMoveRef.current.y !== 0) {
           moveVec.x = mobileMoveRef.current.x;
           moveVec.y = mobileMoveRef.current.y;
        } else {
           moveVec.normalize();
        }
        
        let speedMod = 1;
        if (player.weight > player.maxWeight) speedMod = 0.5;
        moveVec.mult(player.speed * speedMod);

        let nextX = player.pos.x + moveVec.x;
        let nextY = player.pos.y + moveVec.y;
        
        if (!checkCollision(nextX, player.pos.y)) player.pos.x = nextX;
        if (!checkCollision(player.pos.x, nextY)) player.pos.y = nextY;
      }

      function shoot() {
         if (p.getAudioContext().state !== 'running') p.getAudioContext().resume();
         
         player.ammo--;
         
         // Determine Aim Angle
         let angle = 0;
         const mobileAim = mobileAimRef.current;
         if (Math.abs(mobileAim.x) > 0.1 || Math.abs(mobileAim.y) > 0.1) {
             angle = p.atan2(mobileAim.y, mobileAim.x);
         } else {
             angle = p.atan2(p.mouseY + cameraOffset.y - player.pos.y, p.mouseX + cameraOffset.x - player.pos.x);
         }

         // Recoil
         angle += p.random(-0.05, 0.05);
         let vel = p.createVector(p.cos(angle), p.sin(angle)).mult(15);
         bullets.push({ pos: player.pos.copy(), vel, isPlayer: true });
         
         playSound(sfxShoot, 200, 0.1);
         
         cameraOffset.x += p.random(-5, 5);
         cameraOffset.y += p.random(-5, 5);
      }

      // Expose for mobile button
      p.tryInteract = tryInteract;

      p.keyPressed = () => {
         if (p.key === 'e' || p.key === 'E') {
            tryInteract();
         }
      };

      function tryInteract() {
        for (let i = loot.length - 1; i >= 0; i--) {
          if (p.dist(player.pos.x, player.pos.y, loot[i].pos.x, loot[i].pos.y) < 50) {
            let item = loot[i];
            
            if (item.type === ItemType.MANDEL_BRICK) {
               mandelDecodeTimer = 1;
               return; 
            }

            if (item.type === ItemType.AMMO) {
               player.ammo = Math.min(player.maxAmmo, player.ammo + 30);
               loot.splice(i, 1);
               playSound(sfxPickup, 600, 0.1);
               showMessage("+弹药");
            } else if (item.type === ItemType.MEDKIT) {
               player.hp = Math.min(player.maxHp, player.hp + 50);
               loot.splice(i, 1);
               playSound(sfxPickup, 600, 0.1);
               showMessage("+生命");
            } else {
               if (player.inventory.length < 10) {
                 player.inventory.push(item);
                 player.weight += item.weight;
                 player.score += item.value;
                 loot.splice(i, 1);
                 playSound(sfxPickup, 800, 0.1);
               } else {
                 showMessage("背包已满");
               }
            }
            return;
          }
        }
      }

      function updatePlayer() {
        if (mandelDecodeTimer > 0) {
          // Decoding logic
          // Support Keyboard Hold OR Mobile Button Hold? 
          // For now, mobile users tap interact to start, we can auto-continue or require hold.
          // Simplification: Triggering interaction starts the timer, but we need to check if still holding?
          // For mobile "E" replacement, we can make it a toggle or just require staying near?
          // Current logic requires holding E. 
          // Let's modify: if mandelDecodeTimer > 0, we increment it automatically as long as player is close and alive.
          // Or strictly require keydown.
          
          // Hybrid approach for mobile: 
          // If using keyboard, check key. If mobile, we assume they pressed button once to start, 
          // but we need to stop if they move away?
          
          // Let's stick to simple: Holding E key increments. 
          // Mobile: Holding the interact button? 
          // Since we use dispatch event for interact, it's a trigger.
          
          // CHANGE: For Mandel brick, if timer > 0, we auto-increment as long as player stands still near it?
          // Let's use the `p.keyIsDown(69)` check for PC.
          // For Mobile, we need a `isInteracting` state.
          // But `mobile-interact` event is a trigger.
          // Let's assume on mobile they just tap it and must stand still.
          
          // New logic: If timer started (1), increment until done or moved away.
          // Reset if player moves.
          
          if (mandelDecodeTimer === 1) { // Started
             mandelDecodeTimer = 2;
          } else if (mandelDecodeTimer > 1) {
             // Check movement
             if (p.abs(player.vel.x) > 0.1 || p.abs(player.vel.y) > 0.1 || (mobileMoveRef.current.x !==0)) {
                mandelDecodeTimer = 0; // Broken by movement
                showMessage("破译中断");
             } else {
                mandelDecodeTimer++;
                if (mandelDecodeTimer > MANDEL_DECODE_TIME) {
                   mandelDecodeTimer = 0;
                   mandelPickedUp = true;
                   alertLevel = 1;
                   showMessage("曼德尔砖已获取！快跑！");
                   let brickIdx = loot.findIndex(l => l.type === ItemType.MANDEL_BRICK);
                   if (brickIdx > -1) {
                     const brick = loot[brickIdx];
                     player.inventory.push(brick);
                     player.weight += brick.weight;
                     player.score += brick.value;
                     loot.splice(brickIdx, 1);
                   }
                   spawnEnemies(5, true); 
                   playSound(sfxAlarm, 400, 0.5, 'triangle');
                }
             }
          } else {
             // PC Legacy check fallback if someone holds E without triggering interact first?
             if (p.keyIsDown(69)) { 
                mandelDecodeTimer = Math.max(1, mandelDecodeTimer + 1);
             }
          }
        }
      }

      function updateEnemies() {
        enemies.forEach((e, idx) => {
           let d = p.dist(e.pos.x, e.pos.y, player.pos.x, player.pos.y);
           
           if (alertLevel === 1 || d < 400) {
             e.state = 'CHASE';
           }

           if (e.state === 'CHASE') {
             let dir = p5.Vector.sub(player.pos, e.pos);
             dir.normalize();
             e.angle = dir.heading();
             
             if (d > 150) {
               let nextX = e.pos.x + dir.x * 2;
               let nextY = e.pos.y + dir.y * 2;
               if (!checkCollision(nextX, nextY)) {
                 e.pos.x = nextX;
                 e.pos.y = nextY;
               }
             }

             if (d < 300 && p.frameCount - e.lastShot > 60) {
                e.lastShot = p.frameCount;
                let vel = p5.Vector.sub(player.pos, e.pos).normalize().mult(8);
                bullets.push({ pos: e.pos.copy(), vel, isPlayer: false });
                playSound(sfxShoot, 150, 0.1);
             }
           }
        });
      }

      function updateBullets() {
        for (let i = bullets.length - 1; i >= 0; i--) {
          let b = bullets[i];
          b.pos.add(b.vel);
          
          if (checkCollision(b.pos.x, b.pos.y)) {
             spawnParticles(b.pos.x, b.pos.y, 5, [200, 200, 200]);
             bullets.splice(i, 1);
             continue;
          }

          if (b.isPlayer) {
             for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                if (p.dist(b.pos.x, b.pos.y, e.pos.x, e.pos.y) < 20) {
                   e.hp -= 20;
                   spawnParticles(b.pos.x, b.pos.y, 10, [255, 0, 0]);
                   bullets.splice(i, 1);
                   playSound(sfxHit, 100, 0.1);
                   
                   if (e.hp <= 0) {
                      if (p.random() > 0.5) loot.push(createItem(e.pos.x, e.pos.y, ItemType.LOOT_COMMON));
                      enemies.splice(j, 1);
                   }
                   break;
                }
             }
          } else {
             if (p.dist(b.pos.x, b.pos.y, player.pos.x, player.pos.y) < 15) {
                damagePlayer(10);
                spawnParticles(b.pos.x, b.pos.y, 10, [255, 0, 0]);
                bullets.splice(i, 1);
                break;
             }
          }
          
          if (p.dist(b.pos.x, b.pos.y, player.pos.x, player.pos.y) > 1000) {
             bullets.splice(i, 1);
          }
        }
      }
      
      function updateParticles() {
        for(let i=particles.length-1; i>=0; i--) {
          let pt = particles[i];
          pt.pos.add(pt.vel);
          pt.life -= 10;
          if (pt.life <= 0) particles.splice(i, 1);
        }
      }

      function spawnParticles(x: number, y: number, count: number, color: number[]) {
         for(let i=0; i<count; i++) {
            particles.push({
               pos: p.createVector(x, y),
               vel: p.createVector(p.random(-2, 2), p.random(-2, 2)),
               life: 255,
               size: p.random(2, 5),
               r: color[0], g: color[1], b: color[2]
            });
         }
      }

      function checkCollision(x: number, y: number): boolean {
         if (x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) return true;
         for (let o of obstacles) {
            if (x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h) return true;
         }
         return false;
      }

      function damagePlayer(amount: number) {
         player.hp -= amount;
         if (player.hp <= 0) {
            finishGame(false);
         }
      }

      function finishGame(win: boolean) {
         if (win) {
            player.score += player.hp * 10;
            if (mandelPickedUp) player.score += 10000;
         } else {
            player.score = Math.floor(player.score * 0.5);
         }
         onGameOver(player, win);
      }
      
      function showMessage(msg: string) {
        currentMessage = msg;
        messageTimer = 120;
      }

      function playSound(osc: any, freq: number, dur: number, type: string = 'sine') {
         if (!osc) return;
         try {
           osc.setType(type);
           osc.freq(freq);
           osc.amp(0.1);
           osc.start();
           osc.amp(0, dur);
           setTimeout(() => osc.stop(), dur * 1000);
         } catch(e) {}
      }
    };

    p5Instance.current = new p5(sketch);

    return () => {
      p5Instance.current.remove();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
};

export default GameCanvas;