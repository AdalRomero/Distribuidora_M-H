import withObservables from '@nozbe/with-observables';
import { AlertTriangle, Clock, DollarSign, Download, Package, Plus, Search } from 'lucide-react';
import React, { useState } from 'react';
import AddInventory from '../../components/ui/modals/AddInventory';
import ProductRow from '../../components/ui/ProductRow';
import { database } from '../../src/services/DB/indexBD';
import FamiliaModel from '../../src/services/DB/models/bases/familia';
import ProductoModel from '../../src/services/DB/models/catalogo/producto';

interface InventoryProps {
    productos: ProductoModel[];
    familias: FamiliaModel[];
}

function InventoryContent({ productos, familias }: InventoryProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [filterFamilia, setFilterFamilia] = useState('');

    const handleDelete = async (producto: ProductoModel) => {
        if (window.confirm('¿Seguro que deseas eliminar este producto?')) {
            await database.write(async () => {
                await producto.markAsDeleted();
            });
        }
    };

    const filteredProductos = productos.filter(p => {
        const matchesSearch = p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.codigoInterno.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFamilia = !filterFamilia || (p as any).familiaId === filterFamilia;
        return matchesSearch && matchesFamilia;
    });

    return (
        <div className="p-8 bg-slate-50 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Inventario de Productos</h1>
                        <p className="text-slate-500 text-sm mt-1">Gestiona y consulta tu catálogo de distribución</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm">
                            <Download className="w-4 h-4" /><span>Exportar</span>
                        </button>
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm">
                            <Plus className="w-4 h-4" /><span>Nuevo Producto</span>
                        </button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><Package className="w-6 h-6 text-blue-600" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Productos</p><p className="text-xl font-bold text-slate-800">{productos.length}</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0"><DollarSign className="w-6 h-6 text-emerald-600" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Familias Activas</p><p className="text-xl font-bold text-slate-800">{familias.filter(f => f.estado).length}</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Stock Bajo</p><p className="text-xl font-bold text-amber-600">— Prods</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-rose-50"><Clock className="w-6 h-6 text-rose-500" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Próximos a Caducar</p><p className="text-xl font-bold text-rose-600">— Prods</p></div>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-5 h-5 text-slate-400" /></div>
                        <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Buscar por código, nombre o lote..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={filterFamilia}
                            onChange={e => setFilterFamilia(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                            <option value="">Todas las Familias</option>
                            {familias.filter(f => f.estado).map(fam => (
                                <option key={fam.id} value={fam.id}>{fam.codigoFamilia}-{fam.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Alert Legend */}
                <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avisos:</span>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] font-bold text-emerald-700">OK</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-full border border-amber-200">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-[10px] font-bold text-amber-700">Precaución</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 rounded-full border border-rose-200">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <span className="text-[10px] font-bold text-rose-700">Urgente</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-900 rounded-full border border-gray-700">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                        <span className="text-[10px] font-bold text-white">Vencido</span>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4">Clasificación</th>
                                    <th className="px-6 py-4">Fiscal y Finanzas</th>
                                    <th className="px-6 py-4">Lote y Origen</th>
                                    <th className="px-6 py-4">Existencia y Cad</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProductos.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Package className="w-10 h-10 text-slate-300" />
                                                <p className="text-slate-500 font-medium">No se encontraron productos</p>
                                                <p className="text-slate-400 text-xs">Crea uno nuevo para empezar a gestionar tu inventario</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredProductos.map((item) => (
                                    <ProductRow key={item.id} producto={item} onDelete={handleDelete} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <AddInventory isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            </div>
        </div>
    );
}

export default withObservables([], () => ({
    productos: database.collections.get<ProductoModel>('productos').query().observe(),
    familias: database.collections.get<FamiliaModel>('familias').query().observe(),
}))(InventoryContent);
