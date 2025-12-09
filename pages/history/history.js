// pages/history/history.js
const { formatTime } = require('../../utils/util.js')
const { pomodoroLogDB } = require('../../utils/db.js')

Page({
  data: {
    selectedDate: '',
    logs: [],
    dayStats: {
      count: 0,
      duration: 0
    }
  },

  onLoad() {
    // 默认选择今天
    const today = formatTime(new Date(), 'YYYY-MM-DD')
    this.setData({ selectedDate: today })
    this.loadLogs(today)
  },

  onShow() {
    // 更新自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
  },

  // 日期选择
  onDateChange(e) {
    const date = e.detail.value
    this.setData({ selectedDate: date })
    this.loadLogs(date)
  },

  // 加载番茄记录
  loadLogs(dateStr) {
    const startDate = new Date(dateStr)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(dateStr)
    endDate.setHours(23, 59, 59, 999)

    pomodoroLogDB.list({
      startDate: startDate,
      endDate: endDate
    }).then(res => {
      const logs = res.data.map(log => {
        return {
          ...log,
          startTime: formatTime(new Date(log.startedAt), 'HH:mm'),
          endTime: formatTime(new Date(log.endedAt), 'HH:mm')
        }
      })

      const totalDuration = logs.reduce((sum, log) => sum + log.duration, 0)

      this.setData({
        logs: logs,
        dayStats: {
          count: logs.length,
          duration: totalDuration
        }
      })
    }).catch(err => {
      console.error('加载记录失败', err)
    })
  }
})
