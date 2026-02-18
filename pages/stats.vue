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

        <div class="summary-item">
          <div class="summary-label">当前学习等级</div>
          <div class="summary-value">{{ DIFFICULTY_LABELS[store.userDifficultyLevel] }}</div>
        </div>
      </div>

      <div class="grid" style="gap: 10px">
        <div class="info">
          等级依据“已学词条在 1~10 难度上的分布”自动估算，可用于定位当前学习阶段。
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

      <div class="panel" style="box-shadow: none; padding: 12px">
        <div class="form-label">数据工具</div>
        <div class="info">所有同步均为手动触发，不会在页面加载时自动执行。</div>
        <div class="info" style="margin-top: 6px">
          当前登录状态：
          <strong v-if="authUser">{{ authUser.email ?? authUser.uid }}</strong>
          <strong v-else>未登录</strong>
        </div>
        <div class="info" style="margin-top: 4px">
          服务端存档版本：
          <strong>{{ remoteVersionKey || '暂无' }}</strong>
        </div>

        <div class="btn-row" style="margin-top: 10px">
          <button class="btn btn-primary" type="button" :disabled="syncing || pulling || signingOut" @click="onSyncToFirebase">
            {{ syncing ? '同步中...' : '同步本地数据到 Firebase（Google 登录）' }}
          </button>
          <button class="btn btn-secondary" type="button" :disabled="syncing || pulling || signingOut" @click="onSyncFromFirebaseToLocal">
            同步 Firebase 数据到本地（覆盖本地）
          </button>
          <button
            class="btn btn-secondary"
            type="button"
            :disabled="syncing || pulling || signingOut"
            v-if="authUser"
            @click="onSignOutFirebase"
          >
            {{ signingOut ? '登出中...' : '登出 Google' }}
          </button>
        </div>

        <div class="info" style="margin-top: 8px" v-if="syncMessage">{{ syncMessage }}</div>
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
import { DIFFICULTY_LABELS } from '~/layers/domain/valueObjects/DifficultyLevel'
import {
  fetchRemoteLearningData,
  getCurrentFirebaseAuthUser,
  getRemoteBackupVersionIfSignedIn,
  signOutFirebaseAuth,
  syncLearningDataToFirebase,
  type FirebaseAuthUser
} from '~/layers/infrastructure/firebase/FirebaseSyncService'
import { useGameStore } from '~/layers/presentation/stores/gameStore'

const store = useGameStore()

const sortKey = ref<StatisticsSortKey>('count-desc')
const filterKey = ref<StatisticsFilter>('learned')
const page = ref<number>(1)
const pageSize = 50
const syncing = ref(false)
const pulling = ref(false)
const signingOut = ref(false)
const syncMessage = ref('')
const authUser = ref<FirebaseAuthUser | null>(null)
const remoteVersionKey = ref<string | null>(null)

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
onMounted(async () => {
  store.ensureInitialized()
  await refreshFirebaseAuthState()
})

/**
 * 刷新 Firebase 登录状态（不会触发登录弹窗）。
 */
async function refreshFirebaseAuthState(): Promise<void> {
  try {
    authUser.value = await getCurrentFirebaseAuthUser()
    remoteVersionKey.value = authUser.value ? await getRemoteBackupVersionIfSignedIn() : null
  } catch {
    authUser.value = null
    remoteVersionKey.value = null
  }
}

/**
 * 手动同步：先 Google 登录，再写入 Firestore。
 */
async function onSyncToFirebase(): Promise<void> {
  const confirmed = window.confirm(
    '此操作会覆盖服务端当前备份。是否继续同步本地数据到 Firebase？'
  )

  if (!confirmed) {
    return
  }

  syncing.value = true
  syncMessage.value = ''

  try {
    const payload = store.exportLearningData()
    const result = await syncLearningDataToFirebase(payload)
    authUser.value = {
      uid: result.uid,
      email: result.email
    }
    remoteVersionKey.value = result.versionKey
    syncMessage.value = `同步成功：${result.email ?? result.uid}，服务端版本 ${result.versionKey}`
  } catch (error) {
    const fallback = '同步失败，请检查 Firebase 配置、登录弹窗权限或网络后重试。'
    syncMessage.value = error instanceof Error ? `${fallback} ${error.message}` : fallback
  } finally {
    syncing.value = false
  }
}

/**
 * 手动登出 Firebase 账号。
 * 仅退出登录，不会删除本地学习记录。
 */
async function onSignOutFirebase(): Promise<void> {
  signingOut.value = true

  try {
    await signOutFirebaseAuth()
    authUser.value = null
    remoteVersionKey.value = null
    syncMessage.value = '已退出 Google 登录。本地学习数据保留在浏览器中。'
  } catch (error) {
    const fallback = '登出失败，请稍后重试。'
    syncMessage.value = error instanceof Error ? `${fallback} ${error.message}` : fallback
  } finally {
    signingOut.value = false
  }
}

/**
 * 手动同步：把 Firebase 备份覆盖到本地。
 */
async function onSyncFromFirebaseToLocal(): Promise<void> {
  const confirmed = window.confirm(
    '此操作会用 Firebase 备份覆盖本地学习数据，本地现有数据会被删除。是否继续？'
  )

  if (!confirmed) {
    return
  }

  pulling.value = true

  try {
    const remote = await fetchRemoteLearningData()
    store.importLearningData(remote.backup)
    remoteVersionKey.value = remote.versionKey
    syncMessage.value = `已将服务端版本 ${remote.versionKey} 覆盖到本地。`
  } catch (error) {
    const fallback = '同步到本地失败，请检查登录状态、网络或服务端备份。'
    syncMessage.value = error instanceof Error ? `${fallback} ${error.message}` : fallback
  } finally {
    pulling.value = false
  }
}

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
