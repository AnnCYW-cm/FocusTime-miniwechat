# 番茄Todo 后端功能总览

## 📦 后端架构

### 技术栈
- **微信云开发**：提供云函数、云数据库、云存储能力
- **Node.js**：云函数运行环境
- **MongoDB**：云数据库（兼容MongoDB API）

### 核心组件
1. **云函数**（4个）- 处理复杂业务逻辑
2. **云数据库**（4个集合）- 存储用户数据
3. **前端封装**（utils/db.js）- 统一数据访问接口

---

## 🔧 云函数列表

### 1. login - 用户登录 ✅
**功能**：获取用户 openid 和 appid

**使用场景**：
- 小程序启动时自动调用
- 实现静默登录
- 获取用户唯一标识

**返回数据**：
```json
{
  "openid": "用户的openid",
  "appid": "小程序的appid",
  "unionid": "unionid（如果有）"
}
```

---

### 2. statistics - 统计数据 🆕
**功能**：提供多维度的数据统计和分析

**支持的统计类型**：

#### overview - 总览统计
返回用户的整体数据概览：
- 总番茄数
- 总专注时长
- 完成任务数
- 使用天数
- 日均番茄数
- 任务完成率

#### daily - 每日统计
返回指定日期范围内每天的数据：
- 每天的番茄数
- 每天的专注分钟数

#### weekly - 每周统计
返回指定日期范围内每周的数据：
- 每周的番茄数
- 每周的专注分钟数

#### monthly - 每月统计
返回指定日期范围内每月的数据：
- 每月的番茄数
- 每月的专注分钟数

#### taskAnalysis - 任务分析
返回任务相关的分析数据：
- 按优先级分布（高/中/低）
- 按状态分布（待开始/进行中/已完成）
- 平均每任务番茄数
- 独立番茄数（不绑定任务）

**使用示例**：
```javascript
const { cloudFunctions } = require('../../utils/db.js')

// 获取总览
cloudFunctions.getStatistics('overview')

// 获取1月份每日数据
cloudFunctions.getStatistics('daily', {
  startDate: '2024-01-01',
  endDate: '2024-01-31'
})
```

---

### 3. exportData - 数据导出 🆕
**功能**：导出用户数据，支持多种格式

**支持的导出类型**：

#### all - 导出所有数据
包含：用户信息、所有任务、所有番茄记录、用户设置

#### tasks - 导出任务数据
仅导出任务列表，包含所有字段

#### pomodoros - 导出番茄记录
仅导出番茄记录，包含开始/结束时间、时长等

#### statistics - 导出统计数据
导出汇总的统计数据

**支持的格式**：
- **JSON**：结构化数据，方便程序处理
- **CSV**：表格格式，可用Excel打开

**使用示例**：
```javascript
const { cloudFunctions } = require('../../utils/db.js')

// 导出所有数据（JSON）
cloudFunctions.exportData('all', 'json')

// 导出任务（CSV）
cloudFunctions.exportData('tasks', 'csv')
```

---

### 4. batchOperations - 批量操作 🆕
**功能**：批量处理任务和记录，提高效率

**支持的操作**：

#### batchDeleteTasks - 批量删除任务
删除多个指定的任务

#### batchCompleteTasks - 批量完成任务
将多个任务标记为已完成

#### batchUpdateTaskPriority - 批量更新优先级
更新多个任务的优先级

#### batchUpdateTaskStatus - 批量更新状态
更新多个任务的状态

#### cleanupCompletedTasks - 清理已完成任务
删除N天前已完成的任务，节省存储空间

#### cleanupOldPomodoros - 清理旧番茄记录
删除N天前的番茄记录

**使用示例**：
```javascript
const { cloudFunctions } = require('../../utils/db.js')

// 批量完成任务
cloudFunctions.batchOperation('batchCompleteTasks', {
  taskIds: ['id1', 'id2', 'id3']
})

// 清理30天前完成的任务
cloudFunctions.batchOperation('cleanupCompletedTasks', {
  daysToKeep: 30
})
```

---

## 🗄️ 数据库集合

### 1. users - 用户信息
存储用户的基本信息：
- 昵称、头像
- 注册时间、更新时间

**权限**：仅创建者可读写

---

### 2. tasks - 任务列表
存储用户的所有任务：
- 标题、描述、优先级
- 状态、目标番茄数、已完成番茄数
- 截止日期、标签
- 创建/更新/完成时间

**权限**：仅创建者可读写

**索引**：
- `_openid + status`
- `_openid + createdAt`

---

### 3. pomodoro_logs - 番茄记录
存储用户的所有番茄记录：
- 关联的任务ID和标题
- 开始时间、结束时间、时长
- 是否完成、备注

**权限**：仅创建者可读写

**索引**：
- `_openid + startedAt`
- `_openid + taskId`

---

### 4. user_settings - 用户设置
存储用户的个性化设置：
- 番茄时长、休息时长
- 声音、震动开关
- 自动开始选项

**权限**：仅创建者可读写

---

## 💻 前端数据库封装（utils/db.js）

### 改进内容

#### 1. 统一错误处理 ✅
所有数据库操作失败时，返回统一格式的错误：
```javascript
{
  operation: '操作名称',
  message: '错误信息',
  code: 错误代码,
  details: 详细错误对象
}
```

#### 2. 数据校验 ✅
提供多个校验函数：
- `validateTitle` - 校验任务标题（必填，1-100字符）
- `validatePriority` - 校验优先级（high/medium/low）
- `validatePomodoroTarget` - 校验番茄目标（1-100）
- `validateStatus` - 校验任务状态

#### 3. 自动数据清洗 ✅
- 自动 trim 字符串
- 限制字段长度（标题100，描述500）
- 限制数组长度（最多10个标签）

