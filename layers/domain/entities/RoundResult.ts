import type { GameMode } from '../valueObjects/GameMode'
import type { Word } from './Word'

/**
 * 单局结算实体。
 * 用于结算页面展示结果，以及“再来一局”保留配置。
 */
export interface RoundResult {
  mode: GameMode
  requestedCount: number
  correctPairs: number
  startedAt: string
  finishedAt: string
  elapsedSeconds: number
  newlyLearnedWords: Word[]
}
