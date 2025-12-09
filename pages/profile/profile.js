// pages/profile/profile.js
const { showToast, showLoading, hideLoading } = require('../../utils/util.js')
const { userDB } = require('../../utils/db.js')
const { getProfileShareInfo, getTimelineShareInfo } = require('../../utils/share.js')

Page({
  data: {
    userInfo: {
      nickName: '',
      avatarUrl: ''
    },
    tempAvatar: '',
    tempNickname: '',
    registerDays: 0,
    cumulativeStats: {
      totalPomodoros: 0,
      totalHours: 0,
      totalTasks: 0,
      avgDaily: 0
    }
  },

  onLoad() {
    this.loadUserInfo()
    this.loadCumulativeStats()
  },

  onShow() {
    this.loadUserInfo()
    this.loadCumulativeStats()

    // 更新自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 3
      })
    }
  },

  // 加载用户信息
  loadUserInfo() {
    userDB.get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0]
        this.setData({
          userInfo: {
            nickName: user.nickName || '',
            avatarUrl: user.avatarUrl || ''
          }
        })

        // 计算注册天数（从注册日起算，包括今天）
        const createdAt = new Date(user.createdAt)
        const now = new Date()
        const days = Math.max(1, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)) + 1)
        this.setData({ registerDays: days })
      }
    }).catch(err => {
      console.error('加载用户信息失败', err)
    })
  },

  // 加载累计统计数据
  loadCumulativeStats() {
    userDB.getCumulativeStats().then(([pomodoroRes, taskCountRes]) => {
      const pomodoros = pomodoroRes.data
      const totalMinutes = pomodoros.reduce((sum, log) => sum + log.duration, 0)
      const totalHours = (totalMinutes / 60).toFixed(1)

      // 计算日均番茄（从注册至今的天数）
      userDB.get().then(userRes => {
        if (userRes.data.length > 0) {
          const createdAt = new Date(userRes.data[0].createdAt)
          const now = new Date()
          const days = Math.max(1, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)) + 1)
          const avgDaily = (pomodoros.length / days).toFixed(1)

          this.setData({
            cumulativeStats: {
              totalPomodoros: pomodoros.length,
              totalHours: totalHours,
              totalTasks: taskCountRes.total,
              avgDaily: avgDaily
            }
          })
        }
      })
    }).catch(err => {
      console.error('加载统计数据失败', err)
    })
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({
      tempAvatar: avatarUrl,
      'userInfo.avatarUrl': avatarUrl
    })
  },

  // 输入昵称
  onNicknameInput(e) {
    this.setData({
      tempNickname: e.detail.value
    })
  },

  // 保存用户信息
  onSaveUserInfo() {
    const { tempNickname, tempAvatar } = this.data

    if (!tempNickname.trim()) {
      showToast('请输入昵称')
      return
    }

    showLoading('保存中...')

    userDB.update({
      nickName: tempNickname,
      avatarUrl: tempAvatar
    }).then(() => {
      hideLoading()
      showToast('保存成功', 'success')
      this.setData({
        'userInfo.nickName': tempNickname,
        'userInfo.avatarUrl': tempAvatar,
        tempNickname: '',
        tempAvatar: ''
      })
    }).catch(err => {
      hideLoading()
      console.error('保存失败', err)
      showToast('保存失败')
    })
  },

  // 跳转到设置页
  onGoToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  // 关于
  onAbout() {
    wx.showModal({
      title: '关于 TimeFocus',
      content: '版本：V1.0 MVP\n\n一款结合任务管理与番茄钟的微信小程序，帮助你科学管理时间、提升专注力。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 测试后端连接
  onTestBackend() {
    const app = getApp()
    const { cloudFunctions, taskDB } = require('../../utils/db.js')

    wx.showLoading({
      title: '正在测试...',
      mask: true
    })

    let testResults = []
    let allPassed = true

    // 测试1: 检查登录状态
    console.log('=== 开始测试后端连接 ===\n')
    console.log('✅ 测试1: 登录状态')

    if (app.globalData.openid) {
      testResults.push('✅ 登录成功')
      testResults.push(`   OpenID: ${app.globalData.openid.substring(0, 10)}...`)
      console.log('✅ 已登录，OpenID:', app.globalData.openid)
    } else {
      testResults.push('❌ 未登录')
      allPassed = false
      console.error('❌ 未获取到 OpenID')
    }

    // 测试2: 数据库连接
    console.log('\n⏳ 测试2: 数据库连接')
    taskDB.list({}).then(res => {
      testResults.push('✅ 数据库连接成功')
      testResults.push(`   当前任务数: ${res.data.length}`)
      console.log('✅ 数据库连接成功，任务数:', res.data.length)

      // 测试3: 统计云函数
      console.log('\n⏳ 测试3: 统计云函数')
      return cloudFunctions.getStatistics('overview')
    }).then(result => {
      testResults.push('✅ 统计云函数正常')
      testResults.push(`   总番茄数: ${result.data.totalPomodoros}`)
      testResults.push(`   总时长: ${result.data.totalHours} 小时`)
      console.log('✅ 统计云函数调用成功:', result.data)

      // 测试4: 数据导出云函数
      console.log('\n⏳ 测试4: 数据导出云函数')
      return cloudFunctions.exportData('statistics', 'json')
    }).then(result => {
      testResults.push('✅ 数据导出云函数正常')
      console.log('✅ 数据导出云函数调用成功')

      // 所有测试通过
      wx.hideLoading()
      console.log('\n=== 所有测试通过！===')
      wx.showModal({
        title: '🎉 测试通过',
        content: testResults.join('\n'),
        showCancel: false,
        confirmText: '太好了'
      })
    }).catch(err => {
      // 测试失败
      allPassed = false
      wx.hideLoading()

      console.error('\n❌ 测试失败:', err)

      let errorMsg = '测试失败\n\n'
      errorMsg += testResults.join('\n')
      errorMsg += '\n\n❌ 错误信息:\n'
      errorMsg += err.message || '未知错误'

      if (err.message && err.message.includes('cloud.callFunction:fail')) {
        errorMsg += '\n\n💡 可能原因:\n'
        errorMsg += '1. 云函数未部署\n'
        errorMsg += '2. 云开发环境ID错误'

        console.error('\n💡 请检查:')
        console.error('1. 云函数是否已部署')
        console.error('2. 在微信开发者工具中右键点击云函数文件夹')
        console.error('3. 选择"上传并部署：云端安装依赖"')
      }

      if (err.message && err.message.includes('permission denied')) {
        errorMsg += '\n\n💡 可能原因:\n'
        errorMsg += '1. 数据库权限未配置\n'
        errorMsg += '2. 未登录'

        console.error('\n💡 请检查:')
        console.error('1. 数据库权限设置')
        console.error('2. 是否已登录（获取 openid）')
      }

      wx.showModal({
        title: '⚠️ 测试结果',
        content: errorMsg,
        showCancel: false,
        confirmText: '我知道了'
      })
    })
  },

  // 分享给好友
  onShareAppMessage() {
    const shareInfo = getProfileShareInfo(this.data.cumulativeStats)
    return {
      title: shareInfo.title,
      path: shareInfo.path,
      imageUrl: shareInfo.imageUrl
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const shareInfo = getTimelineShareInfo('achievement', {
      totalPomodoros: this.data.cumulativeStats.totalPomodoros,
      totalHours: this.data.cumulativeStats.totalHours,
      totalTasks: this.data.cumulativeStats.totalTasks
    })
    return {
      title: shareInfo.title,
      query: shareInfo.query,
      imageUrl: shareInfo.imageUrl
    }
  }
})
