<template>
  <div class="app-container">
    <!-- Top Header Bar -->
    <header class="app-header">
      <div class="header-left">
        <div class="logo-mark">
          <el-icon :size="18"><DataBoard /></el-icon>
        </div>
        <h1 class="app-title">贵阳市烟草专卖局 案件管理作战图</h1>
      </div>
      <div class="header-right">
        <el-button @click="handleImport" type="primary" size="default" :icon="Upload">
          导入 Excel
        </el-button>
        <el-button @click="handleExport" size="default" :icon="Download">
          导出备份
        </el-button>
        <el-button @click="handleDownloadTemplate" size="default" :icon="Document">
          下载模板
        </el-button>
      </div>
    </header>

    <!-- Main Content: Four-Quadrant Layout -->
    <div class="main-content">
      <!-- Top Row: Left (Clue List) + Right (Detail Panel) -->
      <div class="top-row">
        <!-- Quadrant 1: Clue List (Top-Left) -->
        <div class="quadrant quadrant-top-left panel-card">
          <ClueList />
        </div>

        <!-- Quadrant 2: Detail Panel (Top-Right) -->
        <div class="quadrant quadrant-top-right panel-card">
          <DetailPanel />
        </div>
      </div>

      <!-- Bottom Row: Timeline View -->
      <div class="bottom-row">
        <div class="quadrant quadrant-bottom panel-card">
          <TimelineView />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { Upload, Download, Document, DataBoard } from '@element-plus/icons-vue'
import { useClueStore } from './stores/clueStore'
import { ElMessage } from 'element-plus'
import ClueList from './components/ClueList.vue'
import DetailPanel from './components/DetailPanel.vue'
import TimelineView from './components/TimelineView.vue'

const store = useClueStore()

onMounted(async () => {
  await store.loadAll()
})

async function handleImport() {
  const result = await store.importExcel()
  if (result.success) {
    ElMessage.success(result.message)
  } else {
    ElMessage.warning(result.message)
  }
}

async function handleExport() {
  const result = await store.exportExcel()
  if (result.success) {
    ElMessage.success(result.message)
  } else {
    ElMessage.warning(result.message)
  }
}

async function handleDownloadTemplate() {
  const result = await store.exportTemplate()
  if (result.success) {
    ElMessage.success(result.message)
  } else {
    ElMessage.warning(result.message)
  }
}

</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  overflow: hidden;
}

/* ========== Header ========== */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-5);
  height: var(--header-height);
  background: var(--color-primary);
  flex-shrink: 0;
  z-index: 100;
  -webkit-app-region: drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.logo-mark {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #E2E8F0;
  flex-shrink: 0;
}

.app-title {
  font-size: 15px;
  font-weight: 600;
  color: #F1F5F9;
  letter-spacing: 0.8px;
  white-space: nowrap;
}

.header-right {
  display: flex;
  gap: var(--space-2);
  -webkit-app-region: no-drag;
}

.header-right :deep(.el-button) {
  font-weight: 500;
  font-size: 13px;
}

/* Make plain/secondary buttons visible on dark header */
.header-right :deep(.el-button:not(.el-button--primary)) {
  color: #E2E8F0;
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
}

.header-right :deep(.el-button:not(.el-button--primary):hover) {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.12);
}

.header-right :deep(.el-button--primary) {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.header-right :deep(.el-button--primary:hover) {
  background: var(--color-accent-light);
}

/* ========== Main Content ========== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--panel-gap);
  padding: var(--panel-gap);
  min-height: 0;
  overflow: hidden;
}

/* ========== Quadrants ========== */
.top-row {
  display: flex;
  gap: var(--panel-gap);
  height: 42%;
  min-height: 280px;
}

.quadrant {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.quadrant-top-left {
  width: 38%;
  min-width: 320px;
  flex-shrink: 0;
}

.quadrant-top-right {
  flex: 1;
  min-width: 0;
}

.bottom-row {
  flex: 1;
  min-height: 300px;
}

.quadrant-bottom {
  height: 100%;
}
</style>

<style>
/* Import duplicate dialog — rendered at body level, must be global */
.import-dup-msgbox {
  width: 500px;
}
.import-dup-msgbox .el-message-box__message {
  padding: 4px 0;
}
.import-dup-msgbox .el-message-box__btns {
  padding-top: 8px;
}
</style>
