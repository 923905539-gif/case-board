<template>
  <div class="clue-list-container">
    <!-- Panel Header -->
    <div class="panel-header">
      <div class="panel-title-row">
        <el-icon class="panel-icon" :size="16"><Collection /></el-icon>
        <h3 class="panel-title">线索列表</h3>
      </div>
      <div class="panel-actions">
        <el-select
          v-model="selectedMonth"
          placeholder="全年"
          size="small"
          style="width: 96px"
          @change="handleMonthChange"
          clearable
        >
          <el-option :value="null" label="全年" />
          <el-option v-for="m in 12" :key="m" :value="m" :label="m + '月'" />
        </el-select>
        <span class="clue-count">{{ store.clues.length }} 条</span>
      </div>
    </div>

    <!-- Clue List Table -->
    <div class="clue-table-wrapper">
      <el-table
        ref="tableRef"
        :data="store.clues"
        style="width: 100%"
        height="100%"
        highlight-current-row
        @row-click="handleRowClick"
        :row-class-name="tableRowClassName"
        size="small"
        stripe
      >
        <el-table-column prop="clue_number" label="编号" width="110" />
        <el-table-column prop="clue_name" label="线索名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="lead_unit" label="承办单位" width="120" show-overflow-tooltip />
        <el-table-column prop="assist_unit" label="协办单位" width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              :icon="Edit"
              circle
              size="small"
              text
              @click.stop="handleEdit(row)"
              title="编辑线索"
            />
            <el-button
              type="danger"
              :icon="Delete"
              circle
              size="small"
              text
              @click.stop="handleDelete(row)"
              title="删除线索"
            />
          </template>
        </el-table-column>
      </el-table>

      <!-- Empty State -->
      <div v-if="store.clues.length === 0 && !store.loading" class="empty-state">
        <el-icon class="empty-icon" :size="40"><FolderDelete /></el-icon>
        <p>暂无线索数据</p>
        <p class="empty-hint">请点击"导入 Excel"上传数据，或点击"下载模板"获取填写模板</p>
      </div>
    </div>

    <!-- Edit Clue Dialog -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑线索"
      width="680px"
      :close-on-click-modal="false"
      class="clue-edit-dialog"
    >
      <el-form :model="editForm" label-position="top" class="edit-form">
        <div class="form-row">
          <el-form-item label="线索编号" class="form-half">
            <el-input v-model="editForm.clue_number" placeholder="线索编号（唯一）" />
          </el-form-item>
          <el-form-item label="线索名称" class="form-half">
            <el-input v-model="editForm.clue_name" placeholder="线索名称" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="承办单位" class="form-half">
            <el-input v-model="editForm.lead_unit" placeholder="承办单位" />
          </el-form-item>
          <el-form-item label="协办单位" class="form-half">
            <el-input v-model="editForm.assist_unit" placeholder="协办单位" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="发现日期" class="form-half">
            <el-date-picker
              v-model="editForm.discovery_date"
              type="date"
              placeholder="选择发现日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="涉案位置" class="form-half">
            <el-input v-model="editForm.case_location" placeholder="涉案位置" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="车辆信息" class="form-half">
            <el-input v-model="editForm.party_vehicle" placeholder="车辆信息（可选）" />
          </el-form-item>
          <el-form-item label=" " class="form-half">
            <!-- spacer for layout balance -->
          </el-form-item>
        </div>

        <!-- Parties Section -->
        <el-divider content-position="left" style="margin: 8px 0 12px">
          <span style="font-size: 12px; color: var(--color-text-tertiary)">当事人信息</span>
        </el-divider>

        <div v-if="editParties.length === 0" class="no-parties-hint">
          暂无当事人，点击下方按钮添加
        </div>

        <div v-for="(party, idx) in editParties" :key="idx" class="party-edit-card">
          <div class="party-edit-header">
            <span class="party-edit-index">当事人 {{ idx + 1 }}</span>
            <el-button
              :icon="Close"
              circle
              size="small"
              text
              class="party-remove-btn"
              @click="removeParty(idx)"
              title="移除该当事人"
            />
          </div>
          <div class="party-edit-body">
            <div class="form-row">
              <el-form-item label="姓名" class="form-half">
                <el-input v-model="party.party_name" placeholder="当事人姓名" />
              </el-form-item>
              <el-form-item label="身份证号" class="form-half">
                <el-input v-model="party.party_id_number" placeholder="身份证号" />
              </el-form-item>
            </div>
            <div class="form-row">
              <el-form-item label="联系电话" class="form-half">
                <el-input v-model="party.party_phone" placeholder="联系电话" />
              </el-form-item>
              <el-form-item label="籍贯" class="form-half">
                <el-input v-model="party.party_hometown" placeholder="籍贯" />
              </el-form-item>
            </div>
          </div>
        </div>

        <el-button class="add-party-btn" @click="addParty()">
          <el-icon :size="14"><Plus /></el-icon>
          添加当事人
        </el-button>

        <el-form-item label="案情简报" style="margin-top: 16px">
          <el-input
            v-model="editForm.case_brief"
            type="textarea"
            :rows="3"
            placeholder="案情简报（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEditSubmit" :disabled="!editForm.clue_number.trim() || !editForm.clue_name.trim()">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useClueStore } from '../stores/clueStore'
