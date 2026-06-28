// Snail Lab shared app behavior
const SNAIL_LAB_BASE = "/snail-lab/";
function snailLabPageKey() {
  const path = window.location.pathname;
  if (path.includes("/tools/biozilla/")) return "biozilla";
  if (path.includes("/tools/apostle-analytics/")) return "apostle-analytics";
  return "home";
}
function markActiveSidebarLink() {
  const activePage = snailLabPageKey();
  document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === activePage);
  });
}
function setupSidebarToggle() {
  const saved = localStorage.getItem("snailSidebarCollapsed") === "true";
  document.body.classList.toggle("sidebar-collapsed", saved);
  const toggle = document.getElementById("sidebar-toggle");
  if (toggle) {
    toggle.textContent = saved ? "" : "Collapse";
    toggle.addEventListener("click", () => {
      const collapsed = document.body.classList.toggle("sidebar-collapsed");
      localStorage.setItem("snailSidebarCollapsed", collapsed);
      toggle.textContent = collapsed ? "" : "Collapse";
    });
  }
}
function loadSharedSidebar() {
  const target = document.getElementById("shared-sidebar");
  if (!target) {
    markActiveSidebarLink();
    return;
  }
  fetch(`${SNAIL_LAB_BASE}sidebar.html`, { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("Sidebar failed to load");
      return response.text();
    })
    .then((html) => {
      target.innerHTML = html;
      markActiveSidebarLink();
      setupSidebarToggle();
    })
    .catch(() => {
      target.innerHTML = `
        <aside class="sidebar">
          <a class="brand" href="${SNAIL_LAB_BASE}" aria-label="Snail Lab Home">
            <div class="brand-icon">🧪🐌</div>
            <div><h1>Snail Lab</h1><p>Super Snail Companion Suite</p></div>
          </a>
          <nav class="nav" aria-label="Snail Lab tools">
<a class="nav-link" data-page="home" href="${SNAIL_LAB_BASE}" title="Home">🏠 <span>Home</span></a>
<a class="nav-link" data-page="biozilla" href="${SNAIL_LAB_BASE}tools/biozilla/" title="Biozilla">🦖 <span>Biozilla</span></a>
<a class="nav-link" data-page="apostle-analytics" href="${SNAIL_LAB_BASE}tools/apostle-analytics/" title="Apostle Analytics">📊 <span>Apostle Analytics</span></a>
          </nav>
          <button id="sidebar-toggle" class="sidebar-toggle" type="button" aria-label="Toggle sidebar">
            Collapse
          </button>
        </aside>`;
      markActiveSidebarLink();
      setupSidebarToggle();
    });
}
document.addEventListener("DOMContentLoaded", loadSharedSidebar);
