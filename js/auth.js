(() => {
  'use strict';

  const USERS_KEY = 'b4yeojung.users.v1';
  const SESSION_KEY = 'b4yeojung.session.v1';
  const $ = selector => document.querySelector(selector);
  const loginPanel = $('#loginPanel');
  const signupPanel = $('#signupPanel');
  const authView = $('#authView');

  const readUsers = () => {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch { return []; }
  };
  const writeUsers = users => localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const message = (form, text, success = false) => {
    const area = form.querySelector('.form-message');
    area.textContent = text;
    area.classList.toggle('success', success);
  };
  const normalizeEmail = email => email.trim().toLowerCase();
  const hash = async value => {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  };
  const getSession = () => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  };
  const setSession = user => sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
  const notifyAuthChange = () => window.dispatchEvent(new Event('b4authchange'));

  function updateHeader() {
    const session = getSession();
    $('.auth-login-link').hidden = Boolean(session);
    $('.auth-signup-link').hidden = Boolean(session);
    const menu = $('.member-menu');
    menu.hidden = !session;
    menu.style.display = session ? 'inline-flex' : '';
    if (session) $('.member-name').textContent = `${session.name}님`;
  }

  function renderAuth() {
    const path = location.hash.slice(1);
    const active = path === 'login' || path === 'signup';
    authView.hidden = !active;
    if (!active) {
      document.body.classList.remove('auth-page');
      return;
    }
    document.querySelectorAll('.auth-panel form').forEach(form => {
      form.reset();
      message(form, '');
    });
    $('#homeView').hidden = true;
    $('#detailView').hidden = true;
    document.body.classList.add('auth-page');
    loginPanel.hidden = path !== 'login';
    signupPanel.hidden = path !== 'signup';
    document.title = `${path === 'login' ? '로그인' : '회원가입'} | B4 YEOJUNG`;
    const firstInput = (path === 'login' ? loginPanel : signupPanel).querySelector('input');
    requestAnimationFrame(() => firstInput.focus());
  }

  $('#signupForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = data.get('name').trim();
    const email = normalizeEmail(data.get('email'));
    const password = data.get('password');
    const confirmation = data.get('passwordConfirm');
    if (name.length < 2) return message(form, '이름은 2자 이상 입력해 주세요.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return message(form, '올바른 이메일 주소를 입력해 주세요.');
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) return message(form, '비밀번호는 영문과 숫자를 포함해 8자 이상이어야 합니다.');
    if (password !== confirmation) return message(form, '비밀번호 확인이 일치하지 않습니다.');
    const users = readUsers();
    if (users.some(user => user.email === email)) return message(form, '이미 가입된 이메일입니다. 로그인해 주세요.');
    const user = { name, email, passwordHash: await hash(password), createdAt: new Date().toISOString() };
    writeUsers([...users, user]);
    setSession(user);
    updateHeader();
    notifyAuthChange();
    message(form, '회원가입이 완료되었습니다. 잠시 후 홈으로 이동합니다.', true);
    form.reset();
    setTimeout(() => { location.hash = 'home'; }, 800);
  });

  $('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = normalizeEmail(data.get('email'));
    const password = data.get('password');
    const user = readUsers().find(item => item.email === email);
    if (!user || user.passwordHash !== await hash(password)) return message(form, '이메일 또는 비밀번호가 올바르지 않습니다.');
    setSession(user);
    updateHeader();
    notifyAuthChange();
    message(form, `${user.name}님, 로그인되었습니다. 잠시 후 홈으로 이동합니다.`, true);
    form.reset();
    setTimeout(() => { location.hash = 'home'; }, 600);
  });

  $('.logout-button').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    updateHeader();
    notifyAuthChange();
    location.hash = 'home';
  });

  updateHeader();
  window.B4Auth = Object.freeze({ getSession, isLoggedIn: () => Boolean(getSession()) });
  renderAuth();
  window.addEventListener('hashchange', renderAuth);
})();