import { Delete, Edit, Collection, FolderDelete, Plus, Close } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const store = useClueStore()
const selectedMonth = ref<number | null>(null)
const tableRef = ref<any>(null)

// ========== Edit Dialog ==========
const editDialogVisible = ref(false)
const editingClueId = ref<number | null>(null)
const editForm = ref({
  clue_number: '',
  clue_name: '',
  lead_unit: '',
  assist_unit: '',
  discovery_date: '',
  party_name: '',
  party_id_number: '',
  party_phone: '',
  party_hometown: '',
  party_vehicle: '',
  case_location: '',
  case_brief: '',
})

interface PartyForm {
  party_name: string
  party_id_number: string
  party_phone: string
  party_hometown: string
}
const editParties = ref<PartyForm[]>([])

function addParty() {
  editParties.value.push({
    party_name: '',
    party_id_number: '',
    party_phone: '',
    party_hometown: '',
  })
}

function removeParty(idx: number) {
  editParties.value.splice(idx, 1)
}

async function handleEdit(row: any) {
  editingClueId.value = row.id
  editForm.value = {
    clue_number: row.clue_number || '',
    clue_name: row.clue_name || '',
    lead_unit: row.lead_unit || '',
    assist_unit: row.assist_unit || '',
    discovery_date: row.discovery_date || '',
    party_name: row.party_name || '',
    party_id_number: row.party_id_number || '',
    party_phone: row.party_phone || '',
    party_hometown: row.party_hometown || '',
    party_vehicle: row.party_vehicle || '',
    case_location: row.case_location || '',
    case_brief: row.case_brief || '',
  }

  // Load existing parties from clue_parties table (multi-party support)
  try {
    const parties = await window.electronAPI.getPartiesByClueId(row.id)
    if (parties && parties.length > 0) {
      editParties.value = parties.map((p: any) => ({
        party_name: p.party_name || '',
        party_id_number: p.party_id_number || '',
        party_phone: p.party_phone || '',
        party_hometown: p.party_hometown || '',
      }))
    } else if (row.party_name) {
      // Fallback: no clue_parties rows, use old single-party fields
      editParties.value = [{
        party_name: row.party_name || '',
        party_id_number: row.party_id_number || '',
        party_phone: row.party_phone || '',
        party_hometown: row.party_hometown || '',
      }]
    } else {
      editParties.value = []
    }
  } catch {
    // Fallback to old single-party data on error
    if (row.party_name) {
      editParties.value = [{
        party_name: row.party_name || '',
        party_id_number: row.party_id_number || '',
        party_phone: row.party_phone || '',
        party_hometown: row.party_hometown || '',
      }]
    } else {
      editParties.value = []
    }
  }

  editDialogVisible.value = true
}

