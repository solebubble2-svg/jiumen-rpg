/**
 * main.ts — M1 战斗 Demo 3.0 (Strict DD/P5 Style)
 * 十月九门：长生录
 */
import './styles/combat.css';
import type { BattleUnit, BattleState, BattleAction } from './types/combat';
import {
  initBattle,
  processPlayerAction,
  processRoundEnd,
  calcDamage,
} from './engine/CombatEngine';
import { getSanStatus } from './engine/SanitySystem';

// ─────────────────────────────────────────────
// 核心数值与单位设定 (Strict Consistency)
// ─────────────────────────────────────────────

const PLAYER_UNITS: BattleUnit[] = [
  {
    id: 'chen', name: '陈砚秋', slot: 1, element: 'water',
    currentHp: 1280, maxHp: 1280, currentSan: 68, maxSan: 100, // 完全匹配需求
    stats: { hp: 1280, atk: 185, def: 110, spd: 14, sanity: 100, crit: 0.15, critDmg: 1.5, accuracy: 0.95, dodge: 0.1 },
    shields: [], statusEffects: [], isAlive: true, isCrazy: false, mutationTurnsLeft: 0,
  }
];

const ENEMY_UNITS: BattleUnit[] = [
  {
    id: 'qin', name: '秦假仙', slot: 1, element: 'earth',
    currentHp: 24500, maxHp: 24500, currentSan: 999, maxSan: 999,
    stats: { hp: 24500, atk: 520, def: 250, spd: 16, sanity: 999, crit: 0.1, critDmg: 2.0, accuracy: 0.9, dodge: 0.05 },
    // 阵法护盾：紫罗兰(土) 与 漩涡蓝(水)
    shields: [
      { element: 'earth', layers: 5, maxLayers: 5 },
      { element: 'water', layers: 3, maxLayers: 3 }
    ],
    statusEffects: [], isAlive: true, isCrazy: false, mutationTurnsLeft: 5,
  }
];

// 战斗状态单例
let state: BattleState = initBattle(PLAYER_UNITS, ENEMY_UNITS, 'zone_subway_0', 3, {});

// ─────────────────────────────────────────────
// UI 渲染 (DD 阵型还原)
// ─────────────────────────────────────────────

