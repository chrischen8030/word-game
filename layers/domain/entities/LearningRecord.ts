/**
 * 学习记录实体。
 * 每个单词会记录正确消除次数和时间信息。
 */
export interface LearningRecord {
  wordId: string
  kanji: string
  ruby: string
  correctCount: number
  firstCorrectAt: string
  lastCorrectAt: string
}

/**
 * 学习记录映射结构。
 * Key 为 `wordId`，Value 为对应记录对象。
 */
export type LearningRecordMap = Record<string, LearningRecord>
