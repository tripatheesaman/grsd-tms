import fs from 'fs'
import path from 'path'

const ANCHOR_AD = new Date('1944-04-13')
const ANCHOR_BS = { year: 2001, month: 1, day: 1 }
const BS_DATA: Record<number, number[]> = {}
let bsLoaded = false

function loadBSData() {
  if (bsLoaded) return
  const filePath = path.join(process.cwd(), 'public', 'calendar_bs.csv')
  if (!fs.existsSync(filePath)) {
    throw new Error(
      'Missing BS calendar data file at public/templates/calendar_bs.csv'
    )
  }
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.trim().split('\n')
  for (let i = 1; i < lines.length; i++) {
    const [yearStr, ...months] = lines[i].split(',')
    const year = parseInt(yearStr, 10)
    BS_DATA[year] = months.map((m) => parseInt(m, 10))
  }
  bsLoaded = true
}

export function adToBs(adStr: string): string {
  loadBSData()
  const ad = new Date(adStr)
  if (Number.isNaN(ad.getTime())) throw new Error('Invalid AD date')
  let bsY = ANCHOR_BS.year
  let bsM = ANCHOR_BS.month
  let bsD = ANCHOR_BS.day
  const currentAD = new Date(ANCHOR_AD)
  while (currentAD < ad) {
    bsD++
    const daysInMonth = BS_DATA[bsY]?.[bsM - 1]
    if (!daysInMonth) {
      throw new Error('BS year out of range')
    }
    if (bsD > daysInMonth) {
      bsD = 1
      bsM++
      if (bsM > 12) {
        bsM = 1
        bsY++
        if (!BS_DATA[bsY]) throw new Error('BS year out of range')
      }
    }
    currentAD.setDate(currentAD.getDate() + 1)
  }
  return `${bsY}-${String(bsM).padStart(2, '0')}-${String(bsD).padStart(2, '0')}`
}

export function bsToAd(bsStr: string): string {
  loadBSData()
  const [bsY, bsM, bsD] = bsStr.split('-').map(Number)
  if (!BS_DATA[bsY] || bsM < 1 || bsM > 12 || bsD < 1 || bsD > BS_DATA[bsY][bsM - 1]) {
    throw new Error('Invalid BS date')
  }
  let y = ANCHOR_BS.year
  let m = ANCHOR_BS.month
  let d = ANCHOR_BS.day
  const ad = new Date(ANCHOR_AD)
  while (y < bsY || (y === bsY && m < bsM) || (y === bsY && m === bsM && d < bsD)) {
    d++
    const daysInMonth = BS_DATA[y]?.[m - 1]
    if (!daysInMonth) {
      throw new Error('BS year out of range')
    }
    if (d > daysInMonth) {
      d = 1
      m++
      if (m > 12) {
        m = 1
        y++
        if (!BS_DATA[y]) throw new Error('BS year out of range')
      }
    }
    ad.setDate(ad.getDate() + 1)
  }
  return `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(
    ad.getDate()
  ).padStart(2, '0')}`
}

export function getCurrentNepaliFiscalYear(adDate = new Date()): string {
  const adIsoDate = adDate.toISOString().slice(0, 10)
  const bsDate = adToBs(adIsoDate)
  const [yearStr, monthStr] = bsDate.split('-')
  const bsYear = parseInt(yearStr, 10)
  const bsMonth = parseInt(monthStr, 10)
  const fyStartYear = bsMonth >= 4 ? bsYear : bsYear - 1
  const nextYearSuffix = String((fyStartYear + 1) % 100).padStart(2, '0')
  return `${fyStartYear}/${nextYearSuffix}`
}
