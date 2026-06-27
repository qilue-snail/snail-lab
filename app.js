// Snail Lab shared app behavior

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav-link[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href === "#") return;

    const path = location.pathname;

    if (path.includes("/tools/biozilla/") && href.includes("biozilla")) {
      link.classList.add("active");
    } else if (path.includes("/tools/apostle-analytics/") && href.includes("apostle-analytics")) {
      link.classList.add("active");
    } else if ((path.endsWith("/") || path.endsWith("/index.html")) && href === "index.html") {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});
