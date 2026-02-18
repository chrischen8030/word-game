/**
 * 难度等级值对象。
 * 约定：1 最简单，10 最困难。
 */
export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

/** 难度等级类型。 */
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number]

/** 默认难度等级。 */
export const DEFAULT_DIFFICULTY_LEVEL: DifficultyLevel = 1

/** 难度展示文案。 */
export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  1: 'Lv.1 入门',
  2: 'Lv.2 基础',
  3: 'Lv.3 常用',
  4: 'Lv.4 进阶',
  5: 'Lv.5 进阶',
  6: 'Lv.6 进阶',
  7: 'Lv.7 挑战',
  8: 'Lv.8 挑战',
  9: 'Lv.9 困难',
  10: 'Lv.10 专家'
}

/**
 * 将任意数字归一化为合法难度等级。
 */
export function normalizeDifficultyLevel(value: number): DifficultyLevel {
  const rounded = Math.round(value)
  const clamped = Math.min(10, Math.max(1, Number.isFinite(rounded) ? rounded : DEFAULT_DIFFICULTY_LEVEL))
  return clamped as DifficultyLevel
}

/**
 * 根据词条 level（0~10）映射到游戏难度（1~10）。
 */
export function mapWordLevelToDifficulty(level: number): DifficultyLevel {
  const normalized = Math.min(10, Math.max(0, Number.isFinite(level) ? level : 10))

  if (normalized >= 9) {
    return 10
  }

  return (Math.floor(normalized) + 1) as DifficultyLevel
}

/**
 * 获取难度对应的词条 level 区间。
 * 例：Lv.1 => [0,1)；Lv.10 => [9,10]。
 */
export function getWordLevelRangeByDifficulty(difficulty: DifficultyLevel): {
  minInclusive: number
  maxExclusive: number
} {
  const minInclusive = difficulty - 1

  if (difficulty >= 10) {
    return {
      minInclusive,
      maxExclusive: 10.0001
    }
  }

  return {
    minInclusive,
    maxExclusive: difficulty
  }
}
