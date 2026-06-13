# Findings — 功能改进项目

## Requirements
1. 线索列表和时间轴事件全部可编辑
2. 时间轴事件详情弹窗关闭按钮溢出修复
3. 导入模板与导出备份格式统一（都含案件管理 + 当事人信息子表）

## Research Findings

### 1. 当前编辑能力分析

**已有编辑功能：**
- TaskBoard.vue: 任务有完整的添加/编辑/删除/状态移动 ✅
- ClueParty: Store 已有 CRUD actions，但 CaseInfo.vue 只读展示

**缺失编辑功能：**
- ClueList.vue: 仅删除按钮，无编辑。表格列少（编号/名称/承办/协办）其余字段不可见
- CaseInfo.vue: 全部只读展示
- TimelineView.vue: 事件详情弹窗只读，无编辑入口

**数据库层已就绪：**
- `updateClue(id, data)` — database.ts L220 ✅
- `updateTimelineEvent(id, data)` — database.ts L276 ✅
- IPC handlers 已注册（main.ts L60, L73）
- preload API 已暴露（preload.ts L9, L16）
- Store actions 已定义但未被 UI 调用（clueStore.ts — 无 updateClue action）

### 2. 事件详情弹窗 CSS

**问题：** `.detail-close` 定位 `top: -18px`，关闭按钮在卡片上方，小窗口时可能被视口裁切。
**修复：** 改为 `top: 10px`，padding-top 增至 44px，按钮放入卡片可视区内。

### 3. 导入/导出格式对比

**导出 (export:excel) — 4 Sheets:**
线索信息 / 时间轴事件 / 案件管理 / 当事人信息 ✅

**导入模板 (export:template) — 3 Sheets:**
线索信息 / 时间轴事件 / 当事人信息 ❌ 缺"案件管理"

**导入执行 (import:execute) — 读 3 Sheets:**
线索信息 / 时间轴事件 / 当事人信息 ❌ 不读"案件管理"

### 4. Clue 完整字段列表（12个）
clue_number, clue_name, lead_unit, assist_unit, discovery_date,
party_name, party_id_number, party_phone, party_hometown, party_vehicle,
case_location, case_brief

### 5. Store 层待补充
- clueStore.ts 缺少 `updateClue` action（需新增）
- `updateTimelineEvent` action 已存在（L175-178）

## Resources
- 线索编辑: ClueList.vue (L25-54 table), CaseInfo.vue (read-only display)
- 事件编辑: TimelineView.vue (L62-134 add dialog, L137-204 detail popup)
- 导入模板: main.ts L543-599
- 导入执行: main.ts L189-368
- 导出: main.ts L371-436
- 数据库: database.ts L220-228 (updateClue), L276-282 (updateTimelineEvent)
