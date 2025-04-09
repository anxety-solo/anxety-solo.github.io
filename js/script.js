// =============================================================================
// Configuration
// =============================================================================
const CONFIG = {
  githubUsername: 'anxety-solo',
  cacheTTL: 900000,   // 15 min chache
  apiBase: 'https://api.github.com/users',
  starredPerPage: 50, // For Starred Page
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
  
  // Loading
  loadingSpinner: document.querySelector('.loading-spinner')
};


// =============================================================================
// Utilities
// =============================================================================
const Utils = {
  cache: {
    get: (key) => JSON.parse(localStorage.getItem(key)),
    set: (key, data) => localStorage.setItem(
      key,
      JSON.stringify({ data, timestamp: Date.now() })
    ),
    isValid: (cached, ttl) => Date.now() - cached.timestamp < ttl
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

    const starredCount = await getTotalStarredCount(starredResponse);

    ProfileSystem.init(userData, starredCount);
    RepoSystem.init(reposData);
    new CustomSelect(DOM.customSelect, sortKey => RepoSystem.sort(sortKey));

    if (userParam !== CONFIG.githubUsername) showUserPopup(userData.login);

    DOM.loadingSpinner.style.opacity = '0';
    setTimeout(() => DOM.loadingSpinner.remove(), 300);
  } catch (error) {
    ErrorHandler.handle(error, DOM.loadingSpinner);
  }
});

async function getTotalStarredCount(response) {
  try {
    const linkHeader = response.headers.get('Link');
    const data = await response.json();

    if (!linkHeader) return data.length;

    const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
    return lastPageMatch 
      ? (parseInt(lastPageMatch[1]) - 1) * CONFIG.starredPerPage + data.length
      : data.length;
  } catch (error) {
    console.error('Error fetching starred count:', error);
    return 'N/A';
  }
}

function showUserPopup(username) {
  const popup = document.getElementById('user-popup');
  popup.querySelector('.popup-username').textContent = `@${username}`;
  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), 5000);
}


// =============================================================================
// GitHub API Service
// =============================================================================
class GitHubService {
  static async fetchUserData(username) {
    return this.fetchWithCache(`${CONFIG.apiBase}/${username}`);
  }

  static async fetchRepos(username) {
    return this.fetchWithCache(`${CONFIG.apiBase}/${username}/repos`);
  }

  static async fetchStarred(username) {
    return fetch(`${CONFIG.apiBase}/${username}/starred`);
  }

