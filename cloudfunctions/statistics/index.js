// 云函数：statistics
// 用于获取用户统计数据，使用聚合查询提高性能
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const { type, startDate, endDate } = event

    switch (type) {
      case 'overview':
        // 获取总览统计
        return await getOverviewStats(openid)

      case 'daily':
        // 获取每日统计
        return await getDailyStats(openid, startDate, endDate)

      case 'weekly':
        // 获取每周统计
        return await getWeeklyStats(openid, startDate, endDate)

      case 'monthly':
        // 获取每月统计
        return await getMonthlyStats(openid, startDate, endDate)

      case 'taskAnalysis':
        // 任务分析
        return await getTaskAnalysis(openid)

      default:
        return {
          success: false,
          message: '无效的统计类型'
        }
    }
  } catch (err) {
    console.error('统计数据获取失败', err)
    return {
      success: false,
      message: '统计数据获取失败',
      error: err.message
    }
  }
}

// 获取总览统计
async function getOverviewStats(openid) {
  const [pomodoroLogs, tasks, user] = await Promise.all([
    // 获取所有番茄记录
    db.collection('pomodoro_logs')
      .where({ _openid: openid, isCompleted: true })
      .get(),

    // 获取所有任务
    db.collection('tasks')
      .where({ _openid: openid })
      .get(),

    // 获取用户信息
    db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()
  ])

  // 计算统计数据
  const totalPomodoros = pomodoroLogs.data.length
  const totalMinutes = pomodoroLogs.data.reduce((sum, log) => sum + log.duration, 0)
  const totalHours = (totalMinutes / 60).toFixed(1)

  const completedTasks = tasks.data.filter(t => t.status === 'completed').length
  const totalTasks = tasks.data.length

  // 计算使用天数和日均番茄
  let registerDays = 0
  let avgDaily = 0
  if (user.data.length > 0) {
    const createdAt = new Date(user.data[0].createdAt)
    const now = new Date()
    registerDays = Math.max(1, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)) + 1)
    avgDaily = (totalPomodoros / registerDays).toFixed(1)
  }

  // 计算任务完成率
  const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0

  return {
    success: true,
    data: {
      totalPomodoros,
      totalHours: parseFloat(totalHours),
      completedTasks,
      totalTasks,
      registerDays,
      avgDaily: parseFloat(avgDaily),
      completionRate: parseFloat(completionRate)
    }
  }
}

// 获取每日统计（指定日期范围内的每一天）
async function getDailyStats(openid, startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const pomodoroLogs = await db.collection('pomodoro_logs')
    .where({
      _openid: openid,
      isCompleted: true,
      startedAt: _.gte(start).and(_.lte(end))
    })
    .get()

  // 按日期分组统计
  const dailyStats = {}
  pomodoroLogs.data.forEach(log => {
    const date = new Date(log.startedAt).toISOString().split('T')[0]
    if (!dailyStats[date]) {
      dailyStats[date] = {
        date,
        pomodoroCount: 0,
        totalMinutes: 0
      }
    }
    dailyStats[date].pomodoroCount++
    dailyStats[date].totalMinutes += log.duration
  })

  // 转换为数组并排序
  const result = Object.values(dailyStats).sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  )

  return {
    success: true,
    data: result
  }
}

// 获取每周统计
async function getWeeklyStats(openid, startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const pomodoroLogs = await db.collection('pomodoro_logs')
    .where({
      _openid: openid,
      isCompleted: true,
      startedAt: _.gte(start).and(_.lte(end))
    })
    .get()

  // 按周分组统计
  const weeklyStats = {}
  pomodoroLogs.data.forEach(log => {
    const date = new Date(log.startedAt)
    const weekStart = getWeekStart(date)
    const weekKey = weekStart.toISOString().split('T')[0]

    if (!weeklyStats[weekKey]) {
      weeklyStats[weekKey] = {
        weekStart: weekKey,
        pomodoroCount: 0,
        totalMinutes: 0
      }
    }
    weeklyStats[weekKey].pomodoroCount++
    weeklyStats[weekKey].totalMinutes += log.duration
  })

  const result = Object.values(weeklyStats).sort((a, b) =>
    new Date(a.weekStart) - new Date(b.weekStart)
  )

  return {
    success: true,
    data: result
  }
}

// 获取每月统计
async function getMonthlyStats(openid, startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const pomodoroLogs = await db.collection('pomodoro_logs')
    .where({
      _openid: openid,
      isCompleted: true,
      startedAt: _.gte(start).and(_.lte(end))
    })
    .get()

  // 按月分组统计
  const monthlyStats = {}
  pomodoroLogs.data.forEach(log => {
    const date = new Date(log.startedAt)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = {
        month: monthKey,
        pomodoroCount: 0,
        totalMinutes: 0
      }
    }
    monthlyStats[monthKey].pomodoroCount++
    monthlyStats[monthKey].totalMinutes += log.duration
  })

  const result = Object.values(monthlyStats).sort((a, b) =>
    a.month.localeCompare(b.month)
  )

  return {
    success: true,
    data: result
  }
}

// 任务分析
async function getTaskAnalysis(openid) {
  const [tasks, pomodoroLogs] = await Promise.all([
    db.collection('tasks')
      .where({ _openid: openid })
      .get(),

    db.collection('pomodoro_logs')
      .where({ _openid: openid, isCompleted: true })
      .get()
  ])

  // 按优先级分析
  const priorityStats = {
    high: { count: 0, completed: 0 },
    medium: { count: 0, completed: 0 },
    low: { count: 0, completed: 0 }
  }

  tasks.data.forEach(task => {
    const priority = task.priority || 'medium'
    priorityStats[priority].count++
    if (task.status === 'completed') {
      priorityStats[priority].completed++
    }
  })

  // 任务状态分布
  const statusStats = {
    pending: 0,
    in_progress: 0,
    completed: 0
  }

  tasks.data.forEach(task => {
    statusStats[task.status]++
  })

  // 番茄钟使用分析
  const taskWithPomodoros = tasks.data.filter(t => t.pomodoroCompleted > 0)
  const avgPomodorosPerTask = taskWithPomodoros.length > 0
    ? (taskWithPomodoros.reduce((sum, t) => sum + t.pomodoroCompleted, 0) / taskWithPomodoros.length).toFixed(1)
    : 0

  // 独立番茄（不绑定任务）
  const independentPomodoros = pomodoroLogs.data.filter(log => !log.taskId).length

  return {
    success: true,
    data: {
      priorityStats,
      statusStats,
      avgPomodorosPerTask: parseFloat(avgPomodorosPerTask),
      independentPomodoros,
      totalTasks: tasks.data.length
    }
  }
}

// 获取一周的开始日期（周一）
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 调整到周一
  return new Date(d.setDate(diff))
}
