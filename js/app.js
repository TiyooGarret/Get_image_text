document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const statusText = document.getElementById('statusText');
    const resultContainer = document.getElementById('resultContainer');
    const resultText = document.getElementById('resultText');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    // 支持的图片类型
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    
    // 初始化worker
    let worker = null;

    // 更新状态显示
    function updateStatus(message, progress = null) {
        statusText.textContent = message;
        if (progress !== null) {
            progressBar.style.width = `${progress}%`;//
        }
    }
    
    // 预加载语言模型
    async function initializeWorker() {
        try {
            updateStatus('正在初始化...');
            progressContainer.hidden = false;
            
            // 创建worker，直接指定中文简体和英文
            worker = await Tesseract.createWorker('chi_sim+eng'); //
            
            updateStatus('初始化完成，请上传图片');
            progressContainer.hidden = true; 
            
            // 启用上传按钮
            uploadBtn.disabled = false;
            dropArea.style.opacity = '1';
            
        } catch (error) {
            console.error('初始化错误:', error);
            updateStatus(`初始化失败: ${error.message}。请刷新页面重试。`);
            uploadBtn.disabled = true;
            dropArea.style.opacity = '0.5';
        }
    }

    // 页面加载时初始化
    initializeWorker();

    // 拖放区域事件处理
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        if (!uploadBtn.disabled) {
            dropArea.classList.add('highlight');
        }
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    // 处理拖放文件
    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        if (uploadBtn.disabled) return;
        
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            handleFiles(files);
        }
    }

    // 点击上传区域触发文件选择
    dropArea.addEventListener('click', () => {
        if (!uploadBtn.disabled) {
            fileInput.click();
        }
    });

    // 文件选择变化处理
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFiles(fileInput.files);
        }
    });

    // 上传按钮点击事件
    uploadBtn.addEventListener('click', () => {
        if (!uploadBtn.disabled) {
            fileInput.click();
        }
    });

    // 处理选择的文件
    function handleFiles(files) {
        const file = files[0];
        
        // 检查文件类型
        if (!supportedTypes.includes(file.type)) {
            alert('请上传支持的图片格式：JPG, PNG, GIF, BMP, WebP');
            return;
        }
        
        // 显示图片预览
        previewContainer.hidden = false;
        const reader = new FileReader();
        
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            // 开始OCR处理
            processImage(file);
        };
        
        reader.onerror = (error) => {
            console.error('文件读取错误:', error);
            updateStatus('文件读取失败，请重试');
        };
        
        reader.readAsDataURL(file);
    }

    // 处理图片OCR
    async function processImage(file) {
        if (!worker) {
            updateStatus('OCR引擎未初始化，请刷新页面重试');
            return;
        }

        // 显示进度条
        progressContainer.hidden = false;
        resultContainer.hidden = true;
        progressBar.style.width = '0%';
        updateStatus('正在准备识别...');
        
        try {
            updateStatus('正在识别文字...', 30);
            
            // 执行OCR识别
            const result = await worker.recognize(file);
            
            // 显示结果
            resultContainer.hidden = false;
            resultText.textContent = result.data.text || '未能识别出文字';
            updateStatus('识别完成', 100);
            
        } catch (error) {
            console.error('OCR处理错误:', error);
            updateStatus(`识别失败: ${error.message}`);
            resultContainer.hidden = true;
        }
    }

    // 复制文本按钮
    copyBtn.addEventListener('click', () => {
        if (!resultText.textContent) return;
        
        navigator.clipboard.writeText(resultText.textContent)
            .then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '已复制!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('复制失败:', err);
                alert('复制失败，请手动选择文本并复制');
            });
    });

    // 下载文本按钮
    downloadBtn.addEventListener('click', () => {
        if (!resultText.textContent) return;
        
        const blob = new Blob([resultText.textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OCR结果_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}); 