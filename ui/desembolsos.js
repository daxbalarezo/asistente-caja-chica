import * as db from '../db.js';
import { createDesembolso } from '../models.js';
import { showModal, hideModal, createTable, formatCurrency } from './components.js';

const STORE_NAME = 'desembolsos';

export async function renderDesembolsos(container) {
    const empresas = await db.getAll('empresas');
    container.innerHTML = `
        <div class="page-header">
            <h2>Registro de Desembolsos</h2>
            <button id="add-desembolso-btn" class="btn btn-primary">➕ Nuevo Desembolso</button>
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
        <div id="desembolsos-list" class="card"></div>
    `;

    await loadDesembolsosTable();

    document.getElementById('add-desembolso-btn').addEventListener('click', () => showDesembolsoForm());
    document.getElementById('apply-filters').addEventListener('click', loadDesembolsosTable);
}

async function loadDesembolsosTable() {
    const listContainer = document.getElementById('desembolsos-list');
    listContainer.innerHTML = 'Cargando...';

    const empresaFilter = document.getElementById('empresa-filter').value;
    const startDateFilter = document.getElementById('start-date-filter').value;
    const endDateFilter = document.getElementById('end-date-filter').value;

    try {
        let desembolsos = await db.getAll(STORE_NAME);
        const empresas = await db.getAll('empresas');
        const empresaMap = new Map(empresas.map(e => [e.id, e.nombre]));

        // Aplicar filtros
        if (empresaFilter) {
            desembolsos = desembolsos.filter(d => d.empresaId === empresaFilter);
        }
        if (startDateFilter) {
            desembolsos = desembolsos.filter(d => d.fecha >= startDateFilter);
        }
        if (endDateFilter) {
            desembolsos = desembolsos.filter(d => d.fecha <= endDateFilter);
        }
        
        desembolsos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        const headers = ['Fecha', 'Empresa', 'Responsable', 'Monto', 'Descripción', 'Captura', 'Acciones'];
        const dataRows = desembolsos.map(d => [
            new Date(d.fecha).toLocaleDateString(),
            empresaMap.get(d.empresaId) || 'N/A',
            d.responsable,
            formatCurrency(d.monto, d.moneda),
            d.descripcion,
            d.imagenDataUrl 
                ? `<a href="${d.imagenDataUrl}" download="desembolso-${d.fecha}.png" class="btn btn-secondary btn-sm">Descargar</a>` 
                : 'No hay',
            `<div class="actions">
                <button class="btn btn-secondary btn-sm edit-btn" data-id="${d.id}">✏️</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${d.id}">🗑️</button>
            </div>`
        ]);

        listContainer.innerHTML = createTable(headers, dataRows);

        listContainer.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const desembolso = await db.getById(STORE_NAME, e.currentTarget.dataset.id);
                showDesembolsoForm(desembolso);
            });
        });

        listContainer.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('¿Eliminar este desembolso?')) {
                    await db.remove(STORE_NAME, e.currentTarget.dataset.id);
                    await loadDesembolsosTable();
                }
            });
        });

    } catch (error) {
        console.error("Error al cargar desembolsos:", error);
        listContainer.innerHTML = "<p>Error al cargar desembolsos.</p>";
    }
}

async function showDesembolsoForm(desembolso = null) {
    const isEditing = !!desembolso;
    const empresas = await db.getAll('empresas');
    const formContent = `
        <form id="desembolso-form">
            <input type="hidden" name="id" value="${desembolso?.id || ''}">
            <div class="form-grid">
                <div class="form-group">
                    <label for="fecha">Fecha</label>
                    <input type="date" id="fecha" name="fecha" value="${desembolso?.fecha || new Date().toISOString().slice(0,10)}" required>
                </div>
                <div class="form-group">
                    <label for="empresaId">Empresa</label>
                    <select id="empresaId" name="empresaId" required>
                        ${empresas.map(e => `<option value="${e.id}" ${desembolso?.empresaId === e.id ? 'selected' : ''}>${e.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="responsable">Responsable</label>
                    <input type="text" id="responsable" name="responsable" value="${desembolso?.responsable || ''}" required>
                </div>
                <div class="form-group">
                    <label for="monto">Monto</label>
                    <input type="number" id="monto" name="monto" step="0.01" min="0.01" value="${desembolso?.monto || ''}" required>
                </div>
                <div class="form-group">
                    <label for="medioPago">Medio de Pago</label>
                    <select id="medioPago" name="medioPago">
                        <option value="efectivo" ${desembolso?.medioPago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                        <option value="transferencia" ${desembolso?.medioPago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                        <option value="otro" ${desembolso?.medioPago === 'otro' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="descripcion">Descripción</label>
                    <textarea id="descripcion" name="descripcion">${desembolso?.descripcion || ''}</textarea>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="imagen">Captura del Desembolso (Opcional)</label>
                    <input type="file" id="imagen" name="imagen" accept="image/*">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">${isEditing ? 'Actualizar' : 'Guardar'}</button>
            </div>
        </form>
    `;
    showModal(isEditing ? 'Editar Desembolso' : 'Nuevo Desembolso', formContent);

    document.getElementById('desembolso-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
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
                await db.add(STORE_NAME, createDesembolso(data));
            }
            hideModal();
            await loadDesembolsosTable();
        } catch (error) {
            console.error("Error al guardar desembolso:", error);
            alert(error.message);
        }
    });
}