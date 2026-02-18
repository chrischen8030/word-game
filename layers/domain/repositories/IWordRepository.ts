import type { Word } from '../entities/Word'

/**
 * 题库仓储接口。
 * Domain 层只依赖接口，不依赖具体数据来源。
 */
export interface IWordRepository {
  /** 获取全部可用词条。 */
  getAllWords(): Word[]

  /** 根据 ID 查询单个词条。 */
  getWordById(wordId: string): Word | undefined
}
