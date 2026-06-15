import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { ElMessageBox } from 'element-plus'

export interface Clue {
  id: number
  clue_number: string
  clue_name: string
  lead_unit: string
  assist_unit: string
  discovery_date: string
  party_name: string
  party_id_number: string
  party_phone: string
  party_hometown: string
  party_vehicle: string
  case_location: string
  case_brief: string
  created_at: string
  updated_at: string
}

export interface TimelineEvent {
  id: number
  clue_id: number
  event_type: 'case_track' | 'action_track'
  event_time: string
  description: string
  summary: string
  image_paths: string
  clue_name?: string
  clue_number?: string
  created_at: string
}

export interface ClueParty {
  id: number
  clue_id: number
  party_name: string
  party_id_number: string
  party_phone: string
  party_hometown: string
  sort_order: number
}

export interface Task {
  id: number
  clue_id: number
  status: 'todo' | 'in_progress' | 'done'
  content: string
  urgency: 'low' | 'normal' | 'high' | 'urgent'
  clue_name?: string
  clue_number?: string
  created_at: string
  updated_at: string
}

export const useClueStore = defineStore('clue', () => {
  // State
  const clues = ref<Clue[]>([])
  const selectedClueId = ref<number | null>(null)
  const selectedMonth = ref<number | null>(null) // null = 全年
  const events = ref<TimelineEvent[]>([])
  const tasks = ref<Task[]>([])
  const parties = ref<ClueParty[]>([])
  const loading = ref(false)

  // Getters
  const selectedClue = computed(() =>
    clues.value.find(c => c.id === selectedClueId.value) || null
  )

  const filteredEvents = computed(() => {
    if (selectedClueId.value === null) return events.value
    return events.value.filter(e => e.clue_id === selectedClueId.value)
  })

  const filteredTasks = computed(() => {
    if (selectedClueId.value === null) return tasks.value
    return tasks.value.filter(t => t.clue_id === selectedClueId.value)
  })

  const todoTasks = computed(() => filteredTasks.value.filter(t => t.status === 'todo'))
  const inProgressTasks = computed(() => filteredTasks.value.filter(t => t.status === 'in_progress'))
  const doneTasks = computed(() => filteredTasks.value.filter(t => t.status === 'done'))

  const currentClueParties = computed(() => {
    if (selectedClueId.value === null) return []
    return parties.value.filter(p => p.clue_id === selectedClueId.value)
  })

  // Clue colors for multi-clue view
  const CLUE_COLORS = [
    '#0369A1', '#0D9488', '#7C3AED', '#DB2777', '#EA580C',
    '#4F46E5', '#059669', '#0891B2', '#9333EA', '#DC2626',
  ]

  function getClueColor(clueId: number): string {
    const idx = clues.value.findIndex(c => c.id === clueId)
    return CLUE_COLORS[idx % CLUE_COLORS.length]
  }

  function getClueName(clueId: number): string {
    const clue = clues.value.find(c => c.id === clueId)
    return clue ? `${clue.clue_number} ${clue.clue_name}` : `线索#${clueId}`
  }

  // Actions
  async function loadClues() {
    loading.value = true
    try {
      if (selectedMonth.value === null) {
        clues.value = await window.electronAPI.getAllClues()
      } else {
        clues.value = await window.electronAPI.getCluesByMonth(selectedMonth.value)
      }
    } finally {
      loading.value = false
    }
  }

  async function loadEvents() {
    events.value = await window.electronAPI.getAllEvents()
  }

  async function loadTasks() {
    tasks.value = await window.electronAPI.getAllTasks()
  }

  async function loadParties() {
    if (selectedClueId.value !== null) {
      parties.value = await window.electronAPI.getPartiesByClueId(selectedClueId.value)
    } else {
      parties.value = []
    }
  }

  async function loadAll() {
    await Promise.all([loadClues(), loadEvents(), loadTasks()])
    // Load parties for currently selected clue if any
    if (selectedClueId.value !== null) {
      await loadParties()
    }
  }

  function selectClue(id: number | null) {
    selectedClueId.value = id
  }

  async function setMonth(month: number | null) {
    selectedMonth.value = month
    await loadClues()
  }

  async function addTask(taskData: { clue_id: number; status: string; content: string; urgency: string }) {
    await window.electronAPI.insertTask(taskData)
    await loadTasks()
  }

  async function updateTask(id: number, data: any) {
    await window.electronAPI.updateTask(id, data)
    await loadTasks()
  }

  async function deleteTask(id: number) {
    await window.electronAPI.deleteTask(id)
    await loadTasks()
  }

  async function addTimelineEvent(eventData: { clue_id: number; event_type: string; event_time: string; description: string; summary: string; image_paths: string }) {
    const result = await window.electronAPI.insertEvent(eventData)
    await loadEvents()
    return result
  }

  async function updateTimelineEvent(id: number, data: any) {
    await window.electronAPI.updateEvent(id, data)
    await loadEvents()
  }

  async function deleteTimelineEvent(id: number) {
    await window.electronAPI.deleteEvent(id)
    await loadEvents()
  }

  async function updateClue(id: number, data: any) {
    await window.electronAPI.updateClue(id, data)
    await loadClues()
  }

  async function deleteClue(id: number) {
    await window.electronAPI.deleteClue(id)
    // If deleted clue was selected, clear selection
    if (selectedClueId.value === id) {
      selectClue(null)
    }
    await loadClues()
    await loadEvents()
    await loadTasks()
  }

  async function addParty(partyData: { clue_id: number; party_name: string; party_id_number: string; party_phone: string; party_hometown: string }) {
    await window.electronAPI.insertParty(partyData)
    await loadParties()
  }

  async function updateParty(id: number, data: any) {
    await window.electronAPI.updateParty(id, data)
    await loadParties()
  }

  async function deleteParty(id: number) {
    await window.electronAPI.deleteParty(id)
    await loadParties()
  }

  async function replacePartiesForClue(clueId: number, parties: any[]) {
    await window.electronAPI.replacePartiesForClueId(clueId, parties)
    if (selectedClueId.value === clueId) {
      await loadParties()
    }
  }

  // Watch selectedClueId changes to load parties for the selected clue
  watch(selectedClueId, () => {
    loadParties()
  })

  async function importExcel() {
    // Step 1: Preview — read file and check for duplicates
    const preview = await window.electronAPI.previewImport()
    if (!preview.success) {
      return preview
    }

    // Step 2: No duplicates → import directly
    if (!preview.hasDuplicates) {
      const result = await window.electronAPI.executeImport(preview.filePath!, 'skip')
      if (result.success) {
        await loadAll()
      }
      return result
    }

    // Step 3: Duplicates found → show styled dialog
    try {
      const displayLimit = 10
      const displayDups = preview.duplicates.slice(0, displayLimit)
      const dupItems = displayDups
        .map(d => `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:13px;">
          <span style="color:#303133;font-weight:500;min-width:fit-content;">${d.clue_number}</span>
          <span style="color:#606266;">${d.clue_name}</span>
        </div>`)
        .join('')
      const extra = preview.duplicates.length > displayLimit
        ? `<div style="padding:3px 0;font-size:12px;color:#909399;">…等共 ${preview.duplicates.length} 条</div>`
        : ''

      const messageHtml = `<div style="line-height:1.7;">
        <p style="margin:0 0 10px;color:#303133;font-size:13px;">
          文件中有 <b>${preview.totalCount}</b> 条有效线索，其中 <b style="color:#E6A23C;">${preview.duplicates.length}</b> 条已存在：
        </p>
        <div style="background:#F5F7FA;border-radius:6px;padding:8px 12px;margin-bottom:10px;">
          ${dupItems}${extra}
        </div>
        <p style="margin:0;color:#909399;font-size:12px;">请选择处理方式</p>
      </div>`

      await ElMessageBox.confirm(messageHtml, '检测到重复线索', {
        confirmButtonText: '跳过重复',
        cancelButtonText: '覆盖更新',
        distinguishCancelAndClose: true,
        dangerouslyUseHTMLString: true,
        customClass: 'import-dup-msgbox',
        closeOnClickModal: false,
        confirmButtonClass: 'el-button--primary',
      })

      // Confirm → skip
      const result = await window.electronAPI.executeImport(preview.filePath!, 'skip')
      if (result.success) {
        await loadAll()
      }
      return result
    } catch (action: any) {
      if (action === 'cancel') {
        // Cancel button → update
        const result = await window.electronAPI.executeImport(preview.filePath!, 'update')
        if (result.success) {
          await loadAll()
        }
        return result
      }
      // Close (X / backdrop) → abort
      return { success: false, message: '已取消导入' }
    }
  }

  async function exportExcel() {
    return await window.electronAPI.exportExcel()
  }

  async function exportTemplate() {
    return await window.electronAPI.exportTemplate()
  }

  return {
    clues, selectedClueId, selectedMonth, events, tasks, parties, loading,
    selectedClue, filteredEvents, filteredTasks, currentClueParties,
    todoTasks, inProgressTasks, doneTasks,
    getClueColor, getClueName,
    loadClues, loadEvents, loadTasks, loadParties, loadAll, selectClue, setMonth,
    addTask, updateTask, deleteTask,
    addTimelineEvent, updateTimelineEvent, deleteTimelineEvent, updateClue, deleteClue,
    addParty, updateParty, deleteParty, replacePartiesForClue,
    importExcel, exportExcel, exportTemplate,
  }
})
