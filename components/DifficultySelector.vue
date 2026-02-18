<!--
  难度选择组件。
  支持 1~10 级难度切换，并展示当前难度说明。
-->
<template>
  <div class="form-group">
    <div class="form-label">难度等级（1-10）</div>
    <div class="option-row">
      <button
        v-for="difficulty in difficulties"
        :key="difficulty"
        type="button"
        class="option-chip"
        :class="{ active: difficulty === modelValue }"
        @click="onSelectDifficulty(difficulty)"
      >
        Lv.{{ difficulty }}
      </button>
    </div>
    <div class="info">当前：{{ labels[modelValue] }}。{{ difficultyHint }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_LEVELS,
  type DifficultyLevel
} from '~/layers/domain/valueObjects/DifficultyLevel'

/** 当前选中的难度。 */
const props = defineProps<{
  modelValue: DifficultyLevel
}>()

/** `v-model` 回写事件。 */
const emit = defineEmits<{
  (event: 'update:modelValue', value: DifficultyLevel): void
}>()

/** 可选难度列表。 */
const difficulties = DIFFICULTY_LEVELS

/** 难度展示文案映射。 */
const labels = DIFFICULTY_LABELS

/** 难度解释文案。 */
const difficultyHint = computed(() => {
  if (props.modelValue <= 3) {
    return '偏高频词，适合建立基础读音记忆。'
  }

  if (props.modelValue <= 7) {
    return '覆盖常见到进阶词，适合稳定提升。'
  }

  return '偏低频词，适合冲刺和查漏补缺。'
})

/**
 * 处理难度点击。
 */
function onSelectDifficulty(difficulty: DifficultyLevel): void {
  emit('update:modelValue', difficulty)
}
</script>
