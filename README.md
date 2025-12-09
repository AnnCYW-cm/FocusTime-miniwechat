# 🍅 番茄Todo - 微信小程序

一款结合任务管理与番茄钟的微信小程序，帮助你科学管理时间、提升专注力。

## ✨ 功能特性

### V1.0 MVP版本

- ✅ **微信登录** - 一键登录，数据云端同步
- ✅ **任务管理** - 创建、编辑、删除任务，支持优先级设置
- ✅ **番茄钟** - 倒计时、暂停、继续、放弃
- ✅ **任务绑定** - 番茄钟与任务深度关联
- ✅ **今日统计** - 实时查看今日番茄数、专注时长、完成任务数
- ✅ **历史记录** - 按日期查看番茄记录
- ✅ **数据统计** - 周统计图表、趋势分析
- ✅ **个性化设置** - 自定义番茄时长、震动和提示音

## 📁 项目结构

```
FocusTime/
├── app.js                    # 小程序主入口
├── app.json                  # 全局配置
├── app.wxss                  # 全局样式
├── project.config.json       # 项目配置
├── sitemap.json             # 站点地图配置
│
├── pages/                    # 页面目录
│   ├── index/               # 首页（番茄钟+任务列表）
│   ├── history/             # 历史记录页
│   ├── statistics/          # 统计页
│   ├── profile/             # 我的页面
│   ├── task-detail/         # 任务详情页
│   └── settings/            # 设置页
│
├── utils/                   # 工具函数
│   ├── util.js             # 通用工具函数
│   └── db.js               # 数据库操作封装
│
├── cloudfunctions/          # 云函数目录
│   └── login/              # 登录云函数
│
├── database/               # 数据库配置
│   └── db_init.json       # 数据库初始化配置
│
└── images/                 # 图片资源
    └── ICONS_README.md    # 图标说明文档
```

## 🚀 快速开始

### 1. 环境准备

- 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册[微信小程序账号](https://mp.weixin.qq.com/)
- 开通[微信云开发](https://cloud.weixin.qq.com/)

### 2. 项目配置

#### 2.1 修改项目配置

编辑 `project.config.json`，替换为你的小程序 AppID：

```json
{
  "appid": "your-appid",  // 替换为你的小程序 AppID
  ...
}
```

#### 2.2 配置云开发环境

编辑 `app.js`，替换云开发环境 ID：

```javascript
wx.cloud.init({
  env: 'your-env-id',  // 替换为你的云开发环境 ID
  traceUser: true,
})
```

### 3. 云开发配置

#### 3.1 创建云数据库集合

在微信开发者工具的「云开发」控制台中，创建以下集合：

- `users` - 用户信息
- `tasks` - 任务
- `pomodoro_logs` - 番茄记录
- `user_settings` - 用户设置

#### 3.2 配置数据库权限

为每个集合设置安全规则，确保用户只能访问自己的数据：

```json
{
  "read": "auth.openid == doc._openid",
  "write": "auth.openid == doc._openid"
}
```

详细配置参考 `database/db_init.json`

#### 3.3 部署云函数

1. 右键 `cloudfunctions/login` 目录
2. 选择「上传并部署：云端安装依赖」
3. 等待部署完成

### 4. 准备图标资源

根据 `images/ICONS_README.md` 的说明，准备所需的 Tab Bar 图标。

如果暂时没有图标，可以：
- 使用在线图标库下载
- 使用设计工具自己制作
- 或者暂时注释掉 `app.json` 中的 `tabBar.list[].iconPath` 配置

### 5. 运行项目

1. 使用微信开发者工具打开项目目录
2. 在工具中点击「编译」
3. 在模拟器或真机中预览

## 📊 数据库设计

### users 集合（用户信息）

| 字段 | 类型 | 说明 |
|-----|-----|------|
| _id | String | 文档ID |
| _openid | String | 微信openid |
| nickName | String | 用户昵称 |
| avatarUrl | String | 头像URL |
| createdAt | Date | 注册时间 |
| updatedAt | Date | 更新时间 |

### tasks 集合（任务）

| 字段 | 类型 | 说明 |
|-----|-----|------|
| _id | String | 文档ID |
| _openid | String | 所属用户 |
| title | String | 任务标题 |
| description | String | 任务描述 |
| priority | String | 优先级（high/medium/low） |
| status | String | 状态（pending/in_progress/completed） |
| pomodoroTarget | Number | 目标番茄数 |
| pomodoroCompleted | Number | 已完成番茄数 |
| dueDate | Date | 截止日期 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |
| completedAt | Date | 完成时间 |

### pomodoro_logs 集合（番茄记录）

| 字段 | 类型 | 说明 |
|-----|-----|------|
| _id | String | 文档ID |
| _openid | String | 所属用户 |
| taskId | String | 关联任务ID |
| taskTitle | String | 任务标题（冗余存储） |
| duration | Number | 时长（分钟） |
| startedAt | Date | 开始时间 |
| endedAt | Date | 结束时间 |
| isCompleted | Boolean | 是否完整完成 |

### user_settings 集合（用户设置）

| 字段 | 类型 | 默认值 | 说明 |
|-----|-----|-------|------|
| _openid | String | - | 用户标识 |
| pomodoroDuration | Number | 25 | 番茄时长（分钟） |
| shortBreak | Number | 5 | 短休息时长 |
| longBreak | Number | 15 | 长休息时长 |
| soundEnabled | Boolean | true | 提示音开关 |
| vibrationEnabled | Boolean | true | 震动开关 |

## 🎨 设计规范

### 颜色

- **主题色**: `#E74C3C`（番茄红）
- **背景色**: `#FDF6F0`（暖米色）
- **成功色**: `#27AE60`（完成绿）
- **文字色**:
  - 主文字 `#2C3E50`
  - 次文字 `#7F8C8D`

### 圆角

- 卡片: 16rpx
- 按钮: 24rpx

### 间距

- 页面边距: 32rpx
- 卡片间距: 24rpx

## 📝 开发注意事项

1. **云开发配置**: 确保正确配置云开发环境 ID
2. **数据库权限**: 必须配置安全规则，防止数据泄露
3. **图标资源**: 需要自行准备 Tab Bar 图标
4. **测试账号**: 开发阶段建议使用测试号
5. **真机调试**: 部分功能需要在真机上测试

## 🔧 常见问题

### Q1: 云函数调用失败？

**A**: 检查以下几点：
- 云函数是否正确部署
- 云开发环境 ID 是否正确
- 小程序是否有云开发权限

### Q2: 数据库无法访问？

**A**: 检查：
- 数据库集合是否创建
- 安全规则是否正确配置
- 用户是否已登录（有 openid）

### Q3: 图标不显示？

**A**:
- 检查图标文件路径是否正确
- 确保图标文件已上传到 `images/` 目录
- 或暂时注释掉 `app.json` 中的图标配置

## 📄 许可证

本项目基于 PRD V1.0 开发，仅供学习和参考使用。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，欢迎联系。

---

**版本**: V1.0 MVP
**更新日期**: 2024年12月
