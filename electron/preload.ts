import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Clues
  getAllClues: () => ipcRenderer.invoke('clues:getAll'),
  getClueById: (id: number) => ipcRenderer.invoke('clues:getById', id),
  getCluesByMonth: (month: number | null) => ipcRenderer.invoke('clues:getByMonth', month),
  insertClue: (clue: any) => ipcRenderer.invoke('clues:insert', clue),
  updateClue: (id: number, clue: any) => ipcRenderer.invoke('clues:update', id, clue),
  deleteClue: (id: number) => ipcRenderer.invoke('clues:delete', id),

  // Timeline Events
  getEventsByClueId: (clueId: number) => ipcRenderer.invoke('events:getByClueId', clueId),
  getAllEvents: () => ipcRenderer.invoke('events:getAll'),
  insertEvent: (event: any) => ipcRenderer.invoke('events:insert', event),
  updateEvent: (id: number, event: any) => ipcRenderer.invoke('events:update', id, event),
  deleteEvent: (id: number) => ipcRenderer.invoke('events:delete', id),

  // Tasks
  getTasksByClueId: (clueId: number) => ipcRenderer.invoke('tasks:getByClueId', clueId),
  getAllTasks: () => ipcRenderer.invoke('tasks:getAll'),
  insertTask: (task: any) => ipcRenderer.invoke('tasks:insert', task),
  updateTask: (id: number, task: any) => ipcRenderer.invoke('tasks:update', id, task),
  deleteTask: (id: number) => ipcRenderer.invoke('tasks:delete', id),

  // Parties
  getPartiesByClueId: (clueId: number) => ipcRenderer.invoke('parties:getByClueId', clueId),
  insertParty: (party: any) => ipcRenderer.invoke('parties:insert', party),
  updateParty: (id: number, party: any) => ipcRenderer.invoke('parties:update', id, party),
  deleteParty: (id: number) => ipcRenderer.invoke('parties:delete', id),
  replacePartiesForClueId: (clueId: number, parties: any[]) => ipcRenderer.invoke('parties:replaceForClueId', clueId, parties),

  // Import/Export
  previewImport: () => ipcRenderer.invoke('import:preview'),
  executeImport: (filePath: string, strategy: string) => ipcRenderer.invoke('import:execute', filePath, strategy),
  exportExcel: () => ipcRenderer.invoke('export:excel'),
  exportTemplate: () => ipcRenderer.invoke('export:template'),

  // Images
  selectImages: () => ipcRenderer.invoke('images:select'),
  copyImagesForEvent: (eventId: number, sourcePaths: string[]) => ipcRenderer.invoke('images:copyForEvent', eventId, sourcePaths),
  getEventImages: (eventId: number) => ipcRenderer.invoke('images:getEventImages', eventId),

  // Demo
  generateDemoData: () => ipcRenderer.invoke('demo:generate'),
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
