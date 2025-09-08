import { db } from '../db.js'; // Usamos el cliente de Supabase
import { createTable, formatCurrency } from './components.js';

export async function renderDashboard(container) {
    container.innerHTML = `
        <div class="page-header">
            <h2>Dashboard General</h2>
        </div>
        <div id="dashboard-grid" class="dashboard-grid">Cargando KPIs...</div>
    `;
    const grid = document.getElementById('dashboard-grid');

    try {
        // Obtenemos todos los datos de las 3 tablas desde Supabase
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
            <button id="generate-report" class="btn btn-secondary">Generar Reporte</button>
        </div>
        <div id="report-container" class="card print-area">
            <p>Seleccione una empresa y un rango de fechas para generar el reporte.</p>
        </div>
    `;

    document.getElementById('generate-report').addEventListener('click', generateReport);
    document.getElementById('print-report-btn').addEventListener('click', () => window.print());
}

async function generateReport() {
    const container = document.getElementById('report-container');
    container.innerHTML = 'Generando...';

    const empresaId = document.getElementById('empresa-filter').value;
    const startDate = document.getElementById('start-date-filter').value;
    const endDate = document.getElementById('end-date-filter').value;

    if (!empresaId) {
        container.innerHTML = '<p>Por favor, seleccione una empresa.</p>';
        return;
    }

    try {
        const { data: empresa } = await db.from('empresas').select('*').eq('id', empresaId).single();
        
        let desembolsosQuery = db.from('desembolsos').select('*').eq('empresaId', empresaId);
        let rendicionesQuery = db.from('rendiciones').select('*').eq('empresaId', empresaId);

        if(startDate) {
            desembolsosQuery = desembolsosQuery.gte('fecha', startDate);
            rendicionesQuery = rendicionesQuery.gte('fecha', startDate);
        }
        if(endDate) {
            desembolsosQuery = desembolsosQuery.lte('fecha', endDate);
            rendicionesQuery = rendicionesQuery.lte('fecha', endDate);
        }

        const { data: desembolsos } = await desembolsosQuery;
        const { data: rendiciones } = await rendicionesQuery;

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
                    <h1>Reporte de Caja Chica</h1>
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

    } catch(error) {
        console.error("Error al generar reporte:", error);
        container.innerHTML = '<p>Error al generar el reporte.</p>';
    }
}