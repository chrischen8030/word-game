<!--
  统计页面。
  展示学习成果，支持排序、筛选和分页浏览。
-->
<template>
  <section class="grid">
    <article class="panel grid">
      <div>
        <h1 class="page-title">学习统计</h1>
        <p class="page-subtitle">查看你的累计学习记录，并识别需要重点复习的词条。</p>
      </div>

      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">题库总词数</div>
          <div class="summary-value">{{ store.totalWordCount }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">已学词数</div>
          <div class="summary-value">{{ store.learnedWordCount }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">当前结果数</div>
          <div class="summary-value">{{ filteredItems.length }}</div>
        </div>
      </div>

      <div class="grid stats-controls" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))">
        <label class="form-group">
          <span class="form-label">排序</span>
          <select v-model="sortKey" class="option-chip stats-select" style="border-radius: 10px">
            <option value="count-desc">正确次数（高到低）</option>
            <option value="count-asc">正确次数（低到高）</option>
            <option value="recent-desc">最近学习（新到旧）</option>
            <option value="recent-asc">最近学习（旧到新）</option>
            <option value="kanji-asc">按汉字（A-Z）</option>
          </select>
        </label>

        <label class="form-group">
          <span class="form-label">筛选</span>
          <select v-model="filterKey" class="option-chip stats-select" style="border-radius: 10px">
            <option value="learned">只看已学</option>
            <option value="all">全部</option>
            <option value="unlearned">只看未学</option>
          </select>
        </label>
      </div>

      <div class="info" v-if="filteredItems.length === 0">当前筛选条件下暂无数据。</div>
      <StatsTable v-else :items="pagedItems" />

      <div class="btn-row stats-pagination" v-if="totalPages > 1">
        <button class="btn btn-secondary" type="button" :disabled="page <= 1" @click="onPrevPage">上一页</button>
        <span class="badge">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="btn btn-secondary" type="button" :disabled="page >= totalPages" @click="onNextPage">下一页</button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import StatsTable from '~/components/StatsTable.vue'
import type { StatisticsFilter, StatisticsSortKey } from '~/layers/application/usecases/BuildStatisticsUseCase'
import { useGameStore } from '~/layers/presentation/stores/gameStore'

const store = useGameStore()

const sortKey = ref<StatisticsSortKey>('count-desc')
const filterKey = ref<StatisticsFilter>('learned')
const page = ref<number>(1)
const pageSize = 50

/**
 * 完整筛选结果。
 */
const filteredItems = computed(() => {
  return store.getStatistics(sortKey.value, filterKey.value)
})

/**
 * 总页数。
 */
const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredItems.value.length / pageSize))
})

/**
 * 当前页数据。
 */
const pagedItems = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredItems.value.slice(start, start + pageSize)
})

/**
 * 确保页码在合法区间内。
 */
function clampPage(): void {
  if (page.value > totalPages.value) {
    page.value = totalPages.value
  }

  if (page.value < 1) {
    page.value = 1
  }
}

/**
 * 上一页。
 */
function onPrevPage(): void {
  page.value -= 1
  clampPage()
}

/**
 * 下一页。
 */
function onNextPage(): void {
  page.value += 1
  clampPage()
}

/**
 * 页面初始化。
 */
onMounted(() => {
  store.ensureInitialized()
})

/**
 * 当排序或筛选变化时，从第一页重新看。
 */
watch([sortKey, filterKey], () => {
  page.value = 1
})

/**
 * 当数据总量变化时，修正页码。
 */
watch(totalPages, () => {
  clampPage()
})
</script>
