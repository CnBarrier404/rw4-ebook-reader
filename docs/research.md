# Redmi Watch 4：Vela JS 电子书开发、原版阅读器安装与文件导入调研

2026-09-12 补充：已分析用户提供的三个 BIN，确认安装 Lua 写死 `com.givemefive.ebook` 路径、正文为 UTF-16LE，并实现支持自定义包名的 TXT 打包器。格式证据、使用方法和仍需实机验证的事项见 [BIN 生成器](bin-generator.md)。下文保留原调研时点的结论，其中“尚未检查 BIN”的描述已由此次本地分析补充。

调研日期：2026-09-10（北京时间）  
性质：开发前的文档素材与证据清单；未编写应用代码，未安装应用、修改固件或操作手表。  
对象：Redmi Watch 4；不将 Watch 5、Watch S4、手环 8 Pro/9/10 的能力自动视为 Watch 4 的能力。

## 1. 核心结论与证据分级

Redmi Watch 4 已有原作者发布的 Vela 快应用电子书适配包，能找到“阅读器 RPK + 书籍资源安装表盘”的公开使用路径。开发轻量离线文本阅读器有现实依据；但目前证据不足以承诺原生 EPUB、表冠回调、手机任意文件直传或任意固件兼容。当前官方文档是多设备持续更新文档，必须同时检查 API 版本标记、机型支持表和实际固件。

本文使用四类标记：

- **A｜官方确认**：小米设备资料、Vela API 文档或标准组织文档直接说明。标为“平台级”时，仅确认接口定义存在，不代表 Watch 4 已实测。
- **B｜作者确认**：工具或阅读器作者自己的发布帖，确认其发布内容和声明；不等于小米官方支持。
- **C｜一手使用记录**：教程作者描述自己的 Watch 4 操作，保留日期和适用范围，未独立复现。
- **U｜未确认／推断**：未找到足够证据，或根据已知限制形成的工程判断。

优先结论：

