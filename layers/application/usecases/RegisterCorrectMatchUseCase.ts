import type { LearningRecord, LearningRecordMap } from '../../domain/entities/LearningRecord'
import type { Word } from '../../domain/entities/Word'

/**
 * 正确匹配登记输出。
 */
export interface RegisterCorrectMatchOutput {
  records: LearningRecordMap
  updatedRecord: LearningRecord
  newlyLearned: boolean
}

/**
 * 正确配对后更新学习记录。
 * 首次正确会标记为 newlyLearned。
 */
export function registerCorrectMatch(word: Word, records: LearningRecordMap, matchedAtISO: string): RegisterCorrectMatchOutput {
  const previous = records[word.id]
  const isFirstTime = !previous || previous.correctCount <= 0

  const nextRecord: LearningRecord = {
    wordId: word.id,
    kanji: word.kanji,
    ruby: word.ruby,
    correctCount: (previous?.correctCount ?? 0) + 1,
    firstCorrectAt: previous?.firstCorrectAt ?? matchedAtISO,
    lastCorrectAt: matchedAtISO
  }

  return {
    records: {
      ...records,
      [word.id]: nextRecord
    },
    updatedRecord: nextRecord,
    newlyLearned: isFirstTime
  }
}
