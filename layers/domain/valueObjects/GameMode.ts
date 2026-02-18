/**
 * 游戏模式值对象。
 * 使用字面量联合类型确保模式值只会是合法选项。
 */
export const GAME_MODES = ['newbie', 'review'] as const

/** 游戏模式类型。 */
export type GameMode = (typeof GAME_MODES)[number]

/** 模式展示文案。 */
export const GAME_MODE_LABELS: Record<GameMode, string> = {
  newbie: '新手模式',
  review: '复习模式'
}
