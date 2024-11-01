/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useStatisticsStore
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This model manages the app statistics
 *
 * END HEADER
 */

import { type Stats } from '@providers/stats'
import { defineStore } from 'pinia'
import { anyLast30Days, avgAny30Days, sumAny30Days } from 'source/common/util/stats'
import { DateTime } from 'luxon'
import { ref, computed } from 'vue'

const ipcRenderer = window.ipc

/**
 * Generates the past 30 days as ISO dates in the form YYYY-MM-DD
 *
 * @return  {string[]}  The date strings
 */
function generateLast30ISODates (): string[] {
  const dates: string[] = []

  let currentDate = DateTime.now()

  while (dates.length < 30) {
    dates.push(currentDate.toISODate())
    currentDate = currentDate.minus({ days: 1 })
  }

  return dates
}

function anyLast30CalendarDays (record: Array<[string, number]>): Array<[string, number]> {
  const last30Days = generateLast30ISODates()

  const data: Array<[string, number]> = []
  for (const iso of last30Days) {
    const count = record.find(x => x[0] === iso)?.[1] ?? 0
    data.push([ iso, count ])
  }

  // NOTE: At this point, data is still reversed (latest first), but we want to
  // return earliest first.
  data.reverse()
  return data
}


export const useStatisticsStore = defineStore('statistics', () => {
  const stats = ref<Stats>({
    wordCount: {},
    charCount: {},
    pomodoros: {},
  })

  const avg30DaysWords = computed(() => avgAny30Days(stats.value.wordCount))
  const avg30DaysChars = computed(() => avgAny30Days(stats.value.charCount))
  const sum30DaysWords = computed(() => sumAny30Days(stats.value.wordCount))
  const sum30DaysChars = computed(() => sumAny30Days(stats.value.charCount))

  const todayWords = computed(() => {
    if (anyLast30Days(stats.value.wordCount).length === 0) {
      return 0
    }

    return anyLast30Days(stats.value.wordCount)[0][1]
  })

  const todayChars = computed(() => {
    if (anyLast30Days(stats.value.charCount).length === 0) {
      return 0
    }

    return anyLast30Days(stats.value.charCount)[0][1]
  })

  const wordsLast30CalendarDays = computed(() => {
    return anyLast30CalendarDays(anyLast30Days(stats.value.wordCount))
  })

  const charsLast30CalendarDays = computed(() => {
    return anyLast30CalendarDays(anyLast30Days(stats.value.charCount))
  })

  // Initial update
  ipcRenderer.invoke('stats-provider', { command: 'get-data' })
    .then(data => { stats.value = data })
    .catch(err => console.error(err))

  // Listen to subsequent updates
  ipcRenderer.on('stats-updated', (event, data: Stats) => {
    stats.value = data
  })

  return {
    stats,
    avg30DaysChars, avg30DaysWords,
    sum30DaysChars, sum30DaysWords,
    wordsLast30CalendarDays, charsLast30CalendarDays,
    todayWords, todayChars
  }
})
