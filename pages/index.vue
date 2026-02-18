<!--
  首页。
  负责模式选择、题量选择、开始游戏与进入统计页。
-->
<template>
  <section class="grid">
    <article class="panel grid">
      <div>
        <h1 class="page-title">日语汉字消消乐</h1>
        <p class="page-subtitle">
          左侧点汉字，右侧点振假名。匹配成功即可消除并累计学习记录。
        </p>
      </div>

      <ModeSelector v-model="selectedMode" />
      <CountSelector v-model="selectedCount" />

      <div class="notice" v-if="selectedMode === 'review' && !store.canStartReviewMode">
        当前还没有“已学单词”，复习模式会自动回退到未学单词出题。
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" type="button" @click="onStartGame">开始游戏</button>
        <button class="btn btn-secondary" type="button" @click="onOpenStats">学习统计</button>
      </div>

      <div class="info">
        题库总数：{{ store.totalWordCount }}，已学单词：{{ store.learnedWordCount }}
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CountSelector from '~/components/CountSelector.vue'
import ModeSelector from '~/components/ModeSelector.vue'
import type { GameMode } from '~/layers/domain/valueObjects/GameMode'
import { useGameStore } from '~/layers/presentation/stores/gameStore'

const store = useGameStore()
const selectedMode = ref<GameMode>('newbie')
const selectedCount = ref<number>(10)

/**
 * 初始化首页默认选项。
 */
onMounted(() => {
  store.ensureInitialized()
  selectedMode.value = store.mode
  selectedCount.value = store.requestedCount
})

/**
 * 开始新游戏并跳转到游戏页。
 */
async function onStartGame(): Promise<void> {
  store.startRound(selectedMode.value, selectedCount.value)
  await navigateTo('/game')
}

/**
 * 跳转到统计页。
 */
async function onOpenStats(): Promise<void> {
  await navigateTo('/stats')
}
</script>
