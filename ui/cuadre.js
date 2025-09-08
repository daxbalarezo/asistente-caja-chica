import { db } from '../db.js';
import { createTable, formatCurrency, showModal, hideModal } from './components.js';

// --- Variable para guardar el estado del reporte actual ---
let reporteActual = null;

export async function renderDashboard(container) {
    // ... (El código de renderDashboard no cambia) ...
    container.innerHTML = `
        <div class="page-header">
            <h2>Dashboard General</h2>
        </div>
        <div id="dashboard-grid" class="dashboard-grid">Cargando KPIs...</div>
    `;
    const grid = document.getElementById('dashboard-grid');

    try {
        const { data: empresas } = await db.from('empresas').select('*');
        const { data: desembolsos } = await db.from('desembolsos').select('empresaId, monto');
        const { data: rendiciones } = await db.from('rendiciones').select('empresaId, monto');

        if (empresas.length === 0) {
            grid.innerHTML = '<p>No hay empresas registradas. Comience por agregar una en la sección "Empresas".</p>';
            return;
        }

        const kpiHtml = empresas.map(empresa => {
            const desembolsosEmpresa = desembolsos.filter(d => d.empresaId === empresa.id);
            const rendicionesEmpresa = rendiciones.filter(r => r.empresaId === empresa.id);

            const totalDesembolsado = desembolsosEmpresa.reduce((sum, d) => sum + d.monto, 0);
            const totalRendido = rendicionesEmpresa.reduce((sum, r) => sum + r.monto, 0);
            const diferencia = totalDesembolsado - totalRendido;

            let diffClass = diferencia > 0 ? 'negative' : (diferencia < 0 ? 'positive' : 'zero');
            let diffSign = diferencia > 0 ? '-' : (diferencia < 0 ? '+' : '');

            return `
                <div class="card kpi-card">
                    <h3>${empresa.nombre}</h3>
                    <p>Total Desembolsado: <strong>${formatCurrency(totalDesembolsado)}</strong></p>
                    <p>Total Rendido: <strong>${formatCurrency(totalRendido)}</strong></p>
                    <p>Diferencia (Saldo): <strong class="difference ${diffClass}">${diffSign}${formatCurrency(Math.abs(diferencia))}</strong></p>
                </div>
            `;
        }).join('');
        grid.innerHTML = kpiHtml;

    } catch (error) {
        console.error("Error al renderizar dashboard:", error);
        grid.innerHTML = '<p>Error al cargar los datos para el dashboard.</p>';
    }
}


export async function renderCuadre(container) {
    const { data: empresas } = await db.from('empresas').select('*');
    container.innerHTML = `
        <div class="page-header no-print">
            <h2>Cuadre y Reportes</h2>
            <button id="print-report-btn" class="btn btn-primary">🖨️ Imprimir Reporte</button>
        </div>
        <div class="filters card no-print">
            <select id="empresa-filter">
                <option value="">-- Seleccione una Empresa --</option>
                ${empresas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')}
            </select>
            <input type="date" id="start-date-filter">
            <input type="date" id="end-date-filter">
            <button id="generate-report" class="btn btn-secondary">Generar Vista Previa</button>
        </div>
        <div id="report-container" class="card print-area">
            <p>Seleccione una empresa y un rango de fechas para generar el reporte.</p>
        </div>
    `;

    document.getElementById('generate-report').addEventListener('click', generarVistaPreviaReporte);
    document.getElementById('print-report-btn').addEventListener('click', iniciarProcesoDeImpresion);
}

async function generarVistaPreviaReporte() {
    const container = document.getElementById('report-container');
    container.innerHTML = 'Generando vista previa...';
    reporteActual = null;

    const empresaId = document.getElementById('empresa-filter').value;
    const startDate = document.getElementById('start-date-filter').value;
    const endDate = document.getElementById('end-date-filter').value;

    if (!empresaId) {
        container.innerHTML = '<p>Por favor, seleccione una empresa.</p>';
        return;
    }

    try {
        const { data: empresa } = await db.from('empresas').select('*').eq('id', empresaId).single();
        const { data: desembolsos } = await db.from('desembolsos').select('*').eq('empresaId', empresaId).gte('fecha', startDate || '1900-01-01').lte('fecha', endDate || '2999-12-31');
        const { data: rendiciones } = await db.from('rendiciones').select('*').eq('empresaId', empresaId).gte('fecha', startDate || '1900-01-01').lte('fecha', endDate || '2999-12-31');

        reporteActual = { empresa, desembolsos, rendiciones, startDate, endDate };
        renderizarContenidoReporte(container, reporteActual, "(Vista Previa)");
    } catch(error) {
        console.error("Error al generar vista previa:", error);
        container.innerHTML = '<p>Error al generar la vista previa del reporte.</p>';
    }
}

