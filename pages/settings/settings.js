// pages/settings/settings.js
const { showToast, showLoading, hideLoading } = require('../../utils/util.js')
const { settingsDB } = require('../../utils/db.js')

const app = getApp()

Page({
  data: {
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

  onLoad() {
    this.loadSettings()
  },

  // 加载设置
  loadSettings() {
    settingsDB.get().then(res => {
      if (res.data.length > 0) {
        this.setData({
          settings: res.data[0]
        })

        // 同步到全局
        app.globalData.settings = res.data[0]
      }
    }).catch(err => {
      console.error('加载设置失败', err)
    })
  },

  // 番茄时长改变
  onPomodoroDurationChange(e) {
    this.setData({
      'settings.pomodoroDuration': parseInt(e.detail.value)
    })
  },

  // 短休息时长改变
  onShortBreakChange(e) {
    this.setData({
      'settings.shortBreak': parseInt(e.detail.value)
    })
  },

  // 长休息时长改变
  onLongBreakChange(e) {
    this.setData({
      'settings.longBreak': parseInt(e.detail.value)
    })
  },

  // 长休息间隔改变
  onLongBreakIntervalChange(e) {
    this.setData({
      'settings.longBreakInterval': parseInt(e.detail.value)
    })
  },

  // 震动开关
  onVibrationChange(e) {
    this.setData({
      'settings.vibrationEnabled': e.detail.value
    })
  },

  // 提示音开关
  onSoundChange(e) {
    this.setData({
      'settings.soundEnabled': e.detail.value
    })
  },

  // 保存设置
  onSave() {
    showLoading('保存中...')

    settingsDB.update(this.data.settings).then(() => {
      // 同步到全局
      app.globalData.settings = this.data.settings

      hideLoading()
      showToast('保存成功', 'success')

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/profile/profile'
        })
      }, 1500)
    }).catch(err => {
      hideLoading()
      console.error('保存失败', err)
      showToast('保存失败')
    })
  }
})
