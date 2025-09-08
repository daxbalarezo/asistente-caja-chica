import * as db from '../db.js';
import { createRendicion } from '../models.js';
import { showModal, hideModal, createTable, formatCurrency } from './components.js';

const STORE_NAME = 'rendiciones';

export async function renderRendiciones(container) {
    const empresas = await db.getAll('empresas');
    container.innerHTML = `
        <div class="page-header">
            <h2>Registro de Rendiciones</h2>
            <button id="add-rendicion-btn" class="btn btn-primary">➕ Nueva Rendición</button>
        </div>
         <div class="filters card">
            <select id="empresa-filter">
                <option value="">Todas las empresas</option>
                ${empresas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')}
            </select>
            <input type="date" id="start-date-filter">
            <input type="date" id="end-date-filter">
            <button id="apply-filters" class="btn btn-secondary">Filtrar</button>
        </div>
        <div id="rendiciones-list" class="card"></div>
    `;

    await loadRendicionesTable();

    document.getElementById('add-rendicion-btn').addEventListener('click', () => showRendicionForm());
    document.getElementById('apply-filters').addEventListener('click', loadRendicionesTable);
}

async function loadRendicionesTable() {
    const listContainer = document.getElementById('rendiciones-list');
    listContainer.innerHTML = 'Cargando...';

    const empresaFilter = document.getElementById('empresa-filter').value;
    const startDateFilter = document.getElementById('start-date-filter').value;
    const endDateFilter = document.getElementById('end-date-filter').value;

    try {
        let rendiciones = await db.getAll(STORE_NAME);
        const empresas = await db.getAll('empresas');
        const empresaMap = new Map(empresas.map(e => [e.id, e.nombre]));

        // Filtros
        if (empresaFilter) rendiciones = rendiciones.filter(r => r.empresaId === empresaFilter);
        if (startDateFilter) rendiciones = rendiciones.filter(r => r.fecha >= startDateFilter);
        if (endDateFilter) rendiciones = rendiciones.filter(r => r.fecha <= endDateFilter);
        
        rendiciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        const headers = ['Fecha', 'Empresa', 'Proveedor', 'Documento', 'Monto', 'Imagen', 'Acciones'];
        const dataRows = rendiciones.map(r => [
            new Date(r.fecha).toLocaleDateString(),
            empresaMap.get(r.empresaId) || 'N/A',
            r.proveedor,
            `${r.documento.tipo} ${r.documento.numero}`,
            formatCurrency(r.monto),
            r.imagenDataUrl
                ? `<a href="${r.imagenDataUrl}" download="rendicion-${r.fecha}.png" class="btn btn-secondary btn-sm">Descargar</a>`
                : 'No hay',
            `<div class="actions">
                <button class="btn btn-secondary btn-sm edit-btn" data-id="${r.id}">✏️</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${r.id}">🗑️</button>
            </div>`
        ]);

        listContainer.innerHTML = createTable(headers, dataRows);

        listContainer.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                const rendicion = await db.getById(STORE_NAME, e.currentTarget.dataset.id);
                showRendicionForm(rendicion);
            });
        });

        listContainer.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                if (confirm('¿Eliminar esta rendición?')) {
                    await db.remove(STORE_NAME, e.currentTarget.dataset.id);
                    await loadRendicionesTable();
                }
            });
        });

    } catch (error) {
        console.error("Error al cargar rendiciones:", error);
        listContainer.innerHTML = "<p>Error al cargar rendiciones.</p>";
    }
}

async function showRendicionForm(rendicion = null) {
    const isEditing = !!rendicion;
    const empresas = await db.getAll('empresas');

    const formContent = `
        <form id="rendicion-form">
            <input type="hidden" name="id" value="${rendicion?.id || ''}">
            <div class="form-grid">
                <div class="form-group">
                    <label for="fecha">Fecha</label>
                    <input type="date" name="fecha" value="${rendicion?.fecha || new Date().toISOString().slice(0,10)}" required>
                </div>
                <div class="form-group">
                    <label for="empresaId">Empresa</label>
                    <select name="empresaId" required>
                        ${empresas.map(e => `<option value="${e.id}" ${rendicion?.empresaId === e.id ? 'selected' : ''}>${e.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="proveedor">Proveedor</label>
                    <input type="text" name="proveedor" value="${rendicion?.proveedor || ''}" required>
                </div>
                <div class="form-group">
                    <label for="documento-tipo">Tipo Documento</label>
                    <select name="documento-tipo">
                        <option value="factura" ${rendicion?.documento?.tipo === 'factura' ? 'selected' : ''}>Factura</option>
                        <option value="boleta" ${rendicion?.documento?.tipo === 'boleta' ? 'selected' : ''}>Boleta</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="documento-numero">N° Documento</label>
                    <input type="text" name="documento-numero" value="${rendicion?.documento?.numero || ''}" required>
                </div>
                <div class="form-group">
                    <label for="monto">Monto</label>
                    <input type="number" name="monto" step="0.01" min="0.01" value="${rendicion?.monto || ''}" required>
                </div>
                <div class="form-group">
                    <label for="categoria">Categoría</label>
                    <input type="text" name="categoria" value="${rendicion?.categoria || 'Varios'}">
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="imagen">Imagen del Documento (Opcional)</label>
                    <input type="file" id="imagen" name="imagen" accept="image/*">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">${isEditing ? 'Actualizar' : 'Guardar'}</button>
            </div>
        </form>
    `;
    showModal(isEditing ? 'Editar Rendición' : 'Nueva Rendición', formContent);

    document.getElementById('rendicion-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            id: formData.get('id'),
            empresaId: formData.get('empresaId'),
            fecha: formData.get('fecha'),
            proveedor: formData.get('proveedor'),
            documento: {
                tipo: formData.get('documento-tipo'),
                numero: formData.get('documento-numero')
            },
            monto: formData.get('monto'),
            categoria: formData.get('categoria')
        };
        const fileInput = document.getElementById('imagen');
        
        const readFileAsDataURL = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
        };
        
        try {
            if (fileInput.files.length > 0) {
                data.imagenDataUrl = await readFileAsDataURL(fileInput.files[0]);
            }

            if (data.id) {
                const existing = await db.getById(STORE_NAME, data.id);
                if (!data.imagenDataUrl) {
                    data.imagenDataUrl = existing.imagenDataUrl;
                }
                await db.put(STORE_NAME, { ...existing, ...data, monto: parseFloat(data.monto) });
            } else {
                await db.add(STORE_NAME, createRendicion(data));
            }
            hideModal();
            await loadRendicionesTable();
        } catch (error) {
            alert(error.message);
        }
    });
}