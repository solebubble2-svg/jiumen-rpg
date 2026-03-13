/**
 * main.ts — M1 战斗 Demo 2.0 (High-Precision Vertical Slice)
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
import { getSanStatus } from './engine/SanitySystem';

// ─────────────────────────────────────────────
// 核心数值与单位设定 (Corrected Mapping)
// ─────────────────────────────────────────────

const PLAYER_UNITS: BattleUnit[] = [
  {
    id: 'chen', name: '陈砚秋', slot: 1, element: 'water',
    currentHp: 1280, maxHp: 1280, currentSan: 68, maxSan: 100,
    stats: { hp: 1280, atk: 155, def: 95, spd: 12, sanity: 100, crit: 0.15, critDmg: 1.5, accuracy: 0.95, dodge: 0.1 },
    shields: [], statusEffects: [], isAlive: true, isCrazy: false, mutationTurnsLeft: 0,
  }
];

const ENEMY_UNITS: BattleUnit[] = [
  {
    id: 'qin', name: '秦假仙', slot: 1, element: 'earth',
    currentHp: 24500, maxHp: 24500, currentSan: 999, maxSan: 999,
    stats: { hp: 24500, atk: 450, def: 200, spd: 15, sanity: 999, crit: 0.1, critDmg: 2.0, accuracy: 0.9, dodge: 0.05 },
    // 设定：土盾 (震卦/紫罗兰) 与 水盾 (漩涡/霓虹蓝)
    shields: [
      { element: 'earth', layers: 5, maxLayers: 5 },
      { element: 'water', layers: 3, maxLayers: 3 }
    ],
    statusEffects: [], isAlive: true, isCrazy: false, mutationTurnsLeft: 5,
  }
];

// ─────────────────────────────────────────────
// 战斗状态初始化
// ─────────────────────────────────────────────
let state: BattleState = initBattle(PLAYER_UNITS, ENEMY_UNITS, 'zone_subway_0', 2, {});

// ─────────────────────────────────────────────
// 渲染逻辑
// ─────────────────────────────────────────────

function render() {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div id="battle-scene">
      <div id="overlay-vignette"></div>
      
      <!-- 阵型图层 (DD Layout) -->
      <div id="formation-layer">
        <div class="side-label" style="grid-column:1; text-align:right; padding-right:100px;">PLAYER FORMATION</div>
        <div class="side-label" style="grid-column:2; text-align:left; padding-left:100px;">ENEMY FORMATION</div>

        <!-- 玩家侧: 4-3-2-1 (从右往左) -->
        <div class="player-formation">
          ${renderUnit(state.playerUnits[0], 'player', true)}
          <div class="sprite-container" style="opacity:0.2"><div class="unit-hud" style="border-left-color:#333; opacity:0.5">EMPTY 2</div></div>
          <div class="sprite-container" style="opacity:0.2"><div class="unit-hud" style="border-left-color:#333; opacity:0.5">EMPTY 3</div></div>
          <div class="sprite-container" style="opacity:0.2"><div class="unit-hud" style="border-left-color:#333; opacity:0.5">EMPTY 4</div></div>
        </div>

        <!-- 敌人侧: 1-2-3-4 (从左往右) -->
        <div class="enemy-formation">
          ${renderUnit(state.enemyUnits[0], 'enemy', false)}
          <div class="sprite-container" style="opacity:0.1"></div>
          <div class="sprite-container" style="opacity:0.1"></div>
          <div class="sprite-container" style="opacity:0.1"></div>
        </div>
      </div>

      <!-- 放射状技能菜单 (P5 Style) -->
      ${state.phase === 'player_action' ? `
        <div id="p5-menu-container">
          <div id="p5-radial-menu">
            <div class="p5-skill-block skill-1" id="skill-water">
              🌊 逆流斩 <span class="skill-lvl">Lv. 5</span>
            </div>
            <div class="p5-skill-block skill-2" id="skill-bash">
              💥 罗盘重击 <span class="skill-lvl">Lv. 3</span>
            </div>
            <div class="p5-skill-block skill-3" id="skill-flash">
              🔦 强光致盲 <span class="skill-lvl">Lv. 2</span>
            </div>
            <div class="p5-skill-block skill-4" id="skill-defend">
              🛡️ 水幕固守 <span class="skill-lvl">Lv. 4</span>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Glitch 风格战斗日志 -->
      <div id="combat-log-glitch">
        ${state.log.slice(-12).map(entry => `
          <div class="glitch-entry log-${entry.type}">
            > [T${entry.turn}] ${entry.message}
          </div>
        `).join('')}
      </div>

      <!-- 结果弹窗 -->
      <div id="result-overlay" class="${['victory', 'defeat'].includes(state.phase) ? 'show' : ''}">
        <div id="result-box">
          <div class="result-title ${state.phase === 'victory' ? 'victory' : 'defeat'}">
            ${state.phase === 'victory' ? 'MISSION SUCCESS' : 'SYSTEM FAILURE'}
          </div>
          <div class="result-sub">CONNECTION LOST / RETRYING TIMELINE...</div>
          <button class="btn primary" id="btn-restart">REBOOT SESSION</button>
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
  
  const spriteUrl = side === 'player' 
    ? '/assets/characters/chen_yanqiu.png' 
    : '/assets/characters/qin_jiaxian.png';

  return `
    <div class="sprite-container ${isActive ? 'active' : ''} ${unit.isAlive ? '' : 'dead'}">
      
      <!-- Boss 专属几何护盾 -->
      ${side === 'enemy' ? `
        <div class="boss-shields-container">
          ${unit.shields.map(s => `
            <div class="shield-orb shield-${s.element}">
              ${s.element === 'earth' ? '震' : '坎'}<br>x${s.layers}
            </div>
          `).join('')}
        </div>
      ` : ''}

      <img src="${spriteUrl}" class="sprite-img" />
      
      <div class="unit-hud">
        <div class="hud-name">
          ${unit.name} <span class="hud-rank-tag">RANK.S</span>
        </div>
        
        <!-- 高抛光血条 -->
        <div class="health-precision">
          <div class="health-fill" style="width:${hpPct}%"></div>
          <div class="health-text">${Math.floor(unit.currentHp)} / ${unit.maxHp}</div>
        </div>

        <!-- 电子脉冲 San 条 -->
        <div class="sanity-pulse">
          <div class="sanity-fill ${sanStatus}" style="width:${sanPct}%"></div>
        </div>
        
        <div style="font-size:0.6rem; color:var(--accent-cyan); margin-top:4px;">
          SANITY INDEX: ${Math.floor(unit.currentSan)}%
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// 事件绑定与逻辑
// ─────────────────────────────────────────────

function bindEvents() {
  document.getElementById('skill-water')?.addEventListener('click', () => handlePlayerAction('逆流斩', 1.5, 0));
  document.getElementById('skill-bash')?.addEventListener('click', () => handlePlayerAction('罗盘重击', 2.2, 5));
  document.getElementById('btn-restart')?.addEventListener('click', () => window.location.reload());
}

function handlePlayerAction(skillName: string, multi: number, san: number) {
  if (state.phase !== 'player_action') return;

  const target = state.enemyUnits[0]; // 锁定攻击 Boss
  const player = state.playerUnits[0];

  // 计算伤害
  const result = calcDamage(player, target, multi, san, state);
  
  // 生成战斗动作
  const action: BattleAction = {
    actorId: player.id,
    skillId: skillName,
    targetIds: [target.id]
  };

  let newState = processPlayerAction(state, action);
  
  // 为了 Demo 效果，如果伤害是 0 (因为盾)，日志特殊处理
  if (result.finalDmg === 0 && result.shieldAbsorbed > 0) {
    newState.log[newState.log.length-1].message = `[BLOCK] ${player.name} 使用 ${skillName}，但被秦假仙的阵法完全抵消！`;
  }

  state = { ...newState, phase: 'enemy_action' };
  render();

  // 延迟后 Boss 反击
  setTimeout(handleEnemyTurn, 1000);
}

function handleEnemyTurn() {
  const boss = state.enemyUnits[0];
  const player = state.playerUnits[0];
  if (!boss.isAlive || !player.isAlive) return;

  // Boss 行动：迷阵干扰
  const result = calcDamage(boss, player, 0.8, 12, state);
  
  const msg = `[GLITCH] 秦假仙 拨动罗盘：『${['观山指迷', '死生轮转', '八卦易位'][Math.floor(Math.random()*3)]}』！造成 ${result.finalDmg} 伤害，San值下降 ${result.sanDmg}！`;
  
  const updatedPlayer = {
    ...player,
    currentHp: Math.max(0, player.currentHp - result.finalDmg),
    currentSan: Math.max(0, player.currentSan - result.sanDmg),
    isAlive: (player.currentHp - result.finalDmg) > 0
  };

  let newState = {
    ...state,
    playerUnits: [updatedPlayer],
    log: [...state.log, { turn: state.turnCount, message: msg, type: 'damage' as any }]
  };

  // 检查阶段结束
  newState = processRoundEnd(newState);
  state = newState;
  render();
}

// 初始启动
render();
