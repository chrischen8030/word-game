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
          <div class="summary-label">难度</div>
          <div class="summary-value">{{ difficultyLabel }}</div>
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
        <div class="result-new-list" v-else>
          <article class="result-new-item" v-for="word in result.newlyLearnedWords" :key="word.id">
            <div class="result-new-head">
              <strong>{{ word.kanji }}</strong>
              <span>{{ word.ruby }}</span>
            </div>
            <div class="result-new-text">{{ formatMeanings(word.jpMeanings) }}</div>
            <div class="result-new-text">{{ formatMeanings(word.zhMeanings) }}</div>
          </article>
        </div>
      </div>

      <div class="panel" style="box-shadow: none; padding: 12px">
        <div class="form-label">本轮词条详情（{{ roundWordDetails.length }}）</div>

        <div class="info" v-if="roundWordDetails.length === 0">
          当前没有可展示的词条详情。
        </div>

        <div class="table-wrap desktop-only" v-else>
          <table class="table">
            <thead>
              <tr>
                <th>汉字</th>
                <th>振假名</th>
                <th>日语意思</th>
                <th>中文意思</th>
                <th>例句</th>
                <th>例句翻译</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="word in roundWordDetails" :key="word.id">
                <td>{{ word.kanji }}</td>
                <td>{{ word.ruby }}</td>
                <td class="line-break">{{ formatMeanings(word.jpMeanings) }}</td>
                <td class="line-break">{{ formatMeanings(word.zhMeanings) }}</td>
                <td class="line-break">{{ word.exampleSentence || '-' }}</td>
                <td class="line-break">{{ word.exampleTranslation || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mobile-word-list mobile-only" v-if="roundWordDetails.length > 0">
          <article class="mobile-word-card" v-for="word in roundWordDetails" :key="word.id">
            <div class="mobile-word-head">
              <strong>{{ word.kanji }}</strong>
              <span>{{ word.ruby }}</span>
            </div>

            <div class="mobile-word-field">
              <div class="mobile-word-label">日语意思</div>
              <div class="mobile-word-value">{{ formatMeanings(word.jpMeanings) }}</div>
            </div>

            <div class="mobile-word-field">
              <div class="mobile-word-label">中文意思</div>
              <div class="mobile-word-value">{{ formatMeanings(word.zhMeanings) }}</div>
            </div>

            <div class="mobile-word-field">
              <div class="mobile-word-label">例句</div>
              <div class="mobile-word-value">{{ word.exampleSentence || '-' }}</div>
            </div>

            <div class="mobile-word-field">
              <div class="mobile-word-label">例句翻译</div>
              <div class="mobile-word-value">{{ word.exampleTranslation || '-' }}</div>
            </div>
          </article>
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
import { DIFFICULTY_LABELS } from '~/layers/domain/valueObjects/DifficultyLevel'
import { GAME_MODE_LABELS } from '~/layers/domain/valueObjects/GameMode'
import { useGameStore } from '~/layers/presentation/stores/gameStore'

const store = useGameStore()

/**
 * 当前结算数据。
 */
const result = computed(() => store.roundResult)

/**
 * 本轮出现的所有词条。
 */
const roundWordDetails = computed(() => {
  const uniqueMap = new Map(store.roundWords.map((word) => [word.id, word]))
  return [...uniqueMap.values()]
})

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
 * 难度展示文本。
 */
const difficultyLabel = computed(() => {
  if (!result.value) {
    return '-'
  }

  return DIFFICULTY_LABELS[result.value.difficulty]
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

/**
 * 格式化义项数组用于展示。
 */
function formatMeanings(meanings: string[]): string {
  return meanings.length ? meanings.join(' / ') : '-'
}
</script>
