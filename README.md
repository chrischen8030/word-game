# 日语汉字消消乐（Nuxt 3）

一个用于日语汉字读音练习的配对小游戏。

## 启动方式

```bash
npm install
npm run dev
```

默认地址：`http://localhost:3000`

## 技术栈
- Nuxt 3 (Vue 3)
- Pinia
- localStorage 持久化

## 目录结构（Clean Architecture）
- `layers/domain`：领域实体、值对象、仓储接口
- `layers/application`：业务用例（出题、匹配、统计等）
- `layers/infrastructure`：题库读取与 localStorage 仓储实现
- `layers/presentation`：Pinia Store（页面状态协调）
- `pages` / `components`：页面与 UI 组件

## 题库来源
- `parsed_words_11620.json`

## 已实现功能
- 新手模式 / 复习模式
- 每局 5 / 10 / 15 对
- 1~10 难度等级出题（按词条 `level` 分层）
- 汉字-振假名配对与正确/错误反馈
- 进度展示与退出确认
- 游戏结算（模式、难度、用时、正确数、新学会单词）
- 学习统计（排序、筛选、分页）
- 学习等级定位（Lv.1~Lv.10，按已学词条难度分布估算）
- 本地学习记录持久化
