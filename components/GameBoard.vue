<!--
  游戏面板组件。
  左列汉字、右列振假名，组件只负责展示和点击事件上抛。
-->
<template>
  <div class="game-board">
    <section class="card-column">
      <h3>左侧：汉字</h3>
      <TransitionGroup name="fade" tag="div" class="card-list">
        <button
          v-for="card in visibleKanjiCards"
          :key="card.id"
          type="button"
          class="word-card"
          :class="{
            selected: selectedKanjiCardId === card.id,
            wrong: wrongKanjiCardIds.includes(card.id)
          }"
          @click="onSelectKanji(card.id)"
        >
          {{ card.text }}
        </button>
      </TransitionGroup>
    </section>

    <section class="card-column">
      <h3>右侧：振假名</h3>
      <TransitionGroup name="fade" tag="div" class="card-list">
        <button
          v-for="card in visibleRubyCards"
          :key="card.id"
          type="button"
          class="word-card ruby"
          :class="{ wrong: wrongRubyCardIds.includes(card.id) }"
          @click="onSelectRuby(card.id)"
        >
          {{ card.text }}
        </button>
      </TransitionGroup>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { KanjiCard, RubyCard } from '~/layers/domain/entities/GameCard'

const props = defineProps<{
  kanjiCards: KanjiCard[]
  rubyCards: RubyCard[]
  selectedKanjiCardId: string | null
  wrongKanjiCardIds: string[]
  wrongRubyCardIds: string[]
}>()

const emit = defineEmits<{
  (event: 'select-kanji', cardId: string): void
  (event: 'select-ruby', cardId: string): void
}>()

/**
 * 过滤已经消除的汉字卡。
 */
const visibleKanjiCards = computed(() => props.kanjiCards.filter((card) => !card.removed))

/**
 * 过滤已经消除的振假名卡。
 */
const visibleRubyCards = computed(() => props.rubyCards.filter((card) => !card.removed))

/**
 * 上抛汉字卡点击事件。
 */
function onSelectKanji(cardId: string): void {
  emit('select-kanji', cardId)
}

/**
 * 上抛振假名卡点击事件。
 */
function onSelectRuby(cardId: string): void {
  emit('select-ruby', cardId)
}
</script>
