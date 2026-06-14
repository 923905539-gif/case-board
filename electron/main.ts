import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import * as fs from 'fs'
import * as XLSX from 'xlsx'
import {
  getAllClues, getClueById, getCluesByMonth, getClueByNumber, getExistingClueNumbers,
  insertClue, updateClue, deleteClue,
  getEventsByClueId, getAllEvents,
  insertTimelineEvent, updateTimelineEvent, deleteTimelineEvent,
  replaceEventsForClueId,
  getTasksByClueId, getAllTasks,
  insertTask, updateTask, deleteTask,
  getPartiesByClueId, insertParty, updateParty, deleteParty,
  replacePartiesForClueId,
  importClueWithEvents, exportAllData, clearAllData
} from './database'

let mainWindow: BrowserWindow | null = null

// ─── Date normalization for Excel import ───
// Handles: Excel serial numbers, "2026/6/6", "2026-6-6", "2026/6/6 14:30", etc.
function formatDateStr(d: Date): string {
  const y = d.getFullYear(),
        m = String(d.getMonth() + 1).padStart(2, '0'),
        day = String(d.getDate()).padStart(2, '0'),
        h = String(d.getHours()).padStart(2, '0'),
        min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function normalizeEventTime(value: any): string {
  if (value === null || value === undefined) return ''

  // Excel serial date (number)
  if (typeof value === 'number') {
    const utcDays = Math.floor(value) - 25569
    const date = new Date(utcDays * 86400000)
    const fraction = value - Math.floor(value)
    if (fraction > 0) date.setSeconds(Math.round(fraction * 86400))
    if (isNaN(date.getTime())) return ''
    return formatDateStr(date)
  }

  const str = String(value).trim()
  if (!str) return ''

  // Try parsing with explicit components (handles YYYY/M/D, YYYY-M-D, YYYY年M月D日, etc.)
  const cleaned = str.replace(/[年月]/g, '-').replace(/[日号]/g, '').replace(/\//g, '-')
  const parts = cleaned.split(/[\s\-T]+/)
  if (parts.length >= 3) {
    const [ys, ms, ds, ...timeParts] = parts
    const year = parseInt(ys, 10), month = parseInt(ms, 10) - 1, day = parseInt(ds, 10)
    let hours = 0, minutes = 0
    if (timeParts.length >= 2) {
      hours = parseInt(timeParts[0], 10) || 0
      minutes = parseInt(timeParts[1], 10) || 0
    }
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && year > 1900 && year < 2100) {
      const date = new Date(year, month, day, hours, minutes)
      if (!isNaN(date.getTime())) {
        return formatDateStr(date)
      }
    }
  }

  // Fallback: native Date parsing
  const fallback = new Date(str)
  if (!isNaN(fallback.getTime())) {
    return formatDateStr(fallback)
  }

  return str
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    title: '案件线索管理看板',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Remove default menu
    autoHideMenuBar: true,
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ==================== IPC Handlers ====================

// -- Clues --
ipcMain.handle('clues:getAll', () => getAllClues())
ipcMain.handle('clues:getById', (_e, id: number) => getClueById(id))
ipcMain.handle('clues:getByMonth', (_e, month: number | null) => getCluesByMonth(month))
ipcMain.handle('clues:insert', (_e, clue: any) => insertClue(clue))
ipcMain.handle('clues:update', (_e, id: number, clue: any) => updateClue(id, clue))
ipcMain.handle('clues:delete', (_e, id: number) => deleteClue(id))

// -- Parties --
ipcMain.handle('parties:getByClueId', (_e, clueId: number) => getPartiesByClueId(clueId))
ipcMain.handle('parties:insert', (_e, party: any) => insertParty(party))
ipcMain.handle('parties:update', (_e, id: number, party: any) => updateParty(id, party))
ipcMain.handle('parties:delete', (_e, id: number) => deleteParty(id))
ipcMain.handle('parties:replaceForClueId', (_e, clueId: number, parties: any[]) => replacePartiesForClueId(clueId, parties))

// -- Timeline Events --
ipcMain.handle('events:getByClueId', (_e, clueId: number) => getEventsByClueId(clueId))
ipcMain.handle('events:getAll', () => getAllEvents())
ipcMain.handle('events:insert', (_e, event: any) => insertTimelineEvent(event))
ipcMain.handle('events:update', (_e, id: number, event: any) => updateTimelineEvent(id, event))
ipcMain.handle('events:delete', (_e, id: number) => deleteTimelineEvent(id))

// -- Tasks --
ipcMain.handle('tasks:getByClueId', (_e, clueId: number) => getTasksByClueId(clueId))
ipcMain.handle('tasks:getAll', () => getAllTasks())
ipcMain.handle('tasks:insert', (_e, task: any) => insertTask(task))
ipcMain.handle('tasks:update', (_e, id: number, task: any) => updateTask(id, task))
ipcMain.handle('tasks:delete', (_e, id: number) => deleteTask(id))

// -- Images --
ipcMain.handle('images:select', async () => {
  if (!mainWindow) return []
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择事件图片',
    filters: [{ name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
    properties: ['openFile', 'multiSelections']
  })
  if (result.canceled) return []
  return result.filePaths
})

ipcMain.handle('images:copyForEvent', async (_e, eventId: number, sourcePaths: string[]) => {
  const userDataPath = app.getPath('userData')
  const destDir = path.join(userDataPath, 'event-images', String(eventId))
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  const savedPaths: string[] = []
  for (const src of sourcePaths) {
    const ext = path.extname(src)
    const baseName = path.basename(src, ext)
    let destName = `${baseName}${ext}`
    let dest = path.join(destDir, destName)
    // Avoid name collisions
    let counter = 1
    while (fs.existsSync(dest)) {
      destName = `${baseName}_${counter}${ext}`
      dest = path.join(destDir, destName)
      counter++
    }
    try {
      fs.copyFileSync(src, dest)
      savedPaths.push(dest)
    } catch (e) {
      console.error(`Failed to copy image ${src}:`, e)
    }
  }
  return savedPaths
})

ipcMain.handle('images:getEventImages', async (_e, eventId: number) => {
  const userDataPath = app.getPath('userData')
  const dir = path.join(userDataPath, 'event-images', String(eventId))
  if (!fs.existsSync(dir)) return []
  const files = fs.readdirSync(dir)
  return files
    .filter(f => /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(f))
    .map(f => path.join(dir, f))
})

// -- Import --
// ─── Import: Step 1 — Preview (open file, read sheets, check duplicates) ───
ipcMain.handle('import:preview', async () => {
  if (!mainWindow) return { success: false, message: '窗口未就绪' }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择 Excel 文件导入',
    filters: [{ name: 'Excel 文件', extensions: ['xlsx', 'xls'] }],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, message: '已取消' }
  }

  try {
    const filePath = result.filePaths[0]
    const workbook = XLSX.readFile(filePath)

    const sheet1 = workbook.Sheets['线索信息'] || workbook.Sheets[workbook.SheetNames[0]]
    const clueRows: any[] = XLSX.utils.sheet_to_json(sheet1)

    if (clueRows.length === 0) {
      return { success: false, message: '未读取到线索数据，请检查 Sheet 名称是否为"线索信息"' }
    }

    const excelClueNumbers: string[] = []
    const cluePreviews: { clue_number: string; clue_name: string }[] = []
    for (const row of clueRows) {
      const num = (row['线索编号'] || row['clue_number'] || '').toString().trim()
      const name = (row['线索名称'] || row['clue_name'] || '').toString().trim()
      if (num && name) {
        excelClueNumbers.push(num)
        cluePreviews.push({ clue_number: num, clue_name: name })
      }
    }

    const existingNumbers = await getExistingClueNumbers(excelClueNumbers)
    const duplicates = cluePreviews.filter(p => existingNumbers.includes(p.clue_number))

    return {
      success: true,
      filePath,
      hasDuplicates: duplicates.length > 0,
      duplicates,
      totalCount: excelClueNumbers.length,
      newCount: excelClueNumbers.length - duplicates.length,
    }
  } catch (error: any) {
    return { success: false, message: `读取文件失败：${error.message}` }
  }
})

