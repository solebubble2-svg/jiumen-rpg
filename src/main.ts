/**
 * main.ts — M1 战斗 Demo 入口
 * 九门江湖：长生录
 */
import './styles/combat.css';
import type { BattleUnit, BattleState, BattleAction } from './types/combat';
import {
  initBattle,
  processPlayerAction,
  processRoundEnd,
  calcDamage,
} from './engine/CombatEngine';
import { ELEMENT_NAMES, ELEMENT_COLORS } from './engine/ElementSystem';
import { getSanStatus } from './engine/SanitySystem';

// ─────────────────────────────────────────────
// 初始单位数据
// ─────────────────────────────────────────────

const PLAYER_UNITS: BattleUnit[] = [
  {
    id: 'chen', name: '陈砚秋', slot: 2, element: 'water',
    currentHp: 800, maxHp: 800, currentSan: 100, maxSan: 100,
    stats: { hp: 800, atk: 120, def: 80, spd: 10, sanity: 100, crit: 0.18, critDmg: 1.6, accuracy: 0.95, dodge: 0.1 },
    shields: [{ element: 'water', layers: 2, maxLayers: 2 }],
    statusEffects: [], isAlive: true, isCrazy: false, mutationTurnsLeft: 0,
  },
  {
    id: 'tang', name: '唐绫', slot: 4, element: 'metal',
    currentHp: 600, maxHp: 600, currentSan: 80, maxSan: 80,
    stats: { hp: 600, atk: 180, def: 50, spd: 12, sanity: 80, crit: 0.28, critDmg: 2.0, accuracy: 0.98, dodge: 0.15 },
    shields: [], statusEffects: [], isAlive: true, isCrazy: false, mutationTurnsLeft: 0,
  },
];

const ENEMY_UNITS: BattleUnit[] = [
  {
    id: 'passenger', name: '渊化乘客', slot: 1, element: 'earth',
    currentHp: 360, maxHp: 360, currentSan: 50, maxSan: 50,
    stats: { hp: 360, atk: 75, def: 40, spd: 6, sanity: 50, crit: 0.05, critDmg: 1.2, accuracy: 0.85, dodge: 0.05 },
    shields: [{ element: 'earth', layers: 1, maxLayers: 1 }],
    statusEffects: [], isAlive: true, isCrazy: false, mutationTurnsLeft: 3,
  },
  {
    id: 'gear_demon', name: '齿轮魔', slot: 3, element: 'water',
    currentHp: 280, maxHp: 280, currentSan: 40, maxSan: 40,
    stats: { hp: 280, atk: 90, def: 30, spd: 8, sanity: 40, crit: 0.08, critDmg: 1.3, accuracy: 0.88, dodge: 0.08 },
    shields: [], statusEffects: [], isAlive: true, isCrazy: false, mutationTurnsLeft: 3,
  },
];

// ─────────────────────────────────────────────
// 状态
// ─────────────────────────────────────────────
let state: BattleState = initBattle(PLAYER_UNITS, ENEMY_UNITS, 'zone_subway_0', 3, {});

// ─────────────────────────────────────────────
// DOM 渲染
// ─────────────────────────────────────────────

