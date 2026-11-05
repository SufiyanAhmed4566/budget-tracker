document.addEventListener("DOMContentLoaded", () => {
  const user = PG.requireAuth("user");
  if (!user) return;

  const expired = PG.getPasswordStatus(user).key === "Expired";
  const notice = document.getElementById("expiredNotice");
  if (expired) notice.classList.remove("hidden");

  document.getElementById("pillName").textContent = user.name;
  document.getElementById("pillUser").textContent = "@" + user.username;
  document.getElementById("avatarText").textContent = user.name.charAt(0).toUpperCase();

  const form = document.getElementById("changePasswordForm");
  const message = document.getElementById("passwordMessage");
  const newPassword = document.getElementById("newPassword");
  const strengthBar = document.getElementById("strengthBar");
  const strengthLabel = document.getElementById("strengthLabel");

  newPassword.addEventListener("input", () => {
    const s = PG.strength(newPassword.value);
    strengthBar.style.width = s.percent + "%";
    strengthBar.style.background =
      s.level === "strong" ? "#10b981" :
      s.level === "medium" ? "#f59e0b" : "#ef4444";
    strengthLabel.textContent = newPassword.value ? `${s.label} password` : "Use 8+ characters with upper, lower, number and symbol.";
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    PG.hideMessage(message);

    const currentPassword = document.getElementById("currentPassword").value;
    const password = newPassword.value;
    const confirm = document.getElementById("confirmPassword").value;

    if (PG.sha256(currentPassword) !== user.passwordHash) {
      PG.showMessage(message, "Current password is incorrect.");
      return;
    }
    if (!PG.validPassword(password)) {
      PG.showMessage(message, "New password must be at least 8 characters and include uppercase, lowercase, number and symbol.");
      return;
    }
    if (password !== confirm) {
      PG.showMessage(message, "New passwords do not match.");
      return;
    }
    if (PG.sha256(password) === user.passwordHash) {
      PG.showMessage(message, "New password must be different from the current password.");
      return;
    }

    const users = PG.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    const now = new Date();
    const settings = PG.getSettings();
    users[index].passwordHash = PG.sha256(password);
    users[index].passwordCreatedAt = PG.isoDate(now);
    users[index].passwordExpiryAt = PG.isoDate(PG.addDays(now, settings.validityDays));
    PG.saveUsers(users);

    form.reset();
    strengthBar.style.width = "0";
    strengthLabel.textContent = "Use 8+ characters with upper, lower, number and symbol.";
    PG.showMessage(
      message,
      `Password updated successfully. It now expires on ${PG.formatDate(users[index].passwordExpiryAt)}.`,
      "success"
    );
    notice.classList.add("hidden");
  });

  document.querySelectorAll("[data-logout]").forEach(btn => btn.addEventListener("click", PG.logout));
});