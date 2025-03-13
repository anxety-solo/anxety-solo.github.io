async function fetchRepos() {
    try {
        const response = await fetch('https://api.github.com/users/anxety-solo/repos');
        if (!response.ok) {
            if (response.status === 404) {
                window.location.href = '404.html';
            } else {
                window.location.href = 'error.html';
            }
            return;
        }

        let repos = await response.json();
        repos = repos.filter(repo => !repo.fork);
        
        // Get languages for each repository
        const reposWithLanguages = await Promise.all(repos.map(async repo => {
            const langResponse = await fetch(repo.languages_url);
            const languages = await langResponse.json();
            return {...repo, languages: Object.keys(languages)};
        }));

        const sortedRepos = reposWithLanguages.sort((a, b) => 
            b.stargazers_count - a.stargazers_count
        );

        const container = document.getElementById('reposContainer');
        container.innerHTML = '';

        sortedRepos.forEach((repo, index) => {
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
                        <div class="star-count">
                            <i class="fas fa-star"></i>
                            <span>${repo.stargazers_count}</span>
                        </div>
                        <div class="fork-count">
                            <i class="fas fa-code-branch"></i>
                            <span>${repo.forks_count}</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Add language icons
            const langContainer = card.querySelector('.languages-container');
            repo.languages.slice(0, 5).forEach(lang => {
                const icon = document.createElement('i');
                icon.className = getLanguageIcon(lang);
                icon.setAttribute('title', lang);
                langContainer.appendChild(icon);
            });

            card.style.animationDelay = `${index * 50}ms`;
            container.appendChild(card);
        });

        const loader = document.querySelector('.loader');
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 350);
        
    } catch (error) {
        console.error('Error fetching repositories:', error);
        document.querySelector('.loader').classList.add('hidden');
        window.location.href = 'error.html';
    }
}

// Function to get Font Awesome icons by language
function getLanguageIcon(language) {
    const icons = {
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
    return icons[language] || icons['Default'];
}

document.addEventListener('DOMContentLoaded', fetchRepos);