<template>
  <div class="case-brief">
    <div v-if="store.selectedClue" class="brief-content">
      <div class="brief-header">
        <span class="brief-clue-tag">{{ store.selectedClue.clue_number }}</span>
        <h4 class="brief-title">{{ store.selectedClue.clue_name }}</h4>
      </div>
      <div class="brief-divider"></div>
      <div class="brief-text" v-if="store.selectedClue.case_brief">
        {{ store.selectedClue.case_brief }}
      </div>
      <div v-else class="brief-empty">
        <el-icon class="brief-empty-icon" :size="28"><EditPen /></el-icon>
        <p>暂未填写案情简报</p>
        <p class="hint">可通过 Excel 导入或在编辑功能中补充</p>
      </div>
    </div>
    <div v-else class="no-selection">
      <el-icon class="ns-icon" :size="36"><EditPen /></el-icon>
      <p>请在左侧选择一条线索</p>
      <p class="ns-sub">选择后将显示案情简报</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EditPen } from '@element-plus/icons-vue'
import { useClueStore } from '../stores/clueStore'

const store = useClueStore()
</script>

<style scoped>
.case-brief {
  padding: var(--space-4);
  height: 100%;
}

.brief-content {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.brief-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.brief-clue-tag {
  background: var(--color-accent);
  color: #fff;
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: 0.3px;
}

.brief-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text);
}

.brief-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: var(--space-4);
}

.brief-text {
  font-size: var(--text-sm);
  line-height: 1.8;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-word;
}

.brief-empty {
  text-align: center;
  padding: 40px var(--space-5);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.brief-empty-icon {
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-3);
}

.brief-empty .hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
}

.ns-icon {
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-3);
  opacity: 0.5;
}

.no-selection p {
  font-size: var(--text-sm);
  margin: 2px 0;
}

.ns-sub {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}
</style>
