import { AlertTriangle, ArrowRightLeft, Calculator, Loader2, Search, X, Plus, Trash2, Users, Tag, Box, Globe } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { usePagination } from "../../../src/hooks/usePagination";
import { database } from "../../../src/services/DB/indexBD";
import ErrorModal from "./ErrorModal";

export interface TemplateRule {
    id: string;
    tipo: 'producto' | 'familia' | 'global';
    targetId: string;
    targetName: string;
    descuentoPorcentaje: string;
    precioFijo: string;
}

export interface TemplateFormData {
    id?: string; // optional id for editing existing list
    nombreLista: string;
    reglas: TemplateRule[];
    clientesIds: string[];
}

interface AddPricesProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (data: TemplateFormData) => Promise<void>;
    isLoading?: boolean;
    editData?: TemplateFormData | null;
}

interface SelectOption {
    id: string;
    label: string;
}

const inputClass = "w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";

export default function AddPrices({
    isOpen,
    onClose,
    onSave,
    isLoading = false,
    editData,
}: AddPricesProps) {
    const [nombreLista, setNombreLista] = useState("");
    const [reglas, setReglas] = useState<TemplateRule[]>([]);
    const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
    // Map clientId -> listName (for clients already assigned to another list)
    const [clientListMap, setClientListMap] = useState<Map<string, string>>(new Map());
    // Conflict modal state
    const [conflictModal, setConflictModal] = useState<{
        isOpen: boolean;
        clientId: string;
        clientName: string;
        currentList: string;
    }>({ isOpen: false, clientId: '', clientName: '', currentList: '' });

    const [clientes, setClientes] = useState<SelectOption[]>([]);
    const [productos, setProductos] = useState<SelectOption[]>([]);
    const [familias, setFamilias] = useState<SelectOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    const [clientSearch, setClientSearch] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [familySearch, setFamilySearch] = useState("");

    const [activeTarget, setActiveTarget] = useState<{ tipo: 'producto' | 'familia' | 'global', id: string, name: string } | null>(null);
    const [activeDesc, setActiveDesc] = useState("0");
    const [activeFijo, setActiveFijo] = useState("0");

    const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: "",
        message: "",
    });

    useEffect(() => {
        if (isOpen) {
            loadOptions();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && editData) {
            setNombreLista(editData.nombreLista);
            setReglas(editData.reglas);
            setSelectedClientes(editData.clientesIds);
            // Preserve id for edit operations
            // No need to store id in state; it will be passed through editData when saving
        } else if (isOpen && !editData) {
            setNombreLista("");
            setReglas([]);
            setSelectedClientes([]);
            setActiveTarget(null);
            setActiveDesc("0");
            setActiveFijo("0");
            setClientSearch("");
            setProductSearch("");
            setFamilySearch("");
        }
    }, [isOpen, editData]);

    const loadOptions = async () => {
        setLoadingOptions(true);
        try {
            const clientesDb = database.collections.get("clientes");
            const allClientes = await clientesDb.query().fetch();
            setClientes(
                allClientes.map((c: any) => ({
                    id: c.id,
                    label: c.nombre || "Sin nombre",
                }))
            );
            // Build map: clientId -> listName (only for clients that have a list)
            const map = new Map<string, string>();
            allClientes.forEach((c: any) => {
                if (c.lista_precio_base?.trim()) {
                    map.set(c.id, c.lista_precio_base.trim());
                }
            });
            setClientListMap(map);

            const productosDb = database.collections.get("productos");
            const allProductos = await productosDb.query().fetch();
            setProductos(
                allProductos.map((p: any) => ({
                    id: p.id,
                    label: `${p.codigoInterno || "S/C"} — ${p.descripcion || "Sin descripción"}`,
                }))
            );

            const familiasDb = database.collections.get("familias");
            const allFamilias = await familiasDb.query().fetch();
            setFamilias(
                allFamilias.map((f: any) => ({
                    id: f.id,
                    label: `${f.codigoFamilia || "S/C"} — ${f.nombre || "Sin nombre"}`,
                }))
            );
        } catch (error) {
            console.error("Error al cargar opciones:", error);
        } finally {
            setLoadingOptions(false);
        }
    };

    const handleAddRule = () => {
        if (!activeTarget) return;
        const descNum = parseFloat(activeDesc) || 0;
        const fijoNum = parseFloat(activeFijo) || 0;

        if (descNum === 0 && fijoNum === 0) {
            setErrorModal({
                isOpen: true,
                title: "Valores requeridos",
                message: "Debes poner al menos un descuento o un precio fijo para agregar la regla."
            });
            return;
        }

        setReglas(prev => {
            const existingIndex = prev.findIndex(r => r.targetId === activeTarget.id && r.tipo === activeTarget.tipo);
            const newRule: TemplateRule = {
                id: crypto.randomUUID(),
                tipo: activeTarget.tipo,
                targetId: activeTarget.id,
                targetName: activeTarget.name,
                descuentoPorcentaje: String(descNum),
                precioFijo: String(fijoNum)
            };

            if (existingIndex >= 0) {
                const arr = [...prev];
                arr[existingIndex] = newRule;
                return arr;
            } else {
                return [...prev, newRule];
            }
        });

        setActiveTarget(null);
        setActiveDesc("0");
        setActiveFijo("0");
        setProductSearch("");
        setFamilySearch("");
    };

    const handleRemoveRule = (id: string) => {
        setReglas(prev => prev.filter(r => r.id !== id));
    };

    const toggleCliente = (id: string) => {
        // If already selected, just deselect
        if (selectedClientes.includes(id)) {
            setSelectedClientes(prev => prev.filter(x => x !== id));
            return;
        }
        // Check if client belongs to a DIFFERENT list
        const existingList = clientListMap.get(id);
        const currentListName = nombreLista.trim();
        if (existingList && existingList !== currentListName) {
            const clientName = clientes.find(c => c.id === id)?.label ?? id;
            setConflictModal({ isOpen: true, clientId: id, clientName, currentList: existingList });
            return;
        }
        setSelectedClientes(prev => [...prev, id]);
    };

    const selectAllClientes = () => {
        if (selectedClientes.length === filteredClientes.length) {
            setSelectedClientes([]);
            return;
        }
        const currentListName = nombreLista.trim();
        // Separate: no conflict vs conflict
        const noConflict: string[] = [];
        const withConflict: string[] = [];
        filteredClientes.forEach(c => {
            if (selectedClientes.includes(c.id)) { noConflict.push(c.id); return; }
            const existingList = clientListMap.get(c.id);
            if (existingList && existingList !== currentListName) {
                withConflict.push(c.id);
            } else {
                noConflict.push(c.id);
            }
        });
        // Add non-conflicting right away
        setSelectedClientes(noConflict);
        // If there are conflicting ones, warn the user
        if (withConflict.length > 0) {
            const names = withConflict
                .map(id => clientes.find(c => c.id === id)?.label ?? id)
                .join(', ');
            setErrorModal({
                isOpen: true,
                title: `${withConflict.length} cliente(s) con lista asignada`,
                message: `Los siguientes clientes ya pertenecen a otra lista y no se agregaron automáticamente: ${names}. Selecciónalos individualmente para moverlos.`,
            });
        }
    };

    const handleSave = async () => {
        if (!nombreLista.trim()) {
            setErrorModal({
                isOpen: true,
                title: "Campo requerido",
                message: "El nombre de la lista es obligatorio."
            });
            return;
        }

        // Validar si el nombre ya existe (excepto cuando editamos la misma lista)
        try {
            const plantillasDb = database.collections.get("plantillas_precios");
            const existing = await plantillasDb.query().fetch();
            const isDuplicate = existing.some((p: any) => 
                p.nombre.toLowerCase() === nombreLista.trim().toLowerCase() &&
                (!editData?.id || p.id !== editData.id)
            );
            if (isDuplicate) {
                setErrorModal({
                    isOpen: true,
                    title: "Nombre duplicado",
                    message: `Ya existe una lista con el nombre "${nombreLista.trim()}". Elige otro nombre.`
                });
                return;
            }
        } catch (error) {
            console.error("Error validando nombre:", error);
        }

        if (onSave) {
            await onSave({
                id: editData?.id,
                nombreLista,
                reglas,
                clientesIds: selectedClientes
            });
        }
        onClose();
    };

    const filteredClientes = clientes.filter(c => c.label.toLowerCase().includes(clientSearch.toLowerCase()));
    const filteredProductos = productos.filter(p => p.label.toLowerCase().includes(productSearch.toLowerCase()));
    const filteredFamilias = familias.filter(f => f.label.toLowerCase().includes(familySearch.toLowerCase()));

    const { visible: visibleClientes, hasMore: hasMoreClientes, loadMore: loadMoreClientes } = usePagination(filteredClientes, 6);

    // Infinite Scroll Observer
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMoreClientes) {
                    loadMoreClientes();
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
    }, [hasMoreClientes, loadMoreClientes]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 overflow-y-auto w-full h-full">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900 text-left shadow-2xl flex flex-col max-h-[95vh] relative z-10 border border-slate-200 dark:border-slate-800">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                    {editData ? "Editar Lista de Precios" : "Nueva Lista de Precios"}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Configura reglas globales para grupos de clientes.</p>
                            </div>
                            <button onClick={onClose} disabled={isLoading} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg transition-colors disabled:opacity-50">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                            {loadingOptions ? (
                                <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                                    <Loader2 className="w-5 h-5 animate-spin" /> Cargando datos...
                                </div>
                            ) : (
                                <>
                                    {/* Nombre de la lista */}
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nombre de la Lista *</label>
                                        <input
                                            type="text"
                                            value={nombreLista}
                                            onChange={e => setNombreLista(e.target.value)}
                                            placeholder="Ej. Mayoreo, Distribuidores Especiales..."
                                            className="w-full border-b-2 border-slate-200 dark:border-slate-700 bg-transparent px-2 py-3 text-lg font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>

                                    {/* Descuento Global */}
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg">
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white">Descuento Global</h4>
                                                <p className="text-xs text-slate-500">Se aplicará a toda la lista de precios y se acumula con otros descuentos</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setActiveTarget({ tipo: 'global', id: 'global', name: 'Descuento Global' })}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTarget?.tipo === 'global' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                                        >
                                            Configurar
                                        </button>
                                    </div>

                                    {/* Sección de Selección Dividida */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Izquierda: Familias */}
                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col h-[300px]">
                                            <div className="flex items-center gap-2 mb-4 shrink-0">
                                                <Box className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                <h4 className="font-bold text-slate-800 dark:text-white">Familias</h4>
                                            </div>
                                            <div className="relative mb-3 shrink-0">
                                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar familia..."
                                                    value={familySearch}
                                                    onChange={e => setFamilySearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-700/50 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 p-1">
                                                {filteredFamilias.map(f => (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => setActiveTarget({ tipo: 'familia', id: f.id, name: f.label })}
                                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors mb-1 ${activeTarget?.id === f.id ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                    >
                                                        {f.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Derecha: Productos */}
                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col h-[300px]">
                                            <div className="flex items-center gap-2 mb-4 shrink-0">
                                                <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                <h4 className="font-bold text-slate-800 dark:text-white">Productos</h4>
                                            </div>
                                            <div className="relative mb-3 shrink-0">
                                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar producto..."
                                                    value={productSearch}
                                                    onChange={e => setProductSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-700/50 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 p-1">
                                                {filteredProductos.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => setActiveTarget({ tipo: 'producto', id: p.id, name: p.label })}
                                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors mb-1 ${activeTarget?.id === p.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Configurador Activo */}
                                    <div className={`transition-all duration-300 ${activeTarget ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none grayscale'}`}>
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl p-5 shadow-inner">
                                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                                <div className="flex-1 w-full">
                                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Configurando</label>
                                                    <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center min-h-[42px]">
                                                        {activeTarget ? (
                                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                                                {activeTarget.tipo === 'global' ? '' : activeTarget.tipo === 'familia' ? 'Familia: ' : 'Producto: '}{activeTarget.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-slate-400 italic">Selecciona un elemento arriba...</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="w-full md:w-32">
                                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Descuento</label>
                                                    <div className="relative">
                                                        <input type="number" min="0" max="100" value={activeDesc} onChange={e => setActiveDesc(e.target.value)} className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                                        <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                                                    </div>
                                                </div>
                                                {activeTarget?.tipo === 'producto' && (
                                                    <div className="w-full md:w-40">
                                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Precio Fijo</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                                                            <input type="number" min="0" value={activeFijo} onChange={e => setActiveFijo(e.target.value)} className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                                        </div>
                                                    </div>
                                                )}
                                                <button onClick={handleAddRule} className="w-full md:w-auto px-6 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 h-[42px]">
                                                    <Plus className="w-4 h-4" /> Agregar
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lista de Reglas agregadas */}
                                    {reglas.length > 0 && (
                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                                            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                                                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Calculator className="w-4 h-4 text-blue-500" /> Reglas en esta Lista</h4>
                                                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 py-0.5 px-2 rounded-full text-xs font-bold">{reglas.length}</span>
                                            </div>
                                            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                {reglas.map(r => (
                                                    <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-1.5 rounded-lg ${r.tipo === 'global' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : r.tipo === 'familia' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                                {r.tipo === 'global' ? <Globe className="w-4 h-4" /> : r.tipo === 'familia' ? <Box className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{r.targetName}</p>
                                                                <p className="text-xs text-slate-500 uppercase">{r.tipo}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                {parseFloat(r.descuentoPorcentaje) > 0 && <span className="block text-sm font-bold text-emerald-600 dark:text-emerald-400">{r.descuentoPorcentaje}% DESC</span>}
                                                                {parseFloat(r.precioFijo) > 0 && <span className="block text-sm font-bold text-blue-600 dark:text-blue-400">${r.precioFijo} FIJO</span>}
                                                            </div>
                                                            <button onClick={() => handleRemoveRule(r.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Asignación a Clientes */}
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                <h4 className="font-bold text-slate-800 dark:text-white">Asignar a Clientes</h4>
                                            </div>
                                            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-full">
                                                {selectedClientes.length} seleccionados
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-4">Selecciona los clientes que usarán esta lista de precios por defecto.</p>
                                        
                                        <div className="relative mb-3">
                                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar cliente..."
                                                value={clientSearch}
                                                onChange={e => setClientSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                        
                                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                            <div className="bg-slate-50 dark:bg-slate-800/80 p-2 flex border-b border-slate-200 dark:border-slate-700">
                                                <label className="flex items-center gap-2 px-2 cursor-pointer select-none text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedClientes.length > 0 && selectedClientes.length === filteredClientes.length}
                                                        onChange={selectAllClientes}
                                                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                    />
                                                    Seleccionar Todos los Visibles
                                                </label>
                                            </div>
                                        <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800 p-1">
                                            {visibleClientes.map(c => {
                                                const isSelected = selectedClientes.includes(c.id);
                                                const otherList = clientListMap.get(c.id);
                                                const hasConflict = !!otherList && otherList !== nombreLista.trim() && !isSelected;
                                                return (
                                                <label key={c.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                                    isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                                    : hasConflict ? 'bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                }`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected}
                                                        onChange={() => toggleCliente(c.id)}
                                                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <span className={`text-sm block truncate ${
                                                            isSelected ? 'font-bold text-emerald-900 dark:text-emerald-300'
                                                            : hasConflict ? 'text-amber-800 dark:text-amber-300'
                                                            : 'text-slate-700 dark:text-slate-300'
                                                        }`}>{c.label}</span>
                                                        {hasConflict && (
                                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                                                <ArrowRightLeft className="w-3 h-3" /> En lista: {otherList}
                                                            </span>
                                                        )}
                                                    </div>
                                                </label>
                                                );
                                            })}
                                                {filteredClientes.length === 0 && <p className="p-4 text-center text-slate-400 text-sm">No hay clientes con ese nombre.</p>}
                                                {hasMoreClientes && (
                                                    <div ref={observerTarget} className="w-full py-4 flex justify-center items-center gap-2 text-slate-400">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span className="text-xs font-bold">Cargando más clientes...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex justify-end gap-3">
                            <button onClick={onClose} disabled={isLoading} className="px-6 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                                Cancelar
                            </button>
                            <button onClick={handleSave} disabled={isLoading || loadingOptions} className="px-8 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isLoading ? "Guardando..." : "Guardar Lista de Precios"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <ErrorModal 
                isOpen={errorModal.isOpen} 
                onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                title={errorModal.title}
                message={errorModal.message}
            />

            {/* Conflict Resolution Modal */}
            {conflictModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-base">Cliente con lista asignada</h4>
                                <p className="text-xs text-slate-500 mt-0.5">Este cliente ya pertenece a otra lista</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                            <span className="font-bold text-slate-800 dark:text-white">{conflictModal.clientName}</span> ya está asignado a la lista{' '}
                            <span className="font-bold text-amber-600 dark:text-amber-400">"{conflictModal.currentList}"</span>.
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            ¿Deseas moverlo a <span className="font-bold text-blue-600 dark:text-blue-400">"{nombreLista || 'esta lista'}"</span> y quitarlo de la anterior?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConflictModal(prev => ({ ...prev, isOpen: false }))}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
                            >
                                Mantener en "{conflictModal.currentList}"
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedClientes(prev => [...prev, conflictModal.clientId]);
                                    setConflictModal(prev => ({ ...prev, isOpen: false }));
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                <ArrowRightLeft className="w-4 h-4" /> Mover a esta lista
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
