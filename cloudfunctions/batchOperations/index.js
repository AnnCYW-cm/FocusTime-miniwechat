// 云函数：batchOperations
// 用于批量操作任务、番茄记录等
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
    const { operation, data } = event

    switch (operation) {
      case 'batchDeleteTasks':
        // 批量删除任务
        return await batchDeleteTasks(openid, data.taskIds)

      case 'batchCompleteTasks':
        // 批量完成任务
        return await batchCompleteTasks(openid, data.taskIds)

      case 'batchUpdateTaskPriority':
        // 批量更新任务优先级
        return await batchUpdateTaskPriority(openid, data.taskIds, data.priority)

      case 'batchUpdateTaskStatus':
        // 批量更新任务状态
        return await batchUpdateTaskStatus(openid, data.taskIds, data.status)

      case 'cleanupCompletedTasks':
        // 清理已完成的任务（可选保留最近N天的）
        return await cleanupCompletedTasks(openid, data.daysToKeep)

      case 'cleanupOldPomodoros':
        // 清理旧的番茄记录
        return await cleanupOldPomodoros(openid, data.daysToKeep)

      default:
        return {
          success: false,
          message: '无效的操作类型'
        }
    }
  } catch (err) {
    console.error('批量操作失败', err)
    return {
      success: false,
      message: '批量操作失败',
      error: err.message
    }
  }
}

// 批量删除任务
async function batchDeleteTasks(openid, taskIds) {
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return {
      success: false,
      message: '任务ID列表不能为空'
    }
  }

  // 验证任务所有权并删除
  const tasks = await db.collection('tasks')
    .where({
      _openid: openid,
      _id: _.in(taskIds)
    })
    .get()

  if (tasks.data.length === 0) {
    return {
      success: false,
      message: '没有找到可删除的任务'
    }
  }

  // 执行批量删除
  const deletePromises = tasks.data.map(task =>
    db.collection('tasks').doc(task._id).remove()
  )

  await Promise.all(deletePromises)

  return {
    success: true,
    message: `成功删除 ${tasks.data.length} 个任务`,
    deletedCount: tasks.data.length
  }
}

// 批量完成任务
async function batchCompleteTasks(openid, taskIds) {
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return {
      success: false,
      message: '任务ID列表不能为空'
    }
  }

  const tasks = await db.collection('tasks')
    .where({
      _openid: openid,
      _id: _.in(taskIds),
      status: _.neq('completed')
    })
    .get()

  if (tasks.data.length === 0) {
    return {
      success: false,
      message: '没有找到可完成的任务'
    }
  }

  // 执行批量更新
  const updatePromises = tasks.data.map(task =>
    db.collection('tasks').doc(task._id).update({
      data: {
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      }
    })
  )

  await Promise.all(updatePromises)

  return {
    success: true,
    message: `成功完成 ${tasks.data.length} 个任务`,
    updatedCount: tasks.data.length
  }
}

// 批量更新任务优先级
async function batchUpdateTaskPriority(openid, taskIds, priority) {
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return {
      success: false,
      message: '任务ID列表不能为空'
    }
  }

  if (!['high', 'medium', 'low'].includes(priority)) {
    return {
      success: false,
      message: '无效的优先级'
    }
  }

  const tasks = await db.collection('tasks')
    .where({
      _openid: openid,
      _id: _.in(taskIds)
    })
    .get()

  if (tasks.data.length === 0) {
    return {
      success: false,
      message: '没有找到可更新的任务'
    }
  }

  const updatePromises = tasks.data.map(task =>
    db.collection('tasks').doc(task._id).update({
      data: {
        priority: priority,
        updatedAt: new Date()
      }
    })
  )

  await Promise.all(updatePromises)

  return {
    success: true,
    message: `成功更新 ${tasks.data.length} 个任务的优先级`,
    updatedCount: tasks.data.length
  }
}

// 批量更新任务状态
async function batchUpdateTaskStatus(openid, taskIds, status) {
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return {
      success: false,
      message: '任务ID列表不能为空'
    }
  }

  if (!['pending', 'in_progress', 'completed'].includes(status)) {
    return {
      success: false,
      message: '无效的状态'
    }
  }

  const tasks = await db.collection('tasks')
    .where({
      _openid: openid,
      _id: _.in(taskIds)
    })
    .get()

  if (tasks.data.length === 0) {
    return {
      success: false,
      message: '没有找到可更新的任务'
    }
  }

  const updateData = {
    status: status,
    updatedAt: new Date()
  }

  if (status === 'completed') {
    updateData.completedAt = new Date()
  }

  const updatePromises = tasks.data.map(task =>
    db.collection('tasks').doc(task._id).update({
      data: updateData
    })
  )

  await Promise.all(updatePromises)

  return {
    success: true,
    message: `成功更新 ${tasks.data.length} 个任务的状态`,
    updatedCount: tasks.data.length
  }
}

// 清理已完成的任务（保留最近N天的）
async function cleanupCompletedTasks(openid, daysToKeep = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const tasks = await db.collection('tasks')
    .where({
      _openid: openid,
      status: 'completed',
      completedAt: _.lt(cutoffDate)
    })
    .get()

  if (tasks.data.length === 0) {
    return {
      success: true,
      message: '没有需要清理的任务',
      deletedCount: 0
    }
  }

  const deletePromises = tasks.data.map(task =>
    db.collection('tasks').doc(task._id).remove()
  )

  await Promise.all(deletePromises)

  return {
    success: true,
    message: `成功清理 ${tasks.data.length} 个已完成的旧任务`,
    deletedCount: tasks.data.length
  }
}

// 清理旧的番茄记录
async function cleanupOldPomodoros(openid, daysToKeep = 90) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const pomodoros = await db.collection('pomodoro_logs')
    .where({
      _openid: openid,
      startedAt: _.lt(cutoffDate)
    })
    .get()

  if (pomodoros.data.length === 0) {
    return {
      success: true,
      message: '没有需要清理的番茄记录',
      deletedCount: 0
    }
  }

  const deletePromises = pomodoros.data.map(log =>
    db.collection('pomodoro_logs').doc(log._id).remove()
  )

  await Promise.all(deletePromises)

  return {
    success: true,
    message: `成功清理 ${pomodoros.data.length} 条旧番茄记录`,
    deletedCount: pomodoros.data.length
  }
}
