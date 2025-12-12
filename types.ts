export enum GameState {
  MENU,
  PLAYING,
  EXTRACTED,
  DEAD
}

export enum ClassType {
  ASSAULT = '突击兵',
  SUPPORT = '支援兵',
  RECON = '侦察兵',
  ENGINEER = '工程兵'
}

export enum ItemType {
  AMMO = '弹药',
  MEDKIT = '医疗包',
  LOOT_COMMON = '废料',
  LOOT_RARE = '武器配件',
  LOOT_GOLD = '金条',
  MANDEL_BRICK = '曼德尔砖'
}

export interface Item {
  id: string;
  type: ItemType;
  value: number;
  weight: number;
  color: string;
  x?: number; // World position if on ground
  y?: number;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  speed: number;
  weight: number;
  maxWeight: number;
  score: number;
}

export interface HighScore {
  score: number;
  classType: string;
  date: string;
  extracted: boolean;
}

// Minimal P5 Vector interface for Typescript since we don't import P5 directly in types
export interface Vector2D {
  x: number;
  y: number;
}

export interface MinimapData {
  player: Vector2D;
  enemies: Vector2D[];
  extraction: Vector2D[];
  mandel: Vector2D | null;
  zoneRadius: number;
}