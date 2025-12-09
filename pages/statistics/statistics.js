// pages/statistics/statistics.js
const { formatTime, getWeekStart, getWeekEnd } = require('../../utils/util.js')
const { pomodoroLogDB, taskDB } = require('../../utils/db.js')
const { getStatisticsShareInfo, getTimelineShareInfo } = require('../../utils/share.js')

Page({
  data: {
    weekStats: {
      totalPomodoros: 0,
      totalMinutes: 0,
      completedTasks: 0
    },
    weeklyData: [],
    avgDaily: 0,
    maxDaily: 0,
    streakDays: 0
  },

  onLoad() {
    this.loadWeeklyStats()
  },

  onShow() {
    this.loadWeeklyStats()

    // 更新自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
  },

  // 加载周统计
  loadWeeklyStats() {
    const weekStart = getWeekStart()
    const weekEnd = getWeekEnd()

    Promise.all([
      pomodoroLogDB.list({ startDate: weekStart, endDate: weekEnd }),
      taskDB.list({ status: 'completed' })
    ]).then(([pomodoroRes, taskRes]) => {
      const logs = pomodoroRes.data

      // 计算本周统计
      const totalMinutes = logs.reduce((sum, log) => sum + log.duration, 0)
      const completedThisWeek = taskRes.data.filter(task => {
        const completedAt = new Date(task.completedAt)
        return completedAt >= weekStart && completedAt <= weekEnd
      })

      this.setData({
        weekStats: {
          totalPomodoros: logs.length,
          totalMinutes: totalMinutes,
          completedTasks: completedThisWeek.length
        }
      })

      // 生成7天数据
      this.generateWeeklyChart(logs)

      // 计算趋势数据
      this.calculateTrends(logs)
    }).catch(err => {
      console.error('加载统计失败', err)
    })
  },

  // 生成周图表数据
  generateWeeklyChart(logs) {
    const weekDays = []
    const today = new Date()

    // 获取最近7天
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(today.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const dateStr = formatTime(date, 'YYYY-MM-DD')
      const dayLabel = i === 0 ? '今天' : formatTime(date, 'MM-DD')

      // 计算当天的番茄数
      const count = logs.filter(log => {
        const logDate = formatTime(new Date(log.startedAt), 'YYYY-MM-DD')
        return logDate === dateStr
      }).length

      weekDays.push({
        date: dateStr,
        label: dayLabel,
        count: count,
        height: 0 // 待计算
      })
    }

    // 计算柱状图高度（相对于最大值的百分比）
    const maxCount = Math.max(...weekDays.map(d => d.count), 1)
    weekDays.forEach(day => {
      day.height = maxCount > 0 ? (day.count / maxCount) * 100 : 0
    })

    this.setData({ weeklyData: weekDays })
  },

  // 计算趋势数据
  calculateTrends(logs) {
    // 按日期分组
    const dailyCount = {}
    logs.forEach(log => {
      const dateStr = formatTime(new Date(log.startedAt), 'YYYY-MM-DD')
      dailyCount[dateStr] = (dailyCount[dateStr] || 0) + 1
    })

    const counts = Object.values(dailyCount)
    // 修复：使用实际有数据的天数而不是固定的7天
    const daysWithData = counts.length > 0 ? counts.length : 7
    const avgDaily = counts.length > 0 ? (counts.reduce((a, b) => a + b, 0) / daysWithData).toFixed(1) : 0
    const maxDaily = Math.max(...counts, 0)

    // 计算连续天数（简化版，仅统计最近连续）
    let streakDays = 0
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(today.getDate() - i)
      const dateStr = formatTime(date, 'YYYY-MM-DD')

      if (dailyCount[dateStr]) {
        streakDays++
      } else {
        break
      }
    }

    this.setData({
      avgDaily: avgDaily,
      maxDaily: maxDaily,
      streakDays: streakDays
    })
  },

  // 分享给好友
  onShareAppMessage() {
    const shareInfo = getStatisticsShareInfo(this.data.weekStats)
    return {
      title: shareInfo.title,
      path: shareInfo.path,
      imageUrl: shareInfo.imageUrl
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const shareInfo = getTimelineShareInfo('weekly', {
      totalPomodoros: this.data.weekStats.totalPomodoros,
      totalHours: this.data.weekStats.totalHours,
      completedTasks: this.data.weekStats.completedTasks
    })
    return {
      title: shareInfo.title,
      query: shareInfo.query,
      imageUrl: shareInfo.imageUrl
    }
  }
})
