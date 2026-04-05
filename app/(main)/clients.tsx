import { useState } from 'react';
import { Search, Tag, MoreVertical, Plus, MapPin } from 'lucide-react';
import AddClient from '../../components/ui/modals/AddClient';

interface ClientItem {
    id: string; rfc: string; name: string; category: 'Panadería' | 'Dulcería' | 'General'; priceList: string; status: 'Activo' | 'Inactivo';
}

const mockClients: ClientItem[] = [
    { id: '1', rfc: 'PELT901012A12', name: 'Panadería El Trigo', category: 'Panadería', priceList: 'Mayoreo Nivel 1', status: 'Activo' },
    { id: '2', rfc: 'DLEST850210XYZ', name: 'Dulces La Estrella', category: 'Dulcería', priceList: 'Especial Franquicias', status: 'Activo' },
    { id: '3', rfc: 'ABAD980512HQ1', name: 'Abarrotes Don Pepe', category: 'General', priceList: 'Público General', status: 'Inactivo' },
    { id: '4', rfc: 'PANR880614WW2', name: 'Panadería Rosa', category: 'Panadería', priceList: 'Público General', status: 'Activo' },
    { id: '5', rfc: 'CARA010815TTT', name: 'Caramelos y Más', category: 'Dulcería', priceList: 'Mayoreo Nivel 1', status: 'Activo' },
];

export default function Clients() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);

    const filteredClients = mockClients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.rfc.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCategoryBadgeColor = (category: string) => {
        switch (category) {
            case 'Panadería': return 'bg-blue-50 text-mh-blue-dark border-blue-100';
            case 'Dulcería': return 'bg-mh-pink/10 text-mh-pink border-mh-pink/20';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const isActive = status === 'Activo';
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/50' : 'bg-rose-100/80 text-rose-700 border border-rose-200/50'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                {status}
            </span>
        );
    };

    return (
        <div className="p-4 sm:p-8 bg-slate-50 min-h-screen font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-mh-blue-dark tracking-tight">Directorio de Clientes</h1>
                    <p className="text-slate-500 text-sm mt-1">Administra la información y asignaciones de tus clientes.</p>
                </div>
                <button onClick={() => setIsClientModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm">
                    <Plus className="w-4 h-4" /><span>Nuevo Cliente</span>
                </button>
            </div>

            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center mb-6">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-5 h-5 text-slate-400" /></div>
                    <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Buscar por nombre, RFC o lista asignada..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 text-xs uppercase tracking-wider font-bold">
                            <tr>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Categoría</th>
                                <th className="px-6 py-4">Lista Asignada</th>
                                <th className="px-4 py-4 text-center">Dirección</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-4 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div><p className="text-mh-blue-dark font-bold">{client.name}</p><p className="text-slate-400 text-xs mt-0.5">{client.rfc}</p></div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getCategoryBadgeColor(client.category)}`}>{client.category}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600"><Tag className="w-4 h-4 text-mh-blue" /><span className="font-medium text-sm">{client.priceList}</span></div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <button className="p-2 text-slate-400 hover:text-mh-blue hover:bg-slate-100 rounded-lg transition-colors" title="Dirección"><MapPin className="w-4 h-4" /></button>
                                    </td>
                                    <td className="px-6 py-4 text-center"><StatusBadge status={client.status} /></td>
                                    <td className="px-4 py-4 text-center">
                                        <button className="p-2 text-slate-400 hover:text-mh-blue hover:bg-slate-100 rounded-lg transition-colors" title="Opciones"><MoreVertical className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredClients.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No se encontraron clientes que coincidan con la búsqueda.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <AddClient isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} />
        </div>
    );
}
