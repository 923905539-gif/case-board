# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

案件线索管理看板 — Windows 桌面应用（Electron + Vue 3），用于执法单位管理案件线索。四象限布局：左上线索列表、右上详情面板（案件管理/基本信息/案情简报三Tab）、下半部时间轴可视化（时间轴/鱼骨图/甘特图三种视图）。单用户、本地 SQLite 存储、支持 Excel 导入导出。

## 常用命令

```bash
npm run dev          # 开发模式（Vite HMR，渲染进程热更新）
npm run start        # 直接用 Electron 加载已构建的 dist/ 目录
npm run build        # 完整构建：vue-tsc → vite build → electron-builder
npm run build:win    # 构建 Windows .exe NSIS 安装包
npm run preview      # Vite 预览（仅前端，不含 Electron）
```

## 技术栈

Electron 33 · Vue 3 Composition API + TypeScript · Element Plus · Tailwind CSS · Pinia（唯一 Store） · ECharts 5（时间轴散点图/鱼骨力导向图/甘特自定义渲染） · sql.js（WebAssembly SQLite） · xlsx (SheetJS) · Vite 6 + vite-plugin-electron + electron-builder (NSIS)

## 架构：三层数据流

```
渲染进程 (Vue)              主进程 (Electron)            数据层
────────────             ──────────────────           ──────
window.electronAPI.*  →  ipcMain.handle('*')   →  database.ts  →  SQLite (sql.js)
                        ←  return result         ←  queryAll/execute
```

- **preload.ts**: 通过 `contextBridge.exposeInMainWorld` 暴露 `electronAPI`，渲染进程只能调用此 API，不能直接访问 Node.js
- **database.ts**: 数据库文件在 `app.getPath('userData')/case-board.db`。**sql.js 初始化是异步的**（需加载 WASM），`getDatabase()` 返回 `Promise<Database>`，所有调用方必须 `await`。每次写操作后 `saveDb()` 全量导出 Buffer 写盘
- **main.ts**: 创建 BrowserWindow + 注册全部 IPC handler（CRUD、导入、导出、模板生成）。Excel 列名同时兼容中文和英文（如 `row['线索编号'] || row['clue_number']`）
- **env.d.ts**: `Window.electronAPI` 的类型定义，是渲染进程↔主进程的类型契约。新增 IPC 接口时需同时更新 `preload.ts`（实现）和 `env.d.ts`（类型声明）
- **vite.config.ts**: `@` 路径别名映射到 `src/`，构建时有主进程(`electron/main.ts`)和预加载(`electron/preload.ts`)两个入口

## Pinia Store — 唯一状态中心

`useClueStore` (`src/stores/clueStore.ts`) 管理全部状态，组件间联动通过 store 完成：

- **State**: `clues[]`, `selectedClueId`, `selectedMonth`, `events[]`, `tasks[]`
- **联动链**: `selectedClueId` 变更 → `filteredEvents`/`filteredTasks` 自动重新计算 → 组件 watch 响应
- **未选中线索时**: TaskBoard 显示全部任务（彩色标签按 `getClueColor()` 区分），TimelineView 显示全部事件
- `getClueColor(clueId)` — 10 色调色板，同一条线索在任务卡片、时间轴、鱼骨图中颜色一致

## 四张数据库表

`clues`（12 个字段，`clue_number` UNIQUE） → `timeline_events`（`event_type` 为 `case_track`|`action_track`） → `tasks`（`status` 为 `todo`|`in_progress`|`done`，`urgency` 为 `low`|`normal`|`high`|`urgent`） → `clue_parties`（当事人信息，独立存储）。均通过 `clue_id` 外键 + `ON DELETE CASCADE` 关联。

`database.ts` 内置向前兼容迁移（`try { ALTER TABLE } catch {}`），旧版本数据库升级时自动添加 `summary`、`image_paths` 列和 `clue_parties` 表。

## 组件架构

```
App.vue
├── ClueList        — 左上：线索列表（搜索、月份筛选、线索 CRUD）
├── DetailPanel     — 右上：详情面板（三个 Tab）
│   ├── TaskBoard   — 案件管理（看板三列：待办/办理中/已办）
│   ├── CaseInfo    — 基本信息（线索字段编辑 + 当事人管理）
│   └── CaseBrief   — 案情简报（富文本展示）
└── TimelineView    — 下半部：时间轴可视化（时间轴/鱼骨图切换）
```

