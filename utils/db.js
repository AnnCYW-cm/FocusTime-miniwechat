// 数据库操作封装
// 包含错误处理、数据校验等完善功能

const db = wx.cloud.database()
const _ = db.command

// 统一错误处理
const handleError = (operation, error) => {
  console.error(`${operation} 失败:`, error)
  return Promise.reject({
    operation,
    message: error.errMsg || error.message || '操作失败',
    code: error.errCode || -1,
    details: error
  })
}

// 数据校验辅助函数
const validators = {
  // 校验任务标题
  validateTitle: (title) => {
    if (!title || typeof title !== 'string') {
      throw new Error('任务标题不能为空')
    }
    if (title.trim().length === 0) {
      throw new Error('任务标题不能为空')
    }
    if (title.length > 100) {
      throw new Error('任务标题不能超过100个字符')
    }
    return title.trim()
  },

  // 校验优先级
  validatePriority: (priority) => {
    const validPriorities = ['high', 'medium', 'low']
    if (!validPriorities.includes(priority)) {
      throw new Error('无效的优先级')
    }
    return priority
  },

  // 校验番茄目标数
  validatePomodoroTarget: (target) => {
    const num = parseInt(target)
    if (isNaN(num) || num < 1) {
      throw new Error('番茄目标数必须大于0')
    }
    if (num > 100) {
      throw new Error('番茄目标数不能超过100')
    }
    return num
  },

  // 校验任务状态
  validateStatus: (status) => {
    const validStatuses = ['pending', 'in_progress', 'completed']
    if (!validStatuses.includes(status)) {
      throw new Error('无效的任务状态')
    }
    return status
  }
}

/**
 * 任务相关数据库操作
 */
const taskDB = {
  // 获取任务列表
  list: (filter = {}) => {
    const app = getApp()
    const openid = app.globalData.openid

    if (!openid) {
      return handleError('获取任务列表', new Error('用户未登录'))
    }

    // 构建查询条件，始终包含 _openid 过滤
    const whereCondition = { _openid: openid }

    // 状态筛选
    if (filter.status) {
      whereCondition.status = filter.status
    }

    let query = db.collection('tasks').where(whereCondition)

    // 排序
    const orderBy = filter.orderBy || 'createdAt'
    const order = filter.order || 'desc'

    return query.orderBy(orderBy, order).get()
      .catch(err => handleError('获取任务列表', err))
  },

  // 获取单个任务
  get: (id) => {
    if (!id || typeof id !== 'string') {
      return Promise.reject(new Error('任务ID无效'))
    }
    return db.collection('tasks').doc(id).get()
      .then(res => {
        console.log('[taskDB.get] 查询结果:', res)
        if (!res.data) {
          console.warn('[taskDB.get] 未找到任务，ID:', id)
        }
        return res
      })
      .catch(err => {
        console.error('[taskDB.get] 查询失败，ID:', id, '错误:', err)
        return handleError('获取任务', err)
      })
  },

  // 创建任务
  create: (data) => {
    try {
      // 数据校验
      const validatedTitle = validators.validateTitle(data.title)
      const validatedPriority = validators.validatePriority(data.priority || 'medium')
      const validatedTarget = validators.validatePomodoroTarget(data.pomodoroTarget || 1)

      return db.collection('tasks').add({
        data: {
          title: validatedTitle,
          description: (data.description || '').trim().substring(0, 500),
          priority: validatedPriority,
          tags: Array.isArray(data.tags) ? data.tags.slice(0, 10) : [],
          status: 'pending',
          pomodoroTarget: validatedTarget,
          pomodoroCompleted: 0,
          dueDate: data.dueDate || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null
        }
      }).catch(err => handleError('创建任务', err))
    } catch (err) {
      return handleError('创建任务', err)
    }
  },

  // 更新任务
  update: (id, data) => {
    try {
      if (!id) {
        throw new Error('任务ID不能为空')
      }

      const updateData = { updatedAt: new Date() }

      // 只校验和更新提供的字段
      if (data.title !== undefined) {
        updateData.title = validators.validateTitle(data.title)
      }
      if (data.priority !== undefined) {
        updateData.priority = validators.validatePriority(data.priority)
      }
      if (data.pomodoroTarget !== undefined) {
        updateData.pomodoroTarget = validators.validatePomodoroTarget(data.pomodoroTarget)
      }
      if (data.description !== undefined) {
        updateData.description = (data.description || '').trim().substring(0, 500)
      }
      if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate
      }
      if (data.tags !== undefined && Array.isArray(data.tags)) {
        updateData.tags = data.tags.slice(0, 10)
      }

      return db.collection('tasks').doc(id).update({
        data: updateData
      }).catch(err => handleError('更新任务', err))
    } catch (err) {
      return handleError('更新任务', err)
    }
  },

  // 删除任务
  delete: (id) => {
    if (!id) {
      return handleError('删除任务', new Error('任务ID不能为空'))
    }

    const app = getApp()
    const openid = app.globalData.openid

    if (!openid) {
      return handleError('删除任务', new Error('用户未登录'))
    }

    // 先验证任务是否存在且属于当前用户
    return db.collection('tasks').doc(id).get()
      .then(res => {
        if (!res.data) {
          throw new Error('任务不存在')
        }
        if (res.data._openid !== openid) {
          throw new Error('无权删除此任务')
        }
        // 验证通过，执行删除
        return db.collection('tasks').doc(id).remove()
      })
      .catch(err => handleError('删除任务', err))
  },

  // 完成任务
  complete: (id) => {
    return db.collection('tasks').doc(id).update({
      data: {
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      }
    })
  },

  // 撤销完成
  uncomplete: (id, originalStatus = 'in_progress') => {
    return db.collection('tasks').doc(id).update({
      data: {
        status: originalStatus,
        completedAt: null,
        updatedAt: new Date()
      }
    })
  },

  // 更新任务状态为进行中（首次启动番茄时）
  startProgress: (id) => {
    return db.collection('tasks').doc(id).update({
      data: {
        status: 'in_progress',
        updatedAt: new Date()
      }
    })
  },

  // 增加完成番茄数
  incrementPomodoro: (id) => {
    return db.collection('tasks').doc(id).update({
      data: {
        pomodoroCompleted: _.inc(1),
        updatedAt: new Date()
      }
    })
  }
}

