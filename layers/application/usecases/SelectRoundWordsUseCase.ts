import type { LearningRecordMap } from '../../domain/entities/LearningRecord'
import type { Word } from '../../domain/entities/Word'
import type { GameMode } from '../../domain/valueObjects/GameMode'
import { pickRandomUnique, shuffleArray } from '../utils/random'

/**
 * 出题用例输入。
 */
export interface SelectRoundWordsInput {
  mode: GameMode
  count: number
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
  const { learned, unlearned } = splitWordPools(input.words, input.records)

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

  const { words, repeatedUsed } = fillToTargetCount(selected, input.words, safeCount)

  return {
    words,
    fallbackUsed,
    repeatedUsed
  }
}
