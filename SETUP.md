# 主页搭建说明书

> 这套东西是给 `github.com/Sakura7301` 的个人主页（Profile README）用的。
> 全套素材（SVG 动效横幅、技术栈、作品卡、数据面板、页脚）都已生成好，直接上传即可。

视觉语言：**水墨** —— 墨黑 / 宣纸白 / 银灰，只在印章处点一点朱砂。
意象：头像（左侧）+ 北斗七星、远山云雾、飞鸟，一点朱砂做点缀。

---

## 0. 先说清楚：你现在为什么「平平无奇」

GitHub 的个人主页除了头像、昵称、简介，**唯一能被自定义的部分**就是一段 README。
显示规则很特别：

> 只有存在一个**名字和用户名完全相同**的仓库时，那个仓库里的 `README.md` 才会显示在你的主页最上方。

也就是必须有 `Sakura7301/Sakura7301` 这个仓库。
我查过了 —— 你现在没有这个仓库，所以主页上除了 GitHub 自动列出的仓库列表，什么都没有。
**这就是你「不知道在哪儿改」的原因：不是设置项，是要新建一个仓库。**

---

## 1. 第一步：创建「同名仓库」（约 1 分钟）

1. 打开 <https://github.com/new>
2. **Repository name** 填：`Sakura7301`（必须和用户名一模一样，大小写也要一致）
3. 勾选 **Public**
4. 勾选 **Add a README file**（用命令行推送的话就别勾）
5. 点 **Create repository**

创建成功后，如果页面顶部出现这样一行提示，就说明成功了：

> You found a secret! Sakura7301/Sakura7301 is a ✨ special ✨ repository that you can use to add a README.md to your GitHub profile.

---

## 2. 第二步：把文件传上去

### 方式 A：网页上传（最省事）

1. 进入刚建好的仓库
2. 点 **Add file → Upload files**
3. 把本目录里的这些东西拖进去：
   - `README.md`
   - `assets/` 整个文件夹（6 个 SVG + `avatar.jpg`）
   - `scripts/`（以后更新数据用）
   - `SETUP.md`、`.github/`（可选）
4. 点 **Commit changes**

### 方式 B：命令行（推荐，以后改起来也方便）

本目录已经 `git init` 并提交好了，只差一个远程仓库：

1. 打开 <https://github.com/new>，名字仍填 `Sakura7301`，**不要**勾选 Add a README file，直接 Create repository
2. 然后：

```bash
cd Sakura7301-profile
git remote add origin git@github.com:Sakura7301/Sakura7301.git
git push -u origin main
```

> 如果建仓库时不小心勾了 README：`git pull --rebase origin main` 后再 push，或者直接
> `git push -u origin main --force`（仓库只有你在用，安全）。

推送完刷新 `https://github.com/Sakura7301`，主页立刻变样。

---

## 3. 第三步（可选）：让数据自动更新

`assets/dashboard.svg` 和作品卡里的数字（仓库数、Star 数、语言占比）是**生成时**的数据快照。
如果你希望它自己保持最新：

1. 把 `.github/workflows/auto-update.yml` 一起推上去
2. 打开仓库 **Settings → Actions → General → Workflow permissions**
3. 选 **Read and write permissions** → Save
4. 之后每周一 UTC 03:23 会自动重跑脚本、提交最新数据；也可以在 **Actions** 页手动点 **Run workflow**

不想折腾也行，数字停在上次生成的时间，不影响观感。

---

## 4. 第四步（可选）：把主页的其它角落也收拾一下

| 想改什么 | 在哪儿改 |
| --- | --- |
| 头像、昵称、简介（bio）、位置、公司、网站 | 主页右上角 **Edit profile** |
| 社交链接（博客 / B站 / X / 邮箱等，最多 4 个） | **Edit profile → Links** |
| 主页展示的 6 个仓库 | 主页右侧 **Customize your pins**，建议和「精选作品」里的一致：MeiHuaYi、Notes、sakuraTools、OnlieProgrammingServer、Weaver、sakura-mqtt |
| 仓库介绍、Topics（标签） | 每个仓库首页右侧 **⚙ → Edit repository details** |

