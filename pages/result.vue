<!--
  结算页面。
  展示本局学习成果，并支持“再来一局”与返回首页。
-->
<template>
  <section class="grid" v-if="result">
    <article class="panel grid">
      <div>
        <h1 class="page-title">本局完成</h1>
        <p class="page-subtitle">继续保持，重复练习能显著提升读音记忆速度。</p>
      </div>

      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">模式</div>
          <div class="summary-value">{{ modeLabel }}</div>
        </div>

        <div class="summary-item">
          <div class="summary-label">正确配对</div>
          <div class="summary-value">{{ result.correctPairs }}</div>
        </div>

        <div class="summary-item">
          <div class="summary-label">用时（秒）</div>
          <div class="summary-value">{{ result.elapsedSeconds }}</div>
        </div>
      </div>

      <div class="panel" style="box-shadow: none; padding: 12px">
        <div class="form-label">本轮新学会单词（{{ result.newlyLearnedWords.length }}）</div>
        <div class="info" v-if="result.newlyLearnedWords.length === 0">
          本轮没有新增“首次学会”的单词，但复习也非常有价值。
        </div>
        <div class="card-list" v-else>
          <div class="word-card" v-for="word in result.newlyLearnedWords" :key="word.id">
            {{ word.kanji }}
            <div style="font-size: 12px; color: #64748b; margin-top: 4px">{{ word.ruby }}</div>
          </div>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" type="button" @click="onReplay">再来一局</button>
        <button class="btn btn-secondary" type="button" @click="onBackHome">返回首页</button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { GAME_MODE_LABELS } from '~/layers/domain/valueObjects/GameMode'
import { useGameStore } from '~/layers/presentation/stores/gameStore'

const store = useGameStore()

/**
 * 当前结算数据。
 */
const result = computed(() => store.roundResult)

/**
 * 模式展示文本。
 */
const modeLabel = computed(() => {
  if (!result.value) {
    return '-'
  }

  return GAME_MODE_LABELS[result.value.mode]
})

/**
 * 页面进入时校验结算数据。
 */
onMounted(async () => {
  store.ensureInitialized()

  if (!store.roundResult) {
    await navigateTo('/')
  }
})

/**
 * 沿用上局配置再开一局。
 */
async function onReplay(): Promise<void> {
  const success = store.replayLastRound()

  if (!success) {
    await navigateTo('/')
    return
  }

  await navigateTo('/game')
}

/**
 * 返回首页并清理本局结算。
 */
async function onBackHome(): Promise<void> {
  store.quitRound()
  store.clearRoundResult()
  await navigateTo('/')
}
</script>
