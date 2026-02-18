/**
 * Nuxt 全局配置。
 * 这里启用 Pinia、全局样式，并将项目设置为客户端渲染，
 * 以便直接使用 localStorage 持久化学习记录。
 */
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: false,
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: '日语汉字消消乐',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '通过汉字与振假名配对进行日语学习。' }
      ]
    }
  }
})
