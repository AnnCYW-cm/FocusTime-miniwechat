// 云函数：exportData
// 用于导出用户数据，支持多种格式
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const { type, format = 'json' } = event

    let data = null

    switch (type) {
      case 'all':
        // 导出所有数据
        data = await exportAllData(openid)
        break

      case 'tasks':
        // 导出任务数据
        data = await exportTasks(openid)
        break

      case 'pomodoros':
        // 导出番茄记录
        data = await exportPomodoros(openid)
        break

      case 'statistics':
        // 导出统计数据
        data = await exportStatistics(openid)
        break

      default:
        return {
          success: false,
          message: '无效的导出类型'
        }
    }

    // 根据格式返回数据
    if (format === 'json') {
      return {
        success: true,
        data: data,
        format: 'json',
        exportTime: new Date().toISOString()
      }
    } else if (format === 'csv') {
      // 转换为 CSV 格式
      const csv = convertToCSV(data, type)
      return {
        success: true,
        data: csv,
        format: 'csv',
        exportTime: new Date().toISOString()
      }
    }

  } catch (err) {
    console.error('数据导出失败', err)
    return {
      success: false,
      message: '数据导出失败',
      error: err.message
    }
  }
}

// 导出所有数据
async function exportAllData(openid) {
  const [user, tasks, pomodoros, settings] = await Promise.all([
    db.collection('users')
      .where({ _openid: openid })
      .get(),

    db.collection('tasks')
      .where({ _openid: openid })
      .get(),

    db.collection('pomodoro_logs')
      .where({ _openid: openid })
      .get(),

    db.collection('user_settings')
      .where({ _openid: openid })
      .get()
  ])

  return {
    user: user.data[0] || null,
    tasks: tasks.data,
    pomodoros: pomodoros.data,
    settings: settings.data[0] || null
  }
}

// 导出任务数据
async function exportTasks(openid) {
  const tasks = await db.collection('tasks')
    .where({ _openid: openid })
    .orderBy('createdAt', 'desc')
    .get()

  return tasks.data
}

// 导出番茄记录
async function exportPomodoros(openid) {
  const pomodoros = await db.collection('pomodoro_logs')
    .where({ _openid: openid })
    .orderBy('startedAt', 'desc')
    .get()

  return pomodoros.data
}

// 导出统计数据
async function exportStatistics(openid) {
  const [tasks, pomodoros] = await Promise.all([
    db.collection('tasks')
      .where({ _openid: openid })
      .get(),

    db.collection('pomodoro_logs')
      .where({ _openid: openid, isCompleted: true })
      .get()
  ])

  // 计算统计数据
  const totalPomodoros = pomodoros.data.length
  const totalMinutes = pomodoros.data.reduce((sum, log) => sum + log.duration, 0)
  const totalHours = (totalMinutes / 60).toFixed(2)

  const completedTasks = tasks.data.filter(t => t.status === 'completed').length
  const inProgressTasks = tasks.data.filter(t => t.status === 'in_progress').length
  const pendingTasks = tasks.data.filter(t => t.status === 'pending').length

  // 优先级分布
  const highPriorityTasks = tasks.data.filter(t => t.priority === 'high').length
  const mediumPriorityTasks = tasks.data.filter(t => t.priority === 'medium').length
  const lowPriorityTasks = tasks.data.filter(t => t.priority === 'low').length

  return {
    summary: {
      totalPomodoros,
      totalHours: parseFloat(totalHours),
      totalTasks: tasks.data.length,
      completedTasks,
      inProgressTasks,
      pendingTasks
    },
    priority: {
      high: highPriorityTasks,
      medium: mediumPriorityTasks,
      low: lowPriorityTasks
    },
    generatedAt: new Date().toISOString()
  }
}

// 转换为 CSV 格式
function convertToCSV(data, type) {
  if (type === 'tasks') {
    const headers = ['标题', '描述', '优先级', '状态', '目标番茄数', '完成番茄数', '创建时间', '完成时间']
    const rows = data.map(task => [
      task.title,
      task.description || '',
      task.priority,
      task.status,
      task.pomodoroTarget,
      task.pomodoroCompleted,
      new Date(task.createdAt).toLocaleString('zh-CN'),
      task.completedAt ? new Date(task.completedAt).toLocaleString('zh-CN') : ''
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  if (type === 'pomodoros') {
    const headers = ['任务标题', '时长(分钟)', '开始时间', '结束时间', '是否完成']
    const rows = data.map(log => [
      log.taskTitle || '独立番茄',
      log.duration,
      new Date(log.startedAt).toLocaleString('zh-CN'),
      new Date(log.endedAt).toLocaleString('zh-CN'),
      log.isCompleted ? '是' : '否'
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  // 其他类型返回 JSON 字符串
  return JSON.stringify(data, null, 2)
}
