import type { DifficultyLevel } from '../valueObjects/DifficultyLevel'
import type { GameMode } from '../valueObjects/GameMode'
import type { LearningRecordMap } from './LearningRecord'

/**
 * 学习数据备份结构。
 * 可用于本地下载与云端同步。
 */
export interface LearningDataBackup {
  schemaVersion: string
  exportedAt: string
  gameConfig: {
    mode: GameMode
    requestedCount: number
    difficulty: DifficultyLevel
  }
  summary: {
    learnedWordCount: number
    totalWordCount: number
  }
  records: LearningRecordMap
}