/**
 * 番茄记录相关数据库操作
 */
const pomodoroLogDB = {
  // 获取番茄记录列表
  list: (filter = {}) => {
    const app = getApp()
    const openid = app.globalData.openid

    if (!openid) {
      return handleError('获取番茄记录', new Error('用户未登录'))
    }

    // 构建查询条件，始终包含 _openid 过滤
    const whereCondition = { _openid: openid }

    // 日期筛选
    if (filter.startDate && filter.endDate) {
      whereCondition.startedAt = _.gte(filter.startDate).and(_.lte(filter.endDate))
    }

    // 任务筛选
    if (filter.taskId) {
      whereCondition.taskId = filter.taskId
    }

    return db.collection('pomodoro_logs')
      .where(whereCondition)
      .orderBy('startedAt', 'desc')
      .get()
      .catch(err => handleError('获取番茄记录', err))
  },

  // 创建番茄记录
  create: (data) => {
    return db.collection('pomodoro_logs').add({
      data: {
        taskId: data.taskId || null,
        taskTitle: data.taskTitle || '',
        duration: data.duration,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        isCompleted: true,
        note: data.note || ''
      }
    })
  },

  // 获取今日统计
  getTodayStats: (todayStart, todayEnd) => {
    const app = getApp()
    const openid = app.globalData.openid

    if (!openid) {
      return handleError('获取今日统计', new Error('用户未登录'))
    }

    return db.collection('pomodoro_logs').where({
      _openid: openid,
      startedAt: _.gte(todayStart).and(_.lte(todayEnd)),
      isCompleted: true
    }).get()
      .catch(err => handleError('获取今日统计', err))
  }
}

/**
 * 用户设置相关数据库操作
 */
