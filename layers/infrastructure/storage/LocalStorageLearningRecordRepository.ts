import type { LearningRecordMap } from '../../domain/entities/LearningRecord'
import type { ILearningRecordRepository } from '../../domain/repositories/ILearningRecordRepository'

/**
 * localStorage Key。
 */
const STORAGE_KEY = 'jp-kanji-match-learning-records-v1'

/**
 * 判断当前环境是否可访问 localStorage。
 */
function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/**
 * 安全解析 JSON。
 * 解析失败时返回空记录，避免页面崩溃。
 */
function safeParseRecords(rawText: string | null): LearningRecordMap {
  if (!rawText) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawText) as LearningRecordMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * 学习记录仓储（localStorage 实现）。
 */
export class LocalStorageLearningRecordRepository implements ILearningRecordRepository {
  /** 读取全部记录。 */
  getAllRecords(): LearningRecordMap {
    if (!hasLocalStorage()) {
      return {}
    }

    return safeParseRecords(window.localStorage.getItem(STORAGE_KEY))
  }

  /** 保存全部记录。 */
  saveAllRecords(records: LearningRecordMap): void {
    if (!hasLocalStorage()) {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }
}