function render() {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div id="battle-scene">
      <div id="overlay-vignette"></div>
      
      <div id="formation-layer">
        <!-- 玩家侧 (右往左排: 1, 2, 3, 4) -->
        <div class="formation-group player-formation">
          ${renderUnit(state.playerUnits[0], 'player', true)}
          ${renderPlaceholder('EMPTY 2')}
          ${renderPlaceholder('EMPTY 3')}
          ${renderPlaceholder('EMPTY 4')}
        </div>

        <!-- 敌方侧 (左往右排: 1, 2, 3, 4) -->
        <div class="formation-group enemy-formation">
          ${renderUnit(state.enemyUnits[0], 'enemy', false)}
          ${renderPlaceholder('')}
          ${renderPlaceholder('')}
          ${renderPlaceholder('')}
        </div>
      </div>

      <!-- P5 样式放射菜单 -->
      ${state.phase === 'player_action' ? `
        <div id="p5-menu-layer">
          <div id="p5-menu-radial">
            <button class="p5-btn skill-a" id="skill-water">
              🌊 <span class="skill-sub">Lv. 5</span> 逆流斩
            </button>
            <button class="p5-btn skill-b" id="skill-bash">
              💥 <span class="skill-sub">Lv. 3</span> 罗盘重击
            </button>
            <button class="p5-btn skill-c" id="skill-flash">
              🚨 <span class="skill-sub">Lv. 2</span> 强光致盲
            </button>
            <button class="p5-btn skill-d" id="skill-defend">
              🛡️ <span class="skill-sub">Lv. 4</span> 水幕固守
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Glitch 日志面板 -->
      <div id="battle-logs">
        ${state.log.slice(-10).map(e => `
          <div class="log-line"><b>[T${e.turn}]</b> ${e.message}</div>
        `).join('')}
      </div>

      <!-- 结果弹窗 -->
      <div id="result-overlay" class="${['victory', 'defeat'].includes(state.phase) ? 'show' : ''}">
        <div id="result-box">
          <div class="result-title ${state.phase}">${state.phase === 'victory' ? 'MISSION COMPLETE' : 'SYSTEM CRITICAL'}</div>
          <p style="margin-bottom:20px; opacity:0.6;">TIME-LOOP SYNCING...</p>
          <button class="p5-btn" onclick="location.reload()">REBOOT SESSION</button>
        </div>
      </div>
    </div>
  `;

  bindEvents();
}

function renderUnit(unit: BattleUnit | undefined, side: 'player' | 'enemy', isActive: boolean): string {
  if (!unit) return '';
  const hpPct = (unit.currentHp / unit.maxHp) * 100;
  const sanPct = (unit.currentSan / unit.maxSan) * 100;
  const sanStatus = getSanStatus(unit);
  
  // 使用相对路径，确保在不同 URL 下都能加载
  const spriteUrl = side === 'player' 
    ? 'assets/characters/chen_yanqiu.png' 
    : 'assets/characters/qin_jiaxian.png';

  return `
    <div class="sprite-container ${isActive ? 'active' : ''} ${unit.isAlive ? '' : 'dead'}">
      ${side === 'enemy' ? `
        <div class="boss-shields">
          ${unit.shields.map(s => `
            <div class="shield-icon shield-${s.element}">
              ${s.element === 'earth' ? '震' : '坎'} x${s.layers}
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <img src="${spriteUrl}" class="sprite-img" />
      
      <div class="unit-hud">
        <div class="hud-name">
          <span>${unit.name}</span>
          <span style="opacity:0.6; font-size:0.6rem;">${unit.element.toUpperCase()}</span>
        </div>
        
        <div class="hud-bar-container hud-hp">
          <div class="hud-bar-fill ${hpPct > 80 ? 'secure' : ''}" style="width:${hpPct}%"></div>
          <div class="hud-bar-text">${Math.floor(unit.currentHp)} / ${unit.maxHp}</div>
        </div>

        <div class="hud-bar-container hud-san">
          <div class="hud-bar-fill ${sanStatus}" style="width:${sanPct}%"></div>
          <div class="hud-bar-text">SAN ${Math.floor(unit.currentSan)}%</div>
        </div>
      </div>
    </div>
  `;
}

function renderPlaceholder(text: string): string {
  return `
    <div class="sprite-container" style="opacity:0.2; justify-content:center;">
      <div style="font-size:0.7rem; color:var(--text-gold); border:1px solid; padding:4px;">${text}</div>
    </div>
  `;
}

function bindEvents() {
  document.getElementById('skill-water')?.addEventListener('click', () => doTurn('逆流斩', 1.8));
  document.getElementById('skill-bash')?.addEventListener('click', () => doTurn('罗盘重击', 2.5));
}

function doTurn(skill: string, multi: number) {
  if (state.phase !== 'player_action') return;
  
  const player = state.playerUnits[0];
  const target = state.enemyUnits[0];

  // 1. 执行玩家行动
  const action: BattleAction = { 
    actorId: player.id, 
    skillId: skill, 
    targetIds: [target.id],
    dmgMulti: multi 
  };
  let newState = processPlayerAction(state, action);
  
  state = { ...newState, phase: 'enemy_action' };
  render();

  // 2. 敌方延迟反击
  setTimeout(() => {
    const boss = state.enemyUnits[0];
    const victim = state.playerUnits[0];
    if (!boss.isAlive) return;

    const res = calcDamage(boss, victim, 0.7, 10, state);
    const updatedVictim = {
      ...victim,
      currentHp: Math.max(0, victim.currentHp - res.finalDmg),
      currentSan: Math.max(0, victim.currentSan - res.sanDmg),
      isAlive: (victim.currentHp - res.finalDmg) > 0
    };

    let postState = {
      ...state,
      playerUnits: [updatedVictim],
      log: [...state.log, { turn: state.turnCount, message: `秦假仙 释放 [迷阵干扰]，${victim.name} 受创并损失 San 值`, type: 'damage' as any }]
    };

    state = processRoundEnd(postState);
    render();
  }, 800);
}

// 启动
render();
