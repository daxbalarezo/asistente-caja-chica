// --- app.js (Versión Final con AuthStateChange) ---
import { db } from './db.js';
import { renderDashboard } from './ui/cuadre.js';
import { renderEmpresas } from './ui/empresas.js';
import { renderDesembolsos } from './ui/desembolsos.js';
import { renderRendiciones } from './ui/rendiciones.js';
import { renderCuadre } from './ui/cuadre.js';
import { renderAuth, handleLogout } from './ui/auth.js';

const routes = {
    '/': renderDashboard,
    '/empresas': renderEmpresas,
    '/desembolsos': renderDesembolsos,
    '/rendiciones': renderRendiciones,
    '/cuadre': renderCuadre,
    '#auth': renderAuth,
};

const appRoot = document.getElementById('app-root');
let currentUser = null;

// Listener principal que reacciona a los cambios de sesión (Login/Logout)
db.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    router(); // Llama al router cada vez que el estado de auth cambia
});

async function router() {
    const path = window.location.hash || '/';
    
    // Si no hay usuario y no estamos en la página de login, redirigir
    if (!currentUser && path !== '#auth') {
        window.location.hash = '#auth';
        return;
    }
    
    // Si hay usuario y estamos en la página de login, redirigir al dashboard
    if (currentUser && path === '#auth') {
        window.location.hash = '/';
        return;
    }

    const viewRenderer = routes[path] || routes['#auth'];
    
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

        // Añadimos un botón de Logout si no existe
        if (!document.getElementById('logout-btn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.textContent = 'Cerrar Sesión';
            logoutBtn.className = 'btn btn-danger';
            logoutBtn.onclick = handleLogout;
            settings.appendChild(logoutBtn);
        }

        const path = window.location.hash.slice(1) || '/';
        document.querySelectorAll('nav a').forEach(a => {
            const linkPath = a.getAttribute('href').slice(1);
            a.classList.toggle('active', linkPath === path || (path === '/' && linkPath === ''));
        });
    } else {
        nav.style.display = 'none';
        settings.style.display = 'none';
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.remove();
    }
}

// Event Listeners
window.addEventListener('hashchange', router);