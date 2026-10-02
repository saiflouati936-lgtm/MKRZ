// اللايت بوكس — عرض كامل الشاشة + زوم بالبنش أو دبل تاب
// يستخدمه script.js (المعرض) و home.js (الرئيسية) عبر window.mkrzOpenLightbox
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
