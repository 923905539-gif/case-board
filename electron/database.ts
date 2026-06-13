import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import { app } from 'electron'
import * as fs from 'fs'

let db: SqlJsDatabase
let dbPath: string

async function initDatabase(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs()
  dbPath = path.join(app.getPath('userData'), 'case-board.db')

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')
  initTables()
  saveDb()
  return db
}

function saveDb() {
  if (db && dbPath) {
    const data = db.export()
    const buffer = Buffer.from(data)
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(dbPath, buffer)
  }
}

let dbReady: Promise<SqlJsDatabase> | null = null

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (db) return db
  if (!dbReady) {
    dbReady = initDatabase()
  }
  return dbReady
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS clues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clue_number TEXT NOT NULL UNIQUE,
      clue_name TEXT NOT NULL,
      lead_unit TEXT DEFAULT '',
      assist_unit TEXT DEFAULT '',
      discovery_date TEXT DEFAULT '',
      party_name TEXT DEFAULT '',
      party_id_number TEXT DEFAULT '',
      party_phone TEXT DEFAULT '',
      party_hometown TEXT DEFAULT '',
      party_vehicle TEXT DEFAULT '',
      case_location TEXT DEFAULT '',
      case_brief TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS timeline_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clue_id INTEGER NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('case_track', 'action_track')),
      event_time TEXT NOT NULL,
      description TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      image_paths TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (clue_id) REFERENCES clues(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clue_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('todo', 'in_progress', 'done')),
      content TEXT DEFAULT '',
      urgency TEXT DEFAULT 'normal' CHECK(urgency IN ('low', 'normal', 'high', 'urgent')),
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (clue_id) REFERENCES clues(id) ON DELETE CASCADE
    )
  `)

  db.run('CREATE INDEX IF NOT EXISTS idx_timeline_clue ON timeline_events(clue_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_timeline_time ON timeline_events(event_time)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_clue ON tasks(clue_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)')

  db.run(`
    CREATE TABLE IF NOT EXISTS clue_parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clue_id INTEGER NOT NULL,
      party_name TEXT DEFAULT '',
      party_id_number TEXT DEFAULT '',
      party_phone TEXT DEFAULT '',
      party_hometown TEXT DEFAULT '',
      party_vehicle TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (clue_id) REFERENCES clues(id) ON DELETE CASCADE
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_parties_clue ON clue_parties(clue_id)')

  // Migration for existing databases
  try { db.run('ALTER TABLE timeline_events ADD COLUMN summary TEXT DEFAULT \'\'') } catch (_) { /* exists */ }
  try { db.run('ALTER TABLE timeline_events ADD COLUMN image_paths TEXT DEFAULT \'[]\'') } catch (_) { /* exists */ }
  // clue_parties table added in a later version; create if missing
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS clue_parties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clue_id INTEGER NOT NULL,
        party_name TEXT DEFAULT '',
        party_id_number TEXT DEFAULT '',
        party_phone TEXT DEFAULT '',
        party_hometown TEXT DEFAULT '',
        party_vehicle TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (clue_id) REFERENCES clues(id) ON DELETE CASCADE
      )
    `)
    db.run('CREATE INDEX IF NOT EXISTS idx_parties_clue ON clue_parties(clue_id)')
  } catch (_) { /* exists */ }
}

// Helper: run a SELECT and return all rows as objects
function queryAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

// Helper: run a SELECT and return first row or null
function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params)
  return rows.length > 0 ? rows[0] : null
}

// Helper: run INSERT/UPDATE/DELETE and save
function execute(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  db.run(sql, params)
  const changes = db.getRowsModified()
  // Get last insert id
  const lastIdResult = queryOne('SELECT last_insert_rowid() as id')
  const lastInsertRowid = lastIdResult ? lastIdResult.id : 0
  saveDb()
  return { changes, lastInsertRowid }
}

// ==================== Clue CRUD ====================

export async function getAllClues() {
  await getDatabase()
  return queryAll('SELECT * FROM clues ORDER BY created_at DESC')
}

export async function getClueById(id: number) {
  await getDatabase()
  return queryOne('SELECT * FROM clues WHERE id = ?', [id])
}

export async function getCluesByMonth(month: number | null) {
  await getDatabase()
  if (month === null) return getAllClues()
  const monthStr = month.toString().padStart(2, '0')
  return queryAll(
    "SELECT * FROM clues WHERE strftime('%m', discovery_date) = ? ORDER BY created_at DESC",
    [monthStr]
  )
}

export async function getClueByNumber(clueNumber: string) {
  await getDatabase()
  return queryOne('SELECT * FROM clues WHERE clue_number = ?', [clueNumber])
}

export async function getExistingClueNumbers(clueNumbers: string[]): Promise<string[]> {
  await getDatabase()
  if (clueNumbers.length === 0) return []
  const placeholders = clueNumbers.map(() => '?').join(',')
  const rows = queryAll(
    `SELECT clue_number FROM clues WHERE clue_number IN (${placeholders})`,
    clueNumbers
  )
  return rows.map((r: any) => r.clue_number)
}

export async function insertClue(clue: any) {
  await getDatabase()
  return execute(`
    INSERT INTO clues (clue_number, clue_name, lead_unit, assist_unit, discovery_date,
      party_name, party_id_number, party_phone, party_hometown, party_vehicle,
      case_location, case_brief)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    clue.clue_number, clue.clue_name, clue.lead_unit || '', clue.assist_unit || '',
    clue.discovery_date || '', clue.party_name || '', clue.party_id_number || '',
    clue.party_phone || '', clue.party_hometown || '', clue.party_vehicle || '',
    clue.case_location || '', clue.case_brief || ''
  ])
}

