/**
 * 随机工具：数组洗牌（Fisher-Yates）。
 * 返回新数组，不修改原数组。
 */
export function shuffleArray<T>(source: T[]): T[] {
  const arr = [...source]

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp
  }

  return arr
}

/**
 * 从数组里随机取 N 个不重复元素。
 * 当数量不足时，返回全部可用元素。
 */
export function pickRandomUnique<T>(source: T[], count: number): T[] {
  return shuffleArray(source).slice(0, Math.max(0, count))
}
