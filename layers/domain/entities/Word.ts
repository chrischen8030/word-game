/**
 * 单词实体。
 * `id` 作为系统内部唯一标识，`kanji` 和 `ruby` 用于展示和匹配。
 * 额外的释义和例句字段用于结算页与统计页展示。
 */
export interface Word {
  id: string
  kanji: string
  ruby: string
  level: number
  jpMeanings: string[]
  zhMeanings: string[]
  exampleSentence: string
  exampleTranslation: string
}
