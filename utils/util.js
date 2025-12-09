// 工具函数库

/**
 * 格式化时间
 * @param {Date} date 日期对象
 * @param {String} format 格式字符串，默认 'YYYY-MM-DD HH:mm:ss'
 */
const formatTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return format
    .replace('YYYY', year)
    .replace('MM', padZero(month))
    .replace('DD', padZero(day))
    .replace('HH', padZero(hour))
    .replace('mm', padZero(minute))
    .replace('ss', padZero(second))
}

/**
 * 补零
 */
const padZero = (n) => {
  return n < 10 ? '0' + n : n
}

/**
 * 格式化番茄钟倒计时显示
 * @param {Number} seconds 剩余秒数
 * @returns {String} MM:SS 格式
 */
const formatCountdown = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${padZero(minutes)}:${padZero(secs)}`
}

/**
 * 获取今日开始时间戳
 */
const getTodayStart = () => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * 获取今日结束时间戳
 */
const getTodayEnd = () => {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  return now
}

/**
 * 获取本周开始时间戳
 */
const getWeekStart = () => {
  const now = new Date()
  const day = now.getDay() || 7 // 周日为0，转换为7
  now.setDate(now.getDate() - day + 1)
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * 获取本周结束时间戳
 */
const getWeekEnd = () => {
  const now = new Date()
  const day = now.getDay() || 7
  now.setDate(now.getDate() - day + 7)
  now.setHours(23, 59, 59, 999)
  return now
}

/**
 * 获取本月开始时间戳
 */
const getMonthStart = () => {
  const now = new Date()
  now.setDate(1)
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * 获取本月结束时间戳
 */
const getMonthEnd = () => {
  const now = new Date()
  now.setMonth(now.getMonth() + 1)
  now.setDate(0)
  now.setHours(23, 59, 59, 999)
  return now
}

/**
 * 将分钟转换为时长显示文本
 * @param {Number} minutes 分钟数
 * @returns {String} 例如：1小时30分钟 或 45分钟
 */
const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes}分钟`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
}

/**
 * 显示提示信息
 */
const showToast = (title, icon = 'none') => {
  wx.showToast({
    title,
    icon,
    duration: 2000
  })
}

/**
 * 显示加载中
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏加载
 */
const hideLoading = () => {
  wx.hideLoading()
}

/**
 * 显示确认对话框
 */
const showConfirm = (content, title = '提示') => {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title,
      content,
      success: res => {
        if (res.confirm) {
          resolve(true)
        } else {
          resolve(false)
        }
      },
      fail: reject
    })
  })
}

module.exports = {
  formatTime,
  formatCountdown,
  formatDuration,
  getTodayStart,
  getTodayEnd,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  showToast,
  showLoading,
  hideLoading,
  showConfirm
}
