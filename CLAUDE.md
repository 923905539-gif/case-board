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

## Pinia Store — 唯一状态中心

`useClueStore` (`src/stores/clueStore.ts`) 管理全部状态，组件间联动通过 store 完成：

- **State**: `clues[]`, `selectedClueId`, `selectedMonth`, `events[]`, `tasks[]`
- **联动链**: `selectedClueId` 变更 → `filteredEvents`/`filteredTasks` 自动重新计算 → 组件 watch 响应
- **未选中线索时**: TaskBoard 显示全部任务（彩色标签按 `getClueColor()` 区分），TimelineView 显示全部事件
- `getClueColor(clueId)` — 10 色调色板，同一条线索在任务卡片、时间轴、鱼骨图中颜色一致

## 三张数据库表

`clues`（12 个字段，`clue_number` UNIQUE） → `timeline_events`（`event_type` 为 `case_track`|`action_track`） → `tasks`（`status` 为 `todo`|`in_progress`|`done`，`urgency` 为 `low`|`normal`|`high`|`urgent`）。均通过 `clue_id` 外键 + `ON DELETE CASCADE` 关联。

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
