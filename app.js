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
function setupGlobalBackupButtons() {
  const exportBtn = document.getElementById("exportAllBtn");
  const importBtn = document.getElementById("importAllBtn");

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const backup = {
        version: 1,
        createdAt: new Date().toISOString(),
        localStorage: {}
      };

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        backup.localStorage[key] = localStorage.getItem(key);
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json"
      });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "snail-lab-backup.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  if (importBtn) {
    importBtn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";

      input.addEventListener("change", () => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
          try {
            const backup = JSON.parse(reader.result);

            if (!backup.localStorage) {
              alert("This does not look like a Snail Lab backup file.");
              return;
            }

            if (!confirm("Import this backup? This will replace saved Snail Lab data.")) {
              return;
            }

            Object.entries(backup.localStorage).forEach(([key, value]) => {
              localStorage.setItem(key, value);
            });

            alert("Backup imported. The page will reload.");
            location.reload();
          } catch {
            alert("Could not import backup file.");
          }
        };

        reader.readAsText(file);
      });

      input.click();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSharedSidebar();

  setTimeout(() => {
    setupGlobalBackupButtons();
  }, 150);
});
