/**
 * CloudBase云函数 - OCR代理
 * 接收base64图片，调用腾讯云OCR，返回识别文本
 */
const tencentcloud = require('tencentcloud-sdk-nodejs');
const OcrClient = tencentcloud.ocr.v20181119.Client;

let client = null;

function getClient() {
  if (!client) {
    const clientConfig = {
      credential: {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
      },
      region: process.env.OCR_REGION || 'ap-guangzhou',
      profile: {
        httpProfile: {
          endpoint: 'ocr.tencentcloudapi.com',
          reqTimeout: 30,
        },
      },
    };
    client = new OcrClient(clientConfig);
  }
  return client;
}

exports.main = async (event, context) => {
  // CloudBase HTTP触发：event.body 包含请求体
  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: '请求格式错误' }) };
  }

  const { image } = body || {};
  if (!image || typeof image !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: '缺少 image 参数' }) };
  }

  // 去除base64前缀
  let base64Content = image;
  const m = image.match(/^data:image\/\w+;base64,(.+)/);
  if (m) base64Content = m[1];

  // 大小检查
  const sizeMB = (base64Content.length * 0.75) / (1024 * 1024);
  if (sizeMB > 7) {
    return { statusCode: 413, body: JSON.stringify({ success: false, error: '图片过大' }) };
  }

  try {
    const params = {
      ImageBase64: base64Content,
      LanguageType: 'zh',
      IsWords: false,
    };

    const result = await getClient().GeneralBasicOCR(params);
    const detections = (result.TextDetections || []).map(d => ({
      text: d.DetectedText || '',
      confidence: Math.round((d.Confidence || 0) * 100) / 100,
    }));
    const fullText = detections.map(d => d.text).join('\n');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        text: fullText,
        detections,
        totalDetections: detections.length,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: 'OCR调用失败',
        detail: err.message || '未知错误',
      }),
    };
  }
};
