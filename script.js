// =====================================
// SUPABASE
// =====================================

const SUPABASE_URL = "https://iqhmgefdshmeozcdtrah.supabase.co";
const SUPABASE_KEY = "sb_publishable_YS9o0VEh-K5smzRSioA8kQ_AqYH2YLj";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================================
// عناصر الصفحة
// =====================================

const search = document.getElementById("searchInput");
const fileInput = document.getElementById("fileInput");
const gallery = document.getElementById("gallery");
const filters = [...document.querySelectorAll(".filter")];

const ICON_IMAGE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 15l-4-4-9 8"/></svg>`;
const ICON_VIDEO = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M21 8l-4 3 4 3z"/></svg>`;

// =====================================
// إنشاء بطاقة
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
    ? `<video src="${publicUrl}" controls></video>`
    : `<img src="${publicUrl}" alt="${fileName}">`;

  card.innerHTML = `
    <div class="media">${mediaTag}</div>
    <div class="card-info">${isVideo ? ICON_VIDEO : ICON_IMAGE}<span>${fileName}</span></div>
  `;

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

  const files = (data || []).filter(
    f => f.id && f.name !== ".emptyFolderPlaceholder"
  );

  if (files.length === 0) {
    gallery.innerHTML = `<div class="empty-state">لا توجد ملفات بعد — ارفع أول صورة أو فيديو.</div>`;
    return;
  }

  gallery.innerHTML = "";
  for (const file of files) {
    const { data: publicData } = supabaseClient
      .storage
      .from("media")
      .getPublicUrl(file.name);

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
      card.style.display =
        type === "all" || card.dataset.type === type ? "" : "none";
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
// رفع الملفات
// =====================================

if (fileInput) {
  fileInput.addEventListener("change", async () => {
    const files = [...fileInput.files];
    if (files.length === 0) return;

    const emptyState = gallery.querySelector(".empty-state");
    if (emptyState) emptyState.remove();

    for (const file of files) {
      try {
        const extension = file.name.includes(".")
          ? "." + file.name.split(".").pop()
          : "";

        const fileName =
          Date.now() + "_" + Math.random().toString(36).substring(2) + extension;

        const { error } = await supabaseClient
          .storage
          .from("media")
          .upload(fileName, file, { cacheControl: "3600", upsert: false });

        if (error) {
          console.error(error);
          alert("فشل رفع الملف:\n\n" + error.message);
          continue;
        }

        const { data: publicData } = supabaseClient
          .storage
          .from("media")
          .getPublicUrl(fileName);

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
