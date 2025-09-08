// --- app.js (Versión Final con Router Corregido) ---
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
    // --- LÓGICA DEL ROUTER MEJORADA ---
    let path = window.location.hash.slice(1); // Obtenemos la ruta, ej: "/rendiciones" o "auth"
    if (path.startsWith('/')) {
        path = path.slice(1); // Le quitamos la barra inicial para que quede "rendiciones"
    }
    
    // Si no hay usuario y no estamos en la página de login, redirigir
    if (!currentUser && path !== 'auth') {
        window.location.hash = 'auth';
        return;
    }
    
    // Si hay usuario y estamos en la página de login, redirigir al dashboard
    if (currentUser && path === 'auth') {
        window.location.hash = '/';
        return;
    }

    // Si la ruta está vacía, es el dashboard
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
    
    if (user) {
        nav.style.display = 'flex';
        settings.style.display = 'flex';

        let logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn) {
            logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.textContent = 'Cerrar Sesión';
            logoutBtn.className = 'btn btn-danger';
            settings.appendChild(logoutBtn);
        }
        logoutBtn.onclick = handleLogout;

        // Corregimos también cómo se detecta la ruta activa
        let currentPath = window.location.hash.slice(1);
        if (currentPath.startsWith('/')) {
            currentPath = currentPath.slice(1);
        }
        
        document.querySelectorAll('nav a').forEach(a => {
            let linkPath = a.getAttribute('href').slice(1);
            if (linkPath.startsWith('/')) {
                linkPath = linkPath.slice(1);
            }
            // El dashboard es un caso especial
            if (linkPath === '' && (currentPath === '' || currentPath === '/')) {
                 a.classList.add('active');
            } else if (linkPath !== '' && linkPath === currentPath) {
                 a.classList.add('active');
            } else {
                 a.classList.remove('active');
            }
        });

    } else {
        nav.style.display = 'none';
        settings.style.display = 'none';
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.remove();
    }
}

window.addEventListener('hashchange', router);