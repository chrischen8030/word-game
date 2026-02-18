import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore'
import { useRuntimeConfig } from '#imports'
import type { LearningDataBackup } from '../../domain/entities/LearningDataBackup'

/**
 * Firebase 同步返回信息。
 */
export interface FirebaseSyncResult {
  uid: string
  email: string | null
  versionKey: string
}

/**
 * Firebase 登录用户信息。
 */
export interface FirebaseAuthUser {
  uid: string
  email: string | null
}

/**
 * 远程学习备份数据结构。
 */
export interface RemoteLearningBackup {
  versionKey: string
  backup: LearningDataBackup
}

/**
 * 从运行时配置中提取 Firebase 参数。
 * 缺少关键参数时返回 null，交由上层提示用户配置。
 */
function resolveFirebaseOptions(): FirebaseOptions | null {
  const config = useRuntimeConfig()

  const options: FirebaseOptions = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    appId: config.public.firebaseAppId,
    storageBucket: config.public.firebaseStorageBucket || undefined,
    messagingSenderId: config.public.firebaseMessagingSenderId || undefined
  }

  if (!options.apiKey || !options.authDomain || !options.projectId || !options.appId) {
    return null
  }

  return options
}

/**
 * 获取 Firebase App 实例。
 * 仅在点击“同步”时调用，避免页面加载阶段触发 Firebase 初始化。
 */
function getFirebaseAppInstance() {
  const options = resolveFirebaseOptions()

  if (!options) {
    throw new Error('Firebase 配置不完整，请先设置 NUXT_PUBLIC_FIREBASE_* 环境变量。')
  }

  if (getApps().length > 0) {
    return getApp()
  }

  return initializeApp(options)
}

/**
 * 生成可读的版本号（日期键）。
 * 示例：`2026-02-19 03:55:42`
 */
function buildVersionKey(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 弹出 Google 登录并返回用户信息。
 */
async function signInWithGoogle(appInstance: ReturnType<typeof getFirebaseAppInstance>) {
  const auth = getAuth(appInstance)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return signInWithPopup(auth, provider)
}

/**
 * 等待 Firebase Auth 恢复本地登录态（若存在）。
 * 避免页面刚加载时 `currentUser` 仍为空。
 */
async function waitForAuthReady(auth: ReturnType<typeof getAuth>): Promise<void> {
  const authWithReady = auth as ReturnType<typeof getAuth> & { authStateReady?: () => Promise<void> }

  if (typeof authWithReady.authStateReady === 'function') {
    await authWithReady.authStateReady()
    return
  }

  await new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe()
      resolve()
    })
  })
}

/**
 * 获取远程备份文档引用。
 */
function getRemoteBackupDoc(uid: string) {
  const appInstance = getFirebaseAppInstance()
  const db = getFirestore(appInstance)
  return doc(db, 'users', uid, 'backups', 'learning_records')
}

/**
 * 确保用户已登录。
 * 未登录时才弹出 Google 登录。
 */
async function ensureSignedIn() {
  const appInstance = getFirebaseAppInstance()
  const auth = getAuth(appInstance)
  await waitForAuthReady(auth)

  if (auth.currentUser) {
    return auth.currentUser
  }

  const credential = await signInWithGoogle(appInstance)
  return credential.user
}

/**
 * 获取当前登录用户（不触发登录弹窗）。
 */
export async function getCurrentFirebaseAuthUser(): Promise<FirebaseAuthUser | null> {
  const appInstance = getFirebaseAppInstance()
  const auth = getAuth(appInstance)
  await waitForAuthReady(auth)
  const user = auth.currentUser

  if (!user) {
    return null
  }

  return {
    uid: user.uid,
    email: user.email ?? null
  }
}

/**
 * 在已登录前提下读取服务端版本号。
 * 若未登录或无远程备份，返回 null。
 */
export async function getRemoteBackupVersionIfSignedIn(): Promise<string | null> {
  const appInstance = getFirebaseAppInstance()
  const auth = getAuth(appInstance)
  await waitForAuthReady(auth)

  if (!auth.currentUser) {
    return null
  }

  const snapshot = await getDoc(getRemoteBackupDoc(auth.currentUser.uid))
  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data() as { versionKey?: unknown }
  return typeof data.versionKey === 'string' ? data.versionKey : null
}

/**
 * 把本地学习数据同步到 Firestore。
 * 路径：`users/{uid}/backups/learning_records`。
 */
export async function syncLearningDataToFirebase(payload: LearningDataBackup): Promise<FirebaseSyncResult> {
  const user = await ensureSignedIn()
  const now = new Date()
  const versionKey = buildVersionKey(now)

  await setDoc(
    getRemoteBackupDoc(user.uid),
    {
      versionKey,
      backup: payload,
      source: 'web-local-manual-sync',
      syncedAt: serverTimestamp(),
      syncedAtClientISO: now.toISOString(),
      user: {
        uid: user.uid,
        email: user.email ?? null
      }
    },
    // 使用覆盖写入，明确替换服务端当前备份。
    { merge: false }
  )

  return {
    uid: user.uid,
    email: user.email ?? null,
    versionKey
  }
}

/**
 * 从 Firebase 拉取学习备份（必要时触发登录）。
 */
export async function fetchRemoteLearningData(): Promise<RemoteLearningBackup> {
  const user = await ensureSignedIn()
  const snapshot = await getDoc(getRemoteBackupDoc(user.uid))

  if (!snapshot.exists()) {
    throw new Error('服务端暂无可用学习备份。')
  }

  const raw = snapshot.data() as {
    versionKey?: unknown
    backup?: unknown
  }

  const versionKey = typeof raw.versionKey === 'string' ? raw.versionKey : null
  if (!versionKey) {
    throw new Error('服务端备份缺少版本号，无法导入。')
  }

  // 兼容旧结构：若没有 backup 字段，则尝试把整个文档当作备份对象。
  const rawBackup = (raw.backup ?? raw) as Partial<LearningDataBackup>
  if (!rawBackup || typeof rawBackup !== 'object' || !rawBackup.records) {
    throw new Error('服务端备份格式不正确，无法导入。')
  }

  const backup: LearningDataBackup = {
    schemaVersion: typeof rawBackup.schemaVersion === 'string' ? rawBackup.schemaVersion : '1.0.0',
    exportedAt: typeof rawBackup.exportedAt === 'string' ? rawBackup.exportedAt : new Date().toISOString(),
    gameConfig: {
      mode: rawBackup.gameConfig?.mode === 'review' ? 'review' : 'newbie',
      requestedCount: Number(rawBackup.gameConfig?.requestedCount ?? 10),
      difficulty: Number(rawBackup.gameConfig?.difficulty ?? 1) as LearningDataBackup['gameConfig']['difficulty']
    },
    summary: {
      learnedWordCount: Number(rawBackup.summary?.learnedWordCount ?? 0),
      totalWordCount: Number(rawBackup.summary?.totalWordCount ?? 0)
    },
    records: rawBackup.records
  }

  return {
    versionKey,
    backup
  }
}

/**
 * 主动退出 Firebase 登录。
 * 注意：仅退出账号，不会删除本地学习数据。
 */
export async function signOutFirebaseAuth(): Promise<void> {
  const appInstance = getFirebaseAppInstance()
  const auth = getAuth(appInstance)
  await signOut(auth)
}