- **ClueList**: 按月份筛选、搜索过滤、选中线索高亮。线索颜色通过 `getClueColor()` 分配，贯穿任务卡片、时间轴、鱼骨图
- **DetailPanel**: 三个 Element Plus Tab，通过 `v-model` 懒渲染。选中线索变更时 Tab 内数据自动联动
- **TaskBoard**: 三列看板布局，支持拖拽改变状态、内联编辑。未选中线索时显示全部任务，用彩色标签区分归属
- **TimelineView**: 包含时间轴和鱼骨图两种视图。添加/编辑/删除事件对话框。事件详情弹窗支持 上一条/下一条 导航和图片预览

## CSS 架构

三种样式机制分层使用，互不冲突：
1. **Tailwind CSS** (`@apply` 在 `<style>` 中) — 快速布局和间距
2. **Scoped CSS 自定义属性** — 主题色、间距、圆角、阴影等全局 Token（定义在 `src/main.ts` 或 App.vue 的 `:root` 中）
3. **`:deep()` 穿透** — 覆盖 Element Plus 组件内部样式（如 header 中的按钮颜色适配深色背景）

## TimelineView 闭包存储模式

ECharts 自定义 series 的 `renderItem` 无法可靠传递自定义属性（下划线前缀属性如 `_eventData` 会被剥离）。**正确做法**：通过 `value` 数组编码索引 + 模块级闭包数组访问原始数据。

```typescript
// 模块级闭包存储（renderItem 和点击事件共享）
const renderStores: Record<string, { events: any[]; clusters: any[] }> = {
  case: { events: [], clusters: [] },
  action: { events: [], clusters: [] },
}

// 构建数据时：索引编码到 value[2]
data: caseRenderData.map((d, i) => ({ value: [d[0], d[1], i] }))
// 赋值闭包：每次 renderTimeline() 刷新
renderStores.case.events = caseStagger.eventData

// renderItem 中：通过闭包访问，不依赖 params 自定义属性
const idx = api.value(2)           // 从 value[2] 取索引
const evt = renderStores.case.events[idx]

// 点击事件中：resolve seriesIndex 到 kind，统一访问
const kind = params.seriesIndex === 3 ? 'case' : params.seriesIndex === 4 ? 'action' : null
const stores = renderStores[kind]
```

点击事件中 `params.data._eventData` 仍可用，但推荐统一使用闭包模式保持一致性。

## 聚类卡片系统

当 `assignStagger` 的层级溢出（卡片太多、间距太小导致超过可用层级上限），溢出事件进入 `overflow` 列表。`buildClusters()` 按像素间距自动聚合成"聚合卡片"（虚线边框、显示 "+N" 和日期范围）。聚合卡片通过负数索引（`-(i+1)`）与普通卡片区分，点击后自动 `dataZoom` 放大到聚合范围。

关键流程：`assignStagger` → overflow → `buildClusters` → 作为额外数据项加入 Series 3/4 → `buildClusterCard()` 渲染 → 点击 `dispatchAction('dataZoom', ...)`。

## Excel 导入日期解析

`electron/main.ts` 中的 `normalizeEventTime()` 和 `formatDateStr()` 处理三种日期格式：
- **Excel 序列数**（数字）：`Math.floor(value) - 25569` 转日期，`fraction * 86400` 转秒
- **中文/多种分隔符**：`年/月/日`、`-`、`/`、`T` 分隔统一解析
- **回调**：原生 `new Date(str)` 兜底

统一输出格式 `YYYY-MM-DD HH:mm`。仅在 `import:execute` IPC handler 中调用。

## ECharts 三种视图（TimelineView.vue）

1. **时间轴**: 双轨道散点图（案情 y=0.3 红色，执法 y=2.3 蓝色）+ 虚线连线，内置 `dataZoom` 滚轮缩放
2. **鱼骨图**: graph 力导向布局，线索为主干节点，事件为子节点（案情=roundRect，执法=diamond），按线索颜色分类
3. **甘特图**: 自定义 `renderItem` 矩形条，每条线索分两行（案情 + 执法），x 轴时间