function render() {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div id="header">
      <h1>地下0号地铁站</h1>
      <span class="subtitle">M1 战斗引擎 Demo · 九门江湖：长生录</span>
    </div>

    <div id="battlefield">
      <div id="player-side">
        ${state.playerUnits.map(renderUnit).join('')}
      </div>
      <div class="vs-col">
        <div class="vs-text">⚔</div>
        <div class="turn-badge">第 ${state.turnCount} 回合</div>
        <div class="turn-badge" style="color:var(--san-low);border-color:var(--san-low)">
          环境San -${state.environmentSanDrain}/回合
        </div>
      </div>
      <div id="enemy-side">
        ${state.enemyUnits.map(renderUnit).join('')}
      </div>
    </div>

    <div id="controls">
      ${state.phase === 'player_action' ? `
        <button class="btn primary" id="btn-attack-all">⚡ 全力攻击（自动）</button>
        <button class="btn" id="btn-end-turn">跳过回合</button>
      ` : ''}
      ${state.phase === 'victory' || state.phase === 'defeat' ? `
        <button class="btn primary" id="btn-restart">🔁 重置战斗</button>
      ` : ''}
      ${state.phase === 'enemy_action' ? '<div style="color:var(--text-dim);font-size:0.8rem;padding:10px 0">敌方行动中...</div>' : ''}
    </div>

    <div id="log-panel">
      <div id="log-header">战斗日志</div>
      <div id="log-body">
        ${state.log.map(e => `
          <div class="log-entry log-${e.type}">
            <span style="color:var(--text-dim);font-size:0.7rem">[第${e.turn}回合]</span>
            ${e.message}
          </div>
        `).join('')}
      </div>
    </div>

    <div id="result-overlay" class="${state.phase === 'victory' || state.phase === 'defeat' ? 'show' : ''}">
      <div id="result-box">
        <div class="result-title ${state.phase}">
          ${state.phase === 'victory' ? '🏆 战斗胜利' : '💀 全灭落败'}
        </div>
        <div class="result-sub">
          ${state.phase === 'victory'
            ? `用时 ${state.turnCount} 回合，所有渊化怪物已消灭`
            : '勘探员全员失去意志——命运树状图启动回溯'}
        </div>
        <button class="btn primary" id="btn-restart2">🔁 重置战斗</button>
      </div>
    </div>
  `;

  // 滚动日志到底部
  const logBody = document.getElementById('log-body');
  if (logBody) logBody.scrollTop = logBody.scrollHeight;

  // 绑定事件
  document.getElementById('btn-attack-all')?.addEventListener('click', doAutoAttack);
  document.getElementById('btn-end-turn')?.addEventListener('click', doEndTurn);
  document.getElementById('btn-restart')?.addEventListener('click', doRestart);
  document.getElementById('btn-restart2')?.addEventListener('click', doRestart);
}

function renderUnit(unit: BattleUnit): string {
  const hpPct = Math.max(0, (unit.currentHp / unit.maxHp) * 100);
  const sanPct = Math.max(0, (unit.currentSan / unit.maxSan) * 100);
  const sanClass = getSanStatus(unit);

  return `
    <div class="unit-card ${unit.isAlive ? '' : 'dead'} ${unit.isCrazy ? 'crazy' : ''}">
      <div class="unit-name">
        ${unit.name}
        <span class="elem-badge elem-${unit.element}">
          ${ELEMENT_NAMES[unit.element]}
        </span>
        ${unit.isCrazy ? '<span style="color:var(--san-low);font-size:0.7rem">😰疯狂</span>' : ''}
      </div>

      <div class="bar-row bar-hp">
        <div class="bar-label">
          <span>HP</span><span>${unit.currentHp}/${unit.maxHp}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${hpPct}%"></div>
        </div>
      </div>

      <div class="bar-row bar-san">
        <div class="bar-label">
          <span>San</span><span>${unit.currentSan}/${unit.maxSan}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill ${sanClass}" style="width:${sanPct}%"></div>
        </div>
      </div>

      ${unit.shields.length > 0 ? `
        <div class="shield-row">
          ${unit.shields.map(s => `
            <span class="shield-pip elem-${s.element}" style="border-color:${ELEMENT_COLORS[s.element]}">
              ${ELEMENT_NAMES[s.element]}盾 ×${s.layers}
            </span>
          `).join('')}
        </div>
      ` : ''}

      ${unit.mutationTurnsLeft > 0 ? `
        <div class="mutation-warn">🧬 突变倒计时: ${unit.mutationTurnsLeft}回合</div>
      ` : ''}
      ${unit.mutationTurnsLeft === -1 ? `
        <div class="mutation-warn">⚠️ 已渊化突变！</div>
      ` : ''}
    </div>
  `;
}

// ─────────────────────────────────────────────
// 行动逻辑
// ─────────────────────────────────────────────

function doAutoAttack() {
  if (state.phase !== 'player_action') return;

  // 玩家每个存活单位自动攻击一个随机存活敌人
  let newState = { ...state };
  for (const unit of newState.playerUnits) {
    if (!unit.isAlive) continue;
    const aliveEnemies = newState.enemyUnits.filter(e => e.isAlive);
    if (aliveEnemies.length === 0) break;
    const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    const action: BattleAction = {
      actorId: unit.id,
      skillId: 'basic_attack',
      targetIds: [target.id],
    };
    newState = processPlayerAction(newState, action);
    if (newState.phase === 'victory') break;
  }

  // 如果战斗未结束，进入敌方回合
  if (newState.phase === 'player_action') {
    newState = { ...newState, phase: 'enemy_action' };
    state = newState;
    render();
    // 敌方自动行动（延迟600ms模拟思考）
    setTimeout(doEnemyTurn, 600);
    return;
  }

  state = newState;
  render();
}

function doEnemyTurn() {
  let newState = { ...state };

  // 敌方每个存活单位自动攻击随机存活玩家
  for (const enemy of newState.enemyUnits) {
    if (!enemy.isAlive) continue;
    const alivePlayers = newState.playerUnits.filter(p => p.isAlive);
    if (alivePlayers.length === 0) break;
    const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    const result = calcDamage(enemy, target, 1.0, 3, newState);
    const msg = result.isCrit
      ? `${enemy.name} 暴击 ${target.name}！造成 ${result.finalDmg} 伤害！`
      : `${enemy.name} 攻击 ${target.name}，造成 ${result.finalDmg} 伤害。`;

    const updatedTarget = {
      ...target,
      currentHp: Math.max(0, target.currentHp - result.finalDmg),
      currentSan: Math.max(0, target.currentSan - result.sanDmg),
      isAlive: target.currentHp - result.finalDmg > 0,
    };
    newState = {
      ...newState,
      playerUnits: newState.playerUnits.map(u => u.id === target.id ? updatedTarget : u),
      log: [...newState.log, { turn: newState.turnCount, message: msg, type: 'damage' as const }],
    };
    if (result.sanDmg > 0) {
      newState = {
        ...newState,
        log: [...newState.log, { turn: newState.turnCount, message: `${target.name} San值 -${result.sanDmg}`, type: 'san' as const }],
      };
    }
  }

  // 回合结束处理
  newState = processRoundEnd(newState);
  state = newState;
  render();
}

function doEndTurn() {
  if (state.phase !== 'player_action') return;
  state = { ...state, phase: 'enemy_action' };
  render();
  setTimeout(doEnemyTurn, 600);
}

function doRestart() {
  state = initBattle(
    PLAYER_UNITS.map(u => ({ ...u, currentHp: u.maxHp, currentSan: u.maxSan, isAlive: true, isCrazy: false, mutationTurnsLeft: 0, shields: [...u.shields], statusEffects: [] })),
    ENEMY_UNITS.map(u => ({ ...u, currentHp: u.maxHp, currentSan: u.maxSan, isAlive: true, isCrazy: false, mutationTurnsLeft: 3, shields: u.shields.map(s => ({...s})), statusEffects: [] })),
    'zone_subway_0', 3, {}
  );
  render();
}

// 启动
render();
