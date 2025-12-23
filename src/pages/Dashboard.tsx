import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut, supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
} from 'recharts';
import {
    DollarSign,
    Package,
    Tag,
    TrendingUp,
    Upload,
    FileText,
    LogOut,
    BarChart3,
    Globe
} from 'lucide-react';
import type { Sale } from '../types';

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

interface Filters {
    dateRange: 'all' | '7days' | '30days' | '90days';
    category: string;
}

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState<Filters>({
        dateRange: 'all',
        category: 'all'
    });

    useEffect(() => {
        loadSalesData();
    }, []);

    const loadSalesData = async () => {
        try {
            const { data, error } = await supabase
                .from('sales')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
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

        if (filters.dateRange !== 'all') {
            const now = new Date();
            const daysMap = { '7days': 7, '30days': 30, '90days': 90 };
            const days = daysMap[filters.dateRange];
            const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

            result = result.filter(sale => {
                const saleDate = new Date(sale.date || sale.created_at);
                return saleDate >= cutoffDate;
            });
        }

        if (filters.category !== 'all') {
            result = result.filter(sale => sale.category === filters.category);
        }

        return result;
    }, [sales, filters]);

    const metrics = useMemo(() => {
        const totalSales = filteredSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
        const totalOrders = filteredSales.length;
        const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
        const uniqueProducts = new Set(filteredSales.map(s => s.product_name)).size;

        return { totalSales, totalOrders, totalProducts: uniqueProducts, avgOrderValue };
    }, [filteredSales]);

    const categories = useMemo(() => {
        const cats = new Set(sales.map(s => s.category).filter(Boolean));
        return Array.from(cats) as string[];
    }, [sales]);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const getSalesByCategory = () => {
        const categories: { [key: string]: number } = {};
        filteredSales.forEach(sale => {
            const cat = sale.category || 'Sin categoría';
            categories[cat] = (categories[cat] || 0) + Number(sale.total_amount || 0);
        });
        return Object.entries(categories).map(([name, value], index) => ({
            name,
            value,
            color: COLORS[index % COLORS.length]
        }));
    };

    const getTopProducts = () => {
        const products: { [key: string]: number } = {};
        filteredSales.forEach(sale => {
            const prod = sale.product_name || 'Sin nombre';
            products[prod] = (products[prod] || 0) + Number(sale.total_amount || 0);
        });
        return Object.entries(products)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    };

    const getSalesByDate = () => {
        const dateMap: { [key: string]: number } = {};
        filteredSales.forEach(sale => {
            const date = sale.date || new Date(sale.created_at).toISOString().split('T')[0];
            dateMap[date] = (dateMap[date] || 0) + Number(sale.total_amount || 0);
        });
        return Object.entries(dateMap)
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => a.date.localeCompare(b.date));
    };

    const getSalesByRegion = () => {
        const regions: { [key: string]: number } = {};
        filteredSales.forEach(sale => {
            if (sale.region) {
                regions[sale.region] = (regions[sale.region] || 0) + Number(sale.total_amount || 0);
            }
        });
        return Object.entries(regions).map(([name, value], index) => ({
            name,
            value,
            color: COLORS[index % COLORS.length]
        }));
    };

    const getRecentSales = () => {
        return filteredSales.slice(0, 5).map((sale, index) => ({
            id: index,
            product: sale.product_name,
            amount: Number(sale.total_amount || 0),
            date: sale.date || new Date(sale.created_at).toISOString().split('T')[0]
        }));
    };

    const salesByCategory = getSalesByCategory();
    const topProducts = getTopProducts();
    const salesByDate = getSalesByDate();
    const salesByRegion = getSalesByRegion();
    const recentSales = getRecentSales();

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>SalesVision</h1>
                    <button onClick={() => navigate('/upload')} className="upload-nav-button">
                        <Upload size={16} /> Subir Datos
                    </button>
                    <button onClick={() => navigate('/reports')} className="reports-nav-button">
                        <FileText size={16} /> Reportes
                    </button>
                </div>
                <div className="header-right">
                    <span className="user-email">{user?.email}</span>
                    <button onClick={handleLogout} className="logout-button">
                        <LogOut size={16} /> Salir
                    </button>
                </div>
            </header>

            <main className="dashboard-main">
                {loading ? (
                    <div className="loading-screen">
                        <div className="spinner"></div>
                        <p>Cargando datos...</p>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="empty-state fade-in">
                        <BarChart3 size={80} className="empty-icon-svg" />
                        <h2>No hay datos de ventas</h2>
                        <p>Sube tu primer archivo Excel para ver las métricas</p>
                        <button onClick={() => navigate('/upload')} className="upload-nav-button">
                            <Upload size={16} /> Subir Datos
                        </button>
                    </div>
                ) : (
                    <>
                        <section className="filters-section fade-in">
                            <div className="filter-group">
                                <label htmlFor="dateRange">Período:</label>
                                <select
                                    id="dateRange"
                                    value={filters.dateRange}
                                    onChange={(e) => setFilters(f => ({ ...f, dateRange: e.target.value as Filters['dateRange'] }))}
                                    className="filter-select"
                                >
                                    <option value="all">Todo el tiempo</option>
                                    <option value="7days">Últimos 7 días</option>
                                    <option value="30days">Últimos 30 días</option>
                                    <option value="90days">Últimos 90 días</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label htmlFor="category">Categoría:</label>
                                <select
                                    id="category"
                                    value={filters.category}
                                    onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                                    className="filter-select"
                                >
                                    <option value="all">Todas las categorías</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {(filters.dateRange !== 'all' || filters.category !== 'all') && (
                                <button
                                    onClick={() => setFilters({ dateRange: 'all', category: 'all' })}
                                    className="clear-filters-button"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </section>

                        <section className="metrics-grid">
                            <div className="metric-card fade-in-up" style={{ animationDelay: '0.1s' }}>
                                <div className="metric-icon-wrap">
                                    <DollarSign size={28} />
                                </div>
                                <div className="metric-content">
                                    <h3>Ventas Totales</h3>
                                    <p className="metric-value">${metrics.totalSales.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="metric-card fade-in-up" style={{ animationDelay: '0.2s' }}>
                                <div className="metric-icon-wrap">
                                    <Package size={28} />
                                </div>
                                <div className="metric-content">
                                    <h3>Registros</h3>
                                    <p className="metric-value">{metrics.totalOrders.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="metric-card fade-in-up" style={{ animationDelay: '0.3s' }}>
                                <div className="metric-icon-wrap">
                                    <Tag size={28} />
                                </div>
                                <div className="metric-content">
                                    <h3>Productos</h3>
                                    <p className="metric-value">{metrics.totalProducts}</p>
                                </div>
                            </div>

                            <div className="metric-card fade-in-up" style={{ animationDelay: '0.4s' }}>
                                <div className="metric-icon-wrap">
                                    <TrendingUp size={28} />
                                </div>
                                <div className="metric-content">
                                    <h3>Promedio por Venta</h3>
                                    <p className="metric-value">${metrics.avgOrderValue.toFixed(2)}</p>
                                </div>
                            </div>
                        </section>

                        {salesByDate.length > 1 && (
                            <section className="chart-card chart-full-width fade-in-up" style={{ animationDelay: '0.5s' }}>
                                <h3>Tendencia de Ventas</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={salesByDate}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                        <YAxis stroke="#9ca3af" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1f2937',
                                                border: 'none',
                                                borderRadius: '8px',
                                            }}
                                            formatter={(value) => [`$${Number(value || 0).toLocaleString()}`, 'Ventas']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#8b5cf6"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorTotal)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </section>
                        )}

                        <section className="charts-grid">
                            <div className="chart-card fade-in-up" style={{ animationDelay: '0.6s' }}>
                                <h3>Top 5 Productos</h3>
                                {topProducts.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={topProducts} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis type="number" stroke="#9ca3af" />
                                            <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#1f2937',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                }}
                                                formatter={(value) => [`$${Number(value || 0).toLocaleString()}`, 'Ventas']}
                                            />
                                            <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="no-data">No hay datos suficientes</p>
                                )}
                            </div>

                            <div className="chart-card fade-in-up" style={{ animationDelay: '0.7s' }}>
                                <h3>Ventas por Categoría</h3>
                                {salesByCategory.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie
                                                    data={salesByCategory}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {salesByCategory.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#1f2937',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                    }}
                                                    formatter={(value) => [`$${Number(value || 0).toLocaleString()}`, 'Ventas']}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="chart-legend">
                                            {salesByCategory.map((item) => (
                                                <div key={item.name} className="legend-item">
                                                    <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                                                    <span>{item.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <p className="no-data">No hay datos suficientes</p>
                                )}
                            </div>

                            <div className="chart-card fade-in-up" style={{ animationDelay: '0.8s' }}>
                                <h3>Distribución por Región</h3>
                                {salesByRegion.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie
                                                    data={salesByRegion}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {salesByRegion.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#1f2937',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                    }}
                                                    formatter={(value) => [`$${Number(value || 0).toLocaleString()}`, 'Ventas']}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="chart-legend">
                                            {salesByRegion.map((item) => (
                                                <div key={item.name} className="legend-item">
                                                    <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                                                    <span>{item.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="no-data-state">
                                        <Globe size={48} className="no-data-icon-svg" />
                                        <p className="no-data">Sin datos de región</p>
                                        <p className="no-data-hint">Añade la columna "region" a tu Excel</p>
                                    </div>
                                )}
                            </div>

                            <div className="chart-card fade-in-up" style={{ animationDelay: '0.9s' }}>
                                <h3>Últimos Registros</h3>
                                {recentSales.length > 0 ? (
                                    <table className="sales-table">
                                        <thead>
                                            <tr>
                                                <th>Producto</th>
                                                <th>Monto</th>
                                                <th>Fecha</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentSales.map((sale) => (
                                                <tr key={sale.id}>
                                                    <td>{sale.product}</td>
                                                    <td>${sale.amount.toLocaleString()}</td>
                                                    <td>{sale.date}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="no-data">No hay ventas recientes</p>
                                )}
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
