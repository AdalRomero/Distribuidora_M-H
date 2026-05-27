import {
    AlertCircle, AlertTriangle,
    CircleDollarSign,
    Clock,
    Download,
    FileText,
    Loader2,
    Package,
    RefreshCw,
    TrendingUp,
    Users,
    Calendar,
    ArrowRightLeft
} from 'lucide-react';
import { useCallback, useMemo, useState, useEffect } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    Tooltip as RechartsTooltip, ResponsiveContainer,
    XAxis, YAxis
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import * as XLSX from 'xlsx';
import {
    startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear,
    subDays, subWeeks, subMonths, subYears, format
} from 'date-fns';
import { es } from 'date-fns/locale';

import ErrorModal from '../../components/ui/modals/ErrorModal';

import {
    useDashboardStats,
    type CurrencyEntry,
    type TopClient,
    type TopFamily,
    type TopProduct,
    type DashboardFilter
} from '../../src/hooks/useDashboardStats';

// ─── Constants ───────────────────────────────────────────────────────

const PIE_COLORS = ['#85a3bf', '#ccb9b2', '#6383a1', '#a8948d', '#4a6d8c'] as const;

const FAMILY_BAR_COLORS = [
    'bg-[#85a3bf]', 'bg-[#ccb9b2]', 'bg-[#6383a1]', 'bg-[#a8948d]', 'bg-[#4a6d8c]',
] as const;

type DatePreset = 'today' | 'week' | 'month' | 'year' | 'custom';

const PRESET_LABELS: Record<DatePreset, string> = {
    today: 'Hoy',
    week: 'Esta Semana',
    month: 'Este Mes',
    year: 'Este Año',
    custom: 'Personalizado / Comparar',
};

// ─── Helpers ─────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function formatCurrency(amount: number): string {
    return currencyFormatter.format(amount);
}

function formatCompact(amount: number): string {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
    return `$${amount.toFixed(0)}`;
}

function getPresetFilter(preset: DatePreset): DashboardFilter {
    const now = new Date();
    const todayEnd = endOfDay(now);

    switch (preset) {
        case 'today':
            return {
                periodA: { start: startOfDay(now), end: todayEnd },
                periodB: { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) },
                trendGroupBy: 'hour'
            };
        case 'week':
            return {
                periodA: { start: startOfWeek(now, { locale: es }), end: todayEnd },
                periodB: { start: startOfWeek(subWeeks(now, 1), { locale: es }), end: endOfDay(subDays(startOfWeek(now, { locale: es }), 1)) },
                trendGroupBy: 'day'
            };
        case 'month':
            return {
                periodA: { start: startOfMonth(now), end: todayEnd },
                periodB: { start: startOfMonth(subMonths(now, 1)), end: endOfDay(subDays(startOfMonth(now), 1)) },
                trendGroupBy: 'day'
            };
        case 'year':
            return {
                periodA: { start: startOfYear(now), end: todayEnd },
                periodB: { start: startOfYear(subYears(now, 1)), end: endOfDay(subDays(startOfYear(now), 1)) },
                trendGroupBy: 'month'
            };
        case 'custom':
        default:
            return {
                periodA: { start: startOfMonth(now), end: todayEnd },
                periodB: null,
                trendGroupBy: 'day'
            };
    }
}

// ─── Sub-components ──────────────────────────────────────────────────

function GrowthBadge({ growth, showComparison }: { growth: number; showComparison: boolean }) {
    if (!showComparison) return null;
    if (growth === 0) return <span className="text-xs text-slate-400">Sin cambios vs anterior</span>;

    const isPositive = growth > 0;
    return (
        <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(growth).toFixed(1)}% vs anterior
        </span>
    );
}

interface KpiCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
    bgIcon: string;
    dot: string;
    growth: number;
    showComparison: boolean;
}

