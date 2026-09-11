# 主页布局

主页采用纯黑背景、常规字重，设置入口仅显示齿轮图标，无边框和背景填充。设置页面暂不实现，图标暂不绑定点击行为。

主页每次显示时通过 [system.file.list](https://iot.mi.com/vela/quickapp/zh/features/data/file.html) 枚举 `internal://mass/` 下的 TXT 文件，仅展示去掉扩展名的书名，不读取正文。使用原生 `list` / `list-item`，每行 `80px`，书名最多两行，超长省略；列表项没有点击行为。空目录显示“暂无小说”，读取失败显示“读取失败”。不包含封面、阅读、删除、排序或搜索功能。

按目标 `390 × 450` 布局，列表显式高度 `322px`，顶端间距 `8px`；空状态保留底部占位以居中。`internal://mass/` 是官方定义的应用私有 Mass URI，与生成器写入 `/data/quickapp/mass/com.cnbarrier.ebook/` 的物理映射仍待实机确认。[文件组织](https://iot.mi.com/vela/quickapp/zh/guide/framework/project-structure.html)、[列表组件](https://iot.mi.com/vela/quickapp/zh/components/container/list.html)。

## 安全区依据

核对日期：2026-09-11。

- [官方多屏设计](https://iot.mi.com/vela/quickapp/zh/guide/design/multi-screens.html)要求考虑屏幕边缘对显示完整性和交互的影响，将主体功能放在安全区域内。文中的安全区图示针对圆屏和胶囊屏，没有规定 Redmi Watch 4 的固定安全边距。
- [官方页面样式与布局](https://iot.mi.com/vela/quickapp/zh/guide/framework/style/page-style-and-layout.html)说明使用设计基准宽度进行尺寸缩放；本项目保留 `designWidth: 390`，使用页面内边距统一约束内容。

本项目暂采用四周 `32px` 内边距，这是针对目标矩形屏的设计选择，不是官方规定或设备返回的安全区数值。标题和设置图标均位于该区域内。顶栏与底部占位均为 `56px`，上下安全边距相同，使“暂无小说”保持全屏居中。设置图标为 `28px`，容器保留 `48 × 48px`。

构建只能验证编译和打包；圆角遮挡及触摸效果仍需在 Redmi Watch 4 实机确认。
