# 云数据库权限配置指南

## 数据库集合列表

### 1. users（用户信息）
**权限设置**：仅创建者可读写

```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

**字段说明**：
- `_id`: 自动生成的文档ID
- `_openid`: 用户的OpenID（自动添加）
- `nickName`: 用户昵称
- `avatarUrl`: 用户头像
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

---

### 2. tasks（任务列表）
**权限设置**：仅创建者可读写

```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

**字段说明**：
- `_id`: 任务ID
- `_openid`: 用户OpenID
- `title`: 任务标题（必填，最大100字符）
- `description`: 任务描述（可选，最大500字符）
- `priority`: 优先级（high/medium/low）
- `status`: 任务状态（pending/in_progress/completed）
- `tags`: 标签数组（最多10个）
- `pomodoroTarget`: 目标番茄数（1-100）
- `pomodoroCompleted`: 已完成番茄数
- `dueDate`: 截止日期
- `createdAt`: 创建时间
- `updatedAt`: 更新时间
- `completedAt`: 完成时间

**索引建议**：
- `_openid` + `status`（复合索引）
- `_openid` + `createdAt`（复合索引）

---

### 3. pomodoro_logs（番茄记录）
**权限设置**：仅创建者可读写

```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

**字段说明**：
- `_id`: 记录ID
- `_openid`: 用户OpenID
- `taskId`: 关联的任务ID（可为空，表示独立番茄）
- `taskTitle`: 任务标题（冗余存储，方便查询）
- `duration`: 专注时长（分钟）
- `startedAt`: 开始时间
- `endedAt`: 结束时间
- `isCompleted`: 是否完成
- `note`: 备注

**索引建议**：
- `_openid` + `startedAt`（复合索引）
- `_openid` + `taskId`（复合索引）
- `_openid` + `isCompleted`（复合索引）

---

### 4. user_settings（用户设置）
**权限设置**：仅创建者可读写

```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

**字段说明**：
- `_id`: 设置ID
- `_openid`: 用户OpenID
- `pomodoroDuration`: 番茄时长（分钟，默认25）
- `shortBreak`: 短休息时长（分钟，默认5）
- `longBreak`: 长休息时长（分钟，默认15）
- `longBreakInterval`: 长休息间隔（默认4个番茄后）
- `soundEnabled`: 是否开启声音
- `vibrationEnabled`: 是否开启震动
- `autoStartBreak`: 是否自动开始休息
- `autoStartPomodoro`: 是否自动开始下一个番茄
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

---

## 数据库配置步骤

### 1. 在微信开发者工具中
1. 点击左侧"云开发"按钮
2. 进入"数据库"标签
3. 点击"添加集合"

### 2. 创建集合并设置权限
对于每个集合：
1. 输入集合名称（如 `users`）
2. 点击"权限设置"
3. 选择"自定义安全规则"
4. 粘贴对应的权限配置JSON
5. 点击"保存"

### 3. 创建索引（可选但推荐）
在每个集合的"索引管理"中添加建议的索引，可以显著提高查询性能。

**创建复合索引示例**（tasks集合）：
```json
{
  "_openid": 1,
  "status": 1
}
```

---

## 安全注意事项

1. **永远不要使用"所有用户可读写"权限**
   - 这会导致数据泄露和被恶意修改

2. **使用 _openid 隔离用户数据**
   - 所有读写操作都应该检查 `doc._openid == auth.openid`

3. **敏感操作放在云函数中**
   - 批量操作、统计聚合等应该在云函数中处理
   - 云函数可以使用管理员权限，但要做好参数校验

4. **定期备份数据**
   - 使用导出云函数定期备份用户数据
   - 在云开发控制台也可以手动导出

---

## 性能优化建议

1. **使用索引**
   - 对常用查询字段建立索引
   - 复合索引比多个单字段索引更高效

2. **限制返回数量**
   - 使用 `.limit()` 限制查询结果
   - 避免一次性查询大量数据

3. **使用云函数进行聚合查询**
   - 复杂的统计查询应该在云函数中处理
   - 避免在小程序端做大量计算

4. **合理使用缓存**
   - 用户设置等不常变化的数据可以缓存到本地
   - 使用 `wx.setStorageSync` 缓存

---

## 数据迁移和备份

### 手动备份
```javascript
// 在小程序中调用
const { cloudFunctions } = require('./utils/db.js')

// 导出所有数据
cloudFunctions.exportData('all', 'json').then(result => {
  console.log('备份数据:', result.data)
  // 可以将数据保存到文件或发送到服务器
})
```

### 定时备份（云函数定时触发器）
可以在云开发控制台配置定时触发器，定期执行备份云函数。

---

## 数据清理

### 清理已完成的旧任务
```javascript
const { cloudFunctions } = require('./utils/db.js')

// 清理30天前完成的任务
cloudFunctions.batchOperation('cleanupCompletedTasks', {
  daysToKeep: 30
}).then(result => {
  console.log(result.message)
})
```

### 清理旧的番茄记录
```javascript
// 清理90天前的番茄记录
cloudFunctions.batchOperation('cleanupOldPomodoros', {
  daysToKeep: 90
}).then(result => {
  console.log(result.message)
})
```