function KpiCard({ title, value, icon: Icon, color, bgIcon, dot, growth, showComparison }: KpiCardProps) {
    return (
        <div className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
            <div className={`p-3.5 rounded-xl flex-shrink-0 ${bgIcon}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-slate-500 dark:text-slate-400 text-xs font-medium flex items-center gap-2 truncate uppercase tracking-wide">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
                    {title}
                </h3>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1 truncate">{value}</p>
                <div className="mt-1">
                    <GrowthBadge growth={growth} showComparison={showComparison} />
                </div>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Package className="w-8 h-8 mb-2 opacity-40" />
            <span className="text-sm">{message}</span>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function Home() {
    const [preset, setPreset] = useState<DatePreset>('month');
    
    // Custom date state
    const [isExporting, setIsExporting] = useState(false);
    const [errorModal, setErrorModal] = useState<{isOpen: boolean, title: string, message: string}>({isOpen: false, title: '', message: ''});
    const [startA, setStartA] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endA, setEndA] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [enableCompare, setEnableCompare] = useState<boolean>(false);
    const [startB, setStartB] = useState<string>(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
    const [endB, setEndB] = useState<string>(format(subDays(startOfMonth(new Date()), 1), 'yyyy-MM-dd'));

    // Actual filter sent to hook
    const [filter, setFilter] = useState<DashboardFilter>(() => getPresetFilter('month'));

    // Sync filter when preset or custom dates change
    useEffect(() => {
        if (preset !== 'custom') {
            setFilter(getPresetFilter(preset));
        } else {
            const dA = new Date(startA + "T00:00:00");
            const eA = new Date(endA + "T23:59:59");
            
            let pB = null;
            if (enableCompare) {
                pB = {
                    start: new Date(startB + "T00:00:00"),
                    end: new Date(endB + "T23:59:59")
                };
            }
            
            // Auto detect trend group by range length A
            const diffDays = (eA.getTime() - dA.getTime()) / (1000 * 3600 * 24);
            const trendGroupBy = diffDays <= 2 ? 'hour' : diffDays <= 60 ? 'day' : 'month';

            setFilter({
                periodA: { start: dA, end: eA },
                periodB: pB,
                trendGroupBy
            });
        }
    }, [preset, startA, endA, startB, endB, enableCompare]);

    const stats = useDashboardStats(filter);
    const showComparison = filter.periodB !== null;

    const tooltipFormatter = useCallback((value: ValueType | undefined) => {
        return formatCurrency(Number(value ?? 0));
    }, []);

    const handleExport = useCallback(() => {
        try {
            const wb = XLSX.utils.book_new();

            const wsSummary = XLSX.utils.json_to_sheet([
                { Métrica: 'Total Ventas', Valor: stats.salesTotal },
                { Métrica: 'Documentos Generados', Valor: stats.documentsGenerated },
                { Métrica: 'Total Pendientes', Valor: stats.pendingAmount },
                { Métrica: 'Total Cancelados', Valor: stats.cancelledAmount },
            ]);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

            if (stats.topProducts.length > 0) {
                const wsProducts = XLSX.utils.json_to_sheet(stats.topProducts.map((p: TopProduct) => ({
                    Producto: p.name,
                    'Unidades Vendidas': p.qty,
                    'Ingreso Total': p.revenue,
                })));
                XLSX.utils.book_append_sheet(wb, wsProducts, 'Top Productos');
            }

            if (stats.topClients.length > 0) {
                const wsClients = XLSX.utils.json_to_sheet(stats.topClients.map((c: TopClient) => ({
                    Cliente: c.name,
                    'Valor Total': c.amount,
                })));
                XLSX.utils.book_append_sheet(wb, wsClients, 'Mejores Clientes');
            }

            if (stats.topFamilies.length > 0) {
                const wsFamilies = XLSX.utils.json_to_sheet(stats.topFamilies.map((f: TopFamily) => ({
                    Familia: f.name,
                    'Ingreso Total': f.value,
                })));
                XLSX.utils.book_append_sheet(wb, wsFamilies, 'Familias Top');
            }

            if (stats.salesTrend.length > 0) {
                const wsTrend = XLSX.utils.json_to_sheet(stats.salesTrend.map(t => ({
                    Periodo: t.name,
                    'Venta Total': t.total,
                })));
                XLSX.utils.book_append_sheet(wb, wsTrend, 'Tendencia');
            }

            const timestamp = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `Reporte_${PRESET_LABELS[preset]}_${timestamp}.xlsx`);
        } catch (error) {
            console.error('Error al exportar Excel:', error);
            setErrorModal({
                isOpen: true,
                title: 'Error de Exportación',
                message: 'Ocurrió un error al intentar exportar el reporte.'
            });
        }
    }, [stats, preset]);

    // KPI cards config
    const kpiCards: KpiCardProps[] = useMemo(() => [
        {
            title: 'Ventas Totales', value: formatCurrency(stats.salesTotal),
            icon: CircleDollarSign, color: 'text-emerald-500', bgIcon: 'bg-emerald-50 dark:bg-emerald-900/30',
            dot: 'bg-emerald-500', growth: stats.salesChange, showComparison,
        },
        {
            title: 'Documentos', value: stats.documentsGenerated.toLocaleString('es-MX'),
            icon: FileText, color: 'text-[#85a3bf]', bgIcon: 'bg-[#e6edf4] dark:bg-[#85a3bf]/10',
            dot: 'bg-[#85a3bf]', growth: stats.documentsChange, showComparison,
        },
        {
            title: 'Pendientes', value: formatCurrency(stats.pendingAmount),
            icon: Clock, color: 'text-amber-500', bgIcon: 'bg-amber-50 dark:bg-amber-900/30',
            dot: 'bg-amber-500', growth: stats.pendingChange, showComparison,
        },
        {
            title: 'Cancelaciones', value: formatCurrency(stats.cancelledAmount),
            icon: AlertCircle, color: 'text-rose-500', bgIcon: 'bg-rose-50 dark:bg-rose-900/30',
            dot: 'bg-rose-500', growth: stats.cancelledChange, showComparison,
        },
    ], [stats, showComparison]);

    // Families total for percent bars
    const familiesTotalRevenue = useMemo(
        () => stats.topFamilies.reduce((sum, f) => sum + f.value, 0),
        [stats.topFamilies]
    );

    // ── Loading state ────────────────────────────────────────────
    if (stats.isLoading) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-[#85a3bf]" />
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Cargando métricas...</span>
                </div>
            </div>
        );
    }

    // ── Error state ──────────────────────────────────────────────
    if (stats.error) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-rose-200 dark:border-rose-800 p-8 max-w-md text-center">
                    <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Error al cargar datos</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{stats.error}</p>
                    <button
                        onClick={() => setPreset(prev => prev)}
                        className="inline-flex items-center gap-2 bg-[#85a3bf] hover:bg-[#6383a1] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    // ── Main render ──────────────────────────────────────────────
    return (
        <div className="p-4 md:p-8 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <header className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                            Panel Analítico
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
                            Resumen general de operaciones y ventas
                        </p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <select
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#85a3bf] cursor-pointer"
                            value={preset}
                            onChange={(e) => setPreset(e.target.value as DatePreset)}
                        >
                            {(Object.entries(PRESET_LABELS) as [DatePreset, string][]).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleExport}
                            disabled={stats.documentsGenerated === 0}
                            className="flex items-center gap-2 bg-[#85a3bf] hover:bg-[#6383a1] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Exportar
                        </button>
                    </div>
                </header>

                {/* Custom Date Controls */}
                {preset === 'custom' && (
                    <div className="mb-8 bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center">
                            
                            {/* Periodo A */}
                            <div className="flex-1 w-full">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Periodo Principal
                                </label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="date" 
                                        value={startA} 
                                        onChange={(e) => setStartA(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-[#85a3bf]"
                                    />
                                    <span className="text-slate-400 text-sm">a</span>
                                    <input 
                                        type="date" 
                                        value={endA} 
                                        onChange={(e) => setEndA(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-[#85a3bf]"
                                    />
                                </div>
                            </div>

                            {/* Separator / Switch */}
                            <div className="hidden xl:flex items-center justify-center pt-6">
                                <ArrowRightLeft className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            </div>

                            {/* Periodo B */}
                            <div className="flex-1 w-full">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        Comparar contra
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={enableCompare} 
                                            onChange={(e) => setEnableCompare(e.target.checked)}
                                            className="rounded text-[#85a3bf] focus:ring-[#85a3bf]"
                                        />
                                        <span className="text-xs text-slate-500 font-medium">Activar</span>
                                    </label>
                                </div>
                                <div className={`flex items-center gap-3 transition-opacity ${!enableCompare ? 'opacity-40 pointer-events-none' : ''}`}>
                                    <input 
                                        type="date" 
                                        value={startB} 
                                        onChange={(e) => setStartB(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-[#85a3bf]"
                                    />
                                    <span className="text-slate-400 text-sm">a</span>
                                    <input 
                                        type="date" 
                                        value={endB} 
                                        onChange={(e) => setEndB(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-[#85a3bf]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Row 1: KPI Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                    {kpiCards.map((card, i) => (
                        <KpiCard key={i} {...card} />
                    ))}
                </div>

                {/* ── Row 2: Sales Trend + Currency Breakdown ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    {/* Sales Trend Chart (2/3) */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#85a3bf]" />
                            Tendencia de Ventas
                        </h3>
                        {stats.salesTrend.length > 0 ? (
                            <div className="h-64 md:h-72" style={{ minHeight: 256, minWidth: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.salesTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tickFormatter={formatCompact}
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <RechartsTooltip
                                            formatter={tooltipFormatter}
                                            cursor={{ fill: 'rgba(133, 163, 191, 0.08)' }}
                                            contentStyle={{
                                                borderRadius: '0.75rem', border: 'none',
                                                boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                                                fontSize: '13px',
                                            }}
                                        />
                                        <Bar dataKey="total" fill="#85a3bf" radius={[6, 6, 0, 0]} barSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyState message="No hay ventas registradas en este periodo" />
                        )}
                    </div>

                    {/* Currency Breakdown (1/3) */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ccb9b2]" />
                            Desglose por Moneda
                        </h3>
                        <div className="flex-1 flex flex-col items-center justify-center relative mt-3" style={{ minHeight: 200, minWidth: 0 }}>
                            {stats.currencyBreakdown.reduce((sum, c) => sum + c.value, 0) > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie
                                                data={stats.currencyBreakdown}
                                                cx="50%" cy="50%"
                                                innerRadius={55} outerRadius={80}
                                                paddingAngle={3}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {stats.currencyBreakdown.map((_: CurrencyEntry, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                formatter={tooltipFormatter}
                                                contentStyle={{
                                                    borderRadius: '0.75rem', border: 'none',
                                                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                                                    fontSize: '13px',
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-xl font-extrabold text-slate-800 dark:text-white">
                                            {stats.currencyBreakdown[0]?.name || 'N/A'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                            {formatCurrency(stats.currencyBreakdown.reduce((s, c) => s + c.value, 0))}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <EmptyState message="No hay transacciones registradas" />
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Row 3: Rankings (Products, Families, Clients) ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">

                    {/* Top Products */}
                    <div className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
                            <Package className="w-5 h-5 text-[#85a3bf]" />
                            Productos Top
                            <span className="text-xs font-normal text-slate-400 ml-1">(por volumen)</span>
                        </h3>
                        {stats.topProducts.length > 0 ? (
                            <div className="space-y-3">
                                {stats.topProducts.map((prod: TopProduct, i: number) => (
                                    <div
                                        key={prod.id}
                                        className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0 last:pb-0"
                                    >
                                        <span className="w-6 h-6 rounded-full bg-[#85a3bf]/10 text-[#85a3bf] text-xs font-bold flex items-center justify-center flex-shrink-0">
                                            {i + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm truncate">
                                                {prod.name}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(prod.revenue)}</p>
                                        </div>
                                        <span className="text-slate-800 dark:text-white font-bold text-sm bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg flex-shrink-0">
                                            {prod.qty.toLocaleString('es-MX')} ud
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState message="No hay datos en este periodo" />
                        )}
                    </div>

                    {/* Top Families */}
                    <div className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[#ccb9b2]" />
                            Familias Top
                            <span className="text-xs font-normal text-slate-400 ml-1">(por ingresos)</span>
                        </h3>
                        {stats.topFamilies.length > 0 ? (
                            <div className="space-y-5">
                                {stats.topFamilies.map((fam: TopFamily, i: number) => {
                                    const percent = familiesTotalRevenue > 0
                                        ? Math.round((fam.value / familiesTotalRevenue) * 100)
                                        : 0;

                                    return (
                                        <div key={fam.id}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate mr-2">
                                                    {fam.name}
                                                </span>
                                                <div className="flex flex-col items-end flex-shrink-0">
                                                    <span className="text-slate-600 dark:text-slate-400 font-bold text-xs">
                                                        {percent}%
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">{formatCurrency(fam.value)}</span>
                                                </div>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${FAMILY_BAR_COLORS[i % FAMILY_BAR_COLORS.length]} rounded-full transition-all duration-1000 ease-out`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState message="No hay datos en este periodo" />
                        )}
                    </div>

                    {/* Best Clients */}
                    <div className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-500" />
                            Mejores Clientes
                        </h3>
                        {stats.topClients.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-slate-100 dark:border-slate-700 text-[11px] text-slate-400 uppercase tracking-widest">
                                            <th className="pb-3 font-semibold px-2">#</th>
                                            <th className="pb-3 font-semibold px-2">Cliente</th>
                                            <th className="pb-3 font-semibold px-2 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {stats.topClients.map((client: TopClient, i: number) => (
                                            <tr
                                                key={client.id}
                                                className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors last:border-0"
                                            >
                                                <td className="py-3.5 px-2 text-slate-400 font-medium w-8">{i + 1}</td>
                                                <td className="py-3.5 px-2 text-slate-800 dark:text-white font-medium">{client.name}</td>
                                                <td className="py-3.5 px-2 text-right font-bold text-slate-700 dark:text-slate-300">
                                                    {formatCurrency(client.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState message="No hay datos de clientes en este periodo" />
                        )}
                    </div>
                </div>
            </div>
            <ErrorModal 
                isOpen={errorModal.isOpen} 
                title={errorModal.title} 
                message={errorModal.message} 
                onClose={() => setErrorModal(prev => ({...prev, isOpen: false}))} 
            />
        </div>
    );
}
