// 零依赖的腾讯云OCR调用（仅用Node.js内置crypto模块）
// 避免 tencentcloud-sdk-nodejs 包太大、装不上的问题

const crypto = require('crypto');

/**
 * TC3-HMAC-SHA256 签名
 */
function sha256(message, secret = '') {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}
function sha256Hex(message) {
  return crypto.createHash('sha256').update(message).digest('hex');
}
function getDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
  const day = ('0' + date.getUTCDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

/**
 * 通用请求签名（适用于OCR等大部分腾讯云API）
 */
function signRequest(opts) {
  const { secretId, secretKey, service, region, action, version, payload, timestamp, host } = opts;

  const date = getDate(timestamp);
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const ct = 'application/json; charset=utf-8';
  const canonicalHeaders = `content-type:${ct}\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const hashedRequestPayload = sha256Hex(payload);
  const canonicalRequest =
    httpRequestMethod + '\n' +
    canonicalUri + '\n' +
    canonicalQueryString + '\n' +
    canonicalHeaders + '\n' +
    signedHeaders + '\n' +
    hashedRequestPayload;

  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign =
    algorithm + '\n' +
    timestamp + '\n' +
    credentialScope + '\n' +
    sha256Hex(canonicalRequest);

  // 密钥派生链: SecretKey -> SecretDate -> SecretService -> SecretSigning
  const secretDate = sha256(date, 'TC3' + secretKey);
  const secretService = sha256(service, secretDate);
  const secretSigning = sha256('tc3_request', secretService);
  const signature = sha256(stringToSign, secretSigning);

  return {
    Authorization: `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    Timestamp: timestamp,
  };
}

/**
 * 主入口
 */
exports.main_handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body; }
    catch { return { statusCode: 400, body: JSON.stringify({ success: false, error: '请求格式错误' }) }; }
  }
  const { image } = body || {};
  if (!image) return { statusCode: 400, body: JSON.stringify({ success: false, error: '缺少 image' }) };

  // 清理 base64
  let base64Content = image;
  const m = image.match(/^data:image\/\w+;base64,(.+)/);
  if (m) base64Content = m[1];

  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;
  const region = process.env.OCR_REGION || 'ap-guangzhou';
  const host = 'ocr.tencentcloudapi.com';
  const service = 'ocr';
  const action = 'GeneralBasicOCR';
  const version = '2018-11-19';
  const timestamp = Math.floor(Date.now() / 1000);

  const payload = JSON.stringify({
    ImageBase64: base64Content,
    LanguageType: 'zh',
    IsWords: false,
  });

  // 签名
  const auth = signRequest({
    secretId, secretKey, service, region, action, version, payload, timestamp, host,
  });

  // HTTP 请求
  const https = require('https');
  const result = await new Promise((resolve) => {
    const req = https.request({
      host,
      port: 443,
      method: 'POST',
      path: '/',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-TC-Action': action,
        'X-TC-Version': version,
        'X-TC-Timestamp': auth.Timestamp,
        'Authorization': auth.Authorization,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: '解析失败', raw: data });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(payload);
    req.end();
  });

  if (result.Response && result.Response.Error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: 'OCR调用失败', detail: result.Response.Error.Message }),
    };
  }

  const detections = (result.Response && result.Response.TextDetections || []).map(d => ({
    text: d.DetectedText || '',
    confidence: Math.round((d.Confidence || 0) * 100) / 100,
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      success: true,
      text: detections.map(d => d.text).join('\n'),
      detections,
    }),
  };
};
