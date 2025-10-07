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

// Listener principal que reacciona a los cambios de sesión (Login/Logout)
db.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    router();
});

async function router() {
    if (!appRoot) {
        console.error('Elemento app-root no encontrado');
        return;
    }

    let path = window.location.hash.slice(1);
    if (path.startsWith('/')) {
        path = path.slice(1);
    }
    
    // Proteger rutas: si no hay usuario, forzar a la página de login
    if (!currentUser && path !== 'auth') {
        window.location.hash = 'auth';
        return;
    }
    
    // Redirigir si el usuario ya está logueado y va a la página de login
    if (currentUser && path === 'auth') {
        window.location.hash = '/';
        return;
    }

    const routeKey = path === '' ? '/' : path;
    const viewRenderer = routes[routeKey] || routes['/'];
    
    try {
        appRoot.innerHTML = '<div class="loading">Cargando...</div>';
        await viewRenderer(appRoot);
        updateUI(currentUser);
    } catch (error) {
        console.error(`Error al renderizar la vista para ${path}:`, error);
        appRoot.innerHTML = `
            <div class="error-container card" style="text-align:center;">
                <h2>Error al Cargar la Página</h2>
                <p>Hubo un problema al mostrar esta sección. Por favor, recarga la página.</p>
                <button onclick="window.location.reload()" class="btn btn-primary">Recargar</button>
            </div>
        `;
    }
}

function updateUI(user) {
    const nav = document.querySelector('header nav');
    const settings = document.querySelector('.settings-menu');
    const menuToggle = document.getElementById('menu-toggle');
    
    if (!nav || !settings || !menuToggle) {
        console.warn('Elementos de la cabecera no encontrados para actualizar UI.');
        return;
    }

    if (user) {
        nav.style.display = ''; // Permite que el CSS controle la visibilidad
        settings.style.display = 'flex';
        menuToggle.style.display = ''; // Permite que el CSS controle la visibilidad

        let logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn) {
            logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.textContent = 'Cerrar Sesión';
            logoutBtn.className = 'btn btn-danger';
            settings.appendChild(logoutBtn);
        }
        logoutBtn.onclick = handleLogout;

        updateActiveLink();

    } else {
        nav.style.display = 'none';
        settings.style.display = 'none';
        menuToggle.style.display = 'none';
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.remove();
    }
}

function updateActiveLink() {
    let currentPath = window.location.hash.slice(1);
    if (currentPath.startsWith('/')) currentPath = currentPath.slice(1);
    
    // Normaliza la ruta base a '/' para la comparación
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

// --- Lógica para el Menú Hamburguesa ---
const menuToggle = document.getElementById('menu-toggle');
const nav = document.querySelector('header nav');

if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('is-active');
        menuToggle.textContent = nav.classList.contains('is-active') ? '✕' : '☰';
    });

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (nav.classList.contains('is-active')) {
                nav.classList.remove('is-active');
                menuToggle.textContent = '☰';
            }
        });
    });
}

// --- Lógica para el Modo Oscuro ---
const themeToggleBtn = document.getElementById('theme-toggle');

function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if(themeToggleBtn) {
        themeToggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        let currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        themeToggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('theme', newTheme);
    });
}

// Inicializar el tema y el router cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    applyInitialTheme();
    router();
});