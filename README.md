# 🔧 在线工具箱

免费在线实用工具集合，浏览器端处理，不上传服务器。

## 🛠 工具列表

| 工具 | 说明 | 技术 |
|------|------|------|
| 🖼️ 图片压缩 | 压缩 JPEG/PNG/WebP，滑块控制质量 | Canvas API |
| 📱 二维码生成器 | 文本/网址/WiFi/名片生成二维码 | 自实现 QR 码算法 |
| { } JSON 格式化 | 格式化/校验/压缩 JSON | JSON.parse/stringify |
| 📝 文本对比 | LCS 算法对比文本差异 | 行级 Diff 算法 |
| 📄 Markdown 编辑器 | 实时预览/导出 HTML | 自实现 Markdown 解析器 |
| 🔑 密码生成器 | 高强度随机密码生成 | crypto.getRandomValues |
| 🔗 短链接生成器 | 长网址转短链接 | is.gd API |
| 🖼️ 图片转文字 (OCR) | 图片文字识别，支持中英文 | Tesseract.js |
| 📄 PDF 转 Word | PDF 提取文字并生成 Word 文档 | PDF.js + docx |

## 🚀 部署方式

### 方案一：Vercel (推荐，免费)
1. 注册 [Vercel](https://vercel.com) 账号
2. 安装 Vercel CLI: `npm i -g vercel`
3. 在项目目录运行: `vercel --prod`
4. 绑定自定义域名

### 方案二：GitHub Pages (免费)
1. 在 GitHub 新建仓库
2. 推送代码: 
   ```
   git init
   git add .
   git commit -m "init"
   git remote add origin <你的仓库地址>
   git push -u origin main
   ```
3. 仓库 Settings → Pages → 选择 main 分支

### 方案三：Netlify (免费)
1. 注册 [Netlify](https://netlify.com)
2. 拖拽项目文件夹到 Netlify 部署页面
3. 或连接 GitHub 仓库自动部署

### 方案四：自己买服务器
1. 安装 Nginx
2. 把项目文件放到 `/var/www/html/`
3. 配置域名和 SSL (Let's Encrypt 免费)

## 💰 盈利方式

1. **Google AdSense** — 流量到了每天 100+ IP 就可以申请
2. **百度联盟** — 中文站首选，门槛较低
3. **付费去水印** — 核心功能免费，高级功能收费
4. **SEO 优化** — 每个工具有独立页面，针对关键词优化

## 📝 开发

```bash
# 本地运行
npm start

# 或直接用浏览器打开 index.html
```

所有工具均为纯前端实现，无需后端服务器。