---

## 5. 文件说明

| 文件 | 作用 |
| --- | --- |
| `README.md` | 主页本体（文字排版、链接、章节） |
| `assets/hero.svg` | 首屏横幅：水墨夜色 + 远山云雾 + 北斗七星 + 飞鸟 + 头像（左侧圆形） |
| `assets/avatar.jpg` | 头像原图（会被内嵌进 hero.svg，见下方说明） |
| `assets/stack.svg` | 技术栈（语言 / 工具 / 方向三行胶囊） |
| `assets/projects.svg` | 精选作品 6 张卡片（带 Star 数、语言、标签） |
| `assets/dashboard.svg` | 数据面板（仓库数、原创数、Star、关注者、语言占比条，墨分五色） |
| `assets/footer.svg` | 页脚：卷轴角框 + 签名 + 版权行 |
| `assets/divider.svg` | 分隔线（一颗粒子光点沿线条流动） |
| `scripts/render.mjs` | 生成上面所有文件的脚本（零依赖，Node 18+） |
| `.github/workflows/auto-update.yml` | 可选：定时刷新数据 |

---

## 6. 想改内容？改脚本，然后重新生成

所有文案和数字都在 `scripts/render.mjs` 里，改完运行：

```bash
node scripts/render.mjs --fetch   # 拉取最新 GitHub 数据后重新生成
# 或
node scripts/render.mjs           # 用脚本内置快照生成（离线可用）
git add . && git commit -m "update profile" && git push
```

常见改动位置：

| 想改什么 | 位置（`scripts/render.mjs`） |
| --- | --- |
| 换头像 | 直接覆盖 `assets/avatar.jpg`（正方形，建议 ≥ 320×320），再运行脚本 |
| 配色（墨 / 纸 / 银 / 朱砂） | 顶部 `const C = { ... }` |
| 首屏文案：名字、英文名、诗句、三个小标签 | `buildHero()` 里的 `<text>` 与 `items` 数组 |
| 头像位置/大小 | `buildHero()` 顶部 `const av = { x, y, r }` |
| 北斗七星的形状与位置 | `buildHero()` 里的 `bowl` / `handle` 坐标 |
| 远山形状 / 云雾 | `landscape()` |
| 「精选作品」展示哪 6 个仓库 | `FEATURED` 数组（按仓库名回填真实 Star 数） |
| 技术栈胶囊 | `buildStack()` 里的 `rows` |
| 关于我 / 最近在忙 / 找到我 | `buildReadme()` |
| 页脚 | `buildFooter()` |
| 数据快照（离线时的兜底数字） | `SNAPSHOT` |

> ⚠️ 直接手改 `README.md` 或 `assets/hero.svg` 都会被下次生成覆盖，长期维护请改脚本。

---

## 7. 小贴士 & 常见问题

- **头像为什么是内嵌的**：GitHub 把 README 里的 SVG 当图片加载，SVG 内部的**外链图片不会加载**，所以头像是以 base64 直接内嵌进 `hero.svg` 的（约 +30KB，无影响）。换头像 = 换 `assets/avatar.jpg` + 重跑一次脚本。
- **首屏三个小标签**（嵌入式工程师 / 游戏开发 / 智能体开发者）在 `buildHero()` 的 `items` 数组里；「关于我」的自我介绍在 `buildReadme()`。
- **动效是真的**：北斗星呼吸、墨屑浮动、分隔线光点流动、云雾缓慢漂移 —— 全部是 SVG 内部动画，不需要 JS。
- **推荐暗色模式**：整套水墨是为 GitHub Dark 调的；浅色模式下会看到深色画面浮在白底上。
- **手机端**：横幅按 880px 设计，手机上会等比缩小，文字会偏小 —— 图片型主页的通病。
- **图片不显示**：确认 `assets/` 上传完整、路径大小写一致；首次推送有几分钟缓存，强刷（Ctrl/Cmd + Shift + R）。
- **本地预览**：`extras/preview.html` 是渲染好的页面快照，双击即可看（需与 `assets/` 保持相对位置）。
