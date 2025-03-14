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
    } catch (error) {
        showErrorPage(error.status || 500);
    } finally {
        hideLoader(loader);
    }
}

async function getReposWithLanguages(repos) {
    return Promise.all(repos.map(async repo => {
        const langResponse = await fetch(repo.languages_url);
        const languages = await langResponse.json();
        return {...repo, languages: Object.keys(languages)};
    }));
}

function sortReposByStars(repos) {
    return [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
}

function displayRepos(repos) {
    window.currentRepos = repos;

    const container = document.getElementById('reposContainer');
    const fragment = document.createDocumentFragment();

    repos.forEach((repo, index) => {
        const card = createRepoCard(repo, index);
        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function createRepoCard(repo, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card-content">
            <h2>${repo.name}</h2>
            <p>${repo.description || 'No description provided'}</p>
            <div class="languages-container"></div>
        </div>
        <div class="card-footer">
            <a href="${repo.html_url}" target="_blank">View Repository</a>
            <div class="repo-stats">
                ${createStatItem('star', repo.stargazers_count)}
                ${createStatItem('code-branch', repo.forks_count)}
            </div>
        </div>
    `;

    addLanguageIcons(card.querySelector('.languages-container'), repo.languages);
    card.style.animationDelay = `${index * 50}ms`;
    return card;
}

function addLanguageIcons(container, languages) {
    languages.slice(0, 5).forEach(lang => {
        const icon = document.createElement('i');
        icon.className = getLanguageIcon(lang);
        icon.title = lang;
        container.appendChild(icon);
    });
}

function createStatItem(iconType, count) {
    return `
        <div class="${iconType}-count">
            <i class="fas fa-${iconType}"></i>
            <span>${count}</span>
        </div>
    `;
}

function showErrorPage(statusCode) {
    const container = document.getElementById('reposContainer');
    const errorType = statusCode === 404 ? '404' : 'Error';
    const errorMessage = statusCode === 404 
        ? 'Repositories not found' 
        : 'Failed to load data';

    container.innerHTML = `
        <div class="error-container">
            <h1>${errorType}</h1>
            <p>${errorMessage}</p>
        </div>
    `;

    hideLoader(document.querySelector('.loader'));
    window.history.replaceState({}, document.title, window.location.pathname);
}

function hideLoader(loader) {
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 350);
    }
}

function getLanguageIcon(language) {
    const iconMap = {
        'JavaScript': 'fab fa-js-square',
        'Python': 'fab fa-python',
        'Java': 'fab fa-java',
        'HTML': 'fab fa-html5',
        'CSS': 'fab fa-css3-alt',
        'PHP': 'fab fa-php',
        'Ruby': 'fab fa-ruby',
        'C++': 'fab fa-cuttlefish',
        'Swift': 'fab fa-swift',
        'Default': 'fas fa-code'
    };
    return iconMap[language] || iconMap.Default;
}

document.addEventListener('DOMContentLoaded', fetchRepos);