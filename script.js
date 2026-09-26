const cards = [...document.querySelectorAll(".card")];
const filters = [...document.querySelectorAll(".filter")];
const search = document.getElementById("searchInput");
const fileInput = document.getElementById("fileInput");
const gallery = document.querySelector(".gallery");

filters.forEach(button => {
  button.addEventListener("click", () => {
    filters.forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    const type = button.dataset.filter;
    cards.forEach(card => {
      card.style.display = type === "all" || card.dataset.type === type ? "" : "none";
    });
  });
});

search.addEventListener("input", () => {
  const q = search.value.trim().toLowerCase();
  cards.forEach(card => {
    card.style.display = card.dataset.name.toLowerCase().includes(q) ? "" : "none";
  });
});

fileInput.addEventListener("change", () => {
  [...fileInput.files].forEach(file => {
    const url = URL.createObjectURL(file);
    const card = document.createElement("article");
    const isVideo = file.type.startsWith("video/");
    card.className = "card";
    card.dataset.type = isVideo ? "video" : "image";
    card.dataset.name = file.name;

    card.innerHTML = `
      <div class="media" style="background:#080b12">
        ${isVideo
          ? `<video src="${url}" controls style="width:100%;height:100%;object-fit:cover"></video>`
          : `<img src="${url}" style="width:100%;height:100%;object-fit:cover">`
        }
      </div>
      <div class="card-info">
        <span>💜 ${file.name}</span><b>⋮</b>
      </div>`;
    gallery.prepend(card);
  });
  fileInput.value = "";
});