// ─── Import: Step 2 — Execute (re-read file, import with chosen strategy) ───
ipcMain.handle('import:execute', async (_e, filePath: string, strategy: 'skip' | 'update') => {
  try {
    const workbook = XLSX.readFile(filePath)

    const sheet1 = workbook.Sheets['线索信息'] || workbook.Sheets[workbook.SheetNames[0]]
    const clueRows: any[] = XLSX.utils.sheet_to_json(sheet1)

    if (clueRows.length === 0) {
      return { success: false, message: '未读取到线索数据' }
    }

    let eventRows: any[] = []
    const sheet2 = workbook.Sheets['时间轴事件'] || workbook.Sheets[workbook.SheetNames[1]]
    if (sheet2) {
      eventRows = XLSX.utils.sheet_to_json(sheet2)
    }

    let partyRows: any[] = []
    const sheet3 = workbook.Sheets['当事人信息']
    if (sheet3) {
      partyRows = XLSX.utils.sheet_to_json(sheet3)
    }

    let taskRows: any[] = []
    const sheet4 = workbook.Sheets['案件管理']
    if (sheet4) {
      taskRows = XLSX.utils.sheet_to_json(sheet4)
    }

    // Collect valid clue numbers and re-check duplicates
    const excelClueNumbers: string[] = []
    for (const row of clueRows) {
      const num = (row['线索编号'] || row['clue_number'] || '').toString().trim()
      const name = (row['线索名称'] || row['clue_name'] || '').toString().trim()
      if (num && name) {
        excelClueNumbers.push(num)
      }
    }
    const existingNumbers: string[] = await getExistingClueNumbers(excelClueNumbers)

    // Helper: copy images
    async function copyImagesForEvents(eventIdList: number[], eventDataList: any[]) {
      const userDataPath = app.getPath('userData')
      for (let i = 0; i < eventDataList.length && i < eventIdList.length; i++) {
        const eventId = eventIdList[i]
        const imagePathsJson = eventDataList[i].image_paths || '[]'
        let imagePaths: string[]
        try { imagePaths = JSON.parse(imagePathsJson) } catch { continue }
        if (!imagePaths.length) continue

        const validPaths = imagePaths.filter((p: string) => fs.existsSync(p))
        if (!validPaths.length) continue

        const destDir = path.join(userDataPath, 'event-images', String(eventId))
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true })
        }
        const savedPaths: string[] = []
        for (const src of validPaths) {
          const ext = path.extname(src)
          const baseName = path.basename(src, ext)
          let destName = `${baseName}${ext}`
          let dest = path.join(destDir, destName)
          let counter = 1
          while (fs.existsSync(dest)) {
            destName = `${baseName}_${counter}${ext}`
            dest = path.join(destDir, destName)
            counter++
          }
          try {
            fs.copyFileSync(src, dest)
            savedPaths.push(dest)
          } catch (e) {
            console.error(`Failed to copy image ${src}:`, e)
          }
        }
        await updateTimelineEvent(eventId, { image_paths: JSON.stringify(savedPaths) })
      }
    }

    // Execute import
    let addedCount = 0, updatedCount = 0, skippedCount = 0
    const addedList: string[] = [], updatedList: string[] = [], skippedList: string[] = []

    for (const row of clueRows) {
      const clueNumber = (row['线索编号'] || row['clue_number'] || '').toString().trim()
      const clueName = (row['线索名称'] || row['clue_name'] || '').toString().trim()

      if (!clueNumber || !clueName) continue

      const exists = existingNumbers.includes(clueNumber)

      const clueData: any = {
        clue_number: clueNumber,
        clue_name: clueName,
        lead_unit: row['承办单位'] || row['lead_unit'] || '',
        assist_unit: row['协办单位'] || row['assist_unit'] || '',
        discovery_date: row['发现日期'] || row['discovery_date'] || '',
        party_name: row['当事人姓名'] || row['party_name'] || '',
        party_id_number: row['身份证号'] || row['party_id_number'] || '',
        party_phone: row['电话'] || row['party_phone'] || '',
        party_hometown: row['籍贯'] || row['party_hometown'] || '',
        party_vehicle: row['车辆信息'] || row['party_vehicle'] || '',
        case_location: row['涉案位置'] || row['case_location'] || '',
        case_brief: row['案情简报'] || row['case_brief'] || '',
      }

      const relatedEvents = eventRows
        .filter(e => (e['线索编号'] || e['clue_number'] || '') === clueNumber)
        .map(e => {
          const rawImagePaths = e['图片路径'] || e['image_paths'] || ''
          const imagePathList = rawImagePaths
            .split(/[;；\n]/)
            .map((p: string) => p.trim())
            .filter((p: string) => p.length > 0)
          return {
            event_type: (e['事件类型'] || e['event_type'] || '') === '执法动作' ? 'action_track' : 'case_track',
            event_time: normalizeEventTime(e['事件时间'] || e['event_time']),
            description: e['事件描述'] || e['description'] || '',
            summary: e['事件概括'] || e['summary'] || '',
            image_paths: JSON.stringify(imagePathList),
          }
        })

      const relatedParties = partyRows
        .filter(p => (p['线索编号'] || p['clue_number'] || '') === clueNumber)
        .map(p => ({
          party_name: p['当事人姓名'] || p['party_name'] || '',
          party_id_number: p['身份证号'] || p['party_id_number'] || '',
          party_phone: p['电话'] || p['party_phone'] || '',
          party_hometown: p['籍贯'] || p['party_hometown'] || '',
        }))

      if (relatedParties.length === 0 && clueData.party_name) {
        relatedParties.push({
          party_name: clueData.party_name,
          party_id_number: clueData.party_id_number || '',
          party_phone: clueData.party_phone || '',
          party_hometown: clueData.party_hometown || '',
        })
      }

      const label = `${clueNumber} ${clueName}`

      if (exists) {
        if (strategy === 'skip') {
          skippedCount++
          skippedList.push(label)
          continue
        }
        // strategy === 'update'
        const existingClue = await getClueByNumber(clueNumber)
        if (existingClue) {
          await updateClue(existingClue.id, clueData)
          await replacePartiesForClueId(existingClue.id, relatedParties)
          const newEventIds = await replaceEventsForClueId(existingClue.id, relatedEvents)
          await copyImagesForEvents(newEventIds, relatedEvents)
          updatedCount++
          updatedList.push(label)
        }
      } else {
        const { eventIds } = await importClueWithEvents(clueData, relatedEvents, relatedParties)
        await copyImagesForEvents(eventIds, relatedEvents)
        addedCount++
        addedList.push(label)
      }
    }

    // ─── Import tasks from 案件管理 sheet ───
    let tasksAdded = 0
    for (const taskRow of taskRows) {
      const clueNumber = (taskRow['线索编号'] || taskRow['clue_number'] || '').toString().trim()
      if (!clueNumber) continue
      const clue = await getClueByNumber(clueNumber)
      if (!clue) continue

      const rawStatus = (taskRow['状态'] || taskRow['status'] || '').toString().trim()
      const rawUrgency = (taskRow['紧急程度'] || taskRow['urgency'] || '').toString().trim()
      const content = (taskRow['内容'] || taskRow['content'] || '').toString().trim()
      if (!content) continue

      const statusMap: Record<string, string> = { '待办': 'todo', '办理中': 'in_progress', '已办': 'done' }
      const urgencyMap: Record<string, string> = { '紧急': 'urgent', '重要': 'high', '普通': 'normal', '低': 'low' }

      const status = statusMap[rawStatus] || rawStatus || 'todo'
      const urgency = urgencyMap[rawUrgency] || rawUrgency || 'normal'

      await insertTask({
        clue_id: clue.id,
        status,
        content,
        urgency,
      })
      tasksAdded++
    }

    const parts: string[] = []
    if (addedCount > 0) {
      parts.push(`新增 ${addedCount} 条线索`)
    }
    if (updatedCount > 0) {
      parts.push(`更新 ${updatedCount} 条线索`)
    }
    if (skippedCount > 0) {
      const preview = skippedList.slice(0, 3).map(s => s.split(' ')[0]).join('、')
      const extra = skippedList.length > 3 ? ' 等' : ''
      parts.push(`跳过 ${skippedCount} 条已有线索（${preview}${extra}）`)
    }
    if (tasksAdded > 0) {
      parts.push(`导入 ${tasksAdded} 条任务`)
    }
    const message = parts.join('，')

    return { success: true, message }
  } catch (error: any) {
    return { success: false, message: `导入失败：${error.message}` }
  }
})

