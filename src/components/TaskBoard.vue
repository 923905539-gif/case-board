<template>
  <div class="task-board">
    <!-- Board Header -->
    <div class="board-header" v-if="store.selectedClue">
      <span class="board-clue-badge" :style="{ background: store.getClueColor(store.selectedClue.id) }">
        {{ store.selectedClue.clue_number }}
      </span>
      <span class="board-clue-name">{{ store.selectedClue.clue_name }}</span>
    </div>
    <div class="board-header all-clues-header" v-else>
      <div class="board-header-left">
        <el-icon class="board-header-icon" :size="15"><Collection /></el-icon>
        <span class="board-title-text">全部线索 — 案件管理</span>
      </div>
      <span class="board-subtitle">不同颜色代表不同线索</span>
    </div>

    <!-- Three Columns -->
    <div class="board-columns">
      <!-- Todo Column -->
      <div class="board-column">
        <div class="column-header todo-header">
          <div class="col-header-left">
            <span class="col-dot todo-dot"></span>
            <span>待办</span>
            <span class="col-count">{{ store.todoTasks.length }}</span>
          </div>
          <button class="add-btn" @click="openAddDialog('todo')">
            <el-icon :size="14"><Plus /></el-icon>
          </button>
        </div>
        <div class="column-body" ref="todoBody">
          <TransitionGroup name="list">
            <div
              v-for="task in store.todoTasks"
              :key="task.id"
              :class="['task-card', 'urgency-' + task.urgency]"
            >
              <div class="task-clue-tag" v-if="!store.selectedClueId"
                :style="{ background: store.getClueColor(task.clue_id) }">
                {{ store.getClueName(task.clue_id) }}
              </div>
              <div class="task-content">{{ task.content }}</div>
              <div class="task-actions">
                <el-tag :type="urgencyType(task.urgency)" size="small" effect="light">
                  {{ urgencyLabel(task.urgency) }}
                </el-tag>
                <div class="task-btns">
                  <button class="task-btn" @click="moveTask(task, 'in_progress')" title="移动到办理中">
                    <el-icon :size="13"><ArrowRight /></el-icon>
                  </button>
                  <button class="task-btn edit" @click="openEditDialog(task)" title="编辑">
                    <el-icon :size="13"><Edit /></el-icon>
                  </button>
                  <button class="task-btn del" @click="handleDelete(task.id)" title="删除">
                    <el-icon :size="13"><Close /></el-icon>
                  </button>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>

      <!-- In Progress Column -->
      <div class="board-column">
        <div class="column-header progress-header">
          <div class="col-header-left">
            <span class="col-dot progress-dot"></span>
            <span>办理中</span>
            <span class="col-count">{{ store.inProgressTasks.length }}</span>
          </div>
          <button class="add-btn" @click="openAddDialog('in_progress')">
            <el-icon :size="14"><Plus /></el-icon>
          </button>
        </div>
        <div class="column-body">
          <TransitionGroup name="list">
            <div
              v-for="task in store.inProgressTasks"
              :key="task.id"
              :class="['task-card', 'urgency-' + task.urgency]"
            >
              <div class="task-clue-tag" v-if="!store.selectedClueId"
                :style="{ background: store.getClueColor(task.clue_id) }">
                {{ store.getClueName(task.clue_id) }}
              </div>
              <div class="task-content">{{ task.content }}</div>
              <div class="task-actions">
                <el-tag :type="urgencyType(task.urgency)" size="small" effect="light">
                  {{ urgencyLabel(task.urgency) }}
                </el-tag>
                <div class="task-btns">
                  <button class="task-btn back" @click="moveTask(task, 'todo')" title="移回待办">
                    <el-icon :size="13"><ArrowLeft /></el-icon>
                  </button>
                  <button class="task-btn done-action" @click="moveTask(task, 'done')" title="标记完成">
                    <el-icon :size="13"><Check /></el-icon>
                  </button>
                  <button class="task-btn edit" @click="openEditDialog(task)" title="编辑">
                    <el-icon :size="13"><Edit /></el-icon>
                  </button>
                  <button class="task-btn del" @click="handleDelete(task.id)" title="删除">
                    <el-icon :size="13"><Close /></el-icon>
                  </button>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>

      <!-- Done Column -->
      <div class="board-column">
        <div class="column-header done-header">
          <div class="col-header-left">
            <span class="col-dot done-dot"></span>
            <span>已办</span>
            <span class="col-count">{{ store.doneTasks.length }}</span>
          </div>
          <button class="add-btn" @click="openAddDialog('done')">
            <el-icon :size="14"><Plus /></el-icon>
          </button>
        </div>
        <div class="column-body">
          <TransitionGroup name="list">
            <div
              v-for="task in store.doneTasks"
              :key="task.id"
              :class="['task-card', 'urgency-' + task.urgency, 'done-card']"
            >
              <div class="task-clue-tag" v-if="!store.selectedClueId"
                :style="{ background: store.getClueColor(task.clue_id) }">
                {{ store.getClueName(task.clue_id) }}
              </div>
              <div class="task-content">{{ task.content }}</div>
              <div class="task-actions">
                <el-tag :type="urgencyType(task.urgency)" size="small" effect="light">
                  {{ urgencyLabel(task.urgency) }}
                </el-tag>
                <div class="task-btns">
                  <button class="task-btn back" @click="moveTask(task, 'in_progress')" title="移回办理中">
                    <el-icon :size="13"><RefreshLeft /></el-icon>
                  </button>
                  <button class="task-btn del" @click="handleDelete(task.id)" title="删除">
                    <el-icon :size="13"><Close /></el-icon>
                  </button>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑任务' : '添加任务'"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" label-position="top">
        <el-form-item label="任务内容" required>
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="3"
            placeholder="请输入任务内容..."
          />
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-radio-group v-model="formData.urgency">
            <el-radio value="urgent">
              <span class="urgency-label urgency-urgent-label">紧急</span>
            </el-radio>
            <el-radio value="high">
              <span class="urgency-label urgency-high-label">重要</span>
            </el-radio>
            <el-radio value="normal">
              <span class="urgency-label urgency-normal-label">普通</span>
            </el-radio>
            <el-radio value="low">
              <span class="urgency-label urgency-low-label">低优先级</span>
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态" v-if="isEditing">
          <el-radio-group v-model="formData.status">
            <el-radio value="todo">待办</el-radio>
            <el-radio value="in_progress">办理中</el-radio>
            <el-radio value="done">已办</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :disabled="!formData.content.trim()">
          {{ isEditing ? '保存' : '添加' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Collection, Plus, ArrowRight, ArrowLeft, Check, Close, Edit, RefreshLeft } from '@element-plus/icons-vue'
import { useClueStore } from '../stores/clueStore'
import { ElMessageBox, ElMessage } from 'element-plus'

const store = useClueStore()

const dialogVisible = ref(false)
const isEditing = ref(false)
const editingTaskId = ref<number | null>(null)

const formData = reactive({
  clue_id: 0,
  status: 'todo' as string,
  content: '',
  urgency: 'normal' as string,
})

function urgencyLabel(u: string): string {
  const map: Record<string, string> = { urgent: '紧急', high: '重要', normal: '普通', low: '低' }
  return map[u] || u
}

function urgencyType(u: string): string {
  const map: Record<string, string> = { urgent: 'danger', high: 'warning', normal: '', low: 'info' }
  return map[u] || ''
}

function openAddDialog(defaultStatus: string) {
  if (!store.selectedClueId) {
    ElMessage.warning('请先在左侧选择一条线索，再添加任务')
    return
  }
  isEditing.value = false
  editingTaskId.value = null
  formData.clue_id = store.selectedClueId
  formData.status = defaultStatus
  formData.content = ''
  formData.urgency = 'normal'
  dialogVisible.value = true
}

function openEditDialog(task: any) {
  isEditing.value = true
  editingTaskId.value = task.id
  formData.clue_id = task.clue_id
  formData.status = task.status
  formData.content = task.content
  formData.urgency = task.urgency
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formData.content.trim()) return

  if (isEditing.value && editingTaskId.value !== null) {
    await store.updateTask(editingTaskId.value, {
      status: formData.status,
      content: formData.content,
      urgency: formData.urgency,
    })
  } else {
    await store.addTask({
      clue_id: formData.clue_id,
      status: formData.status,
      content: formData.content,
      urgency: formData.urgency,
    })
  }
  dialogVisible.value = false
}

