/**
 * SanitySystem.ts
 * San 值（理智）状态机
 */
import type { BattleUnit } from '../types/combat';

/** San 值阈值 */
export const SAN_THRESHOLDS = {
  CRAZY: 0.3,      // 低于30%进入疯狂状态
  STRESSED: 0.5,   // 低于50%进入压迫状态（UI红色警告）
  SECURE: 0.7,     // 高于70%为安全状态
} as const;

/** 疯狂状态触发的随机行为 */
export type CrazyBehavior =
  | 'attack_ally'     // 攻击随机队友
  | 'skill_misfire'   // 技能随机乱放（对错误目标）
  | 'skip_turn'       // 拒绝行动（罢工）
  | 'use_item_random' // 随机使用背包道具
  | 'flee_attempt';   // 尝试逃跑（不一定成功）

const CRAZY_BEHAVIORS: CrazyBehavior[] = [
  'attack_ally',
  'skill_misfire',
  'skip_turn',
  'attack_ally',  // 权重更高
  'skip_turn',
  'flee_attempt',
];

/**
 * 扣除 San 值并更新疯狂状态
 * @returns 更新后的 unit
 */
export function drainSanity(
  unit: BattleUnit,
  amount: number
): BattleUnit {
  const newSan = Math.max(0, unit.currentSan - amount);
  const isCrazy = newSan / unit.maxSan < SAN_THRESHOLDS.CRAZY;
  return { ...unit, currentSan: newSan, isCrazy };
}

/**
 * 恢复 San 值
 */
export function restoreSanity(
  unit: BattleUnit,
  amount: number
): BattleUnit {
  const newSan = Math.min(unit.maxSan, unit.currentSan + amount);
  const isCrazy = newSan / unit.maxSan < SAN_THRESHOLDS.CRAZY;
  return { ...unit, currentSan: newSan, isCrazy };
}

/**
 * 决定疯狂行为（当 unit.isCrazy 时调用）
 * 返回 null 表示本次仍旧正常行动
 */
export function rollCrazyBehavior(unit: BattleUnit): CrazyBehavior | null {
  if (!unit.isCrazy) return null;
  // San值越低，触发疯狂的概率越高
  const sanPct = unit.currentSan / unit.maxSan;
  const triggerChance = 1 - sanPct / SAN_THRESHOLDS.CRAZY; // 0~1
  if (Math.random() > triggerChance) return null;
  const idx = Math.floor(Math.random() * CRAZY_BEHAVIORS.length);
  return CRAZY_BEHAVIORS[idx];
}

/**
 * 获取 San 值的 UI 状态
 */
export function getSanStatus(unit: BattleUnit): 'secure' | 'stressed' | 'crazy' {
  const pct = unit.currentSan / unit.maxSan;
  if (pct < SAN_THRESHOLDS.CRAZY) return 'crazy';
  if (pct < SAN_THRESHOLDS.STRESSED) return 'stressed';
  return 'secure';
}

/**
 * 计算环境 San 值扣除（每步行进）
 */
export function calcEnvironmentSanDrain(
  baseDrain: number,
  partnersCount: number,
  hasLightSource: boolean
): number {
  let drain = baseDrain;
  // 人多了会互相鼓励，轻微减少San消耗
  if (partnersCount >= 3) drain *= 0.9;
  // 有光源道具可以显著减少San消耗
  if (hasLightSource) drain *= 0.6;
  return Math.round(drain);
}