#### 4. 云函数封装 ✅
提供统一的云函数调用接口：
```javascript
const { cloudFunctions } = require('../../utils/db.js')

cloudFunctions.getStatistics(type, options)
cloudFunctions.exportData(type, format)
cloudFunctions.batchOperation(operation, data)
```

### 使用示例

#### 创建任务（自动校验）
```javascript
const { taskDB } = require('../../utils/db.js')

taskDB.create({
  title: '学习 Vue',
  description: '完成 Vue3 教程',
  priority: 'high',
  pomodoroTarget: 4
}).then(res => {
  console.log('创建成功')
}).catch(err => {
  // 统一格式的错误
  console.error(err.message)
})
```

#### 更新任务（只更新提供的字段）
```javascript
taskDB.update(taskId, {
  priority: 'high',
  description: '新的描述'
})
// 只会更新 priority 和 description，其他字段不变
```

#### 获取统计数据
```javascript
const { cloudFunctions } = require('../../utils/db.js')

cloudFunctions.getStatistics('overview').then(result => {
  console.log('总番茄数:', result.data.totalPomodoros)
  console.log('总时长:', result.data.totalHours)
  console.log('完成任务:', result.data.completedTasks)
})
```

---

## 🔒 安全性改进

### 1. 数据隔离 ✅
- 所有集合使用 `_openid` 进行用户数据隔离
- 权限设置为"仅创建者可读写"
- 云函数自动获取 `openid`，无法伪造

### 2. 数据校验 ✅
- 前端：`utils/db.js` 中的校验
- 云函数：参数校验和类型检查
- 防止无效数据写入数据库

### 3. 操作验证 ✅
- 批量操作前先验证所有权
- 只操作属于当前用户的数据
- 防止越权访问

---

## ⚡ 性能优化

### 1. 索引优化 ✅
- 为常用查询字段创建索引
- 使用复合索引优化复杂查询
- 显著提升查询速度

### 2. 云函数聚合 ✅
- 复杂统计在云端完成
- 减少网络传输
- 降低小程序端计算压力

### 3. 批量操作 ✅
- 一次调用处理多个任务
- 减少云函数调用次数
- 降低成本

### 4. 数据清理 ✅
- 定期清理旧数据
- 节省存储空间
- 保持数据库性能

---

## 📊 数据备份与恢复

### 备份方案

#### 1. 自动备份（推荐）
使用云函数定时触发器，定期调用 `exportData` 云函数：
- 每周备份一次
- 保存到云存储
- 保留最近4周的备份

#### 2. 手动备份
用户可在小程序中触发：
```javascript
cloudFunctions.exportData('all', 'json').then(result => {
  // 保存备份数据
  wx.cloud.uploadFile({
    cloudPath: `backup/${Date.now()}.json`,
    filePath: result.data
  })
})
```

### 恢复方案
- 从备份文件读取数据
- 使用批量操作导入
- 保持数据一致性

---

## 📈 监控和维护

### 1. 日志查看
- 云开发控制台 → 云函数 → 日志
- 查看调用记录和错误信息

### 2. 统计分析
- 云开发控制台 → 统计分析
- 查看读写次数、存储使用量

### 3. 定期清理
建议每月执行一次数据清理：
```javascript
// 清理3个月前的已完成任务
cloudFunctions.batchOperation('cleanupCompletedTasks', {
  daysToKeep: 90
})

// 清理6个月前的番茄记录
cloudFunctions.batchOperation('cleanupOldPomodoros', {
  daysToKeep: 180
})
```

---

## 💰 成本估算

### 免费额度（个人版）
- 数据库：2GB存储，5万次/天读，2.5万次/天写
- 云函数：1000次/天调用
- 云存储：5GB存储

### 预估使用量（单个活跃用户/天）
- 数据库读取：约50次（加载页面、查询任务等）
- 数据库写入：约20次（创建任务、记录番茄等）
- 云函数调用：约3次（登录、统计、批量操作）

### 可支持用户数
- 理论支持：500-1000个日活用户
- 实际建议：300-500个日活用户（预留冗余）

---

## 🚀 部署清单

### 必须完成
- [ ] 部署4个云函数（login、statistics、exportData、batchOperations）
- [ ] 创建4个数据库集合（users、tasks、pomodoro_logs、user_settings）
- [ ] 配置数据库权限（仅创建者可读写）
- [ ] 测试登录功能
- [ ] 测试数据库操作

### 推荐完成
- [ ] 创建数据库索引
- [ ] 配置云函数定时触发器（自动备份）
- [ ] 设置监控告警
- [ ] 准备数据迁移方案

### 可选完成
- [ ] 配置云存储（头像上传）
- [ ] 添加数据分析看板
- [ ] 实现数据导入功能

---

## 📚 相关文档

- [数据库权限配置](./database_permissions.md)
- [部署指南](./DEPLOYMENT.md)
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)

---

## 🎯 后续优化方向

1. **实时同步**：使用云开发数据库的实时推送能力
2. **离线支持**：本地缓存+同步策略
3. **数据分析**：更丰富的图表和洞察
4. **社交功能**：好友排行、任务分享
5. **AI 建议**：基于历史数据的智能推荐

---

## ⚠️ 注意事项

1. **不要暴露敏感信息**：
   - 不要在前端代码中硬编码密钥
   - 敏感操作放在云函数中

2. **做好错误处理**：
   - 所有数据库操作都要 catch 错误
   - 给用户友好的错误提示

3. **注意成本控制**：
   - 避免无限循环查询
   - 合理使用缓存
   - 定期清理不需要的数据

4. **保持数据一致性**：
   - 使用事务处理关联操作
   - 定期检查数据完整性

---

**版本**：V1.0 - 2024.12.08
**作者**：Claude Sonnet 4.5
