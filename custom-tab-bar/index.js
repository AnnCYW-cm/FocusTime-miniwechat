Component({
  data: {
    selected: 0,
    color: "#7F8C8D",
    selectedColor: "#4ECDC4",
    list: [
      {
        pagePath: "/pages/index/index",
        icon: "🍅",
        text: "首页"
      },
      {
        pagePath: "/pages/history/history",
        icon: "📝",
        text: "历史"
      },
      {
        pagePath: "/pages/statistics/statistics",
        icon: "📊",
        text: "统计"
      },
      {
        pagePath: "/pages/profile/profile",
        icon: "👤",
        text: "我的"
      }
    ]
  },

  attached() {
    // 获取当前页面路径，设置选中状态
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const url = currentPage.route
    const index = this.data.list.findIndex(item => item.pagePath === `/${url}`)

    this.setData({
      selected: index !== -1 ? index : 0
    })
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path

      wx.switchTab({ url })
      this.setData({
        selected: data.index
      })
    }
  }
})
