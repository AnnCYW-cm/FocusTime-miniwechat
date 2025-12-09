// app.js
App({
  globalData: {
    userInfo: null,
    openid: null,
    settings: {
      pomodoroDuration: 25,
      shortBreak: 5,
      longBreak: 15,
      longBreakInterval: 4,
      soundEnabled: true,
      vibrationEnabled: true,
      autoStartBreak: false,
      autoStartPomodoro: false
    }
  },

  onLaunch: function () {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-3gviboroffb9458b',
        traceUser: true,
      })
    }

    // 静默登录（加载用户设置会在登录成功后自动调用）
    this.silentLogin()
  },

  // 静默登录
  silentLogin: function() {
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        this.globalData.openid = res.result.openid

        // 检查用户是否存在，不存在则创建
        this.checkAndCreateUser()

        // 加载用户设置
        this.loadUserSettings()
      },
      fail: err => {
        console.error('登录失败:', err)

        // 显示错误提示
        wx.showModal({
          title: '登录失败',
          content: '云函数调用失败，请检查：\n1. login云函数是否已部署\n2. 云开发环境ID是否正确',
          showCancel: false
        })
      }
    })
  },

  // 检查并创建用户
  checkAndCreateUser: function() {
    const db = wx.cloud.database()
    db.collection('users').where({
      _openid: this.globalData.openid
    }).get({
      success: res => {
        if (res.data.length === 0) {
          // 创建新用户
          db.collection('users').add({
            data: {
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        }
      }
    })
  },

  // 加载用户设置
  loadUserSettings: function() {
    const db = wx.cloud.database()
    db.collection('user_settings').where({
      _openid: this.globalData.openid
    }).get({
      success: res => {
        if (res.data.length > 0) {
          this.globalData.settings = res.data[0]
        } else {
          // 创建默认设置
          db.collection('user_settings').add({
            data: {
              pomodoroDuration: 25,
              shortBreak: 5,
              longBreak: 15,
              longBreakInterval: 4,
              soundEnabled: true,
              vibrationEnabled: true,
              autoStartBreak: false,
              autoStartPomodoro: false,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        }
      }
    })
  }
})
