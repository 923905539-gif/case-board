<template>
  <div class="case-brief">
    <div v-if="store.selectedClue" class="brief-content">
      <div class="brief-header">
        <span class="brief-clue-tag">{{ store.selectedClue.clue_number }}</span>
        <h4 class="brief-title">{{ store.selectedClue.clue_name }}</h4>
        <button
          v-if="store.selectedClue.case_brief"
          class="brief-expand-btn"
          @click="isMaximized = true"
          title="放大阅读"
        >
          <el-icon :size="17"><FullScreen /></el-icon>
        </button>
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

    <!-- Maximized reading overlay -->
    <Teleport to="body">
      <Transition name="zoom-fade">
        <div v-if="isMaximized" class="brief-overlay" @click.self="isMaximized = false">
          <div class="brief-overlay-card">
            <div class="brief-overlay-header">
              <span class="brief-clue-tag brief-clue-tag--lg">{{ store.selectedClue?.clue_number }}</span>
              <h3 class="brief-overlay-title">{{ store.selectedClue?.clue_name }}</h3>
              <button class="brief-close-btn" @click="isMaximized = false" title="退出放大">
                <el-icon :size="22"><Close /></el-icon>
              </button>
            </div>
            <div class="brief-overlay-divider"></div>
            <div class="brief-overlay-text">{{ store.selectedClue?.case_brief }}</div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { EditPen, FullScreen, Close } from '@element-plus/icons-vue'
import { useClueStore } from '../stores/clueStore'

const store = useClueStore()
const isMaximized = ref(false)
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
  flex: 1;
}

/* ── Expand button ── */
.brief-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.brief-expand-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.brief-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: var(--space-4);
}

.brief-text {
  font-size: var(--text-base);
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

/* ========== Maximized Overlay ========== */
.brief-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
}

.brief-overlay-card {
  width: min(900px, 90vw);
  max-height: 85vh;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.brief-overlay-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6);
  flex-shrink: 0;
}

.brief-clue-tag--lg {
  font-size: var(--text-sm);
  padding: 3px 14px;
}

.brief-overlay-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text);
  flex: 1;
}

.brief-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.brief-close-btn:hover {
  color: var(--color-danger);
  border-color: var(--color-danger-border);
  background: var(--color-danger-bg);
}

.brief-overlay-divider {
  height: 1px;
  background: var(--color-border);
  margin: 0 var(--space-6);
  flex-shrink: 0;
}

.brief-overlay-text {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5) var(--space-6) var(--space-8);
  font-size: var(--text-xl);
  line-height: 2;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-word;
}

/* ── Overlay transition ── */
.zoom-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.zoom-fade-leave-active {
  transition: all 0.2s ease-in;
}
.zoom-fade-enter-from {
  opacity: 0;
}
.zoom-fade-enter-from .brief-overlay-card {
  transform: scale(0.92);
}
.zoom-fade-leave-to {
  opacity: 0;
}
</style>
