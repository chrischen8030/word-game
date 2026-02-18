import type { KanjiCard, RubyCard } from '../../domain/entities/GameCard'
import type { Word } from '../../domain/entities/Word'
import { shuffleArray } from '../utils/random'

/**
 * 卡片板面输出。
 */
export interface BuildBoardCardsOutput {
  kanjiCards: KanjiCard[]
  rubyCards: RubyCard[]
}

/**
 * 由单词列表构建汉字卡片。
 */
function buildKanjiCards(words: Word[]): KanjiCard[] {
  return words.map((word) => ({
    id: `kanji-${word.id}`,
    wordId: word.id,
    text: word.kanji,
    removed: false
  }))
}

/**
 * 由单词列表构建振假名卡片。
 */
function buildRubyCards(words: Word[]): RubyCard[] {
  return words.map((word) => ({
    id: `ruby-${word.id}`,
    wordId: word.id,
    text: word.ruby,
    removed: false
  }))
}

/**
 * 构建并随机打乱左右两列卡片。
 */
export function buildBoardCards(words: Word[]): BuildBoardCardsOutput {
  return {
    kanjiCards: shuffleArray(buildKanjiCards(words)),
    rubyCards: shuffleArray(buildRubyCards(words))
  }
}
