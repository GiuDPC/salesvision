import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as ExcelJS from 'exceljs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Swal from 'sweetalert2';
import { ArrowLeft, FileSpreadsheet, X, Check, CloudUpload } from 'lucide-react';

export default function UploadPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [allRows, setAllRows] = useState<any[]>([]);
    const [preview, setPreview] = useState<any[]>([]);
    const [processing, setProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const parseCSV = (text: string): any[] => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const rowData: any = {};
            headers.forEach((header, index) => {
                rowData[header] = values[index] || '';
            });
            rows.push(rowData);
        }

        return rows;
    };

    const handleFile = async (selectedFile: File) => {
        setError(null);
        setProcessing(true);

        const isCSV = selectedFile.name.endsWith('.csv') || selectedFile.type === 'text/csv';
        const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') ||
            selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            selectedFile.type === 'application/vnd.ms-excel';

        if (!isCSV && !isExcel) {
            setError('Por favor sube un archivo Excel (.xlsx) o CSV');
            setProcessing(false);
            return;
        }

        setFile(selectedFile);

        try {
            let rows: any[] = [];

            if (isCSV) {
                const text = await selectedFile.text();
                rows = parseCSV(text);
            } else {
                const workbook = new ExcelJS.Workbook();
                const arrayBuffer = await selectedFile.arrayBuffer();
                await workbook.xlsx.load(arrayBuffer);

                const worksheet = workbook.worksheets[0];

                if (!worksheet) {
                    setError('El archivo no contiene hojas de cálculo');
                    setProcessing(false);
                    return;
                }

                let headers: string[] = [];

                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber === 1) {
                        headers = row.values as string[];
                        headers = headers.filter(h => h);
                    } else {
                        const rowData: any = {};
                        row.eachCell((cell, colNumber) => {
                            const header = headers[colNumber - 1] || `col${colNumber}`;
                            rowData[header] = cell.value;
                        });
                        rows.push(rowData);
                    }
                });
            }

            if (rows.length === 0) {
                setError('El archivo no contiene datos');
                setProcessing(false);
                return;
            }

            setAllRows(rows);
            setPreview(rows.slice(0, 10));

        } catch (err) {
            setError('Error al leer el archivo');
            console.error(err);
        } finally {
            setProcessing(false);
        }
    };

    const handleUpload = async () => {
        if (!file || preview.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            const salesData = allRows.map(row => ({
                date: row.date || row.fecha || row.Date || row.Fecha || new Date().toISOString().split('T')[0],
                product_name: row.product_name || row.producto || row.Producto || row.product || row.Product || 'Sin nombre',
                category: row.category || row.categoria || row.Categoria || row.Category || null,
                quantity: parseInt(row.quantity || row.cantidad || row.Cantidad || row.Quantity || 1),
                unit_price: parseFloat(row.unit_price || row.precio || row.Precio || row.price || row.Price || 0),
                total_amount: parseFloat(row.total_amount || row.total || row.Total || row.amount || row.Amount || 0),
                region: row.region || row.Region || null,
                salesperson: row.salesperson || row.vendedor || row.Vendedor || row.seller || row.Seller || null,
                uploaded_by: user?.id
            }));

            const { error: salesError } = await supabase
                .from('sales')
                .insert(salesData);

            if (salesError) throw salesError;

            await supabase.from('uploads').insert({
                filename: file.name,
                file_path: `uploads/${file.name}`,
                rows_processed: salesData.length,
                status: 'completed',
                uploaded_by: user?.id
            });

            await Swal.fire({
                title: t('upload.success'),
                text: t('upload.savedMessage', { count: salesData.length }),
                icon: 'success',
                confirmButtonText: t('upload.viewDashboard'),
                confirmButtonColor: '#8b5cf6',
                background: '#1e293b',
                color: '#f1f5f9',
                timer: 2000,
            });

            navigate('/dashboard');

        } catch (err: any) {
            console.error('Error:', err);

            await Swal.fire({
                title: t('common.error'),
                text: err.message || t('errors.generic'),
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#ef4444',
                background: '#1e293b',
                color: '#f1f5f9',
            });
            setError(err.message || t('errors.generic'));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="upload-container">
            <header className="upload-header">
                <button onClick={() => navigate('/dashboard')} className="back-button">
                    <ArrowLeft size={18} /> Dashboard
                </button>
                <h1 className="upload-title">{t('upload.title')}</h1>
                <div className="header-spacer"></div>
            </header>

            <main className="upload-main">
                <div
                    className={`drop-zone fade-in ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {processing ? (
                        <div className="processing-state">
                            <div className="spinner"></div>
                            <p>{t('upload.processing')}</p>
                        </div>
                    ) : !file ? (
                        <>
                            <CloudUpload size={64} className="drop-icon-svg" />
                            <p>{t('upload.dropZoneTitle')}</p>
                            <span>o</span>
                            <label className="file-button">
                                {t('upload.selectFile')}
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleChange}
                                    hidden
                                />
                            </label>
                            <p className="file-types">{t('upload.supportedFormats')}</p>
                        </>
                    ) : (
                        <div className="file-info">
                            <FileSpreadsheet size={64} className="file-icon-svg" />
                            <p className="file-name">{file.name}</p>
                            <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setPreview([]);
                                }}
                                className="remove-file"
                            >
                                <X size={16} /> Quitar
                            </button>
                        </div>
                    )}
                </div>

                {error && <div className="error-message fade-in">{error}</div>}

                {preview.length > 0 && (
                    <div className="preview-section fade-in-up">
                        <h2>Vista Previa ({preview.length} filas)</h2>
                        <div className="preview-table-container">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        {Object.keys(preview[0]).map((key) => (
                                            <th key={key}>{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((row, index) => (
                                        <tr key={index}>
                                            {Object.values(row).map((value: any, i) => (
                                                <td key={i}>{String(value)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="upload-button"
                        >
                            <Check size={18} />
                            {uploading ? 'Guardando...' : 'Confirmar y Subir'}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