async function handleEditSubmit() {
  if (!editingClueId.value) return
  if (!editForm.value.clue_number.trim() || !editForm.value.clue_name.trim()) return

  // Update backward-compatible single-party fields from first party
  const firstParty = editParties.value.length > 0 ? editParties.value[0] : null
  const updateData = {
    ...editForm.value,
    party_name: firstParty?.party_name || '',
    party_id_number: firstParty?.party_id_number || '',
    party_phone: firstParty?.party_phone || '',
    party_hometown: firstParty?.party_hometown || '',
  }

  await store.updateClue(editingClueId.value, updateData)

  // Sync parties to clue_parties table
  const partiesToSave = editParties.value
    .filter(p => p.party_name.trim())
    .map((p, i) => ({
      party_name: p.party_name,
      party_id_number: p.party_id_number,
      party_phone: p.party_phone,
      party_hometown: p.party_hometown,
      sort_order: i,
    }))
  await store.replacePartiesForClue(editingClueId.value, partiesToSave)

  editDialogVisible.value = false
  ElMessage.success(`线索"${editForm.value.clue_number}"已更新`)
}

function handleRowClick(row: any) {
  if (row.id === store.selectedClueId) {
    store.selectClue(null)
    tableRef.value?.setCurrentRow(null)
  } else {
    store.selectClue(row.id)
    tableRef.value?.setCurrentRow(row)
  }
}

function tableRowClassName({ row }: { row: any }) {
  return row.id === store.selectedClueId ? 'clue-row-active' : ''
}

async function handleMonthChange() {
  await store.setMonth(selectedMonth.value)
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(
      `确定删除线索"${row.clue_number} ${row.clue_name}"？关联的时间轴事件和任务将一并删除。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    await store.deleteClue(row.id)
    ElMessage.success(`线索"${row.clue_number}"已删除`)
  } catch {
    // user cancelled
  }
}
</script>

<style scoped>
.clue-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ========== Panel Header ========== */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.panel-icon {
  color: var(--color-accent);
}

.panel-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.clue-count {
  font-size: var(--text-xs);
  color: var(--color-accent);
  font-weight: 600;
  white-space: nowrap;
  background: var(--color-accent-soft);
  padding: 2px 10px;
  border-radius: var(--radius-full);
}

/* ========== Table Wrapper ========== */
.clue-table-wrapper {
  flex: 1;
  overflow: hidden;
}

.clue-table-wrapper :deep(.el-table) {
  font-size: var(--text-sm);
}

.clue-table-wrapper :deep(.el-table__body tr) {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.clue-table-wrapper :deep(.el-table__body tr:hover) {
  background: #F1F5F9;
}

/* ========== Empty State ========== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 180px;
  color: var(--color-text-secondary);
}

.empty-icon {
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-3);
}

.empty-state p {
  font-size: var(--text-sm);
  margin: 2px 0;
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

/* ========== Edit Dialog Form ========== */
.form-row {
  display: flex;
  gap: var(--space-4);
}

.form-half {
  flex: 1;
  min-width: 0;
}

.edit-form :deep(.el-divider__text) {
  background: var(--color-bg);
}

/* ========== Multi-Party Editor ========== */
.no-parties-hint {
  text-align: center;
  padding: var(--space-4) 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.party-edit-card {
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
  overflow: hidden;
}

.party-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px var(--space-3);
  background: var(--color-accent-soft);
  border-bottom: 1px solid var(--color-border);
}

.party-edit-index {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-accent);
}

.party-remove-btn {
  color: var(--color-text-tertiary);
  transition: color var(--transition-fast);
}

.party-remove-btn:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg) !important;
}

.party-edit-body {
  padding: var(--space-2) var(--space-3);
}

.add-party-btn {
  width: 100%;
  border: 1px dashed var(--color-border-strong);
  background: transparent;
  color: var(--color-text-secondary);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.add-party-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-style: solid;
}
</style>
