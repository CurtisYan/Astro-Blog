async function loadPosts() {
  const response = await fetch("/assets/posts.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load posts.json");
  }
  return response.json();
}

async function loadConfig() {
  const response = await fetch("/assets/site-config.json", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

window.__SITE_VERSION = "2026-05-20-2";

function slugify(text) {
  return text.toLowerCase().trim().replace(/\s+/g, "-");
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function sectionLabel(section) {
  return section === "life" ? "生活" : section === "tech" ? "技术" : section;
}

function sectionPath(section) {
  return `/${section}.html`;
}

function parseDateValue(dateText) {
  if (!dateText) return null;
  const normalized = String(dateText).includes("T") ? String(dateText) : String(dateText).replace(" ", "T");
  let date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    date = new Date(dateText);
  }
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(dateText) {
  const date = parseDateValue(dateText);
  if (!date) return String(dateText || "");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatMonth(dateText) {
  const date = parseDateValue(dateText);
  if (!date) return String(dateText || "");
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long"
  }).format(date);
}

function formatMonthDay(dateText) {
  const date = parseDateValue(dateText);
  if (!date) return String(dateText || "");
  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate();
  const suffix = (day % 10 === 1 && day % 100 !== 11)
    ? "st"
    : (day % 10 === 2 && day % 100 !== 12)
      ? "nd"
      : (day % 10 === 3 && day % 100 !== 13)
        ? "rd"
        : "th";
  return `${month} ${day}${suffix}`;
}

function renderPostList(target, posts, options = {}) {
  target.innerHTML = "";

  if (!posts.length) {
    target.innerHTML = "<p class=\"post-meta\">No posts found.</p>";
    return;
  }

  const sorted = [...posts].sort((left, right) => {
    const leftDate = parseDateValue(left.date);
    const rightDate = parseDateValue(right.date);
    const leftTime = leftDate ? leftDate.getTime() : 0;
    const rightTime = rightDate ? rightDate.getTime() : 0;
    return rightTime - leftTime;
  });
  const groupByMonth = options.groupByMonth === true;
  const groupByYear = options.groupByYear === true;

  if (groupByYear) {
    // Group posts by year and render collapsible year sections
    const years = {};
    for (const post of sorted) {
      const date = parseDateValue(post.date);
      const y = date ? date.getFullYear() : "Unknown";
      years[y] = years[y] || [];
      years[y].push(post);
    }

    for (const year of Object.keys(years)) {
      const yearItem = document.createElement('li');
      yearItem.className = 'year-item';

      const header = document.createElement('h2');
      header.className = 'year-header';
      header.textContent = year;

      const postsWrap = document.createElement('ul');
      postsWrap.className = 'year-posts';

      for (const post of years[year]) {
        const li = document.createElement('li');
        li.className = 'year-post';
        li.innerHTML = `
          <span class="year-date">${formatMonthDay(post.date)}</span>
          <a class="year-link" href="/posts/${post.slug}.html">${post.title}</a>
        `;
        postsWrap.appendChild(li);
      }

      yearItem.appendChild(header);
      yearItem.appendChild(postsWrap);
      target.appendChild(yearItem);
    }
    return;
  }

  let currentMonth = "";

  for (const post of sorted) {
    const postMonth = formatMonth(post.date);

    if (groupByMonth && postMonth !== currentMonth) {
      currentMonth = postMonth;
      const monthItem = document.createElement("li");
      monthItem.className = "archive-month-item";
      monthItem.innerHTML = `<h2 class="archive-month">${currentMonth}</h2>`;
      target.appendChild(monthItem);
    }

    const tagLinks = (post.tags || [])
      .map((tag) => `<a href=\"/tags/${slugify(tag)}.html\">${tag}</a>`)
      .join(", ");
    const section = post.section || "life";

    const li = document.createElement("li");
    li.className = "post-item";
    li.innerHTML = `
      <article>
        <h2 class="post-title"><a href="/posts/${post.slug}.html">${post.title}</a></h2>
        <p class="post-excerpt">${post.excerpt}</p>
        <p class="post-meta">${formatDate(post.date)}</p>
        <p class="post-taxonomy">In <a href="${sectionPath(section)}">${sectionLabel(section)}</a></p>
        <p class="post-taxonomy">${tagLinks}</p>
      </article>
      <div class="separator-wrap"><hr class="davis-separator"></div>
    `;
    target.appendChild(li);
  }
}

function renderPagination(node, totalPages, currentPage, basePath) {
  if (!node) {
    return;
  }

  node.innerHTML = "";
  if (totalPages <= 1) {
    return;
  }

  const previous = document.createElement("a");
  previous.textContent = "Previous";
  previous.className = currentPage === 1 ? "is-disabled" : "";
  previous.href = currentPage === 2 ? `${basePath}` : `${basePath}page/${currentPage - 1}/`;

  const next = document.createElement("a");
  next.textContent = "Next";
  next.className = currentPage === totalPages ? "is-disabled" : "";
  next.href = `${basePath}page/${currentPage + 1}/`;

  if (currentPage > 1) {
    node.appendChild(previous);
  }

  const status = document.createElement("span");
  status.textContent = `${currentPage} / ${totalPages}`;
  node.appendChild(status);

  if (currentPage < totalPages) {
    node.appendChild(next);
  }
}

function updateYear() {
  const yearNode = document.querySelector("[data-year]");
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }
}

function setupNavigationToggle() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-primary-nav]");

  if (!toggle || !nav) {
    return;
  }

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("is-open", !expanded);
  });
}