export async function updateClue(id: number, clue: any) {
  await getDatabase()
  const keys = Object.keys(clue)
  const setClauses = keys.map(k => `${k} = ?`).join(', ')
  const values = keys.map(k => (clue as any)[k])
  return execute(`
    UPDATE clues SET ${setClauses}, updated_at = datetime('now', 'localtime') WHERE id = ?
  `, [...values, id])
}

export async function deleteClue(id: number) {
  await getDatabase()
  // Delete related records first
  execute('DELETE FROM timeline_events WHERE clue_id = ?', [id])
  execute('DELETE FROM tasks WHERE clue_id = ?', [id])
  execute('DELETE FROM clue_parties WHERE clue_id = ?', [id])
  return execute('DELETE FROM clues WHERE id = ?', [id])
}

export async function clearAllData() {
  await getDatabase()
  execute('DELETE FROM tasks')
  execute('DELETE FROM timeline_events')
  execute('DELETE FROM clue_parties')
  execute('DELETE FROM clues')
  saveDb()
}

// ==================== Timeline Events CRUD ====================

export async function getEventsByClueId(clueId: number) {
  await getDatabase()
  return queryAll(
    'SELECT * FROM timeline_events WHERE clue_id = ? ORDER BY event_time ASC',
    [clueId]
  )
}

export async function getAllEvents() {
  await getDatabase()
  return queryAll(`
    SELECT te.*, c.clue_name, c.clue_number
    FROM timeline_events te
    JOIN clues c ON te.clue_id = c.id
    ORDER BY te.event_time ASC
  `)
}

