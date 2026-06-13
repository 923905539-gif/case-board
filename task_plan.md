# Task Plan: 时间轴事件删除功能

## Goal
在时间轴可视化的三视图（时间轴/鱼骨图/甘特图）中，为事件详情弹窗添加删除按钮，支持用户删除不需要的时间轴事件。

## Current Phase
Phase 2: 实现

## Phases

### Phase 1: 需求发现 & 代码探索
- [x] 确认后端 CRUD 完整度 → 数据库/主进程/preload/store 均已就绪
- [x] 定位缺失部分 → 仅 UI 层缺少删除触发按钮
- **Status:** complete

### Phase 2: UI 实现
- [x] TimelineView.vue 详情弹窗添加删除按钮
- [x] 添加 Element Plus 确认对话框（防误删）
- [x] 删除后关闭弹窗 + 刷新图表
- **Status:** complete

### Phase 3: 构建验证
- [x] vue-tsc --noEmit 类型检查 → 零错误
- [x] vite build 生产构建 → 成功 (13.93s)
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 删除按钮放在详情弹窗 header | 与 Edit 按钮并列，操作入口统一 |
| 使用 ElMessageBox.confirm 确认 | Element Plus 原生方案，无需额外组件 |
| 删除后关闭弹窗 | 被删事件不应继续显示在弹窗中 |

## Key Questions
1. ✅ 删除按钮放在哪里？→ 详情弹窗 header，与 Edit 按钮并列
2. ✅ 是否需要确认对话框？→ 是，防止误删
3. ✅ 删除后行为？→ 关闭弹窗，图表自动刷新（store reload）
