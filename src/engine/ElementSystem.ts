/**
 * ElementSystem.ts
 * 五行相克计算器
 */
import type { Element } from '../types/character';

/** 五行相克系数表：attacker -> defender -> multiplier */
const ELEMENT_TABLE: Record<Element, Partial<Record<Element, number>>> = {
  metal:  { wood: 1.5,  fire: 0.7  }, // 金克木，火克金（被克）
  wood:   { earth: 1.5, metal: 0.7 }, // 木克土，金克木（被克）
  water:  { fire: 1.5,  earth: 0.7  }, // 水克火，土克水（被克）
  fire:   { metal: 1.5, water: 0.7  }, // 火克金，水克火（被克）
  earth:  { water: 1.5, wood: 0.7  }, // 土克水，木克土（被克）
  none:   {},
};

/** 获取五行克制倍率 */
export function getElementMultiplier(
  attackerElem: Element,
  defenderElem: Element,
  distortion: Partial<Record<Element, number>> = {}
): number {
  const base = ELEMENT_TABLE[attackerElem][defenderElem] ?? 1.0;
  // 环境五行扭曲修正（如深海区域所有火系×0.2）
  const envMod = distortion[attackerElem] ?? 1.0;
  return base * envMod;
}

/** 判断是否克制（倍率 > 1） */
export function isElementStrong(attacker: Element, defender: Element): boolean {
  return (ELEMENT_TABLE[attacker][defender] ?? 1.0) > 1.0;
}

/** 判断破盾属性是否有效 */
export function canBreakShield(
  attackerElem: Element,
  shieldElem: Element
): boolean {
  // 五行相克才能破盾；使用相同属性攻击可以削减层数但效率降低
  return isElementStrong(attackerElem, shieldElem) || attackerElem === shieldElem;
}

/** 计算破盾后的护盾减少层数 */
export function calcShieldDamage(
  attackerElem: Element,
  shieldElem: Element,
  basePower: number
): number {
  if (isElementStrong(attackerElem, shieldElem)) {
    return Math.ceil(basePower / 50); // 克制属性破盾快
  }
  if (attackerElem === shieldElem) {
    return Math.ceil(basePower / 150); // 同属性破盾慢
  }
  return 0; // 非克制属性无法破盾
}

/** 五行属性中文名称 */
export const ELEMENT_NAMES: Record<Element, string> = {
  metal: '金',
  wood:  '木',
  water: '水',
  fire:  '火',
  earth: '土',
  none:  '无',
};

/** 五行属性颜色（用于UI渲染） */
export const ELEMENT_COLORS: Record<Element, string> = {
  metal: '#C0C0C0',
  wood:  '#4CAF50',
  water: '#2196F3',
  fire:  '#FF5722',
  earth: '#8D6E63',
  none:  '#9E9E9E',
};
