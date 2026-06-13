/// <reference types="vite/client" />

declare module 'sql.js' {
  export default function initSqlJs(config?: any): Promise<any>
  export interface Database {
    run(sql: string, params?: any[]): Database
    exec(sql: string): any[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
    getRowsModified(): number
  }
  export interface Statement {
    bind(params?: any[]): boolean
    step(): boolean
    getAsObject(): any
    get(): any[]
    free(): boolean
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  electronAPI: {
    getAllClues: () => Promise<any[]>
    getClueById: (id: number) => Promise<any>
    getCluesByMonth: (month: number | null) => Promise<any[]>
    insertClue: (clue: any) => Promise<any>
    updateClue: (id: number, clue: any) => Promise<any>
    deleteClue: (id: number) => Promise<any>

    getEventsByClueId: (clueId: number) => Promise<any[]>
    getAllEvents: () => Promise<any[]>
    insertEvent: (event: any) => Promise<any>
    updateEvent: (id: number, event: any) => Promise<any>
    deleteEvent: (id: number) => Promise<any>

    getTasksByClueId: (clueId: number) => Promise<any[]>
    getAllTasks: () => Promise<any[]>
    insertTask: (task: any) => Promise<any>
    updateTask: (id: number, task: any) => Promise<any>
    deleteTask: (id: number) => Promise<any>

    getPartiesByClueId: (clueId: number) => Promise<any[]>
    insertParty: (party: any) => Promise<any>
    updateParty: (id: number, party: any) => Promise<any>
    deleteParty: (id: number) => Promise<any>
    replacePartiesForClueId: (clueId: number, parties: any[]) => Promise<number[]>

    previewImport: () => Promise<{
      success: boolean
      message?: string
      filePath?: string
      hasDuplicates: boolean
      duplicates: { clue_number: string; clue_name: string }[]
      totalCount: number
      newCount: number
    }>
    executeImport: (filePath: string, strategy: string) => Promise<{ success: boolean; message: string }>
    exportExcel: () => Promise<{ success: boolean; message: string }>
    exportTemplate: () => Promise<{ success: boolean; message: string }>

    selectImages: () => Promise<string[]>
    copyImagesForEvent: (eventId: number, sourcePaths: string[]) => Promise<string[]>
    getEventImages: (eventId: number) => Promise<string[]>

    generateDemoData: () => Promise<{ success: boolean; message: string }>
  }
}