const settingsDB = {
  // 获取用户设置
  get: () => {
    const app = getApp()
    const openid = app.globalData.openid

    if (!openid) {
      return handleError('获取用户设置', new Error('用户未登录'))
    }

    return db.collection('user_settings')
      .where({ _openid: openid })
      .limit(1)
      .get()
      .catch(err => handleError('获取用户设置', err))
  },

  // 更新用户设置
  update: (data) => {
    const app = getApp()
    const openid = app.globalData.openid

    if (!openid) {
      return handleError('更新用户设置', new Error('用户未登录'))
    }

    // 过滤掉系统字段，只保留设置字段
    const cleanData = {}
    const systemFields = ['_id', '_openid', 'createdAt', 'updatedAt']
    for (const key in data) {
      if (!systemFields.includes(key)) {
        cleanData[key] = data[key]
      }
    }

    return db.collection('user_settings')
      .where({ _openid: openid })
      .limit(1)
      .get()
      .then(res => {
        if (res.data.length > 0) {
          const id = res.data[0]._id
          return db.collection('user_settings').doc(id).update({
            data: {
              ...cleanData,
              updatedAt: new Date()
            }
          })
        } else {
          // 创建新设置
          return db.collection('user_settings').add({
            data: {
              ...cleanData,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        }
      })
      .catch(err => handleError('更新用户设置', err))
  }
}

/**
 * 用户信息相关数据库操作
 */
const userDB = {
  // 获取用户信息
  get: () => {
    const app = getApp()
    const openid = app.globalData.openid

    if (!openid) {
      return handleError('获取用户信息', new Error('用户未登录'))
    }

    return db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()
      .catch(err => handleError('获取用户信息', err))
  },

  // 更新用户信息
  update: (data) => {
    const app = getApp()
    const openid = app.globalData.openid

    if (!openid) {
      return handleError('更新用户信息', new Error('用户未登录'))
    }

    // 过滤掉系统字段，只保留用户字段
    const cleanData = {}
    const systemFields = ['_id', '_openid', 'createdAt', 'updatedAt']
    for (const key in data) {
      if (!systemFields.includes(key)) {
        cleanData[key] = data[key]
      }
    }

    return db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()
      .then(res => {
        if (res.data.length > 0) {
          const id = res.data[0]._id
          return db.collection('users').doc(id).update({
            data: {
              ...cleanData,
              updatedAt: new Date()
            }
          })
        } else {
          throw new Error('用户信息不存在')
        }
      })
      .catch(err => handleError('更新用户信息', err))
  },

  // 获取累计统计数据
  getCumulativeStats: () => {
    const app = getApp()
    const openid = app.globalData.openid

    if (!openid) {
      return handleError('获取累计统计', new Error('用户未登录'))
    }

    const promises = []

    // 总番茄数和总时长
    promises.push(
      db.collection('pomodoro_logs').where({
        _openid: openid,
        isCompleted: true
      }).get()
    )

    // 总完成任务数
    promises.push(
      db.collection('tasks').where({
        _openid: openid,
        status: 'completed'
      }).count()
    )

    return Promise.all(promises)
      .catch(err => handleError('获取累计统计', err))
  }
}

/**
 * 云函数调用封装
 */
const cloudFunctions = {
  // 调用统计云函数
  getStatistics: (type, options = {}) => {
    return wx.cloud.callFunction({
      name: 'statistics',
      data: {
        type,
        ...options
      }
    }).then(res => {
      if (res.result.success) {
        return res.result
      } else {
        throw new Error(res.result.message || '统计数据获取失败')
      }
    }).catch(err => handleError('获取统计数据', err))
  },

  // 导出数据
  exportData: (type, format = 'json') => {
    return wx.cloud.callFunction({
      name: 'exportData',
      data: {
        type,
        format
      }
    }).then(res => {
      if (res.result.success) {
        return res.result
      } else {
        throw new Error(res.result.message || '数据导出失败')
      }
    }).catch(err => handleError('导出数据', err))
  },

  // 批量操作
  batchOperation: (operation, data) => {
    return wx.cloud.callFunction({
      name: 'batchOperations',
      data: {
        operation,
        data
      }
    }).then(res => {
      if (res.result.success) {
        return res.result
      } else {
        throw new Error(res.result.message || '批量操作失败')
      }
    }).catch(err => handleError('批量操作', err))
  }
}

module.exports = {
  db,
  taskDB,
  pomodoroLogDB,
  settingsDB,
  userDB,
  cloudFunctions,
  validators
}
