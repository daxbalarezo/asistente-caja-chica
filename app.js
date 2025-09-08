import { db } from './db.js';
import { renderDashboard } from './ui/cuadre.js';
import { renderEmpresas } from './ui/empresas.js';
import { renderDesembolsos } from './ui/desembolsos.js';
import { renderRendiciones } from './ui/rendiciones.js';
import { renderCuadre } from './ui/cuadre.js';
import { renderAuth, handleLogout } from './ui/auth.js';

const routes = {
    '/': renderDashboard,
    'empresas': renderEmpresas,
    'desembolsos': renderDesembolsos,
    'rendiciones': renderRendiciones,
    'cuadre': renderCuadre,
    'auth': renderAuth,
};

const appRoot = document.getElementById('app-root');
let currentUser = null;

db.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    router();
});

async function router() {
    let path = window.location.hash.slice(1);
    if (path.startsWith('/')) {
        path = path.slice(1);
    }
    
    if (!currentUser && path !== 'auth') {
        window.location.hash = 'auth';
        return;
    }
    
    if (currentUser && path === 'auth') {
        window.location.hash = '/';
        return;
    }

    const routeKey = path === '' ? '/' : path;
    const viewRenderer = routes[routeKey] || routes['/'];
    
    try {
        appRoot.innerHTML = '<h2>Cargando...</h2>';
        await viewRenderer(appRoot);
        updateUI(currentUser);
    } catch (error) {
        console.error(`Error al renderizar la vista para ${path}:`, error);
        appRoot.innerHTML = `<p class="error">Error al cargar la página.</p>`;
    }
}

function updateUI(user) {
    const nav = document.querySelector('header nav');
    const settings = document.querySelector('.settings-menu');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    
    if (user) {
        nav.style.display = '';
        mobileMenuBtn.style.display = '';
        settings.style.display = 'flex';

        let logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn) {
            logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.textContent = 'Cerrar Sesión';
            logoutBtn.className = 'btn btn-danger btn-sm';
            logoutBtn.addEventListener('click', handleLogout);
            settings.appendChild(logoutBtn);
        }
    } else {
        nav.style.display = 'none';
        mobileMenuBtn.style.display = 'none';
        settings.style.display = 'none';
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.remove();
    }
    updateActiveLink();
}

function updateActiveLink() {
    let currentPath = window.location.hash.slice(1);
    if (currentPath.startsWith('/')) {
        currentPath = currentPath.slice(1);
    }
    if (currentPath === '') currentPath = '/';

    document.querySelectorAll('nav a').forEach(a => {
        const linkPath = a.getAttribute('href').slice(1) || '/';
        if (linkPath === currentPath) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });
}

window.addEventListener('hashchange', router);

// Lógica para el menú móvil (hamburguesa)
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const nav = document.querySelector('.app-header nav');

mobileMenuBtn.addEventListener('click', () => {
    nav.classList.toggle('active');
});

// Cierra el menú al hacer clic en un enlace
nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        nav.classList.remove('active');
    }
});