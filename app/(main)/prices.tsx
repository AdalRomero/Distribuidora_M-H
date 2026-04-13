import { Calculator, DollarSign, Edit2, PackageOpen, Percent, Plus, Search, Users } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import AddPrices from '../../components/ui/modals/AddPrices';
import SyncErrorBanner, { SyncError } from "../../components/ui/SyncErrorBanner";
import { useSyncErrors } from "../../src/hooks/useSyncErrors";

interface PriceList {
    id: string; name: string; currency: 'MXN - Pesos Mexicanos' | 'USD - Dólares'; rule: string; activeClients: number;
}

const mockPrices: PriceList[] = [
    { id: '1', name: 'Público General', currency: 'MXN - Pesos Mexicanos', rule: 'Precio Base', activeClients: 124 },
    { id: '2', name: 'Mayoreo Nivel 1', currency: 'MXN - Pesos Mexicanos', rule: '-10% sobre base', activeClients: 45 },
    { id: '3', name: 'Especial Franquicias', currency: 'MXN - Pesos Mexicanos', rule: '-15% sobre base + Envío Gratis', activeClients: 8 },
    { id: '4', name: 'Exportación USA', currency: 'USD - Dólares', rule: 'Precio Especial USD', activeClients: 3 },
];

export default function Prices() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [recoverData, setRecoverData] = useState<any>(null);

    const tablesToWatch = useMemo(() => ["listas_precios", "precios_especiales"], []);
    const { syncErrors, handleDismissError } = useSyncErrors(tablesToWatch);

    useEffect(() => {
        const autoRecoverId = new URLSearchParams(window.location.search).get("recoverErrorId");
        if (autoRecoverId && syncErrors.length > 0) {
          const err = syncErrors.find(e => e.id === autoRecoverId);
          if (err) triggerRecoveryWrapper(err);
        }
    }, [syncErrors]);

    const triggerRecoveryWrapper = (err: SyncError) => {
        setRecoverData(err.datosAtrapados);
        setIsPriceModalOpen(true);
    };

    const filteredPrices = mockPrices.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.currency.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-8 bg-slate-50 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-mh-blue-dark tracking-tight">Listas de Precios y Tarifas</h1>
                        <p className="text-slate-500 text-sm mt-1">Configura las reglas de precios y monedas para tus clientes.</p>
                    </div>
                    <button onClick={() => setIsPriceModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm">
                        <Plus className="w-4 h-4" /><span>Nueva Lista</span>
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-mh-blue"><Calculator className="w-6 h-6" /></div>
                        <div><p className="text-sm font-medium text-slate-500">Total de Listas</p><p className="text-2xl font-bold text-mh-blue-dark">{mockPrices.length}</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><DollarSign className="w-6 h-6" /></div>
                        <div><p className="text-sm font-medium text-slate-500">Moneda Principal</p><p className="text-2xl font-bold text-mh-blue-dark">MXN</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-mh-pink/10 flex items-center justify-center text-mh-pink"><Users className="w-6 h-6" /></div>
                        <div><p className="text-sm font-medium text-slate-500">Clientes Asignados</p><p className="text-2xl font-bold text-mh-blue-dark">{mockPrices.reduce((acc, curr) => acc + curr.activeClients, 0)}</p></div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-5 h-5 text-slate-400" /></div>
                        <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Buscar por nombre de lista o moneda..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <SyncErrorBanner 
                    errors={syncErrors} 
                    onRecover={triggerRecoveryWrapper} 
                    onDismiss={handleDismissError} 
                    contextName="Lista de Precios" 
                    isHighPriority={false} 
                />

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 text-xs uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="px-6 py-4">Nombre de la Lista</th>
                                    <th className="px-6 py-4">Moneda</th>
                                    <th className="px-6 py-4">Regla/Margen</th>
                                    <th className="px-6 py-4 text-center">Clientes Activos</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredPrices.map((price) => (
                                    <tr key={price.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4"><p className="text-mh-blue-dark font-bold">{price.name}</p></td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">{price.currency}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-600"><Percent className="w-3.5 h-3.5 text-mh-blue" /><span className="font-medium text-sm">{price.rule}</span></div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-blue-50 text-mh-blue-dark rounded-full font-bold text-xs"><Users className="w-3.5 h-3.5" />{price.activeClients}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Lista"><Edit2 className="w-4 h-4" /></button>
                                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" title="Ver Productos"><PackageOpen className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredPrices.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No se encontraron listas de precios.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <AddPrices isOpen={isPriceModalOpen} onClose={() => { setIsPriceModalOpen(false); setRecoverData(null); }} recoverData={recoverData} />
            </div>
        </div>
    );
}
