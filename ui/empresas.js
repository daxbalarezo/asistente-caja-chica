import { getAll, getById, add, put, remove } from '../db.js';
import { createEmpresa } from '../models.js';
import { showModal, hideModal, createTable } from './components.js';

const STORE_NAME = 'empresas';

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
    try {
        const empresas = await getAll(STORE_NAME);
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

        // Attach event listeners after rendering
        listContainer.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async (event) => {
                const id = event.currentTarget.dataset.id;
                const empresa = await getById(STORE_NAME, id);
                showEmpresaForm(empresa);
            });
        });

        listContainer.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (event) => {
                const id = event.currentTarget.dataset.id;
                if (confirm('¿Estás seguro de que quieres eliminar esta empresa?')) {
                    await remove(STORE_NAME, id);
                    await loadEmpresasTable();
                }
            });
        });

    } catch (error) {
        console.error("Error al cargar empresas:", error);
        listContainer.innerHTML = "<p>Error al cargar las empresas.</p>";
    }
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
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').style.display='none'">Cancelar</button>
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
                const existingEmpresa = await getById(STORE_NAME, id);
                const updatedEmpresa = { ...existingEmpresa, nombre: formData.get('nombre'), estado: formData.get('estado') };
                await put(STORE_NAME, updatedEmpresa);
            } else { // Add
                const nuevaEmpresa = createEmpresa(formData.get('nombre'));
                await add(STORE_NAME, nuevaEmpresa);
            }
            hideModal();
            await loadEmpresasTable();
        } catch (error) {
            alert(error.message);
        }
    });
}