// =============================================================================
// Configuration
// =============================================================================
const CONFIG = {
  githubUsername: 'anxety-solo',
  cacheTTL: 900000,
  apiBase: 'https://api.github.com/users',
  languageColors: {
    JavaScript: '#f1e05a',
    Python: '#3572a5',
    Java: '#b07219',
    TypeScript: '#3178c6',
    PHP: '#4f5d95',
    Ruby: '#701516',
    'C++': '#f34b7d',
    'C#': '#178600',
    Swift: '#ffac45',
    Kotlin: '#a97bff',
    Go: '#00add8',
    Rust: '#dea584',
    HTML: '#e34c26',
    CSS: '#563d7c',
    SCSS: '#c6538c',
    Shell: '#89e051',
    'Jupyter Notebook': '#da5b0b'
  }
};

// =============================================================================
// DOM Elements
// =============================================================================
const DOM = {
  // Navigation Panel
  navContainer: document.querySelector('.nav-container'),
  navBrand: document.querySelector('.nav-brand'),
  githubProfileLink: document.getElementById('githubProfileLink'),

  mainContainer: document.querySelector('.main-container'),

  // Profile Section
  userAvatar: document.getElementById('userAvatar'),
  userLogin: document.getElementById('user-login'),
  userName: document.getElementById('userName'),
  userBio: document.getElementById('userBio'),
  userStats: document.getElementById('userStats'),

  // Repositories Section
  reposSection: document.getElementById('repositories'),
  reposContainer: document.getElementById('reposContainer'),
  repoSearch: document.getElementById('repoSearch'),
  customSelect: document.querySelector('.custom-select'),

  // Other
  loadingSpinner: document.querySelector('.loading-spinner')
};

