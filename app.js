import { openDB, exportData, importData } from './db.js';
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

// Función de ruteo simple
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
window.addEventListener('load', async () => {
    try {
        await openDB();
        await router();
    } catch (error) {
        console.error("Error al inicializar la aplicación:", error);
        appRoot.innerHTML = `<p class="error">No se pudo inicializar la base de datos.</p>`;
    }
});

// Ajustes: Exportar/Importar
document.getElementById('export-json').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await exportData();
        alert('Datos exportados con éxito.');
    } catch (error) {
        console.error('Error al exportar datos:', error);
        alert('Hubo un error al exportar los datos.');
    }
});

const importInput = document.getElementById('import-json-input');
importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (confirm('¿Estás seguro de que quieres importar estos datos? Se borrarán todos los datos actuales.')) {
        try {
            await importData(file);
            alert('Datos importados con éxito. La página se recargará.');
            window.location.hash = '/';
            window.location.reload();
        } catch (error) {
            console.error('Error al importar datos:', error);
            alert('Hubo un error al importar los datos.');
        }
    }
    // Resetear el input para permitir importar el mismo archivo de nuevo
    importInput.value = ''; 
});

// Modo Oscuro
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
});

// Cargar tema guardado
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';