import * as Crypto from "expo-crypto";
import { Q } from "@nozbe/watermelondb";
import {
    Calculator,
    Edit2,
    LayoutList,
    Loader2,
    Plus,
    Search,
    Trash2,
    Users,
    ToggleLeft,
    ToggleRight,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddPrices, {
    TemplateFormData,
    TemplateRule,
} from "../../components/ui/modals/AddPrices";
import ErrorModal from "../../components/ui/modals/ErrorModal";
import SuccessModal from "../../components/ui/modals/SuccessModal";
import WarningModal from "../../components/ui/modals/WarningModal";
import SyncErrorBanner, {
    SyncError,
} from "../../components/ui/SyncErrorBanner";
import { usePagination } from "../../src/hooks/usePagination";
import { useSyncErrors } from "../../src/hooks/useSyncErrors";
import { useIntegrity } from "../../src/context/IntegrityContext";
import { database } from "../../src/services/DB/indexBD";
import { syncApp } from "../../src/sync";

interface PriceListSummary {
  id: string;
  nombreLista: string;
  estado: boolean;
  clientesIds: string[];
  reglasCount: number;
  reglas: TemplateRule[];
}

export default function Prices() {
  const { scan: scanIntegrity } = useIntegrity();
  const [searchTerm, setSearchTerm] = useState("");
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);

  const [priceLists, setPriceLists] = useState<PriceListSummary[]>([]);

  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [warningModalConfig, setWarningModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Edit state
  const [editData, setEditData] = useState<TemplateFormData | null>(null);

  // Sync error recovery
  const [recoverData, setRecoverData] = useState<any>(null);
  const [recoveringErrorId, setRecoveringErrorId] = useState<string | null>(
    null,
  );

  const tablesToWatch = useMemo(
    () => [
      "precios_especiales_clientes",
      "precios_especiales_familias_clientes",
      "clientes",
    ],
    [],
  );
  const { syncErrors, handleDismissError } = useSyncErrors(tablesToWatch);

  useEffect(() => {
    const autoRecoverId = new URLSearchParams(window.location.search).get(
      "recoverErrorId",
    );
    if (autoRecoverId && syncErrors.length > 0) {
      const err = syncErrors.find((e) => e.id === autoRecoverId);
      if (err) triggerRecoveryWrapper(err);
    }
  }, [syncErrors]);

  const triggerRecoveryWrapper = (err: SyncError) => {
    setRecoverData(err.datosAtrapados);
    setRecoveringErrorId(err.id);
    setEditData(null);
    setIsPriceModalOpen(true);
  };

  useEffect(() => {
    if (message?.type === "success") {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // ==========================================
  // CARGAR LISTAS (DESDE PLANTILLAS)uwu
  // ==========================================
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadPriceListsRef = useRef<(() => void) | null>(null);

  const loadPriceLists = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoadingTable(true);
      try {
        const plantillasDb = database.collections.get("plantillas_precios");
        const reglasDb = database.collections.get("reglas_plantilla");
        const clientesDb = database.collections.get("clientes");
        const productosDb = database.collections.get("productos");
        const familiasDb = database.collections.get("familias");

        const [
          allPlantillas,
          allReglas,
          allClientes,
          allProductos,
          allFamilias,
        ] = await Promise.all([
          plantillasDb.query().fetch(),
          reglasDb.query().fetch(),
          clientesDb.query().fetch(),
          productosDb.query().fetch(),
          familiasDb.query().fetch(),
        ]);

        const productoMap = new Map();
        allProductos.forEach((p: any) =>
          productoMap.set(
            p.id,
            `${p.codigoInterno || "S/C"} — ${p.descripcion || "Sin descripción"}`,
          ),
        );
        const familiaMap = new Map();
        allFamilias.forEach((f: any) =>
          familiaMap.set(
            f.id,
            `${f.codigoFamilia || "S/C"} — ${f.nombre || "Sin nombre"}`,
          ),
        );

        const listToClients = new Map<string, string[]>();
        allClientes.forEach((c: any) => {
          const name = c.lista_precio_base?.trim();
          if (name) {
            if (!listToClients.has(name)) listToClients.set(name, []);
            listToClients.get(name)!.push(c.id);
          }
        });

        const summaries: PriceListSummary[] = allPlantillas.map((p: any) => {
          const plantReglas = allReglas.filter(
            (r: any) => r._raw.plantilla_id === p.id,
          );
          const mappedReglas: TemplateRule[] = plantReglas.map((r: any) => ({
            id: r.id,
            tipo: r.tipo as "producto" | "familia",
            targetId: r.targetId,
            targetName:
              r.tipo === "global"
                ? "Descuento Global"
                : r.tipo === "producto"
                ? productoMap.get(r.targetId)
                : familiaMap.get(r.targetId),
            descuentoPorcentaje: String(r.descuentoPorcentaje || 0),
            precioFijo: String(r.precioFijo || 0),
          }));

          return {
            id: p.id,
            nombreLista: p.nombre,
            estado: p.estado !== false,
            clientesIds: listToClients.get(p.nombre) || [],
            reglasCount: mappedReglas.length,
            reglas: mappedReglas,
          };
        });

        setPriceLists(
          summaries.sort((a, b) => a.nombreLista.localeCompare(b.nombreLista)),
        );
      } catch (error) {
        console.error("Error al cargar listas:", error);
      } finally {
        setIsLoadingTable(false);
      }
    }, 80);
  }, []);

  loadPriceListsRef.current = loadPriceLists;

  useEffect(() => {
    const fire = () => {
      loadPriceListsRef.current?.();
    };

    const plantillasCol = database.collections.get("plantillas_precios");
    const reglasCol = database.collections.get("reglas_plantilla");
    const clientesCol = database.collections.get("clientes");

    if (!plantillasCol || !reglasCol || !clientesCol) {
      console.warn(
        "Tablas de precios no encontradas en la DB local. ¿Migración pendiente?",
      );
      return;
    }

    const subs = [
      plantillasCol.query().observe().subscribe(fire),
      reglasCol.query().observe().subscribe(fire),
      clientesCol.query().observe().subscribe(fire),
    ];
    fire();
    return () => subs.forEach((s) => s.unsubscribe());
  }, []);

  // ==========================================
  // GUARDAR/ACTUALIZAR LISTA DE PRECIOS
  // ==========================================
  const handleSaveList = async (formData: TemplateFormData) => {
    setIsLoading(true);
    try {
      const plantillasDb = database.collections.get("plantillas_precios");
      const reglasDb = database.collections.get("reglas_plantilla");
      const clientesDb = database.collections.get("clientes");
      const pProdDb = database.collections.get("precios_especiales_clientes");
      const pFamDb = database.collections.get(
        "precios_especiales_familias_clientes",
      );

      await database.write(async () => {
        // 1. Guardar/Actualizar Plantilla
        let plantilla: any;
        const existing = await plantillasDb
          .query(Q.where("nombre", formData.nombreLista))
          .fetch();
        if (existing.length > 0) {
          plantilla = existing[0];
          await plantilla.update((r: any) => {
            r.updated_at = Date.now();
          });
        } else {
          plantilla = await plantillasDb.create((r: any) => {
            r._raw.id = Crypto.randomUUID();
            r.nombre = formData.nombreLista;
            r.created_at = Date.now();
            r.updated_at = Date.now();
          });
        }

        // 2. Actualizar Reglas de la Plantilla
        const oldPlantRules = await reglasDb
          .query(Q.where("plantilla_id", plantilla.id))
          .fetch();
        for (const r of oldPlantRules) await (r as any).markAsDeleted();

        for (const r of formData.reglas) {
          await reglasDb.create((rec: any) => {
            rec._raw.id = Crypto.randomUUID();
            rec.plantillaId = plantilla.id;
            rec.tipo = r.tipo;
            rec.targetId = r.targetId;
            rec.descuentoPorcentaje = Number(r.descuentoPorcentaje) || 0;
            rec.precioFijo = Number(r.precioFijo) || 0;
            rec.created_at = Date.now();
            rec.updated_at = Date.now();
          });
        }

        // 3. Propagar a Clientes
        const allClients = await clientesDb.query().fetch();

        // Limpiar clientes que tenían esta lista pero ya no
        const clientsToClear = allClients.filter(
          (c: any) =>
            c.lista_precio_base === formData.nombreLista &&
            !formData.clientesIds.includes(c.id),
        );
        for (const c of clientsToClear) {
          await (c as any).update((r: any) => {
            r.lista_precio_base = null;
            r.descuentoGlobal = 0;
          });
          const rP = await pProdDb.query(Q.where("cliente_id", c.id)).fetch();
          for (const r of rP) await (r as any).markAsDeleted();
          const rF = await pFamDb.query(Q.where("cliente_id", c.id)).fetch();
          for (const r of rF) await (r as any).markAsDeleted();
        }

        // Actualizar seleccionados y sus reglas especiales
        for (const cid of formData.clientesIds) {
          const c = (await clientesDb.find(cid)) as any;
          await c.update((r: any) => {
            r.lista_precio_base = formData.nombreLista;
            r.descuentoGlobal = 0;
          });

          const rP = await pProdDb.query(Q.where("cliente_id", cid)).fetch();
          for (const r of rP) await (r as any).markAsDeleted();
          const rF = await pFamDb.query(Q.where("cliente_id", cid)).fetch();
          for (const r of rF) await (r as any).markAsDeleted();

          for (const r of formData.reglas) {
            if (r.tipo === "global") {
              await c.update((rec: any) => {
                rec.descuentoGlobal = Number(r.descuentoPorcentaje) || 0;
              });
            } else if (r.tipo === "producto") {
              await pProdDb.create((rec: any) => {
                rec._raw.id = Crypto.randomUUID();
                rec.cliente.id = cid;
                rec.producto.id = r.targetId;
                rec.descuentoPorcentaje = Number(r.descuentoPorcentaje) || 0;
                rec.precioFijo = Number(r.precioFijo) || 0;
              });
            } else {
              await pFamDb.create((rec: any) => {
                rec._raw.id = Crypto.randomUUID();
                rec.cliente.id = cid;
                rec.familia.id = r.targetId;
                rec.descuentoPorcentaje = Number(r.descuentoPorcentaje) || 0;
              });
            }
          }
        }
      });

      setMessage({
        type: "success",
        text: "Lista de precios guardada correctamente.",
      });
      setIsPriceModalOpen(false);
      setEditData(null);
      if (recoveringErrorId) {
        handleDismissError(recoveringErrorId);
        setRecoveringErrorId(null);
        setRecoverData(null);
      }
      syncApp().catch(console.error);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: "Error al guardar lista: " + error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // TOGGLE ACTIVADA/DESACTIVADA LISTA
  // ==========================================
  const handleToggleStatus = async (id: string, name: string, currentStatus: boolean) => {
    if (name === "Mayoreo" || name === "Menudeo") {
      setMessage({
        type: "error",
        text: "Las listas base (Mayoreo, Menudeo) no se pueden desactivar.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const plantillasDb = database.collections.get("plantillas_precios");
      const record = await plantillasDb.find(id);
      
      await database.write(async () => {
        await record.update((r: any) => {
          r.estado = !currentStatus;
        });
      });

      setMessage({
        type: "success",
        text: `Lista de precios "${name}" ha sido ${!currentStatus ? 'activada' : 'desactivada'} correctamente.`,
      });

      // Synchronize changes
      try {
        await syncApp();
      } catch (syncErr) {
        console.error("Error al sincronizar tras cambiar estado de la lista:", syncErr);
      }

      // Reload local data
      await loadPriceLists();

      // Proactively scan for broken relationships
      if (scanIntegrity) {
        await scanIntegrity("deactivate");
      }
    } catch (error: any) {
      console.error("Error al cambiar estado de la lista:", error);
      setMessage({
        type: "error",
        text: `Error al cambiar estado de la lista: ${error.message || error}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // EDITAR LISTA EXISTENTE
  // ==========================================
  const startEdit = (item: PriceListSummary) => {
    setEditData({
      nombreLista: item.nombreLista,
      reglas: item.reglas,
      clientesIds: item.clientesIds,
    });
    setRecoverData(null);
    setIsPriceModalOpen(true);
  };

  // ==========================================
  // ELIMINAR LISTA
  // ==========================================
  const handleDeleteList = (item: PriceListSummary) => {
    if (item.nombreLista === "Mayoreo" || item.nombreLista === "Menudeo") {
      setMessage({
        type: "error",
        text: "Las listas base (Mayoreo, Menudeo) no pueden ser eliminadas, solo editadas.",
      });
      return;
    }

    setWarningModalConfig({
      isOpen: true,
      title: "Eliminar Lista de Precios",
      message: `¿Estás seguro que deseas eliminar la lista "${item.nombreLista}"? Se quitarán todas las reglas de los ${item.clientesIds.length} clientes asociados. Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setWarningModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          const clientesDb = database.collections.get("clientes");
          const preciosProdDb = database.collections.get(
            "precios_especiales_clientes",
          );
          const preciosFamDb = database.collections.get(
            "precios_especiales_familias_clientes",
          );

          await database.write(async () => {
            // Find and delete the template itself
            const pDb = database.collections.get("plantillas_precios");
            const existingTemplates = await pDb.query(Q.where("nombre", item.nombreLista)).fetch();
            for (const t of existingTemplates) {
              await t.markAsDeleted();
            }

            for (const cid of item.clientesIds) {
              const c = (await clientesDb.find(cid)) as any;
              await c.update((record: any) => {
                record.lista_precio_base = null;
              });

              const oldProdRules = await preciosProdDb
                .query(Q.where("cliente_id", cid))
                .fetch();
              for (const rule of oldProdRules as any[])
                await rule.markAsDeleted();

              const oldFamRules = await preciosFamDb
                .query(Q.where("cliente_id", cid))
                .fetch();
              for (const rule of oldFamRules as any[])
                await rule.markAsDeleted();
            }
          });

          setMessage({
            type: "success",
            text: "Lista eliminada correctamente.",
          });
          // Observer triggers reload automatically
          syncApp().catch(console.error);
          scanIntegrity('soft_delete').catch(console.error);
        } catch (error: any) {
          setMessage({
            type: "error",
            text: "Error al eliminar: " + error.message,
          });
        }
      },
    });
  };

  const handleCloseModal = () => {
    setIsPriceModalOpen(false);
    setEditData(null);
    setRecoverData(null);
    setRecoveringErrorId(null);
  };

  // ==========================================
  // FILTRO DE BÚSQUEDA
  // ==========================================
  const filteredLists = useMemo(() => {
    if (!searchTerm) return priceLists;
    const s = searchTerm.toLowerCase();
    return priceLists.filter((p) => p.nombreLista.toLowerCase().includes(s));
  }, [priceLists, searchTerm]);

  const {
    visible: visibleLists,
    hasMore: hasMoreLists,
    loadMore: loadMoreLists,
    reset: resetPricePage,
  } = usePagination(filteredLists, 6);

  // Infinite Scroll Observer
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreLists) {
          loadMoreLists();
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
  }, [hasMoreLists, loadMoreLists]);
  useEffect(() => {
    resetPricePage();
  }, [searchTerm]);

  return (
    <div className="p-4 sm:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        {/* MODALES */}
        <SuccessModal
          isOpen={message?.type === "success"}
          onClose={() => setMessage(null)}
          title="¡Éxito!"
          message={message?.type === "success" ? message.text : ""}
        />
        <ErrorModal
          isOpen={message?.type === "error"}
          onClose={() => setMessage(null)}
          title="Ocurrió un problema"
          message={message?.type === "error" ? message.text : ""}
        />
        <WarningModal
          isOpen={warningModalConfig.isOpen}
          onClose={() =>
            setWarningModalConfig((prev) => ({ ...prev, isOpen: false }))
          }
          onConfirm={warningModalConfig.onConfirm}
          title={warningModalConfig.title}
          message={warningModalConfig.message}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-mh-blue-dark dark:text-white tracking-tight">
              Listas de Precios Especiales
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Gestiona plantillas de descuentos y asígnalas en masa a tus
              clientes.
            </p>
          </div>
          <button
            onClick={() => {
              setEditData(null);
              setRecoverData(null);
              setIsPriceModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Lista</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-mh-blue dark:text-blue-400">
              <LayoutList className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Total de Listas
              </p>
              <p className="text-2xl font-bold text-mh-blue-dark dark:text-white">
                {priceLists.length}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Clientes Asignados
              </p>
              <p className="text-2xl font-bold text-mh-blue-dark dark:text-white">
                {priceLists.reduce((acc, l) => acc + l.clientesIds.length, 0)}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-mh-pink/10 dark:bg-rose-900/30 flex items-center justify-center text-mh-pink dark:text-rose-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Reglas Activas
              </p>
              <p className="text-2xl font-bold text-mh-blue-dark dark:text-white">
                {priceLists.reduce((acc, l) => acc + l.reglasCount, 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 items-center">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
              placeholder="Buscar por nombre de lista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <SyncErrorBanner
          errors={syncErrors}
          onRecover={triggerRecoveryWrapper}
          onDismiss={handleDismissError}
          contextName="Lista de Precios"
          isHighPriority={false}
        />

        {/* Grid of Price Lists */}
        {isLoadingTable ? (
          <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando listas...
          </div>
        ) : filteredLists.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            {searchTerm
              ? "No se encontraron listas que coincidan con la búsqueda."
              : "No hay listas de precios registradas. ¡Crea una nueva!"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleLists.map((list) => (
              <div
                key={list.nombreLista}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border flex flex-col transition-all hover:shadow-md ${
                  list.estado === false
                    ? "border-slate-200 dark:border-slate-700/50 opacity-70 border-dashed"
                    : "border-slate-100 dark:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col truncate pr-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">
                      {list.nombreLista}
                    </h3>
                    {list.estado === false && (
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                        Desactivada
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {list.nombreLista !== "Mayoreo" && list.nombreLista !== "Menudeo" && (
                      <button
                        onClick={() => handleToggleStatus(list.id, list.nombreLista, list.estado)}
                        className={`p-1 rounded-lg transition-colors ${
                          list.estado
                            ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                        title={list.estado ? "Desactivar Lista" : "Activar Lista"}
                      >
                        {list.estado ? (
                          <ToggleRight className="w-6 h-6" />
                        ) : (
                          <ToggleLeft className="w-6 h-6" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteList(list)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                      title="Eliminar Lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Clientes
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {list.clientesIds.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Calculator className="w-4 h-4" /> Reglas de Excepción
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {list.reglasCount}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => startEdit(list)}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold rounded-lg transition-colors text-sm"
                  >
                    Ver Configuración
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        {hasMoreLists && (
          <div ref={observerTarget} className="flex justify-center mt-6 py-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Cargando más listas...</span>
            </div>
          </div>
        )}

        <AddPrices
          isOpen={isPriceModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveList}
          isLoading={isLoading}
          editData={editData}
        />
      </div>
    </div>
  );
}
