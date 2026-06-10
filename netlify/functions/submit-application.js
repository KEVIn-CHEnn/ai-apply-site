const FEISHU_TOKEN_URL = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: '只支持 POST 请求' }),
    };
  }

  try {
    const {
      FEISHU_APP_ID,
      FEISHU_APP_SECRET,
      FEISHU_APP_TOKEN,
      FEISHU_TABLE_ID,
    } = process.env;

    if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_APP_TOKEN || !FEISHU_TABLE_ID) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, message: 'Netlify 环境变量未配置完整' }),
      };
    }

    const data = JSON.parse(event.body || '{}');

    if (!data.studentName || !data.age || !data.educationStage || !data.major || !data.aiLevel || !data.phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: '缺少必填报名信息' }),
      };
    }

    const tokenRes = await fetch(FEISHU_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
      }),
    });

    const tokenJson = await tokenRes.json();

    if (!tokenRes.ok || tokenJson.code !== 0 || !tokenJson.tenant_access_token) {
      console.error('获取飞书 tenant_access_token 失败：', tokenJson);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, message: '获取飞书授权失败，请检查 App ID / Secret / 应用权限' }),
      };
    }

    const recordUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records`;

    const fields = {
      '提交时间': data.submittedAt ? new Date(data.submittedAt).getTime() : Date.now(),
      '学生姓名': data.studentName || '',
      '年龄': Number(data.age) || null,
      '当前阶段': data.educationStage || '',
      '学校名称': data.school || '',
      '兴趣方向': data.major || '',
      'AI基础': data.aiLevel || '',
      '提升目标': Array.isArray(data.goals) ? data.goals.join('、') : '',
      '家长姓名': data.parentName || '',
      '关系': data.relation || '',
      '手机号': data.phone || '',
      '微信邮箱': data.contact || '',
      '补充说明': data.notes || '',
      '来源页面': data.sourcePage || '',
    };

    const createRes = await fetch(recordUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${tokenJson.tenant_access_token}`,
      },
      body: JSON.stringify({ fields }),
    });

    const createJson = await createRes.json();

    console.log(
  'APP_TOKEN:',
  FEISHU_APP_TOKEN,
  'TABLE_ID:',
  FEISHU_TABLE_ID,
  'RESULT:',
  JSON.stringify(createJson)
);
    
    if (!createRes.ok || createJson.code !== 0) {
      console.error('写入飞书多维表格失败：', createJson);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, message: `写入飞书失败：${createJson.msg || '未知错误'}` }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: '报名信息已保存', recordId: createJson.data?.record?.record_id }),
    };
  } catch (error) {
    console.error('submit-application error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: '服务器错误，请稍后重试' }),
    };
  }
};
