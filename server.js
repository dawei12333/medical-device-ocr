/**
 * 医疗设备铭牌识别APP — 腾讯云OCR代理服务
 *
 * 职责：
 *   1. 提供静态文件服务（index.html + PWA资源）
 *   2. 代理OCR请求到腾讯云，保护API密钥不泄露到客户端
 *
 * 启动：node server.js
 * 需要：.env 中配置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY
 */

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 初始化腾讯云OCR SDK
let OcrClient = null;
let clientReady = false;
let clientError = null;

if (process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY) {
  try {
    const tencentcloud = require('tencentcloud-sdk-nodejs');
    const OcrClientClass = tencentcloud.ocr.v20181119.Client;

    const clientConfig = {
      credential: {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
      },
      region: process.env.OCR_REGION || 'ap-guangzhou',
      profile: {
        httpProfile: {
          endpoint: 'ocr.tencentcloudapi.com',
          reqTimeout: 15,
          // 启用连接池复用，避免每次请求都重建 TCP + TLS
          keepAlive: true,
        },
      },
    };

    OcrClient = new OcrClientClass(clientConfig);
    clientReady = true;
    console.log('✅ 腾讯云OCR客户端初始化成功 (region: ' + (process.env.OCR_REGION || 'ap-guangzhou') + ')');
  } catch (err) {
    clientError = 'SDK初始化失败: ' + err.message;
    console.error('❌', clientError);
  }
} else {
  clientError = '缺少 TENCENT_SECRET_ID 或 TENCENT_SECRET_KEY 环境变量，请在 .env 文件中配置';
  console.warn('⚠️ ', clientError);
}

const app = express();
const PORT = process.env.PORT || 3000;

// 解析JSON body（限制 10MB）
app.use(express.json({ limit: '10mb' }));
// 解析二进制 body（API/ocr 使用，限制 10MB，直接传原始二进制图片）
app.use('/api/ocr', express.raw({ type: 'image/*', limit: '10mb' }));

// ========== 健康检查 ==========
app.get('/api/health', (req, res) => {
  res.json({
    status: clientReady ? 'ok' : 'unconfigured',
    ocrReady: clientReady,
    message: clientReady ? 'OCR服务就绪' : (clientError || 'API密钥未配置'),
  });
});

// ========== OCR识别接口（支持 JSON base64 + 二进制图片） ==========
app.post('/api/ocr', async (req, res) => {
  // 1. 密钥未配置
  if (!clientReady) {
    return res.status(503).json({
      success: false,
      error: 'OCR引擎未就绪',
      detail: clientError || '请在 .env 文件中配置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY',
    });
  }

  // 2. 提取图片数据：支持 binary 和 JSON base64 两种格式
  let base64Content;
  if (Buffer.isBuffer(req.body)) {
    // 二进制上传 — 直接转 base64（最快路径）
    base64Content = req.body.toString('base64');
  } else {
    // JSON base64 上传（兼容旧版）
    const { image } = req.body || {};
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 image 参数' });
    }
    const base64Match = image.match(/^data:image\/\w+;base64,(.+)/);
    base64Content = base64Match ? base64Match[1] : image;
  }

  // 4. 大小检查（腾讯云限制 ImageBase64 ≤ 7MB）
  const sizeMB = (base64Content.length * 0.75) / (1024 * 1024);
  if (sizeMB > 7) {
    return res.status(413).json({
      success: false,
      error: `图片过大（${sizeMB.toFixed(1)}MB），请压缩至 7MB 以内`,
    });
  }

  // 5. 调用腾讯云OCR（加上计时）
  const t0 = Date.now();
  try {
    const params = {
      ImageBase64: base64Content,
      LanguageType: 'zh',
      IsWords: false,  // 按行返回，非按词
    };

    const result = await OcrClient.GeneralBasicOCR(params);
    const ocrTime = Date.now() - t0;

    // 6. 组装返回
    const detections = (result.TextDetections || []).map(d => ({
      text: d.DetectedText || '',
      confidence: Math.round((d.Confidence || 0) * 100) / 100,
    }));

    const fullText = detections.map(d => d.text).join('\n');

    console.log(`⏱️ OCR服务器: ${ocrTime}ms · ${fullText.length}字符 · ${detections.length}检测项`);

    res.json({
      success: true,
      text: fullText,
      detections: detections,
      totalDetections: detections.length,
      ocrTimeMs: ocrTime,
    });
  } catch (err) {
    console.error('OCR API Error:', err.message);
    res.status(500).json({
      success: false,
      error: '腾讯云OCR调用失败',
      detail: err.message || '未知错误',
      code: err.code || 'UNKNOWN',
    });
  }
});

// ========== 静态文件服务 ==========
app.use(express.static(__dirname));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== 启动 ==========
app.listen(PORT, () => {
  console.log(`\n🚀 医疗设备铭牌识别服务已启动`);
  console.log(`   📱 前端地址: http://localhost:${PORT}`);
  console.log(`   🔍 OCR接口: http://localhost:${PORT}/api/ocr`);
  console.log(`   💚 健康检查: http://localhost:${PORT}/api/health`);
  if (!clientReady) {
    console.log(`   ⚠️  OCR未就绪 — 请配置 .env 文件后重启\n`);
  }
  console.log('');
});
