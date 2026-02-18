<!--
  模式选择组件。
  使用 v-model 绑定当前模式，保持页面层代码简洁。
-->
<template>
  <div class="form-group">
    <div class="form-label">出题模式</div>
    <div class="option-row">
      <button
        v-for="mode in modes"
        :key="mode"
        type="button"
        class="option-chip"
        :class="{ active: mode === modelValue }"
        @click="onSelectMode(mode)"
      >
        {{ labels[mode] }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GAME_MODE_LABELS, GAME_MODES, type GameMode } from '~/layers/domain/valueObjects/GameMode'

/** 当前选中的模式。 */
defineProps<{
  modelValue: GameMode
}>()

/** `v-model` 回写事件。 */
const emit = defineEmits<{
  (event: 'update:modelValue', value: GameMode): void
}>()

/** 可选模式列表。 */
const modes = GAME_MODES

/** 展示文案映射。 */
const labels = GAME_MODE_LABELS

/**
 * 处理模式点击。
 */
function onSelectMode(mode: GameMode): void {
  emit('update:modelValue', mode)
}
</script>
