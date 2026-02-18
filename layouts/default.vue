<!--
  默认布局。
  提供统一导航和主内容容器，避免每个页面重复写公共结构。
-->
<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink class="brand" to="/">日语汉字消消乐</NuxtLink>
      <nav class="topbar-nav">
        <NuxtLink to="/">首页</NuxtLink>
        <NuxtLink to="/stats">学习统计</NuxtLink>
      </nav>
    </header>

    <main class="page-container">
      <slot />
    </main>
  </div>
</template>