### ECharts custom series `renderItem` 关键陷阱（极易出错）

**1. 属性名称：zrender API，不是 ECharts graphic API**

`renderItem` 返回的是 zrender 元素，属性名必须是 zrender 原生名称：
- ✅ `fill`（文本/图形颜色）、`font`（字体）
- ❌ `textFill`、`textFont` — 这些是 ECharts `graphic` 组件属性，在 custom series 中无效

同文件中的区域标签（"案情走势"/"执法动作"）使用 `fill`/`font` 能正常显示，可作为参考验证。

**2. `params` 即数据项本身，不是包装对象**

```typescript
renderItem: (params: any, api: any) => {
  // ✅ params 直接就是 data item
  const t = api.value(0)     // 读取第 0 维
  // ❌ params.data 在 renderItem 中不存在
}
```

**3. 自定义属性 `_eventData` 可能被 ECharts 剥离**

ECharts 在数据处理过程中可能丢弃下划线前缀的自定义属性。**不要依赖 `params._eventData`**。

✅ 正确做法：将事件索引编码到 `value` 数组，通过闭包访问原始数组：

```typescript
// 构建数据时
data: rawData.map((d, i) => ({ value: [d[0], d[1], i], _eventData: events[i] }))

// renderItem 中
const idx = api.value(2)                     // 从 value[2] 取索引
const evt = closureArray.eventData[idx]      // 闭包访问，不依赖 params
```

**4. dataZoom 会过滤自定义 series 的全部数据点**

当数据点被 dataZoom 过滤到范围外后，ECharts 会停止渲染该 series 的**所有**数据项。如果某个 series 仅有少量数据点（如 Series 0 只有 1 个轴线装饰点），缩放到该点落在范围外时，整个轴线、标签、区域背景都会消失。

✅ 修复：生成密集 guard points（1 小时间隔），确保任何缩放级别下至少有一个点落入可见范围。`renderItem` 中仅在 `dataIndex === 0` 时实际绘制。

**5. 卡片文字自适应宽度 + 居中**

```typescript
// 估算文字宽度（中文 ≈ fontSize，ASCII ≈ fontSize * 0.55）
function estimateTextWidth(text: string): number { ... }
// 动态卡片宽度：Math.max(MIN_W, textWidth + padding*2 + accent_w)
function getCardWidth(text: string): number { ... }
// 文字居中：textAlign: 'center', x: cx（卡片中心），不写偏移量
```

**6. 点击事件和 renderItem 的 params 结构不同**

- `chart.on('click', params)` → `params.data._eventData` 可用（ECharts 保留原始 data 对象）
- `renderItem(params, api)` → `params` 就是 data item，但 `_eventData` 可能已被剥离

因此点击事件中可以继续使用 `params.data._eventData`，renderItem 中必须用索引+闭包。

## 关键约束

### vite.config.ts — rollupOptions.external 必须包含这三项

```typescript
external: ['electron', 'sql.js', 'xlsx']
```

这三个包**禁止**被 Vite 打包内联：
- `electron` — 必须用 Electron 内置模块，打包 npm 包会导致 `require('electron')` 返回错误对象
- `sql.js` — 依赖 WASM 文件和动态加载
- `xlsx` — 复杂的 CJS 模块，内联后函数重映射会破坏 `XLSX.utils.*` 调用（症状：`main.js` 从 12KB 膨胀到 427KB，模板生成等操作运行时失败）

### ELECTRON_RUN_AS_NODE

**绝不能设置** `ELECTRON_RUN_AS_NODE=1`。该变量让 Electron 以纯 Node.js 模式运行，此时 `require('electron')` 不返回 Electron API，应用崩溃。

### Windows 路径

项目路径避免中文字符（当前在 `D:\case-board\`），否则 npm install 可能因 Windows Unicode 路径文件重命名限制而报 EBUSY 错误。

### sql.js 异步初始化

```typescript
// ✅ 正确
const db = await getDatabase()

// ❌ 错误 — 返回 Promise<Database>，不是 Database
const db = getDatabase()
```

### electron-builder

- 关闭代码签名：`signAndEditExecutable: false`
- 安装包输出到 `release/`，`files` 配置仅含 `dist/**/*` 和 `dist-electron/**/*`，dependencies 由 electron-builder 自动打包进 asar
