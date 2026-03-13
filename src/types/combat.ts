/**
 * combat.ts
 * 战斗系统核心类型定义
 */
import type { Element, SlotPosition, Stats, ElementShield } from './character';

/** 战斗状态效果（异常状态）*/
export interface StatusEffect {
  id: string;
  name: string;
  type: StatusEffectType;
  duration: number;     // 剩余回合数 (-1 = 永久)
  value: number;        // 效果数值（如每回合扣血量、降San值）
  element?: Element;    // 属性关联（如"潮湿"增加土属性伤害）
}

export type StatusEffectType =
  | 'dot_bleed'       // 流血（持续物理伤害）
  | 'dot_burn'        // 燃烧（持续火伤）
  | 'dot_poison'      // 中毒（持续木伤）
  | 'dot_sanity'      // 寄生（持续扣San）
  | 'debuff_panic'    // 恐慌（降低输出）
  | 'debuff_wet'      // 潮湿（增加受到土属性伤害）
  | 'debuff_frozen'   // 冻结（无法行动）
  | 'debuff_stun'     // 眩晕（跳过行动）
  | 'debuff_bind'     // 禁锢（无法移动战位）
  | 'debuff_armor_break' // 破甲（减少防御）
  | 'buff_shield'     // 护盾（吸收伤害）
  | 'buff_atk_up'     // 攻击提升
  | 'buff_san_guard'  // San值防爆盾
  | 'mutation';       // 渊化突变（怪物专属）

/** 战斗单位（敌我通用） */
export interface BattleUnit {
  id: string;
  name: string;
  slot: SlotPosition;
  element: Element;
  currentHp: number;
  maxHp: number;
  currentSan: number;
  maxSan: number;
  stats: Stats;
  shields: ElementShield[];     // 当前护盾队列
  statusEffects: StatusEffect[];
  isAlive: boolean;
  isCrazy: boolean;             // San值低于30%时进入疯狂状态
  mutationTurnsLeft: number;    // 渊化突变倒计时（0=已突变）
}

/** 回合制战斗状态 */
export interface BattleState {
  turnCount: number;
  phase: BattlePhase;
  playerUnits: BattleUnit[];    // 我方1-4号位
  enemyUnits: BattleUnit[];     // 敌方1-4号位
  zoneId: string;               // 当前所在区域ID
  environmentSanDrain: number;  // 每回合环境San值扣除量
  elementDistortion: Partial<Record<Element, number>>; // 五行扭曲系数
  log: BattleLog[];             // 战斗日志
}

export type BattlePhase = 'player_action' | 'enemy_action' | 'round_end' | 'victory' | 'defeat' | 'retreat';

/** 战斗行动 */
export interface BattleAction {
  actorId: string;
  skillId: string;
  targetIds: string[];
  dmgMulti?: number;
  sanDmg?: number;
}

/** 伤害计算结果 */
export interface DamageResult {
  baseDmg: number;
  elementBonus: number;   // 五行相克加成
  shieldAbsorbed: number; // 被护盾吸收的量
  finalDmg: number;
  isCrit: boolean;
  sanDmg: number;
  statusApplied: StatusEffect[];
}

/** 战斗日志条目 */
export interface BattleLog {
  turn: number;
  message: string;
  type: 'damage' | 'heal' | 'status' | 'shield_break' | 'san' | 'system';
}

/** 五行相克关系（相克倍率） */
export const ELEMENT_MULTIPLIER: Record<Element, Partial<Record<Element, number>>> = {
  metal:  { wood: 1.5, fire: 0.7 },  // 金克木
  wood:   { earth: 1.5, metal: 0.7 }, // 木克土
  water:  { fire: 1.5, earth: 0.7 },  // 水克火
  fire:   { metal: 1.5, water: 0.7 }, // 火克金
  earth:  { water: 1.5, wood: 0.7 },  // 土克水
  none:   {}
};
