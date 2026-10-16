## 参赛项目名称

**开口泰·安心游泰国**：能开口，就不用靠中间人

在线体验：https://bianzithai.pages.dev/trip （手机打开效果最好，免登录）

## 团队 / 作者与奖品领取人

- 团队名称：辫子
- 主要提交人 GitHub ID（仅 1 位，必填）：@bianzigege
- 其他成员（可选，仅用于署名）：无

## 旅行场景与目标用户

**场景**：中国游客去泰国自由行，从订行程到落地后的每一站。

**目标用户**：第一次去泰国、不会泰语的自由行游客，尤其是家里人担心「泰国不安全」的年轻人、带父母出行的家庭。

**要解决的问题**：

今年很多人觉得泰国不安全。但看中国驻泰使馆 2026 年的几次提醒，出事的主要是三类：信了「高薪招聘、包机票包吃住」被骗到泰缅边境；被网上认识的「朋友」约来泰国，落地后被控制；报了零元团被强制购物。正常来旅游其实很安全。

风险集中在**被中间人带着走**的时候：语言不通，就只能靠主动找上门、会说中文的陌生人来介绍工作、带路、报团、换钱。

我在曼谷生活、做直播带货业务，跟泰国同事天天打交道。我的判断是：**能开口，就不用靠中间人**。所以这个作品把「语言」和「安全感」放在一起做：飞猪帮你订到正规的行程，开口泰帮你一路直接跟泰国人打交道，家里人也放心。

## 我做了什么

1. **一句话生成行程，只用飞猪真实商品**
   说一句「11 月 20 号从上海出发，曼谷 3 晚加清迈 2 晚，两个人，喜欢寺庙和夜市」，百炼先理解需求，再从飞猪的酒店、景点、接送机、一日游里挑选、排好每一天。每一项都能跳到飞猪预订。模型只能用列表里的 id，代码会再校验一遍，编造的地点不会出现在结果里。

2. **每一站自动配好「防坑提醒 + 要说的泰语」（主动服务）**
   按地点类型（机场、寺庙、夜市、海岛、按摩、酒吧……）给出这里常见的坑、怎么应对，以及当场用得上的泰语。例如走到大皇宫，会提醒「有人说今天关门、要带你去别处，是经典骗局」，并给出礼貌拒绝的那句泰语。固定句子共 39 句，来自开口泰课程，都有真人发音；不够用时可以让 AI 按当前地点现写几句，并标注「AI 生成」。

3. **到了骗局高发区自动提醒、「我在哪一站」、「回酒店卡」（空间感知 + 主动服务）**
   开启提醒后，走到大皇宫一带、考山路、素万那普机场、芭东海滩、芭提雅海滩等 8 个高发区，页面会主动弹出「这里常见的坑」和拒绝用的泰语，同一处 6 小时内不重复打扰。飞猪数据带经纬度，按「我在哪一站」会定位到行程里最近的一站并展开提醒。「回酒店卡」用泰文大字加飞猪给的原始地址和地图定位，全屏给司机看（不用机器翻译酒店名，避免翻错）。

4. **「这靠谱吗？」——截图问 AI（多模态）**
   陌生人发来的招聘、交友邀约、低价团、街头报价，截图或粘贴进来。百炼视觉模型先把图里的文字照抄出来，再对照使馆提醒和常见骗局给出：高风险 / 要小心 / 看起来正常，加上判断理由、现在该怎么做、要说的泰语。实测「泰国招主播月薪 3 万、包机票、免签先上班」判为高风险；「大皇宫门口说今天关门」判为要小心；「飞猪订的接机」判为正常。

5. **拍一下看懂（多模态）**
   菜单、路牌、告示、价目表拍一张，百炼视觉模型先照抄图里的字，再逐行给出中文意思、泰文读音、辣不辣 / 含不含猪肉海鲜，并提醒「只收现金」「另收 10% 服务费」「按 100 克计价」这类容易被多收钱的地方。菜单上每道菜都有「我要这个」，一按就是给店家看的大字点餐卡。

6. **实时中泰同传（多模态）**
   卡片上没有的话就直接聊：按「我说中文」，手机用泰语说出来；按「对方说泰语」，屏幕上出中文。播放泰语时麦克风自动静音，避免把自己的声音再翻一遍。

7. **一键求助 + 平安报备**
   泰文求助卡（救命、报警、要医生、去医院、迷路）、报警 191 / 急救 1669 / 旅游警察 1155，按定位找最近的中国使领馆。「平安报备」一键把位置和当天安排发给家人。

8. **出发前攻略**
   「泰国到底安不安全」、看到哪些信号要马上停下、2026 年入境新规（9 月 15 日起免签单次 30 天、TDAC 电子入境卡、电子烟违法）。每条附使馆或官方来源，我自己的经验单独标出；使领馆电话已对照官网核对。