// --- FUNCIÓN MEJORADA: Prepara el reporte para imprimir y pide confirmación después ---
async function iniciarProcesoDeImpresion() {
    if (!reporteActual) {
        alert("Por favor, primero genere una vista previa del reporte.");
        return;
    }

    try {
        const container = document.getElementById('report-container');
        container.innerHTML = "Preparando reporte para impresión...";

        const { data: empresaDB } = await db.from('empresas').select('correlativo_reporte, prefijo_reporte').eq('id', reporteActual.empresa.id).single();
        
        const nuevoCorrelativoNum = (empresaDB.correlativo_reporte || 0) + 1;
        const anioActual = new Date().getFullYear();
        const prefijo = empresaDB.prefijo_reporte || 'REP';
        const numeroFormateado = String(nuevoCorrelativoNum).padStart(3, '0');
        const correlativoOficial = `${prefijo}-${anioActual}-${numeroFormateado}`;
        
        renderizarContenidoReporte(container, reporteActual, `N°: ${correlativoOficial}`);
        
        // --- LÓGICA DE CONFIRMACIÓN POST-IMPRESIÓN ---
        const handleAfterPrint = () => {
            window.removeEventListener('afterprint', handleAfterPrint);
            mostrarModalConfirmacion(reporteActual.empresa.id, nuevoCorrelativoNum, correlativoOficial);
        };

        window.addEventListener('afterprint', handleAfterPrint);
        
        // El timeout asegura que el DOM se actualice antes de llamar a print()
        setTimeout(() => window.print(), 100);

    } catch (error) {
        console.error("Error al preparar la impresión:", error);
        document.getElementById('report-container').innerHTML = `<p>Error al preparar la impresión. Verifique la conexión.</p>`;
    }
}

// --- NUEVA FUNCIÓN: Muestra un modal para confirmar el archivado del correlativo ---
function mostrarModalConfirmacion(empresaId, correlativoAGuardar, correlativoTexto) {
    const modalContent = `
        <h4>Confirmar Impresión</h4>
        <p>¿El reporte con el correlativo <strong>${correlativoTexto}</strong> se imprimió correctamente?</p>
        <p>Solo al confirmar se guardará este número de forma permanente.</p>
        <div class="form-actions" style="justify-content: center;">
            <button id="cancel-archive-btn" class="btn btn-secondary">No, Cancelar</button>
            <button id="confirm-archive-btn" class="btn btn-primary">Sí, Archivar Correlativo</button>
        </div>
    `;
    showModal("Confirmación Requerida", modalContent);

    document.getElementById('confirm-archive-btn').onclick = async () => {
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = '<h2>Archivando, por favor espere...</h2>';
        
        const { error } = await db.from('empresas')
            .update({ correlativo_reporte: correlativoAGuardar })
            .eq('id', empresaId);

        if (error) {
            modalBody.innerHTML = `<h2>Error al archivar</h2><p>${error.message}</p><button onclick="hideModal()" class="btn">Cerrar</button>`;
        } else {
            modalBody.innerHTML = '<h2>¡Correlativo archivado con éxito!</h2>';
            setTimeout(hideModal, 2000);
        }
    };

    document.getElementById('cancel-archive-btn').onclick = () => {
        hideModal();
        alert(`El correlativo ${correlativoTexto} no fue guardado. Puede volver a imprimir para usarlo.`);
    };
}


function renderizarContenidoReporte(container, datosReporte, correlativoTexto) {
    const { empresa, desembolsos, rendiciones, startDate, endDate } = datosReporte;

    const totalDesembolsado = desembolsos.reduce((sum, d) => sum + d.monto, 0);
    const totalRendido = rendiciones.reduce((sum, r) => sum + r.monto, 0);
    const diferencia = totalDesembolsado - totalRendido;

    const desembolsosHeaders = ['Fecha', 'Responsable', 'Descripción', 'Monto'];
    const desembolsosRows = desembolsos.map(d => [new Date(d.fecha).toLocaleDateString(), d.responsable, d.descripcion, formatCurrency(d.monto)]);
    
    const rendicionesHeaders = ['Fecha', 'Proveedor', 'Documento', 'Monto'];
    const rendicionesRows = rendiciones.map(r => [new Date(r.fecha).toLocaleDateString(), r.proveedor, `${r.documento.tipo} ${r.documento.numero}`, formatCurrency(r.monto)]);

    container.innerHTML = `
        <div class="print-header">
            <img src="assets/logo.png" alt="Logo" style="height: 60px;">
            <div>
                <h1>Reporte de Caja Chica ${correlativoTexto}</h1>
                <p><strong>Empresa:</strong> ${empresa.nombre}</p>
                <p><strong>Periodo:</strong> ${startDate || 'Inicio'} al ${endDate || 'Fin'}</p>
                <p><strong>Fecha de Reporte:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
        </div>

        <h3>Desembolsos</h3>
        ${createTable(desembolsosHeaders, desembolsosRows)}

        <h3>Rendiciones</h3>
        ${createTable(rendicionesHeaders, rendicionesRows)}

        <div class="print-summary">
            <p><strong>Total Desembolsado:</strong> ${formatCurrency(totalDesembolsado)}</p>
            <p><strong>Total Rendido:</strong> ${formatCurrency(totalRendido)}</p>
            <hr>
            <p><strong>Diferencia (Saldo):</strong> ${formatCurrency(diferencia)}</p>
        </div>
    `;
}

