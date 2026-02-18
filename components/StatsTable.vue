<!--
  统计表组件。
  展示单词学习详情，供统计页复用。
-->
<template>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>汉字</th>
          <th>振假名</th>
          <th>日语意思</th>
          <th>中文意思</th>
          <th>例句</th>
          <th>例句翻译</th>
          <th>累计正确</th>
          <th>最近学习时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.wordId">
          <td>{{ item.kanji }}</td>
          <td>{{ item.ruby }}</td>
          <td class="line-break">{{ formatMeanings(item.jpMeanings) }}</td>
          <td class="line-break">{{ formatMeanings(item.zhMeanings) }}</td>
          <td class="line-break">{{ item.exampleSentence || '-' }}</td>
          <td class="line-break">{{ item.exampleTranslation || '-' }}</td>
          <td>{{ item.correctCount }}</td>
          <td>{{ formatDateTime(item.lastCorrectAt) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { WordStatisticItem } from '~/layers/application/usecases/BuildStatisticsUseCase'

/** 统计数据行。 */
defineProps<{
  items: WordStatisticItem[]
}>()

/**
 * 格式化时间字符串。
 */
function formatDateTime(value: string | null): string {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

/**
 * 格式化义项数组用于表格显示。
 */
function formatMeanings(meanings: string[]): string {
  if (!meanings.length) {
    return '-'
  }

  return meanings.join(' / ')
}
</script>
