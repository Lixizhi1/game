import { ClassType, ItemType } from './types';

export const MAP_WIDTH = 3000;
export const MAP_HEIGHT = 3000;
export const TILE_SIZE = 50;

// Zone constants are no longer used for logic, but kept to prevent import errors if referenced
export const ZONE_SHRINK_RATE = 0; 
export const INITIAL_ZONE_RADIUS = 5000;

export const CLASS_CONFIG = {
  [ClassType.ASSAULT]: {
    hp: 120,
    speed: 4.5,
    ability: '冲刺',
    desc: '高耐久，速度均衡。初始携带步枪。',
    color: '#3b82f6'
  },
  [ClassType.SUPPORT]: {
    hp: 150,
    speed: 3.5,
    ability: '自愈',
    desc: '高生命值，携带额外补给。初始携带霰弹枪。',
    color: '#22c55e'
  },
  [ClassType.RECON]: {
    hp: 80,
    speed: 5.5,
    ability: '隐身',
    desc: '速度快，脆弱。狙击配置。可短暂隐身。',
    color: '#eab308'
  },
  [ClassType.ENGINEER]: {
    hp: 100,
    speed: 4.0,
    ability: '无人机轰炸',
    desc: '战术专家。火箭筒与科技装备。',
    color: '#f97316'
  }
};

export const ITEM_CONFIG = {
  [ItemType.AMMO]: { value: 0, weight: 1, color: '#94a3b8' },
  [ItemType.MEDKIT]: { value: 50, weight: 2, color: '#ef4444' },
  [ItemType.LOOT_COMMON]: { value: 500, weight: 3, color: '#a8a29e' },
  [ItemType.LOOT_RARE]: { value: 1500, weight: 4, color: '#8b5cf6' },
  [ItemType.LOOT_GOLD]: { value: 5000, weight: 8, color: '#fbbf24' },
  [ItemType.MANDEL_BRICK]: { value: 50000, weight: 15, color: '#dc2626' }, // High Risk High Reward
};

export const EXTRACTION_TIME = 3000; // Modified to 3 seconds
export const MANDEL_DECODE_TIME = 180; // 3 seconds @ 60fps
