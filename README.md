# 📷 相册 · 使用说明

一个简约照片墙相册，点开照片可以大图浏览。托管在 GitHub Pages 上，任何人拿到链接都能看。

## 怎么换照片（不用懂代码）

所有照片都在 **`photos.json`** 这个文件里管理。用记事本打开它，格式长这样：

```json
{
  "title": "我们的相册",          ← 相册标题
  "description": "一句话介绍",     ← 相册副标题
  "photos": [
    { "src": "images/01.jpg", "title": "照片标题", "caption": "照片说明" },
    { "src": "images/02.jpg", "title": "第二张",   "caption": "想说的话" }
  ]
}
```

**加照片的步骤：**

1. 把照片文件放进 `images/` 文件夹（推荐 JPG/PNG，单张别超过 3MB）
2. 在 `photos.json` 的 `photos` 列表里加一行：`{ "src": "images/你的文件名.jpg", "title": "标题", "caption": "说明" }`
3. 保存文件，然后把这个文件夹整个上传到 GitHub 仓库即可（页面自动更新）

**其他小改：**

- 改相册名字 → 改 `title`
- 换照片顺序 → 调换 `photos` 里行的顺序
- 不要的 → 删掉那一行

## 朋友怎么传照片（不用懂代码）

给朋友看这个页面就行：**`how-to-upload.html`**（线上地址：`https://jaxketpodra.github.io/photo-album/how-to-upload.html`），3 步图文教程：传图 → 改一行 → 提交。

前提：朋友需要有 GitHub 账号，并被加为仓库 collaborator。

## 本地预览

在项目文件夹里运行：

```bash
python -m http.server 8000
```

浏览器打开 `http://localhost:8000` 即可（注意：直接双击 index.html 打开会没图，必须用服务器方式）。

## 技术说明

- 纯静态：HTML + CSS + JS，无框架无依赖
- 瀑布流布局，响应式（手机/平板/电脑自动适配）
- `script.js` 负责读取 photos.json 渲染照片墙和点开大图（支持键盘 ← → 翻页、Esc 关闭）
