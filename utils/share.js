// 分享功能工具函数

/**
 * 生成分享配置
 */

// 默认分享信息
const defaultShareInfo = {
  title: 'TimeFocus - 科学管理时间，提升专注力',
  path: '/pages/index/index',
  imageUrl: '' // 可以设置自定义分享图片
}

/**
 * 首页分享 - 今日进度
 */
const getIndexShareInfo = (todayStats = {}) => {
  const { totalPomodoros = 0, totalMinutes = 0, completedTasks = 0 } = todayStats

  let title = 'TimeFocus - 科学管理时间，提升专注力'

  if (totalPomodoros > 0) {
    const hours = (totalMinutes / 60).toFixed(1)
    title = `今天我完成了 ${totalPomodoros} 个番茄钟，专注 ${hours} 小时！一起来高效工作吧~`
  }

  return {
    title,
    path: '/pages/index/index',
    imageUrl: ''
  }
}

/**
 * 统计页分享 - 周统计成就
 */
const getStatisticsShareInfo = (weekStats = {}) => {
  const { totalPomodoros = 0, totalHours = 0, completedTasks = 0 } = weekStats

  let title = 'TimeFocus - 查看我的专注统计'

  if (totalPomodoros > 0) {
    title = `本周我完成了 ${totalPomodoros} 个番茄钟，专注 ${totalHours} 小时，完成 ${completedTasks} 个任务！`
  }

  return {
    title,
    path: '/pages/statistics/statistics',
    imageUrl: ''
  }
}

/**
 * 个人页分享 - 累计成就
 */
const getProfileShareInfo = (cumulativeStats = {}) => {
  const { totalPomodoros = 0, totalHours = 0, totalTasks = 0, avgDaily = 0 } = cumulativeStats

  let title = 'TimeFocus - 我的专注成就'

  if (totalPomodoros > 0) {
    title = `我已累计完成 ${totalPomodoros} 个番茄钟，专注 ${totalHours} 小时，完成 ${totalTasks} 个任务！日均 ${avgDaily} 个番茄钟~`
  }

  return {
    title,
    path: '/pages/profile/profile',
    imageUrl: ''
  }
}

/**
 * 任务详情分享 - 任务完成
 */
const getTaskShareInfo = (task = {}) => {
  const { title = '', pomodoroCompleted = 0, pomodoroTarget = 1 } = task

  let shareTitle = 'TimeFocus - 我的任务进度'

  if (title) {
    if (pomodoroCompleted >= pomodoroTarget) {
      shareTitle = `我完成了任务「${title}」，用了 ${pomodoroCompleted} 个番茄钟！`
    } else {
      shareTitle = `我正在进行任务「${title}」，已完成 ${pomodoroCompleted}/${pomodoroTarget} 个番茄钟~`
    }
  }

  return {
    title: shareTitle,
    path: '/pages/index/index',
    imageUrl: ''
  }
}

/**
 * 朋友圈分享 - 生成分享内容
 */
const getTimelineShareInfo = (type, data = {}) => {
  let title = 'TimeFocus - 科学管理时间，提升专注力'

  switch (type) {
    case 'daily':
      if (data.totalPomodoros > 0) {
        title = `今天完成 ${data.totalPomodoros} 个番茄钟，专注 ${(data.totalMinutes / 60).toFixed(1)} 小时！`
      }
      break
    case 'weekly':
      if (data.totalPomodoros > 0) {
        title = `本周完成 ${data.totalPomodoros} 个番茄钟，${data.completedTasks} 个任务！`
      }
      break
    case 'achievement':
      if (data.totalPomodoros > 0) {
        title = `累计完成 ${data.totalPomodoros} 个番茄钟，专注 ${data.totalHours} 小时！`
      }
      break
    default:
      title = 'TimeFocus - 科学管理时间，提升专注力'
  }

  return {
    title,
    query: '',
    imageUrl: '' // 可以设置朋友圈分享图片
  }
}

/**
 * 生成激励文案
 */
const getMotivationalText = (pomodoros) => {
  if (pomodoros === 0) {
    return '开始你的第一个番茄钟吧！'
  } else if (pomodoros < 5) {
    return '继续加油，保持专注！'
  } else if (pomodoros < 10) {
    return '太棒了，专注力满满！'
  } else if (pomodoros < 20) {
    return '效率之星，持续保持！'
  } else {
    return '时间管理大师，向你学习！'
  }
}

module.exports = {
  defaultShareInfo,
  getIndexShareInfo,
  getStatisticsShareInfo,
  getProfileShareInfo,
  getTaskShareInfo,
  getTimelineShareInfo,
  getMotivationalText
}
