import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { buildBoardCards } from '../../application/usecases/BuildBoardCardsUseCase'
import {
  buildDifficultyProgress,
  estimateUserDifficulty
} from '../../application/usecases/BuildDifficultyProgressUseCase'
import {
  buildStatistics,
  type StatisticsFilter,
  type StatisticsSortKey,
  type WordStatisticItem
} from '../../application/usecases/BuildStatisticsUseCase'
import { registerCorrectMatch } from '../../application/usecases/RegisterCorrectMatchUseCase'
import { isCorrectMatch } from '../../application/usecases/ResolveMatchUseCase'
import { selectRoundWords } from '../../application/usecases/SelectRoundWordsUseCase'
import type { KanjiCard, RubyCard } from '../../domain/entities/GameCard'
import type { LearningRecordMap } from '../../domain/entities/LearningRecord'
import type { RoundResult } from '../../domain/entities/RoundResult'
import type { Word } from '../../domain/entities/Word'
import type { ILearningRecordRepository } from '../../domain/repositories/ILearningRecordRepository'
import type { IWordRepository } from '../../domain/repositories/IWordRepository'
import { DEFAULT_DIFFICULTY_LEVEL, type DifficultyLevel } from '../../domain/valueObjects/DifficultyLevel'
import type { GameMode } from '../../domain/valueObjects/GameMode'
import { StaticWordRepository } from '../../infrastructure/data/StaticWordRepository'
import { LocalStorageLearningRecordRepository } from '../../infrastructure/storage/LocalStorageLearningRecordRepository'

/**
 * 仓储实例。
 * 在 Store 外层实例化，保证整个应用共享同一数据源。
 */
const wordRepository: IWordRepository = new StaticWordRepository()
const recordRepository: ILearningRecordRepository = new LocalStorageLearningRecordRepository()

/** 当前对局状态。 */
type RoundStatus = 'idle' | 'playing' | 'finished'

/** 记录最近一次开局参数，用于“再来一局”。 */
interface LastRoundConfig {
  mode: GameMode
  count: number
  difficulty: DifficultyLevel
}

/**
 * 游戏主 Store。
 * 负责协调 UI 状态、用例调用和持久化行为。
 */
