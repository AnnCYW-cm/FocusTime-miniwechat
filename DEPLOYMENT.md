# 番茄Todo 后端部署指南

## 目录结构

```
FocusTime/
├── cloudfunctions/              # 云函数目录
│   ├── login/                   # 登录云函数
│   │   ├── index.js
│   │   └── package.json
│   ├── statistics/              # 统计云函数（新增）
│   │   ├── index.js
│   │   └── package.json
│   ├── exportData/              # 数据导出云函数（新增）
│   │   ├── index.js
│   │   └── package.json
│   └── batchOperations/         # 批量操作云函数（新增）
│       ├── index.js
│       └── package.json
├── utils/
│   └── db.js                    # 数据库操作封装（已完善）
└── database_permissions.md      # 数据库权限配置文档
```

## 云函数部署步骤

### 1. 安装依赖并部署

在微信开发者工具中，右键点击每个云函数文件夹，选择"上传并部署：云端安装依赖"：

- ✅ `login` - 用户登录
- ✅ `statistics` - 统计数据  
- ✅ `exportData` - 数据导出
- ✅ `batchOperations` - 批量操作

### 2. 配置数据库权限

详见 `database_permissions.md`

### 3. 验证部署

查看小程序控制台是否有登录成功的日志。

## 云函数功能说明

详见完整文档...
