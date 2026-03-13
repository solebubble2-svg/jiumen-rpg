/**
 * CombatEngine.ts
 * 回合制战斗循环核心
 */
import type { BattleState, BattleUnit, BattleAction, DamageResult } from '../types/combat';
import type { Element } from '../types/character';
import { getElementMultiplier, calcShieldDamage } from './ElementSystem';
import { drainSanity, rollCrazyBehavior } from './SanitySystem';

// ─────────────────────────────────────────────
// 伤害计算
// ─────────────────────────────────────────────

/**
 * 计算单次伤害结果
 */
export function calcDamage(
  attacker: BattleUnit,
  defender: BattleUnit,
  skillDmgMulti: number,
  skillSanDmg: number,
  state: BattleState
): DamageResult {
  // 1. 命中判定
  const hitRoll = Math.random();
  if (hitRoll > (attacker.stats.accuracy - defender.stats.dodge)) {
    return { baseDmg: 0, elementBonus: 0, shieldAbsorbed: 0, finalDmg: 0, isCrit: false, sanDmg: 0, statusApplied: [] };
  }

  // 2. 基础伤害
  const baseDmg = Math.max(1, attacker.stats.atk * skillDmgMulti - defender.stats.def * 0.3);

  // 3. 五行克制加成
  const elemMult = getElementMultiplier(attacker.element, defender.element, state.elementDistortion);
  const afterElem = baseDmg * elemMult;
  const elementBonus = afterElem - baseDmg;

  // 4. 暴击判定
  const isCrit = Math.random() < attacker.stats.crit;
  const afterCrit = isCrit ? afterElem * attacker.stats.critDmg : afterElem;

  // 5. 护盾吸收（处理护盾队列，按序消耗）
  let remaining = afterCrit;
  let shieldAbsorbed = 0;
  const updatedShields = [...defender.shields];

  for (let i = 0; i < updatedShields.length && remaining > 0; i++) {
    const shield = updatedShields[i];
    // 判断攻击是否能破该属性护盾
    const dmgToShield = calcShieldDamage(attacker.element, shield.element, remaining);
    if (dmgToShield > 0) {
      const layersBroken = Math.min(dmgToShield, shield.layers);
      shield.layers -= layersBroken;
      // 每层护盾吸收固定伤害（可配置）
      const absorbed = layersBroken * 80;
      shieldAbsorbed += absorbed;
      remaining = Math.max(0, remaining - absorbed);
      if (shield.layers <= 0) {
        updatedShields.splice(i, 1);
        i--;
      }
    }
  }

  const finalDmg = Math.round(Math.max(0, remaining));
  const sanDmg = Math.round(skillSanDmg * (isCrit ? 1.5 : 1));

  return {
    baseDmg: Math.round(baseDmg),
    elementBonus: Math.round(elementBonus),
    shieldAbsorbed: Math.round(shieldAbsorbed),
    finalDmg,
    isCrit,
    sanDmg,
    statusApplied: [],
  };
}

// ─────────────────────────────────────────────
// 回合处理
// ─────────────────────────────────────────────

/**
 * 处理玩家行动
 * @returns 更新后的战斗状态
 */
export function processPlayerAction(
  state: BattleState,
  action: BattleAction
): BattleState {
  const actor = [...state.playerUnits].find(u => u.id === action.actorId);
  if (!actor || !actor.isAlive) return state;

  // 检查疯狂状态——可能行动被覆盖
  const crazyResult = rollCrazyBehavior(actor);
  if (crazyResult === 'skip_turn') {
    return addLog(state, actor.name, `陷入恐慌，无法行动！`, 'system');
  }
  if (crazyResult === 'attack_ally') {
    // 随机攻击一名存活队友
    const aliveAllies = state.playerUnits.filter(u => u.isAlive && u.id !== actor.id);
    if (aliveAllies.length > 0) {
      const target = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
      return applyDamageToUnit(state, actor, target, 0.5, 5, true);
    }
  }

  // 正常行动：对每个目标应用伤害
  let newState = { ...state };
  for (const targetId of action.targetIds) {
    const target = [...newState.playerUnits, ...newState.enemyUnits].find(u => u.id === targetId);
    if (!target || !target.isAlive) continue;
    const isEnemy = newState.enemyUnits.some(u => u.id === targetId);
    newState = applyDamageToUnit(newState, actor, target, 1.0, 0, isEnemy);
  }
  return newState;
}

/**
 * 回合结束处理：环境San值扣除、渊化突变检查、状态效果tick
 */