export const useGameStore = defineStore('game-store', () => {
  const initialized = ref(false)

  const words = ref<Word[]>([])
  const records = ref<LearningRecordMap>({})

  const mode = ref<GameMode>('newbie')
  const requestedCount = ref<number>(10)
  const difficulty = ref<DifficultyLevel>(DEFAULT_DIFFICULTY_LEVEL)

  const status = ref<RoundStatus>('idle')
  const roundStartedAt = ref<string | null>(null)
  const roundWords = ref<Word[]>([])
  const kanjiCards = ref<KanjiCard[]>([])
  const rubyCards = ref<RubyCard[]>([])
  const selectedKanjiCardId = ref<string | null>(null)
  const wrongKanjiCardIds = ref<string[]>([])
  const wrongRubyCardIds = ref<string[]>([])
  const roundNotice = ref<string | null>(null)

  const roundNewLearnedWordIds = ref<string[]>([])
  const roundResult = ref<RoundResult | null>(null)
  const lastRoundConfig = ref<LastRoundConfig | null>(null)

  /** 已学单词数量。 */
  const learnedWordCount = computed(() => {
    return Object.values(records.value).filter((record) => record.correctCount > 0).length
  })

  /** 总题库数量。 */
  const totalWordCount = computed(() => words.value.length)

  /** 按难度统计学习进度。 */
  const difficultyProgress = computed(() => buildDifficultyProgress(words.value, records.value))

  /** 用户当前估算学习等级。 */
  const userDifficultyLevel = computed(() => estimateUserDifficulty(difficultyProgress.value))

  /** 当前局总配对数。 */
  const totalPairs = computed(() => roundWords.value.length)

  /** 当前局剩余配对数。 */
  const remainingPairs = computed(() => kanjiCards.value.filter((card) => !card.removed).length)

  /** 是否正在游戏中。 */
  const isPlaying = computed(() => status.value === 'playing')

  /** 是否有可复习单词。 */
  const canStartReviewMode = computed(() => learnedWordCount.value > 0)

  /**
   * 初始化：加载题库与学习记录。
   */
  function ensureInitialized(): void {
    if (initialized.value) {
      return
    }

    words.value = wordRepository.getAllWords()
    records.value = recordRepository.getAllRecords()
    initialized.value = true
  }

  /**
   * 持久化学习记录到 localStorage。
   */
  function persistRecords(): void {
    recordRepository.saveAllRecords(records.value)
  }

  /**
   * 清理局内反馈状态（选中与错误高亮）。
   */
  function resetSelectionFeedback(): void {
    selectedKanjiCardId.value = null
    wrongKanjiCardIds.value = []
    wrongRubyCardIds.value = []
  }

  /**
   * 重置局内状态，不清空学习记录。
   */
  function resetRoundState(): void {
    status.value = 'idle'
    roundStartedAt.value = null
    roundWords.value = []
    kanjiCards.value = []
    rubyCards.value = []
    roundNotice.value = null
    roundNewLearnedWordIds.value = []
    resetSelectionFeedback()
  }

  /**
   * 根据模式、数量和难度开始新游戏。
   */
  function startRound(nextMode: GameMode, nextCount: number, nextDifficulty: DifficultyLevel): void {
    ensureInitialized()

    const resolvedCount = Math.max(1, Math.floor(nextCount))
    const selection = selectRoundWords({
      mode: nextMode,
      count: resolvedCount,
      difficulty: nextDifficulty,
      words: words.value,
      records: records.value
    })

    const board = buildBoardCards(selection.words)
    const notices: string[] = []

    if (selection.fallbackUsed) {
      notices.push(nextMode === 'newbie' ? '未学单词不足，已补充已学单词。' : '已学单词不足，已补充未学单词。')
    }

    if (selection.repeatedUsed) {
      notices.push('可用唯一单词不足，已允许重复出题。')
    }

    if (selection.difficultyFallbackUsed) {
      notices.push('当前难度词条不足，已临时使用全题库出题。')
    }

    mode.value = nextMode
    requestedCount.value = resolvedCount
    difficulty.value = nextDifficulty
    status.value = 'playing'
    roundStartedAt.value = new Date().toISOString()
    roundWords.value = selection.words
    kanjiCards.value = board.kanjiCards
    rubyCards.value = board.rubyCards
    roundNotice.value = notices.join(' ') || null
    roundNewLearnedWordIds.value = []
    roundResult.value = null
    resetSelectionFeedback()

    lastRoundConfig.value = {
      mode: nextMode,
      count: resolvedCount,
      difficulty: nextDifficulty
    }
  }

  /**
   * 根据卡片 ID 找到汉字卡。
   */
  function findKanjiCardById(cardId: string): KanjiCard | undefined {
    return kanjiCards.value.find((card) => card.id === cardId)
  }

  /**
   * 根据卡片 ID 找到振假名卡。
   */
  function findRubyCardById(cardId: string): RubyCard | undefined {
    return rubyCards.value.find((card) => card.id === cardId)
  }

  /**
   * 设置汉字卡选中状态。
   */
  function selectKanjiCard(cardId: string): void {
    if (status.value !== 'playing') {
      return
    }

    const targetCard = findKanjiCardById(cardId)
    if (!targetCard || targetCard.removed) {
      return
    }

    selectedKanjiCardId.value = cardId
    wrongKanjiCardIds.value = []
    wrongRubyCardIds.value = []
  }

  /**
   * 处理错误匹配反馈。
   */
  function handleWrongMatch(kanjiCardId: string, rubyCardId: string): void {
    wrongKanjiCardIds.value = [kanjiCardId]
    wrongRubyCardIds.value = [rubyCardId]
    selectedKanjiCardId.value = null

    // 短暂展示错误反馈后恢复。
    setTimeout(() => {
      wrongKanjiCardIds.value = []
      wrongRubyCardIds.value = []
    }, 320)
  }

  /**
   * 把已匹配成功的一对卡片标记为移除。
   */
  function markPairAsRemoved(kanjiCardId: string, rubyCardId: string): void {
    kanjiCards.value = kanjiCards.value.map((card) => {
      if (card.id === kanjiCardId) {
        return { ...card, removed: true }
      }

      return card
    })

    rubyCards.value = rubyCards.value.map((card) => {
      if (card.id === rubyCardId) {
        return { ...card, removed: true }
      }

      return card
    })
  }

  /**
   * 查询词条实体。
   */
  function findWordById(wordId: string): Word | undefined {
    return wordRepository.getWordById(wordId)
  }

  /**
   * 处理正确匹配：消卡、更新学习记录、检查结算。
   */
  function handleCorrectMatch(kanjiCard: KanjiCard, rubyCard: RubyCard): void {
    markPairAsRemoved(kanjiCard.id, rubyCard.id)

    const matchedWord = findWordById(kanjiCard.wordId)
    if (matchedWord) {
      const updated = registerCorrectMatch(matchedWord, records.value, new Date().toISOString())
      records.value = updated.records
      persistRecords()

      if (updated.newlyLearned && !roundNewLearnedWordIds.value.includes(matchedWord.id)) {
        roundNewLearnedWordIds.value.push(matchedWord.id)
      }
    }

    resetSelectionFeedback()

    if (remainingPairs.value <= 0) {
      finishRound()
    }
  }

  /**
   * 选择振假名卡并进行匹配判定。
   */
  function selectRubyCard(cardId: string): void {
    if (status.value !== 'playing') {
      return
    }

    if (!selectedKanjiCardId.value) {
      return
    }

    const kanjiCard = findKanjiCardById(selectedKanjiCardId.value)
    const rubyCard = findRubyCardById(cardId)

    if (!kanjiCard || !rubyCard || kanjiCard.removed || rubyCard.removed) {
      return
    }

    if (isCorrectMatch(kanjiCard, rubyCard)) {
      handleCorrectMatch(kanjiCard, rubyCard)
      return
    }

    handleWrongMatch(kanjiCard.id, rubyCard.id)
  }

  /**
   * 结束当前局并生成结算数据。
   */
  function finishRound(): void {
    const now = new Date()
    const started = new Date(roundStartedAt.value ?? now.toISOString())
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - started.getTime()) / 1000))

    const newlyLearnedWords = roundNewLearnedWordIds.value
      .map((wordId) => findWordById(wordId))
      .filter((word): word is Word => Boolean(word))

    roundResult.value = {
      mode: mode.value,
      difficulty: difficulty.value,
      requestedCount: requestedCount.value,
      correctPairs: totalPairs.value,
      startedAt: started.toISOString(),
      finishedAt: now.toISOString(),
      elapsedSeconds,
      newlyLearnedWords
    }

    status.value = 'finished'
  }

  /**
   * 主动退出当前游戏。
   */
  function quitRound(): void {
    resetRoundState()
    roundResult.value = null
  }

  /**
   * 清除结算信息（通常在返回首页前调用）。
   */
  function clearRoundResult(): void {
    roundResult.value = null
    if (status.value === 'finished') {
      status.value = 'idle'
    }
  }

  /**
   * 使用上一局配置再开一局。
   */
  function replayLastRound(): boolean {
    if (!lastRoundConfig.value) {
      return false
    }

    startRound(lastRoundConfig.value.mode, lastRoundConfig.value.count, lastRoundConfig.value.difficulty)
    return true
  }

  /**
   * 构建统计列表（支持排序和筛选）。
   */
  function getStatistics(sortKey: StatisticsSortKey, filter: StatisticsFilter): WordStatisticItem[] {
    ensureInitialized()
    return buildStatistics(words.value, records.value, sortKey, filter)
  }

  return {
    mode,
    requestedCount,
    difficulty,
    status,
    roundNotice,
    roundWords,
    kanjiCards,
    rubyCards,
    selectedKanjiCardId,
    wrongKanjiCardIds,
    wrongRubyCardIds,
    roundResult,
    learnedWordCount,
    totalWordCount,
    difficultyProgress,
    userDifficultyLevel,
    totalPairs,
    remainingPairs,
    isPlaying,
    canStartReviewMode,
    ensureInitialized,
    startRound,
    selectKanjiCard,
    selectRubyCard,
    quitRound,
    clearRoundResult,
    replayLastRound,
    getStatistics
  }
})
