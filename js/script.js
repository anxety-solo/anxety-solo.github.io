// =============================================================================
// Configuration
// =============================================================================
const CONFIG = {
  githubUsername: 'anxety-solo',
  cacheTTL: 900000, // 15 min
  apiBase: 'https://api.github.com/users',
  languageColors: {
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Java: '#b07219',
    TypeScript: '#3178c6',
    PHP: '#4F5D95',
    Ruby: '#701516',
    'C++': '#f34b7d',
    'C#': '#178600',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    Go: '#00ADD8',
    Rust: '#dea584',
    HTML: '#e34c26',
    CSS: '#563d7c',
    SCSS: '#c6538c',
    Shell: '#89e051'
  }
};

// =============================================================================
// DOM Elements
// =============================================================================
const DOM = {
  navContainer: document.querySelector('.nav-container'),
  navBrand: document.querySelector('.nav-brand'),
  githubProfileLink: document.getElementById('githubProfileLink'),
  userAvatar: document.getElementById('userAvatar'),
  userLogin: document.getElementById('user-login'),
  userName: document.getElementById('userName'),
  userBio: document.getElementById('userBio'),
  userStats: document.getElementById('userStats'),
  repoSearch: document.getElementById('repoSearch'),
  reposContainer: document.getElementById('reposContainer'),
  customSelect: document.querySelector('.custom-select')
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
    ['stars']: (a, b) => b.stargazers_count - a.stargazers_count,
    ['updated']: (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
    ['name']: (a, b) => a.name.localeCompare(b.name),
    ['forks']: (a, b) => b.forks_count - a.forks_count
  }
};

// =============================================================================
// Data Fetching
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Load-Spinner
  const loadingSpinner = document.querySelector('.loading-spinner');

  // Load Data
  try {
    const urls = {
      user: `${CONFIG.apiBase}/${CONFIG.githubUsername}`,
      repos: `${CONFIG.apiBase}/${CONFIG.githubUsername}/repos`
    };

    const [userData, reposData] = await Promise.all([
      ApiService.fetchWithCache(urls.user),
      ApiService.fetchWithCache(urls.repos)
    ]);

    ProfileSystem.init(userData);
    RepoSystem.init(reposData);
    new CustomSelect(DOM.customSelect);

    // Remove Load-Spiner After Load Data
    loadingSpinner.style.opacity = '0';
    setTimeout(() => loadingSpinner.remove(), 300);
  } catch (error) {
    ErrorHandler.handle(error, loadingSpinner);
  }
});

const ApiService = {
  async fetchWithCache(url) {
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
};

// =============================================================================
// Profile System
// =============================================================================
const ProfileSystem = {
  init(user) {
    this.updateDocumentMeta(user);
    this.updateFavicon(user.avatar_url);
    this.updateProfileInfo(user);
    this.setupNavigation();
  },

  updateDocumentMeta(user) {
    const title = (user.name || user.login).toUpperCase();
    document.title = `GitHub | ${title}`;
  },

  async updateFavicon(avatarUrl) {
    try {
      const canvas = await this.createRoundFavicon(avatarUrl);
      document.getElementById('dynamic-favicon').href = canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Favicon error:', e);
    }
  },

  createRoundFavicon(avatarUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = `${avatarUrl}&size=128`;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 32;

        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(16, 16, 16, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0, 32, 32);

        resolve(canvas);
      };

      img.onerror = reject;
    });
  },

  updateProfileInfo(user) {
    DOM.navBrand.textContent = user.name || CONFIG.githubUsername;
    DOM.githubProfileLink.href = user.html_url;
    DOM.userAvatar.src = user.avatar_url;
    DOM.userName.textContent = user.name || user.login;
    DOM.userBio.querySelector('.profile-bio').textContent = user.bio || 'No bio available';

    if (user.login) {
      DOM.userBio.querySelector('.user-login').textContent = `@${user.login}`;
    }

    DOM.userStats.innerHTML = this.generateStatsHTML([
      { icon: 'people', value: user.followers, label: 'Followers' },
      { icon: 'remove_red_eye', value: user.following, label: 'Following' },
      { icon: 'storage', value: user.public_repos, label: 'Repos' }
    ]);
  },

  generateStatsHTML(stats) {
    return stats.map(({ icon, value, label }) => `
      <div class="stat-item">
        <span class="material-icons">${icon}</span>
        <span>${value} ${label}</span>
      </div>
    `).join('');
  },

  setupNavigation() {
    DOM.navBrand.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
};

// =============================================================================
// Repository System
// =============================================================================
const RepoSystem = {
  allRepos: [],

  init(repos) {
    if (!repos || repos.length === 0) {
      this.showNoReposMessage();
      return;
    }

    this.allRepos = [...repos].sort(Utils.sorting['stars']);
    this.setupSearch();
    this.render();
  },

  showNoReposMessage() {
    const reposSection = document.getElementById('repositories');
    reposSection.innerHTML = `
      <div class="no-repos-message">
        <i class="fas fa-folder-open"></i>
        <p>No public repositories found.</p>
      </div>
    `;
  },

  render(repos = this.allRepos) {
    DOM.reposContainer.innerHTML = repos.map(repo => this.createRepoCard(repo)).join('');
  },

  createRepoCard(repo) {
    return `
      <div class="repo-card ${repo.fork ? 'forked' : ''}">
        ${repo.fork ? '<div class="fork-badge">Fork</div>' : ''}
        <div class="repo-content">
          ${this.createRepoHeader(repo)}
          ${this.createRepoDescription(repo)}
          ${this.createRepoMeta(repo)}
          <a href="${repo.html_url}" class="repo-button" target="_blank">
            <span class="material-icons">launch</span>
            View Repository
          </a>
        </div>
      </div>
    `;
  },

  createRepoHeader(repo) {
    return `
      <div class="repo-header">
        <a href="${repo.html_url}" class="repo-name">${repo.name}</a>
        <span class="repo-star">
          <span class="material-icons">star</span>
          ${repo.stargazers_count}
        </span>
      </div>
    `;
  },

  createRepoDescription(repo) {
    return `
      <div class="description-box">
        <p class="repo-description">${repo.description || 'No description'}</p>
      </div>
    `;
  },

  createRepoMeta(repo) {
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
  },

  setupSearch() {
    DOM.repoSearch.addEventListener('input', () => {
      const term = DOM.repoSearch.value.toLowerCase();
      const filtered = this.allRepos.filter(repo => 
                                            repo.name.toLowerCase().includes(term) ||
                                            (repo.description?.toLowerCase().includes(term))
                                           );
      this.render(filtered);
    });
  },

  sort(sortKey) {
    this.allRepos.sort(Utils.sorting[sortKey]);
    this.render();
  }
};

// =============================================================================
// Custom Select Component
// =============================================================================
class CustomSelect {
  constructor(container) {
    this.container = container;
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
    this.currentSort.textContent = option.textContent;
    RepoSystem.sort(option.dataset.sort);
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