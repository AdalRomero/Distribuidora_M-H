import * as Crypto from 'expo-crypto';
import { MapPin, Plus, Search, Tag, Edit2, Loader2, Trash2, ToggleRight, ToggleLeft, X, Phone, Mail, Navigation } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { usePagination } from '../../src/hooks/usePagination';
import { Q } from '@nozbe/watermelondb';
import AddClient, { ClientData } from '../../components/ui/modals/AddClient';

import ErrorModal from '../../components/ui/modals/ErrorModal';
import SuccessModal from '../../components/ui/modals/SuccessModal';
import WarningModal from '../../components/ui/modals/WarningModal';

import { database } from '../../src/services/DB/indexBD';
import { syncApp } from '../../src/sync';
import SyncErrorBanner, { SyncError } from "../../components/ui/SyncErrorBanner";
import { useSyncErrors } from "../../src/hooks/useSyncErrors";

interface ClientItem {
    id: string;
    nombre: string;
    rfc: string;
    categoria: string;
    listaPrecioBase: string;
    descuentoGlobal: number;
    contactos: string[];
    calle: string;
    colonia: string;
    cp: string;
    ciudad: string;
    estado: boolean;
}

export default function Clients() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientsList, setClientsList] = useState<ClientItem[]>([]);
    const [isLoadingTable, setIsLoadingTable] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [warningModalConfig, setWarningModalConfig] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // ==========================================
    // EDIT STATE
    // ==========================================
    const [editingClientId, setEditingClientId] = useState<string | null>(null);
    const [editData, setEditData] = useState<ClientData | null>(null);

    // ==========================================
    // ADDRESS FLYOUT STATE
    // ==========================================
    const [addressFlyoutId, setAddressFlyoutId] = useState<string | null>(null);
    const [hoveredAddressId, setHoveredAddressId] = useState<string | null>(null);
    const flyoutRef = useRef<HTMLDivElement>(null);

    // ==========================================
    // CARGAR CLIENTES DESDE WATERMELONDB
    // ==========================================
    useEffect(() => {
        loadClients();
    }, []);

    const tablesToWatch = useMemo(() => ["clientes", "proveedores"], []);
    const { syncErrors, handleDismissError } = useSyncErrors(tablesToWatch);
    const [recoveringErrorId, setRecoveringErrorId] = useState<string | null>(null);

    useEffect(() => {
        const autoRecoverId = new URLSearchParams(window.location.search).get("recoverErrorId");
        if (autoRecoverId && syncErrors.length > 0) {
          const err = syncErrors.find(e => e.id === autoRecoverId);
          if (err) handleRecoverWrapper(err);
        }
    }, [syncErrors]);

    // Listener para hotkey de acción
    useEffect(() => {
        const handleActionHotkey = (e: any) => {
            if (e.detail?.actionId === 'action_add_client') {
                setEditingClientId(null);
                setEditData(null);
                setIsClientModalOpen(true);
            }
        };
        window.addEventListener('action_hotkey', handleActionHotkey);
        return () => window.removeEventListener('action_hotkey', handleActionHotkey);
    }, []);

    const handleRecoverWrapper = (err: SyncError) => {
        // Mapear los datos atrapados al modal de edición
        const d = err.datosAtrapados;
        setEditData({
            nombre: d.nombre || "",
            rfc: d.rfc || "",
            categoria: d.categoria || "General",
            listaPrecios: d.listaPrecioBase || "lista",
            descuentoGlobal: String(d.descuentoGlobal || 0),
            discountRules: [],
            contactos: d.contactos || [""],
            estado: d.estado !== false ? "Activo" : "Inactivo",
            calle: d.calle || "",
            colonia: d.colonia || "",
            cp: d.cp || "",
            ciudad: d.ciudad || ""
        });
        setEditingClientId(d.id || null);
        setRecoveringErrorId(err.id);
        setIsClientModalOpen(true);
        setMessage({ type: 'success', text: 'Datos rescatados listos para corregirse y reenviarse.' });
    };

    useEffect(() => {
        if (message?.type === 'success') {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const params = useLocalSearchParams();

    useEffect(() => {
        if (params.openModal === 'action_add_client') {
            setEditingClientId(null);
            setEditData(null);
            setIsClientModalOpen(true);
            router.setParams({ openModal: '' });
        }
    }, [params.openModal]);

    // Close flyout on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
                setAddressFlyoutId(null);
            }
        };
        if (addressFlyoutId) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [addressFlyoutId]);

    const loadClients = async () => {
        setIsLoadingTable(true);
        try {
            const clientesDb = database.collections.get('clientes');
            const allClientes = await clientesDb.query().fetch();

            const mapped: ClientItem[] = await Promise.all(allClientes.map(async (c: any) => {
                const contactosRecords = await c.contactos.fetch();

                return {
                    id: c.id,
                    nombre: c.nombre || '',
                    rfc: c.rfc || '',
                    categoria: c.categoria || 'General',
                    listaPrecioBase: c.listaPrecioBase || 'lista',
                    descuentoGlobal: c.descuentoGlobal || 0,
                    contactos: contactosRecords.length > 0 ? contactosRecords.map((r: any) => r.contenido) : [],
                    calle: c.calle || '',
                    colonia: c.colonia || '',
                    cp: c.cp || '',
                    ciudad: c.ciudad || '',
                    estado: c.estado,
                };
            }));


            setClientsList(mapped);
        } catch (error) {
            console.error('Error al cargar clientes:', error);
        } finally {
            setIsLoadingTable(false);
        }
    };

    // ==========================================
    // GUARDAR NUEVO CLIENTE
    // ==========================================
    const handleSaveClient = async (formData: ClientData) => {
        setIsLoading(true);
        try {
            const clientesDb = database.collections.get('clientes');
            const contactosDb = database.collections.get('contactos');
            const newId = Crypto.randomUUID();

            await database.write(async () => {
                const newCliente = await clientesDb.create((c: any) => {
                    c._raw.id = newId;
                    c.nombre = formData.nombre;
                    c.rfc = formData.rfc || '';
                    c.categoria = formData.categoria || 'General';
                    c.listaPrecioBase = formData.listaPrecios || 'lista';
                    c.descuentoGlobal = parseFloat(formData.descuentoGlobal) || 0;
                    c.calle = formData.calle || '';
                    c.colonia = formData.colonia || '';
                    c.cp = formData.cp || '';
                    c.ciudad = formData.ciudad || '';
                    c.estado = formData.estado === 'Activo';
                });

                // Link to price template via junction table
                if (formData.listaPrecios) {
                    const plantillasDb = database.collections.get('plantillas_precios');
                    const junctionDb = database.collections.get('clientes_plantillas');
                    const [plantilla] = await plantillasDb.query(Q.where('nombre', formData.listaPrecios)).fetch();
                    if (plantilla) {
                        await junctionDb.create((j: any) => {
                            j._raw.id = Crypto.randomUUID();
                            j.clienteId = newId;
                            j.plantillaId = plantilla.id;
                        });
                    }
                }

                for (const contactoStr of formData.contactos) {
                    if (contactoStr.trim()) {
                        await contactosDb.create((c: any) => {
                            c._raw.id = Crypto.randomUUID();
                            c.cliente.set(newCliente);
                            c.contenido = contactoStr.trim();
                        });
                    }
                }
            });

            setMessage({ type: 'success', text: `Cliente "${formData.nombre}" registrado exitosamente. Sincronizando...` });
            if (recoveringErrorId) {
                handleDismissError(recoveringErrorId);
                setRecoveringErrorId(null);
            }
            loadClients();
            syncApp().catch(console.error);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error al guardar el cliente: ' + error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // EDITAR CLIENTE (SOBREESCRIBIR)
    // ==========================================
    const startEdit = (client: ClientItem) => {
        setEditingClientId(client.id);
        setEditData({
            nombre: client.nombre,
            rfc: client.rfc,
            categoria: client.categoria,
            listaPrecios: client.listaPrecioBase,
            descuentoGlobal: String(client.descuentoGlobal),
            discountRules: [],
            contactos: client.contactos.length > 0 ? client.contactos : [''],
            estado: client.estado ? 'Activo' : 'Inactivo',
            calle: client.calle,
            colonia: client.colonia,
            cp: client.cp,
            ciudad: client.ciudad,
        });
        setIsClientModalOpen(true);
    };

    const handleUpdateClient = async (formData: ClientData) => {
        if (!editingClientId) return;
        setIsLoading(true);
        try {
            const clientesDb = database.collections.get('clientes');
            const contactosDb = database.collections.get('contactos');
            const record = await clientesDb.find(editingClientId) as any;
            const existingContactos = await record.contactos.fetch();

            await database.write(async () => {
                await record.update((c: any) => {
                    c.nombre = formData.nombre;
                    c.rfc = formData.rfc || '';
                    c.categoria = formData.categoria || 'General';
                    c.listaPrecioBase = formData.listaPrecios || 'lista';
                    c.descuentoGlobal = parseFloat(formData.descuentoGlobal) || 0;
                    c.calle = formData.calle || '';
                    c.colonia = formData.colonia || '';
                    c.cp = formData.cp || '';
                    c.ciudad = formData.ciudad || '';
                    c.estado = formData.estado === 'Activo';
                });

                // Update junction table association
                const plantillasDb = database.collections.get('plantillas_precios');
                const junctionDb = database.collections.get('clientes_plantillas');
                
                // Remove old associations
                const oldJunctions = await junctionDb.query(Q.where('cliente_id', editingClientId)).fetch();
                for (const oj of oldJunctions) await oj.markAsDeleted();
                
                // Add new association if list selected
                if (formData.listaPrecios) {
                    const [plantilla] = await plantillasDb.query(Q.where('nombre', formData.listaPrecios)).fetch();
                    if (plantilla) {
                        await junctionDb.create((j: any) => {
                            j._raw.id = Crypto.randomUUID();
                            j.clienteId = editingClientId;
                            j.plantillaId = plantilla.id;
                        });
                    }
                }

                for (const c of existingContactos) await c.markAsDeleted();

                for (const contactoStr of formData.contactos) {
                    if (contactoStr.trim()) {
                        await contactosDb.create((c: any) => {
                            c._raw.id = Crypto.randomUUID();
                            c.cliente.set(record);
                            c.contenido = contactoStr.trim();
                        });
                    }
                }
            });

            setMessage({ type: 'success', text: `Cliente "${formData.nombre}" actualizado correctamente. Sincronizando...` });
            if (recoveringErrorId) {
                handleDismissError(recoveringErrorId);
                setRecoveringErrorId(null);
            }
            setEditingClientId(null);
            setEditData(null);
            loadClients();
            syncApp().catch(console.error);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error al actualizar el cliente: ' + error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseModal = () => {
        setIsClientModalOpen(false);
        setEditingClientId(null);
        setEditData(null);
    };

    // ==========================================
    // TOGGLE ESTADO (ACTIVAR/DESACTIVAR)
    // ==========================================
    const handleToggleStatus = (clientId: string, clientName: string, currentStatus: boolean) => {
        const accion = currentStatus ? 'desactivar' : 'reactivar';
        setWarningModalConfig({
            isOpen: true,
            title: 'Confirmar Acción',
            message: `¿Estás seguro que deseas ${accion} al cliente "${clientName}"?`,
            onConfirm: async () => {
                setWarningModalConfig(prev => ({ ...prev, isOpen: false }));
                try {
                    const clientesDb = database.collections.get('clientes');
                    const record = await clientesDb.find(clientId) as any;
                    await database.write(async () => {
                        await record.update((c: any) => {
                            c.estado = !currentStatus;
                        });
                    });
                    setMessage({ type: 'success', text: `Cliente ${currentStatus ? 'desactivado' : 'activado'} correctamente. Sincronizando...` });
                    loadClients();
                    syncApp().catch(console.error);
                } catch (error: any) {
                    setMessage({ type: 'error', text: 'Error al actualizar el estado: ' + error.message });
                }
            },
        });
    };

    // ==========================================
    // ELIMINAR CLIENTE (BORRADO LÓGICO)
    // ==========================================
    const handleDeleteClient = (clientId: string, clientName: string) => {
        setWarningModalConfig({
            isOpen: true,
            title: 'Eliminar Cliente',
            message: `¿Estás seguro que deseas eliminar al cliente "${clientName}"? Esta acción no se puede deshacer.`,
            onConfirm: async () => {
                setWarningModalConfig(prev => ({ ...prev, isOpen: false }));
                try {
                    const clientesDb = database.collections.get('clientes');
                    const record = await clientesDb.find(clientId) as any;
                    await database.write(async () => {
                        await record.markAsDeleted();
                    });
                    setMessage({ type: 'success', text: `Cliente "${clientName}" eliminado correctamente. Sincronizando...` });
                    loadClients();
                    syncApp().catch(console.error);
                } catch (error: any) {
                    setMessage({ type: 'error', text: 'Error al eliminar el cliente: ' + error.message });
                }
            },
        });
    };

    // ==========================================
    // FILTRO DE BÚSQUEDA
    // ==========================================
    const filteredClients = useMemo(() => {
        if (!searchTerm) return clientsList;
        const s = searchTerm.toLowerCase();
        return clientsList.filter(c =>
            c.nombre.toLowerCase().includes(s) ||
            c.rfc.toLowerCase().includes(s) ||
            c.categoria.toLowerCase().includes(s)
        );
    }, [clientsList, searchTerm]);

    const { visible: visibleClients, hasMore: hasMoreClients, loadMore: loadMoreClients, reset: resetClientsPage } = usePagination(filteredClients, 5);

    useEffect(() => { resetClientsPage(); }, [searchTerm]);

    // ==========================================
    // HELPERS DE UI
    // ==========================================
    const getCategoryBadgeColor = (category: string) => {
        switch (category) {
            case 'Panadería': return 'bg-blue-50 dark:bg-blue-900/30 text-mh-blue-dark dark:text-blue-400 border-blue-100 dark:border-blue-800/50';
            case 'Dulcería': return 'bg-mh-pink/10 dark:bg-mh-pink/20 text-mh-pink dark:text-pink-400 border-mh-pink/20 dark:border-pink-800/50';
            case 'Abarrotes': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
            default: return 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    const getPriceListLabel = (key: string) => {
        switch (key) {
            case 'lista': return 'Precio Lista';
            case 'mayoreo': return 'Mayoreo';
            case 'menudeo': return 'Menudeo';
            case 'personalizada': return 'Lista Personalizada';
            default: return key;
        }
    };

    const hasAddress = (client: ClientItem) => {
        return !!(client.calle || client.colonia || client.cp || client.ciudad);
    };

    const getAddressSummary = (client: ClientItem) => {
        const parts = [client.calle, client.colonia, client.cp, client.ciudad].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'Sin dirección';
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
                        <h1 className="text-2xl font-bold text-mh-blue-dark dark:text-white tracking-tight">Directorio de Clientes</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Administra la información y asignaciones de tus clientes.</p>
                    </div>
                    <button onClick={() => { setEditingClientId(null); setEditData(null); setIsClientModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm">
                        <Plus className="w-4 h-4" /><span>Nuevo Cliente</span>
                    </button>
                </div>

                {/* BARRA DE BÚSQUEDA */}
                
                <SyncErrorBanner 
                    errors={syncErrors} 
                    onRecover={handleRecoverWrapper} 
                    onDismiss={handleDismissError} 
                    contextName="Cliente" 
                    isHighPriority={false} 
                />

                <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-5 h-5 text-slate-400" /></div>
                        <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Buscar por nombre, RFC o categoría..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                {/* TABLA */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 text-xs uppercase tracking-wider font-bold">
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
                                {isLoadingTable ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Cargando clientes...</div>
                                    </td></tr>
                                ) : visibleClients.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        {searchTerm ? 'No se encontraron clientes que coincidan con la búsqueda.' : 'No hay clientes registrados. ¡Agrega el primero!'}
                                    </td></tr>
                                ) : (
                                    visibleClients.map((client) => (
                                        <tr key={client.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900/50 transition-colors group ${!client.estado ? 'opacity-50 bg-slate-50 dark:bg-slate-900/30' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-mh-blue-dark dark:text-white font-bold">{client.nombre}</p>
                                                    <p className="text-slate-400 text-xs mt-0.5">{client.rfc || 'Sin RFC'}</p>
                                                    {client.contactos && client.contactos.length > 0 && (
                                                        <div className="flex flex-col gap-0.5 mt-1">
                                                            {client.contactos.slice(0, 2).map((c, i) => (
                                                                <p key={i} className="text-slate-400 text-xs">{c}</p>
                                                            ))}
                                                            {client.contactos.length > 2 && (
                                                                <p className="text-blue-500 text-[10px] font-medium">+{client.contactos.length - 2} más...</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getCategoryBadgeColor(client.categoria)}`}>{client.categoria}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                    <Tag className="w-4 h-4 text-mh-blue" />
                                                    <span className="font-medium text-sm">{getPriceListLabel(client.listaPrecioBase)}</span>
                                                    {client.descuentoGlobal > 0 && (
                                                        <span className="text-xs text-emerald-600 font-semibold">-{client.descuentoGlobal}%</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* DIRECCIÓN — hover tooltip + click flyout */}
                                            <td className="px-4 py-4 text-center">
                                                <div className="relative inline-block">
                                                    <button
                                                        className={`p-2 rounded-lg transition-all duration-200 ${hasAddress(client)
                                                            ? 'text-mh-blue dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:scale-110'
                                                            : 'text-slate-300 dark:text-slate-600 cursor-default'
                                                        }`}
                                                        onClick={() => hasAddress(client) && setAddressFlyoutId(addressFlyoutId === client.id ? null : client.id)}
                                                        onMouseEnter={() => setHoveredAddressId(client.id)}
                                                        onMouseLeave={() => setHoveredAddressId(null)}
                                                        disabled={!hasAddress(client)}
                                                    >
                                                        <MapPin className="w-4 h-4" />
                                                    </button>

                                                    {/* Hover Tooltip */}
                                                    {hoveredAddressId === client.id && addressFlyoutId !== client.id && (
                                                        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-fade-in">
                                                            {getAddressSummary(client)}
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                        </div>
                                                    )}

                                                    {/* Click Flyout */}
                                                    {addressFlyoutId === client.id && (
                                                        <div ref={flyoutRef} className="absolute z-40 top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
                                                            {/* Flyout Header */}
                                                            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-700">
                                                                <div className="flex items-center gap-2">
                                                                    <MapPin className="w-4 h-4 text-mh-blue" />
                                                                    <span className="text-sm font-bold text-mh-blue-dark dark:text-white">Dirección</span>
                                                                </div>
                                                                <button onClick={() => setAddressFlyoutId(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-md transition-colors">
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                            {/* Flyout Body */}
                                                            <div className="p-4 space-y-3">
                                                                {client.calle && (
                                                                    <div className="flex items-start gap-2.5">
                                                                        <Navigation className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                                                        <div>
                                                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Calle</p>
                                                                            <p className="text-sm text-slate-700 dark:text-slate-300">{client.calle}</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {client.colonia && (
                                                                    <div className="flex items-start gap-2.5">
                                                                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                                                        <div>
                                                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Colonia</p>
                                                                            <p className="text-sm text-slate-700 dark:text-slate-300">{client.colonia}</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {client.contactos && client.contactos.length > 0 && (
                                                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                                                                        {client.contactos.map((contacto, i) => (
                                                                            <div key={i} className="flex items-center gap-2 mb-1">
                                                                                {contacto.includes('@') ? <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                                                                <p className="text-sm text-slate-600 dark:text-slate-300">{contacto}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* ESTADO */}
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <button
                                                        onClick={() => handleToggleStatus(client.id, client.nombre, client.estado)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 ${client.estado
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                                                            : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50'
                                                        }`}
                                                    >
                                                        {client.estado ? (
                                                            <>
                                                                <ToggleRight className="w-6 h-6 text-emerald-500" />
                                                                <span className="text-xs font-bold text-emerald-600">Activo</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ToggleLeft className="w-6 h-6 text-slate-400" />
                                                                <span className="text-xs font-bold text-slate-400">Inactivo</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* ACCIONES */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => startEdit(client)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                        title="Editar cliente"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClient(client.id, client.nombre)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                        title="Eliminar cliente"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Load More */}
                {hasMoreClients && (
                    <div className="flex justify-center mt-6">
                        <button
                            onClick={loadMoreClients}
                            className="px-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shadow-sm"
                        >
                            Cargar más ({filteredClients.length - visibleClients.length} restantes)
                        </button>
                    </div>
                )}

                <AddClient
                    isOpen={isClientModalOpen}
                    onClose={handleCloseModal}
                    onSave={editingClientId ? handleUpdateClient : handleSaveClient}
                    isLoading={isLoading}
                    editData={editData}
                />
            </div>
        </div>
    );
}
