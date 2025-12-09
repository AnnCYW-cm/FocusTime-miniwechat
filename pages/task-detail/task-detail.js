// pages/task-detail/task-detail.js
const { showToast, showLoading, hideLoading } = require('../../utils/util.js')
const { taskDB } = require('../../utils/db.js')
const { getTaskShareInfo } = require('../../utils/share.js')

Page({
  data: {
    isEdit: false,
    taskId: '',
    fromSelector: false,
    loadError: false,
    errorMessage: '',
    formData: {
      title: '',
      description: '',
      priority: 'medium',
      pomodoroTarget: 1,
      dueDate: ''
    }
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true, taskId: options.id })
      this.loadTask(options.id)
    }
    if (options.fromSelector === 'true') {
      this.setData({ fromSelector: true })
    }
  },

  // 加载任务详情
  loadTask(id) {
    showLoading('加载中...')

    // 先清除之前的错误状态
    this.setData({
      loadError: false,
      errorMessage: ''
    })

    taskDB.get(id).then(res => {
      console.log('✅ [加载任务] 返回数据:', res)

      if (res.data) {
        const task = res.data
        console.log('✅ [加载任务] 任务数据:', task)

        this.setData({
          formData: {
            title: task.title || '',
            description: task.description || '',
            priority: task.priority || 'medium',
            pomodoroTarget: task.pomodoroTarget || 1,
            dueDate: task.dueDate ? task.dueDate.split('T')[0] : ''
          },
          loadError: false
        })
        hideLoading()
      } else {
        hideLoading()
        console.error('❌ [加载任务] 任务数据为空:', res)

        this.setData({
          loadError: true,
          errorMessage: '任务不存在或已被删除'
        })

        wx.showModal({
          title: '加载失败',
          content: '任务不存在或已被删除，是否返回上一页？',
          confirmText: '返回',
          cancelText: '留在此页',
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.navigateBack()
            }
          }
        })
      }
    }).catch(err => {
      hideLoading()
      console.error('❌ [加载任务] 失败 - 详细错误:', err)
      console.error('错误对象:', JSON.stringify(err))

      // 根据错误类型给出更具体的提示
      let errorMsg = '数据库连接失败'
      let detailMsg = ''

      if (err.errMsg) {
        if (err.errMsg.includes('permission')) {
          errorMsg = '数据库权限配置错误'
          detailMsg = '请在云开发控制台配置 tasks 集合的读写权限\n\n权限规则：\n{"read": "doc._openid == auth.openid", "write": "doc._openid == auth.openid"}'
        } else if (err.errMsg.includes('collection') && err.errMsg.includes('not found')) {
          errorMsg = '数据库集合不存在'
          detailMsg = '请在云开发控制台创建 tasks 集合'
        } else if (err.errMsg.includes('env')) {
          errorMsg = '云开发环境未初始化'
          detailMsg = '请检查云开发环境ID是否正确'
        } else {
          detailMsg = err.errMsg
        }
      }

      this.setData({
        loadError: true,
        errorMessage: errorMsg
      })

      wx.showModal({
        title: `❌ ${errorMsg}`,
        content: detailMsg || '请查看控制台获取详细错误信息',
        showCancel: true,
        confirmText: '返回',
        cancelText: '重试',
        success: (modalRes) => {
          if (modalRes.confirm) {
            wx.navigateBack()
          } else if (modalRes.cancel) {
            // 重试加载
            this.loadTask(id)
          }
        }
      })
    })
  },

  // 重试加载
  onRetryLoad() {
    if (this.data.taskId) {
      this.loadTask(this.data.taskId)
    }
  },

  // 标题输入
  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    })
  },


  // 优先级选择
  onPriorityChange(e) {
    const priority = e.currentTarget.dataset.priority
    this.setData({
      'formData.priority': priority
    })
  },

  // 番茄数减少
  onPomodoroDecrease() {
    if (this.data.formData.pomodoroTarget > 1) {
      this.setData({
        'formData.pomodoroTarget': this.data.formData.pomodoroTarget - 1
      })
    }
  },

  // 番茄数增加
  onPomodoroIncrease() {
    this.setData({
      'formData.pomodoroTarget': this.data.formData.pomodoroTarget + 1
    })
  },

  // 截止日期选择
  onDueDateChange(e) {
    this.setData({
      'formData.dueDate': e.detail.value
    })
  },

  // 保存
  onSave() {
    const { title, description, priority, pomodoroTarget, dueDate } = this.data.formData

    // 表单验证
    if (!title.trim()) {
      showToast('请输入任务标题')
      return
    }

    showLoading('保存中...')

    // 直接保存，不检查重名（个人应用无需此限制）
    const data = {
      title: title.trim(),
      description: description.trim(),
      priority,
      pomodoroTarget,
      dueDate: dueDate ? new Date(dueDate) : null
    }

    const promise = this.data.isEdit
      ? taskDB.update(this.data.taskId, data)
      : taskDB.create(data)

    promise.then((res) => {
      hideLoading()
      showToast(this.data.isEdit ? '保存成功' : '创建成功', 'success')

      // 如果是从任务选择器创建的新任务，自动开始番茄钟
      if (!this.data.isEdit && this.data.fromSelector) {
        setTimeout(() => {
          // 获取新创建的任务
          taskDB.get(res._id).then(taskRes => {
            if (taskRes.data) {
              // 获取首页实例
              const pages = getCurrentPages()
              const indexPage = pages[pages.length - 2] // 上一个页面（首页）

              if (indexPage && indexPage.startPomodoroWithTask) {
                // 调用首页的方法自动开始番茄钟
                indexPage.startPomodoroWithTask(taskRes.data)
              }
            }
            wx.navigateBack()
          })
        }, 800)
      } else {
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    }).catch(err => {
      hideLoading()
      console.error('❌ 保存失败 - 详细错误:', err)
      console.error('错误对象:', JSON.stringify(err))

      // 根据错误类型给出具体提示
      let errorMsg = '保存失败'
      if (err.errMsg && err.errMsg.includes('permission')) {
        errorMsg = '没有权限，请检查数据库权限配置'
      }

      showToast(errorMsg)
    })
  },

  // 取消
  onCancel() {
    wx.navigateBack()
  },

  // 分享给好友
  onShareAppMessage() {
    const shareInfo = getTaskShareInfo(this.data.formData)
    return {
      title: shareInfo.title,
      path: shareInfo.path,
      imageUrl: shareInfo.imageUrl
    }
  }
})
