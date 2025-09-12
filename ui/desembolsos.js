import { db } from '../db.js';
import { showModal, hideModal, createTable, formatCurrency } from './components.js';

const TABLE_NAME = 'desembolsos';

export async function renderDesembolsos(container) {
    const { data: empresas, error } = await db.from('empresas').select('id, nombre');
    if (error) console.error("Error cargando empresas para el filtro:", error);

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

    let query = db.from(TABLE_NAME).select(`
        *,
        empresas ( nombre )
    `).order('fecha', { ascending: false });

    const empresaFilter = document.getElementById('empresa-filter').value;
    const startDateFilter = document.getElementById('start-date-filter').value;
    const endDateFilter = document.getElementById('end-date-filter').value;

    if (empresaFilter) query = query.eq('"empresaId"', empresaFilter);
    if (startDateFilter) query = query.gte('fecha', startDateFilter);
    if (endDateFilter) query = query.lte('fecha', endDateFilter);
    
    const { data: desembolsos, error } = await query;

    if (error) {
        console.error("Error al cargar desembolsos:", error);
        listContainer.innerHTML = "<p>Error al cargar desembolsos.</p>";
        return;
    }

    const headers = ['Fecha', 'Empresa', 'N° Req.', 'Responsable', 'Monto', 'Comprobante', 'Acciones'];
    const dataRows = desembolsos.map(d => [
        new Date(d.fecha).toLocaleDateString(),
        d.empresas.nombre || 'N/A',
        d.numero_requerimiento || '',
        d.responsable,
        formatCurrency(d.monto, d.moneda),
        d.imagenDataUrl 
            ? `<a href="${d.imagenDataUrl}" download="desembolso-${d.id}.png" class="btn btn-secondary btn-sm">Ver</a>` 
            : 'No hay',
        `<div class="actions">
            <button class="btn btn-secondary btn-sm edit-btn" data-id="${d.id}">✏️</button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${d.id}">🗑️</button>
        </div>`
    ]);

    listContainer.innerHTML = createTable(headers, dataRows);

    listContainer.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const { data: desembolso } = await db.from(TABLE_NAME).select('*').eq('id', id).single();
            showDesembolsoForm(desembolso);
        });
    });

    listContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm('¿Eliminar este desembolso?')) {
                await db.from(TABLE_NAME).delete().eq('id', e.currentTarget.dataset.id);
                await loadDesembolsosTable();
            }
        });
    });
}

async function showDesembolsoForm(desembolso = null) {
    const isEditing = !!desembolso;
    const { data: empresas } = await db.from('empresas').select('id, nombre');
    
    const formContent = `
        <form id="desembolso-form">
            <input type="hidden" name="id" value="${desembolso?.id || ''}">
            <div class="form-grid">
                <div class="form-group">
                    <label for="fecha">Fecha</label>
                    <input type="date" name="fecha" value="${desembolso?.fecha || new Date().toISOString().slice(0,10)}" required>
                </div>
                <div class="form-group">
                    <label for="empresaId">Empresa</label>
                    <select name="empresaId" required>
                        ${empresas.map(e => `<option value="${e.id}" ${desembolso?.empresaId === e.id ? 'selected' : ''}>${e.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="numero_requerimiento">N° Requerimiento</label>
                    <input type="text" name="numero_requerimiento" value="${desembolso?.numero_requerimiento || ''}">
                </div>
                <div class="form-group">
                    <label for="responsable">Responsable</label>
                    <input type="text" name="responsable" value="${desembolso?.responsable || ''}" required>
                </div>
                <div class="form-group">
                    <label for="monto">Monto</label>
                    <input type="number" name="monto" step="0.01" min="0.01" value="${desembolso?.monto || ''}" required>
                </div>
                <div class="form-group">
                    <label for="medioPago">Medio de Pago</label>
                    <select name="medioPago">
                        <option value="efectivo" ${desembolso?.medioPago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                        <option value="transferencia" ${desembolso?.medioPago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                        <option value="yape" ${desembolso?.medioPago === 'yape' ? 'selected' : ''}>Yape</option>
                        <option value="otro" ${desembolso?.medioPago === 'otro' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="descripcion">Descripción</label>
                    <textarea name="descripcion">${desembolso?.descripcion || ''}</textarea>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="imagen">Comprobante (Obligatorio)</label>
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
        delete data.imagen;

        const fileInput = document.getElementById('imagen');
        const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });

        try {
            if (fileInput.files.length > 0) {
                data.imagenDataUrl = await readFileAsDataURL(fileInput.files[0]);
            } else if (!data.id) {
                 data.imagenDataUrl = null;
            }

            if (data.id) {
                const id = data.id;
                delete data.id;
                await db.from(TABLE_NAME).update(data).eq('id', id);
            } else {
                delete data.id;
                await db.from(TABLE_NAME).insert([data]);
            }
            hideModal();
            await loadDesembolsosTable();
        } catch (error) {
            console.error("Error al guardar desembolso:", error);
            alert("Error al guardar el desembolso.");
        }
    });
}