  static async fetchWithCache(url) {
    const cacheKey = `gh-cache-${url}`;
    const cached = Utils.cache.get(cacheKey);

    if (cached && Utils.cache.isValid(cached, CONFIG.cacheTTL)) {
      console.log('Using cached data for:', url); // Logging Chache
      return cached.data;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
    const data = await response.json();

    Utils.cache.set(cacheKey, data);
    console.log('Fresh data fetched for:', url);
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
    this.setupNavigation(DOM.navBrand);
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
    DOM.navBrand.textContent = user.name || CONFIG.githubUsername;
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
      <a href="https://github.com/${username}${href}" 
         class="stat-item ${label.toLowerCase()}" 
         target="_blank">
        <span class="material-icons">${icon}</span>
        <span>${value} ${label}</span>
      </a>
    `).join('');
  }

  static setupNavigation(navBrand) {
    navBrand.addEventListener('click', (e) => {
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

  static init(repos) {
    if (!repos?.length) {
      DOM.reposSection.innerHTML = this.displayMessage('fa-folder-open', 'No public repositories found.');
      return;
    }

    this.allRepos = [...repos].sort(Utils.sorting.stars);
    this.setupSearch();
    this.generateLanguageFilters();
    this.render();
  }

  static render(repos = this.allRepos) {
    DOM.reposContainer.innerHTML = repos.length 
      ? repos.map(repo => this.createRepoCard(repo)).join('')
      : this.displayMessage('fa-search-minus', 'No repositories found matching your search.');
  }
  
  static displayMessage(icon, text) {
    return `
      <div class="no-repos-message">
        <i class="fas ${icon}"></i>
        <p>${text}</p>
      </div>
    `;
  }

  // Repo-Card
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
    return `
      <div class="repo-meta">
        <span class="meta-item">
          <span class="language-dot" 
                style="background: ${CONFIG.languageColors[repo.language] || '#3a5ccc'}">
          </span>
          ${repo.language || 'Unknown'}
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

  // Repo-Controls
  static setupSearch() {
    let timeoutId;
    
    DOM.repoSearch.addEventListener('input', () => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        const term = DOM.repoSearch.value.toLowerCase();
        const filtered = this.allRepos.filter(repo => 
          repo.name.toLowerCase().includes(term) || 
          (repo.description?.toLowerCase().includes(term)) || 
          (repo.topics?.some(topic => topic.toLowerCase().includes(term)))
        );
        this.render(filtered, false);
      }, 450);
    });
  }

  static sort(sortKey) {
    this.currentSortKey = sortKey;
    this.applyFilters();
  }

  // ====== Langue Filters Tab ======
  static currentSortKey = 'stars';
  
  static generateLanguageFilters() {
    const languages = new Set(
      this.allRepos
        .map(repo => repo.language)
        .filter(Boolean)
        .sort()
    );
    
    const container = document.querySelector('.filters-container');
    container.innerHTML = '';
    
    // Button "All"
    const allButton = this.createFilterTag('All', true);
    container.appendChild(allButton);

    // Langue Buttons
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
        if (tag.classList.contains('active')) {
          this.activeLanguages.add(language);
        } else {
          this.activeLanguages.delete(language);
        }
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
    let filtered = this.allRepos;

    if (this.activeLanguages.size > 0) {
      filtered = filtered.filter(repo => 
        this.activeLanguages.has(repo.language)
      );
    }

    filtered.sort(Utils.sorting[this.currentSortKey]);
    this.render(filtered, true);
  }
  
  // Observer-Animation for Card
  static setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.setProperty('--index', entry.target.dataset.index);
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.repo-card').forEach((card, index) => {
      card.dataset.index = index;
      observer.observe(card);
    });
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

    this.initialize();
  }

  createOverlay() {
    return Utils.dom.createElement('div', 'dropdown-overlay');
  }

  initialize() {
    this.header.addEventListener('click', (e) => this.toggle(e));
    this.options.forEach(opt => 
      opt.addEventListener('click', () => this.handleOptionClick(opt))
    );
    document.body.appendChild(this.overlay);
    this.overlay.addEventListener('click', () => this.close());
  }

  toggle(e) {
    e.stopPropagation();
    this.container.classList.toggle('active', !this.isOpen);
    this.overlay.classList.toggle('active', !this.isOpen);
    this.isOpen = !this.isOpen;
  }

  close() {
    this.container.classList.remove('active');
    this.overlay.classList.remove('active');
    this.isOpen = false;
  }

  handleOptionClick(option) {
    RepoSystem.currentSortKey = option.dataset.sort;
    this.currentSort.textContent = option.textContent;
    this.callback(option.dataset.sort);
    this.close();
  }
}


// =============================================================================
// Error Handling
// =============================================================================
const ErrorHandler = {
  handle(error, loadingSpinner) {
    console.error('Data loading error:', error);

    const template = document.getElementById('error-template');
    const clone = template.content.cloneNode(true);

    const title = clone.querySelector('.error-title');
    const description = clone.querySelector('.error-description');
    const button = clone.querySelector('.retry-button');

    title.textContent = this.getRandomTitle();
    description.textContent = this.getErrorMessage(error);
    button.onclick = () => window.location.reload();

    loadingSpinner.innerHTML = '';
    loadingSpinner.appendChild(clone);
    loadingSpinner.classList.add('error');
    loadingSpinner.style.opacity = '1';
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
      'Technical Difficulties'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }
};


// =============================================================================
// Scroll Effects | Navigation
// =============================================================================
window.addEventListener('scroll', () => {
  const sectionTop = document.getElementById('repositories').offsetTop - 100;
  const isScrolled = window.scrollY > sectionTop;

  DOM.navContainer.classList.toggle('scrolled', isScrolled);
  DOM.navBrand.classList.toggle('scrolled', isScrolled);
  DOM.navBrand.classList.toggle('disabled', !isScrolled);
});