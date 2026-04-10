import React, { useState } from 'react';
import { Download, Plus, Search, Filter, Package, DollarSign, AlertTriangle, Clock, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import AddInventory from '../../components/ui/modals/AddInventory';
import withObservables from '@nozbe/with-observables';
import { database } from '../../src/services/DB/indexBD';
import ProductoModel from '../../src/services/DB/models/catalogo/producto';

interface InventoryProps {
    productos: ProductoModel[];
}

function InventoryContent({ productos }: InventoryProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);

    const getMarginBadgeStyle = (category: string) => {
        switch (category) {
            case 'Margen Ideal': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Margen Alto': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'De Servicio': return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-orange-100 text-orange-700 border-orange-200';
        }
    };

    const isLowStock = (stock: number) => stock <= 10;
    const isExpiringSoon = (dateStr: string) => {
        if(!dateStr) return false;
        const today = new Date(); const expDate = new Date(dateStr);
        return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 30;
    };

    const handleDelete = async (producto: ProductoModel) => {
        if(window.confirm('¿Seguro que deseas eliminar este producto?')) {
            await database.write(async () => {
                await producto.markAsDeleted(); // O producto.destroyPermanently()
            });
        }
    };

    const filteredProductos = productos.filter(p => p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) || p.codigoInterno.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-8 bg-slate-50 min-h-screen font-sans">
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
                    <div><p className="text-sm text-slate-500 font-medium">Costo de Stock</p><p className="text-xl font-bold text-slate-800">... Calculando</p></div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
                    <div><p className="text-sm text-slate-500 font-medium">Stock Bajo</p><p className="text-xl font-bold text-amber-600">0 Prods</p></div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-rose-50"><Clock className="w-6 h-6 text-rose-500" /></div>
                    <div><p className="text-sm text-slate-500 font-medium">Próximos a Caducar</p><p className="text-xl font-bold text-rose-600">0 Prods</p></div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-5 h-5 text-slate-400" /></div>
                    <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Buscar por código, nombre o lote..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex gap-3">
                    <select className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                        <option value="">Todas las Familias</option><option value="harinas">Harinas</option><option value="colorantes">Colorantes</option><option value="saborizantes">Saborizantes</option><option value="chocolates">Chocolates</option>
                    </select>
                    <div className="relative inline-block">
                        <button onClick={() => setFilterOpen(!filterOpen)} className="flex items-center justify-center w-10 h-10 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl text-slate-600 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none">
                            <Filter className="w-4 h-4" />
                        </button>
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
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        No se encontraron productos. Crea uno nevo para empezar.
                                    </td>
                                </tr>
                            ) : filteredProductos.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                                                {item.imagen ? (
                                                    <img src={item.imagen} alt="Producto" className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="w-5 h-5 text-slate-400" />
                                                )}
                                            </div>
                                            <div><p className="text-slate-900 font-bold max-w-xs truncate" title={item.descripcion}>{item.descripcion}</p><p className="text-slate-500 text-xs mt-0.5">{item.codigoInterno}</p></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div><p className="text-slate-700 font-medium">Sin Familia</p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getMarginBadgeStyle('Margen Ideal')}`}>Margen Ideal</span></div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div><p className="text-slate-800 font-bold">${(item.precioLista || 0).toFixed(2)}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-md font-bold">Por definir</span>
                                        </div></div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div><p className="text-slate-700 font-medium">N/A</p><p className="text-slate-500 text-xs mt-0.5">Almacén Central</p></div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className={`font-bold text-base ${isLowStock(0) ? 'text-amber-600' : 'text-slate-800'}`}>0 <span className="text-sm font-medium text-slate-500">pzas</span></p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Clock className={`w-3 h-3 text-slate-400`} />
                                                <span className={`text-xs font-medium text-slate-500`}>N/A</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(item)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {mockInventory.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200"><ImageIcon className="w-5 h-5 text-slate-400" /></div>
                                                <div><p className="text-slate-900 font-bold">{item.name}</p><p className="text-slate-500 text-xs mt-0.5">{item.internalCode}</p></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div><p className="text-slate-700 font-medium">{item.family}</p>
                                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getMarginBadgeStyle(item.marginCategory)}`}>{item.marginCategory}</span></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div><p className="text-slate-800 font-bold">${item.averageCost.toFixed(2)}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    {item.hasIva && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-md font-bold">IVA</span>}
                                                    {item.hasIeps && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded-md font-bold">IEPS</span>}
                                                    {(!item.hasIva && !item.hasIeps) && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-md font-bold">Excento</span>}
                                                    <span className="text-slate-400 text-[11px] ml-1">SAT: {item.satCode}</span>
                                                </div></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div><p className="text-slate-700 font-medium">{item.batch}</p><p className="text-slate-500 text-xs mt-0.5">{item.warehouse}</p></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className={`font-bold text-base ${isLowStock(item.stock) ? 'text-amber-600' : 'text-slate-800'}`}>{item.stock} <span className="text-sm font-medium text-slate-500">{item.unit}</span></p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Clock className={`w-3 h-3 ${isExpiringSoon(item.expirationDate) ? 'text-rose-500' : 'text-slate-400'}`} />
                                                    <span className={`text-xs font-medium ${isExpiringSoon(item.expirationDate) ? 'text-rose-600' : 'text-slate-500'}`}>{item.expirationDate}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AddInventory isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        </div>
    );
}

export default withObservables([], () => ({
    productos: database.collections.get<ProductoModel>('productos').query().observe(),
}))(InventoryContent);
