class SortSystem {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.btn = this.container.querySelector('.sort-btn');
        this.dropdown = this.container.querySelector('.sort-dropdown');
        this.options = this.dropdown.querySelectorAll('li');
        this.currentSort = 'stars';
        this.init();
    }

    init() {
        // Toggle dropdown
        this.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dropdown.classList.toggle('show');
        });

        // Handle option selection
        this.options.forEach(option => {
            option.addEventListener('click', () => {
                this.currentSort = option.dataset.sort;
                this.updateButtonText(option.textContent);
                this.dropdown.classList.remove('show');
                this.dispatchSortEvent();
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.dropdown.classList.remove('show');
            }
        });
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
        displayRepos(sortedRepos);
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

async function fetchRepos() {
    const loader = document.querySelector('.loader');
    const container = document.getElementById('reposContainer');

    try {
        const response = await fetch('https://api.github.com/users/anxety-solo/repos');

        if (!response.ok) {
            showErrorPage(response.status);
            return;
        }

        const repos = (await response.json())
            .filter(repo => !repo.fork);

        const reposWithLanguages = await getReposWithLanguages(repos);

        const sortedRepos = sortReposByStars(reposWithLanguages);
        window.currentRepos = sortedRepos;
        displayRepos(sortedRepos);

        displayRepos(sortedRepos);
    } catch (error) {
        showErrorPage(error.status || 500);
    } finally {
        hideLoader(loader);
    }
}