# 图片文字识别工具

这是一个简单的网页应用，可以从上传的图片中识别并提取文字内容。该工具使用Tesseract.js进行OCR（光学字符识别）处理，支持中文和英文文本识别。

## 功能特点

- 支持拖放或点击上传图片
- 支持多种图片格式：JPG, PNG, GIF, BMP, WebP
- 实时显示识别进度
- 支持中英文文本识别
- 可以复制识别结果或下载为文本文件
- 响应式设计，适配移动设备

## 使用方法

1. 打开`index.html`文件在浏览器中运行
2. 点击上传区域或拖放图片到指定区域
3. 等待OCR处理完成
4. 查看识别结果，可以复制或下载文本

## 技术实现

- 前端：HTML, CSS, JavaScript
- OCR引擎：Tesseract.js
- 无需后端服务器，完全在浏览器中运行

## 注意事项

- 图片质量越高，识别效果越好
- 对于复杂背景或模糊图片，识别效果可能不佳
- 首次使用时需要下载语言模型，可能需要一些时间
- 处理大图片时可能会消耗较多内存和CPU资源

## 本地运行

由于浏览器安全限制，如果直接打开HTML文件可能无法正常加载Tesseract.js。建议使用以下方法之一运行：

1. 使用Visual Studio Code的Live Server插件
2. 使用Python简易HTTP服务器：
   ```
   python -m http.server
   ```
   然后访问 http://localhost:8000

3. 使用Node.js的http-server：
   ```
   npx http-server
   ```
   然后访问 http://localhost:8080


   

## 许可证

MIT 