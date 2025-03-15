class SortSystem {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.btn = this.container.querySelector('.sort-btn');
        this.dropdown = this.container.querySelector('.sort-dropdown');
        this.options = this.dropdown.querySelectorAll('li');
        this.currentSort = 'stars';

        // Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'dropdown-overlay';
        document.body.appendChild(this.overlay);      

        this.init();
    }

    init() {
        // Toggle dropdown
        this.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Handle option selection
        this.overlay.addEventListener('click', () => this.closeDropdown());

        this.options.forEach(option => {
            option.addEventListener('click', () => {
                this.currentSort = option.dataset.sort;
                this.updateButtonText(option.textContent);
                this.closeDropdown();
                this.dispatchSortEvent();
            });
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    toggleDropdown() {
        this.dropdown.classList.toggle('show');
        this.overlay.classList.toggle('active');
        if (this.dropdown.classList.contains('show')) {
            this.dropdown.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }
    }

    closeDropdown() {
        this.dropdown.classList.remove('show');
        this.overlay.classList.remove('active');
    }

    updateButtonText(text) {
        this.btn.innerHTML = `<i class="fas fa-sort"></i> ${text}`;
    }

    dispatchSortEvent() {
        const event = new CustomEvent('sortChanged', { 
            detail: { sortType: this.currentSort }
        });
        document.dispatchEvent(event);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sortSystem = new SortSystem('.sort-container');

    document.addEventListener('sortChanged', (e) => {
        const sortedRepos = sortRepositories(window.currentRepos, e.detail.sortType);
    });
});

function sortRepositories(repos, sortType) {
    return [...repos].sort((a, b) => {
        switch(sortType) {
            case 'stars':
                return b.stargazers_count - a.stargazers_count;
            case 'forks':
                return b.forks_count - a.forks_count;
            case 'updated':
                return new Date(b.updated_at) - new Date(a.updated_at);
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });
}