9. **没网也能用**
   刚落地、漫游信号差的时候最需要帮助。打开过一次后，行程、求助卡、回酒店卡、全部泰语句子和真人发音都缓存在手机里，断网照样能用；需要联网的功能会明确提示。

### 商业闭环：已开通飞猪推广者

- 作者已开通**飞猪推广者**，网站上酒店、接送机、一日游等「在飞猪查看 / 预订」链接都由推广者正式接口生成。用户在飞猪下单后，系统自动归因分佣（以酒店、度假类商品为主）。
- 对用户免费；收入来自飞猪佣金，以及开口泰 AI 陪练的按量付费。
- 对飞猪：安全担忧是中国游客去泰国最大的顾虑。这个产品先把顾虑讲清楚，再把用户从街边揽客、零元团引回飞猪上的正规商家，等于在泰国这条线上直接帮飞猪提高转化。
- 模式可以复制：换一种语言和一套当地防坑内容，就能做日本、越南等其他出境目的地。

## 百炼使用说明（必填）

百炼位于**运行时链路**，是作品的核心。

- **百炼能力 / 模型**：
  - `qwen3.8-flash`：理解行程需求、从飞猪候选里排行程、判断「这靠谱吗」、按地点现写泰语句子（均为 JSON 输出，关闭思考模式）
  - `qwen3-vl-plus`：「这靠谱吗」上传截图、「拍一下看懂」拍菜单路牌时，照抄图片里的文字（只抄不编，解释交给文本模型）
  - `qwen3.8-livetranslate-flash-realtime`：实时中泰同传，中文→泰语输出文字和语音，泰语→中文输出文字
- **调用方式**：百炼 API。文本和视觉走 OpenAI 兼容接口 `/compatible-mode/v1/chat/completions`；同传走 Realtime WebSocket。全部由 Cloudflare Pages Functions 在服务端调用，API Key 放在服务端密钥里，浏览器拿不到。浏览器的 WebSocket 不能带鉴权头，所以同传由服务端转发。
- **使用环节与输入输出**：
  - 行程：一句话 →（qwen3.8-flash）城市、晚数、日期、人数、兴趣 JSON →（qwen3.8-flash + 飞猪候选列表）按天排好的行程 JSON → 代码校验每个 id 都是真实飞猪商品
  - 这靠谱吗：截图 →（qwen3-vl-plus）照抄文字 →（qwen3.8-flash + 骗局知识清单）风险等级、理由、建议、泰语句子 id
  - 拍一下看懂：照片 →（qwen3-vl-plus）照抄文字 →（qwen3.8-flash）逐行中文意思、读音、忌口提醒、价格陷阱
  - 再来几句：地点名称和类型 →（qwen3.8-flash）4 句泰语，按词切分并标注读音 → 用开口泰课程词库校对读音
  - 同传：16kHz 麦克风音频 →（livetranslate）原文转写、译文、泰语语音（24kHz）
- **Skill 名称**：飞猪 flyai（`@fly-ai/flyai-cli`，官方 CLI + 推广者正式 API Key，采集曼谷、清迈、普吉、芭提雅、甲米、苏梅岛六地的酒店、景点和可订商品）
- **其他工具 / 技术栈**：原生 HTML/JS 单页、Service Worker 离线缓存、Geolocation 地理围栏、Cloudflare Pages + Pages Functions + D1（按 IP 限流）、edge-tts 预生成泰语发音

## 效果展示

