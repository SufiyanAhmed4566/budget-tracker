document.addEventListener("DOMContentLoaded", () => {
  const admin = PG.requireAuth("admin");
  if (!admin) return;

  document.getElementById("pillName").textContent = admin.name;
  document.getElementById("pillUser").textContent = "Administrator";
  document.getElementById("avatarText").textContent = "A";

  const searchInput = document.getElementById("searchUser");
  const filterSelect = document.getElementById("statusFilter");
  const tbody = document.getElementById("userRows");
  const settingsForm = document.getElementById("settingsForm");
  const settingsMessage = document.getElementById("settingsMessage");

  function usersOnly() {
    return PG.getUsers().filter(u => u.role === "user");
  }

  function renderStats() {
    const users = usersOnly();
    let active = 0, warning = 0, expired = 0;
    users.forEach(u => {
      if (u.accountStatus !== "Active") return;
      const s = PG.getPasswordStatus(u);
      if (s.key === "Expired") expired++;
      else if (s.key === "Warning") warning++;
      else active++;
    });
    document.getElementById("totalUsers").textContent = users.length;
    document.getElementById("activeUsers").textContent = active;
    document.getElementById("warningUsers").textContent = warning;
    document.getElementById("expiredUsers").textContent = expired;
  }

  function statusHtml(user) {
    if (user.accountStatus !== "Active") return `<span class="status-badge status-inactive">Inactive</span>`;
    const s = PG.getPasswordStatus(user);
    const cls = s.key === "Expired" ? "status-expired" : s.key === "Warning" ? "status-warning" : "status-active";
    return `<span class="status-badge ${cls}">${s.label}</span>`;
  }

  function renderTable() {
    const q = searchInput.value.trim().toLowerCase();
    const filter = filterSelect.value;
    let users = usersOnly();

    users = users.filter(user => {
      const haystack = `${user.name} ${user.username} ${user.email}`.toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (filter === "all") return true;
      if (filter === "inactive") return user.accountStatus !== "Active";
      if (user.accountStatus !== "Active") return false;
      return PG.getPasswordStatus(user).key.toLowerCase() === filter;
    });

    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#98a2b3;padding:28px">No users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(user => {
      const s = PG.getPasswordStatus(user);
      const days = user.accountStatus === "Active" ? s.remainingDays : "—";
      return `<tr>
        <td><b>${PG.escapeHtml(user.name)}</b><br><span class="muted">@${PG.escapeHtml(user.username)}</span></td>
        <td>${PG.escapeHtml(user.email)}</td>
        <td>${statusHtml(user)}</td>
        <td>${days}</td>
        <td>${PG.formatDate(user.passwordExpiryAt)}</td>
        <td>${PG.formatDate(user.createdAt)}</td>
        <td>
          <div class="actions">
            <button class="small-btn" data-view="${user.id}">View</button>
            <button class="small-btn" data-expire="${user.id}">Expire Password</button>
            <button class="small-btn" data-toggle="${user.id}">${user.accountStatus === "Active" ? "Deactivate" : "Activate"}</button>
            <button class="danger-btn" data-delete="${user.id}">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join("");

    document.querySelectorAll("[data-view]").forEach(btn =>
      btn.addEventListener("click", () => viewUser(btn.dataset.view))
    );
    document.querySelectorAll("[data-expire]").forEach(btn =>
      btn.addEventListener("click", () => expirePassword(btn.dataset.expire))
    );
    document.querySelectorAll("[data-toggle]").forEach(btn =>
      btn.addEventListener("click", () => toggleUser(btn.dataset.toggle))
    );
    document.querySelectorAll("[data-delete]").forEach(btn =>
      btn.addEventListener("click", () => deleteUser(btn.dataset.delete))
    );
  }

  function viewUser(id) {
    const user = PG.getUsers().find(u => u.id === id);
    if (!user) return;
    const s = PG.getPasswordStatus(user);
    const modal = document.getElementById("userModal");
    document.getElementById("modalContent").innerHTML = `
      <div class="info-list">
        <div class="info-row"><span>Name</span><b>${PG.escapeHtml(user.name)}</b></div>
        <div class="info-row"><span>Username</span><b>@${PG.escapeHtml(user.username)}</b></div>
        <div class="info-row"><span>Email</span><b>${PG.escapeHtml(user.email)}</b></div>
        <div class="info-row"><span>Account</span><b>${PG.escapeHtml(user.accountStatus)}</b></div>
        <div class="info-row"><span>Password status</span><b>${s.label}</b></div>
        <div class="info-row"><span>Password created</span><b>${PG.formatDate(user.passwordCreatedAt)}</b></div>
        <div class="info-row"><span>Password expires</span><b>${PG.formatDate(user.passwordExpiryAt)}</b></div>
        <div class="info-row"><span>Remaining days</span><b>${s.remainingDays}</b></div>
      </div>`;
    modal.classList.remove("hidden");
  }

  function expirePassword(id) {
    const users = PG.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index < 0) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    users[index].passwordExpiryAt = PG.isoDate(yesterday);
    PG.saveUsers(users);
    renderStats();
    renderTable();
  }

  function toggleUser(id) {
    const users = PG.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index < 0) return;
    users[index].accountStatus = users[index].accountStatus === "Active" ? "Inactive" : "Active";
    PG.saveUsers(users);
    renderStats();
    renderTable();
  }

  function deleteUser(id) {
    const user = PG.getUsers().find(u => u.id === id);
    if (!user) return;
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    PG.saveUsers(PG.getUsers().filter(u => u.id !== id));
    renderStats();
    renderTable();
  }

  document.getElementById("closeModal").addEventListener("click", () =>
    document.getElementById("userModal").classList.add("hidden")
  );
  document.getElementById("userModal").addEventListener("click", e => {
    if (e.target.id === "userModal") e.currentTarget.classList.add("hidden");
  });

  searchInput.addEventListener("input", renderTable);
  filterSelect.addEventListener("change", renderTable);

  const settings = PG.getSettings();
  document.getElementById("validityDays").value = settings.validityDays;
  document.getElementById("warningDays").value = settings.warningDays;

  settingsForm.addEventListener("submit", e => {
    e.preventDefault();
    const validityDays = Number(document.getElementById("validityDays").value);
    const warningDays = Number(document.getElementById("warningDays").value);

    if (validityDays < 1 || validityDays > 365) {
      PG.showMessage(settingsMessage, "Validity period must be between 1 and 365 days.");
      return;
    }
    if (warningDays < 1 || warningDays >= validityDays) {
      PG.showMessage(settingsMessage, "Warning period must be at least 1 day and less than the validity period.");
      return;
    }
    PG.setSettings({ validityDays, warningDays });
    PG.showMessage(settingsMessage, "Password policy updated. It applies when users register or change passwords.", "success");
    renderStats();
    renderTable();
  });

  document.querySelectorAll("[data-logout]").forEach(btn => btn.addEventListener("click", PG.logout));

  renderStats();
  renderTable();
});