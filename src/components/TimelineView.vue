<template>
  <div class="timeline-view" :class="{ 'timeline-fullscreen': isFullscreen }">
    <!-- Toolbar -->
    <div class="timeline-toolbar">
      <div class="toolbar-left">
        <el-icon class="toolbar-icon" :size="16"><TrendCharts /></el-icon>
        <h3 class="timeline-title">
          {{ store.selectedClue ? store.selectedClue.clue_name : '时间轴' }}
        </h3>
        <span class="event-count" v-if="store.selectedClue">{{ store.filteredEvents.length }} 个事件</span>
      </div>
      <div class="toolbar-right">
        <div class="view-switcher">
          <button
            v-for="view in views"
            :key="view.key"
            :class="['view-switch-btn', { active: activeView === view.key }]"
            @click="activeView = view.key"
          >
            <el-icon :size="14"><component :is="view.icon" /></el-icon>
            <span>{{ view.label }}</span>
          </button>
        </div>
        <el-button size="small" @click="handleAddEvent" :icon="Plus" :disabled="!store.selectedClueId">
          添加事件
        </el-button>
        <el-button size="small" @click="toggleFullscreen" :icon="FullScreen" class="fullscreen-btn">
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
      </div>
    </div>

    <!-- Chart Area -->
    <div class="chart-container" ref="chartContainer">
      <div ref="chartDom" class="chart-dom"></div>
      <div v-if="!store.selectedClueId" class="chart-empty">
        <el-icon class="empty-icon" :size="44"><DArrowLeft /></el-icon>
        <p>请在左侧选择一条线索</p>
        <p class="hint">选择后将显示该线索的时间轴</p>
      </div>
      <div v-else-if="store.filteredEvents.length === 0" class="chart-empty">
        <el-icon class="empty-icon" :size="44"><DataAnalysis /></el-icon>
        <p>暂无时间轴数据</p>
        <p class="hint">点击"添加事件"或通过 Excel 导入</p>
      </div>
    </div>

    <!-- Legend -->
    <div v-if="store.selectedClueId" class="timeline-legend">
      <span class="legend-item">
        <span class="legend-dot case-dot"></span> 案情走势（当事人动作）
      </span>
      <span class="legend-item">
        <span class="legend-dot action-dot"></span> 执法动作（我方行动）
      </span>
      <span class="legend-hint">
        <el-icon :size="12"><InfoFilled /></el-icon>
        滚轮缩放 | 拖拽平移 | 点击事件查看详情
      </span>
    </div>

    <!-- Add Event Dialog -->
    <el-dialog
      v-model="eventDialogVisible"
      :title="isEditingEvent ? '编辑时间轴事件' : '添加时间轴事件'"
      width="560px"
      :close-on-click-modal="false"
      class="event-dialog"
    >
      <el-form :model="eventForm" label-position="top">
        <el-form-item label="事件类型" required>
          <el-radio-group v-model="eventForm.event_type">
            <el-radio value="case_track">
              <el-icon :size="14"><TrendCharts /></el-icon>
              案情走势
            </el-radio>
            <el-radio value="action_track">
              <el-icon :size="14"><UserFilled /></el-icon>
              执法动作
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="事件时间" required>
          <el-date-picker
            v-model="eventForm.event_time"
            type="datetime"
            placeholder="选择日期时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="事件概括" required>
          <el-input
            v-model="eventForm.summary"
            placeholder="简要概括事件内容（显示在时间轴上）"
          />
        </el-form-item>
        <el-form-item label="详情描述">
          <el-input
            v-model="eventForm.description"
            type="textarea"
            :rows="4"
            placeholder="事件的详细描述（可选，在详情弹窗中展示）"
          />
        </el-form-item>
        <el-form-item label="事件图片">
          <div class="image-upload-area">
            <div class="image-preview-list" v-if="eventForm.tempImages.length > 0">
              <div
                v-for="(img, idx) in eventForm.tempImages"
                :key="idx"
                class="image-preview-item"
              >
                <img :src="img" alt="预览" />
                <button class="image-remove-btn" @click="removeTempImage(idx)">
                  <el-icon :size="10"><Close /></el-icon>
                </button>
              </div>
            </div>
            <el-button size="small" @click="selectImages" :icon="Picture">
              {{ eventForm.tempImages.length > 0 ? '添加更多图片' : '选择图片' }}
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="eventDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEventSubmit"
          :disabled="!eventForm.summary.trim() || !eventForm.event_time">
          {{ isEditingEvent ? '保存' : '添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Event Detail Popup -->
    <Transition name="detail-popup">
      <div v-if="detailVisible" class="detail-overlay" @click.self="closeDetail">
        <div class="detail-card-wrapper" @click.stop>
          <button class="detail-close" @click="closeDetail">
            <el-icon :size="18"><Close /></el-icon>
          </button>
          <div class="detail-card">
          <div class="detail-nav">
            <button
              class="detail-nav-btn"
              @click="prevEvent"
              :disabled="!hasPrevEvent"
            >
              <el-icon :size="13"><ArrowLeft /></el-icon> 上一条
            </button>
            <span class="detail-nav-info">{{ detailIndex + 1 }} / {{ filteredEventList.length }}</span>
            <button
              class="detail-nav-btn"
              @click="nextEvent"
              :disabled="!hasNextEvent"
            >
              下一条 <el-icon :size="13"><ArrowRight /></el-icon>
            </button>
          </div>

          <div class="detail-header">
            <span :class="['detail-type-badge', detailEvent?.event_type === 'action_track' ? 'action-badge' : 'case-badge']">
              <el-icon :size="13"><component :is="detailEvent?.event_type === 'action_track' ? UserFilled : TrendCharts" /></el-icon>
              {{ detailEvent?.event_type === 'action_track' ? '执法动作' : '案情走势' }}
            </span>
            <span class="detail-clue-tag" v-if="detailEvent?.clue_name"
              :style="{ background: store.getClueColor(detailEvent?.clue_id || 0) }">
              {{ detailEvent?.clue_name }}
            </span>
            <button class="detail-edit-btn" @click="openEditEvent">
              <el-icon :size="13"><Edit /></el-icon> 编辑
            </button>
            <button class="detail-delete-btn" @click="handleDeleteEvent">
              <el-icon :size="13"><Delete /></el-icon> 删除
            </button>
          </div>

          <h2 class="detail-summary">{{ detailEvent?.summary || getTruncatedDesc(detailEvent?.description || '') }}</h2>
          <div class="detail-time">
            <el-icon :size="13"><Clock /></el-icon>
            {{ detailEvent?.event_time }}
          </div>

          <div class="detail-description" v-if="detailEvent?.description">
            <h4>详情描述</h4>
            <p>{{ detailEvent?.description }}</p>
          </div>

          <div class="detail-images" v-if="detailImages.length > 0">
            <h4>事件图片</h4>
            <div class="detail-image-gallery">
              <div
                v-for="(img, idx) in detailImages"
                :key="idx"
                class="detail-image-item"
                @click="previewImageIndex = idx"
              >
                <img :src="img" alt="事件图片" />
              </div>
            </div>
          </div>
          <div class="detail-images-empty" v-else>
            <span class="empty-hint">
              <el-icon :size="14"><Picture /></el-icon> 暂无图片
            </span>
          </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Image Preview Overlay -->
    <Transition name="img-preview-fade">
      <div v-if="previewImageIndex !== null" class="image-preview-overlay" @click="previewImageIndex = null">
        <button class="image-preview-close" @click="previewImageIndex = null">
          <el-icon :size="20"><Close /></el-icon>
        </button>
        <img
          :src="detailImages[previewImageIndex]"
          alt="预览大图"
          class="image-preview-large"
          @click.stop
        />
        <button
          v-if="detailImages.length > 1"
          class="image-preview-nav prev"
          @click.stop="previewImageIndex = (previewImageIndex - 1 + detailImages.length) % detailImages.length"
        >
          <el-icon :size="24"><ArrowLeft /></el-icon>
        </button>
        <button
          v-if="detailImages.length > 1"
          class="image-preview-nav next"
          @click.stop="previewImageIndex = (previewImageIndex + 1) % detailImages.length"
        >
          <el-icon :size="24"><ArrowRight /></el-icon>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick, reactive, computed } from 'vue'
import {
  Plus, FullScreen, Picture, TrendCharts, DataAnalysis, UserFilled,
  Clock, InfoFilled, DArrowLeft, ArrowLeft, ArrowRight, Close, Share, Edit, Delete
} from '@element-plus/icons-vue'
import { useClueStore } from '../stores/clueStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import type { TimelineEvent } from '../stores/clueStore'

const store = useClueStore()
const activeView = ref<'timeline' | 'fishbone'>('timeline')
const chartDom = ref<HTMLDivElement | null>(null)
const chartContainer = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let zoomLevel = ref(1)

const isFullscreen = ref(false)

const views = [
  { key: 'timeline' as const, label: '时间轴', icon: TrendCharts },
  { key: 'fishbone' as const, label: '鱼骨图', icon: Share },
]

// ========== Colors: Professional Navy light theme ==========
const BG_COLOR = '#FFFFFF'
const AXIS_COLOR = '#E2E8F0'
const TEXT_COLOR = '#0F172A'
const TEXT_SECONDARY = '#64748B'

const CASE_COLOR = '#D97706'
const CASE_COLOR_LIGHT = '#FCD34D'
const CASE_BG = 'rgba(217,119,6,0.06)'
const ACTION_COLOR = '#0369A1'
const ACTION_COLOR_LIGHT = '#38BDF8'
const ACTION_BG = 'rgba(3,105,161,0.06)'

const CARD_MIN_W = 76
const CARD_H = 44
const CARD_R = 6
const CARD_ACCENT_W = 3
const CARD_PAD_X = 10
const CARD_LINE_HEIGHT = 17
const MAX_LINE_CHARS = 9
const CARD_FONT_SIZE = 13
const STAGGER_LEVELS = 3
const STAGGER_STEP = 0.30
const ANCHOR_R = 4.5

// Event dialog
const eventDialogVisible = ref(false)
const isEditingEvent = ref(false)
const editingEventId = ref<number | null>(null)
const eventForm = reactive({
  event_type: 'case_track' as string,
  event_time: '' as string,
  summary: '' as string,
  description: '' as string,
  tempImages: [] as string[],
  imagePaths: [] as string[],
})

async function selectImages() {
  const paths = await window.electronAPI.selectImages()
  if (paths && paths.length > 0) {
    eventForm.imagePaths.push(...paths)
    eventForm.tempImages.push(...paths.map(p => `file://${p}`))
  }
}

function removeTempImage(idx: number) {
  eventForm.tempImages.splice(idx, 1)
  eventForm.imagePaths.splice(idx, 1)
}

function handleAddEvent() {
  if (!store.selectedClueId) {
    ElMessage.warning('请先在左侧选择一条线索')
    return
  }
  isEditingEvent.value = false
  editingEventId.value = null
  eventForm.event_type = 'case_track'
  eventForm.event_time = ''
  eventForm.summary = ''
  eventForm.description = ''
  eventForm.tempImages = []
  eventForm.imagePaths = []
  eventDialogVisible.value = true
}

function openEditEvent() {
  if (!detailEvent.value) return
  isEditingEvent.value = true
  editingEventId.value = detailEvent.value.id
  eventForm.event_type = detailEvent.value.event_type
  eventForm.event_time = detailEvent.value.event_time
  eventForm.summary = detailEvent.value.summary || ''
  eventForm.description = detailEvent.value.description || ''
  eventForm.tempImages = [...detailImages.value]
  eventForm.imagePaths = []
  eventDialogVisible.value = true
}

async function handleEventSubmit() {
  if (!store.selectedClueId || !eventForm.summary.trim() || !eventForm.event_time) return

  if (isEditingEvent.value && editingEventId.value !== null) {
    await store.updateTimelineEvent(editingEventId.value, {
      event_type: eventForm.event_type,
      event_time: eventForm.event_time,
      description: eventForm.description,
      summary: eventForm.summary.trim(),
    })
    ElMessage.success('事件更新成功')
  } else {
    await store.addTimelineEvent({
      clue_id: store.selectedClueId!,
      event_type: eventForm.event_type,
      event_time: eventForm.event_time,
      description: eventForm.description,
      summary: eventForm.summary.trim(),
      image_paths: '[]',
    })
    ElMessage.success('事件添加成功')
  }

  eventDialogVisible.value = false
}

// ============ Event Detail Popup ============
const detailVisible = ref(false)
const detailEvent = ref<TimelineEvent | null>(null)
const detailIndex = ref(0)
const detailImages = ref<string[]>([])
const previewImageIndex = ref<number | null>(null)

const filteredEventList = computed(() => store.filteredEvents)

const hasPrevEvent = computed(() => detailIndex.value > 0)
const hasNextEvent = computed(() => detailIndex.value < filteredEventList.value.length - 1)

function getTruncatedDesc(desc: string): string {
  return desc.length > 30 ? desc.slice(0, 30) + '...' : desc
}

async function openDetail(event: TimelineEvent) {
  const list = filteredEventList.value
  detailIndex.value = list.findIndex(e => e.id === event.id)
  detailEvent.value = event
  detailVisible.value = true

  if (event.id) {
    try {
      const images = await window.electronAPI.getEventImages(event.id)
      detailImages.value = images.map(p => `file://${p}`)
    } catch {
      try {
        const paths = JSON.parse(event.image_paths || '[]')
        detailImages.value = paths.map((p: string) => `file://${p}`)
      } catch {
        detailImages.value = []
      }
    }
  }
}

async function handleDeleteEvent() {
  if (!detailEvent.value) return
  try {
    await ElMessageBox.confirm(
      `确定要删除事件「${detailEvent.value.summary || detailEvent.value.description?.slice(0, 30) || '未命名'}」吗？此操作不可恢复。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
    const eventId = detailEvent.value.id
    closeDetail()
    await store.deleteTimelineEvent(eventId)
    ElMessage.success('事件已删除')
  } catch {
    // user cancelled, do nothing
  }
}

function closeDetail() {
  detailVisible.value = false
  detailEvent.value = null
  detailImages.value = []
  previewImageIndex.value = null
}

function prevEvent() {
  if (!hasPrevEvent.value) return
  detailIndex.value--
  const evt = filteredEventList.value[detailIndex.value]
  if (evt) openDetail(evt)
}

function nextEvent() {
  if (!hasNextEvent.value) return
  detailIndex.value++
  const evt = filteredEventList.value[detailIndex.value]
  if (evt) openDetail(evt)
}

// ============ Fullscreen ============
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  nextTick(() => {
    chartInstance?.resize()
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (previewImageIndex.value !== null) {
      previewImageIndex.value = null
    } else if (detailVisible.value) {
      closeDetail()
    } else if (isFullscreen.value) {
      isFullscreen.value = false
      nextTick(() => chartInstance?.resize())
    }
  }
}

// ============ Chart Rendering ============

function initChart() {
  if (!chartDom.value) return
  if (chartInstance) {
    chartInstance.dispose()
  }
  chartInstance = echarts.init(chartDom.value)
  renderChart()

  chartInstance.on('click', (params: any) => {
    if (params.data && params.data._eventData) {
      openDetail(params.data._eventData)
    }
  })
}

function renderChart() {
  if (!chartInstance) return
  if (activeView.value === 'timeline') renderTimeline()
  else if (activeView.value === 'fishbone') renderFishbone()
}

// -- helpers --

function estimateTextWidth(text: string): number {
  let w = 0
  for (const ch of text) {
    if (/[一-鿿　-〿＀-￯㐀-䶿豈-﫿]/.test(ch)) {
      w += CARD_FONT_SIZE
    } else {
      w += CARD_FONT_SIZE * 0.58
    }
  }
  return Math.ceil(w) + 2
}

function wrapSummary(text: string): string[] {
  if (text.length <= MAX_LINE_CHARS) return [text]
  const lines: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    lines.push(remaining.slice(0, MAX_LINE_CHARS))
    remaining = remaining.slice(MAX_LINE_CHARS)
    if (lines.length >= 2) {
      if (remaining.length > 0) {
        lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + '…'
      }
      break
    }
  }
  return lines
}

function getCardWidth(text: string): number {
  const lines = wrapSummary(text)
  let maxW = CARD_MIN_W
  for (const line of lines) {
    const w = estimateTextWidth(line) + CARD_ACCENT_W + CARD_PAD_X * 2
    if (w > maxW) maxW = w
  }
  return maxW
}

// ============ Timeline View ============
function renderTimeline() {
  if (!chartInstance) return
  if (!store.selectedClueId) {
    chartInstance.clear()
    return
  }
  const events = store.filteredEvents
  if (events.length === 0) {
    chartInstance.clear()
    return
  }

  try {
    const caseEvents = events.filter(e => e.event_type === 'case_track').sort((a, b) => a.event_time.localeCompare(b.event_time))
    const actionEvents = events.filter(e => e.event_type === 'action_track').sort((a, b) => a.event_time.localeCompare(b.event_time))

    const allTimes = events.map(e => new Date(e.event_time).getTime())
    const minTime = Math.min(...allTimes)
    const maxTime = Math.max(...allTimes)
    const timeRange = maxTime - minTime || 86400000
    const paddedMin = minTime - timeRange * 0.06
    const paddedMax = maxTime + timeRange * 0.06

    const chartW = chartInstance.getWidth() || (chartContainer.value?.clientWidth || 1000)
    const gridLeft = 70
    const gridRight = 40
    const plotW = chartW - gridLeft - gridRight
    const paddedRange = paddedMax - paddedMin

    function timeToEstPx(t: number): number {
      return gridLeft + ((t - paddedMin) / paddedRange) * plotW
    }

    function assignStagger(list: any[], baseY: number, step: number): { data: number[][]; eventData: any[] } {
      const data: number[][] = []
      const eventData: any[] = []
      let lastPx = -Infinity
      let level = 0
      const CARD_MIN_GAP = CARD_MIN_W + 8

      for (const e of list) {
        const t = new Date(e.event_time).getTime()
        const px = timeToEstPx(t)
        if (px - lastPx < CARD_MIN_GAP) {
          level = (level + 1) % STAGGER_LEVELS
        } else {
          level = 0
        }
        const y = baseY + level * step
        data.push([t, y])
        eventData.push(e)
        lastPx = px
      }
      return { data, eventData }
    }

    const caseStagger = assignStagger(caseEvents, 0.38, STAGGER_STEP)
    const actionStagger = assignStagger(actionEvents, -0.38, -STAGGER_STEP)

    const caseRenderData = caseStagger.data
    const actionRenderData = actionStagger.data

    const option: echarts.EChartsOption = {
      backgroundColor: BG_COLOR,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15,23,42,0.94)',
        borderColor: '#334155',
        textStyle: { color: '#F1F5F9', fontSize: 12 },
        formatter: (params: any) => {
          const d = params.data
          if (!d._eventData) return ''
          const e = d._eventData
          const summary = e.summary || getTruncatedDesc(e.description || '')
          return `<strong>${summary}</strong><br/>
            ${e.event_time}<br/>
            <span style="color:#94A3B8;font-size:11px;">线索: ${e.clue_name || e.clue_number || ''}</span><br/>
            <span style="color:#64748B;font-size:10px;">点击查看详情</span>`
        },
      },
      grid: { left: gridLeft, right: gridRight, top: 36, bottom: 50 },
      xAxis: {
        type: 'time',
        min: paddedMin,
        max: paddedMax,
        axisLine: { show: true, lineStyle: { color: AXIS_COLOR, width: 1.5 } },
        axisTick: { show: true, inside: false, lineStyle: { color: '#CBD5E1' } },
        axisLabel: {
          show: true,
          color: TEXT_SECONDARY,
          fontSize: 10,
          formatter: (value: number) => {
            const d = new Date(value)
            if (zoomLevel.value > 2) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
            if (zoomLevel.value > 1.2) return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:00`
            return `${d.getMonth() + 1}/${d.getDate()}`
          },
        },
        splitLine: { show: true, lineStyle: { color: '#E2E8F0', type: 'dashed' } },
      },
      yAxis: {
        type: 'value', min: -1.3, max: 1.3, show: false,
      },
      series: [
        // Series 0: Zone backgrounds + labels
        {
          type: 'custom' as const,
          data: [[paddedMin, 0]],
          silent: true,
          z: 1,
          renderItem: (params: any, api: any) => {
            if (params.dataIndex !== 0) return undefined
            const x0 = api.coord([paddedMin, 0])[0]
            const x1 = api.coord([paddedMax, 0])[0]
            const topY = api.coord([0, 1.3])[1]
            const botY = api.coord([0, -1.3])[1]

            return {
              type: 'group',
              children: [
                { type: 'rect', shape: { x: x0, y: topY, width: x1 - x0, height: api.coord([0, 0])[1] - topY }, style: { fill: CASE_BG } },
                { type: 'rect', shape: { x: x0, y: api.coord([0, 0])[1], width: x1 - x0, height: botY - api.coord([0, 0])[1] }, style: { fill: ACTION_BG } },
                { type: 'text', style: { text: '案情走势', fill: CASE_COLOR, font: 'bold 11px "Inter", "Microsoft YaHei", sans-serif', x: x0 + 14, y: topY + 14, textAlign: 'left', textBaseline: 'top' } },
                { type: 'text', style: { text: '执法动作', fill: ACTION_COLOR, font: 'bold 11px "Inter", "Microsoft YaHei", sans-serif', x: x0 + 14, y: botY - 14, textAlign: 'left', textBaseline: 'bottom' } },
              ],
            }
          },
        },
        // Series 1: Case connector lines + anchor dots (z:3, behind all cards)
        {
          type: 'custom',
          data: caseRenderData.map((d, i) => ({ value: [d[0], d[1], i] })),
          z: 3,
          silent: true,
          renderItem: (params: any, api: any) => {
            const t = api.value(0) as number
            const yVal = api.value(1) as number
            const [cx, cy] = api.coord([t, yVal])
            const [, axisY] = api.coord([t, 0])
            const color = CASE_COLOR
            const halfH = CARD_H / 2
            return {
              type: 'group',
              children: [
                { type: 'line', shape: { x1: cx, y1: axisY, x2: cx, y2: cy > axisY ? cy - halfH - 2 : cy + halfH + 2 }, style: { stroke: color, lineWidth: 1.2, opacity: 0.5 } },
                { type: 'circle', shape: { cx, cy: axisY, r: ANCHOR_R }, style: { fill: color, stroke: '#fff', lineWidth: 2, shadowBlur: 4, shadowColor: color } },
              ],
            }
          },
        },
        // Series 2: Action connector lines + anchor dots (z:3, behind all cards)
        {
          type: 'custom',
          data: actionRenderData.map((d, i) => ({ value: [d[0], d[1], i] })),
          z: 3,
          silent: true,
          renderItem: (params: any, api: any) => {
            const t = api.value(0) as number
            const yVal = api.value(1) as number
            const [cx, cy] = api.coord([t, yVal])
            const [, axisY] = api.coord([t, 0])
            const color = ACTION_COLOR
            const halfH = CARD_H / 2
            return {
              type: 'group',
              children: [
                { type: 'line', shape: { x1: cx, y1: axisY, x2: cx, y2: cy < axisY ? cy + halfH + 2 : cy - halfH - 2 }, style: { stroke: color, lineWidth: 1.2, opacity: 0.5 } },
                { type: 'circle', shape: { cx, cy: axisY, r: ANCHOR_R }, style: { fill: color, stroke: '#fff', lineWidth: 2, shadowBlur: 4, shadowColor: color } },
              ],
            }
          },
        },
        // Series 3: Case event cards (z:10)
        {
          type: 'custom',
          data: caseRenderData.map((d, i) => ({ value: [d[0], d[1], i], _eventData: caseStagger.eventData[i] })),
          z: 10,
          renderItem: (params: any, api: any) => {
            const t = api.value(0) as number
            const yVal = api.value(1) as number
            const idx = api.value(2) as number
            const [cx, cy] = api.coord([t, yVal])
            const color = CASE_COLOR
            const evt = caseStagger.eventData[idx]
            const summary = evt?.summary || getTruncatedDesc(evt?.description || '')
            const lines = wrapSummary(summary)
            const cw = getCardWidth(summary)
            const halfW = cw / 2
            const halfH = CARD_H / 2
            const cardTop = cy - halfH
            const textBlockH = lines.length * CARD_LINE_HEIGHT
            const textBlockTop = cardTop + (CARD_H - textBlockH) / 2
            const textChildren = lines.map((line, li) => ({
              type: 'text' as const,
              style: {
                text: line,
                fill: TEXT_COLOR,
                font: `bold ${CARD_FONT_SIZE}px "Inter", "Microsoft YaHei", sans-serif`,
                x: cx + CARD_ACCENT_W / 2,
                y: textBlockTop + li * CARD_LINE_HEIGHT + (CARD_LINE_HEIGHT - CARD_FONT_SIZE) / 2,
                textAlign: 'center' as const,
                textBaseline: 'top' as const,
              },
            }))
            return {
              type: 'group',
              children: [
                { type: 'rect', shape: { x: cx - halfW, y: cy - halfH, width: cw, height: CARD_H, r: CARD_R }, style: { fill: '#FFFFFF', stroke: color, lineWidth: 1.5, shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.08)' } },
                { type: 'rect', shape: { x: cx - halfW, y: cy - halfH, width: CARD_ACCENT_W, height: CARD_H, r: [CARD_R, 0, 0, CARD_R] }, style: { fill: color } },
                ...textChildren,
              ],
            }
          },
          emphasis: {
            itemStyle: { shadowBlur: 12, shadowColor: 'rgba(217,119,6,0.4)' },
          },
        },
        // Series 4: Action event cards (z:10)
        {
          type: 'custom',
          data: actionRenderData.map((d, i) => ({ value: [d[0], d[1], i], _eventData: actionStagger.eventData[i] })),
          z: 10,
          renderItem: (params: any, api: any) => {
            const t = api.value(0) as number
            const yVal = api.value(1) as number
            const idx = api.value(2) as number
            const [cx, cy] = api.coord([t, yVal])
            const color = ACTION_COLOR
            const evt = actionStagger.eventData[idx]
            const summary = evt?.summary || getTruncatedDesc(evt?.description || '')
            const lines = wrapSummary(summary)
            const cw = getCardWidth(summary)
            const halfW = cw / 2
            const halfH = CARD_H / 2
            const cardTop = cy - halfH
            const textBlockH = lines.length * CARD_LINE_HEIGHT
            const textBlockTop = cardTop + (CARD_H - textBlockH) / 2
            const textChildren = lines.map((line, li) => ({
              type: 'text' as const,
              style: {
                text: line,
                fill: TEXT_COLOR,
                font: `bold ${CARD_FONT_SIZE}px "Inter", "Microsoft YaHei", sans-serif`,
                x: cx + CARD_ACCENT_W / 2,
                y: textBlockTop + li * CARD_LINE_HEIGHT + (CARD_LINE_HEIGHT - CARD_FONT_SIZE) / 2,
                textAlign: 'center' as const,
                textBaseline: 'top' as const,
              },
            }))
            return {
              type: 'group',
              children: [
                { type: 'rect', shape: { x: cx - halfW, y: cy - halfH, width: cw, height: CARD_H, r: CARD_R }, style: { fill: '#FFFFFF', stroke: color, lineWidth: 1.5, shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.08)' } },
                { type: 'rect', shape: { x: cx - halfW, y: cy - halfH, width: CARD_ACCENT_W, height: CARD_H, r: [CARD_R, 0, 0, CARD_R] }, style: { fill: color } },
                ...textChildren,
              ],
            }
          },
          emphasis: {
            itemStyle: { shadowBlur: 12, shadowColor: 'rgba(3,105,161,0.4)' },
          },
        },
      ],
      dataZoom: [
        {
          type: 'slider', start: 0, end: 100, height: 24, bottom: 8,
          textStyle: { color: TEXT_SECONDARY, fontSize: 10 },
          borderColor: '#CBD5E1',
          backgroundColor: '#F8FAFC',
          fillerColor: 'rgba(3,105,161,0.12)',
          handleStyle: { color: CASE_COLOR },
        },
        { type: 'inside', start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true },
      ],
      animation: true,
      animationDuration: 550,
      animationEasing: 'cubicOut',
    }

    chartInstance.setOption(option, true)

    chartInstance.off('datazoom')
    chartInstance.on('datazoom', (params: any) => {
      if (params.batch && params.batch.length > 0) {
        const b = params.batch[0]
        const range = (b.end || 100) - (b.start || 0)
        zoomLevel.value = Math.max(0.5, Math.min(8, 100 / Math.max(range, 1)))
        chartInstance?.setOption({
          xAxis: {
            axisLabel: {
              formatter: (value: number) => {
                const d = new Date(value)
                if (zoomLevel.value > 2) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                if (zoomLevel.value > 1.2) return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:00`
                return `${d.getMonth() + 1}/${d.getDate()}`
              },
            },
          },
        })
      }
    })
  } catch (err) {
    console.error('Timeline render error:', err)
    chartInstance?.clear()
  }
}

// ============ Fishbone View ============
function renderFishbone() {
  if (!chartInstance) return
  if (!store.selectedClueId) {
    chartInstance.clear()
    return
  }
  const events = store.filteredEvents
  if (events.length === 0) {
    chartInstance.clear()
    return
  }

  const clueMap = new Map<number, any[]>()
  for (const e of events) {
    if (!clueMap.has(e.clue_id)) clueMap.set(e.clue_id, [])
    clueMap.get(e.clue_id)!.push(e)
  }

  const categories: any[] = []
  const nodes: any[] = []
  const links: any[] = []

  let clueIdx = 0
  for (const [clueId, clueEvents] of clueMap) {
    const clueName = store.getClueName(clueId)
    const clueColor = store.getClueColor(clueId)
    const spineNode = `clue_${clueId}`
    categories.push({ name: clueName, itemStyle: { color: clueColor } })

    nodes.push({
      name: spineNode,
      category: clueIdx,
      symbolSize: 34,
      itemStyle: { borderColor: clueColor, borderWidth: 2, shadowBlur: 6, shadowColor: clueColor },
      label: { show: true, fontSize: 12, fontWeight: 'bold', color: TEXT_COLOR },
    })

    clueEvents.sort((a: any, b: any) => a.event_time.localeCompare(b.event_time))

    for (const evt of clueEvents) {
      const evtNode = `evt_${evt.id}`
      const isCase = evt.event_type === 'case_track'
      const summary = evt.summary || getTruncatedDesc(evt.description || '')

      nodes.push({
        name: evtNode,
        category: clueIdx,
        symbolSize: 14,
        label: {
          show: true, fontSize: 10, color: TEXT_COLOR,
          formatter: `{time|${evt.event_time}}\n{summary|${summary}}`,
          rich: {
            time: { fontSize: 9, color: TEXT_SECONDARY, lineHeight: 14 },
            summary: { fontSize: 11, color: TEXT_COLOR, lineHeight: 16 },
          },
        },
        itemStyle: {
          color: isCase ? CASE_COLOR : ACTION_COLOR,
          borderColor: isCase ? CASE_COLOR_LIGHT : ACTION_COLOR_LIGHT,
          borderWidth: 2,
          shadowBlur: 4,
          shadowColor: isCase ? 'rgba(217,119,6,0.3)' : 'rgba(3,105,161,0.3)',
        },
        symbol: isCase ? 'roundRect' : 'diamond',
        _eventData: evt,
      })

      links.push({
        source: spineNode,
        target: evtNode,
        lineStyle: { color: clueColor, width: 2, opacity: 0.4, curveness: 0.35 },
      })
    }
    clueIdx++
  }

  chartInstance.setOption({
    backgroundColor: BG_COLOR,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,23,42,0.94)',
      borderColor: '#334155',
      textStyle: { color: '#F1F5F9', fontSize: 12 },
      formatter: (params: any) => {
        if (params.dataType === 'edge') return ''
        const d = params.data
        if (d._eventData) {
          const e = d._eventData
          return `<strong>${e.summary || getTruncatedDesc(e.description || '')}</strong><br/>${e.event_time}<br/>
            <span style="color:#64748B;font-size:10px;">点击查看详情</span>`
        }
        return params.name
      },
    },
    legend: {
      data: categories.map(c => c.name),
      top: 10,
      textStyle: { color: TEXT_SECONDARY, fontSize: 11 },
    },
    series: [{
      type: 'graph',
      layout: 'force',
      force: { repulsion: 350, edgeLength: [180, 350], gravity: 0.08 },
      roam: true,
      draggable: false,
      categories,
      nodes,
      edges: links,
      label: { show: true, position: 'right', fontSize: 10 },
      lineStyle: { curveness: 0.3 },
    }],
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
  }, true)
}

// ============ Watchers & Lifecycle ============

watch(() => store.filteredEvents, () => {
  nextTick(renderChart)
}, { deep: true })

watch(activeView, () => {
  nextTick(renderChart)
})

watch(() => store.selectedClueId, () => {
  nextTick(() => {
    if (chartInstance) renderChart()
  })
})

onMounted(() => {
  nextTick(() => initChart())
  document.addEventListener('keydown', handleKeydown)

  const ro = new ResizeObserver(() => {
    chartInstance?.resize()
  })
  if (chartDom.value) {
    ro.observe(chartDom.value)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<style scoped>
.timeline-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  transition: all 0.25s ease;
}

/* ========== Toolbar ========== */
.timeline-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  gap: var(--space-3);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.toolbar-icon {
  color: var(--color-accent);
}

.timeline-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
}

.event-count {
  font-size: var(--text-xs);
  color: var(--color-accent);
  font-weight: 600;
  background: var(--color-accent-soft);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.view-switcher {
  display: flex;
  gap: 2px;
  background: var(--color-bg);
  padding: 3px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.view-switch-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 13px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  white-space: nowrap;
  font-family: var(--font-sans);
}

.view-switch-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.view-switch-btn.active {
  background: var(--color-surface);
  color: var(--color-accent);
  font-weight: 600;
  box-shadow: var(--shadow-xs);
}

.fullscreen-btn {
  margin-left: 2px;
}

/* ========== Chart ========== */
.chart-container {
  flex: 1;
  position: relative;
  min-height: 0;
}

.chart-dom {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
}

.chart-empty .empty-icon {
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-3);
  opacity: 0.5;
}

.chart-empty p {
  font-size: var(--text-sm);
  margin: 2px 0;
}

.chart-empty .hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* ========== Legend ========== */
.timeline-legend {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.case-dot { background: var(--color-warning); }
.action-dot { background: var(--color-accent); }

.legend-hint {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ========== Event Dialog ========== */
.image-upload-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.image-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.image-preview-item {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-remove-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background var(--transition-fast);
}

.image-remove-btn:hover {
  background: var(--color-danger);
}

/* ========== Detail Popup ========== */
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.detail-card-wrapper {
  position: relative;
  max-width: 580px;
  width: 90%;
}

.detail-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 44px 32px 28px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
  color: var(--color-text);
}

.detail-close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast);
  z-index: 2;
  padding: 6px;
  border-radius: var(--radius-sm);
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-close:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

.detail-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.detail-nav-btn {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-xs);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-sans);
}

.detail-nav-btn:hover:not(:disabled) {
  background: var(--color-surface);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.detail-nav-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.detail-nav-info {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.detail-edit-btn {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-xs);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-sans);
}

.detail-edit-btn:hover {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.detail-delete-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-xs);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-sans);
}

.detail-delete-btn:hover {
  background: var(--color-danger-bg);
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.detail-type-badge {
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.case-badge {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.action-badge {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.detail-clue-tag {
  color: #fff;
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.detail-summary {
  font-size: var(--text-xl);
  font-weight: 700;
  margin: 0 0 var(--space-2) 0;
  color: var(--color-text);
  line-height: 1.4;
  text-align: center;
}

.detail-time {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
}

.detail-description {
  margin-bottom: var(--space-4);
}

.detail-description h4 {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 var(--space-2) 0;
  text-align: center;
}

.detail-description p {
  font-size: var(--text-sm);
  line-height: 1.7;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  text-align: center;
}

.detail-images h4 {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 var(--space-2) 0;
  text-align: center;
}

.detail-image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--space-2);
}

.detail-image-item {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid var(--color-border);
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.detail-image-item:hover {
  border-color: var(--color-accent);
  transform: scale(1.03);
}

.detail-image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-images-empty {
  display: flex;
  justify-content: center;
  padding: var(--space-5);
}

.empty-hint {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
}

/* ========== Image Preview Overlay ========== */
.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(15, 23, 42, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-close {
  position: absolute;
  top: var(--space-5);
  right: var(--space-5);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background var(--transition-fast);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-close:hover { background: rgba(255, 255, 255, 0.2); }

.image-preview-large {
  max-width: 85vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: var(--radius-xs);
}

.image-preview-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 50px;
  height: 80px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-nav:hover { background: rgba(255, 255, 255, 0.2); }
.image-preview-nav.prev { left: var(--space-5); }
.image-preview-nav.next { right: var(--space-5); }

/* ========== Transitions ========== */
.detail-popup-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.detail-popup-leave-active {
  transition: all 0.18s ease-in;
}
.detail-popup-enter-from {
  opacity: 0;
}
.detail-popup-enter-from .detail-card-wrapper {
  transform: translateY(30px) scale(0.96);
  opacity: 0;
}
.detail-popup-leave-to {
  opacity: 0;
}

.detail-popup-enter-active .detail-card-wrapper {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.img-preview-fade-enter-active,
.img-preview-fade-leave-active {
  transition: opacity 0.2s ease;
}
.img-preview-fade-enter-from,
.img-preview-fade-leave-to {
  opacity: 0;
}

/* ========== Fullscreen ========== */
.timeline-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 999 !important;
  background: var(--color-bg) !important;
}

.timeline-fullscreen .timeline-toolbar {
  background: var(--color-surface);
  border-bottom-color: var(--color-border);
  padding: var(--space-3) var(--space-5);
}

.timeline-fullscreen .view-switcher {
  background: var(--color-bg);
}

.timeline-fullscreen .timeline-legend {
  background: var(--color-surface);
  border-top-color: var(--color-border);
}

/* ========== Scrollbar ========== */
.detail-card::-webkit-scrollbar {
  width: 5px;
}
.detail-card::-webkit-scrollbar-track {
  background: transparent;
}
.detail-card::-webkit-scrollbar-thumb {
  background: var(--color-text-tertiary);
  border-radius: 3px;
}
.detail-card::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}
</style>
