document.addEventListener("DOMContentLoaded", () => {
  const user = PG.requireAuth("user");
  if (!user) return;

  const status = PG.getPasswordStatus(user);
  if (status.key === "Expired") {
    location.href = "change-password.html?expired=1";
    return;
  }

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set("welcomeName", user.name.split(" ")[0]);
  set("pillName", user.name);
  set("pillUser", "@" + user.username);
  set("avatarText", user.name.charAt(0).toUpperCase());
  set("fullName", user.name);
  set("username", user.username);
  set("email", user.email);
  set("accountStatus", user.accountStatus);
  set("createdAt", PG.formatDate(user.createdAt));
  set("passwordCreated", PG.formatDate(user.passwordCreatedAt));
  set("passwordExpiry", PG.formatDate(user.passwordExpiryAt));
  set("remainingDays", status.remainingDays);
  set("remainingDaysBig", status.remainingDays);
  set("statusLabel", status.label);

  const badge = document.getElementById("passwordStatusBadge");
  badge.textContent = status.label;
  badge.className = "status-badge " + (status.key === "Warning" ? "status-warning" : "status-active");

  const total = PG.daysTotal(user);
  const pct = Math.max(0, Math.min(100, Math.round((status.remainingDays / total) * 100)));
  document.getElementById("expiryProgress").style.width = pct + "%";

  const notice = document.getElementById("expiryNotice");
  if (status.key === "Warning") {
    notice.className = "notice warning";
    notice.innerHTML = `<div class="icon">⚠</div><div><b>Password expiring soon</b><div style="margin-top:5px">Your password expires in ${status.remainingDays} day${status.remainingDays===1?"":"s"}. Change it now to avoid losing access.</div></div>`;
  } else {
    notice.className = "notice success";
    notice.innerHTML = `<div class="icon">✓</div><div><b>Your password is active</b><div style="margin-top:5px">No action is required right now. We will warn you when the expiry date is close.</div></div>`;
  }

  document.querySelectorAll("[data-logout]").forEach(btn => btn.addEventListener("click", PG.logout));
});