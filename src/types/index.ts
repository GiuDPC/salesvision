//Es como un contrato que dice: "Un objeto de tipo User DEBE tener estas propiedades"

export interface User {
    id: string;                    // ID único del usuario (viene de Supabase)
    email: string;                 // Email del usuario
    full_name: string | null;      // Nombre completo (puede ser null si no lo ha puesto)
    role: UserRole;                // Rol del usuario (ver abajo)
    created_at: string;            // Fecha de creación
}

export type UserRole = 'admin' | 'manager' | 'analyst' | 'viewer';

export interface Sale {
    id: string;
    date: string;                  // Fecha de la venta (formato: "2024-12-22")
    product_name: string;          // Nombre del producto vendido
    category: string | null;       // Categoría del producto
    quantity: number;              // Cantidad vendida
    unit_price: number;            // Precio por unidad
    total_amount: number;          // Total (quantity * unit_price)
    region: string | null;         // Región de la venta
    salesperson: string | null;    // Vendedor
    uploaded_by: string;           // ID del usuario que subió los datos
    created_at: string;
}

export interface Upload {
    id: string;
    filename: string;              // Nombre del archivo (ej: "ventas_diciembre.xlsx")
    file_path: string;             // Ruta en Supabase Storage
    rows_processed: number | null; // Cuántas filas se procesaron
    status: UploadStatus;          // Estado del procesamiento
    uploaded_by: string;
    created_at: string;
}

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface DashboardMetrics {
    totalSales: number;            // Total de ventas ($)
    totalOrders: number;           // Número de órdenes
    averageOrderValue: number;     // Promedio por orden
    topProducts: ProductMetric[];  // Productos más vendidos
    salesByRegion: RegionMetric[]; // Ventas por región
    salesByDay: DailyMetric[];     // Ventas por día (para gráfica)
}

export interface ProductMetric {
    name: string;
    totalSold: number;
    revenue: number;
}

export interface RegionMetric {
    region: string;
    totalSales: number;
    percentage: number;
}

export interface DailyMetric {
    date: string;
    total: number;
    orders: number;
}
