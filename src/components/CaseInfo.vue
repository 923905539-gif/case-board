<template>
  <div class="case-info">
    <div v-if="store.selectedClue" class="info-content">
      <!-- Basic clue info grid -->
      <div class="info-grid">
        <div class="info-item" v-for="item in basicInfoFields" :key="item.key">
          <span class="info-label">{{ item.label }}</span>
          <span class="info-value">
            {{ getClueValue(item.key) || '—' }}
          </span>
        </div>
      </div>

      <!-- Parties section -->
      <div class="parties-section">
        <div class="section-header">
          <div class="section-title-row">
            <el-icon class="section-icon" :size="15"><UserFilled /></el-icon>
            <span class="section-title">当事人信息</span>
          </div>
          <span class="party-count" v-if="displayParties.length > 1">{{ displayParties.length }} 人</span>
        </div>
        <div v-if="displayParties.length > 0" class="parties-list">
          <div
            v-for="(party, idx) in displayParties"
            :key="idx"
            class="party-card"
          >
            <div class="party-card-header">
              <span class="party-index">当事人 {{ idx + 1 }}</span>
            </div>
            <div class="party-card-body">
              <div class="party-field">
                <span class="party-label">姓名</span>
                <span class="party-value">{{ party.party_name || '—' }}</span>
              </div>
              <div class="party-field">
                <span class="party-label">身份证号</span>
                <span class="party-value id-number">{{ party.party_id_number || '—' }}</span>
              </div>
              <div class="party-field">
                <span class="party-label">联系电话</span>
                <span class="party-value">{{ party.party_phone || '—' }}</span>
              </div>
              <div class="party-field">
                <span class="party-label">籍贯</span>
                <span class="party-value">{{ party.party_hometown || '—' }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-parties">
          <p>暂无当事人信息</p>
        </div>
      </div>
    </div>
    <div v-else class="no-selection">
      <el-icon class="ns-icon" :size="36"><DArrowLeft /></el-icon>
      <p>请在左侧选择一条线索</p>
      <p class="ns-sub">选择后将显示案件基本信息</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UserFilled, DArrowLeft } from '@element-plus/icons-vue'
import { useClueStore } from '../stores/clueStore'

const store = useClueStore()

const basicInfoFields = [
  { key: 'clue_number', label: '线索编号' },
  { key: 'clue_name', label: '线索名称' },
  { key: 'lead_unit', label: '承办单位' },
  { key: 'assist_unit', label: '协办单位' },
  { key: 'discovery_date', label: '发现日期' },
  { key: 'case_location', label: '涉案位置' },
  { key: 'party_vehicle', label: '车辆信息' },
]

function getClueValue(key: string): string {
  if (!store.selectedClue) return ''
  return (store.selectedClue as any)[key] || ''
}

const displayParties = computed(() => {
  if (store.currentClueParties.length > 0) {
    return store.currentClueParties
  }
  if (store.selectedClue && store.selectedClue.party_name) {
    return [{
      party_name: store.selectedClue.party_name,
      party_id_number: store.selectedClue.party_id_number || '',
      party_phone: store.selectedClue.party_phone || '',
      party_hometown: store.selectedClue.party_hometown || '',
    }]
  }
  return []
})
</script>

<style scoped>
.case-info {
  padding: var(--space-4);
  height: 100%;
  overflow-y: auto;
}

.info-content {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ========== Info Grid ========== */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  margin-bottom: var(--space-4);
}

.info-item {
  display: flex;
  flex-direction: column;
  padding: var(--space-3);
  background: var(--color-surface-hover);
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.info-item:hover {
  background: var(--color-accent-soft);
}

.info-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-bottom: 4px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.info-value {
  font-size: var(--text-sm);
  color: var(--color-text);
  font-weight: 600;
}

/* ========== Parties Section ========== */
.parties-section {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-4);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.section-icon {
  color: var(--color-accent);
}

.section-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}

.party-count {
  font-size: var(--text-xs);
  color: #fff;
  background: var(--color-accent);
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-weight: 500;
}

.parties-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.party-card {
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.party-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm);
}

.party-card-header {
  background: var(--color-accent-soft);
  padding: 6px var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.party-index {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-accent);
}

.party-card-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
}

.party-field {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
}

.party-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-bottom: 2px;
  font-weight: 500;
}

.party-value {
  font-size: var(--text-sm);
  color: var(--color-text);
  font-weight: 500;
}

.party-value.id-number {
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
  font-size: var(--text-xs);
}

.no-parties {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

/* ========== No Selection ========== */
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
