// pages/index/index.js
const { formatCountdown, getTodayStart, getTodayEnd, showToast, showConfirm } = require('../../utils/util.js')
const { taskDB, pomodoroLogDB } = require('../../utils/db.js')
const { getIndexShareInfo, getTimelineShareInfo } = require('../../utils/share.js')

const app = getApp()

Page({
  data: {
    // 新用户引导
    showWelcomeModal: false,
    tempAvatar: '',
    tempNickname: '',

    // 番茄钟状态
    timerState: 'idle', // idle, running, paused, break
    timerDisplay: '25:00',
    remainingSeconds: 1500, // 25分钟
    totalSeconds: 1500,
    timerInterval: null,

    // 当前任务
    currentTask: null,

    // 任务列表
    tasks: [],
    availableTasks: [],
    filterStatus: 'all',

    // 今日统计
    todayStats: {
      pomodoroCount: 0,
      focusMinutes: 0,
      completedTasks: 0
    },

    // UI状态
    showTaskSelector: false,
    showCompletionModal: false,
    showBreakSelector: false,

    // 自定义时长
    customDuration: 25, // 本次番茄钟时长（分钟）
    customBreakDuration: 5, // 本次休息时长（分钟）

    // 计时记录
    startedAt: null,
    pomodoroCount: 0 // 今日已完成番茄数，用于判断长休息
  },

  onLoad() {
    this.loadTasks()
    this.loadTodayStats()
    this.restoreTimerState()
    this.checkFirstTimeUser()
  },

  onShow() {
    this.loadTasks()
    this.loadTodayStats()

    // 更新自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
  },

  onUnload() {
    this.clearTimer()
  },

  onHide() {
    // 保存计时状态到本地
    if (this.data.timerState === 'running' || this.data.timerState === 'paused') {
      this.saveTimerState()
    }
  },

  // 加载任务列表
  loadTasks() {
    const filter = this.data.filterStatus === 'all' ? {} : { status: this.data.filterStatus }

    taskDB.list(filter).then(res => {
      this.setData({
        tasks: res.data,
        availableTasks: res.data.filter(t => t.status !== 'completed')
      })
    }).catch(err => {
      console.error('加载任务失败', err)
      showToast('加载任务失败')
    })
  },

  // 加载今日统计
  loadTodayStats() {
    const todayStart = getTodayStart()
    const todayEnd = getTodayEnd()

    Promise.all([
      pomodoroLogDB.getTodayStats(todayStart, todayEnd),
      taskDB.list({ status: 'completed' })
    ]).then(([pomodoroRes, taskRes]) => {
      const pomodoros = pomodoroRes.data
      const completedToday = taskRes.data.filter(task => {
        const completedAt = new Date(task.completedAt)
        return completedAt >= todayStart && completedAt <= todayEnd
      })

      const focusMinutes = pomodoros.reduce((sum, log) => sum + log.duration, 0)

      this.setData({
        todayStats: {
          pomodoroCount: pomodoros.length,
          focusMinutes,
          completedTasks: completedToday.length
        },
        pomodoroCount: pomodoros.length
      })
    }).catch(err => {
      console.error('加载统计失败', err)
    })
  },

  // 保存计时状态
  saveTimerState() {
    const state = {
      timerState: this.data.timerState,
      startedAt: this.data.startedAt,
      plannedDuration: Math.floor(this.data.totalSeconds / 60),
      boundTaskId: this.data.currentTask ? this.data.currentTask._id : null,
      pausedRemaining: this.data.remainingSeconds
    }
    wx.setStorageSync('timerState', state)
  },

  // 恢复计时状态
  restoreTimerState() {
    try {
      const state = wx.getStorageSync('timerState')
      if (!state || state.timerState === 'idle') return

      const now = new Date().getTime()
      const elapsed = Math.floor((now - state.startedAt) / 1000)
      const totalSeconds = state.plannedDuration * 60

      if (state.timerState === 'running') {
        const remaining = totalSeconds - elapsed

        if (remaining <= 0) {
          // 已完成
          this.completePomodoro()
        } else {
          // 继续计时
          this.setData({
            timerState: 'running',
            startedAt: state.startedAt,
            remainingSeconds: remaining,
            totalSeconds: totalSeconds
          })
          this.startTimer()

          // 恢复绑定的任务
          if (state.boundTaskId) {
            taskDB.get(state.boundTaskId).then(res => {
              if (res.data) {
                this.setData({ currentTask: res.data })
              }
            })
          }
        }
      } else if (state.timerState === 'paused') {
        this.setData({
          timerState: 'paused',
          startedAt: state.startedAt,
          remainingSeconds: state.pausedRemaining,
          totalSeconds: totalSeconds
        })

        if (state.boundTaskId) {
          taskDB.get(state.boundTaskId).then(res => {
            if (res.data) {
              this.setData({ currentTask: res.data })
            }
          })
        }
      }
    } catch (err) {
      console.error('恢复计时状态失败', err)
    }
  },

  // 清除计时状态
  clearTimerState() {
    wx.removeStorageSync('timerState')
  },

  // 开始计时
  onStartTimer() {
    // 设置默认时长为设置中的时长
    const defaultDuration = app.globalData.settings.pomodoroDuration || 25
    this.setData({
      showTaskSelector: true,
      customDuration: defaultDuration
    })
  },

  // 选择时长
  onSelectDuration(e) {
    const duration = parseInt(e.currentTarget.dataset.duration)
    this.setData({
      customDuration: duration
    })
  },

  // 选择任务
  onTaskSelected(e) {
    const task = e.currentTarget.dataset.task

    // 更新任务状态为进行中
    if (task.status === 'pending') {
      taskDB.startProgress(task._id)
    }

    this.setData({
      currentTask: task,
      showTaskSelector: false
    })

    this.startPomodoro()
  },

  // 独立番茄
  onIndependentPomodoro() {
    this.setData({
      currentTask: null,
      showTaskSelector: false
    })

    this.startPomodoro()
  },

  // 从选择器添加新任务
  onAddTaskFromSelector() {
    this.setData({ showTaskSelector: false })
    wx.navigateTo({
      url: '/pages/task-detail/task-detail?fromSelector=true'
    })
  },

  // 从任务详情页创建任务后自动开始番茄钟
  startPomodoroWithTask(task) {
    // 更新任务状态为进行中
    if (task.status === 'pending') {
      taskDB.startProgress(task._id)
    }

    this.setData({
      currentTask: task
    })

    this.startPomodoro()
  },

  // 开始番茄钟
  startPomodoro() {
    // 使用自定义时长
    const duration = this.data.customDuration || app.globalData.settings.pomodoroDuration || 25
    const totalSeconds = duration * 60

    this.setData({
      timerState: 'running',
      totalSeconds: totalSeconds,
      remainingSeconds: totalSeconds,
      startedAt: new Date().getTime(),
      timerDisplay: `${duration}:00`
    })

    this.startTimer()
    this.saveTimerState()
  },

  // 启动定时器
  startTimer() {
    this.clearTimer()

    this.timerInterval = setInterval(() => {
      let remaining = this.data.remainingSeconds - 1

      if (remaining <= 0) {
        this.clearTimer()
        this.completePomodoro()
      } else {
        this.setData({
          remainingSeconds: remaining,
          timerDisplay: formatCountdown(remaining)
        })
      }
    }, 1000)

    this.setData({
      timerDisplay: formatCountdown(this.data.remainingSeconds)
    })
  },

  // 暂停计时
  onPauseTimer() {
    this.clearTimer()
    this.setData({
      timerState: 'paused'
    })
    this.saveTimerState()
  },

  // 继续计时
  onResumeTimer() {
    this.setData({
      timerState: 'running',
      startedAt: new Date().getTime() - (this.data.totalSeconds - this.data.remainingSeconds) * 1000
    })
    this.startTimer()
    this.saveTimerState()
  },

  // 放弃番茄
  onAbandonTimer() {
    showConfirm('确定要放弃当前番茄吗？').then(confirmed => {
      if (confirmed) {
        this.clearTimer()
        this.resetTimer()
        this.clearTimerState()
        showToast('已放弃番茄')
      }
    })
  },

  // 完成番茄
  completePomodoro() {
    const endedAt = new Date()
    const startedAt = new Date(this.data.startedAt)
    const duration = Math.floor((endedAt - startedAt) / 1000 / 60)

    // 震动和提示音
    if (app.globalData.settings.vibrationEnabled !== false) {
      wx.vibrateShort()
    }

    // 显示完成提示（带系统提示音）
    showToast('🍅 番茄完成！', 'success')

    // 保存番茄记录
    const logData = {
      taskId: this.data.currentTask ? this.data.currentTask._id : null,
      taskTitle: this.data.currentTask ? this.data.currentTask.title : '',
      duration: duration,
      startedAt: startedAt,
      endedAt: endedAt
    }

    pomodoroLogDB.create(logData).then(() => {
      // 更新任务番茄数
      if (this.data.currentTask) {
        return taskDB.incrementPomodoro(this.data.currentTask._id)
      }
    }).then(() => {
      this.loadTasks()
      this.loadTodayStats()

      // 如果有绑定任务，显示进度弹窗
      if (this.data.currentTask) {
        // 重新获取任务最新数据
        taskDB.get(this.data.currentTask._id).then(res => {
          if (res.data) {
            this.setData({
              currentTask: res.data,
              showCompletionModal: true
            })
          }
        })
      } else {
        // 没有绑定任务，重置计时器
        this.resetTimer()
        this.clearTimerState()
      }
    })
  },

  // 开始休息
  startBreak() {
    const pomodoroCount = this.data.pomodoroCount + 1
    const isLongBreak = pomodoroCount % (app.globalData.settings.longBreakInterval || 4) === 0
    const breakDuration = isLongBreak
      ? (app.globalData.settings.longBreak || 15)
      : (app.globalData.settings.shortBreak || 5)

    const totalSeconds = breakDuration * 60

    this.setData({
      timerState: 'break',
      totalSeconds: totalSeconds,
      remainingSeconds: totalSeconds,
      pomodoroCount: pomodoroCount
    })

    this.startTimer()
  },

  // 跳过休息
  onSkipBreak() {
    this.clearTimer()
    this.resetTimer()
    this.clearTimerState()
  },

  // 清除定时器
  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  },

  // 重置计时器
  resetTimer() {
    const duration = app.globalData.settings.pomodoroDuration || 25
    this.setData({
      timerState: 'idle',
      timerDisplay: `${duration}:00`,
      remainingSeconds: duration * 60,
      totalSeconds: duration * 60,
      currentTask: null,
      startedAt: null
    })
  },

  // 筛选任务
  onFilterChange(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ filterStatus: status })
    this.loadTasks()
  },

  // 新建任务
  onAddTask() {
    wx.navigateTo({
      url: '/pages/task-detail/task-detail'
    })
  },

  // 编辑任务
  onEditTask(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/task-detail/task-detail?id=${id}`
    })
  },

  // 完成任务
  onCompleteTask(e) {
    const id = e.currentTarget.dataset.id

    showConfirm('确定要完成这个任务吗？').then(confirmed => {
      if (confirmed) {
        taskDB.complete(id).then(() => {
          showToast('任务已完成', 'success')
          this.loadTasks()
          this.loadTodayStats()
        }).catch(err => {
          console.error('完成任务失败', err)
          showToast('操作失败')
        })
      }
    })
  },

  // 删除任务
  onDeleteTask(e) {
    const id = e.currentTarget.dataset.id

    showConfirm('删除后历史番茄记录仍保留，但不再关联此任务。确定删除？').then(confirmed => {
      if (confirmed) {
        taskDB.delete(id).then(() => {
          showToast('任务已删除', 'success')
          this.loadTasks()
        }).catch(err => {
          console.error('删除任务失败', err)
          showToast('删除失败')
        })
      }
    })
  },

  // 点击任务
  onTaskTap(e) {
    // 如果正在计时，不允许切换任务
    if (this.data.timerState === 'running' || this.data.timerState === 'paused') {
      showToast('请先完成或放弃当前番茄')
      return
    }

    const task = e.currentTarget.dataset.task
    this.setData({ currentTask: task })
  },

  // 选择任务
  onSelectTask() {
    if (this.data.timerState === 'running' || this.data.timerState === 'paused') {
      showToast('请先完成或放弃当前番茄')
      return
    }

    this.setData({ showTaskSelector: true })
  },

  // 关闭任务选择器
  onCloseTaskSelector() {
    this.setData({ showTaskSelector: false })
  },

  // 阻止模态框内容点击穿透
  onModalContentTap() {
    // 空函数，阻止事件冒泡
  },

  // 关闭完成弹窗
  onCloseCompletionModal() {
    this.setData({ showCompletionModal: false })
    // 重置计时器，不自动开始休息
    this.resetTimer()
    this.clearTimerState()
  },

  // 完成任务
  onCompleteTaskFromModal() {
    const taskId = this.data.currentTask._id

    taskDB.complete(taskId).then(() => {
      showToast('任务已完成', 'success')
      this.setData({
        showCompletionModal: false,
        currentTask: null
      })
      this.loadTasks()
      this.loadTodayStats()
      this.resetTimer()
      this.clearTimerState()
    }).catch(err => {
      console.error('完成任务失败', err)
      showToast('操作失败')
    })
  },

  // 再来一个番茄钟
  onAnotherPomodoro() {
    this.setData({ showCompletionModal: false })
    this.startPomodoro()
  },

  // 显示休息时长选择器
  onShowBreakSelector() {
    // 根据已完成番茄数智能推荐休息时长
    const pomodoroCount = this.data.pomodoroCount + 1
    const isLongBreak = pomodoroCount % (app.globalData.settings.longBreakInterval || 4) === 0
    const recommendedBreak = isLongBreak
      ? (app.globalData.settings.longBreak || 15)
      : (app.globalData.settings.shortBreak || 5)

    this.setData({
      showCompletionModal: false,
      showBreakSelector: true,
      customBreakDuration: recommendedBreak
    })
  },

  // 关闭休息时长选择器
  onCloseBreakSelector() {
    this.setData({
      showBreakSelector: false
    })
    // 关闭后重置计时器
    this.resetTimer()
    this.clearTimerState()
  },

  // 选择休息时长
  onSelectBreakDuration(e) {
    const duration = parseInt(e.currentTarget.dataset.duration)
    this.setData({
      customBreakDuration: duration
    })
  },

  // 确认开始休息
  onConfirmBreak() {
    this.setData({ showBreakSelector: false })
    const breakDuration = this.data.customBreakDuration
    const totalSeconds = breakDuration * 60

    this.setData({
      timerState: 'break',
      totalSeconds: totalSeconds,
      remainingSeconds: totalSeconds,
      pomodoroCount: this.data.pomodoroCount + 1
    })

    this.startTimer()
  },

  // 从选择器跳过休息
  onSkipBreakFromSelector() {
    this.setData({ showBreakSelector: false })
    this.resetTimer()
    this.clearTimerState()
  },

  // 休息一下（旧方法，保留兼容性）
  onTakeBreak() {
    this.onShowBreakSelector()
  },

  // 检查是否首次使用
  checkFirstTimeUser() {
    const { userDB } = require('../../utils/db.js')

    // 检查是否已经显示过欢迎提示
    const hasShownWelcome = wx.getStorageSync('hasShownWelcome')
    if (hasShownWelcome) return

    // 检查用户是否已设置信息
    userDB.get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0]
        if (!user.nickName || !user.avatarUrl) {
          // 用户未设置信息，显示欢迎引导弹窗
          setTimeout(() => {
            this.setData({ showWelcomeModal: true })
          }, 800)
        }
      }
    }).catch(err => {
      console.error('检查用户信息失败', err)
    })
  },

  // 选择头像
  onWelcomeChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({
      tempAvatar: avatarUrl
    })
  },

  // 输入昵称
  onWelcomeNicknameInput(e) {
    this.setData({
      tempNickname: e.detail.value
    })
  },

  // 完成设置
  onCompleteWelcome() {
    const { tempNickname, tempAvatar } = this.data
    const { showToast, showLoading, hideLoading } = require('../../utils/util.js')
    const { userDB } = require('../../utils/db.js')

    if (!tempNickname.trim()) {
      showToast('请输入昵称')
      return
    }

    showLoading('设置中...')

    userDB.update({
      nickName: tempNickname,
      avatarUrl: tempAvatar
    }).then(() => {
      hideLoading()
      showToast('设置成功', 'success')

      this.setData({
        showWelcomeModal: false,
        tempNickname: '',
        tempAvatar: ''
      })

      // 标记已显示过欢迎提示
      wx.setStorageSync('hasShownWelcome', true)
    }).catch(err => {
      hideLoading()
      console.error('保存失败', err)
      showToast('设置失败，请稍后重试')
    })
  },

  // 跳过设置
  onSkipWelcome() {
    this.setData({ showWelcomeModal: false })
    wx.setStorageSync('hasShownWelcome', true)
  },

  // 分享给好友
  onShareAppMessage() {
    const shareInfo = getIndexShareInfo(this.data.todayStats)
    return {
      title: shareInfo.title,
      path: shareInfo.path,
      imageUrl: shareInfo.imageUrl
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const shareInfo = getTimelineShareInfo('daily', {
      totalPomodoros: this.data.todayStats.totalPomodoros,
      totalMinutes: this.data.todayStats.totalMinutes
    })
    return {
      title: shareInfo.title,
      query: shareInfo.query,
      imageUrl: shareInfo.imageUrl
    }
  }
})