export function processRoundEnd(state: BattleState): BattleState {
  let newState = { ...state, turnCount: state.turnCount + 1 };

  // 1. 环境 San 值扣除（全体我方）
  newState = {
    ...newState,
    playerUnits: newState.playerUnits.map(unit => {
      if (!unit.isAlive) return unit;
      return drainSanity(unit, newState.environmentSanDrain);
    }),
  };

  // 2. 敌方渊化突变检查
  newState = {
    ...newState,
    enemyUnits: newState.enemyUnits.map(unit => {
      if (!unit.isAlive) return unit;
      if (unit.mutationTurnsLeft <= 0) return unit; // 已突变
      const newTurns = unit.mutationTurnsLeft - 1;
      if (newTurns <= 0) {
        // 突变！回满血并记录日志
        newState = addLog(newState, unit.name, `吸入浓缩孢子！发生渊化突变！`, 'system');
        return {
          ...unit,
          currentHp: unit.maxHp,
          mutationTurnsLeft: -1, // -1 = 已突变
          stats: { ...unit.stats, atk: Math.round(unit.stats.atk * 1.5) },
        };
      }
      return { ...unit, mutationTurnsLeft: newTurns };
    }),
  };

  // 3. 状态效果 tick（DoT 伤害）
  newState = processStatusTicks(newState);

  // 4. 胜负判断
  const allEnemiesDead = newState.enemyUnits.every(u => !u.isAlive);
  const allPlayersDead = newState.playerUnits.every(u => !u.isAlive);

  if (allEnemiesDead) return { ...newState, phase: 'victory' };
  if (allPlayersDead) return { ...newState, phase: 'defeat' };

  return { ...newState, phase: 'player_action' };
}

// ─────────────────────────────────────────────
// 内部工具函数
// ─────────────────────────────────────────────

function applyDamageToUnit(
  state: BattleState,
  attacker: BattleUnit,
  target: BattleUnit,
  dmgMulti: number,
  sanDmg: number,
  isEnemy: boolean
): BattleState {
  const result = calcDamage(attacker, target, dmgMulti, sanDmg, state);
  const updatedTarget = {
    ...target,
    currentHp: Math.max(0, target.currentHp - result.finalDmg),
    currentSan: Math.max(0, target.currentSan - result.sanDmg),
    isAlive: target.currentHp - result.finalDmg > 0,
  };

  const msg = result.isCrit
    ? `${attacker.name} 暴击 ${target.name}！造成 ${result.finalDmg} 伤害${result.shieldAbsorbed > 0 ? `（盾吸收${result.shieldAbsorbed}）` : ''}！`
    : `${attacker.name} 攻击 ${target.name}，造成 ${result.finalDmg} 伤害。`;

  const newState = addLog(state, attacker.name, msg, 'damage');

  if (isEnemy) {
    return { ...newState, enemyUnits: newState.enemyUnits.map(u => u.id === target.id ? updatedTarget : u) };
  } else {
    return { ...newState, playerUnits: newState.playerUnits.map(u => u.id === target.id ? updatedTarget : u) };
  }
}

function processStatusTicks(state: BattleState): BattleState {
  const tickUnits = (units: BattleUnit[]): BattleUnit[] =>
    units.map(unit => {
      if (!unit.isAlive) return unit;
      let hp = unit.currentHp;
      let san = unit.currentSan;
      const newEffects = unit.statusEffects
        .map(eff => {
          if (eff.type.startsWith('dot_')) {
            if (eff.type === 'dot_sanity') san = Math.max(0, san - eff.value);
            else hp = Math.max(0, hp - eff.value);
          }
          return { ...eff, duration: eff.duration > 0 ? eff.duration - 1 : eff.duration };
        })
        .filter(eff => eff.duration !== 0);
      return { ...unit, currentHp: hp, currentSan: san, isAlive: hp > 0, statusEffects: newEffects };
    });

  return {
    ...state,
    playerUnits: tickUnits(state.playerUnits),
    enemyUnits: tickUnits(state.enemyUnits),
  };
}

function addLog(state: BattleState, _actor: string, message: string, type: BattleState['log'][0]['type']): BattleState {
  return {
    ...state,
    log: [...state.log, { turn: state.turnCount, message, type }],
  };
}

/** 初始化一场战斗 */
export function initBattle(
  playerUnits: BattleUnit[],
  enemyUnits: BattleUnit[],
  zoneId: string,
  environmentSanDrain: number,
  elementDistortion: Partial<Record<Element, number>> = {}
): BattleState {
  return {
    turnCount: 1,
    phase: 'player_action',
    playerUnits,
    enemyUnits,
    zoneId,
    environmentSanDrain,
    elementDistortion,
    log: [{ turn: 0, message: '战斗开始！', type: 'system' }],
  };
}
