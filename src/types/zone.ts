/**
 * zone.ts
 * 副本、区域、野墓的类型定义
 */
import type { Element } from './character';

/** 勘探员等级 */
export type ExplorerRank = 'novice' | 'rank3' | 'rank2' | 'rank1' | 'special';

/** 区域类型 */
export type ZoneType = 'main_story' | 'side_quest' | 'dlc' | 'base' | 'wild_tomb' | 'endgame';

/** Boss 护盾配置 */
export interface BossShieldConfig {
  primary: Element;     // 主护盾属性
  secondary?: Element;  // 副护盾属性
  breakWith: Element[]; // 用于破盾的属性
}

/** Boss 专属机制 */
export interface BossMechanic {
  id: string;
  name: string;
  description: string;
  triggerEvery?: number;    // 每N回合触发
  triggerHpPct?: number;    // 降至N%血量时触发
  requiredPartnerId?: string; // 需要特定伙伴在场才触发
}

/** Boss 配置 */
export interface BossConfig {
  id: string;
  name: string;
  title: string;          // Boss 称号
  appearance: string;     // 外观描述
  element: Element;
  shield: BossShieldConfig;
  mechanics: BossMechanic[];
  sanDmgOnAppear: number; // 出现时的恐惧San值伤害
}

/** 小怪配置 */
export interface MobConfig {
  id: string;
  name: string;
  element: Element;
  description: string;
  specialTraits: string[]; // 特殊词条（如"死后爆炸"）
}

/** 区域基础环境修正 */
export interface ZoneEnvironment {
  sanDrainPerStep: number;    // 每步扣除San值
  elementDistortion: Partial<Record<Element, number>>; // 属性系数修正
  mutationThresholdTurns: number; // 突变倒计时（默认3）
  hasTimePressure?: boolean;  // 是否有回合限制（深海高压）
  timePressureMaxTurns?: number;
}

/** 主线/支线区域 */
export interface Zone {
  id: string;
  name: string;
  uiDescription: string;     // 加载界面 UI 描述文本
  type: ZoneType;
  chapter?: number;           // 对应主线章节
  minRank: ExplorerRank;      // 最低勘探员等级要求
  abyssLevel: number;         // 渊化等级 (0-5)
  fiveElements: Element[];    // 主导五行属性
  environment: ZoneEnvironment;
  boss?: BossConfig;
  mobs: MobConfig[];
  requiredPartnerIds?: string[]; // 强制携带的伙伴
  storyFlags: {               // 解锁/触发条件
    required: string[];       // 进入前需要的Flag
    unlock: string[];         // 通关后解锁的Flag
  };
  coreDrops: string[];        // 核心掉落物 ID
}

/** 动态野墓配置 */
export interface WildTomb {
  id: string;
  name: string;
  sceneType: string;          // 场景类型参考（如"废弃矿井"）
  element: Element;
  rankRange: [ExplorerRank, ExplorerRank]; // 难度范围
  sanDrainRate: 'low' | 'medium' | 'high' | 'extreme';
  coreDropFocus: string[];    // 主要产出方向
  eliteBossId: string;        // 核心精英怪/Boss
  mobTraits: string[];        // 小怪特性简述
}

/** 无尽肉鸽词缀 */
export interface RogueModifier {
  id: string;
  name: string;
  description: string;
  type: 'negative' | 'positive' | 'neutral';
}
