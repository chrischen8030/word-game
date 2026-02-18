/**
 * 汉字卡片实体。
 */
export interface KanjiCard {
  id: string
  wordId: string
  text: string
  removed: boolean
}

/**
 * 振假名卡片实体。
 */
export interface RubyCard {
  id: string
  wordId: string
  text: string
  removed: boolean
}
