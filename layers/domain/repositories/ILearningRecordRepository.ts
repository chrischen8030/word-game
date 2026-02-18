import type { LearningRecordMap } from '../entities/LearningRecord'

/**
 * 学习记录仓储接口。
 * 用于隔离 localStorage / API 等不同存储实现。
 */
export interface ILearningRecordRepository {
  /** 读取全部学习记录。 */
  getAllRecords(): LearningRecordMap

  /** 覆盖写入全部学习记录。 */
  saveAllRecords(records: LearningRecordMap): void
}
