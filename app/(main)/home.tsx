import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    CheckCircle2, FileText, Clock, TrendingUp
} from 'lucide-react';

const summaryStats = [
    { title: 'Aceptados', value: '2,340', icon: CheckCircle2, color: 'text-emerald-500', bgIcon: 'bg-emerald-100', dot: 'bg-emerald-500' },
    { title: 'En Contrato', value: '1,120', icon: FileText, color: 'text-[#85a3bf]', bgIcon: 'bg-[#e6edf4]', dot: 'bg-[#85a3bf]' },
    { title: 'Pendientes', value: '450', icon: Clock, color: 'text-amber-500', bgIcon: 'bg-amber-100', dot: 'bg-amber-500' },
];

const barChartData = [
    { name: 'Prospectos', v: 4300 },
    { name: 'Evaluación', v: 3800 },
    { name: 'Negociación', v: 1200 },
    { name: 'Cierre', v: 2400 },
    { name: 'Firmados', v: 1900 },
];

const pieChartData = [
    { name: '< 30 días', value: 350 },
    { name: '30-60 días', value: 250 },
    { name: '60-90 días', value: 150 },
    { name: '> 90 días', value: 80 },
];
const pieColors = ['#ccb9b2', '#85a3bf', '#a8948d', '#f4eeec'];

const contractsData = [
    { serial: 'CON-2023-001', name: 'Cornejo', value: '$45,000', status: 'Aceptado' },
    { serial: 'CON-2023-002', name: 'Tortilleria Superior', value: '$32,500', status: 'En Contrato' },
    { serial: 'CON-2023-003', name: 'Angela', value: '$128,000', status: 'Pendiente' },
    { serial: 'CON-2023-004', name: 'Doña Lupita', value: '$15,000', status: 'Aceptado' },
    { serial: 'CON-2023-005', name: 'Zona Norte', value: '$85,000', status: 'Alerta' },
];

const progressBars = [
    { label: 'Harinas', percent: 75, color: 'bg-[#85a3bf]' },
    { label: 'Lácteos', percent: 65, color: 'bg-[#ccb9b2]' },
    { label: 'Cereales', percent: 40, color: 'bg-[#6383a1]' },
    { label: 'Granos', percent: 35, color: 'bg-[#a8948d]' },
    { label: 'Colorantes', percent: 22, color: 'bg-[#252525]' },
    { label: 'Otros', percent: 12, color: 'bg-[#afc2c4]' },
];

const timeCards = [
    { days: 25, label: 'Días promedio - NDA' },
    { days: 42, label: 'Días promedio - Cierre' },
    { days: 12, label: 'Días para renovar' },
    { days: 8, label: 'Alertas activas' },
    { days: 22, label: 'Días para renovar' },
    { days: 18, label: 'Alertas activas' },
];

export default function Home() {
    const renderBadge = (status: string) => {
        switch (status) {
            case 'Aceptado':
                return <span className="px-3 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 font-medium">Aceptado</span>;
            case 'En Contrato':
                return <span className="px-3 py-1 text-xs rounded-full bg-[#e6edf4] text-[#6383a1] font-medium">En Contrato</span>;
            case 'Pendiente':
                return <span className="px-3 py-1 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">Pendiente</span>;
            case 'Alerta':
                return <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium">Alerta</span>;
            default:
                return <span className="px-3 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium">{status}</span>;
        }
    };

    return (
        <div className="p-8 bg-slate-50 dark:bg-slate-900 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">Panel de Información</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Resumen general de contratos y operaciones métricas</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {summaryStats.map((stat, i) => {
                                const Icon = stat.icon;
                                return (
                                    <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                                        <div className={`p-4 rounded-xl ${stat.bgIcon}`}>
                                            <Icon className={`w-7 h-7 ${stat.color}`} />
                                        </div>
                                        <div>
                                            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${stat.dot}`}></span>
                                                {stat.title}
                                            </h3>
                                            <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{stat.value}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#85a3bf]"></span>
                                    Ventas por Año
                                </h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                            <RechartsTooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="v" fill="#85a3bf" radius={5} barSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#ccb9b2]"></span>
                                    Productos por Expirar
                                </h3>
                                <div className="flex-1 min-h-[16rem] flex flex-col items-center justify-center relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                                                {pieChartData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-4xl font-extrabold text-slate-800 dark:text-white">830</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Mis Contratos</h3>
                                <button className="text-sm text-[#6383a1] font-semibold hover:text-[#85a3bf] transition-colors">Ver todos →</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-slate-100 dark:border-slate-700 text-[11px] text-slate-400 uppercase tracking-widest">
                                            <th className="pb-3 font-semibold px-2">Serial #</th>
                                            <th className="pb-3 font-semibold px-2">Nombre</th>
                                            <th className="pb-3 font-semibold px-2 text-right">Valor</th>
                                            <th className="pb-3 font-semibold px-2 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {contractsData.map((contract, i) => (
                                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900/70 transition-colors last:border-0 group">
                                                <td className="py-4 px-2 text-slate-500 dark:text-slate-400 font-medium group-hover:text-[#6383a1] transition-colors">{contract.serial}</td>
                                                <td className="py-4 px-2 text-slate-800 dark:text-white font-medium">{contract.name}</td>
                                                <td className="py-4 px-2 text-right font-bold text-slate-700 dark:text-slate-300">{contract.value}</td>
                                                <td className="py-4 px-2 text-center">{renderBadge(contract.status)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-1 flex flex-col gap-20">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-slate-400" strokeWidth={2.5} />
                                Familias mas Vendidas
                            </h3>
                            <div className="space-y-6">
                                {progressBars.map((bar, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{bar.label}</span>
                                            <span className="text-slate-500 dark:text-slate-400 font-bold">{bar.percent}%</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                            <div className={`h-full ${bar.color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${bar.percent}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-7">
                            {timeCards.map((card, i) => (
                                <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center flex flex-col justify-center items-center group hover:-translate-y-1 transition-transform duration-300">
                                    <span className="text-4xl font-extrabold text-slate-800 dark:text-white group-hover:text-[#6383a1] transition-colors">
                                        {card.days}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-3 leading-tight opacity-80">
                                        {card.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
