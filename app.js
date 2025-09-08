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
    
    if (user) {
        nav.style.display = '';
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

        let currentPath = window.location.hash.slice(1);
        if (currentPath.startsWith('/')) {
            currentPath = currentPath.slice(1);
        }
        
        document.querySelectorAll('nav a').forEach(a => {
            let linkPath = a.getAttribute('href').slice(1);
            if (linkPath.startsWith('/')) {
                linkPath = linkPath.slice(1);
            }
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

// --- INICIO: Lógica para el Menú Hamburguesa ---
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
// --- FIN: Lógica para el Menú Hamburguesa ---


// --- INICIO: Lógica para el Modo Oscuro ---
const themeToggleBtn = document.getElementById('theme-toggle');

// Función para aplicar el tema guardado al cargar la página
function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light'; // 'light' como predeterminado
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

// Event listener para el botón que cambia el tema
themeToggleBtn.addEventListener('click', () => {
    // 1. Obtener el tema actual del atributo data-theme en la etiqueta <html>
    let currentTheme = document.documentElement.getAttribute('data-theme');
    
    // 2. Cambiar al tema opuesto
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // 3. Aplicar el nuevo tema al documento
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // 4. Actualizar el ícono del botón
    themeToggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    
    // 5. Guardar la preferencia del usuario en el almacenamiento local
    localStorage.setItem('theme', newTheme);
});

// Llamamos a la función al inicio para establecer el tema correcto
applyInitialTheme();
// --- FIN: Lógica para el Modo Oscuro ---

