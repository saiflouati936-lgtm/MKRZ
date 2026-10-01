// =====================================
// عناصر الصفحة
// =====================================

const search = document.getElementById("searchInput");
const fileInput = document.getElementById("fileInput");
const gallery = document.getElementById("gallery");
const filters = [...document.querySelectorAll(".filter")];

const ICON_IMAGE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 15l-4-4-9 8"/></svg>`;
const ICON_VIDEO = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M21 8l-4 3 4 3z"/></svg>`;

function esc(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

// =====================================
// إنشاء بطاقة (زر الحذف يظهر فقط للملك عبر body.is-admin)
// =====================================

function createCard(fileName, publicUrl) {
  const extension = fileName.split(".").pop().toLowerCase();
  const videoExtensions = ["mp4", "webm", "mov", "mkv", "avi"];
  const isVideo = videoExtensions.includes(extension);

  const card = document.createElement("article");
  card.className = "card";
  card.dataset.type = isVideo ? "video" : "image";
  card.dataset.name = fileName;

  const mediaTag = isVideo
    ? `<video src="${publicUrl}" muted playsinline preload="metadata"></video><div class="play-badge"><svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div>`
    : `<img src="${publicUrl}" alt="${esc(fileName)}" loading="lazy">`;

  card.innerHTML = `
    <div class="media">${mediaTag}</div>
    <div class="card-info">
      <span class="card-info-name">${isVideo ? ICON_VIDEO : ICON_IMAGE}${esc(fileName)}</span>
      <button class="card-del admin-only" title="حذف">🗑</button>
    </div>
  `;

  card.querySelector(".media").addEventListener("click", () => {
    window.mkrzOpenLightbox(isVideo, publicUrl);
  });

  card.querySelector(".card-del").addEventListener("click", async () => {
    if (!confirm("حذف هذا الملف نهائيًا؟")) return;
    const { error } = await supabaseClient.storage.from("media").remove([fileName]);
    if (error) { alert("فشل الحذف: " + error.message); return; }
    card.remove();
  });

  return card;
}

// =====================================
// تحميل الملفات من Supabase
// =====================================

async function loadFiles() {
  const { data, error } = await supabaseClient
    .storage
    .from("media")
    .list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  if (error) {
    console.error("خطأ في تحميل الملفات:", error);
    gallery.innerHTML = `<div class="empty-state">تعذّر تحميل الملفات. تأكد من إعدادات Supabase.</div>`;
    return;
  }

  const files = (data || []).filter(f => f.id && f.name !== ".emptyFolderPlaceholder");

  if (files.length === 0) {
    gallery.innerHTML = `<div class="empty-state">لا توجد ملفات بعد — ارفع أول صورة أو فيديو.</div>`;
    return;
  }

  gallery.innerHTML = "";
  for (const file of files) {
    const { data: publicData } = supabaseClient.storage.from("media").getPublicUrl(file.name);
    gallery.appendChild(createCard(file.name, publicData.publicUrl));
  }
}

// =====================================
// الفلاتر
// =====================================

filters.forEach(button => {
  button.addEventListener("click", () => {
    filters.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    const type = button.dataset.filter;
    document.querySelectorAll(".card").forEach(card => {
      card.style.display = type === "all" || card.dataset.type === type ? "" : "none";
    });
  });
});

// =====================================
// البحث
// =====================================

if (search) {
  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll(".card").forEach(card => {
      const name = card.dataset.name || "";
      card.style.display = name.toLowerCase().includes(query) ? "" : "none";
    });
  });
}

// =====================================
// رفع الملفات (يتطلب تسجيل الدخول)
// =====================================

if (fileInput) {
  fileInput.addEventListener("change", async () => {
    const files = [...fileInput.files];
    if (files.length === 0) return;

    if (!window.MKRZAuth || !window.MKRZAuth.state.session) {
      alert("سجّل الدخول أولاً عشان ترفع ملفات.");
      fileInput.value = "";
      window.MKRZAuth && window.MKRZAuth.openLogin();
      return;
    }

    const emptyState = gallery.querySelector(".empty-state");
    if (emptyState) emptyState.remove();

    for (const file of files) {
      try {
        const extension = file.name.includes(".") ? "." + file.name.split(".").pop() : "";
        const fileName = Date.now() + "_" + Math.random().toString(36).substring(2) + extension;

        const { error } = await supabaseClient
          .storage
          .from("media")
          .upload(fileName, file, { cacheControl: "3600", upsert: false });

        if (error) {
          console.error(error);
          alert("فشل رفع الملف:\n\n" + error.message);
          continue;
        }

        const { data: publicData } = supabaseClient.storage.from("media").getPublicUrl(fileName);
        gallery.prepend(createCard(fileName, publicData.publicUrl));
      } catch (err) {
        console.error(err);
        alert("حدث خطأ أثناء رفع الملف.");
      }
    }

    fileInput.value = "";
  });
}

