const form = document.getElementById('applicationForm');
const sendCodeBtn = document.getElementById('sendCodeBtn');
const toast = document.getElementById('toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3600);
}

function setError(field, message) {
  if (!field) return;
  const wrapper = field.closest('.field');
  if (!wrapper) return;
  const error = wrapper.querySelector('.error');
  if (error) error.textContent = message || '';
}

function isPhone(value) {
  return /^1[3-9]\d{9}$/.test(value.trim());
}

// 第一版正式可用：暂时隐藏验证码区域，只保留手机号。
(function hideSmsFields() {
  if (sendCodeBtn) {
    const phoneRow = sendCodeBtn.closest('.phone-row');
    sendCodeBtn.style.display = 'none';
    if (phoneRow) phoneRow.style.gridTemplateColumns = '1fr';
  }

  const smsField = form.elements.smsCode;
  if (smsField) {
    smsField.removeAttribute('required');
    const smsWrapper = smsField.closest('.field');
    if (smsWrapper) smsWrapper.style.display = 'none';
  }
})();

function validateForm() {
  let valid = true;
  const requiredFields = ['studentName', 'age', 'educationStage', 'major', 'aiLevel', 'phone'];

  requiredFields.forEach((name) => {
    const field = form.elements[name];
    setError(field, '');
    if (!field || !String(field.value || '').trim()) {
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

  const consentError = document.querySelector('.consent-error');
  if (consentError) consentError.textContent = '';
  if (!form.elements.consent.checked) {
    if (consentError) consentError.textContent = '请勾选信息确认与联系授权';
    valid = false;
  }

  return valid;
}

function collectFormData() {
  const data = Object.fromEntries(new FormData(form).entries());
  data.goals = Array.from(form.querySelectorAll('input[name="goals"]:checked')).map(item => item.value);
  data.submittedAt = new Date().toISOString();
  data.sourcePage = window.location.href;
  return data;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!validateForm()) {
    showToast('请检查表单中标红的内容。');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : '';

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '正在提交...';
    }

    const data = collectFormData();

    const response = await fetch('/.netlify/functions/submit-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(result.message || '提交失败，请稍后重试');
    }

    form.reset();
    showToast('报名申请已提交成功，项目老师会尽快联系您。');
  } catch (error) {
    console.error('提交报名失败：', error);
    showToast(error.message || '提交失败，请稍后重试。');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText || '提交报名申请';
    }
  }
});
