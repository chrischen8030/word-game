<!--
  游戏页面。
  展示卡片对战区、进度信息和退出操作。
-->
<template>
  <section class="grid">
    <article class="panel grid">
      <div class="btn-row" style="justify-content: space-between; align-items: center">
        <div class="btn-row">
          <div class="badge">进度：剩余 {{ store.remainingPairs }} / 总计 {{ store.totalPairs }}</div>
          <div class="badge">难度：{{ DIFFICULTY_LABELS[store.difficulty] }}</div>
        </div>
        <button class="btn btn-danger" type="button" @click="onQuitGame">退出本局</button>
      </div>

      <div class="notice" v-if="store.roundNotice">
        {{ store.roundNotice }}
      </div>

      <GameBoard
        :kanji-cards="store.kanjiCards"
        :ruby-cards="store.rubyCards"
        :selected-kanji-card-id="store.selectedKanjiCardId"
        :wrong-kanji-card-ids="store.wrongKanjiCardIds"
        :wrong-ruby-card-ids="store.wrongRubyCardIds"
        @select-kanji="onSelectKanji"
        @select-ruby="onSelectRuby"
      />

      <div class="info">操作顺序：先点左侧汉字，再点右侧振假名。</div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import GameBoard from '~/components/GameBoard.vue'
import { DIFFICULTY_LABELS } from '~/layers/domain/valueObjects/DifficultyLevel'
import { useGameStore } from '~/layers/presentation/stores/gameStore'

const store = useGameStore()

/**
 * 页面进入时校验是否存在进行中的游戏。
 */
onMounted(async () => {
  store.ensureInitialized()

  if (store.status === 'finished') {
    await navigateTo('/result')
    return
  }

  if (!store.isPlaying) {
    await navigateTo('/')
  }
})

/**
 * 监听对局状态，完成后自动跳转结算页。
 */
watch(
  () => store.status,
  async (status) => {
    if (status === 'finished') {
      await navigateTo('/result')
    }
  }
)

/**
 * 选择汉字卡。
 */
function onSelectKanji(cardId: string): void {
  store.selectKanjiCard(cardId)
}

/**
 * 选择振假名卡。
 */
function onSelectRuby(cardId: string): void {
  store.selectRubyCard(cardId)
}

/**
 * 退出本局并返回首页（含确认）。
 */
async function onQuitGame(): Promise<void> {
  const shouldQuit = window.confirm('确定退出本局吗？当前进度不会计入结算。')

  if (!shouldQuit) {
    return
  }

  store.quitRound()
  await navigateTo('/')
}
</script>
