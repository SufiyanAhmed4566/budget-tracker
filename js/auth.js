document.addEventListener("DOMContentLoaded", () => {
  const session = PG.getSession();
  if (session) {
    const user = PG.currentUser();
    if (user) location.href = user.role === "admin" ? "admin.html" : "dashboard.html";
  }

  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const message = document.getElementById("authMessage");

  function setTab(type) {
    const login = type === "login";
    loginForm.classList.toggle("hidden", !login);
    registerForm.classList.toggle("hidden", login);
    loginTab.classList.toggle("active", login);
    registerTab.classList.toggle("active", !login);
    PG.hideMessage(message);
  }

  loginTab.addEventListener("click", () => setTab("login"));
  registerTab.addEventListener("click", () => setTab("register"));
  document.querySelectorAll("[data-go-register]").forEach(el =>
    el.addEventListener("click", e => { e.preventDefault(); setTab("register"); })
  );

  const params = new URLSearchParams(location.search);
  if (params.get("inactive")) PG.showMessage(message, "This account is inactive. Contact the administrator.", "error");

  loginForm.addEventListener("submit", e => {
    e.preventDefault();
    PG.hideMessage(message);
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    const user = PG.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user || user.passwordHash !== PG.sha256(password)) {
      PG.showMessage(message, "Invalid username or password.");
      return;
    }
    if (user.accountStatus !== "Active") {
      PG.showMessage(message, "Your account is inactive. Contact the administrator.");
      return;
    }

    PG.setSession(user);

    if (user.role === "admin") {
      location.href = "admin.html";
      return;
    }

    const status = PG.getPasswordStatus(user);
    location.href = status.key === "Expired" ? "change-password.html?expired=1" : "dashboard.html";
  });

  const regPassword = document.getElementById("regPassword");
  const strengthBar = document.getElementById("strengthBar");
  const strengthLabel = document.getElementById("strengthLabel");

  regPassword.addEventListener("input", () => {
    const s = PG.strength(regPassword.value);
    strengthBar.style.width = s.percent + "%";
    strengthBar.style.background =
      s.level === "strong" ? "#10b981" :
      s.level === "medium" ? "#f59e0b" : "#ef4444";
    strengthLabel.textContent = regPassword.value ? `${s.label} password` : "Use 8+ characters with upper, lower, number and symbol.";
  });

  registerForm.addEventListener("submit", e => {
    e.preventDefault();
    PG.hideMessage(message);

    const name = document.getElementById("regName").value.trim();
    const username = document.getElementById("regUsername").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = regPassword.value;
    const confirm = document.getElementById("regConfirm").value;

    if (!name || !username || !email || !password || !confirm) {
      PG.showMessage(message, "Please complete all fields.");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(username)) {
      PG.showMessage(message, "Username must be 3–20 characters and use letters, numbers, dot, dash or underscore.");
      return;
    }
    if (!PG.validPassword(password)) {
      PG.showMessage(message, "Password must be at least 8 characters and include uppercase, lowercase, number and symbol.");
      return;
    }
    if (password !== confirm) {
      PG.showMessage(message, "Passwords do not match.");
      return;
    }

    const users = PG.getUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      PG.showMessage(message, "That username is already registered.");
      return;
    }
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      PG.showMessage(message, "That email address is already registered.");
      return;
    }

    const now = new Date();
    const settings = PG.getSettings();
    users.push({
      id: "u-" + Date.now(),
      name,
      username,
      email,
      passwordHash: PG.sha256(password),
      role: "user",
      accountStatus: "Active",
      createdAt: PG.isoDate(now),
      passwordCreatedAt: PG.isoDate(now),
      passwordExpiryAt: PG.isoDate(PG.addDays(now, settings.validityDays))
    });
    PG.saveUsers(users);
    registerForm.reset();
    strengthBar.style.width = "0";
    strengthLabel.textContent = "Use 8+ characters with upper, lower, number and symbol.";
    setTab("login");
    PG.showMessage(message, "Account created successfully. You can now log in.", "success");
    document.getElementById("loginUsername").value = username;
  });
});