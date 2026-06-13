# Task Plan: 功能改进 — 编辑、弹窗修复、导入导出一致性

## Goal
对案件线索管理看板进行三项功能改进：线索和事件全部可编辑、修复弹窗关闭按钮溢出、导入模板与导出备份格式统一。

## Current Phase
✅ 全部完成

## Phases

### Phase 1: 线索编辑功能
- [x] ClueList.vue: 操作列添加编辑按钮（Edit icon）
- [x] ClueList.vue: 实现编辑线索对话框（全部12个字段可编辑）
- [x] Store: 新增 updateClue action（IPC 通道已就绪）
- [x] 测试编辑后列表刷新
- **Status:** complete

### Phase 2: 时间轴事件编辑功能
- [x] TimelineView.vue: 事件详情弹窗添加编辑按钮
- [x] TimelineView.vue: 复用添加对话框实现编辑（预填表单数据）
- [x] 调用 store.updateTimelineEvent（IPC 通道已就绪）
- [x] 测试编辑后图表刷新
- **Status:** complete

### Phase 3: 修复事件详情弹窗关闭按钮溢出
- [x] `.detail-close` 从 `top: -18px` 改为 `top: 14px`（移入卡片可视区）
- [x] `.detail-card` padding-top 从 28px 增至 44px（为关闭按钮预留空间）
- [x] 调整 right 从 6px 至 14px 对齐
- **Status:** complete

### Phase 4: 导入模板与导出备份格式统一
- [x] `export:template`: 增加"案件管理" Sheet（表头 + 示例数据）
- [x] `import:execute`: 读取"案件管理" Sheet 并导入任务数据（支持中英文状态/紧急程度映射）
- [x] 确认导出备份已包含全部4个Sheet（无需改动）
- [x] 导入模板与导出备份列名一致
- **Status:** complete

### Phase 5: 构建验证
- [x] vue-tsc --noEmit → 零 TypeScript 错误
- [x] vite build → 生产构建成功 (2,182 modules, 13.55s)
- [x] electron-builder → 打包成功，安装包输出至 release/
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 线索编辑用独立 dialog | 与 TaskBoard 编辑模式一致，避免只读/编辑双模式复杂度 |
| 事件编辑复用已有 form | 减少代码重复，添加/编辑共享同一表单 |
| 关闭按钮移入卡片内 | 避免被视口裁切，更稳定可靠 |
| 导入增加任务 Sheet 读取 | 与导出的4 Sheet结构完全对应 |
| 任务导入为追加模式 | 不删除已有任务，避免误删用户数据 |

## Modified Files
| File | Change |
|------|--------|
| src/stores/clueStore.ts | 新增 updateClue action + export |
| src/components/ClueList.vue | 编辑按钮 + Edit icon + edit dialog (12字段) + form CSS |
| src/components/TimelineView.vue | 详情弹窗编辑按钮 + 复用对话框编辑 + 关闭按钮 CSS 修复 + Edit icon |
| electron/main.ts | 模板增加"案件管理" Sheet + 导入增加任务读取逻辑 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (none) | — | 全程无报错，构建一次通过 |
| TS2339: replacePartiesForClueId not on type | 1 | env.d.ts 中 Window.electronAPI 接口缺少该方法声明，补充后通过 |

### Phase 6: 当事人多成员编辑 + 车辆信息修复
- [x] 6a. CaseInfo.vue: basicInfoFields 增加"车辆信息"字段
- [x] 6b. main.ts + preload.ts + store: 暴露 replacePartiesForClueId IPC 通道
- [x] 6c. ClueList.vue: 重构编辑对话框 — 车辆信息移至基本信息区
- [x] 6d. ClueList.vue: 当事人改为动态多成员编辑器（从 clue_parties 加载、+按钮新增、×按钮删除）
- [x] 6e. main.ts: 模板"线索信息"Sheet 增加"车辆信息"列
- [x] 6f. main.ts: 导出"线索信息"Sheet 增加"车辆信息"列
- [x] 6g. main.ts: 导入逻辑增加 party_vehicle 字段映射
- [x] 6h. 构建验证（vue-tsc + vite build + electron-builder）
- **Status:** complete