// =====================================
// تشغيل الصفحة
// =====================================

loadFiles();

// =====================================
// اللايت بوكس — عرض كامل الشاشة + زوم بالبنش أو دبل تاب
// =====================================

(function () {
  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.innerHTML = `
    <button class="lightbox-close" aria-label="إغلاق">✕</button>
    <div class="lightbox-stage"></div>
    <div class="lightbox-hint">اقرص بإصبعين للتكبير، أو اضغط مرتين</div>
  `;
  document.body.appendChild(overlay);

  const stage = overlay.querySelector(".lightbox-stage");
  const closeBtn = overlay.querySelector(".lightbox-close");
  const hint = overlay.querySelector(".lightbox-hint");

  let el = null;
  let scale = 1, posX = 0, posY = 0;
  let startDist = 0, startScale = 1;
  let dragging = false, dragMoved = false, dragStartX = 0, dragStartY = 0, startPosX = 0, startPosY = 0;
  let hintTimer = null;

  function apply() {
    if (!el) return;
    el.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    stage.classList.toggle("zoomed", scale > 1.01);
  }

  function clampScale(s) {
    return Math.min(4, Math.max(1, s));
  }

  function setZoom(newScale) {
    scale = clampScale(newScale);
    if (scale <= 1.01) { scale = 1; posX = 0; posY = 0; }
    apply();
  }

  window.mkrzOpenLightbox = function (isVideo, src) {
    stage.innerHTML = "";
    el = document.createElement(isVideo ? "video" : "img");
    el.src = src;
    if (isVideo) { el.controls = true; el.autoplay = true; el.playsInline = true; }
    else { el.alt = ""; }
    stage.appendChild(el);
    scale = 1; posX = 0; posY = 0;
    apply();

    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    hint.style.opacity = "1";
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { hint.style.opacity = "0"; }, 2800);
  };

  function closeLightbox() {
    overlay.classList.remove("open");
    if (el && el.tagName === "VIDEO") el.pause();
    document.body.style.overflow = "";
  }

  closeBtn.addEventListener("click", closeLightbox);
  overlay.addEventListener("click", e => {
    if (e.target === overlay && scale <= 1.01) closeLightbox();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeLightbox();
  });

  // دبل تاب / دبل كلك = تبديل الزوم
  let lastTap = 0;
  stage.addEventListener("click", () => {
    if (dragMoved) { dragMoved = false; return; }
    const now = Date.now();
    if (now - lastTap < 320) setZoom(scale > 1.01 ? 1 : 2.5);
    lastTap = now;
  });

  // زوم بعجلة الماوس (ديسكتوب)
  stage.addEventListener("wheel", e => {
    if (!el) return;
    e.preventDefault();
    setZoom(scale - e.deltaY * 0.0015);
  }, { passive: false });

  // بنش-زوم وسحب باللمس
  stage.addEventListener("touchstart", e => {
    if (e.touches.length === 2) {
      startDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      startScale = scale;
    } else if (e.touches.length === 1 && scale > 1.01) {
      dragging = true; dragMoved = false;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      startPosX = posX; startPosY = posY;
    }
  }, { passive: true });

  stage.addEventListener("touchmove", e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setZoom(startScale * (dist / startDist));
    } else if (dragging && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - dragStartX;
      const dy = e.touches[0].clientY - dragStartY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
      posX = startPosX + dx;
      posY = startPosY + dy;
      apply();
    }
  }, { passive: false });

  stage.addEventListener("touchend", () => {
    dragging = false;
    if (scale <= 1.01) { scale = 1; posX = 0; posY = 0; apply(); }
  });

  // سحب بالماوس لما يكون مكبّر (ديسكتوب)
  stage.addEventListener("mousedown", e => {
    if (scale <= 1.01) return;
    dragging = true; dragMoved = false;
    dragStartX = e.clientX; dragStartY = e.clientY;
    startPosX = posX; startPosY = posY;
    stage.classList.add("dragging");
  });
  window.addEventListener("mousemove", e => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
    posX = startPosX + dx;
    posY = startPosY + dy;
    apply();
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    stage.classList.remove("dragging");
  });
})();
