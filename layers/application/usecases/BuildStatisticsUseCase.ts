import type { LearningRecordMap } from '../../domain/entities/LearningRecord'
import type { Word } from '../../domain/entities/Word'

/** 统计排序方式。 */
export type StatisticsSortKey = 'count-desc' | 'count-asc' | 'recent-desc' | 'recent-asc' | 'kanji-asc'

/** 统计筛选方式。 */
export type StatisticsFilter = 'all' | 'learned' | 'unlearned'

/** 单词统计项。 */
export interface WordStatisticItem {
  wordId: string
  kanji: string
  ruby: string
  jpMeanings: string[]
  zhMeanings: string[]
  exampleSentence: string
  exampleTranslation: string
  correctCount: number
  firstCorrectAt: string | null
  lastCorrectAt: string | null
  learned: boolean
}

/**
 * 把单词+记录拼成统计项。
 */
function buildStatisticItem(word: Word, records: LearningRecordMap): WordStatisticItem {
  const record = records[word.id]

  return {
    wordId: word.id,
    kanji: word.kanji,
    ruby: word.ruby,
    jpMeanings: word.jpMeanings,
    zhMeanings: word.zhMeanings,
    exampleSentence: word.exampleSentence,
    exampleTranslation: word.exampleTranslation,
    correctCount: record?.correctCount ?? 0,
    firstCorrectAt: record?.firstCorrectAt ?? null,
    lastCorrectAt: record?.lastCorrectAt ?? null,
    learned: (record?.correctCount ?? 0) > 0
  }
}

/**
 * 根据筛选条件过滤统计项。
 */
function applyFilter(items: WordStatisticItem[], filter: StatisticsFilter): WordStatisticItem[] {
  if (filter === 'learned') {
    return items.filter((item) => item.learned)
  }

  if (filter === 'unlearned') {
    return items.filter((item) => !item.learned)
  }

  return items
}

/**
 * 根据排序条件排序统计项。
 */
function applySort(items: WordStatisticItem[], sortKey: StatisticsSortKey): WordStatisticItem[] {
  const cloned = [...items]

  if (sortKey === 'count-desc') {
    return cloned.sort((a, b) => b.correctCount - a.correctCount)
  }

  if (sortKey === 'count-asc') {
    return cloned.sort((a, b) => a.correctCount - b.correctCount)
  }

  if (sortKey === 'recent-desc') {
    return cloned.sort((a, b) => (new Date(b.lastCorrectAt ?? 0).getTime() - new Date(a.lastCorrectAt ?? 0).getTime()))
  }

  if (sortKey === 'recent-asc') {
    return cloned.sort((a, b) => (new Date(a.lastCorrectAt ?? 0).getTime() - new Date(b.lastCorrectAt ?? 0).getTime()))
  }

  return cloned.sort((a, b) => a.kanji.localeCompare(b.kanji, 'ja'))
}

/**
 * 生成统计列表。
 */
export function buildStatistics(words: Word[], records: LearningRecordMap, sortKey: StatisticsSortKey, filter: StatisticsFilter): WordStatisticItem[] {
  const mergedItems = words.map((word) => buildStatisticItem(word, records))
  const filteredItems = applyFilter(mergedItems, filter)

  return applySort(filteredItems, sortKey)
}
