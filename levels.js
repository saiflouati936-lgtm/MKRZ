// تعريف المستويات الثمانية — يستخدمه auth.js و admin.js و friends.js
// 1-7 توصلها تلقائيًا بالمشاركة (رسائل + رفع ملفات). 8 الملك، محجوز يدويًا فقط.
window.MKRZ_LEVELS = {
  1: { name: "مبتدئ",  min: 0,   color: "#8c93a8" },
  2: { name: "عضو",     min: 5,   color: "#5b9bd5" },
  3: { name: "نشيط",    min: 15,  color: "#4caf7d" },
  4: { name: "محترف",   min: 30,  color: "#3ec6c6" },
  5: { name: "نخبة",    min: 50,  color: "#6f5cff" },
  6: { name: "أسطورة",  min: 80,  color: "#ff9d3d" },
  7: { name: "بطل",     min: 120, color: "#ff4d8d" },
  8: { name: "الملك",   min: null, color: "#ffd76a", crown: true }
};

function mkrzLevelBadge(level, points) {
  const lvl = window.MKRZ_LEVELS[level] || window.MKRZ_LEVELS[1];
  const crown = lvl.crown
    ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="margin-inline-end:3px"><path d="M3 17l1.5-9L9 12l3-7 3 7 4.5-4L21 17H3z"/></svg>'
    : "";
  const next = window.MKRZ_LEVELS[level + 1];
  const title = (typeof points === "number" && next)
    ? `${points} نقطة — يحتاج ${next.min} لمستوى ${next.name}`
    : "";
  return `<span class="lvl-badge lvl-${level}" ${title ? `title="${title}"` : ""}>${crown}${lvl.name}</span>`;
}
