<template>
  <div class="detail-panel">
    <!-- Panel Header with Tabs -->
    <div class="detail-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        <el-icon class="tab-icon" :size="15"><component :is="tab.icon" /></el-icon>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="detail-content">
      <Transition name="slide-fade" mode="out-in">
        <CaseInfo v-if="activeTab === 'info'" :key="'info-' + store.selectedClueId" />
        <CaseBrief v-else-if="activeTab === 'brief'" :key="'brief-' + store.selectedClueId" />
        <TaskBoard v-else :key="'tasks-' + store.selectedClueId" />
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Collection, Document, EditPen } from '@element-plus/icons-vue'
import { useClueStore } from '../stores/clueStore'
import CaseInfo from './CaseInfo.vue'
import CaseBrief from './CaseBrief.vue'
import TaskBoard from './TaskBoard.vue'

const store = useClueStore()
const activeTab = ref('tasks')

const tabs = [
  { key: 'tasks', label: '案件管理', icon: Collection },
  { key: 'info', label: '基本信息', icon: Document },
  { key: 'brief', label: '案情简报', icon: EditPen },
]

watch(() => store.selectedClueId, (newId) => {
  if (newId !== null && activeTab.value === 'tasks') {
    // Keep on tasks tab, user can switch
  }
})
</script>

<style scoped>
.detail-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.detail-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  padding: 0 var(--space-2);
  background: var(--color-surface-hover);
  gap: 2px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: var(--space-2) var(--space-4);
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
  white-space: nowrap;
  font-family: var(--font-sans);
  position: relative;
  top: 1px;
}

.tab-btn:hover {
  color: var(--color-text);
  background: rgba(3, 105, 161, 0.04);
}

.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
  font-weight: 600;
}

.tab-icon {
  flex-shrink: 0;
}

.detail-content {
  flex: 1;
  overflow: auto;
  padding: 0;
}
</style>
