# 小说阅读页

书架点击书名进入 `pages/reader`。阅读页沿用主页顶栏的安全区设计：页面上下、左右均为 `8px` 内边距；顶栏和底栏均高 `56px`，左右内边距均为 `30px`，正文区域高 `322px`。黑底、20px 正文、40px 固定行高，原生 list 支持触摸平滑滚动，底栏只显示进度或状态，文本在底栏内居中。点击顶栏返回指示器会先保存进度，再返回书架；也可使用手表从左向右横划返回上一级。

## 文件和内存

- 支持直接读取 UTF-8（有／无 BOM）、UTF-16LE／BE（必须有 BOM），包括仓库打包器输出的 UTF-16LE + BOM TXT。无 BOM 默认严格 UTF-8；GBK／GB18030 和无 BOM UTF-16 请先转为 UTF-8，或通过 `npm run pack-book` 指定源编码转换。非法编码或截断字符给出明确提示，不猜测编码后显示乱码。
- 文件头最多读取 3 字节识别 BOM，按编码跳过 BOM；兼容 `Uint8Array` 和 `ArrayBuffer` 返回值。UTF-8 字节数可以是奇数，也支持单字符短文件。
- 每次 `readArrayBuffer` 都明确传入偏移和长度，单次上限 4096 字节；设备返回短读时在同一窗口内分段补齐，空读或临时 I/O 失败会有限重试。不读取整书，不建立整书行索引，不依赖 Node、TextDecoder 或额外解码库。
- 窗口保留锚点前最多 24 行、后最多 64 行，共最多 88 行正文。这些是代码的数据量上限，不是实测的 JS 堆或整机内存峰值。
- 每行最多 17 个 Unicode 码点（正文 `20px`）；处理代理对、CRLF/LF/CR、超长段落。英文采用相同保守断行，尚未实现按词排版、组合字符聚类或字体宽度测量。
- 靠近窗口边缘时，在 `scrollend` 后读取相邻窗口并按原行字节偏移及行内像素位置恢复。正常换窗会复用固定行槽位和 `tid`，避免原生列表整批重建；正文内滚动交给原生组件，无 JS 逐帧动画。换窗的原生事件时序与视觉连续性仍须真机检查，快速滚到窗口边缘可能等待 I/O。

## 阅读进度

每本书使用 URI 对应的 storage key，记录版本、编码、正文起点、文件长度、修改时间和首个可见行的字节偏移。新版记录版本为 2，并兼容旧版 UTF-16LE 阅读进度。重新打开恢复到该行顶部；不保存行内像素。编码、文件长度或修改时间变化、进度格式损坏时从头开始。同 URI、同编码、同大小、同修改时间的替换无法识别。

滚动停止约 1.5 秒后保存一次进度，避免连续滑动期间发起存储 I/O；页面隐藏、销毁或主动返回立即请求保存。写入串行执行，连续请求只保留待写的最新值，快速重开优先读取尚未完成的值。失败在底部显示“进度保存失败”，可点击重试。突然断电或进程被终止仍可能丢失尚未落盘的最后进度；不承诺异步生命周期写入一定完成。

## 表冠与设备验证边界

截至 2026-09-12，核对的官方 [list 文档](https://iot.mi.com/vela/quickapp/zh/components/container/list.html) 定义了滚动事件和带 smooth 参数的滚动方法；[通用事件](https://iot.mi.com/vela/quickapp/zh/components/general/events.html) 没有给出 Watch 4 表冠旋转契约。实现没有虚构 rotary/crown 回调，也没有使用 Watch 4 不支持的 system.event。

**表冠要求尚未完成真机验收。** 当前只有原生 list 可承接系统可能提供的表冠滚动。若固件不自动将表冠映射到 list，需要真实可用的设备接口或原生适配后才能完成此项；触摸滚动可用于当前阅读，但不证明表冠可用。

参考接口：[文件分段读取](https://iot.mi.com/vela/quickapp/zh/features/data/file.html)、[storage](https://iot.mi.com/vela/quickapp/zh/features/data/storage.html)、[$nextTick](https://iot.mi.com/vela/quickapp/zh/guide/framework/script/global-data-method.html)。平台文档和构建通过均不等于 Watch 4 固件支持全部接口。

## 验证

`npm run build` 验证 UX、脚本和 manifest，输出 `dist/com.cnbarrier.ebook.debug.0.1.0.rpk`。

真机待验：导入目录映射；表冠两方向及连续快速旋转；scrollY 的坐标与 scrollend 时序；窗口边缘上下往返是否跳字/跳动；接近书尾的定位；触摸与箭头动画；息屏、重开、重启恢复；大书长读内存峰值；读取和写入失败提示。记录 Watch 4 固件版本后逐项确认。
