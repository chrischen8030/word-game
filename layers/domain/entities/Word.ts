/**
 * 单词实体。
 * `id` 作为系统内部唯一标识，`kanji` 和 `ruby` 用于展示和匹配。
 */
export interface Word {
  id: string
  kanji: string
  ruby: string
}
