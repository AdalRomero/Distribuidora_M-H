import * as Crypto from 'expo-crypto';
import { Building2, Plus, Search, Edit2, Loader2, Trash2, ToggleRight, ToggleLeft, Phone, Mail, Package, ChevronDown, ChevronUp, Contact } from 'lucide-react';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { usePagination } from '../../src/hooks/usePagination';
import { Q } from '@nozbe/watermelondb';
import AddSupplier, { SupplierData, SupplierProductRow, SupplierContactRow } from '../../components/ui/modals/AddSupplier';
import { useAuth } from '../../src/context/AuthContext';
import { useIntegrity } from '../../src/context/IntegrityContext';

import ErrorModal from '../../components/ui/modals/ErrorModal';
import SuccessModal from '../../components/ui/modals/SuccessModal';
import WarningModal from '../../components/ui/modals/WarningModal';
import BulkFixModal, { AffectedItem, ReplacementOption } from '../../components/ui/modals/BulkFixModal';

import { database } from '../../src/services/DB/indexBD';
import { syncApp } from '../../src/sync';
import SyncErrorBanner, { SyncError } from "../../components/ui/SyncErrorBanner";
import { useSyncErrors } from "../../src/hooks/useSyncErrors";

interface SupplierProduct {
    id: string;
    productoId: string;
    productoNombre: string;
    codigoProveedor: string;
    precioCompra: number;
    tiempoEntregaDias: number;
}

interface SupplierItem {
    id: string;
    nombreComercial: string;
    razonSocial: string;
    rfc: string;
    estado: boolean;
    productos: SupplierProduct[];
    contactos: SupplierContactRow[];
}