// -- Export --
ipcMain.handle('export:excel', async () => {
  if (!mainWindow) return { success: false, message: '窗口未就绪' }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出数据为 Excel',
    filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
    defaultPath: `案件数据备份_${new Date().toISOString().slice(0, 10)}.xlsx`
  })

  if (result.canceled || !result.filePath) {
    return { success: false, message: '已取消' }
  }

  try {
    const data = await exportAllData()

    const wb = XLSX.utils.book_new()

    // Sheet1: 线索信息
    const clueSheetData = (data.clues as any[]).map(c => ({
      '线索编号': c.clue_number,
      '线索名称': c.clue_name,
      '承办单位': c.lead_unit,
      '协办单位': c.assist_unit,
      '发现日期': c.discovery_date,
      '涉案位置': c.case_location,
      '车辆信息': c.party_vehicle || '',
      '案情简报': c.case_brief,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clueSheetData), '线索信息')

    // Sheet2: 时间轴事件
    const eventSheetData = (data.events as any[]).map(e => ({
      '线索编号': e.clue_number,
      '事件类型': e.event_type === 'action_track' ? '执法动作' : '案情走势',
      '事件时间': e.event_time,
      '事件概括': e.summary || '',
      '事件描述': e.description || '',
      '图片路径': Array.isArray(JSON.parse(e.image_paths || '[]')) ? JSON.parse(e.image_paths || '[]').join('; ') : (e.image_paths || ''),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eventSheetData), '时间轴事件')

    // Sheet3: 任务
    const taskSheetData = (data.tasks as any[]).map(t => ({
      '线索编号': t.clue_number,
      '状态': t.status === 'todo' ? '待办' : t.status === 'in_progress' ? '办理中' : '已办',
      '内容': t.content,
      '紧急程度': t.urgency,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskSheetData), '案件管理')

    // Sheet4: 当事人信息
    const partySheetData = (data.parties as any[]).map(p => ({
      '线索编号': p.clue_number,
      '当事人姓名': p.party_name,
      '身份证号': p.party_id_number,
      '电话': p.party_phone,
      '籍贯': p.party_hometown,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(partySheetData), '当事人信息')

    XLSX.writeFile(wb, result.filePath)
    return { success: true, message: '导出成功' }
  } catch (error: any) {
    return { success: false, message: `导出失败：${error.message}` }
  }
})

// -- Demo Data Generator --
ipcMain.handle('demo:generate', async () => {
  try {
    // Clear existing data first
    await clearAllData()
    // Create 3 demo clues
    const clue1 = await insertClue({
      clue_number: 'XS-2025-001',
      clue_name: '鸿运物流园走私案',
      lead_unit: '稽查一科',
      assist_unit: '公安经侦支队',
      discovery_date: '2025-01-15',
      party_name: '张伟强',
      party_id_number: '440000199001011234',
      party_phone: '13800001111',
      party_hometown: '广东广州',
      case_location: '鸿运物流园3号仓',
      case_brief: '2025年1月接群众举报，鸿运物流园3号仓有走私电子产品嫌疑。经初步调查，当事人张伟强涉嫌利用物流渠道夹带走私手机、平板电脑等高价值电子产品，涉案金额约500万元。',
    })
    const clue2 = await insertClue({
      clue_number: 'XS-2025-002',
      clue_name: '跨境洗钱案',
      lead_unit: '稽查二科',
      assist_unit: '人民银行反洗钱中心',
      discovery_date: '2025-02-20',
      party_name: '李美玲',
      party_id_number: '440300198512122345',
      party_phone: '13900002222',
      party_hometown: '广东深圳',
      case_location: '深圳湾口岸',
      case_brief: '2025年2月发现异常资金流动，李美玲通过多个壳公司账户频繁大额转账，涉嫌利用地下钱庄将资金转移境外，累计涉案金额约2000万元。',
    })
    const clue3 = await insertClue({
      clue_number: 'XS-2025-003',
      clue_name: '假冒商标案',
      lead_unit: '稽查三科',
      assist_unit: '市场监管综合执法队',
      discovery_date: '2025-03-10',
      party_name: '王大勇',
      party_id_number: '350000198808083456',
      party_phone: '13600003333',
      party_hometown: '福建泉州',
      case_location: 'XX工业区12栋',
      case_brief: '2025年3月接品牌方举报，XX工业区12栋存在生产假冒名牌运动鞋窝点。执法人员现场查获假冒"耐克"、"阿迪达斯"商标运动鞋2000余双，制假设备一批，涉案金额约300万元。',
    })

    const clue1Id = clue1.lastInsertRowid
    const clue2Id = clue2.lastInsertRowid
    const clue3Id = clue3.lastInsertRowid

    // Events for clue 1
    await insertTimelineEvent({ clue_id: clue1Id, event_type: 'case_track', event_time: '2025-01-08 09:30', description: '当事人张伟强从香港经深圳湾口岸入境，随身携带2个大行李箱，行为异常被关注', summary: '当事人入境被关注', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue1Id, event_type: 'case_track', event_time: '2025-01-10 14:00', description: '张伟强在鸿运物流园租下3号仓，以经营"日用品批发"为名义注册个体工商户', summary: '租用仓库注册经营', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue1Id, event_type: 'action_track', event_time: '2025-01-13 10:00', description: '接到群众匿名举报，称鸿运物流园3号仓夜间有异常卸货行为，怀疑涉及走私活动', summary: '接到群众举报', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue1Id, event_type: 'case_track', event_time: '2025-01-14 22:30', description: '3号仓深夜有货车卸货，货物外包装为"日用百货"，但搬运时发出金属碰撞声', summary: '深夜异常卸货', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue1Id, event_type: 'action_track', event_time: '2025-01-15 08:30', description: '稽查一科成立专案组，部署对鸿运物流园进行监控调查', summary: '成立专案组', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue1Id, event_type: 'action_track', event_time: '2025-01-18 15:00', description: '调取3号仓近3个月物流记录，发现发货地址涉及多个电子产品集散地', summary: '调取物流记录', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue1Id, event_type: 'case_track', event_time: '2025-01-20 16:30', description: '张伟强通过物流园发出3件大件包裹，单号显示发往广西凭祥方向', summary: '发出可疑包裹', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue1Id, event_type: 'action_track', event_time: '2025-01-22 09:00', description: '对鸿运物流园3号仓开展突击检查，现场查获未报关iPhone 200台、iPad 100台', summary: '突击检查查获走私品', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue1Id, event_type: 'action_track', event_time: '2025-01-22 11:00', description: '依法对张伟强进行传唤，并在其住所查获交易账本和银行流水', summary: '传唤当事人取证', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue1Id, event_type: 'case_track', event_time: '2025-01-25 10:00', description: '张伟强交代其通过"水客"从香港夹带电子产品入境，再通过物流园掩饰发货的走私链条', summary: '当事人交代走私链条', image_paths: '[]' })

    // Events for clue 2
    await insertTimelineEvent({ clue_id: clue2Id, event_type: 'case_track', event_time: '2025-02-15 09:00', description: '李美玲在深圳注册"鑫源贸易有限公司"，注册资金100万元，经营范围模糊', summary: '注册壳公司', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue2Id, event_type: 'case_track', event_time: '2025-02-18 14:00', description: '李美玲通过鑫源贸易向香港某公司转账500万元，用途标注为"咨询服务费"', summary: '大额资金转出', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue2Id, event_type: 'action_track', event_time: '2025-02-20 16:00', description: '人民银行反洗钱中心监测到异常交易，向稽查二科推送可疑交易线索', summary: '银行推送可疑线索', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue2Id, event_type: 'action_track', event_time: '2025-02-22 10:30', description: '调取李美玲名下6个关联账户近一年流水，发现频繁大额进出，累计约1800万元', summary: '调取账户流水', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue2Id, event_type: 'case_track', event_time: '2025-02-25 11:00', description: '李美玲再次向境外3个账户转账合计600万元，部分资金流向澳门赌场账户', summary: '再次向境外转账', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue2Id, event_type: 'action_track', event_time: '2025-02-28 08:00', description: '对鑫源贸易公司及李美玲住所进行搜查，查获虚假合同、印章和多套身份证', summary: '搜查公司及住所', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue2Id, event_type: 'action_track', event_time: '2025-03-05 14:00', description: '冻结李美玲关联账户12个，合计冻结资金约800万元', summary: '冻结涉案账户', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue2Id, event_type: 'case_track', event_time: '2025-03-10 15:30', description: '李美玲在深圳湾口岸准备出境时被拦截，随身携带多张境外银行卡', summary: '当事人出境被拦截', image_paths: '[]' })

    // Events for clue 3
    await insertTimelineEvent({ clue_id: clue3Id, event_type: 'case_track', event_time: '2025-03-05 08:00', description: '王大勇在XX工业区12栋租下一层厂房，对外声称生产"外贸鞋类"', summary: '租用厂房', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue3Id, event_type: 'case_track', event_time: '2025-03-08 20:00', description: '厂房开始夜间生产，机器噪音明显，附近居民投诉但未引起注意', summary: '夜间秘密生产', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue3Id, event_type: 'action_track', event_time: '2025-03-10 10:00', description: '某品牌方委托知识产权代理公司向市场监管部门举报XX工业区假货线索', summary: '品牌方举报', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue3Id, event_type: 'action_track', event_time: '2025-03-12 09:30', description: '稽查三科联合市场监管执法队对XX工业区12栋进行暗访摸底', summary: '暗访摸底', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue3Id, event_type: 'action_track', event_time: '2025-03-15 06:00', description: '凌晨突击检查，现场查获假冒运动鞋2000双、商标模具50套、生产线2条', summary: '突击查获假货窝点', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue3Id, event_type: 'case_track', event_time: '2025-03-15 07:00', description: '王大勇在突击检查中被当场控制，另2名工人被带回协助调查', summary: '控制嫌疑人', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue3Id, event_type: 'action_track', event_time: '2025-03-16 14:00', description: '对查获的2000双假冒鞋进行鉴定，确认侵犯"耐克""阿迪达斯"注册商标权', summary: '鉴定侵权商品', image_paths: '[]' })
    await insertTimelineEvent({ clue_id: clue3Id, event_type: 'case_track', event_time: '2025-03-20 10:30', description: '王大勇交代制假售假网络，涉及福建、广东多地销售下线', summary: '供出销售网络', image_paths: '[]' })

    // Add tasks for each clue
    await insertTask({ clue_id: clue1Id, status: 'todo', content: '整理涉案iPhone和iPad的型号清单，联系品牌方确认真伪', urgency: 'high' })
    await insertTask({ clue_id: clue1Id, status: 'in_progress', content: '对张伟强进行第二次讯问，核实走私渠道细节', urgency: 'urgent' })
    await insertTask({ clue_id: clue1Id, status: 'done', content: '调取鸿运物流园监控录像', urgency: 'normal' })
    await insertTask({ clue_id: clue1Id, status: 'todo', content: '追查广西凭祥方向同伙', urgency: 'high' })

    await insertTask({ clue_id: clue2Id, status: 'in_progress', content: '分析李美玲12个关联账户资金流向图', urgency: 'urgent' })
    await insertTask({ clue_id: clue2Id, status: 'todo', content: '向澳门方面发出协查函，核查赌场账户关联信息', urgency: 'high' })
    await insertTask({ clue_id: clue2Id, status: 'done', content: '冻结涉案账户', urgency: 'urgent' })
    await insertTask({ clue_id: clue2Id, status: 'todo', content: '调取鑫源贸易公司工商注册档案', urgency: 'normal' })

    await insertTask({ clue_id: clue3Id, status: 'todo', content: '深挖福建泉州销售下线网络', urgency: 'high' })
    await insertTask({ clue_id: clue3Id, status: 'in_progress', content: '对2名工人进行询问，核实生产周期和销售渠道', urgency: 'high' })
    await insertTask({ clue_id: clue3Id, status: 'done', content: '假冒运动鞋鉴定', urgency: 'normal' })
    await insertTask({ clue_id: clue3Id, status: 'todo', content: '联系"耐克""阿迪达斯"法务部门，沟通民事赔偿事宜', urgency: 'normal' })

    return { success: true, message: '演示数据生成成功！3条线索、26个事件、12个任务。' }
  } catch (error: any) {
    return { success: false, message: `生成失败：${error.message}` }
  }
})

// -- Generate Template --
ipcMain.handle('export:template', async () => {
  if (!mainWindow) return { success: false, message: '窗口未就绪' }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: '下载 Excel 导入模板',
    filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
    defaultPath: '线索导入模板.xlsx'
  })

  if (result.canceled || !result.filePath) {
    return { success: false, message: '已取消' }
  }

  try {
    const wb = XLSX.utils.book_new()

    // Sheet1: 线索信息模板
    const clueHeaders = [[
      '线索编号', '线索名称', '承办单位', '协办单位', '发现日期',
      '涉案位置', '车辆信息', '案情简报'
    ]]
    const clueExample = [[
      'XS-2025-001', '示例：XX物流园走私案', '稽查一科', '公安经侦支队', '2025-01-15',
      'XX物流园3号仓', '粤B12345（蓝色货车）', '2025年1月接群众举报...'
    ]]
    const clueWs = XLSX.utils.aoa_to_sheet([...clueHeaders, ...clueExample])
    clueWs['!cols'] = Array(8).fill({ wch: 18 })
    XLSX.utils.book_append_sheet(wb, clueWs, '线索信息')

    // Sheet2: 时间轴事件模板
    const eventHeaders = [['线索编号', '事件类型', '事件时间', '事件概括', '事件描述', '图片路径']]
    const eventExamples = [
      ['XS-2025-001', '案情走势', '2025-01-10 09:00', '当事人入境携包裹', '当事人从香港入境，携带可疑包裹', ''],
      ['XS-2025-001', '执法动作', '2025-01-13 14:00', '接到线人举报', '接到线人举报，展开初步调查', ''],
      ['XS-2025-001', '案情走势', '2025-01-20 16:30', '当事人寄出3件包裹', '当事人通过物流园发出3件包裹', ''],
      ['XS-2025-001', '执法动作', '2025-01-22 10:00', '突击检查物流园', '对XX物流园开展突击检查', ''],
    ]
    const eventWs = XLSX.utils.aoa_to_sheet([...eventHeaders, ...eventExamples])
    eventWs['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 50 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, eventWs, '时间轴事件')

    // Sheet3: 当事人信息模板
    const partyHeaders = [['线索编号', '当事人姓名', '身份证号', '电话', '籍贯']]
    const partyExamples = [
      ['XS-2025-001', '张三', '440000199001011234', '13800000000', '广东广州'],
      ['XS-2025-001', '李四', '440000198505052345', '13900000000', '广东深圳'],
    ]
    const partyWs = XLSX.utils.aoa_to_sheet([...partyHeaders, ...partyExamples])
    partyWs['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, partyWs, '当事人信息')

    // Sheet4: 案件管理模板
    const taskHeaders = [['线索编号', '状态', '内容', '紧急程度']]
    const taskExamples = [
      ['XS-2025-001', '待办', '整理案件材料，分析资金流向', '重要'],
      ['XS-2025-001', '办理中', '对当事人进行讯问', '紧急'],
      ['XS-2025-001', '已办', '调取监控录像', '普通'],
    ]
    const taskWs = XLSX.utils.aoa_to_sheet([...taskHeaders, ...taskExamples])
    taskWs['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 40 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, taskWs, '案件管理')

    XLSX.writeFile(wb, result.filePath)
    return { success: true, message: '模板下载成功' }
  } catch (error: any) {
    return { success: false, message: `模板生成失败：${error.message}` }
  }
})
