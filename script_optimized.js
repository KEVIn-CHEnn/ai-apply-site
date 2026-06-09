const form = document.getElementById('applicationForm');
const sendCodeBtn = document.getElementById('sendCodeBtn');
const toast = document.getElementById('toast');

let demoCode = '';
let countdown = 0;
let timer = null;

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
  return /^1[3-9]\d{9}$/.test(value.trim());
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

sendCodeBtn.addEventListener('click', () => {
  const phoneInput = form.elements.phone;
  const phone = phoneInput.value;
  setError(phoneInput, '');

  if (!isPhone(phone)) {
    setError(phoneInput, '请输入正确的 11 位手机号');
    return;
  }

  demoCode = String(Math.floor(100000 + Math.random() * 900000));
  startCountdown();

  // 正式上线时，在这里调用后端短信接口，例如：
  // fetch('/api/send-sms-code', { method: 'POST', body: JSON.stringify({ phone }) })
  showToast(`演示验证码：${demoCode}。正式上线后这里会改为短信发送。`);
});

function validateForm() {
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
    setError(form.elements.phone, '请输入正确的 11 位手机号');
    valid = false;
  }

  if (!demoCode) {
    setError(form.elements.smsCode, '请先获取验证码');
    valid = false;
  } else if (form.elements.smsCode.value.trim() !== demoCode) {
    setError(form.elements.smsCode, '验证码不正确');
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

form.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!validateForm()) {
    showToast('请检查表单中标红的内容。');
    return;
  }

  const data = collectFormData();
  console.log('报名申请数据：', data);

  // 静态网站无法直接保存数据。正式上线时，可在这里接入：
  // 1. 飞书 / 企业微信 / Airtable / Notion 表单接口
  // 2. 自建后端 API
  // 3. 第三方表单平台 Webhook

  form.reset();
  demoCode = '';
  showToast('报名申请已提交。正式上线后这里会写入后台并通知运营人员。');
});
