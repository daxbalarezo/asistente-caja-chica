import { db } from '../db.js'; // Ahora importamos el cliente de Supabase
import { showModal, hideModal, createTable } from './components.js';

const TABLE_NAME = 'empresas';

export async function renderEmpresas(container) {
    container.innerHTML = `
        <div class="page-header">
            <h2>Gestión de Empresas</h2>
            <button id="add-empresa-btn" class="btn btn-primary">➕ Nueva Empresa</button>
        </div>
        <div id="empresas-list" class="card"></div>
    `;

    await loadEmpresasTable();

    document.getElementById('add-empresa-btn').addEventListener('click', () => {
        showEmpresaForm();
    });
}

async function loadEmpresasTable() {
    const listContainer = document.getElementById('empresas-list');
    
    // --- CAMBIO CLAVE: Leer datos de Supabase ---
    const { data: empresas, error } = await db.from(TABLE_NAME).select('*').order('createdAt', { ascending: false });

    if (error) {
        console.error("Error al cargar empresas:", error);
        listContainer.innerHTML = "<p>Error al cargar las empresas desde la nube.</p>";
        return;
    }
    
    const headers = ['Nombre', 'Estado', 'Fecha Creación', 'Acciones'];
    const dataRows = empresas.map(e => [
        e.nombre,
        e.estado,
        new Date(e.createdAt).toLocaleDateString(),
        `
            <div class="actions">
                <button class="btn btn-secondary btn-sm edit-btn" data-id="${e.id}">✏️</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${e.id}">🗑️</button>
            </div>
        `
    ]);
    listContainer.innerHTML = createTable(headers, dataRows);

    listContainer.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async (event) => {
            const id = event.currentTarget.dataset.id;
            const { data: empresa, error } = await db.from(TABLE_NAME).select('*').eq('id', id).single();
            if (error) { console.error(error); return; }
            showEmpresaForm(empresa);
        });
    });

    listContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (event) => {
            const id = event.currentTarget.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar esta empresa?')) {
                // --- CAMBIO CLAVE: Borrar datos en Supabase ---
                const { error } = await db.from(TABLE_NAME).delete().eq('id', id);
                if (error) { console.error(error); alert("Error al eliminar"); }
                await loadEmpresasTable();
            }
        });
    });
}

function showEmpresaForm(empresa = null) {
    const isEditing = empresa !== null;
    const formContent = `
        <form id="empresa-form">
            <input type="hidden" name="id" value="${empresa?.id || ''}">
            <div class="form-grid">
                <div class="form-group">
                    <label for="nombre">Nombre de la Empresa</label>
                    <input type="text" id="nombre" name="nombre" value="${empresa?.nombre || ''}" required>
                </div>
                 <div class="form-group">
                    <label for="estado">Estado</label>
                    <select id="estado" name="estado">
                        <option value="activa" ${empresa?.estado === 'activa' ? 'selected' : ''}>Activa</option>
                        <option value="inactiva" ${empresa?.estado === 'inactiva' ? 'selected' : ''}>Inactiva</option>
                    </select>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">${isEditing ? 'Actualizar' : 'Guardar'}</button>
            </div>
        </form>
    `;

    showModal(isEditing ? 'Editar Empresa' : 'Nueva Empresa', formContent);

    document.getElementById('empresa-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const id = formData.get('id');

        try {
            if (id) { // Edit
                const empresaActualizada = { nombre: formData.get('nombre'), estado: formData.get('estado') };
                // --- CAMBIO CLAVE: Actualizar datos en Supabase ---
                const { error } = await db.from(TABLE_NAME).update(empresaActualizada).eq('id', id);
                if (error) { throw error; }
            } else { // Add
                const nuevaEmpresa = { nombre: formData.get('nombre'), estado: formData.get('estado') };
                // --- CAMBIO CLAVE: Insertar datos en Supabase ---
                const { error } = await db.from(TABLE_NAME).insert(nuevaEmpresa);
                if (error) { throw error; }
            }
            hideModal();
            await loadEmpresasTable();
        } catch (error) {
            console.error(error);
            alert("Error al guardar la empresa.");
        }
    });
}