function markCurrentNavLink() {
  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
  const links = document.querySelectorAll("[data-primary-nav] a");

  links.forEach((link) => {
    const hrefPath = new URL(link.href, window.location.origin).pathname.replace(/\/+$/, "") || "/";
    if (hrefPath === currentPath) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function applyConfig(config) {
  if (!config) return;

  const brandTitle = document.querySelector(".brand h1 a");
  const brandTagline = document.querySelector(".brand p");
  if (brandTitle && config.siteTitle) {
    brandTitle.textContent = config.siteTitle;
  }
  if (brandTagline && typeof config.tagline === "string") {
    brandTagline.textContent = config.tagline;
  }

  const nav = document.querySelector("[data-primary-nav]");
  if (nav && Array.isArray(config.nav)) {
    nav.innerHTML = config.nav
      .map((item) => `<a href="${item.href}">${item.label}</a>`)
      .join("\n");
  }

  const archiveHeader = document.querySelector(".archive-header");
  if (archiveHeader) {
    const titleNode = archiveHeader.querySelector("h2");
    const subtitleNode = archiveHeader.querySelector("p");

    if (titleNode && config.archiveTitle) {
      titleNode.textContent = config.archiveTitle;
    }

    if (typeof config.archiveSubtitle === "string") {
      if (config.archiveSubtitle && subtitleNode) {
        subtitleNode.textContent = config.archiveSubtitle;
      } else if (config.archiveSubtitle && !subtitleNode) {
        const p = document.createElement("p");
        p.textContent = config.archiveSubtitle;
        archiveHeader.appendChild(p);
      } else if (!config.archiveSubtitle && subtitleNode) {
        subtitleNode.remove();
      }
    }
  }

  const footer = document.querySelector(".site-footer");
  if (footer) {
    const footerTextNode = footer.querySelector("p");
    if (footerTextNode && config.footerText) {
      footerTextNode.textContent = config.footerText;
    }

    const creditText = typeof config.footerCredit === "string" ? config.footerCredit : "";
    const creditHtml = typeof config.footerCreditHtml === "string" ? config.footerCreditHtml : "";
    let creditNode = footer.querySelector(".credits");

    if (!creditNode && (creditText || creditHtml)) {
      creditNode = document.createElement("p");
      creditNode.className = "credits";
      footer.appendChild(creditNode);
    }

    if (creditNode) {
      if (creditHtml) {
        creditNode.innerHTML = creditHtml;
      } else if (creditText) {
        creditNode.textContent = creditText;
      } else {
        creditNode.remove();
      }
    }
  }
}

function matchSearch(post, term) {
  return (
    post.title.toLowerCase().includes(term) ||
    post.excerpt.toLowerCase().includes(term) ||
    sectionLabel(post.section).toLowerCase().includes(term) ||
    (post.section || "").toLowerCase().includes(term) ||
    (post.tags || []).join(" ").toLowerCase().includes(term)
  );
}

(async function boot() {
  updateYear();
  setupNavigationToggle();

  const config = await loadConfig();
  applyConfig(config);
  markCurrentNavLink();

  const listNode = document.querySelector("[data-post-list]");
  if (!listNode) {
    return;
  }

  const searchInput = document.querySelector("[data-search-input]");
  const pagerNode = document.querySelector("[data-pagination]");
  const pageSize = Number(listNode.dataset.pageSize || "12");
  const pageNumber = Number(listNode.dataset.page || "1");
  const filterType = listNode.dataset.filterType || "";
  const filterValue = normalizeText(listNode.dataset.filterValue);
  const sectionFilter = normalizeText(listNode.dataset.section);
  const groupBy = listNode.dataset.groupBy || "";
  const basePath = listNode.dataset.basePath || "/";

  try {
    const posts = await loadPosts();
    let filtered = posts;

    if (sectionFilter) {
      filtered = filtered.filter((post) => normalizeText(post.section) === sectionFilter);
      if (!filtered.length) {
        filtered = posts.filter((post) => {
          const section = normalizeText(post.section || post.category || "");
          if (section) return section === sectionFilter;
          const categories = Array.isArray(post.categories) ? post.categories : [];
          return categories.map((cat) => normalizeText(cat)).includes(sectionFilter);
        });
      }
    }

    if (filterType === "tag") {
      filtered = posts.filter((post) => (post.tags || []).map((tag) => slugify(normalizeText(tag))).includes(filterValue));
    }

    const initialSearch = new URLSearchParams(window.location.search).get("q") || "";
    if (searchInput) {
      searchInput.value = initialSearch;
      if (initialSearch) {
        filtered = filtered.filter((post) => matchSearch(post, initialSearch.toLowerCase()));
      }
    }

    // support pageSize <= 0 to mean "show all posts on one page"
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
    const safePage = Math.min(Math.max(pageNumber, 1), totalPages);
    let pagePosts;
    if (!pageSize || pageSize <= 0) {
      pagePosts = filtered;
    } else {
      const start = (safePage - 1) * pageSize;
      pagePosts = filtered.slice(start, start + pageSize);
    }

    renderPostList(listNode, pagePosts, { groupByMonth: groupBy === "month", groupByYear: groupBy === "year" });
    renderPagination(pagerNode, totalPages, safePage, basePath);

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const term = searchInput.value.trim().toLowerCase();
        const result = term ? filtered.filter((post) => matchSearch(post, term)) : filtered;
        const toRender = (!pageSize || pageSize <= 0) ? result : result.slice(0, pageSize);
        renderPostList(listNode, toRender, { groupByMonth: groupBy === "month" });
        const pagesForResult = (!pageSize || pageSize <= 0) ? 1 : Math.max(1, Math.ceil(result.length / pageSize));
        renderPagination(pagerNode, pagesForResult, 1, basePath);
      });
    }
  } catch (error) {
    listNode.innerHTML = "<p>Unable to load posts.</p>";
  }
})();