**演示视频（2 分 11 秒，竖屏，全部为线上真实操作录屏）**：[点击下载 / 播放](https://github.com/bianzigege/kaikoutai-anxin/releases/download/v1.0/anxin-demo.mp4)

<table>
<tr><td align="center" width="25%"><img src="https://raw.githubusercontent.com/bianzigege/kaikoutai-anxin/main/screenshots/01-home.png" width="200"><br><sub>首页：泰国旅游其实很安全</sub></td><td align="center" width="25%"><img src="https://raw.githubusercontent.com/bianzigege/kaikoutai-anxin/main/screenshots/02-plan.png" width="200"><br><sub>一句话生成行程（飞猪真实商品）</sub></td><td align="center" width="25%"><img src="https://raw.githubusercontent.com/bianzigege/kaikoutai-anxin/main/screenshots/03-plan-palace-tips.png" width="200"><br><sub>大皇宫：「今天关门」骗局提醒</sub></td><td align="center" width="25%"><img src="https://raw.githubusercontent.com/bianzigege/kaikoutai-anxin/main/screenshots/04-plan-phrases.png" width="200"><br><sub>每一站要说的泰语（真人发音）</sub></td></tr>
<tr><td align="center" width="25%"><img src="https://raw.githubusercontent.com/bianzigege/kaikoutai-anxin/main/screenshots/13-hotspot-alert.png" width="200"><br><sub>走到大皇宫一带，自动弹出提醒</sub></td><td align="center" width="25%"><img src="https://raw.githubusercontent.com/bianzigege/kaikoutai-anxin/main/screenshots/05-hotel-card.png" width="200"><br><sub>回酒店卡：给司机看</sub></td><td align="center" width="25%"><img src="https://raw.githubusercontent.com/bianzigege/kaikoutai-anxin/main/screenshots/06-check-high-risk.png" width="200"><br><sub>「泰国招主播月薪 3 万」判为高风险</sub></td><td align="center" width="25%"><img src="https://raw.githubusercontent.com/bianzigege/kaikoutai-anxin/main/screenshots/10-read-menu.png" width="200"><br><sub>拍菜单：意思、读音、忌口和价格陷阱</sub></td></tr>
<tr><td align="center" width="25%"><img src="https://raw.githubusercontent.com/bianzigege/kaikoutai-anxin/main/screenshots/11-order-card.png" width="200"><br><sub>点餐卡：给店家看</sub></td><td align="center" width="25%"><img src="https://raw.githubusercontent.com/bianzigege/kaikoutai-anxin/main/screenshots/07-live-interpreter.png" width="200"><br><sub>实时中泰同传</sub></td><td align="center" width="25%"><img src="https://raw.githubusercontent.com/bianzigege/kaikoutai-anxin/main/screenshots/08-sos.png" width="200"><br><sub>一键求助：求助卡、电话、使领馆</sub></td><td align="center" width="25%"><img src="https://raw.githubusercontent.com/bianzigege/kaikoutai-anxin/main/screenshots/12-offline-sos.png" width="200"><br><sub>断网时求助卡照样能用</sub></td></tr>
</table>

更多截图和架构图见代码仓库 README。

## 项目链接与复现方式

- **在线 Demo**：https://bianzithai.pages.dev/trip （手机浏览器打开效果最好，免登录；微信里打开时同传和定位可能用不了）
  - 首页点「先看一个示例」，直接看一份曼谷 + 清迈的完整行程，不用等 AI
  - 也可以自己输入一句话生成（约 20–30 秒），支持曼谷、清迈、普吉、芭提雅、甲米、苏梅岛
  - 「这靠谱吗」页有 4 个示例，点一下就能试
  - 不在泰国的话，首页「到了骗局高发区自动提醒」里有「演示：模拟走到大皇宫门口」
  - 实时同传需要允许麦克风，建议用手机打开
- **代码仓库**：https://github.com/bianzigege/kaikoutai-anxin （README 里有架构图、百炼用法和全部截图）
- **飞猪数据说明**：酒店、景点和可订商品由飞猪 flyai **推广者正式接口**于 2026-10-16 采集，覆盖六地（150 家酒店全部带真实参考价、166 个景点、298 个可订商品，其中 72 个带佣金）。预订链接由推广者身份生成，价格和库存以飞猪页面为准。

## 踩坑记录（可选）

1. **飞猪体验模式不能当实时接口用**：连续查询会触发风控（403 Abnormal access），价格也是打码的。开通推广者、换成正式 API Key 后价格可见、链接可归因；采集仍然分批间隔进行，网站只读快照，预订跳回飞猪。
2. **机器翻译会把酒店名翻成别的酒店**：qwen-mt 把「曼谷王子宫殿酒店」翻成了另一家酒店的名字。司机卡改为直接用飞猪返回的原始地址加经纬度地图定位，不翻译酒店名。
3. **AI 写的行程备注会编事实**：比如「周一闭馆」，还会推荐「中文导游」（这正是我们提醒要小心的中间人）。在提示词里限定备注只写着装、先问价、防晒这类通用提醒，不写开放时间、票价、导游服务。
4. **AI 标的泰语读音声调会错**：比如 ค่ะ 标成高调。生成后用开口泰课程里已经校对过的词库覆盖读音。
5. **浏览器 WebSocket 不能带 API Key**：同传由 Cloudflare Pages Functions 建立上游连接并转发事件，Key 只留在服务端。
6. **同传会把手机自己播的泰语再翻一遍**：播放译音时，麦克风发送静音帧。
7. **AI 会把城市标错**：换城市那天（曼谷→芭提雅），模型常把整天标成曼谷。改成按当天行程里真实商品所属的城市来判定，酒店也从入住那一站反推。
8. **定位一次超时就停掉了提醒**：室内信号差时 watchPosition 会报超时，最初把所有错误都当成「没权限」关掉了提醒。现在只有用户拒绝授权才关，其余错误继续轮询。
9. **离线缓存不能影响主站**：Service Worker 只注册在 /trip 范围内，开口泰主站不受影响；页面和数据先走网络、断网再用缓存，字体、贴纸、发音先用缓存。
