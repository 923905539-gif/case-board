# Findings — 时间轴事件删除功能

## 后端现状（全部就绪）

| Layer | File | Status |
|---|---|---|
| Database `deleteTimelineEvent` | `electron/database.ts:284-287` | ✅ EXISTS |
| Foreign key cascade | `electron/database.ts:79` | ✅ EXISTS (ON DELETE CASCADE) |
| Main Process IPC handler | `electron/main.ts:75` | ✅ EXISTS (`events:delete`) |
| Preload bridge | `electron/preload.ts:17` | ✅ EXISTS (`deleteEvent`) |
| Type declaration | `src/env.d.ts:41` | ✅ EXISTS (`deleteEvent`) |
| Store `deleteTimelineEvent` | `src/stores/clueStore.ts:180-183` | ✅ EXISTS |

## 缺失部分

- **UI 层**: `TimelineView.vue` 详情弹窗（lines 136-208）没有删除按钮
- Store 的 `deleteTimelineEvent` 函数已导出但从未被任何组件调用

## 实现方案

1. 在详情弹窗 header 添加 Delete 图标按钮（与 Edit 按钮并列）
2. 使用 `ElMessageBox.confirm` 弹出确认对话框
3. 确认后调用 `store.deleteTimelineEvent(event.id)` 并关闭弹窗
