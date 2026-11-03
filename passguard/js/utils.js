const PG = (() => {
  const USERS_KEY = "passguard_users";
  const SESSION_KEY = "passguard_session";
  const SETTINGS_KEY = "passguard_settings";

  function sha256(ascii) {
    function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
    const mathPow = Math.pow, maxWord = mathPow(2, 32), lengthProperty = "length";
    let i, j, result = "", words = [], asciiBitLength = ascii[lengthProperty] * 8;
    let hash = sha256.h = sha256.h || [], k = sha256.k = sha256.k || [], primeCounter = k[lengthProperty];
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += "\x80";
    while (ascii[lengthProperty] % 64 - 56) ascii += "\x00";
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return "";
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength);
    for (j = 0; j < words[lengthProperty];) {
      const w = words.slice(j, j += 16), oldHash = hash.slice(0);
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        const i2 = i + j, w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0);
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
        hash.pop();
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? "0" : "") + b.toString(16);
      }
    }
    return result;
  }

  function getSettings() {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    return saved || { validityDays: 30, warningDays: 5 };
  }

  function setSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function isoDate(date = new Date()) {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + Number(days));
    return d;
  }

  function seedAdmin() {
    const users = getUsers();
    if (!users.some(u => u.role === "admin")) {
      const now = new Date();
      const admin = {
        id: "admin-001",
        name: "System Administrator",
        username: "admin",
        email: "admin@passguard.local",
        passwordHash: sha256("Admin@123"),
        role: "admin",
        accountStatus: "Active",
        createdAt: isoDate(now),
        passwordCreatedAt: isoDate(now),
        passwordExpiryAt: isoDate(addDays(now, 3650))
      };
      users.push(admin);
      saveUsers(users);
    }
    if (!localStorage.getItem(SETTINGS_KEY)) setSettings({ validityDays: 30, warningDays: 5 });
  }

  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  }

  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      userId: user.id,
      role: user.role,
      loginAt: new Date().toISOString()
    }));
  }

  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function currentUser() {
    const session = getSession();
    if (!session) return null;
    return getUsers().find(u => u.id === session.userId) || null;
  }

  function requireAuth(role) {
    const user = currentUser();
    if (!user) {
      location.href = "index.html";
      return null;
    }
    if (user.accountStatus !== "Active") {
      clearSession();
      location.href = "index.html?inactive=1";
      return null;
    }
    if (role && user.role !== role) {
      location.href = user.role === "admin" ? "admin.html" : "dashboard.html";
      return null;
    }
    return user;
  }

  function getPasswordStatus(user) {
    const now = new Date();
    const expiry = new Date(user.passwordExpiryAt);
    const msPerDay = 1000 * 60 * 60 * 24;
    const remainingDays = Math.max(0, Math.ceil((expiry - now) / msPerDay));
    const warningDays = getSettings().warningDays;
    if (expiry <= now) return { key: "Expired", label: "Expired", remainingDays: 0 };
    if (remainingDays <= warningDays) return { key: "Warning", label: "Expiring Soon", remainingDays };
    return { key: "Active", label: "Active", remainingDays };
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(undefined, {
      day: "2-digit", month: "short", year: "numeric"
    });
  }

  function daysTotal(user) {
    return Math.max(1, Math.ceil((new Date(user.passwordExpiryAt) - new Date(user.passwordCreatedAt)) / 86400000));
  }

  function strength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length >= 12) score++;
    if (score <= 2) return {label:"Weak", percent:30, level:"weak"};
    if (score <= 4) return {label:"Medium", percent:65, level:"medium"};
    return {label:"Strong", percent:100, level:"strong"};
  }

  function validPassword(password) {
    return password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password);
  }

  function showMessage(el, text, type="error") {
    if (!el) return;
    el.textContent = text;
    el.className = `message ${type}`;
    el.classList.remove("hidden");
  }

  function hideMessage(el) {
    if (el) el.classList.add("hidden");
  }

  function escapeHtml(value="") {
    return value.replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    })[m]);
  }

  function logout() {
    clearSession();
    location.href = "index.html";
  }

  function togglePassword(button) {
    const input = button.parentElement.querySelector("input");
    input.type = input.type === "password" ? "text" : "password";
    button.textContent = input.type === "password" ? "Show" : "Hide";
  }

  seedAdmin();

  return {
    sha256,getSettings,setSettings,getUsers,saveUsers,isoDate,addDays,
    getSession,setSession,clearSession,currentUser,requireAuth,getPasswordStatus,
    formatDate,daysTotal,strength,validPassword,showMessage,hideMessage,
    escapeHtml,logout,togglePassword
  };
})();