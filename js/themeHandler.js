class ThemeHandler {
    constructor() {
        this.themeToggle = document.querySelector('.theme-toggle');
        this.isProcessing = false;
        this.init();
    }

    init() {
        this.loadSavedTheme();
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    loadSavedTheme() {
        if (document.body.classList.length > 0) return;
        const savedTheme = localStorage.getItem('theme') || 
                          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.body.classList.add(`${savedTheme}-theme`);
    }

    toggleTheme() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        requestAnimationFrame(() => {
            const isDark = document.body.classList.contains('dark-theme');
            document.body.classList.remove(isDark ? 'dark-theme' : 'light-theme');
            document.body.classList.add(isDark ? 'light-theme' : 'dark-theme');
            localStorage.setItem('theme', isDark ? 'light' : 'dark');

            this.isProcessing = false;
        });
    }
}

new ThemeHandler();