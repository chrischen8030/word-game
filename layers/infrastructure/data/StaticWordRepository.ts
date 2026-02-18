import rawWords from '~/parsed_words_11620.json'
import type { Word } from '../../domain/entities/Word'
import type { IWordRepository } from '../../domain/repositories/IWordRepository'

/**
 * 原始题库结构。
 */
interface RawWord {
  kanji?: string
  ruby?: string
}

/**
 * 检查字符串是否包含汉字。
 * 规则：含有任意 CJK Unified Ideographs 即视为“汉字词”。
 */
function containsKanji(text: string): boolean {
  return /\p{Script=Han}/u.test(text)
}

/**
 * 把原始题库条目规范化为领域实体。
 */
function normalizeWords(source: RawWord[]): Word[] {
  const normalized: Word[] = []

  source.forEach((entry, index) => {
    const kanji = (entry.kanji ?? '').trim()
    const ruby = (entry.ruby ?? '').trim()

    // 必须同时有汉字写法和假名读音。
    if (!kanji || !ruby) {
      return
    }

    // 游戏定位为“汉字-假名”匹配，因此过滤纯假名词。
    if (!containsKanji(kanji)) {
      return
    }

    normalized.push({
      id: `word-${index}`,
      kanji,
      ruby
    })
  })

  return normalized
}

/**
 * 静态题库仓储实现。
 * 直接从项目内 JSON 文件加载，并在构造时完成规范化。
 */
export class StaticWordRepository implements IWordRepository {
  private readonly words: Word[]

  constructor() {
    this.words = normalizeWords(rawWords as RawWord[])
  }

  /** 获取全部单词。 */
  getAllWords(): Word[] {
    return this.words
  }

  /** 根据 ID 获取单词。 */
  getWordById(wordId: string): Word | undefined {
    return this.words.find((word) => word.id === wordId)
  }
}
