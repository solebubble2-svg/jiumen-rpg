/**
 * save.ts
 * 全局存档结构定义
 */
import type { Element } from './character';

/** 主线进度 Flag（布尔值标记）*/
export type StoryFlag =
  // 章节解锁
  | 'chapter_1_complete'
  | 'chapter_2_complete'
  | 'chapter_3_complete'
  | 'chapter_4_complete'
  | 'chapter_5_complete'
  | 'chapter_6_complete'
  | 'chapter_7_complete'
  | 'chapter_8_complete'
  | 'chapter_9_complete'
  | 'chapter_10_complete'
  // 关键剧情节点
  | 'fate_tree_unlocked'
  | 'base_panlong_unlocked'
  | 'base_panlong_raided'     // 第六章被查封
  | 'base_panlong_restored'
  | 'inner_spy_revealed'
  | 'bronze_gate_opened'
  | 'parents_found'
  // 伙伴加入
  | 'partner_tangling_joined'
  | 'partner_fatty_joined'
  | 'partner_leihuo_joined'
  | 'partner_zhangxuan_joined'
  | 'partner_alian_joined'
  | 'partner_yemian_joined'
  | 'partner_xiaoger_joined'
  | 'partner_qinbing_joined'
  | 'partner_simahui_joined'
  | 'partner_laojin_joined'
  // 伙伴专属支线完成
  | 'quest_tangling_complete'
  | 'quest_fatty_complete'
  | 'quest_leihuo_complete'
  | 'quest_zhangxuan_complete'
  | 'quest_alian_complete'
  | 'quest_yemian_complete'
  | 'quest_xiaoger_complete'
  | 'quest_qinbing_complete'
  | 'quest_simahui_complete'
  | 'quest_laojin_complete'
  // 真结局信物收集
  | 'token_tangling'
  | 'token_fatty'
  | 'token_leihuo'
  | 'token_zhangxuan'
  | 'token_alian'
  | 'token_yemian'
  | 'token_xiaoger'
  | 'token_qinbing'
  | 'token_simahui'
  | 'token_laojin'
  // DLC 解锁
  | 'dlc1_panjiayuan_unlocked'
  | 'dlc2_workshop_unlocked'
  | 'dlc3_spider_city_unlocked'
  | 'dlc4_dragon_palace_unlocked';

/** 伙伴存档数据 */
export interface PartnerSaveData {
  partnerId: string;
  level: number;
  affinity: number;       // 当前好感度
  equippedItems: string[];
  unlockedSkillIds: string[];
  isInSquad: boolean;
  slotPosition?: 1 | 2 | 3 | 4;
}

/** 背包物品 */
export interface InventoryItem {
  itemId: string;
  quantity: number;
}

/** 主角存档数据 */
export interface ProtagonistSaveData {
  level: number;
  exp: number;
  equippedCoreArtifactId: string | null;
  activeElement: Element;
  unlockedSkillIds: string[];
  activeSkillSlots: [string?, string?, string?, string?];
  currentSan: number;
}

/** 全局存档 */
export interface SaveData {
  version: string;              // 存档格式版本（用于日后升级兼容）
  saveTime: number;             // UTC 时间戳
  explorerRank: 'novice' | 'rank3' | 'rank2' | 'rank1' | 'special';
  gold: number;                 // 金币
  purityPotions: number;        // 净度药剂数量
  storyFlags: Partial<Record<StoryFlag, boolean>>;
  protagonist: ProtagonistSaveData;
  partners: PartnerSaveData[];
  inventory: InventoryItem[];
  currentZoneId: string | null; // 当前所在区域（null = 大本营）
  endingPath: 'locked' | 'true_end' | 'bad_end' | null; // 结局路线
  sanityTotalDecayed: number;   // 全局累计San值损耗（影响结局C）
}

/** 新游戏默认存档 */
export const DEFAULT_SAVE: SaveData = {
  version: '1.0.0',
  saveTime: 0,
  explorerRank: 'novice',
  gold: 0,
  purityPotions: 3,
  storyFlags: {},
  protagonist: {
    level: 1,
    exp: 0,
    equippedCoreArtifactId: null,
    activeElement: 'none',
    unlockedSkillIds: [],
    activeSkillSlots: [],
    currentSan: 100,
  },
  partners: [],
  inventory: [],
  currentZoneId: null,
  endingPath: null,
  sanityTotalDecayed: 0,
};
