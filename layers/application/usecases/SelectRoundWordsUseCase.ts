import type { LearningRecordMap } from '../../domain/entities/LearningRecord'
import type { Word } from '../../domain/entities/Word'
import type { DifficultyLevel } from '../../domain/valueObjects/DifficultyLevel'
import type { GameMode } from '../../domain/valueObjects/GameMode'
import { getWordLevelRangeByDifficulty } from '../../domain/valueObjects/DifficultyLevel'
import { pickRandomUnique, shuffleArray } from '../utils/random'

/**
 * 出题用例输入。
 */
export interface SelectRoundWordsInput {
  mode: GameMode
  count: number
  difficulty: DifficultyLevel
  words: Word[]
  records: LearningRecordMap
}

/**
 * 出题用例输出。
 */
export interface SelectRoundWordsOutput {
  words: Word[]
  fallbackUsed: boolean
  repeatedUsed: boolean
  difficultyFallbackUsed: boolean
}

/**
 * 判断某单词是否已学过。
 * 已学定义：正确匹配次数 >= 1。
 */
function isLearnedWord(wordId: string, records: LearningRecordMap): boolean {
  return (records[wordId]?.correctCount ?? 0) > 0
}

/**
 * 根据已学状态拆分词池。
 */
function splitWordPools(words: Word[], records: LearningRecordMap): { learned: Word[]; unlearned: Word[] } {
  const learned: Word[] = []
  const unlearned: Word[] = []

  for (const word of words) {
    if (isLearnedWord(word.id, records)) {
      learned.push(word)
    } else {
      unlearned.push(word)
    }
  }

  return { learned, unlearned }
}

/**
 * 根据难度过滤词池。
 */
function filterWordsByDifficulty(words: Word[], difficulty: DifficultyLevel): Word[] {
  const { minInclusive, maxExclusive } = getWordLevelRangeByDifficulty(difficulty)

  return words.filter((word) => word.level >= minInclusive && word.level < maxExclusive)
}

/**
 * 把不足数量补齐到目标数量。
 * 如果唯一词不足，会允许重复（按随机顺序循环补）。
 */
function fillToTargetCount(baseWords: Word[], allWords: Word[], targetCount: number): { words: Word[]; repeatedUsed: boolean } {
  if (baseWords.length >= targetCount) {
    return { words: baseWords.slice(0, targetCount), repeatedUsed: false }
  }

  if (allWords.length === 0) {
    return { words: [], repeatedUsed: false }
  }

  const next = [...baseWords]
  const shuffled = shuffleArray(allWords)
  let cursor = 0

  while (next.length < targetCount) {
    next.push(shuffled[cursor % shuffled.length])
    cursor += 1
  }

  return { words: next, repeatedUsed: true }
}

/**
 * 核心出题逻辑。
 * 新手模式优先未学，复习模式优先已学，不足时回填另一池。
 */
export function selectRoundWords(input: SelectRoundWordsInput): SelectRoundWordsOutput {
  const safeCount = Math.max(1, Math.floor(input.count))
  const wordsByDifficulty = filterWordsByDifficulty(input.words, input.difficulty)
  const candidateWords = wordsByDifficulty.length > 0 ? wordsByDifficulty : input.words
  const difficultyFallbackUsed = wordsByDifficulty.length <= 0
  const { learned, unlearned } = splitWordPools(candidateWords, input.records)

  let selected: Word[] = []
  let fallbackUsed = false

  if (input.mode === 'newbie') {
    selected = pickRandomUnique(unlearned, safeCount)

    if (selected.length < safeCount) {
      const missing = safeCount - selected.length
      selected = selected.concat(pickRandomUnique(learned, missing))
      fallbackUsed = true
    }
  }

  if (input.mode === 'review') {
    selected = pickRandomUnique(learned, safeCount)

    if (selected.length < safeCount) {
      const missing = safeCount - selected.length
      selected = selected.concat(pickRandomUnique(unlearned, missing))
      fallbackUsed = true
    }
  }

  const { words, repeatedUsed } = fillToTargetCount(selected, candidateWords, safeCount)

  return {
    words,
    fallbackUsed,
    repeatedUsed,
    difficultyFallbackUsed
  }
}