export default function Suppliers() {
    const { userRole, canDelete } = useAuth();
    const { scan: scanIntegrity } = useIntegrity();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [suppliersList, setSuppliersList] = useState<SupplierItem[]>([]);
    const [isLoadingTable, setIsLoadingTable] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [warningModalConfig, setWarningModalConfig] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<SupplierData | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const tablesToWatch = useMemo(() => ["proveedores", "proveedor_productos", "proveedor_contactos"], []);
    const { syncErrors, handleDismissError } = useSyncErrors(tablesToWatch);
    const [recoveringErrorId, setRecoveringErrorId] = useState<string | null>(null);

    // ── Bulk Fix ──────────────────────────────────────────────
    const [bulkFix, setBulkFix] = useState<{
        open: boolean;
        supplierName: string;
        supplierId: string;
        affectedItems: AffectedItem[];
        replacementOptions: ReplacementOption[];
    }>({ open: false, supplierName: '', supplierId: '', affectedItems: [], replacementOptions: [] });

    useEffect(() => { loadSuppliers(); }, []);

    useEffect(() => {
        if (message?.type === 'success') {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const params = useLocalSearchParams();

    useEffect(() => {
        if (params.openModal === 'action_add_supplier') {
            setEditingId(null);
            setEditData(null);
            setIsModalOpen(true);
            router.setParams({ openModal: '' });
        }
    }, [params.openModal]);

    // Listener para hotkey de acción
    useEffect(() => {
        const handleActionHotkey = (e: any) => {
            if (e.detail?.actionId === 'action_add_supplier') {
                setEditingId(null);
                setEditData(null);
                setIsModalOpen(true);
            }
        };
        window.addEventListener('action_hotkey', handleActionHotkey);
        return () => window.removeEventListener('action_hotkey', handleActionHotkey);
    }, []);

    // ==========================================
    // CARGAR PROVEEDORES DESDE WATERMELONDB
    // ==========================================
    const loadSuppliers = async () => {
        setIsLoadingTable(true);
        try {
            const provDb = database.collections.get('proveedores');
            const allProv = await provDb.query().fetch();

            const mapped: SupplierItem[] = await Promise.all(allProv.map(async (p: any) => {
                const prodRelations = await p.productosOfertados.fetch();
                const productos: SupplierProduct[] = await Promise.all(
                    prodRelations.map(async (rel: any) => {
                        let productoNombre = '';
                        try {
                            const prod = await rel.producto.fetch();
                            productoNombre = prod?.descripcion || '';
                        } catch { productoNombre = '(Producto eliminado)'; }
                        return {
                            id: rel.id,
                            productoId: rel._raw.producto_id,
                            productoNombre,
                            codigoProveedor: rel.codigoProveedor || '',
                            precioCompra: rel.precioCompra || 0,
                            tiempoEntregaDias: rel.tiempoEntregaDias || 0,
                        };
                    })
                );
                const contactosRelations = await p.contactos.fetch();
                const contactos: SupplierContactRow[] = contactosRelations.map((c: any) => ({
                    id: c.id,
                    nombre: c.nombre,
                    telefono: c.telefono || '',
                    correo: c.correo || '',
                    cargo: c.cargo || '',
                }));

                return {
                    id: p.id,
                    nombreComercial: p.nombreComercial || '',
                    razonSocial: p.razonSocial || '',
                    rfc: p.rfc || '',
                    estado: p.estado,
                    productos,
                    contactos,
                };
            }));
            setSuppliersList(mapped);
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
        } finally {
            setIsLoadingTable(false);
        }
    };

    // ==========================================
    // GUARDAR NUEVO PROVEEDOR
    // ==========================================
    const handleSave = async (formData: SupplierData) => {
        setIsLoading(true);
        try {
            const provDb = database.collections.get('proveedores');
            const ppDb = database.collections.get('proveedor_productos');
            const pcDb = database.collections.get('proveedor_contactos');
            const newId = Crypto.randomUUID();

            await database.write(async () => {
                const newProv = await provDb.create((p: any) => {
                    p._raw.id = newId;
                    p.nombreComercial = formData.nombreComercial;
                    p.razonSocial = formData.razonSocial || '';
                    p.rfc = formData.rfc || '';
                    p.estado = formData.estado === 'Activo';
                });

                for (const prod of formData.productos) {
                    if (prod.productoId) {
                        await ppDb.create((pp: any) => {
                            pp._raw.id = Crypto.randomUUID();
                            pp.proveedor.set(newProv);
                            pp._raw.producto_id = prod.productoId;
                            pp.codigoProveedor = prod.codigoProveedor || '';
                            pp.precioCompra = parseFloat(prod.precioCompra) || 0;
                            pp.tiempoEntregaDias = parseInt(prod.tiempoEntregaDias) || 0;
                        });
                    }
                }
                
                for (const contacto of formData.contactos) {
                    await pcDb.create((pc: any) => {
                        pc._raw.id = Crypto.randomUUID();
                        pc.proveedor.set(newProv);
                        pc.nombre = contacto.nombre;
                        pc.telefono = contacto.telefono;
                        pc.correo = contacto.correo;
                        pc.cargo = contacto.cargo;
                    });
                }
            });

            setMessage({ type: 'success', text: `Proveedor "${formData.nombreComercial}" registrado exitosamente. Sincronizando...` });
            if (recoveringErrorId) { handleDismissError(recoveringErrorId); setRecoveringErrorId(null); }
            loadSuppliers();
            syncApp().catch(console.error);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error al guardar el proveedor: ' + error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // EDITAR PROVEEDOR
    // ==========================================
    const startEdit = (supplier: SupplierItem) => {
        setEditingId(supplier.id);
        setEditData({
            nombreComercial: supplier.nombreComercial,
            razonSocial: supplier.razonSocial,
            rfc: supplier.rfc,
            estado: supplier.estado ? 'Activo' : 'Inactivo',
            productos: supplier.productos.map(p => ({
                id: p.id,
                productoId: p.productoId,
                productoNombre: p.productoNombre,
                codigoProveedor: p.codigoProveedor,
                precioCompra: String(p.precioCompra),
                tiempoEntregaDias: String(p.tiempoEntregaDias),
            })),
            contactos: supplier.contactos.map(c => ({
                id: c.id,
                nombre: c.nombre,
                telefono: c.telefono,
                correo: c.correo,
                cargo: c.cargo,
            })),
        });
        setIsModalOpen(true);
    };

    const handleUpdate = async (formData: SupplierData) => {
        if (!editingId) return;
        setIsLoading(true);
        try {
            const provDb = database.collections.get('proveedores');
            const ppDb = database.collections.get('proveedor_productos');
            const pcDb = database.collections.get('proveedor_contactos');
            const record = await provDb.find(editingId) as any;
            const existingProds = await ppDb.query(Q.where('proveedor_id', editingId)).fetch();
            const existingContacts = await pcDb.query(Q.where('proveedor_id', editingId)).fetch();

            await database.write(async () => {
                await record.update((p: any) => {
                    p.nombreComercial = formData.nombreComercial;
                    p.razonSocial = formData.razonSocial || '';
                    p.rfc = formData.rfc || '';
                    p.estado = formData.estado === 'Activo';
                });

                for (const ep of existingProds) { await ep.markAsDeleted(); }
                for (const ec of existingContacts) { await ec.markAsDeleted(); }

                for (const prod of formData.productos) {
                    if (prod.productoId) {
                        await ppDb.create((pp: any) => {
                            pp._raw.id = Crypto.randomUUID();
                            pp.proveedor.set(record);
                            pp._raw.producto_id = prod.productoId;
                            pp.codigoProveedor = prod.codigoProveedor || '';
                            pp.precioCompra = parseFloat(prod.precioCompra) || 0;
                            pp.tiempoEntregaDias = parseInt(prod.tiempoEntregaDias) || 0;
                        });
                    }
                }
                
                for (const contacto of formData.contactos) {
                    await pcDb.create((pc: any) => {
                        pc._raw.id = Crypto.randomUUID();
                        pc.proveedor.set(record);
                        pc.nombre = contacto.nombre;
                        pc.telefono = contacto.telefono;
                        pc.correo = contacto.correo;
                        pc.cargo = contacto.cargo;
                    });
                }
            });

            setMessage({ type: 'success', text: `Proveedor "${formData.nombreComercial}" actualizado correctamente. Sincronizando...` });
            if (recoveringErrorId) { handleDismissError(recoveringErrorId); setRecoveringErrorId(null); }
            setEditingId(null); setEditData(null);
            loadSuppliers();
            syncApp().catch(console.error);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error al actualizar el proveedor: ' + error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseModal = () => { setIsModalOpen(false); setEditingId(null); setEditData(null); };

    // ==========================================
    // TOGGLE ESTADO
    // ==========================================
    const handleToggleStatus = async (id: string, name: string, current: boolean) => {
        // ACTIVAR: directo sin confirmación
        if (!current) {
            setWarningModalConfig({
                isOpen: true, title: 'Confirmar Acción',
                message: `¿Deseas reactivar al proveedor "${name}"?`,
                onConfirm: async () => {
                    setWarningModalConfig(prev => ({ ...prev, isOpen: false }));
                    try {
                        const record = await database.collections.get('proveedores').find(id) as any;
                        await database.write(async () => { await record.update((p: any) => { p.estado = true; }); });
                        setMessage({ type: 'success', text: `Proveedor "${name}" reactivado. Sincronizando...` });
                        loadSuppliers(); syncApp().catch(console.error);
                    } catch (error: any) { setMessage({ type: 'error', text: 'Error al actualizar: ' + error.message }); }
                },
            });
            return;
        }

        // DESACTIVAR: buscar productos vinculados
        const pivotRows = await database.collections.get('proveedor_productos')
            .query(Q.where('proveedor_id', id)).fetch();

        // Ejecutar desactivación
        const doDeactivate = async () => {
            try {
                const record = await database.collections.get('proveedores').find(id) as any;
                await database.write(async () => { await record.update((p: any) => { p.estado = false; }); });
                setMessage({ type: 'success', text: `Proveedor "${name}" desactivado. Los registros históricos permanecen intactos.` });
                loadSuppliers(); syncApp().catch(console.error);
                scanIntegrity('deactivate').catch(console.error);
            } catch (error: any) { setMessage({ type: 'error', text: 'Error: ' + error.message }); }
        };

        if (pivotRows.length === 0) {
            setWarningModalConfig({
                isOpen: true, title: 'Confirmar Acción',
                message: `¿Deseas desactivar al proveedor "${name}"?`,
                onConfirm: async () => { setWarningModalConfig(prev => ({ ...prev, isOpen: false })); await doDeactivate(); },
            });
            return;
        }

        // Hay productos vinculados — mostrar opción de corrección masiva
        const affectedItems: AffectedItem[] = await Promise.all(
            pivotRows.map(async (pivot: any) => {
                try {
                    const prod = await database.collections.get('productos').find(pivot._raw.producto_id);
                    return {
                        id: pivot.id,
                        label: (prod as any).descripcion || 'Producto',
                        subtitle: (prod as any).codigoInterno ? `Código: ${(prod as any).codigoInterno}` : undefined,
                        currentValue: name,
                    } as AffectedItem;
                } catch {
                    return { id: pivot.id, label: 'Producto eliminado', currentValue: name } as AffectedItem;
                }
            })
        );

        // Proveedores activos como opciones de reemplazo
        const activeProv = await database.collections.get('proveedores')
            .query(Q.where('estado', true)).fetch();
        const replacementOptions: ReplacementOption[] = activeProv
            .filter((p: any) => p.id !== id)
            .map((p: any) => ({ id: p.id, label: p.nombreComercial || p.razonSocial || 'Sin nombre' }));

        setWarningModalConfig({
            isOpen: true, title: 'Confirmar Desactivación',
            message: `Al desactivar "${name}", hay ${pivotRows.length} producto(s) vinculado(s). ¿Deseas continuar? Podrás gestionar los vínculos a continuación.`,
            onConfirm: async () => {
                setWarningModalConfig(prev => ({ ...prev, isOpen: false }));
                await doDeactivate();
                setBulkFix({ open: true, supplierName: name, supplierId: id, affectedItems, replacementOptions });
            },
        });
    };

    const handleBulkFixProveedor = async (selectedPivotIds: string[], newProveedorId: string | null) => {
        try {
            await database.write(async () => {
                for (const pivotId of selectedPivotIds) {
                    const pivot = await database.collections.get('proveedor_productos').find(pivotId) as any;
                    if (newProveedorId) {
                        // Crear nuevo vínculo con el proveedor de reemplazo
                        await database.collections.get('proveedor_productos').create((p: any) => {
                            p._raw.id = Crypto.randomUUID();
                            p._raw.producto_id = pivot._raw.producto_id;
                            p._raw.proveedor_id = newProveedorId;
                            p.precioCompra = pivot.precioCompra;
                            p.tiempoEntregaDias = pivot.tiempoEntregaDias;
                            p.codigoProveedor = pivot.codigoProveedor;
                        });
                    }
                    // Eliminar el vínculo viejo
                    await pivot.markAsDeleted();
                }
            });
            loadSuppliers();
            syncApp().catch(console.error);
        } catch (e: any) {
            setMessage({ type: 'error', text: 'Error en corrección masiva: ' + e.message });
            throw e;
        }
    };

    // ==========================================
    // ELIMINAR PROVEEDOR
    // ==========================================
    const handleDelete = (id: string, name: string) => {
        setWarningModalConfig({
            isOpen: true, title: 'Borrar Proveedor',
            message: `¿Estás seguro que deseas borrar al proveedor "${name}"? No se eliminará de la base de datos, solo dejará de mostrarse en la app.`,
            onConfirm: async () => {
                setWarningModalConfig(prev => ({ ...prev, isOpen: false }));
                try {
                    const record = await database.collections.get('proveedores').find(id) as any;
                    await database.write(async () => { await record.markAsDeleted(); });
                    setMessage({ type: 'success', text: `Proveedor "${name}" eliminado correctamente. Sincronizando...` });
                    loadSuppliers(); syncApp().catch(console.error);
                    scanIntegrity('soft_delete').catch(console.error);
                } catch (error: any) { setMessage({ type: 'error', text: 'Error al eliminar el proveedor: ' + error.message }); }
            },
        });
    };

    // ==========================================
    // FILTRO
    // ==========================================
    const filtered = useMemo(() => {
        if (!searchTerm) return suppliersList;
        const s = searchTerm.toLowerCase();
        return suppliersList.filter(p =>
            p.nombreComercial.toLowerCase().includes(s) ||
            p.razonSocial.toLowerCase().includes(s) ||
            p.rfc.toLowerCase().includes(s) ||
            p.contactos.some(c => c.nombre.toLowerCase().includes(s) || c.correo.toLowerCase().includes(s) || c.telefono.toLowerCase().includes(s))
        );
    }, [suppliersList, searchTerm]);

    const { visible, hasMore, loadMore, reset } = usePagination(filtered, 6);
    
    // Infinite Scroll Observer
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, loadMore]);

    useEffect(() => { reset(); }, [searchTerm]);

    // ==========================================
    // RECOVER SYNC ERRORS
    // ==========================================
    useEffect(() => {
        const autoRecoverId = new URLSearchParams(window.location.search).get("recoverErrorId");
        if (autoRecoverId && syncErrors.length > 0) {
            const err = syncErrors.find(e => e.id === autoRecoverId);
            if (err) handleRecoverWrapper(err);
        }
    }, [syncErrors]);

    const handleRecoverWrapper = (err: SyncError) => {
        const d = err.datosAtrapados;
        setEditData({
            nombreComercial: d.nombre_comercial || d.nombreComercial || "",
            razonSocial: d.razon_social || d.razonSocial || "",
            rfc: d.rfc || "",
            estado: d.estado !== false ? "Activo" : "Inactivo",
            productos: [],
            contactos: [
                { id: Math.random().toString(), nombre: '', telefono: '', correo: '', cargo: '' },
                { id: Math.random().toString(), nombre: '', telefono: '', correo: '', cargo: '' }
            ]
        });
        setEditingId(d.id || null);
        setRecoveringErrorId(err.id);
        setIsModalOpen(true);
        setMessage({ type: 'success', text: 'Datos rescatados listos para corregirse y reenviarse.' });
    };

    return (
        <div className="p-4 sm:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                {/* MODALES */}
                <SuccessModal isOpen={message?.type === 'success'} onClose={() => setMessage(null)} title="¡Éxito!" message={message?.type === 'success' ? message.text : ''} />
                <ErrorModal isOpen={message?.type === 'error'} onClose={() => setMessage(null)} title="Ocurrió un problema" message={message?.type === 'error' ? message.text : ''} />
                <WarningModal isOpen={warningModalConfig.isOpen} onClose={() => setWarningModalConfig(prev => ({ ...prev, isOpen: false }))} onConfirm={warningModalConfig.onConfirm} title={warningModalConfig.title} message={warningModalConfig.message} />

                {/* HEADER */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-mh-blue-dark dark:text-white tracking-tight">Directorio de Proveedores</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Administra los distribuidores y los productos que ofrecen.</p>
                    </div>
                    <button onClick={() => { setEditingId(null); setEditData(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm">
                        <Plus className="w-4 h-4" /><span>Nuevo Proveedor</span>
                    </button>
                </div>

                {/* SYNC ERROR BANNER */}
                <SyncErrorBanner errors={syncErrors} onRecover={handleRecoverWrapper} onDismiss={handleDismissError} contextName="Proveedor" isHighPriority={false} />

                {/* BARRA DE BÚSQUEDA */}
                <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-5 h-5 text-slate-400" /></div>
                        <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Buscar por nombre, RFC o correo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                {/* TABLA */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 text-xs uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="px-6 py-4">Proveedor</th>
                                    <th className="px-6 py-4">Contacto</th>
                                    <th className="px-4 py-4 text-center">Productos</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                    <th className="px-4 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoadingTable ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Cargando proveedores...</div>
                                    </td></tr>
                                ) : visible.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                        {searchTerm ? 'No se encontraron proveedores que coincidan.' : 'No hay proveedores registrados. ¡Agrega el primero!'}
                                    </td></tr>
                                ) : (
                                    visible.map((supplier) => (
                                        <>
                                            <tr key={supplier.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900/50 transition-colors group ${!supplier.estado ? 'opacity-50 bg-slate-50 dark:bg-slate-900/30' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-mh-blue-dark dark:text-white font-bold">{supplier.nombreComercial}</p>
                                                        {supplier.razonSocial && <p className="text-slate-400 text-xs mt-0.5">{supplier.razonSocial}</p>}
                                                        <p className="text-slate-400 text-xs mt-0.5">{supplier.rfc || 'Sin RFC'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        {supplier.contactos.length > 0 ? (
                                                            <>
                                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                                                    <Contact className="w-3.5 h-3.5 text-slate-400" />
                                                                    <span className="text-xs font-semibold">{supplier.contactos[0].nombre}</span>
                                                                </div>
                                                                {(supplier.contactos[0].telefono || supplier.contactos[0].correo) && (
                                                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                                        {supplier.contactos[0].telefono && (
                                                                            <div className="flex items-center gap-1">
                                                                                <Phone className="w-3 h-3" />
                                                                                <span className="text-[10px]">{supplier.contactos[0].telefono}</span>
                                                                            </div>
                                                                        )}
                                                                        {supplier.contactos[0].correo && (
                                                                            <div className="flex items-center gap-1">
                                                                                <Mail className="w-3 h-3" />
                                                                                <span className="text-[10px]">{supplier.contactos[0].correo}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {supplier.contactos.length > 1 && (
                                                                    <div className="text-[10px] text-blue-500 dark:text-blue-400 font-medium mt-0.5">
                                                                        + {supplier.contactos.length - 1} contacto{supplier.contactos.length > 2 ? 's' : ''} más
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">Sin contactos</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={() => setExpandedId(expandedId === supplier.id ? null : supplier.id)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${supplier.productos.length > 0
                                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                                                            : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-default'
                                                            }`}
                                                        disabled={supplier.productos.length === 0}
                                                    >
                                                        <Package className="w-3.5 h-3.5" />
                                                        {supplier.productos.length}
                                                        {supplier.productos.length > 0 && (
                                                            expandedId === supplier.id
                                                                ? <ChevronUp className="w-3 h-3" />
                                                                : <ChevronDown className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleStatus(supplier.id, supplier.nombreComercial, supplier.estado)}
                                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${supplier.estado ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                    >
                                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${supplier.estado ? 'translate-x-5' : 'translate-x-1'}`} />
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => startEdit(supplier)}
                                                            className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                                                            title="Editar proveedor"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDelete(supplier.id, supplier.nombreComercial)}
                                                                className="p-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                                                                title="Borrar proveedor"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Fila expandible de productos */}
                                            {expandedId === supplier.id && supplier.productos.length > 0 && (
                                                <tr key={`${supplier.id}-products`} className="bg-blue-50/50 dark:bg-blue-900/10">
                                                    <td colSpan={5} className="px-6 py-4">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-blue-100 dark:border-blue-800/50">
                                                                        <th className="pb-2 text-left">Producto</th>
                                                                        <th className="pb-2 text-left">Código Proveedor</th>
                                                                        <th className="pb-2 text-right">Precio Compra</th>
                                                                        <th className="pb-2 text-right">Entrega (días)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-blue-100/50 dark:divide-blue-800/30">
                                                                    {supplier.productos.map(prod => (
                                                                        <tr key={prod.id} className="text-slate-600 dark:text-slate-300">
                                                                            <td className="py-2 font-medium">{prod.productoNombre}</td>
                                                                            <td className="py-2 text-slate-400">{prod.codigoProveedor || '—'}</td>
                                                                            <td className="py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">${prod.precioCompra.toFixed(2)}</td>
                                                                            <td className="py-2 text-right">{prod.tiempoEntregaDias} días</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Infinite Scroll Trigger */}
                {hasMore && (
                    <div ref={observerTarget} className="flex justify-center mt-6 py-4">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-medium">Cargando más proveedores...</span>
                        </div>
                    </div>
                )}

                <AddSupplier
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={editingId ? handleUpdate : handleSave}
                    isLoading={isLoading}
                    editData={editData}
                />

                {/* Bulk Fix Modal */}
                <BulkFixModal
                    isOpen={bulkFix.open}
                    onClose={() => setBulkFix(p => ({ ...p, open: false }))}
                    deactivatedName={bulkFix.supplierName}
                    entityType="proveedor"
                    entityLabel="Proveedor"
                    affectedItems={bulkFix.affectedItems}
                    affectedLabel="vínculos de producto"
                    replacementOptions={bulkFix.replacementOptions}
                    replacementLabel="Reasignar a otro proveedor activo"
                    allowNoReplacement={true}
                    onConfirmFix={handleBulkFixProveedor}
                />
            </div>
        </div>
    );
}