// =============================================================================
// Utilities
// =============================================================================
const Utils = {
  cache: {
    get: (key) => {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    },
    set: (key, data) => {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    },
    isValid: (cached) => cached && (Date.now() - cached.timestamp < CONFIG.cacheTTL)
  },

  dom: {
    createElement: (tag, classes, content) => {
      const el = document.createElement(tag);
      if (classes) el.className = classes;
      if (content) el.innerHTML = content;
      return el;
    }
  },

  sorting: {
    stars: (a, b) => b.stargazers_count - a.stargazers_count,
    updated: (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
    name: (a, b) => a.name.localeCompare(b.name),
    forks: (a, b) => b.forks_count - a.forks_count
  }
};

// =============================================================================
// GitHub API Service
// =============================================================================
class GitHubService {
  static async fetchUserData(username) {
    return this.fetchWithCache(`${CONFIG.apiBase}/${username}`);
  }

  static async fetchRepos(username) {
    let repos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${CONFIG.apiBase}/${username}/repos?page=${page}&per_page=100`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
      const data = await response.json();
      repos = repos.concat(data);
      hasMore = response.headers.get('Link')?.includes('rel="next"');
      page++;
    }

    return repos;
  }

  static async fetchStarred(username) {
    return fetch(`${CONFIG.apiBase}/${username}/starred`);
  }

  static async getTotalStarredCount(response) {
    try {
      const linkHeader = response.headers.get('Link');
      const data = await response.json();
      if (!linkHeader) return data.length;

      const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
      return lastPageMatch ? (parseInt(lastPageMatch[1]) - 1) * 50 + data.length : data.length;
    } catch (error) {
      console.error('Error fetching starred count:', error);
      return 'N/A';
    }
  }

  static async fetchWithCache(url) {
    const cacheKey = `gh-cache-${url}`;
    const cached = Utils.cache.get(cacheKey);

    if (cached && Utils.cache.isValid(cached, CONFIG.cacheTTL)) {
      return cached.data;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
    const data = await response.json();
    Utils.cache.set(cacheKey, data);
    return data;
  }
}

// =============================================================================
// Profile System
// =============================================================================
class ProfileSystem {
  static init(user, starredCount) {
    this.updateDocumentMeta(user);
    this.updateProfileInfo(user, starredCount);
    this.setupNavigation();
  }

  static async applyMaterialYou(avatarUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = `${avatarUrl}?${Date.now()}`;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const vibrant = new Vibrant(img);
      const palette = await vibrant.getPalette();
      const colors = [palette.Vibrant, palette.Muted, palette.DarkVibrant];
      const validColor = colors.find(c => c &&
                                     !/^(#fff|#000|ffffff|000000)/i.test(c.hex));

      if (validColor) {
        document.documentElement.style.setProperty(
          '--anx-c-brand-1',
          validColor.hex
        );
      }
    } catch (error) {
      console.error('Material You error:', error);
    }
  }

  static showUserPopup(username) {
    const popup = document.getElementById('user-popup');
    popup.querySelector('.popup-username').textContent = `@${username}`;
    popup.classList.add('show');
    setTimeout(() => popup.classList.remove('show'), 5000);
  }

  static updateDocumentMeta(user) {
    document.title = `GitHub | ${(user.name || user.login).toUpperCase()}`;
    this.updateFavicon(user.avatar_url);
  }

  static async updateFavicon(avatarUrl) {
    try {
      const canvas = await this.createRoundFavicon(avatarUrl);
      document.getElementById('dynamic-favicon').href = canvas.toDataURL();
    } catch (e) {
      console.error('Favicon error:', e);
    }
  }

  static createRoundFavicon(avatarUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = `${avatarUrl}&size=128`;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.height = 32;

        ctx.beginPath();
        ctx.arc(16, 16, 16, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0, 32, 32);
        resolve(canvas);
      };

      img.onerror = reject;
    });
  }

  static updateProfileInfo(user, starredCount) {
    DOM.navBrand.textContent = user.name || user.login;
    DOM.githubProfileLink.href = user.html_url;
    DOM.userAvatar.src = user.avatar_url;
    DOM.userName.textContent = user.name || user.login;

    const bioElement = DOM.userBio.querySelector('.profile-bio');
    bioElement.textContent = user.bio || 'No bio available';

    if (user.login) {
      DOM.userBio.querySelector('.user-login').textContent = `@${user.login}`;
    }

    DOM.userStats.innerHTML = this.generateStatsHTML([
      { icon: 'people', value: user.followers, label: 'Followers', href: `?tab=followers` },
      { icon: 'remove_red_eye', value: user.following, label: 'Following', href: `?tab=following` },
      { icon: 'storage', value: user.public_repos, label: 'Repositories', href: `?tab=repositories` },
      { icon: 'star', value: starredCount, label: 'Starred', href: `?tab=stars` }
    ], user.login);
  }

  static generateStatsHTML(stats, username) {
    return stats.map(({ icon, value, label, href }) => `
      <a href="https://github.com/${username}${href}" class="stat-item ${label.toLowerCase()}" target="_blank">
        <span class="material-icons">${icon}</span>
        <span>${value} ${label}</span>
      </a>
    `).join('');
  }

  static setupNavigation() {
    DOM.navBrand.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

// =============================================================================
// Repository System
// =============================================================================
class RepoSystem {
  static allRepos = [];
  static activeLanguages = new Set();
  static reposPerPage = 24;
  static currentPage = 1;
  static currentFilteredRepos = [];
  static currentSortKey = 'stars';

  static init(repos) {
    if (!repos?.length) {
      DOM.reposSection.innerHTML = this.displayMessage('fa-folder-open', 'No public repositories found.');
      return;
    }

    this.reposPerPage = this.calculateInitialReposPerPage();
    this.allRepos = [...repos].sort(Utils.sorting.stars);
    this.currentFilteredRepos = this.allRepos;
    this.setupSearch();
    this.generateLanguageFilters();
    this.render();
  }

  static calculateInitialReposPerPage() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    return isMobile ? 12 : 24;
  }

  static render() {
    const startIdx = (this.currentPage - 1) * this.reposPerPage;
    const endIdx = startIdx + this.reposPerPage;
    const reposToShow = this.currentFilteredRepos.slice(startIdx, endIdx);

    DOM.reposContainer.innerHTML = reposToShow.length
      ? reposToShow.map(repo => this.createRepoCard(repo)).join('')
    : this.displayMessage('fa-search-minus', 'No repositories found matching your search.');

    this.renderPagination();
  }

  static displayMessage(icon, text) {
    return `
      <div class="no-repos-message">
        <i class="fas ${icon}"></i>
        <p>${text}</p>
      </div>
    `;
  }

  static createRepoCard(repo) {
    return `
      <div class="repo-card ${repo.fork ? 'forked' : ''}">
        ${repo.fork ? '<div class="fork-badge">Fork</div>' : ''}
        <div class="repo-content">
          ${this.createRepoHeader(repo)}
          <div class="description-box">
            <p class="repo-description">${repo.description || 'No description'}</p>
          </div>
          ${this.createRepoMeta(repo)}
          <a href="${repo.html_url}" class="repo-button" target="_blank">
            <span class="material-icons">launch</span>
            View Repository
          </a>
        </div>
      </div>
    `;
  }

  static createRepoHeader(repo) {
    return `
      <div class="repo-header">
        <a href="${repo.html_url}" class="repo-name">${repo.name}</a>
        <span class="repo-star">
          <span class="material-icons">star</span>
          ${repo.stargazers_count}
        </span>
      </div>
    `;
  }

  static createRepoMeta(repo) {
    // Check if language is null or undefined
    const language = repo.language || (repo.fork && repo.parent?.language) || 'Unknown';

    return `
      <div class="repo-meta">
        <span class="meta-item">
          <span class="language-dot"
                style="background: ${CONFIG.languageColors[language] || '#3a5ccc'}">
          </span>
          ${language}
        </span>
        <span class="meta-item">
          <span class="material-icons">call_split</span>
          ${repo.forks_count}
        </span>
        <span class="meta-item">
          <span class="material-icons">update</span>
          ${new Date(repo.updated_at).toLocaleDateString()}
        </span>
      </div>
    `;
  }

  static setupSearch() {
    DOM.repoSearch.addEventListener('input', _.debounce(() => {
      const term = DOM.repoSearch.value.toLowerCase();
      this.currentFilteredRepos = this.allRepos.filter(repo =>
                                                       repo.name.toLowerCase().includes(term) ||
                                                       (repo.description?.toLowerCase().includes(term)) ||
                                                       (repo.topics?.some(topic => topic.toLowerCase().includes(term)))
                                                      );
      this.currentPage = 1;
      this.render();
    }, 450));
  }

  static sort(sortKey) {
    this.currentSortKey = sortKey;
    this.applyFilters();
  }

  static generateLanguageFilters() {
    const languages = new Set(
      this.allRepos
      .map(repo => repo.language)
      .filter(Boolean)
      .sort()
    );

    const container = document.querySelector('.filters-container');
    container.innerHTML = '';

    const allButton = this.createFilterTag('All', true);
    container.appendChild(allButton);

    languages.forEach(lang => {
      container.appendChild(this.createFilterTag(lang));
    });
  }

  static createFilterTag(language, isAll = false) {
    const tag = document.createElement('div');
    tag.className = `filter-tag ${isAll ? 'active' : ''}`;
    tag.innerHTML = `
      ${!isAll ? `<span class="language-dot"
       style="background: ${CONFIG.languageColors[language] || '#3a5ccc'}"></span>` : ''}
      ${language}
    `;

    tag.addEventListener('click', () => {
      if (isAll) {
        this.activeLanguages.clear();
        document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
      } else {
        tag.classList.toggle('active');
        tag.classList.contains('active')
          ? this.activeLanguages.add(language)
        : this.activeLanguages.delete(language);

        document.querySelector('.filter-tag:first-child').classList.remove('active');
      }

      if (this.activeLanguages.size === 0) {
        document.querySelector('.filter-tag:first-child').classList.add('active');
      }

      this.applyFilters();
    });

    return tag;
  }

  static applyFilters() {
    let filtered = this.activeLanguages.size > 0
    ? this.allRepos.filter(repo => this.activeLanguages.has(repo.language))
    : this.allRepos;

    filtered.sort(Utils.sorting[this.currentSortKey]);
    this.currentFilteredRepos = filtered;
    this.currentPage = 1;
    this.render();
  }

  static renderPagination() {
    const totalPages = Math.ceil(this.currentFilteredRepos.length / this.reposPerPage);
    const container = document.querySelector('.pagination-container');

    container.innerHTML = '';
    if (totalPages <= 1) return;

    const prevButton = this.createPaginationButton(
      '<i class="fas fa-chevron-left"></i> Previous',
      this.currentPage === 1,
      () => { this.currentPage--; this.render(); }
    );

    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;

    const nextButton = this.createPaginationButton(
      'Next <i class="fas fa-chevron-right"></i>',
      this.currentPage === totalPages,
      () => { this.currentPage++; this.render(); }
    );

    container.append(prevButton, pageInfo, nextButton);
  }

  static createPaginationButton(html, disabled, onClick) {
    const button = document.createElement('button');
    button.className = 'pagination-button';
    button.innerHTML = html;
    button.disabled = disabled;
    button.addEventListener('click', onClick);
    return button;
  }
}

// =============================================================================
// Custom Select Component
// =============================================================================
class CustomSelect {
  constructor(container, callback) {
    this.container = container;
    this.callback = callback;
    this.header = container.querySelector('.select-header');
    this.currentSort = container.querySelector('.select-header span');
    this.options = container.querySelectorAll('.select-options div');
    this.overlay = this.createOverlay();
    this.isOpen = false;

    this.init();
  }

  createOverlay() {
    return Utils.dom.createElement('div', 'dropdown-overlay');
  }

  init() {
    this.header.addEventListener('click', (e) => this.toggle(e));
    this.options.forEach(opt =>
                         opt.addEventListener('click', () => this.handleOptionClick(opt))
                        );
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) this.close();
    });
    document.body.appendChild(this.overlay);
    this.overlay.addEventListener('click', () => this.close())
  }

  toggle(e) {
    e.stopPropagation();
    this.container.classList.toggle('active');
    this.overlay.classList.toggle('active', !this.isOpen);
    this.isOpen = !this.isOpen;
  }

  close() {
    this.container.classList.remove('active');
    this.overlay.classList.remove('active');
    this.isOpen = false;
  }

  handleOptionClick(option) {
    this.currentSort.textContent = option.textContent;
    this.callback(option.dataset.sort);
    this.close();
  }
}

// =============================================================================
// Error Handling
// =============================================================================
const ErrorHandler = {
  handle(error) {
    console.error('Data loading error:', error);

    const template = document.getElementById('error-template');
    const clone = template.content.cloneNode(true);

    const title = clone.querySelector('.error-title');
    const description = clone.querySelector('.error-description');
    const button = clone.querySelector('.retry-button');

    title.textContent = this.getRandomTitle();
    description.textContent = this.getErrorMessage(error);
    button.onclick = () => window.location.reload();

    DOM.loadingSpinner.innerHTML = '';
    DOM.loadingSpinner.appendChild(clone);
    DOM.loadingSpinner.classList.add('error');

    // Hide main container when error occurs
    document.querySelector('.main-container').style.display = 'none';
  },

  getErrorMessage(error) {
    if (!navigator.onLine) return 'Network connection lost. Please check your internet connection.';
    if (error.message.includes('404')) return 'GitHub user not found. Please check the username.';
    return 'Failed to load data from GitHub. Please try again later.';
  },

  getRandomTitle() {
    const titles = [
      'Oops! Something Went Wrong',
      'Connection Failed',
      'Data Loading Error',
      'Technical Difficulties',
      'Awaa~... >_<\''
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }
};


// =============================================================================
// Application Initialization
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userParam = urlParams.get('user') || urlParams.get('u') || CONFIG.githubUsername;

  try {
    const [userData, reposData, starredResponse] = await Promise.all([
      GitHubService.fetchUserData(userParam),
      GitHubService.fetchRepos(userParam),
      GitHubService.fetchStarred(userParam)
    ]);
    const starredCount = await GitHubService.getTotalStarredCount(starredResponse);

    ProfileSystem.init(userData, starredCount);
    RepoSystem.init(reposData);
    new CustomSelect(DOM.customSelect, sortKey => RepoSystem.sort(sortKey));

    if (userParam !== CONFIG.githubUsername) {
      ProfileSystem.showUserPopup(userData.login);
      ProfileSystem.applyMaterialYou(userData.avatar_url); // MaterialYou Theme for Avatar
    }

    // Remove LoadingSpinner
    DOM.loadingSpinner.style.opacity = '0';
    setTimeout(() => DOM.loadingSpinner.remove(), 300);
  } catch (error) {
    ErrorHandler.handle(error);
  }
});

// =============================================================================
// Navigation: Bar & Scroll Effects
// =============================================================================
document.querySelector('.nav-menu-toggle').addEventListener('click', function(e) {
  e.stopPropagation();
  this.classList.toggle('active');
  document.querySelector('.nav-menu').classList.toggle('active');
});

document.addEventListener('click', (e) => {
  const menu = document.querySelector('.nav-menu');
  const toggle = document.querySelector('.nav-menu-toggle');

  if (!menu.contains(e.target) && !toggle.contains(e.target)) {
    menu.classList.remove('active');
    toggle.classList.remove('active');
  }
});

window.addEventListener('scroll', () => {
  const sectionTop = DOM.reposSection.offsetTop - 100;
  const isScrolled = window.scrollY > sectionTop;

  DOM.navContainer.classList.toggle('scrolled', isScrolled);
  DOM.navBrand.classList.toggle('scrolled', isScrolled);
  DOM.navBrand.classList.toggle('disabled', !isScrolled);
});