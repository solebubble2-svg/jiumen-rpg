/**
 * character.ts
 * 角色与伙伴的核心类型定义
 */

/** 五行属性 */
export type Element = 'metal' | 'wood' | 'water' | 'fire' | 'earth' | 'none';

/** 职业定位 */
export type Role = 'main_dps' | 'sub_dps' | 'tank' | 'support' | 'controller' | 'summoner';

/** 阵容位置 (1=前排, 4=后排) */
export type SlotPosition = 1 | 2 | 3 | 4;

/** 属性面板 */
export interface Stats {
  hp: number;         // 最大生命值
  atk: number;        // 攻击力
  def: number;        // 防御力
  spd: number;        // 速度/行动顺序
  sanity: number;     // 最大 San 值 (理智)
  crit: number;       // 暴击率 (0-1)
  critDmg: number;    // 暴击伤害倍率
  accuracy: number;   // 命中率 (0-1)
  dodge: number;      // 闪避率 (0-1)
}

/** 五行属性护盾 */
export interface ElementShield {
  element: Element;
  layers: number;     // 当前护盾层数
  maxLayers: number;  // 最大护盾层数
}

/** 单个技能定义 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  element: Element;
  cost: number;        // 消耗的蓝量/行动点
  dmgMultiplier: number; // 伤害倍率（相对于基础ATK）
  sanDmg: number;      // 附带的 San 值伤害
  targetSlots: SlotPosition[]; // 可攻击的敌方战位
  selfSlotReq: SlotPosition[]; // 需处于的自身战位
  statusEffects?: StatusEffectRef[]; // 附带的状态效果
  cooldown?: number;   // 冷却回合数（无则为0）
}

/** 技能附带的状态效果引用 */
export interface StatusEffectRef {
  id: string;          // 状态效果 ID，对应 StatusEffect
  chance: number;      // 触发概率 (0-1)
}

/** 精英伙伴定义 */
export interface Partner {
  id: string;
  name: string;
  title: string;       // 称号（如"异管局养女"）
  element: Element;
  role: Role;
  preferredSlots: SlotPosition[]; // 推荐站位
  baseStats: Stats;
  skills: Skill[];
  passiveDescription: string;
  lore: string;        // 角色介绍
  affinityMax: number; // 最大好感度值
  questId: string;     // 绑定的专属支线 Quest ID
  trueEndingTokenId: string; // 真结局信物 ID
}

/** 主角陈砚秋 */
export interface Protagonist {
  id: 'chen_yanqiu';
  name: '陈砚秋';
  equipedCoreArtifactId: string | null; // 当前穿戴的核心法器 ID
  activeElement: Element;               // 由法器决定的当前属性
  baseStats: Stats;
  skillTree: SkillTreeNode[];           // 专属战术技能树
  activeSkillSlots: [string?, string?, string?, string?]; // 战前4个备战槽
}

/** 技能树节点 */
export interface SkillTreeNode {
  id: string;
  name: string;
  description: string;
  cost: number;        // 加点消耗
  unlocked: boolean;
  prereqIds: string[]; // 前置节点 ID
  skill: Skill;
}
