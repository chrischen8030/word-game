<!--
  题量选择组件。
  允许用户快速切换每局配对数量。
-->
<template>
  <div class="form-group">
    <div class="form-label">每局数量</div>
    <div class="option-row">
      <button
        v-for="count in countOptions"
        :key="count"
        type="button"
        class="option-chip"
        :class="{ active: count === modelValue }"
        @click="onSelectCount(count)"
      >
        {{ count }} 对
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/** 当前选中的题量。 */
defineProps<{
  modelValue: number
}>()

/** `v-model` 回写事件。 */
const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void
}>()

/** 固定题量选项。 */
const countOptions = [5, 10, 15]

/**
 * 处理题量点击。
 */
function onSelectCount(count: number): void {
  emit('update:modelValue', count)
}
</script>