async function moveTask(task: any, newStatus: string) {
  await store.updateTask(task.id, { status: newStatus })
}

async function handleDelete(taskId: number) {
  try {
    await ElMessageBox.confirm('确定要删除这个任务吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await store.deleteTask(taskId)
  } catch {
    // user cancelled
  }
}
</script>

<style scoped>
.task-board {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-3) var(--space-4);
}

/* ========== Board Header ========== */
.board-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-shrink: 0;
}

.board-clue-badge {
  color: #fff;
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.3px;
}

.board-clue-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}

.all-clues-header {
  justify-content: space-between;
}

.board-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.board-header-icon {
  color: var(--color-accent);
}

.board-title-text {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}

.board-subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* ========== Columns Layout ========== */
.board-columns {
  display: flex;
  gap: var(--space-3);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.board-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-surface-hover);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
  min-width: 0;
}

/* ========== Column Header ========== */
.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
}

.col-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}

.col-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.todo-dot { background: var(--color-urgent); }
.todo-header { background: var(--color-urgent-bg); }

.progress-dot { background: var(--color-high); }
.progress-header { background: var(--color-warning-bg); }

.done-dot { background: var(--color-success); }
.done-header { background: var(--color-success-bg); }

.col-count {
  background: var(--color-surface);
  border-radius: var(--radius-full);
  padding: 0 7px;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: 500;
  min-width: 20px;
  text-align: center;
}

.add-btn {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--color-border-strong);
  background: var(--color-surface);
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  padding: 0;
}

.add-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-style: solid;
}

/* ========== Column Body ========== */
.column-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

/* ========== Task Cards ========== */
.task-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  border: 1px solid var(--color-border-light);
  transition: all var(--transition-fast);
}

.task-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.task-card.done-card {
  opacity: 0.7;
}

.task-card.done-card .task-content {
  text-decoration: line-through;
  color: var(--color-text-secondary);
}

.task-clue-tag {
  color: #fff;
  padding: 1px 8px;
  border-radius: var(--radius-xs);
  font-size: 10px;
  font-weight: 500;
  display: inline-block;
  margin-bottom: var(--space-2);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.2px;
}

.task-content {
  font-size: var(--text-sm);
  color: var(--color-text);
  line-height: 1.5;
  margin-bottom: var(--space-2);
  word-break: break-word;
}

.task-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
}

.task-btns {
  display: flex;
  gap: 1px;
}

.task-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: var(--radius-xs);
  cursor: pointer;
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.task-btn:hover {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.task-btn.del:hover {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.task-btn.back:hover {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.task-btn.done-action:hover {
  background: var(--color-success-bg);
  color: var(--color-success);
}

/* ========== Urgency Tags in Dialog ========== */
.urgency-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
}

.urgency-label::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.urgency-urgent-label::before { background: var(--color-urgent); }
.urgency-high-label::before { background: var(--color-high); }
.urgency-normal-label::before { background: var(--color-normal); }
.urgency-low-label::before { background: var(--color-low); }
</style>
