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
      <DifficultySelector v-model="selectedDifficulty" />

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

      <div class="grid" style="gap: 10px">
        <div class="info">
          当前学习等级：<strong>{{ DIFFICULTY_LABELS[store.userDifficultyLevel] }}</strong>
          （依据已学词条难度分布自动估算）
        </div>

        <div class="difficulty-progress-list">
          <article
            v-for="item in store.difficultyProgress"
            :key="item.difficulty"
            class="difficulty-progress-item"
            :class="{ active: item.difficulty === store.userDifficultyLevel }"
          >
            <div class="difficulty-progress-title">Lv.{{ item.difficulty }}</div>
            <div class="difficulty-progress-bar">
              <span :style="{ width: `${Math.round(item.learnedRate * 100)}%` }"></span>
            </div>
            <div class="difficulty-progress-meta">{{ item.learnedWords }} / {{ item.totalWords }}</div>
          </article>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CountSelector from '~/components/CountSelector.vue'
import DifficultySelector from '~/components/DifficultySelector.vue'
import ModeSelector from '~/components/ModeSelector.vue'
import {
  DEFAULT_DIFFICULTY_LEVEL,
  DIFFICULTY_LABELS,
  type DifficultyLevel
} from '~/layers/domain/valueObjects/DifficultyLevel'
import type { GameMode } from '~/layers/domain/valueObjects/GameMode'
import { useGameStore } from '~/layers/presentation/stores/gameStore'

const store = useGameStore()
const selectedMode = ref<GameMode>('newbie')
const selectedCount = ref<number>(10)
const selectedDifficulty = ref<DifficultyLevel>(DEFAULT_DIFFICULTY_LEVEL)

/**
 * 初始化首页默认选项。
 */
onMounted(() => {
  store.ensureInitialized()
  selectedMode.value = store.mode
  selectedCount.value = store.requestedCount
  selectedDifficulty.value = store.difficulty
})

/**
 * 开始新游戏并跳转到游戏页。
 */
async function onStartGame(): Promise<void> {
  store.startRound(selectedMode.value, selectedCount.value, selectedDifficulty.value)
  await navigateTo('/game')
}

/**
 * 跳转到统计页。
 */
async function onOpenStats(): Promise<void> {
  await navigateTo('/stats')
}
</script>
