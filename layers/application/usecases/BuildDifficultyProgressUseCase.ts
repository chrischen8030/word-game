import type { LearningRecordMap } from '../../domain/entities/LearningRecord'
import type { Word } from '../../domain/entities/Word'
import {
  DIFFICULTY_LEVELS,
  type DifficultyLevel,
  mapWordLevelToDifficulty,
  normalizeDifficultyLevel
} from '../../domain/valueObjects/DifficultyLevel'

/** 难度学习进度项。 */
export interface DifficultyProgressItem {
  difficulty: DifficultyLevel
  totalWords: number
  learnedWords: number
  learnedRate: number
}

/**
 * 判断词条是否已学过。
 * 条件：正确匹配次数 >= 1。
 */
function isLearnedWord(wordId: string, records: LearningRecordMap): boolean {
  return (records[wordId]?.correctCount ?? 0) > 0
}

/**
 * 构建 1~10 难度维度的学习进度统计。
 */
export function buildDifficultyProgress(words: Word[], records: LearningRecordMap): DifficultyProgressItem[] {
  const progressMap = new Map<DifficultyLevel, DifficultyProgressItem>(
    DIFFICULTY_LEVELS.map((difficulty) => [
      difficulty,
      {
        difficulty,
        totalWords: 0,
        learnedWords: 0,
        learnedRate: 0
      }
    ])
  )

  for (const word of words) {
    const difficulty = mapWordLevelToDifficulty(word.level)
    const item = progressMap.get(difficulty)

    if (!item) {
      continue
    }

    item.totalWords += 1
    if (isLearnedWord(word.id, records)) {
      item.learnedWords += 1
    }
  }

  return DIFFICULTY_LEVELS.map((difficulty) => {
    const item = progressMap.get(difficulty)!
    const learnedRate = item.totalWords > 0 ? item.learnedWords / item.totalWords : 0

    return {
      ...item,
      learnedRate
    }
  })
}

/**
 * 估算用户当前学习等级。
 * 规则：按“已学词条在各难度的分布”做加权平均，再映射到 1~10。
 */
export function estimateUserDifficulty(progressItems: DifficultyProgressItem[]): DifficultyLevel {
  const learnedTotal = progressItems.reduce((sum, item) => sum + item.learnedWords, 0)

  if (learnedTotal <= 0) {
    return 1
  }

  const weightedDifficultySum = progressItems.reduce((sum, item) => {
    return sum + item.difficulty * item.learnedWords
  }, 0)

  const averageDifficulty = weightedDifficultySum / learnedTotal
  return normalizeDifficultyLevel(averageDifficulty)
}
