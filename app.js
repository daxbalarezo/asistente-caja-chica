// --- app.js (Actualizado para Supabase) ---

// Ya no necesitamos importar nada de db.js aquí.
import { renderDashboard } from './ui/cuadre.js';
import { renderEmpresas } from './ui/empresas.js';
import { renderDesembolsos } from './ui/desembolsos.js';
import { renderRendiciones } from './ui/rendiciones.js';
import { renderCuadre } from './ui/cuadre.js';

const routes = {
    '/': renderDashboard,
    '/empresas': renderEmpresas,
    '/desembolsos': renderDesembolsos,
    '/rendiciones': renderRendiciones,
    '/cuadre': renderCuadre,
};

const appRoot = document.getElementById('app-root');

// Función de ruteo simple (sin cambios)
async function router() {
    const path = window.location.hash.slice(1) || '/';
    const viewRenderer = routes[path];
    
    if (viewRenderer) {
        try {
            appRoot.innerHTML = '<h2>Cargando...</h2>';
            await viewRenderer(appRoot);
            updateActiveLink();
        } catch (error) {
            console.error(`Error al renderizar la vista para ${path}:`, error);
            appRoot.innerHTML = `<p class="error">Error al cargar la página. Revise la consola.</p>`;
        }
    } else {
        appRoot.innerHTML = '<h2>Página no encontrada</h2>';
    }
}

function updateActiveLink() {
    const path = window.location.hash.slice(1) || '/';
    document.querySelectorAll('nav a').forEach(a => {
        const linkPath = a.getAttribute('href').slice(1);
        if (linkPath === path || (path === '/' && linkPath === '')) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });
}

// --- Event Listeners ---
// Navegación
window.addEventListener('hashchange', router);
// La carga ahora es más simple, ya no necesita 'openDB()'
window.addEventListener('load', router);

// Ajustes: Exportar/Importar (Temporalmente deshabilitados)
document.getElementById('export-json').addEventListener('click', (e) => {
    e.preventDefault();
    alert('Esta función será rediseñada para funcionar con la base de datos en la nube.');
});

const importInput = document.getElementById('import-json-input');
importInput.addEventListener('change', (e) => {
    alert('Esta función será rediseñada para funcionar con la base de datos en la nube.');
    importInput.value = ''; 
});

// Modo Oscuro (sin cambios)
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
});

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';