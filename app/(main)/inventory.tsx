import { Q } from "@nozbe/watermelondb";
import withObservables from "@nozbe/with-observables";
import * as Crypto from "expo-crypto";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  DollarSign,
  Download,
  Package,
  Plus,
  Search
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { usePagination } from "../../src/hooks/usePagination";
import AddEntry from "../../components/ui/modals/AddEntry";
import AddInventory from "../../components/ui/modals/AddInventory";
import EditLote from "../../components/ui/modals/EditLote";
import WarningModal from "../../components/ui/modals/WarningModal";
import ProductLotsView from "../../components/ui/ProductLotsView";
import ProductRow, { calculateAlertLevel, AlertLevel } from "../../components/ui/ProductRow";
import SyncErrorBanner, {
  SyncError,
} from "../../components/ui/SyncErrorBanner";
import { useSyncErrors } from "../../src/hooks/useSyncErrors";
import { useLocalSearchParams, router } from "expo-router";
import { database } from "../../src/services/DB/indexBD";
import FamiliaModel from "../../src/services/DB/models/bases/familia";
import LoteModel from "../../src/services/DB/models/catalogo/lote";
import ProductoModel from "../../src/services/DB/models/catalogo/producto";
import { syncApp } from "../../src/sync";

interface InventoryProps {
  productos: ProductoModel[];
  familias: FamiliaModel[];
  allLotes: LoteModel[];
}

