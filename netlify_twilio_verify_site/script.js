const form = document.getElementById('applicationForm');
const sendCodeBtn = document.getElementById('sendCodeBtn');
const toast = document.getElementById('toast');

let countdown = 0;
let timer = null;
let codeSent = false;
let lastCodePhone = '';

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3600);
}

function setError(field, message) {
  const wrapper = field.closest('.field');
  if (!wrapper) return;
  const error = wrapper.querySelector('.error');
  if (error) error.textContent = message || '';
}

function isPhone(value) {
  const phone = String(value || '').trim().replace(/[\s-]/g, '');
  // 支持中国大陆手机号，也支持 +国家码 的国际手机号
  return /^1[3-9]\d{9}$/.test(phone) || /^\+[1-9]\d{7,14}$/.test(phone);
}

function startCountdown() {
  countdown = 60;
  sendCodeBtn.disabled = true;
  sendCodeBtn.textContent = `${countdown}s 后重试`;

  timer = setInterval(() => {
    countdown -= 1;
    sendCodeBtn.textContent = `${countdown}s 后重试`;

    if (countdown <= 0) {
      clearInterval(timer);
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = '获取验证码';
    }
  }, 1000);
}

async function postJSON(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || '服务器请求失败，请稍后重试。');
  }

  return result;
}

sendCodeBtn.addEventListener('click', async () => {
  const phoneInput = form.elements.phone;
  const phone = phoneInput.value.trim();
  setError(phoneInput, '');

  if (!isPhone(phone)) {
    setError(phoneInput, '请输入正确手机号，例如 13800138000 或 +8613800138000');
    return;
  }

  sendCodeBtn.disabled = true;
  sendCodeBtn.textContent = '发送中...';

  try {
    const result = await postJSON('/.netlify/functions/send-code', { phone });
    codeSent = true;
    lastCodePhone = phone;
    showToast(result.message || '验证码已发送，请查看手机短信。');
    startCountdown();
  } catch (error) {
    sendCodeBtn.disabled = false;
    sendCodeBtn.textContent = '获取验证码';
    showToast(error.message || '验证码发送失败，请稍后重试。');
  }
});

function validateBasicForm() {
  let valid = true;
  const requiredFields = ['studentName', 'age', 'educationStage', 'major', 'aiLevel', 'phone', 'smsCode'];

  requiredFields.forEach((name) => {
    const field = form.elements[name];
    setError(field, '');
    if (!field.value.trim()) {
      setError(field, '此项为必填项');
      valid = false;
    }
  });

  const age = Number(form.elements.age.value);
  if (form.elements.age.value && (age < 12 || age > 30)) {
    setError(form.elements.age, '年龄建议填写 12-30 岁之间');
    valid = false;
  }

  if (form.elements.phone.value && !isPhone(form.elements.phone.value)) {
    setError(form.elements.phone, '请输入正确手机号，例如 13800138000 或 +8613800138000');
    valid = false;
  }

  if (!codeSent) {
    setError(form.elements.smsCode, '请先获取验证码');
    valid = false;
  }

  if (codeSent && form.elements.phone.value.trim() !== lastCodePhone) {
    setError(form.elements.phone, '手机号已变更，请重新获取验证码');
    valid = false;
  }

  const consentError = document.querySelector('.consent-error');
  consentError.textContent = '';
  if (!form.elements.consent.checked) {
    consentError.textContent = '请勾选信息确认与联系授权';
    valid = false;
  }

  return valid;
}

function collectFormData() {
  const data = Object.fromEntries(new FormData(form).entries());
  data.goals = Array.from(form.querySelectorAll('input[name="goals"]:checked')).map(item => item.value);
  data.submittedAt = new Date().toISOString();
  return data;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!validateBasicForm()) {
    showToast('请检查表单中标红的内容。');
    return;
  }

  const submitBtn = form.querySelector('.submit-btn');
  const oldText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '提交中...';

  try {
    const phone = form.elements.phone.value.trim();
    const code = form.elements.smsCode.value.trim();

    const verifyResult = await postJSON('/.netlify/functions/verify-code', { phone, code });

    if (!verifyResult.verified) {
      setError(form.elements.smsCode, verifyResult.message || '验证码不正确或已过期');
      showToast('验证码不正确，请重新检查。');
      return;
    }

    const data = collectFormData();
    console.log('报名申请数据：', data);

    // 下一步可以在这里接入报名数据保存接口，例如：
    // 1. 飞书多维表格 Webhook
    // 2. 企业微信机器人
    // 3. Airtable / Notion API
    // 4. 自建数据库接口

    form.reset();
    codeSent = false;
    lastCodePhone = '';
    showToast('报名申请已提交，项目老师会尽快联系你。');
  } catch (error) {
    showToast(error.message || '提交失败，请稍后重试。');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = oldText;
  }
});
