import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { FileText, FileSpreadsheet, ArrowLeft, Calendar, Tag, Download } from 'lucide-react';
import type { Sale } from '../types';

export default function Reports() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);
    const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | '90days'>('all');
    const [category, setCategory] = useState('all');

    useEffect(() => {
        loadSalesData();
    }, []);

    const loadSalesData = async () => {
        try {
            const { data, error } = await supabase
                .from('sales')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;
            if (data) {
                console.log('Reports loaded:', data.length, 'records');
                setSales(data as Sale[]);
            }
        } catch (error) {
            console.error('Error loading sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSales = useMemo(() => {
        let result = [...sales];
        if (dateRange !== 'all') {
            const now = new Date();
            const daysMap = { '7days': 7, '30days': 30, '90days': 90 };
            const days = daysMap[dateRange];
            const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            result = result.filter(sale => {
                const saleDate = new Date(sale.date || sale.created_at);
                return saleDate >= cutoffDate;
            });
        }
        if (category !== 'all') {
            result = result.filter(sale => sale.category === category);
        }
        return result;
    }, [sales, dateRange, category]);

    const categories = useMemo(() => {
        return Array.from(new Set(sales.map(s => s.category).filter(Boolean))) as string[];
    }, [sales]);

    const metrics = useMemo(() => {
        const totalSales = filteredSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
        const totalOrders = filteredSales.length;
        const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        const byCategory: { [key: string]: number } = {};
        filteredSales.forEach(sale => {
            const cat = sale.category || 'Sin categoría';
            byCategory[cat] = (byCategory[cat] || 0) + Number(sale.total_amount || 0);
        });

        const byProduct: { [key: string]: number } = {};
        filteredSales.forEach(sale => {
            const prod = sale.product_name || 'Sin nombre';
            byProduct[prod] = (byProduct[prod] || 0) + Number(sale.total_amount || 0);
        });
        const topProducts = Object.entries(byProduct).sort(([, a], [, b]) => b - a).slice(0, 5);

        return { totalSales, totalOrders, avgOrderValue, byCategory, topProducts };
    }, [filteredSales]);

    const exportToPDF = async () => {
        if (filteredSales.length === 0) {
            await Swal.fire({
                title: 'Sin datos',
                text: 'No hay datos para exportar',
                icon: 'warning',
                confirmButtonColor: '#8b5cf6',
                background: '#1e293b',
                color: '#f1f5f9',
            });
            return;
        }
        setExportingPdf(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            doc.setFontSize(20);
            doc.setTextColor(139, 92, 246);
            doc.text('SalesVision - Reporte de Ventas', pageWidth / 2, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, 28, { align: 'center' });

            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text('Resumen Ejecutivo', 14, 45);

            doc.setFontSize(11);
            doc.text(`Ventas Totales: $${metrics.totalSales.toLocaleString()}`, 20, 55);
            doc.text(`Total de Registros: ${metrics.totalOrders}`, 20, 63);
            doc.text(`Promedio por Venta: $${metrics.avgOrderValue.toFixed(2)}`, 20, 71);

            doc.setFontSize(14);
            doc.text('Top 5 Productos', 14, 90);

            const productData = metrics.topProducts.map(([name, total]) => [name, `$${total.toLocaleString()}`]);

            autoTable(doc, {
                startY: 95,
                head: [['Producto', 'Ventas']],
                body: productData,
                theme: 'striped',
                headStyles: { fillColor: [139, 92, 246] },
                margin: { left: 14, right: 14 }
            });

            const categoryY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(14);
            doc.text('Ventas por Categoría', 14, categoryY);

            const categoryData = Object.entries(metrics.byCategory).map(([name, total]) => [name, `$${total.toLocaleString()}`]);

            autoTable(doc, {
                startY: categoryY + 5,
                head: [['Categoría', 'Ventas']],
                body: categoryData,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] },
                margin: { left: 14, right: 14 }
            });

            doc.save(`salesvision_reporte_${new Date().toISOString().split('T')[0]}.pdf`);

            await Swal.fire({
                title: '¡PDF Descargado!',
                text: 'El reporte PDF se ha descargado correctamente',
                icon: 'success',
                confirmButtonColor: '#8b5cf6',
                background: '#1e293b',
                color: '#f1f5f9',
                timer: 2000,
            });
        } catch (error) {
            console.error('Error generating PDF:', error);

            await Swal.fire({
                title: 'Error',
                text: 'Error al generar el PDF',
                icon: 'error',
                confirmButtonColor: '#ef4444',
                background: '#1e293b',
                color: '#f1f5f9',
            });
        } finally {
            setExportingPdf(false);
        }
    };

    const exportToExcel = async () => {
        if (filteredSales.length === 0) {
            await Swal.fire({
                title: 'Sin datos',
                text: 'No hay datos para exportar',
                icon: 'warning',
                confirmButtonColor: '#8b5cf6',
                background: '#1e293b',
                color: '#f1f5f9',
            });
            return;
        }
        setExportingExcel(true);
        try {
            const wb = XLSX.utils.book_new();

            const summaryData = [
                [''],
                ['SALESVISION - REPORTE DE VENTAS'],
                [''],
                ['Fecha de generación:', new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
                [''],
                ['RESUMEN EJECUTIVO'],
                [''],
                ['Métrica', 'Valor'],
                ['Ventas Totales', `$${metrics.totalSales.toLocaleString()}`],
                ['Total de Registros', metrics.totalOrders],
                ['Promedio por Venta', `$${metrics.avgOrderValue.toFixed(2)}`],
                [''],
                ['TOP 5 PRODUCTOS'],
                [''],
                ['Producto', 'Ventas Totales'],
                ...metrics.topProducts.map(([name, total]) => [name, `$${total.toLocaleString()}`]),
                [''],
                ['VENTAS POR CATEGORÍA'],
                [''],
                ['Categoría', 'Total Ventas'],
                ...Object.entries(metrics.byCategory).map(([cat, total]) => [cat, `$${total.toLocaleString()}`]),
            ];

            const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
            summaryWs['!cols'] = [{ wch: 35 }, { wch: 25 }];
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

            const headers = [['DETALLE DE VENTAS'], [''], ['Fecha', 'Producto', 'Categoría', 'Cantidad', 'Precio', 'Total', 'Región', 'Vendedor']];
            const dataRows = filteredSales.map(sale => [
                sale.date || '-',
                sale.product_name || '-',
                sale.category || '-',
                sale.quantity || 0,
                sale.unit_price ? `$${Number(sale.unit_price).toFixed(2)}` : '$0.00',
                sale.total_amount ? `$${Number(sale.total_amount).toFixed(2)}` : '$0.00',
                sale.region || '-',
                sale.salesperson || '-'
            ]);
            const totalRow = ['TOTAL', `${filteredSales.length} productos`, '', filteredSales.reduce((sum, s) => sum + (s.quantity || 0), 0), '', `$${metrics.totalSales.toFixed(2)}`, '', ''];
            const fullData = [...headers, ...dataRows, [''], totalRow];
            const dataWs = XLSX.utils.aoa_to_sheet(fullData);
            dataWs['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, dataWs, 'Datos');

            const salesByPerson: { [key: string]: { count: number; total: number } } = {};
            filteredSales.forEach(sale => {
                const person = sale.salesperson || 'Sin asignar';
                if (!salesByPerson[person]) salesByPerson[person] = { count: 0, total: 0 };
                salesByPerson[person].count++;
                salesByPerson[person].total += Number(sale.total_amount || 0);
            });
            const vendorData = [
                ['ANÁLISIS POR VENDEDOR'], [''],
                ['Vendedor', 'Ventas', 'Total', 'Promedio'],
                ...Object.entries(salesByPerson).sort(([, a], [, b]) => b.total - a.total).map(([name, data]) => [name, data.count, `$${data.total.toLocaleString()}`, `$${(data.total / data.count).toFixed(2)}`])
            ];
            const vendorWs = XLSX.utils.aoa_to_sheet(vendorData);
            vendorWs['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, vendorWs, 'Vendedores');

            const salesByRegion: { [key: string]: { count: number; total: number } } = {};
            filteredSales.forEach(sale => {
                const region = sale.region || 'Sin asignar';
                if (!salesByRegion[region]) salesByRegion[region] = { count: 0, total: 0 };
                salesByRegion[region].count++;
                salesByRegion[region].total += Number(sale.total_amount || 0);
            });
            const regionData = [
                ['ANÁLISIS POR REGIÓN'], [''],
                ['Región', 'Ventas', 'Total', '% del Total'],
                ...Object.entries(salesByRegion).sort(([, a], [, b]) => b.total - a.total).map(([name, data]) => [name, data.count, `$${data.total.toLocaleString()}`, `${((data.total / metrics.totalSales) * 100).toFixed(1)}%`])
            ];
            const regionWs = XLSX.utils.aoa_to_sheet(regionData);
            regionWs['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, regionWs, 'Regiones');

            const salesByDate: { [key: string]: { count: number; total: number } } = {};
            filteredSales.forEach(sale => {
                const date = sale.date || 'Sin fecha';
                if (!salesByDate[date]) salesByDate[date] = { count: 0, total: 0 };
                salesByDate[date].count++;
                salesByDate[date].total += Number(sale.total_amount || 0);
            });
            const sortedDates = Object.entries(salesByDate).sort(([a], [b]) => a.localeCompare(b));
            let bestDay = { date: '', total: 0 };
            let worstDay = { date: '', total: Infinity };
            sortedDates.forEach(([date, data]) => {
                if (data.total > bestDay.total) bestDay = { date, total: data.total };
                if (data.total < worstDay.total) worstDay = { date, total: data.total };
            });
            const temporalData = [
                ['ANÁLISIS TEMPORAL'], [''],
                ['Mejor día:', bestDay.date, `$${bestDay.total.toLocaleString()}`],
                ['Peor día:', worstDay.date, `$${worstDay.total.toLocaleString()}`],
                ['Días con ventas:', sortedDates.length],
                ['Promedio diario:', '', `$${(metrics.totalSales / (sortedDates.length || 1)).toFixed(2)}`],
                [''],
                ['Fecha', 'Transacciones', 'Total', '% del Total'],
                ...sortedDates.map(([date, data]) => [date, data.count, `$${data.total.toLocaleString()}`, `${((data.total / metrics.totalSales) * 100).toFixed(1)}%`])
            ];
            const temporalWs = XLSX.utils.aoa_to_sheet(temporalData);
            temporalWs['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, temporalWs, 'Temporal');

            const allProducts: { [key: string]: { count: number; total: number; category: string } } = {};
            filteredSales.forEach(sale => {
                const prod = sale.product_name || 'Sin nombre';
                if (!allProducts[prod]) allProducts[prod] = { count: 0, total: 0, category: sale.category || '-' };
                allProducts[prod].count += (sale.quantity || 1);
                allProducts[prod].total += Number(sale.total_amount || 0);
            });
            const productData = [
                ['CATÁLOGO DE PRODUCTOS'], [''],
                ['Total productos únicos:', Object.keys(allProducts).length], [''],
                ['Producto', 'Categoría', 'Unidades', 'Venta Total', 'Precio Prom.', 'Ranking'],
                ...Object.entries(allProducts).sort(([, a], [, b]) => b.total - a.total).map(([name, data], index) => [name, data.category, data.count, `$${data.total.toLocaleString()}`, `$${(data.count > 0 ? data.total / data.count : 0).toFixed(2)}`, `#${index + 1}`])
            ];
            const productWs = XLSX.utils.aoa_to_sheet(productData);
            productWs['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 8 }];
            XLSX.utils.book_append_sheet(wb, productWs, 'Productos');

            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `SalesVision_Reporte_${new Date().toISOString().split('T')[0]}.xlsx`);

            await Swal.fire({
                title: '¡Excel Descargado!',
                text: 'El reporte Excel se ha descargado correctamente',
                icon: 'success',
                confirmButtonColor: '#8b5cf6',
                background: '#1e293b',
                color: '#f1f5f9',
                timer: 2000,
            });
        } catch (error) {
            console.error('Error generating Excel:', error);

            await Swal.fire({
                title: 'Error',
                text: 'Error al generar el archivo Excel',
                icon: 'error',
                confirmButtonColor: '#ef4444',
                background: '#1e293b',
                color: '#f1f5f9',
            });
        } finally {
            setExportingExcel(false);
        }
    };

    return (
        <div className="reports-container">
            <header className="reports-header">
                <div className="header-left">
                    <button onClick={() => navigate('/dashboard')} className="back-button">
                        <ArrowLeft size={18} /> Dashboard
                    </button>
                    <h1>Reportes</h1>
                </div>
                <div className="header-right">
                    <span className="user-email">{user?.email}</span>
                </div>
            </header>

            <main className="reports-main">
                {loading ? (
                    <div className="loading-screen">
                        <div className="spinner"></div>
                        <p>Cargando datos...</p>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="empty-state fade-in">
                        <FileText size={64} className="empty-icon-svg" />
                        <h2>No hay datos para reportes</h2>
                        <p>Primero sube un archivo Excel/CSV desde el Dashboard</p>
                        <button onClick={() => navigate('/upload')} className="upload-nav-button">Subir Datos</button>
                    </div>
                ) : (
                    <>
                        <section className="filters-section fade-in">
                            <div className="filter-group">
                                <Calendar size={18} />
                                <label>Período:</label>
                                <select value={dateRange} onChange={(e) => setDateRange(e.target.value as typeof dateRange)} className="filter-select">
                                    <option value="all">Todo</option>
                                    <option value="7days">7 días</option>
                                    <option value="30days">30 días</option>
                                    <option value="90days">90 días</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <Tag size={18} />
                                <label>Categoría:</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)} className="filter-select">
                                    <option value="all">Todas</option>
                                    {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                </select>
                            </div>
                        </section>

                        <section className="report-summary fade-in-up">
                            <h2>Resumen del Período</h2>
                            <div className="summary-grid">
                                <div className="summary-card">
                                    <span className="summary-label">Ventas Totales</span>
                                    <span className="summary-value">${metrics.totalSales.toLocaleString()}</span>
                                </div>
                                <div className="summary-card">
                                    <span className="summary-label">Registros</span>
                                    <span className="summary-value">{metrics.totalOrders}</span>
                                </div>
                                <div className="summary-card">
                                    <span className="summary-label">Promedio</span>
                                    <span className="summary-value">${metrics.avgOrderValue.toFixed(2)}</span>
                                </div>
                            </div>
                        </section>

                        <section className="export-section fade-in-up">
                            <h2>Exportar Datos</h2>
                            <div className="export-options">
                                <div className="export-card">
                                    <FileText size={48} className="export-icon-svg" />
                                    <h3>Exportar a PDF</h3>
                                    <p>Reporte visual con tablas, ideal para presentaciones</p>
                                    <button onClick={exportToPDF} disabled={exportingPdf} className="export-button pdf">
                                        <Download size={16} />
                                        {exportingPdf ? 'Generando...' : 'Descargar PDF'}
                                    </button>
                                </div>
                                <div className="export-card">
                                    <FileSpreadsheet size={48} className="export-icon-svg" />
                                    <h3>Exportar a Excel</h3>
                                    <p>Datos completos editables para análisis avanzado</p>
                                    <button onClick={exportToExcel} disabled={exportingExcel} className="export-button excel">
                                        <Download size={16} />
                                        {exportingExcel ? 'Generando...' : 'Descargar Excel'}
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="data-preview fade-in-up">
                            <h2>Vista Previa ({filteredSales.length} registros)</h2>
                            <div className="preview-table-container">
                                <table className="preview-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Producto</th>
                                            <th>Categoría</th>
                                            <th>Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSales.map((sale, index) => (
                                            <tr key={index}>
                                                <td>{sale.date || '-'}</td>
                                                <td>{sale.product_name || '-'}</td>
                                                <td>{sale.category || '-'}</td>
                                                <td>${Number(sale.total_amount || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
