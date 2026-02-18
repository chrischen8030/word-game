import type { KanjiCard, RubyCard } from '../../domain/entities/GameCard'

/**
 * 匹配判断用例。
 * 只要左右卡片的 `wordId` 一致，即判定匹配成功。
 */
export function isCorrectMatch(kanjiCard?: KanjiCard, rubyCard?: RubyCard): boolean {
  if (!kanjiCard || !rubyCard) {
    return false
  }

  return kanjiCard.wordId === rubyCard.wordId
}
