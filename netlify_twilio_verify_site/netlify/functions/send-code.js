// Netlify Function: send-code
// 作用：调用 Twilio Verify 给用户手机号发送短信验证码。
// 必须在 Netlify 后台配置环境变量：
// TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

function normalizePhone(rawPhone) {
  const value = String(rawPhone || '').trim().replace(/[\s-]/g, '');

  // 中国大陆手机号：13800138000 -> +8613800138000
  if (/^1[3-9]\d{9}$/.test(value)) {
    return `+86${value}`;
  }

  // 国际格式：+14155552671 / +8613800138000
  if (/^\+[1-9]\d{7,14}$/.test(value)) {
    return value;
  }

  return '';
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: '只支持 POST 请求' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    return json(500, {
      ok: false,
      message: '服务器短信配置缺失，请检查 Netlify 环境变量。'
    });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false, message: '请求格式错误' });
  }

  const to = normalizePhone(payload.phone);
  if (!to) {
    return json(400, { ok: false, message: '手机号格式不正确，请输入中国大陆手机号或 +国家码手机号。' });
  }

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const params = new URLSearchParams();
    params.append('To', to);
    params.append('Channel', 'sms');

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Twilio send-code error:', result);
      return json(502, {
        ok: false,
        message: result.message || '验证码发送失败，请稍后重试。'
      });
    }

    return json(200, {
      ok: true,
      message: '验证码已发送，请查看手机短信。'
    });
  } catch (error) {
    console.error('send-code exception:', error);
    return json(500, { ok: false, message: '服务器异常，验证码发送失败。' });
  }
};