export async function insertTimelineEvent(event: any) {
  await getDatabase()
  return execute(`
    INSERT INTO timeline_events (clue_id, event_type, event_time, description, summary, image_paths)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [event.clue_id, event.event_type, event.event_time, event.description || '', event.summary || '', event.image_paths || '[]'])
}

export async function updateTimelineEvent(id: number, event: any) {
  await getDatabase()
  const keys = Object.keys(event)
  const setClauses = keys.map(k => `${k} = ?`).join(', ')
  const values = keys.map(k => (event as any)[k])
  return execute(`UPDATE timeline_events SET ${setClauses} WHERE id = ?`, [...values, id])
}

export async function deleteTimelineEvent(id: number) {
  await getDatabase()
  return execute('DELETE FROM timeline_events WHERE id = ?', [id])
}

export async function replaceEventsForClueId(clueId: number, events: any[]): Promise<number[]> {
  await getDatabase()
  execute('DELETE FROM timeline_events WHERE clue_id = ?', [clueId])
  const ids: number[] = []
  for (const event of events) {
    if (event.event_time && (event.description || event.summary)) {
      const result = await insertTimelineEvent({
        clue_id: clueId,
        event_type: event.event_type || 'case_track',
        event_time: event.event_time,
        description: event.description || '',
        summary: event.summary || '',
        image_paths: event.image_paths || '[]',
      })
      ids.push(result.lastInsertRowid)
    }
  }
  return ids
}

// ==================== Tasks CRUD ====================

export async function getTasksByClueId(clueId: number) {
  await getDatabase()
  return queryAll(
    'SELECT * FROM tasks WHERE clue_id = ? ORDER BY created_at DESC',
    [clueId]
  )
}

export async function getAllTasks() {
  await getDatabase()
  return queryAll(`
    SELECT t.*, c.clue_name, c.clue_number
    FROM tasks t
    JOIN clues c ON t.clue_id = c.id
    ORDER BY t.created_at DESC
  `)
}

export async function insertTask(task: any) {
  await getDatabase()
  return execute(`
    INSERT INTO tasks (clue_id, status, content, urgency)
    VALUES (?, ?, ?, ?)
  `, [task.clue_id, task.status, task.content, task.urgency || 'normal'])
}

export async function updateTask(id: number, task: any) {
  await getDatabase()
  const keys = Object.keys(task)
  const setClauses = keys.map(k => `${k} = ?`).join(', ')
  const values = keys.map(k => (task as any)[k])
  return execute(
    `UPDATE tasks SET ${setClauses}, updated_at = datetime('now', 'localtime') WHERE id = ?`,
    [...values, id]
  )
}

export async function deleteTask(id: number) {
  await getDatabase()
  return execute('DELETE FROM tasks WHERE id = ?', [id])
}

// ==================== Party CRUD ====================

export async function getPartiesByClueId(clueId: number) {
  await getDatabase()
  return queryAll(
    'SELECT * FROM clue_parties WHERE clue_id = ? ORDER BY sort_order, id',
    [clueId]
  )
}

export async function getAllParties() {
  await getDatabase()
  return queryAll(`
    SELECT p.*, c.clue_number
    FROM clue_parties p
    JOIN clues c ON p.clue_id = c.id
    ORDER BY c.clue_number, p.sort_order, p.id
  `)
}

export async function insertParty(party: any) {
  await getDatabase()
  return execute(`
    INSERT INTO clue_parties (clue_id, party_name, party_id_number, party_phone, party_hometown, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [party.clue_id, party.party_name || '', party.party_id_number || '', party.party_phone || '', party.party_hometown || '', party.sort_order || 0])
}

export async function updateParty(id: number, party: any) {
  await getDatabase()
  const keys = Object.keys(party)
  const setClauses = keys.map(k => `${k} = ?`).join(', ')
  const values = keys.map(k => (party as any)[k])
  return execute(
    `UPDATE clue_parties SET ${setClauses} WHERE id = ?`,
    [...values, id]
  )
}

export async function deleteParty(id: number) {
  await getDatabase()
  return execute('DELETE FROM clue_parties WHERE id = ?', [id])
}

export async function deletePartiesByClueId(clueId: number) {
  await getDatabase()
  return execute('DELETE FROM clue_parties WHERE clue_id = ?', [clueId])
}

export async function replacePartiesForClueId(clueId: number, parties: any[]): Promise<number[]> {
  await getDatabase()
  execute('DELETE FROM clue_parties WHERE clue_id = ?', [clueId])
  const ids: number[] = []
  for (let i = 0; i < parties.length; i++) {
    const p = parties[i]
    if (p.party_name) {
      const result = await insertParty({
        clue_id: clueId,
        party_name: p.party_name || '',
        party_id_number: p.party_id_number || '',
        party_phone: p.party_phone || '',
        party_hometown: p.party_hometown || '',
        sort_order: i,
      })
      ids.push(result.lastInsertRowid)
    }
  }
  return ids
}

// ==================== Bulk Import ====================

export async function importClueWithEvents(clue: any, events: any[], parties?: any[]) {
  await getDatabase()

  // Insert clue
  const result = await insertClue(clue)
  const clueId = result.lastInsertRowid

  // Insert parties
  const insertedPartyIds: number[] = []
  if (parties && parties.length > 0) {
    for (let i = 0; i < parties.length; i++) {
      const p = parties[i]
      if (p.party_name) {
        const pResult = await insertParty({
          clue_id: clueId,
          party_name: p.party_name || '',
          party_id_number: p.party_id_number || '',
          party_phone: p.party_phone || '',
          party_hometown: p.party_hometown || '',
          sort_order: i,
        })
        insertedPartyIds.push(pResult.lastInsertRowid)
      }
    }
  }

  // Insert events and collect IDs
  const insertedEventIds: number[] = []
  for (const event of events) {
    if (event.event_time && (event.description || event.summary)) {
      const eventResult = await insertTimelineEvent({
        clue_id: clueId,
        event_type: event.event_type || 'case_track',
        event_time: event.event_time,
        description: event.description || '',
        summary: event.summary || '',
        image_paths: event.image_paths || '[]',
      })
      insertedEventIds.push(eventResult.lastInsertRowid)
    }
  }

  return { clueId, eventIds: insertedEventIds, partyIds: insertedPartyIds }
}

// ==================== Export ====================

export async function exportAllData() {
  const clues = await getAllClues()
  const events = await getAllEvents()
  const tasks = await getAllTasks()
  const parties = await getAllParties()
  return { clues, events, tasks, parties }
}
