import * as Crypto from "expo-crypto";
import { Q } from "@nozbe/watermelondb";
import withObservables from "@nozbe/with-observables";
import {
  Check,
  DollarSign,
  Edit2,
  Layers,
  Loader2,
  Plus,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Skull,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Warehouse,
  X,
  Users
} from "lucide-react";
import React, { useState } from "react";
import ErrorModal from "../../components/ui/modals/ErrorModal";
import SuccessModal from "../../components/ui/modals/SuccessModal";
import WarningModal from "../../components/ui/modals/WarningModal";
import { database } from "../../src/services/DB/indexBD";
import AlmacenModel from "../../src/services/DB/models/bases/almacen";
import CategoriaClienteModel from "../../src/services/DB/models/bases/categoriaCliente";
import FamiliaModel from "../../src/services/DB/models/bases/familia";
import ImpuestoModel from "../../src/services/DB/models/bases/impuesto";
import MargenModel from "../../src/services/DB/models/bases/margen";
import { syncApp } from "../../src/sync";
import SyncErrorBanner, { SyncError } from "../../components/ui/SyncErrorBanner";
import { useSyncErrors } from "../../src/hooks/useSyncErrors";
import { useMemo, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────────
type ActiveTab = "familias" | "almacenes" | "impuestos" | "margenes" | "categorias";

interface CatalogsProps {
  familias: FamiliaModel[];
  almacenes: AlmacenModel[];
  impuestos: ImpuestoModel[];
  margenes: MargenModel[];
  categorias: CategoriaClienteModel[];
}

// ─── Modal State type ────────────────────────────────────────
interface ModalState {
  success: { open: boolean; title: string; message: string };
  error: { open: boolean; title: string; message: string };
  warning: { open: boolean; title: string; message: string; onConfirm: () => void };
}

const initialModalState: ModalState = {
  success: { open: false, title: "", message: "" },
  error: { open: false, title: "", message: "" },
  warning: { open: false, title: "", message: "", onConfirm: () => { } },
};


// ─── Main Component ─────────────────────────────────────────
function CatalogsContent({ familias, almacenes, impuestos, margenes, categorias }: CatalogsProps) {
  const [tab, setTab] = useState<ActiveTab>("familias");
  const [modal, setModal] = useState<ModalState>(initialModalState);
  const [syncing, setSyncing] = useState(false);

  // Error Sync Logics
  const tablesToWatch = useMemo(() => ["familias", "almacenes", "impuestos", "margenes"], []);
  const { syncErrors, handleDismissError } = useSyncErrors(tablesToWatch);
  const [recoverData, setRecoverData] = useState<{ tabla: string, data: any, errorId?: string } | null>(null);

  // Automatic Recover from URL
  useEffect(() => {
    const autoRecoverId = new URLSearchParams(window.location.search).get("recoverErrorId");
    if (autoRecoverId && syncErrors.length > 0) {
      const err = syncErrors.find(e => e.id === autoRecoverId);
      if (err) handleRecoverWrapper(err);
    }
  }, [syncErrors]);

  const handleRecoverWrapper = (err: SyncError) => {
     const tabla = err.tabla_origen as ActiveTab;
     if (['familias', 'almacenes', 'impuestos', 'margenes', 'categorias'].includes(tabla)) {
        setTab(tabla);
        setRecoverData({ tabla, data: err.datosAtrapados, errorId: err.id });
        showSuccess("Datos Recuperados", "Revisa el formulario para editar y re-enviar.");
     }
  };

  const handleRecoverSaveSuccess = () => {
    if (recoverData?.errorId) {
      handleDismissError(recoverData.errorId);
      setRecoverData(null);
    }
  };

  const showSuccess = (title: string, message: string) =>
    setModal((m) => ({ ...m, success: { open: true, title, message } }));
  const showError = (title: string, message: string) =>
    setModal((m) => ({ ...m, error: { open: true, title, message } }));
  const showWarning = (title: string, message: string, onConfirm: () => void) =>
    setModal((m) => ({ ...m, warning: { open: true, title, message, onConfirm } }));

  const closeSuccess = () => setModal((m) => ({ ...m, success: { ...m.success, open: false } }));
  const closeError = () => setModal((m) => ({ ...m, error: { ...m.error, open: false } }));
  const closeWarning = () => setModal((m) => ({ ...m, warning: { ...m.warning, open: false } }));

  // Sync after operation with visual feedback
  const syncAfterOp = async () => {
    setSyncing(true);
    try {
      await syncApp();
    } catch (e: any) {
      console.warn("Sincronización pendiente:", e.message);
      // No mostramos error — se reintentará después. Los datos ya están en local.
    } finally {
      setSyncing(false);
    }
  };

  const tabs: {
    key: ActiveTab;
    label: string;
    icon: React.ReactNode;
    count: number;
    colorClass: string;
  }[] = [
      {
        key: "familias",
        label: "Familias",
        icon: <Layers className="w-6 h-6" />,
        count: familias.length,
        colorClass: "blue",
      },
      {
        key: "almacenes",
        label: "Almacenes",
        icon: <Warehouse className="w-6 h-6" />,
        count: almacenes.length,
        colorClass: "amber",
      },
      {
        key: "impuestos",
        label: "Impuestos",
        icon: <Receipt className="w-6 h-6" />,
        count: impuestos.length,
        colorClass: "emerald",
      },
      {
        key: "margenes",
        label: "Márgenes",
        icon: <DollarSign className="w-6 h-6" />,
        count: margenes.length,
        colorClass: "indigo",
      },
      {
        key: "categorias",
        label: "Cat. Clientes",
        icon: <Users className="w-6 h-6" />,
        count: categorias.length,
        colorClass: "purple",
      },
    ];

  return (
    <div className="p-4 sm:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* ── Modals ── */}
        <SuccessModal isOpen={modal.success.open} onClose={closeSuccess} title={modal.success.title} message={modal.success.message} />
        <ErrorModal isOpen={modal.error.open} onClose={closeError} title={modal.error.title} message={modal.error.message} />
        <WarningModal isOpen={modal.warning.open} onClose={closeWarning} onConfirm={() => { modal.warning.onConfirm(); closeWarning(); }} title={modal.warning.title} message={modal.warning.message} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-mh-blue-dark dark:text-white tracking-tight">Catálogos</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Administra las bases de datos de Familias, Almacenes, Impuestos, Márgenes y Categorías de Clientes
            </p>
          </div>
          {syncing && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 rounded-lg">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Sincronizando...</span>
            </div>
          )}
        </div>

        {/* Sync Errors */}
        <SyncErrorBanner 
           errors={syncErrors} 
           onRecover={handleRecoverWrapper} 
           onDismiss={handleDismissError} 
           contextName="Catálogo" 
           isHighPriority={false} 
        />

        {/* Tabs as Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {tabs.map((t) => {
            const isSelected = tab === t.key;
            // Definimos clases dinámicas basadas en el color
            const colorMap: Record<string, { border: string; gradient: string; iconBgSelected: string; iconTextSelected: string; shadowStr: string }> = {
              blue: { border: "border-blue-500", gradient: "from-blue-500/10 dark:from-blue-400/15", iconBgSelected: "bg-blue-50 dark:bg-blue-900/30", iconTextSelected: "text-blue-600 dark:text-blue-500", shadowStr: "shadow-blue-500/5" },
              amber: { border: "border-amber-500", gradient: "from-amber-500/10 dark:from-amber-400/15", iconBgSelected: "bg-amber-50 dark:bg-amber-900/30", iconTextSelected: "text-amber-500", shadowStr: "shadow-amber-500/5" },
              emerald: { border: "border-emerald-500", gradient: "from-emerald-500/10 dark:from-emerald-400/15", iconBgSelected: "bg-emerald-50 dark:bg-emerald-900/30", iconTextSelected: "text-emerald-600 dark:text-emerald-500", shadowStr: "shadow-emerald-500/5" },
              indigo: { border: "border-indigo-500", gradient: "from-indigo-500/10 dark:from-indigo-400/15", iconBgSelected: "bg-indigo-50 dark:bg-indigo-900/30", iconTextSelected: "text-indigo-600 dark:text-indigo-400", shadowStr: "shadow-indigo-500/5" },
              purple: { border: "border-purple-500", gradient: "from-purple-500/10 dark:from-purple-400/15", iconBgSelected: "bg-purple-50 dark:bg-purple-900/30", iconTextSelected: "text-purple-600 dark:text-purple-400", shadowStr: "shadow-purple-500/5" },
            };
            const cInfo = colorMap[t.colorClass];

            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-4 p-5 rounded-2xl shadow-sm transition-all duration-200 text-left outline-none border overflow-hidden ${isSelected
                    ? `${cInfo.border} bg-white dark:bg-slate-800 ${cInfo.shadowStr}`
                    : "border-transparent border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600"
                  }`}
              >
                {/* Decorative background gradient */}
                {isSelected && (
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${cInfo.gradient} to-transparent rounded-bl-full pointer-events-none transition-opacity duration-300`}></div>
                )}
                
                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? cInfo.iconBgSelected : "bg-slate-50 dark:bg-slate-700/50 group-hover:bg-slate-100 dark:group-hover:bg-slate-700"}`}>
                  <div className={`${isSelected ? cInfo.iconTextSelected : "text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400"}`}>
                    {t.icon}
                  </div>
                </div>
                <div className="relative z-10">
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {t.label}
                  </p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <p className={`text-xl font-bold transition-colors ${isSelected ? cInfo.iconTextSelected : "text-slate-800 dark:text-white"}`}>
                      {t.count}
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {t.count === 1 ? 'Registro' : 'Registros'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {tab === "familias" && <FamiliasTab familias={familias} showSuccess={showSuccess} showError={showError} showWarning={showWarning} syncAfterOp={syncAfterOp} recoverData={recoverData} onRecoverSaveSuccess={handleRecoverSaveSuccess} />}
        {tab === "almacenes" && <AlmacenesTab almacenes={almacenes} showSuccess={showSuccess} showError={showError} showWarning={showWarning} syncAfterOp={syncAfterOp} recoverData={recoverData} onRecoverSaveSuccess={handleRecoverSaveSuccess} />}
        {tab === "impuestos" && <ImpuestosTab impuestos={impuestos} showSuccess={showSuccess} showError={showError} showWarning={showWarning} syncAfterOp={syncAfterOp} recoverData={recoverData} onRecoverSaveSuccess={handleRecoverSaveSuccess} />}
        {tab === "margenes" && <MargenesTab margenes={margenes} showSuccess={showSuccess} showError={showError} showWarning={showWarning} syncAfterOp={syncAfterOp} recoverData={recoverData} onRecoverSaveSuccess={handleRecoverSaveSuccess} />}
        {tab === "categorias" && <CategoriasTab categorias={categorias} showSuccess={showSuccess} showError={showError} showWarning={showWarning} syncAfterOp={syncAfterOp} recoverData={recoverData} onRecoverSaveSuccess={handleRecoverSaveSuccess} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB PROPS
// ═══════════════════════════════════════════════════════════
interface TabCallbacks {
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showWarning: (title: string, message: string, onConfirm: () => void) => void;
  syncAfterOp: () => Promise<void>;
  recoverData?: { tabla: string, data: any, errorId?: string } | null;
  onRecoverSaveSuccess?: () => void;
}

// ═══════════════════════════════════════════════════════════
// FAMILIAS TAB (with alert threshold configuration)
// ═══════════════════════════════════════════════════════════
function FamiliasTab({ familias, showSuccess, showError, showWarning, syncAfterOp, recoverData, onRecoverSaveSuccess }: { familias: FamiliaModel[] } & TabCallbacks) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Add form state
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");

  // Edit state
  const [editNombre, setEditNombre] = useState("");
  const [editCodigo, setEditCodigo] = useState("");

  useEffect(() => {
    if (recoverData?.tabla === "familias") {
       const fd = recoverData.data;
       setShowAdd(true);
       setCodigo(fd.codigoFamilia || fd.codigo_familia || "");
       setNombre(fd.nombre || "");
       window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [recoverData]);

  const handleAdd = async () => {
    if (!codigo || !nombre) {
      showError("Campos requeridos", "El Código y el Nombre son obligatorios para crear una familia.");
      return;
    }
    // Validar código único
    const codigoDuplicado = familias.find(
      (f) => f.codigoFamilia.trim().toLowerCase() === codigo.trim().toLowerCase()
    );
    if (codigoDuplicado) {
      showError("Código duplicado", `Ya existe una familia con el código "${codigo}" (${codigoDuplicado.nombre}). Usa un código diferente.`);
      return;
    }
    try {
      await database.write(async () => {
        await database.get<FamiliaModel>("familias").create((f) => {
          f._raw.id = Crypto.randomUUID();
          f.codigoFamilia = codigo.trim();
          f.nombre = nombre.trim();
          f.estado = true;
        });
      });
      setCodigo("");
      setNombre("");
      setShowAdd(false);
      showSuccess("Familia creada", `La familia "${nombre}" se ha guardado correctamente.`);
      if (onRecoverSaveSuccess) onRecoverSaveSuccess();
      await syncAfterOp();
    } catch (e: any) {
      showError("Error al crear", e.message || "No se pudo crear la familia.");
    }
  };

  const startEdit = (f: FamiliaModel) => {
    setEditId(f.id);
    setEditNombre(f.nombre);
    setEditCodigo(f.codigoFamilia);
  };
  const handleSaveEdit = async (f: FamiliaModel) => {
    // Validar código único (excluyendo el registro actual)
    const codigoDuplicado = familias.find(
      (other) => other.id !== f.id && other.codigoFamilia.trim().toLowerCase() === editCodigo.trim().toLowerCase()
    );
    if (codigoDuplicado) {
      showError("Código duplicado", `Ya existe otra familia con el código "${editCodigo}" (${codigoDuplicado.nombre}).`);
      return;
    }
    try {
      await database.write(async () => {
        await f.update((record) => {
          record.nombre = editNombre.trim();
          record.codigoFamilia = editCodigo.trim();
        });
      });
      setEditId(null);
      showSuccess("Familia actualizada", `Los cambios en "${editNombre}" se guardaron correctamente.`);
      await syncAfterOp();
    } catch (e: any) {
      showError("Error al actualizar", e.message || "No se pudo actualizar la familia.");
    }
  };

  const toggleEstado = async (f: FamiliaModel) => {
    const nuevoEstado = !f.estado;
    const doToggle = async () => {
      try {
        await database.write(async () => {
          await f.update((record) => {
            record.estado = nuevoEstado;
          });
        });
        showSuccess(
          nuevoEstado ? "Familia activada" : "Familia desactivada",
          `"${f.nombre}" ahora está ${nuevoEstado ? "activa" : "inactiva"}.`
        );
        await syncAfterOp();
      } catch (e: any) {
        showError("Error", e.message || "No se pudo cambiar el estado.");
      }
    };

    if (!nuevoEstado) {
      const count = await database.collections.get("productos").query(Q.where("familia_id", f.id)).fetchCount();
      if (count > 0) {
        showWarning(
          "Aviso de Afectación",
          `Al desactivar esta familia, hay ${count} producto(s) asociado(s) que se verán afectados y requerirán actualización. ¿Deseas continuar?`,
          doToggle
        );
        return;
      }
    }
    doToggle();
  };

  return (
    <div>
      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Familia
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-blue-100 mb-6 space-y-4">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-500" />
            Crear Nueva Familia
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Código *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej. 01"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej. Harinas"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {familias.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-slate-400"
                >
                  No hay familias registradas. Crea una para comenzar.
                </td>
              </tr>
            ) : (
              familias.map((f) => (
                <tr
                  key={f.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900/50 transition-colors group ${!f.estado ? 'opacity-50 bg-slate-50 dark:bg-slate-900/30' : ''}`}
                >
                  {editId === f.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          value={editCodigo}
                          onChange={(e) => setEditCodigo(e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-3"></td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSaveEdit(f)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-xs font-bold">
                          {f.codigoFamilia}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">
                        {f.nombre}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleEstado(f)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 ${f.estado
                            ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                            : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50"
                            }`}
                        >
                          {f.estado ? (
                            <>
                              <ToggleRight className="w-6 h-6 text-emerald-500" />
                              <span className="text-xs font-bold text-emerald-600">
                                Activo
                              </span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-6 h-6 text-slate-400" />
                              <span className="text-xs font-bold text-slate-400">
                                Inactivo
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(f)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ALMACENES TAB
// ═══════════════════════════════════════════════════════════
function AlmacenesTab({ almacenes, showSuccess, showError, showWarning, syncAfterOp, recoverData, onRecoverSaveSuccess }: { almacenes: AlmacenModel[] } & TabCallbacks) {
  const [showAdd, setShowAdd] = useState(false);
  const [nombre, setNombre] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");

  useEffect(() => {
     if (recoverData?.tabla === "almacenes") {
        setShowAdd(true);
        setNombre(recoverData.data?.nombre || "");
        window.scrollTo({ top: 0, behavior: "smooth" });
     }
  }, [recoverData]);

  const handleAdd = async () => {
    if (!nombre) {
      showError("Campo requerido", "El nombre del almacén es obligatorio.");
      return;
    }
    const duplicado = almacenes.find(
      (a) => a.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()
    );
    if (duplicado) {
      showError("Nombre duplicado", `Ya existe un almacén con el nombre "${nombre}".`);
      return;
    }
    try {
      await database.write(async () => {
        await database.get<AlmacenModel>("almacenes").create((a) => {
          a._raw.id = Crypto.randomUUID();
          a.nombre = nombre;
          a.estado = true;
        });
      });
      showSuccess("Almacén creado", `El almacén "${nombre}" se ha guardado correctamente.`);
      setNombre("");
      setShowAdd(false);
      if (onRecoverSaveSuccess) onRecoverSaveSuccess();
      await syncAfterOp();
    } catch (e: any) {
      showError("Error al crear", e.message || "No se pudo crear el almacén.");
    }
  };

  const handleSaveEdit = async (a: AlmacenModel) => {
    try {
      await database.write(async () => {
        await a.update((record) => {
          record.nombre = editNombre;
        });
      });
      setEditId(null);
      showSuccess("Almacén actualizado", `Los cambios en "${editNombre}" se guardaron correctamente.`);
      await syncAfterOp();
    } catch (e: any) {
      showError("Error al actualizar", e.message || "No se pudo actualizar el almacén.");
    }
  };

  const toggleEstado = async (a: AlmacenModel) => {
    const nuevoEstado = !a.estado;
    const doToggle = async () => {
      try {
        await database.write(async () => {
          await a.update((record) => {
            record.estado = nuevoEstado;
          });
        });
        showSuccess(
          nuevoEstado ? "Almacén activado" : "Almacén desactivado",
          `"${a.nombre}" ahora está ${nuevoEstado ? "activo" : "inactivo"}.`
        );
        await syncAfterOp();
      } catch (e: any) {
        showError("Error", e.message || "No se pudo cambiar el estado.");
      }
    };

    if (!nuevoEstado) {
      const count = await database.collections.get("movimientos_inventario").query(Q.where("almacen_id", a.id)).fetchCount();
      if (count > 0) {
        showWarning(
          "Aviso de Afectación",
          `Al desactivar este almacén, hay ${count} movimiento(s) de inventario asociado(s). ¿Deseas continuar?`,
          doToggle
        );
        return;
      }
    }
    doToggle();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Almacén
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-blue-100 mb-6 space-y-4">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-500" />
            Crear Nuevo Almacén
          </h3>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              className="w-full max-w-md px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ej. Bodega Central"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {almacenes.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-10 text-center text-slate-400"
                >
                  No hay almacenes registrados.
                </td>
              </tr>
            ) : (
              almacenes.map((a) => (
                <tr
                  key={a.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900/50 transition-colors group ${!a.estado ? 'opacity-50 bg-slate-50 dark:bg-slate-900/30' : ''}`}
                >
                  {editId === a.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-60 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-3"></td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSaveEdit(a)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <Warehouse className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                          </div>
                          <span className="font-medium text-slate-800 dark:text-white">
                            {a.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleEstado(a)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 ${a.estado
                            ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                            : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50"
                            }`}
                        >
                          {a.estado ? (
                            <>
                              <ToggleRight className="w-6 h-6 text-emerald-500" />
                              <span className="text-xs font-bold text-emerald-600">
                                Activo
                              </span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-6 h-6 text-slate-400" />
                              <span className="text-xs font-bold text-slate-400">
                                Inactivo
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditId(a.id);
                              setEditNombre(a.nombre);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// IMPUESTOS TAB
// ═══════════════════════════════════════════════════════════
function ImpuestosTab({ impuestos, showSuccess, showError, showWarning, syncAfterOp, recoverData, onRecoverSaveSuccess }: { impuestos: ImpuestoModel[] } & TabCallbacks) {
  const [showAdd, setShowAdd] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tasa, setTasa] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTasa, setEditTasa] = useState("");

  useEffect(() => {
     if (recoverData?.tabla === "impuestos") {
        setShowAdd(true);
        setNombre(recoverData.data?.nombre || "");
        setTasa(recoverData.data?.tasa_porcentaje ? String(recoverData.data?.tasa_porcentaje) : "");
        window.scrollTo({ top: 0, behavior: "smooth" });
     }
  }, [recoverData]);

  const handleAdd = async () => {
    if (!nombre || !tasa) {
      showError("Campos requeridos", "El Nombre y la Tasa son obligatorios para crear un impuesto.");
      return;
    }
    const duplicado = impuestos.find(
      (i) => i.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()
    );
    if (duplicado) {
      showError("Nombre duplicado", `Ya existe un impuesto con el nombre "${nombre}".`);
      return;
    }
    try {
      await database.write(async () => {
        await database.get<ImpuestoModel>("impuestos").create((i) => {
          i._raw.id = Crypto.randomUUID();
          i.nombre = nombre;
          i.tasa = parseFloat(tasa);
          i.activo = true;
        });
      });
      showSuccess("Impuesto creado", `El impuesto "${nombre}" (${tasa}%) se ha guardado correctamente.`);
      setNombre("");
      setTasa("");
      setShowAdd(false);
      if (onRecoverSaveSuccess) onRecoverSaveSuccess();
      await syncAfterOp();
    } catch (e: any) {
      showError("Error al crear", e.message || "No se pudo crear el impuesto.");
    }
  };

  const handleSaveEdit = async (i: ImpuestoModel) => {
    try {
      await database.write(async () => {
        await i.update((record) => {
          record.nombre = editNombre;
          record.tasa = parseFloat(editTasa);
        });
      });
      setEditId(null);
      showSuccess("Impuesto actualizado", `Los cambios en "${editNombre}" se guardaron correctamente.`);
      await syncAfterOp();
    } catch (e: any) {
      showError("Error al actualizar", e.message || "No se pudo actualizar el impuesto.");
    }
  };

  const toggleActivo = async (i: ImpuestoModel) => {
    const nuevoEstado = !i.activo;
    const doToggle = async () => {
      try {
        await database.write(async () => {
          await i.update((record) => {
            record.activo = nuevoEstado;
          });
        });
        showSuccess(
          nuevoEstado ? "Impuesto activado" : "Impuesto desactivado",
          `"${i.nombre}" ahora está ${nuevoEstado ? "activo" : "inactivo"}.`
        );
        await syncAfterOp();
      } catch (e: any) {
        showError("Error", e.message || "No se pudo cambiar el estado.");
      }
    };

    if (!nuevoEstado) {
      const count = await database.collections.get("producto_impuestos").query(Q.where("impuesto_id", i.id)).fetchCount();
      if (count > 0) {
        showWarning(
          "Aviso de Afectación",
          `Al desactivar este impuesto, hay ${count} producto(s) asociado(s) que dejarán de aplicarlo. ¿Deseas continuar?`,
          doToggle
        );
        return;
      }
    }
    doToggle();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Impuesto
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-blue-100 mb-6 space-y-4">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-500" />
            Crear Nuevo Impuesto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej. IVA"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Tasa (%) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej. 16"
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Tasa</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {impuestos.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-slate-400"
                >
                  No hay impuestos registrados.
                </td>
              </tr>
            ) : (
              impuestos.map((i) => (
                <tr
                  key={i.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900/50 transition-colors group ${!i.activo ? 'opacity-50 bg-slate-50 dark:bg-slate-900/30' : ''}`}
                >
                  {editId === i.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          step="0.01"
                          className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          value={editTasa}
                          onChange={(e) => setEditTasa(e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-3"></td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSaveEdit(i)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                          </div>
                          <span className="font-medium text-slate-800 dark:text-white">
                            {i.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">
                          {i.tasa}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActivo(i)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 ${i.activo
                            ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                            : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50"
                            }`}
                        >
                          {i.activo ? (
                            <>
                              <ToggleRight className="w-6 h-6 text-emerald-500" />
                              <span className="text-xs font-bold text-emerald-600">
                                Activo
                              </span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-6 h-6 text-slate-400" />
                              <span className="text-xs font-bold text-slate-400">
                                Inactivo
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditId(i.id);
                              setEditNombre(i.nombre);
                              setEditTasa(String(i.tasa));
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MARGENES TAB
// ═══════════════════════════════════════════════════════════
function MargenesTab({ margenes, showSuccess, showError, showWarning, syncAfterOp, recoverData, onRecoverSaveSuccess }: { margenes: MargenModel[] } & TabCallbacks) {
  const [showAdd, setShowAdd] = useState(false);
  const [nombre, setNombre] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPorcentaje, setEditPorcentaje] = useState("");

  useEffect(() => {
     if (recoverData?.tabla === "margenes") {
        setShowAdd(true);
        setNombre(recoverData.data?.nombre || "");
        setPorcentaje(recoverData.data?.porcentaje_multiplicador ? String((recoverData.data?.porcentaje_multiplicador - 1) * 100) : "");
        window.scrollTo({ top: 0, behavior: "smooth" });
     }
  }, [recoverData]);

  const handleAdd = async () => {
    if (!nombre || !porcentaje) {
      showError("Campos requeridos", "El Nombre y el Porcentaje son obligatorios para crear un margen.");
      return;
    }
    const duplicado = margenes.find(
      (m) => m.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()
    );
    if (duplicado) {
      showError("Nombre duplicado", `Ya existe un margen con el nombre "${nombre}".`);
      return;
    }
    try {
      await database.write(async () => {
        await database.get<MargenModel>("margenes").create((m) => {
          m._raw.id = Crypto.randomUUID();
          m.nombre = nombre;
          m.porcentaje = parseFloat(porcentaje);
          m.estado = true;
        });
      });
      showSuccess("Margen creado", `El margen "${nombre}" (${porcentaje}%) se ha guardado correctamente.`);
      setNombre("");
      setPorcentaje("");
      setShowAdd(false);
      if (onRecoverSaveSuccess) onRecoverSaveSuccess();
      await syncAfterOp();
    } catch (e: any) {
      showError("Error al crear", e.message || "No se pudo crear el margen.");
    }
  };

  const handleSaveEdit = async (m: MargenModel) => {
    try {
      await database.write(async () => {
        await m.update((record) => {
          record.nombre = editNombre;
          record.porcentaje = parseFloat(editPorcentaje);
        });
      });
      setEditId(null);
      showSuccess("Margen actualizado", `Los cambios en "${editNombre}" se guardaron correctamente.`);
      await syncAfterOp();
    } catch (e: any) {
      showError("Error al actualizar", e.message || "No se pudo actualizar el margen.");
    }
  };

  const toggleEstado = async (m: MargenModel) => {
    const nuevoEstado = !m.estado;
    const doToggle = async () => {
      try {
        await database.write(async () => {
          await m.update((record) => {
            record.estado = nuevoEstado;
          });
        });
        showSuccess(
          nuevoEstado ? "Margen activado" : "Margen desactivado",
          `"${m.nombre}" ahora está ${nuevoEstado ? "activo" : "inactivo"}.`
        );
        await syncAfterOp();
      } catch (e: any) {
        showError("Error", e.message || "No se pudo cambiar el estado.");
      }
    };

    if (!nuevoEstado) {
      const count = await database.collections.get("productos").query(Q.where("margen_id", m.id)).fetchCount();
      if (count > 0) {
        showWarning(
          "Aviso de Afectación",
          `Al desactivar este margen, hay ${count} producto(s) asociado(s) que podrían verse afectados. ¿Deseas continuar?`,
          doToggle
        );
        return;
      }
    }
    doToggle();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Margen
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-blue-100 mb-6 space-y-4">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-500" />
            Crear Nuevo Margen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej. Margen Ideal"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Porcentaje (%) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej. 35"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Porcentaje</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {margenes.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-slate-400"
                >
                  No hay márgenes registrados.
                </td>
              </tr>
            ) : (
              margenes.map((m) => (
                <tr
                  key={m.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900/50 transition-colors group ${!m.estado ? 'opacity-50 bg-slate-50 dark:bg-slate-900/30' : ''}`}
                >
                  {editId === m.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          step="0.01"
                          className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          value={editPorcentaje}
                          onChange={(e) => setEditPorcentaje(e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-3"></td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSaveEdit(m)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                          </div>
                          <span className="font-medium text-slate-800 dark:text-white">
                            {m.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">
                          {m.porcentaje}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleEstado(m)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 ${m.estado
                            ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                            : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50"
                            }`}
                        >
                          {m.estado ? (
                            <>
                              <ToggleRight className="w-6 h-6 text-emerald-500" />
                              <span className="text-xs font-bold text-emerald-600">
                                Activo
                              </span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-6 h-6 text-slate-400" />
                              <span className="text-xs font-bold text-slate-400">
                                Inactivo
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditId(m.id);
                              setEditNombre(m.nombre);
                              setEditPorcentaje(String(m.porcentaje));
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CATEGORIAS DE CLIENTES TAB
// ═══════════════════════════════════════════════════════════
function CategoriasTab({ categorias, showSuccess, showError, showWarning, syncAfterOp, recoverData, onRecoverSaveSuccess }: { categorias: CategoriaClienteModel[] } & TabCallbacks) {
  const [showAdd, setShowAdd] = useState(false);
  const [nombre, setNombre] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");

  useEffect(() => {
     if (recoverData?.tabla === "categorias") {
        setShowAdd(true);
        setNombre(recoverData.data?.nombre || "");
        window.scrollTo({ top: 0, behavior: "smooth" });
     }
  }, [recoverData]);

  const handleAdd = async () => {
    if (!nombre) {
      showError("Campo requerido", "El nombre de la categoría es obligatorio.");
      return;
    }
    const duplicado = categorias.find(
      (c) => c.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()
    );
    if (duplicado) {
      showError("Nombre duplicado", `Ya existe una categoría con el nombre "${nombre}".`);
      return;
    }
    try {
      await database.write(async () => {
        await database.get<CategoriaClienteModel>("categorias_clientes").create((c) => {
          c._raw.id = Crypto.randomUUID();
          c.nombre = nombre;
          c.estado = true;
        });
      });
      showSuccess("Categoría creada", `La categoría "${nombre}" se ha guardado correctamente.`);
      setNombre("");
      setShowAdd(false);
      if (onRecoverSaveSuccess) onRecoverSaveSuccess();
      await syncAfterOp();
    } catch (e: any) {
      showError("Error al crear", e.message || "No se pudo crear la categoría.");
    }
  };

  const handleSaveEdit = async (c: CategoriaClienteModel) => {
    try {
      await database.write(async () => {
        await c.update((record) => {
          record.nombre = editNombre;
        });
      });
      setEditId(null);
      showSuccess("Categoría actualizada", `Los cambios en "${editNombre}" se guardaron correctamente.`);
      await syncAfterOp();
    } catch (e: any) {
      showError("Error al actualizar", e.message || "No se pudo actualizar la categoría.");
    }
  };

  const toggleEstado = async (c: CategoriaClienteModel) => {
    const nuevoEstado = !c.estado;
    const doToggle = async () => {
      try {
        await database.write(async () => {
          await c.update((record) => {
            record.estado = nuevoEstado;
          });
        });
        showSuccess(
          nuevoEstado ? "Categoría activada" : "Categoría desactivada",
          `"${c.nombre}" ahora está ${nuevoEstado ? "activa" : "inactiva"}.`
        );
        await syncAfterOp();
      } catch (e: any) {
        showError("Error", e.message || "No se pudo cambiar el estado.");
      }
    };

    if (!nuevoEstado) {
      const count = await database.collections.get("clientes").query(Q.where("categoria", c.nombre)).fetchCount();
      if (count > 0) {
        showWarning(
          "Aviso de Afectación",
          `Al desactivar esta categoría, hay ${count} cliente(s) que tienen esta categoría asignada. ¿Deseas continuar?`,
          doToggle
        );
        return;
      }
    }
    doToggle();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-blue-100 mb-6 space-y-4">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-500" />
            Crear Nueva Categoría
          </h3>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              className="w-full max-w-md px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ej. General"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categorias.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-10 text-center text-slate-400"
                >
                  No hay categorías registradas.
                </td>
              </tr>
            ) : (
              categorias.map((c) => (
                <tr
                  key={c.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900/50 transition-colors group ${!c.estado ? 'opacity-50 bg-slate-50 dark:bg-slate-900/30' : ''}`}
                >
                  {editId === c.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-60 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-3"></td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSaveEdit(c)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                            <Users className="w-4 h-4 text-purple-600 dark:text-purple-500" />
                          </div>
                          <span className="font-medium text-slate-800 dark:text-white">
                            {c.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleEstado(c)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 ${c.estado
                            ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                            : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50"
                            }`}
                        >
                          {c.estado ? (
                            <>
                              <ToggleRight className="w-6 h-6 text-emerald-500" />
                              <span className="text-xs font-bold text-emerald-600">
                                Activo
                              </span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-6 h-6 text-slate-400" />
                              <span className="text-xs font-bold text-slate-400">
                                Inactivo
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditId(c.id);
                              setEditNombre(c.nombre);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── withObservables Wrapper ────────────────────────────────
export default withObservables([], () => ({
  familias: database.collections
    .get<FamiliaModel>("familias")
    .query()
    .observe(),
  almacenes: database.collections
    .get<AlmacenModel>("almacenes")
    .query()
    .observe(),
  impuestos: database.collections
    .get<ImpuestoModel>("impuestos")
    .query()
    .observe(),
  margenes: database.collections
    .get<MargenModel>("margenes")
    .query()
    .observe(),
  categorias: database.collections
    .get<CategoriaClienteModel>("categorias_clientes")
    .query()
    .observe(),
}))(CatalogsContent);