function InventoryContent({ productos, familias, allLotes }: InventoryProps) {
  const params = useLocalSearchParams();
  const [searchTerm, setSearchTerm] = useState((params.search as string) || "");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [filterFamilia, setFilterFamilia] = useState("");
  const [editProduct, setEditProduct] = useState<ProductoModel | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductoModel | null>(
    null,
  );
  const [selectedAlertFilters, setSelectedAlertFilters] = useState<AlertLevel[]>([]);
  const [matchingProductIdsByLote, setMatchingProductIdsByLote] = useState<
    Set<string>
  >(new Set());
  const [isFamiliaDropdownOpen, setIsFamiliaDropdownOpen] = useState(false);
  const [familiaSearchTerm, setFamiliaSearchTerm] = useState("");

  const handleDelete = (producto: ProductoModel) => {
    setDeleteProduct(producto);
  };

  const confirmDelete = async () => {
    if (!deleteProduct) return;
    const newEstado = !deleteProduct.estado; // toggle
    await database.write(async () => {
      await deleteProduct.update((p) => {
        p.estado = newEstado;
      });
      // Cascade: also toggle all lotes of this product
      const lotesDelProducto = await database.collections
        .get("lotes")
        .query(Q.where("producto_id", deleteProduct.id))
        .fetch();
      for (const lote of lotesDelProducto) {
        await lote.update((l: any) => {
          l.estado = newEstado;
        });
      }
    });
    setDeleteProduct(null);
    syncApp().catch(console.error);
  };

  const productAlertLevels = useMemo(() => {
    const map: Record<string, AlertLevel> = {};
    
    // Agrupar lotes por producto para encontrar el nivel de alerta más crítico
    allLotes.forEach(lote => {
      const prodId = (lote as any)._raw.producto_id;
      const prod = productos.find(p => p.id === prodId);
      if (!prod || !lote.estado) return;

      const { level } = calculateAlertLevel(
        lote.fechaCaducidad, 
        prod.umbralVerdeDias ?? 90, 
        prod.umbralAmarilloDias ?? 30
      );

      const current = map[prodId];
      // Orden de prioridad: black > red > yellow > green
      if (level === 'black') map[prodId] = 'black';
      else if (level === 'red' && current !== 'black') map[prodId] = 'red';
      else if (level === 'yellow' && !['black', 'red'].includes(current || '')) map[prodId] = 'yellow';
      else if (level === 'green' && !current) map[prodId] = 'green';
    });

    return map;
  }, [allLotes, productos]);

  const filteredProductos = productos
    .filter((p) => {
      const matchesSearch =
        p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigoInterno.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matchingProductIdsByLote.has(p.id);
      
      const matchesFamilia =
        !filterFamilia || (p as any)._raw.familia_id === filterFamilia;

      // Filtro de Alertas
      const alertLevel = productAlertLevels[p.id] || "none";
      const matchesAlert = selectedAlertFilters.length === 0 || selectedAlertFilters.includes(alertLevel);

      return matchesSearch && matchesFamilia && matchesAlert;
    })
    .sort((a, b) => {
      if (a.estado === b.estado) return 0;
      return a.estado ? -1 : 1;
    });

  const { visible: visibleProductos, hasMore: hasMoreProductos, loadMore: loadMoreProductos, reset: resetInvPage } = usePagination(filteredProductos, 10);
  useEffect(() => { resetInvPage(); }, [searchTerm, filterFamilia, selectedAlertFilters]);

  const tablesToWatch = useMemo(
    () => [
      "productos",
      "lotes",
      "producto_impuestos",
      "codigos_alternos",
      "proveedor_productos",
      "movimientos_inventario",
    ],
    [],
  );
  const { syncErrors, handleDismissError } = useSyncErrors(tablesToWatch);
  const [recoverData, setRecoverData] = useState<{
    tabla: string;
    data: any;
    errorId?: string;
  } | null>(null);

  useEffect(() => {
    if (params.search) {
      setSearchTerm(params.search as string);
    }
  }, [params.search]);

  useEffect(() => {
    if (params.openModal === 'action_add_product') {
      setEditProduct(null);
      setIsAddModalOpen(true);
      // Intentar limpiar el parámetro (expo-router)
      router.setParams({ openModal: '' }); 
    }
  }, [params.openModal]);

  useEffect(() => {
    const autoRecoverId = params.recoverErrorId as string;
    if (autoRecoverId && syncErrors.length > 0) {
      const err = syncErrors.find((e) => e.id === autoRecoverId);
      if (err) triggerRecoveryWrapper(err);
    }
  }, [syncErrors]);

  // Listener para hotkey de acción
  useEffect(() => {
    const handleActionHotkey = (e: any) => {
        if (e.detail?.actionId === 'action_add_product') {
            setEditProduct(null);
            setIsAddModalOpen(true);
        }
    };
    window.addEventListener('action_hotkey', handleActionHotkey);
    return () => window.removeEventListener('action_hotkey', handleActionHotkey);
  }, []);

  const triggerRecoveryWrapper = (err: SyncError) => {
    setRecoverData({
      tabla: err.tabla_origen || "",
      data: err.datosAtrapados,
      errorId: err.id,
    });
    if (err.tabla_origen === "productos") {
      setIsAddModalOpen(true);
    } else if (
      err.tabla_origen === "lotes" ||
      err.tabla_origen === "movimientos_inventario"
    ) {
      setIsAddEntryOpen(true);
    }
  };

  const [selectedProduct, setSelectedProduct] = useState<ProductoModel | null>(
    null,
  );

  // Search by Lote logic
  useEffect(() => {
    if (!searchTerm.trim()) {
      setMatchingProductIdsByLote(new Set());
      return;
    }

    const findLotes = async () => {
      try {
        const lotes = await database.collections
          .get("lotes")
          .query(
            Q.where(
              "identificador_lote",
              Q.like(`%${Q.sanitizeLikeString(searchTerm.trim())}%`),
            ),
            Q.where("estado", true),
          )
          .fetch();
        setMatchingProductIdsByLote(
          new Set(lotes.map((l) => (l as any)._raw.producto_id)),
        );
      } catch (error) {
        console.error("Error searching lotes:", error);
      }
    };

    const timer = setTimeout(findLotes, 300); // Debounce
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const selectedFamilia = useMemo(
    () => familias.find((f) => f.id === filterFamilia),
    [familias, filterFamilia],
  );

  const filteredFamiliasOptions = useMemo(() => {
    return familias
      .filter((f) => f.estado)
      .filter(
        (f) =>
          f.nombre.toLowerCase().includes(familiaSearchTerm.toLowerCase()) ||
          f.codigoFamilia
            .toLowerCase()
            .includes(familiaSearchTerm.toLowerCase()),
      );
  }, [familias, familiaSearchTerm]);
  const [editLoteData, setEditLoteData] = useState<LoteModel | null>(null);
  const [deleteLote, setDeleteLote] = useState<LoteModel | null>(null);

  // Auto-desactivar lotes vencidos localmente
  useEffect(() => {
    const checkExpiredLocalLotes = async () => {
      try {
        const now = Date.now();
        const expiredLotes = await database.collections
          .get("lotes")
          .query(Q.where("estado", true))
          .fetch();

        const toDeactivate = expiredLotes.filter(
          (l: any) => l.fechaCaducidad && l.fechaCaducidad < now,
        );
        if (toDeactivate.length > 0) {
          await database.write(async () => {
            for (const lote of toDeactivate) {
              await lote.update((l: any) => {
                l.estado = false;
              });
            }
          });
          syncApp().catch(console.error);
        }
      } catch (error) {
        console.error("Error checked expired lotes locally:", error);
      }
    };
    checkExpiredLocalLotes();
  }, []);

  const confirmToggleLote = async () => {
    if (!deleteLote) return;
    await database.write(async () => {
      const nuevoEstado = !deleteLote.estado;
      await deleteLote.update((l: any) => {
        l.estado = nuevoEstado;
      });

      // Registrar en auditoría de movimientos que el lote fue activado/desactivado
      // cantidad = 0 porque AJUSTE_EDICION es solo auditoria, no afecta stock
      const almacenes = await database.collections
        .get("almacenes")
        .query()
        .fetch();
      const almacenId = almacenes.length > 0 ? almacenes[0].id : "default";

      await database.collections
        .get("movimientos_inventario")
        .create((m: any) => {
          m._raw.id = Crypto.randomUUID();
          m.almacen.id = almacenId;
          m.producto.id = deleteLote.producto.id;
          m.lote.id = deleteLote.id;
          m.tipo = "AJUSTE_EDICION";
          m.cantidad = 0; // Audit-only: no stock impact
          m.usuarioId = "Local-App";
        });
    });
    setDeleteLote(null);
    syncApp().catch(console.error);
  };

  const handleEditProduct = (p: ProductoModel) => {
    setEditProduct(p);
    setIsAddModalOpen(true);
  };

  return (
    <div className="p-8 bg-slate-50 dark:bg-slate-900 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Inventario de Productos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Gestiona y consulta tu catálogo de distribución
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 transition-colors font-medium text-sm shadow-sm">
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
            <button
              onClick={() => setIsAddEntryOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 transition-colors font-medium text-sm shadow-sm"
            >
              <Package className="w-4 h-4" />
              <span>Registrar Entrada</span>
            </button>
            <button
              onClick={() => {
                setEditProduct(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          </div>
        </div>

        <SyncErrorBanner
          errors={syncErrors}
          onRecover={triggerRecoveryWrapper}
          onDismiss={handleDismissError}
          contextName="Inventario/Producto"
          isHighPriority={true}
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Total Productos
              </p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {productos.length}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Familias Activas
              </p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {familias.filter((f) => f.estado).length}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Stock Bajo
              </p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-500">
                — Prods
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-rose-50 dark:bg-rose-900/30">
              <Clock className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Próximos a Caducar
              </p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-500">
                — Prods
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        {!selectedProduct && (
          <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="Buscar por código, nombre o lote..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <div className="relative min-w-[200px]">
                <button
                  type="button"
                  onClick={() =>
                    setIsFamiliaDropdownOpen(!isFamiliaDropdownOpen)
                  }
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="truncate">
                    {selectedFamilia
                      ? `${selectedFamilia.codigoFamilia}-${selectedFamilia.nombre}`
                      : "Todas las Familias"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isFamiliaDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isFamiliaDropdownOpen && (
                  <>
                    {/* Backdrop for closing */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsFamiliaDropdownOpen(false)}
                    />

                    <div className="absolute top-full right-0 mt-2 w-full min-w-[240px] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="p-2 border-b border-slate-50 dark:border-slate-700">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Buscar familia..."
                            value={familiaSearchTerm}
                            onChange={(e) =>
                              setFamiliaSearchTerm(e.target.value)
                            }
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                        <button
                          onClick={() => {
                            setFilterFamilia("");
                            setIsFamiliaDropdownOpen(false);
                            setFamiliaSearchTerm("");
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${!filterFamilia ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}
                        >
                          Todas las Familias
                        </button>
                        <div className="h-px bg-slate-50 dark:bg-slate-700 my-1" />
                        {filteredFamiliasOptions.length === 0 ? (
                          <div className="px-3 py-4 text-center text-[10px] text-slate-400">
                            No se encontraron familias
                          </div>
                        ) : (
                          filteredFamiliasOptions.map((fam) => (
                            <button
                              key={fam.id}
                              onClick={() => {
                                setFilterFamilia(fam.id);
                                setIsFamiliaDropdownOpen(false);
                                setFamiliaSearchTerm("");
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors mb-0.5 ${filterFamilia === fam.id ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}
                            >
                              <div className="flex flex-col">
                                <span className="text-[10px] opacity-60 uppercase tracking-tighter font-bold">
                                  {fam.codigoFamilia}
                                </span>
                                <span className="truncate">{fam.nombre}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Alert Legend / Filters */}
        {!selectedProduct && (
          <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Filtrar por estado:
            </span>
            
            <button 
              onClick={() => setSelectedAlertFilters(prev => 
                prev.includes('green') ? prev.filter(f => f !== 'green') : [...prev, 'green']
              )}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all ${selectedAlertFilters.includes('green') ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}
            >
              <div className={`w-2 h-2 rounded-full ${selectedAlertFilters.includes('green') ? 'bg-white' : 'bg-emerald-500'}`}></div>
              <span className="text-[10px] font-bold">SEGURO</span>
            </button>

            <button 
              onClick={() => setSelectedAlertFilters(prev => 
                prev.includes('yellow') ? prev.filter(f => f !== 'yellow') : [...prev, 'yellow']
              )}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all ${selectedAlertFilters.includes('yellow') ? 'bg-amber-400 border-amber-500 text-amber-900 shadow-sm ring-2 ring-amber-500/20' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}
            >
              <div className={`w-2 h-2 rounded-full ${selectedAlertFilters.includes('yellow') ? 'bg-amber-900' : 'bg-amber-500'}`}></div>
              <span className="text-[10px] font-bold">PRECAUCIÓN</span>
            </button>

            <button 
              onClick={() => setSelectedAlertFilters(prev => 
                prev.includes('red') ? prev.filter(f => f !== 'red') : [...prev, 'red']
              )}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all ${selectedAlertFilters.includes('red') ? 'bg-rose-500 border-rose-600 text-white shadow-sm ring-2 ring-rose-500/20' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'}`}
            >
              <div className={`w-2 h-2 rounded-full ${selectedAlertFilters.includes('red') ? 'bg-white' : 'bg-rose-500'}`}></div>
              <span className="text-[10px] font-bold">RIESGO</span>
            </button>

            <button 
              onClick={() => setSelectedAlertFilters(prev => 
                prev.includes('black') ? prev.filter(f => f !== 'black') : [...prev, 'black']
              )}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all ${selectedAlertFilters.includes('black') ? 'bg-slate-900 border-black text-white shadow-sm ring-2 ring-slate-900/20' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
            >
              <div className={`w-2 h-2 rounded-full ${selectedAlertFilters.includes('black') ? 'bg-white' : 'bg-slate-900'}`}></div>
              <span className="text-[10px] font-bold">VENCIDO</span>
            </button>

            {selectedAlertFilters.length > 0 && (
              <button 
                onClick={() => setSelectedAlertFilters([])}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline underline-offset-4 ml-1"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* View Switch */}
        {selectedProduct ? (
          <ProductLotsView
            producto={selectedProduct}
            onBack={() => setSelectedProduct(null)}
            onEditLote={(lote: LoteModel) => setEditLoteData(lote)}
            onToggleEstado={(lote: LoteModel) => setDeleteLote(lote)}
            onEditProduct={() => handleEditProduct(selectedProduct)}
          />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Clasificación</th>
                    <th className="px-6 py-4">Fiscal y Finanzas</th>

                    <th className="px-6 py-4">Existencia y Cad</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredProductos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center pointer-events-none"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <Package className="w-10 h-10 text-slate-300" />
                          <p className="text-slate-500 font-medium">
                            No se encontraron productos
                          </p>
                          <p className="text-slate-400 text-xs">
                            Crea uno nuevo para empezar a gestionar tu
                            inventario
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleProductos.map((item) => (
                      <ProductRow
                        key={item.id}
                        producto={item}
                        onClick={() => setSelectedProduct(item)}
                        onDelete={(p: ProductoModel) => handleDelete(p)}
                        onEdit={(p: ProductoModel) => handleEditProduct(p)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Load More */}
        {!selectedProduct && hasMoreProductos && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMoreProductos}
              className="px-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shadow-sm"
            >
              Cargar más ({filteredProductos.length - visibleProductos.length} restantes)
            </button>
          </div>
        )}

        <AddInventory
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditProduct(null);
          }}
          recoverData={recoverData}
          editProduct={editProduct}
          onSaveSuccess={() => {
            if (recoverData?.errorId) {
              handleDismissError(recoverData.errorId);
              setRecoverData(null);
            }
          }}
        />
        <AddEntry
          isOpen={isAddEntryOpen}
          onClose={() => setIsAddEntryOpen(false)}
          recoverData={recoverData}
          onSaveSuccess={() => {
            if (recoverData?.errorId) {
              handleDismissError(recoverData.errorId);
              setRecoverData(null);
            }
          }}
        />
        <WarningModal
          isOpen={!!deleteProduct}
          onClose={() => setDeleteProduct(null)}
          onConfirm={confirmDelete}
          title={
            deleteProduct?.estado === false
              ? "Reactivar Producto"
              : "Desactivar Producto"
          }
          message={
            deleteProduct?.estado === false
              ? "¿Estás seguro de que deseas REACTIVAR este producto? Volverá a estar disponible en el sistema."
              : "¿Estás seguro de que deseas desactivar este producto? Podrás reactivarlo más adelante si lo necesitas."
          }
        />
        <WarningModal
          isOpen={!!deleteLote}
          onClose={() => setDeleteLote(null)}
          onConfirm={confirmToggleLote}
          title={
            deleteLote?.estado === false ? "Reactivar Lote" : "Desactivar Lote"
          }
          message={
            deleteLote?.estado === false
              ? "¿Estás seguro de que deseas REACTIVAR este lote de inventario? Volverá a ser considerado en el stock."
              : "¿Estás seguro de que deseas desactivar este lote? Su cantidad ya no contará en el stock, pero podrás reactivarlo si es necesario."
          }
        />
        <EditLote
          isOpen={!!editLoteData}
          onClose={() => setEditLoteData(null)}
          lote={editLoteData}
        />
      </div>
    </div>
  );
}

export default withObservables([], () => ({
  productos: database.collections
    .get<ProductoModel>("productos")
    .query()
    .observe(),
  familias: database.collections
    .get<FamiliaModel>("familias")
    .query()
    .observe(),
  allLotes: database.collections
    .get<LoteModel>("lotes")
    .query(Q.where("estado", true))
    .observe(),
}))(InventoryContent);