| 事项                | 当前可以采用的结论                                                   | 依据                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 整机资源            | 官方给出 32 MB RAM、256 MB ROM；不是单应用额度                       | A，[小米存储 FAQ](https://www.mi.com/global/support/faq/details/KA-533710/)                                                                                 |
| 原版 Watch 4 阅读器 | GiveMeFive 发布适配 RPK，要求书籍制作成安装表盘                      | B，[Watch 4 原帖](https://www.bandbbs.cn/threads/9345/)                                                                                                     |
| 联网取书            | 官方将 Watch 4 的 fetch、request 下载列为不支持                      | A，[fetch](https://iot.mi.com/vela/quickapp/zh/features/network/fetch.html)、[request](https://iot.mi.com/vela/quickapp/zh/features/network/request.html)   |
| 通用蓝牙与公共事件  | Watch 4 的 system.bluetooth、system.event 均明确不支持               | A，[bluetooth](https://iot.mi.com/vela/quickapp/zh/features/system/bluetooth.html)、[event](https://iot.mi.com/vela/quickapp/zh/features/system/event.html) |
| 文件与 ZIP          | 官方有文件读写、按偏移读二进制、解压接口；Watch 4 具体实现边界仍待测 | A 平台级，[file](https://iot.mi.com/vela/quickapp/zh/features/data/file.html)、[zip](https://iot.mi.com/vela/quickapp/zh/features/system/zip.html)          |
| 表冠                | 官方确认旋转表冠硬件；本次未找到 Watch 4 的 Vela JS 表冠事件契约     | A 硬件／U 接口，[产品页](https://www.mi.com/hk/product/redmi-watch-4/)                                                                                      |

## 2. 设备与运行环境

### 2.1 屏幕、内存和版本

官方 FAQ 列出 1.97 英寸 AMOLED、390 × 450 分辨率、60 Hz 刷新率。屏幕刷新率不是 JS 应用帧率保证。产品页确认旋转表冠，但没有将其等同于可订阅的 JS 输入事件。[小米屏幕 FAQ](https://www.mi.com/es/support/faq/details/KA-89436/)、[产品页](https://www.mi.com/hk/product/redmi-watch-4/)

32 MB RAM 和 256 MB ROM 是整机规格；快应用堆、原生 UI 分配、应用分区、资源表盘空间、单书容量和可用剩余空间不能由这两个数字推出。本次未找到官方明确的 Watch 4 单应用 JS 堆上限或安装数量上限。[小米存储 FAQ](https://www.mi.com/global/support/faq/details/KA-533710/)

平台的 device.getInfo 可返回型号、产品代号、系统与平台版本、屏幕尺寸；APILevel 字段标为 2+。device.getTotalStorage / getAvailableStorage 的单位是 Byte，但页面没有解释 Watch 4 上返回值对应哪个分区或配额。需要实机确认，不能直接当作书库剩余容量。[设备信息](https://iot.mi.com/vela/quickapp/zh/features/basic/device.html)

**U：** 当前没有用户设备的销售地区、固件版本或 APILevel。不得预先认定所有 Watch 4 都是某个 APILevel，也不得将缺少 APILevel 字段直接判为接口故障。

### 2.2 JS 应用是什么

官方项目由 app.ux、页面 UX 文件、manifest.json 和资源组成；最终构建产物位于 dist。脚本支持 ES5/ES6，运行环境并非 Node.js，不能直接使用 Node 原生 fs 等模块。此事实直接影响 ZIP 库、EPUB 库和文件读取方案的选型。[项目概览](https://iot.mi.com/vela/quickapp/zh/guide/start/project-overview.html)、[脚本语法](https://iot.mi.com/vela/quickapp/zh/guide/framework/script/)

**推断：** 引入第三方纯 JS 库也应逐项核对其所需的运行时对象、模块依赖、代码体积与内存峰值。不能因桌面浏览器或 Node 能运行，就认定手表可运行。Vela 页面组件也不能直接当作完整浏览器 DOM 或 WebView。

## 3. 阅读器相关 API 与设备限制

### 3.1 文本、触摸与滚动

| 能力        | 官方定义／版本要求                                                                                 | 阅读器意义及确认边界                                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| text / span | text 仅接受 span 子组件；有字号、颜色、行高、首行缩进、行数及溢出样式                              | 适合纯文本呈现；未提供 EPUB XHTML/CSS 的完整渲染承诺。[text](https://iot.mi.com/vela/quickapp/zh/components/basic/text.html)                                                                                          |
| 触摸事件    | touchstart、touchmove、touchend、click、longpress、swipe                                           | 可研究点击翻页、拖动和菜单；同方向有滚动条时 swipe 不触发，须避免手势冲突。[通用事件](https://iot.mi.com/vela/quickapp/zh/components/general/events.html)                                                             |
| list        | 直接子组件为 list-item，需要显式高度；有 scroll、scrolltop、scrollbottom、scrollend、scrolltouchup | 可用于书架、目录或分段内容；不要混用 scroll 的方法名。文档没有给出 Watch 4 的长列表容量保证。[list](https://iot.mi.com/vela/quickapp/zh/components/container/list.html)                                               |
| scroll      | 组件标记 2+；支持方向、位置属性、滚动事件，以及 getScrollRect、scrollTo、scrollBy                  | 是连续滚动／自动翻页的候选；须先验证 Watch 4 固件支持。竖向需定高，横向需定宽。[scroll](https://iot.mi.com/vela/quickapp/zh/components/container/scroll.html)                                                         |
| 滚动吸附    | APILevel3 增加，相关样式要求 aiot-toolkit 至少 1.1.4                                               | 编译器版本和设备 API 支持是两个条件，不能只升级工具就认为 Watch 4 可用。[APILevel3](https://iot.mi.com/vela/quickapp/zh/guide/version/APILevel3.html)                                                                 |
| 尺寸适配    | manifest 的 designWidth 按设备宽度缩放；官方明确 Watch 4 不支持媒体查询                            | 不能以 CSS media query 作为 Watch 4 的适配前提。[项目配置](https://iot.mi.com/vela/quickapp/zh/guide/framework/manifest.html)、[媒体查询](https://iot.mi.com/vela/quickapp/zh/guide/framework/style/media-query.html) |

APILevel2 版本说明明确列出新增 scroll、getBoundingClientRect，以及 device.getInfo 的 APILevel 字段。它是版本定义，不是 Watch 4 的支持清单。[APILevel2](https://iot.mi.com/vela/quickapp/zh/guide/version/APILevel2.html)

### 3.2 表冠必须单列为未确认

本次核对了小米 Vela 的通用事件、list、scroll 和 system.event 页面，未找到 Watch 4 专用的表冠旋转回调、方向／角度单位、焦点归属或接管方式。官方硬件介绍只能证明设备有旋转表冠。[通用事件](https://iot.mi.com/vela/quickapp/zh/components/general/events.html)、[scroll](https://iot.mi.com/vela/quickapp/zh/components/container/scroll.html)、[产品页](https://www.mi.com/hk/product/redmi-watch-4/)

**U：** 表冠是否自动驱动 list/scroll、能否由 JS 截获、表冠按下是否只由系统处理，均需真机验证。搜索出现的其他手表快应用或 HarmonyOS 表冠接口，不能作为 Vela Watch 4 的实现依据。system.event 是公共事件总线，且 Watch 4 明确不支持，不能将它臆测为表冠入口。[公共事件](https://iot.mi.com/vela/quickapp/zh/features/system/event.html)

### 3.3 亮度、常亮和生命周期

平台提供 brightness.getValue / setValue（0–255）、getMode / setMode（手动／自动）、setKeepScreenOn。页面没有 Watch 4 的逐方法支持表，应验证常亮时限、设置恢复行为和系统策略。[屏幕亮度](https://iot.mi.com/vela/quickapp/zh/features/system/brightness.html)

官方说明应用通常在进入后台后停止；后台继续运行要求声明接口且对应接口正在工作，列出的接口为音频、下载和定位。普通阅读页不能假设后台计时器持续执行。[后台运行](https://iot.mi.com/vela/quickapp/zh/guide/framework/other/background-running.html)

官方另提示重新亮屏会再次触发 onShow；应避免重复启动自动翻页任务或重复读书，并在适当生命周期保存进度。[注意事项](https://iot.mi.com/vela/quickapp/zh/guide/other/tips.html)

## 4. 文件系统、书库与内存

### 4.1 URI 与沙箱

| URI 类别              | 文档中的访问性质   | 对书籍的意义                            |
| --------------------- | ------------------ | --------------------------------------- |
| /path                 | 应用打包资源，只读 | 可研究随包附带少量内容                  |
| internal://files/path | 可写、应用私有     | 书籍与索引的候选目录                    |
| internal://cache/path | 可写、应用私有     | 临时处理候选；回收时机待核实            |
| internal://mass/path  | 可写、应用私有     | 不能从名称推断 Watch 4 有独立大容量存储 |
| internal://tmp/path   | 系统动态生成，只读 | 不可直接作为普通写入目录                |

相同 internal URI 在不同应用中指向不同文件。URI 有字符白名单且禁止“..”；中文书名不应未经处理就作为内部路径。本次未找到 Watch 4 各目录的实际挂载点、配额、清理与卸载保留策略。[文件组织／项目结构](https://iot.mi.com/vela/quickapp/zh/guide/framework/project-structure.html)

**推断：** 原版资源表盘能导书，并不证明任意第三方 RPK 可以跨沙箱读到原版书库。原版书籍目录、索引格式、包名绑定和表盘写入机制都需要额外证据。

### 4.2 文件和键值接口

平台 file 提供 move、copy、list、get、delete、access、mkdir、rmdir、文本和二进制读写。readText 默认 UTF-8，没有偏移／长度参数；readArrayBuffer 支持 position、length，返回 Uint8Array。writeArrayBuffer 支持偏移及追加，writeText 也可追加。常见错误包括参数错误、I/O 错误、文件不存在；目录和资源路径限制应按具体方法核对。[文件存储](https://iot.mi.com/vela/quickapp/zh/features/data/file.html)

storage 提供 get、set、delete、clear，值为字符串；set 空字符串会删除对应项。适合记录字号、书籍 ID、阅读位置等小数据。该页面没有给出 Watch 4 的单项长度或总配额。[数据存储](https://iot.mi.com/vela/quickapp/zh/features/data/storage.html)

**工程推断：** 大书优先考虑分段／分章加载；按字节读取还需处理 UTF-8 字符被截断、BOM、换行与进度定位。不能将文件字节偏移和 JS 字符串索引混为一谈。GBK、UTF-16 的设备端支持范围尚未确认，可优先研究手机端统一转为 UTF-8。

### 4.3 内存与存储：应记录的五种不同指标

1. 整机 RAM／ROM：已有官方数值。
2. 单应用 JS 堆与原生 UI 内存：未确认上限。
3. 快应用安装区、表盘区、运行数据区：未确认各自容量与是否共享。
4. 传输工具允许的安装文件大小：工具规则，不是硬件规格。
5. 文本制作器允许的 TXT 大小：输入转换规则，不是 EPUB 或 JS 内存上限。

官方内存优化建议包括：非 UI 数据不放入响应式对象；避免保留页面引用；销毁时清定时器；读入数据用完解除引用；减少大图、大依赖与无用页面；可用 static 减少不变节点开销。文档提及 global.runGC，但警告频繁调用会卡顿，Watch 4 上的可用性和效果仍应验证。[内存优化](https://iot.mi.com/vela/quickapp/zh/guide/best-practice/memory.html)

官方建议列表分页、每页控制在约 20 项以内，这是优化建议，不是“第 21 项必然失败”的硬限制。公开验收页给出首页 FMP ≤ 2000 ms，未给出 Watch 4 专属内存限额。[注意事项](https://iot.mi.com/vela/quickapp/zh/guide/other/tips.html)、[验收标准](https://iot.mi.com/vela/quickapp/zh/guide/publish/acceptance-criteria.html)

## 5. ZIP 与 EPUB

### 5.1 ZIP：已有平台定义，设备兼容尚未证实

官方 system.zip 公开 zip.decompress：源文件不能是 tmp URI，目标目录不能是应用资源或 tmp；提供成功／失败回调。该页没有 Watch 4 支持表，也未说明压缩方法覆盖、ZIP64、逐项解压、流式解压、取消、进度、空间预估和路径安全行为。[解压缩 zip](https://iot.mi.com/vela/quickapp/zh/features/system/zip.html)

**U：** 不能断言 Watch 4 完全不支持 ZIP，也不能断言已有可用的原生解压链路。需核实模块导入、方法调用、STORE／DEFLATE、文件名编码、嵌套目录和失败清理。

### 5.2 EPUB 不止解压

W3C EPUB 规范定义 ZIP 容器及其中的出版物结构；container.xml 用于定位包文档，包文档包含资源及阅读顺序等信息，正文通常是 XHTML，另有导航、样式、图片等。ZIP 条目使用 STORE 或 DEFLATE，并可涉及 ZIP64。[EPUB 3.3 规范](https://www.w3.org/TR/epub-33/)

**本次调研未找到小米 Vela 官方提供的 EPUB 解析器、阅读引擎或完整 HTML 排版组件。** 实现 EPUB 至少还要处理容器定位、OPF／spine、目录、XHTML 转换与资源引用；复杂排版、SVG、嵌入字体、加密内容等应分别定义支持范围。

**工程风险与候选方向（推断）：**

- 整本解压后的磁盘占用与正文／图片解码峰值，可能远大于 EPUB 压缩文件体积。
- 不可信压缩包需要限制展开体积、条目数量、嵌套路径与重复文件，避免越界路径和空间耗尽。
- 手机端先提取章节并转换成轻量文本，是降低表端负担的候选方向；是否能送入自建 RPK 沙箱仍取决于导入通路。
- “原版可以看 TXT”不能证明其支持 EPUB；“可以解 ZIP”也不能证明其能正确呈现 EPUB。

## 6. 应用打包、签名、安装与调试

### 6.1 官方构建机制

AIoT-toolkit 将源码编译为 .rpk；可由 IDE 调用，也可独立使用命令行。官方列有 build 和 release 两类构建。IDE 的“打包”生成 debug，“发布”生成 release 并检查签名文件；“发布”按钮在这里指生成发布包，不等于应用已经上架商店。[AIoT-toolkit](https://iot.mi.com/vela/quickapp/zh/tools/toolkit/start.html)、[打包应用](https://iot.mi.com/vela/quickapp/zh/tools/release/start.html)、[发布应用](https://iot.mi.com/vela/quickapp/zh/tools/release/release.html)

manifest 记录包名、版本、features、路由、designWidth 和 minAPILevel。features 声明是调用许多接口的前提；提高 minAPILevel 不能为设备添加接口，反而可能使旧设备无法安装或运行。[项目配置](https://iot.mi.com/vela/quickapp/zh/guide/framework/manifest.html)

### 6.2 官方真机路径及限制

官方 FAQ 描述通过对接提供的小米运动健康版本，在“我的 → 关于 → Debug → 第三方应用 → Install third app”选择本地 RPK；这不是普通商店版一定存在的入口。该 FAQ 也要求 release 证书保持一致，并指出手机通信需要配套证书。[官方 FAQ](https://iot.mi.com/vela/quickapp/zh/guide/other/faq.html)

较新的 IDE 真机调试文档明确只支持 Xiaomi Watch S4，且仅对特定合作方开放，需要指定固件与测试版运动健康。因此不能将 IDE 一键连接调试当作 Watch 4 已有的官方能力。[真机调试功能介绍](https://iot.mi.com/vela/quickapp/zh/tools/devicedebug/start.html)

**U：** Watch 4 面向普通开发者的公开上架资格、商店地区范围、现版普通运动健康安装入口、具体固件的 debug/release 接受规则，本次未找到充分官方依据。

### 6.3 手机通信与安装传输是不同链路

interconnect 的平台文档定义快应用与安卓伴侣应用通信，要求两端包名及签名匹配。该页面没有提供 Watch 4 明确支持表，不能用它保证现有手机直传可用。[设备通信 interconnect](https://iot.mi.com/vela/quickapp/zh/features/network/interconnect.html)

GiveMeFive 的 Watch 4 电子书原帖在 2023 年说明应用间通信不可用，因此使用安装表盘。这是该版本的作者声明；其确切底层机制及后续固件变化未确认。[原版 Watch 4 电子书](https://www.bandbbs.cn/threads/9345/)

**重要区分：** 手机通过蓝牙安装 RPK／BIN，不等于 RPK 自身能够使用 system.bluetooth 或 interconnect。系统安装协议、资源表盘运行、应用间通信和应用沙箱文件读写必须分别验证。

## 7. “表盘自定义工具”与原版电子书

### 7.1 工具身份与当前入口

“表盘自定义工具”是 GiveMeFive 发布的安卓工具，历史 Redmi Watch 4 专帖确认其支持表盘及快应用安装、卸载，并要求选择正确设备。v5.1.5 增加 Watch 4 电子书安装表盘制作；v5.2.2 增加 Watch 4 蓝牙一键安装表盘。历史日志还警告部分二改快应用安装可能引发重启，不应将改包视为普通兼容操作。[作者 Watch 4 工具帖](https://www.bandbbs.cn/threads/9280/)

后续更新集中在作者总帖；本次读取标题为 2026-09-08 v6.5.1，设备列表仍包含 Watch 4，并修复小米运动健康 v3.59.0 的 AuthKey 读取适配。日志记载新版可借助 Shizuku／文件夹授权读取 AuthKey；BIN、RPK、FACE 可关联打开；2025 年曾将蓝牙安装文件上限调整为 15M。该值不是小说制作上限。当前收费／广告解锁条件应以实际版本为准，旧教程的“必须捐赠”不可直接沿用。[作者更新总帖](https://www.bandbbs.cn/threads/9797/)

该工具不是小米官方相册表盘功能，也不是同名下载站所称的“官方正版”。下载与版本核对应从作者总帖出发；本次未下载 APK、未校验签名或网盘文件内容。

### 7.2 GiveMeFive／NEORUAA 原版项目的对应关系

| 项目                             | 发布信息与文件导入                                                                                                                             | 能否用于证明 Watch 4 能力                                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Watch 4 环间电子书               | GiveMeFive，2023-12-09；附件显示 com.givemefive.ebook.release.1.1.0 (1).rpk，75.8 KB；书籍需制成安装表盘                                       | 是，属于明确机型适配声明；尚未实测当前固件。[原帖](https://www.bandbbs.cn/threads/9345/)                                                                                          |
| 手环 8 Pro 环间电子书            | NEORUAA 发布，2023-09-27，更新至 23.10.1_1.1；制作人员列出 GiveMeFive、NEORUAA、无源流沙；阅读器独立安装，书籍可由工具蓝牙推送或安装器表盘释放 | 证明项目协作及手环版路径；不能套用其蓝牙直传能力到 Watch 4。[原帖](https://www.bandbbs.cn/resources/1751/)                                                                        |
| 手环 9 环间电子书                | NEORUAA，2024-07-19；要求使用工具内的“环间电子书安卓端”推送文本                                                                                | 仅为手环 9 路径。[原帖](https://www.bandbbs.cn/resources/1884/)                                                                                                                   |
| 喵喵电子书安卓客户端及新版手环端 | NEORUAA 另有安卓客户端和手环 9 Pro／10 版本                                                                                                    | 未找到对应 Watch 4 的作者适配说明，不能视为原版 Watch 4 的升级包。[客户端页](https://www.bandbbs.cn/resources/3785/)、[作者资源目录](https://www.bandbbs.cn/resources/authors/6/) |

因此，“GiveMeFive / NEORUAA 原版”可定位到同一协作项目的不同机型版本，但安装时应以 Watch 4 专帖附件为对应版本，不能凭作者名或相近版本号混装。这里的“原版”仅指作者发布入口；附件二进制真实性、哈希、签名和许可本次未验证。

### 7.3 Watch 4 原版安装与导书路径

以下是作者发布说明与 Watch 4 使用者教程结合得到的流程素材，未在本次环境复现。

**阅读器安装：** 手机先通过小米运动健康完成手表绑定；在表盘自定义工具中选择 Watch 4，按所用版本完成连接／授权，然后使用快应用安装入口安装 Watch 4 专帖的原版 RPK。最新菜单位置及 AuthKey 获取方式需对照工具版本。[小米绑定说明](https://www.mi.com/sg/support/faq/details/KA-91948/)、[作者工具帖](https://www.bandbbs.cn/threads/9280/)、[阅读器原帖](https://www.bandbbs.cn/threads/9345/)

**书籍导入：** 一位 Watch 4 使用者记录的操作为：

1. 准备 TXT，在工具的“电子书小程序制作”中选择文件并制作资源表盘。
2. 生成文件位于手机 Android/data/tech.pingx.watchface/files/ebook.bin，可取出到易访问目录。
3. 用“蓝牙一键安装”安装该 BIN；在手表上作为表盘打开并执行，完成后进入环间电子书查找书籍。
4. 该作者称释放完书籍后可以删除安装表盘；建议实际确认书籍可打开后再删除。

该教程于 2024 年发布，注明输入 TXT 小于 4M，并以已会安装快应用和表盘为前提。4M 的精确字节口径、当前工具是否仍有同限额均未确认。[Watch 4 使用者原教程](https://www.bandbbs.cn/threads/13846/)

**文件角色：** APK 是手机工具；RPK 是手表阅读器；TXT 是书籍输入；ebook.bin 是导入资源表盘。更改扩展名不会让这几类文件互相转换。

**关键空白：** 尚未确认 BIN 内部格式、运行时写入位置、索引规则、是否绑定 com.givemefive.ebook、同名书行为、断电后的半导入恢复、删除表盘与删除 RPK 后的数据保留。这些决定自建阅读器能否复用原版导入器。

## 8. 风险与未确认项清单

| 优先级 | 风险／空白                     | 已有证据与下一步需确认的内容                                                         |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------ |
| 高     | 不同固件／地区安装行为不同     | 官方调试入口受对接限制，社区流程有版本依赖；先记录实际固件、地区、运动健康与工具版本 |
| 高     | 自建 RPK 无法收到书籍          | 官方 internal URI 私有隔离；原版导入成功不证明通用写入能力。需查导入目标包与书库格式 |
| 高     | 大书内存峰值导致卡顿或退出     | 整机 32 MB 并非 JS 配额；需测分段读取、中文解码、UI 节点和图片峰值                   |
| 高     | 将手环版蓝牙直传误用于 Watch 4 | 作者分别描述不同导入方式；需独立验证 interconnect，不能依靠通用 BLE API              |
| 高     | EPUB／ZIP 支持被过度承诺       | ZIP 页面无 Watch 4 细分表；需分别测解压、解析、目录与正文显示                        |
| 中     | scroll 与表冠不可用            | scroll 是 2+，表冠缺少设备接口证据；先测试触摸、list、scroll 与硬件旋转实际行为      |
| 中     | 把 4M、15M、256 MB 混为一谈    | 分别涉及旧制作器输入、工具传输、整机 ROM，互不等价                                   |
| 中     | AuthKey／Android 目录授权失效  | 当前工具日志持续适配运动健康；需核实手机系统和授权方式，保管绑定密钥                 |
| 中     | 旧收费说明与新版不一致         | 2024 教程和后续工具日志处于不同时期；不据此承诺永久免费或必须捐赠                    |
| 中     | 睡眠／亮屏后丢进度或重复翻页   | 官方说明 onShow 会再次触发，后台通常停止；需测退出、息屏、重启后恢复                 |
| 中     | 二改包或不同签名安装异常       | 作者历史日志有重启警告；保留原版版本与校验信息，勿把改包兼容性当作既成事实           |
| 中     | 官方泛化文档与旧设备不一致     | 部分页无设备表；APILevel2 的无 .html 链接还会跳转概述，应以实际版本说明页和实机为准  |

表中风险是基于前述来源的工程判断，不是本次实机故障记录。

## 9. 开发前验证顺序（仅列计划，未执行）

1. 确认实际 Watch 4 的地区、型号、固件、可用存储和现有应用；记录手机系统、运动健康、工具版本。
2. 用作者原版阅读器和一份很小的 UTF-8 TXT 验证安装／资源表盘导入／打开／重启后仍可读的闭环。
3. 查清原版安装器的目标包和目录规则，判断能否用于新应用；这是文件导入方案的前置问题。
4. 验证设备的 APILevel、文件接口、存储统计、scroll、亮度、表冠和 interconnect，逐项记录成功、失败码或缺失字段。
5. 测试中文分段边界、同名书、多个书籍、存储不足、导入中断、删除与恢复；逐步增加样本大小，记录峰值而非只看文件体积。
6. 基础 TXT 链路成立后，再用小型 STORE／DEFLATE 样本验证 ZIP；随后验证一个简单、无加密 EPUB 的结构与阅读顺序。

上述验证需要后续明确进入开发／实机操作阶段。本次交付仅为资料整理，未进行设备安装或运行兼容性验证。

## 10. 来源使用说明

正文链接均指向对应资料页，可作为后续需求文档或技术方案的引用入口。小米／Vela 页面以 2026-09-10 读取内容为准；旧社区帖保留其发布时期，更新总帖以实际读取的 v6.5.1 标题为准。

资料选择优先采用小米官方接口定义、明确机型表、原作者发布页和教程作者本人的使用记录。未采用转载下载站的“官方”“免费”“全机型可用”描述作为依据，也未把其他型号的分区大小、应用数量和固件改造经验迁移到 Watch 4。

局限：未登录下载受限附件，未检查原版 RPK／BIN 内部文件；部分资源页的搜索摘要与直接访问正文展示不完全一致，因此未把摘要中的开源地址、额外功能或支持机型当作已经核验的结论。未查到某接口或某机型适配说明，只代表当前证据不足，不代表已证明其绝对不存在。
