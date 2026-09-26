(function () {
  const client = window.supabaseClient;

  function esc(str) {
    return String(str).replace(/</g, "&lt;");
  }

  function guard() {
    const ok = window.MKRZAuth.state.ready && window.MKRZAuth.isAdmin();
    const guardEl = document.getElementById("adminGuard");
    const contentEl = document.getElementById("adminContent");

    if (!window.MKRZAuth.state.ready) {
      guardEl.textContent = "...جاري التحقق من الصلاحية";
      return;
    }
    if (!window.MKRZAuth.state.session) {
      guardEl.textContent = "سجّل الدخول أولاً للوصول للوحة التحكم.";
      contentEl.style.display = "none";
      return;
    }
    if (!ok) {
      guardEl.textContent = "🚫 هذه الصفحة مخصصة للمسؤول فقط.";
      contentEl.style.display = "none";
      return;
    }

    guardEl.style.display = "none";
    contentEl.style.display = "block";
    loadAll();
  }

  async function loadStats() {
    const [membersRes, filesRes, msgRes] = await Promise.all([
      client.from("profiles").select("*", { count: "exact", head: true }),
      client.storage.from("media").list("", { limit: 1000 }),
      client.from("messages").select("*", { count: "exact", head: true })
    ]);
    document.getElementById("statMembers").textContent = membersRes.count ?? "—";
    document.getElementById("statFiles").textContent = (filesRes.data || []).filter(f => f.id).length;
    document.getElementById("statMessages").textContent = msgRes.count ?? "—";
  }

  async function loadMembers() {
    const box = document.getElementById("membersTable");
    const { data, error } = await client.from("profiles").select("*").order("created_at");
    if (error) { box.innerHTML = `<div class="admin-row">تعذر التحميل</div>`; return; }

    const myId = window.MKRZAuth.state.session.user.id;

    box.innerHTML = data.map(p => `
      <div class="admin-row">
        <span>${esc(p.username)}</span>
        <span class="role-badge ${p.role}">${p.role === "admin" ? "مسؤول" : "عضو"}</span>
        ${p.id === myId
          ? "<span></span>"
          : `<button class="btn" data-id="${p.id}" data-role="${p.role === "admin" ? "member" : "admin"}">
               ${p.role === "admin" ? "تنزيل لعضو" : "ترقية لمسؤول"}
             </button>`}
      </div>`).join("");

    box.querySelectorAll("button[data-id]").forEach(btn => {
      btn.onclick = async () => {
        const { error } = await client.rpc("set_member_role", {
          target_id: btn.dataset.id,
          new_role: btn.dataset.role
        });
        if (error) { alert("خطأ: " + error.message); return; }
        loadMembers();
      };
    });
  }

  async function loadFiles() {
    const box = document.getElementById("filesTable");
    const { data, error } = await client
      .storage.from("media")
      .list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });

    if (error) { box.innerHTML = `<div class="admin-row">تعذر التحميل</div>`; return; }
    const files = data.filter(f => f.id);

    box.innerHTML = files.length
      ? files.map(f => `
        <div class="admin-row">
          <span>${esc(f.name)}</span>
          <button class="btn" data-name="${f.name}">حذف</button>
        </div>`).join("")
      : `<div class="admin-row">لا ملفات بعد</div>`;

    box.querySelectorAll("button[data-name]").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("حذف هذا الملف نهائيًا؟")) return;
        await client.storage.from("media").remove([btn.dataset.name]);
        loadFiles();
        loadStats();
      };
    });
  }

  async function loadMessages() {
    const box = document.getElementById("messagesTable");
    const { data, error } = await client
      .from("messages").select("*")
      .order("created_at", { ascending: false }).limit(30);

    if (error) { box.innerHTML = `<div class="admin-row">تعذر التحميل</div>`; return; }

    box.innerHTML = data.length
      ? data.map(m => `
        <div class="admin-row">
          <span><b>${esc(m.username)}:</b> ${esc(m.content)}</span>
          <button class="btn" data-id="${m.id}">حذف</button>
        </div>`).join("")
      : `<div class="admin-row">لا رسائل بعد</div>`;

    box.querySelectorAll("button[data-id]").forEach(btn => {
      btn.onclick = async () => {
        await client.from("messages").delete().eq("id", btn.dataset.id);
        loadMessages();
        loadStats();
      };
    });
  }

  function loadAll() {
    loadStats();
    loadMembers();
    loadFiles();
    loadMessages();
  }

  function boot() {
    if (window.MKRZAuth) window.MKRZAuth.onChange(guard);
    else setTimeout(boot, 50);
  }
  boot();
})();
