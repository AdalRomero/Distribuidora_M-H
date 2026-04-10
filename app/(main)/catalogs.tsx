import withObservables from "@nozbe/with-observables";
import {
    BookOpen,
    Check,
    Edit2,
    Layers,
    Loader2,
    Plus,
    Receipt,
    ShieldCheck,
    ShieldAlert,
    ShieldX,
    Skull,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Warehouse,
    X,
} from "lucide-react";
import React, { useState } from "react";
import { database } from "../../src/services/DB/indexBD";
import AlmacenModel from "../../src/services/DB/models/bases/almacen";
import FamiliaModel from "../../src/services/DB/models/bases/familia";
import ImpuestoModel from "../../src/services/DB/models/bases/impuesto";
import { syncApp } from "../../src/sync";
import SuccessModal from "../../components/ui/modals/SuccessModal";
import ErrorModal from "../../components/ui/modals/ErrorModal";
import WarningModal from "../../components/ui/modals/WarningModal";

// ─── Types ──────────────────────────────────────────────────
type ActiveTab = "familias" | "almacenes" | "impuestos";

interface CatalogsProps {
  familias: FamiliaModel[];
  almacenes: AlmacenModel[];
  impuestos: ImpuestoModel[];
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
  warning: { open: false, title: "", message: "", onConfirm: () => {} },
};


// ─── Main Component ─────────────────────────────────────────
function CatalogsContent({ familias, almacenes, impuestos }: CatalogsProps) {
  const [tab, setTab] = useState<ActiveTab>("familias");
  const [modal, setModal] = useState<ModalState>(initialModalState);
  const [syncing, setSyncing] = useState(false);

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
  }[] = [
    {
      key: "familias",
      label: "Familias",
      icon: <Layers className="w-4 h-4" />,
      count: familias.length,
    },
    {
      key: "almacenes",
      label: "Almacenes",
      icon: <Warehouse className="w-4 h-4" />,
      count: almacenes.length,
    },
    {
      key: "impuestos",
      label: "Impuestos",
      icon: <Receipt className="w-4 h-4" />,
      count: impuestos.length,
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ── Modals ── */}
      <SuccessModal isOpen={modal.success.open} onClose={closeSuccess} title={modal.success.title} message={modal.success.message} />
      <ErrorModal isOpen={modal.error.open} onClose={closeError} title={modal.error.title} message={modal.error.message} />
      <WarningModal isOpen={modal.warning.open} onClose={closeWarning} onConfirm={() => { modal.warning.onConfirm(); closeWarning(); }} title={modal.warning.title} message={modal.warning.message} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogos</h1>
          <p className="text-sm text-slate-500">
            Administra las bases de datos de Familias, Almacenes e Impuestos
          </p>
        </div>
        {syncing && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-xs font-medium text-blue-600">Sincronizando...</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-white text-indigo-700 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon}
            {t.label}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.key
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "familias" && <FamiliasTab familias={familias} showSuccess={showSuccess} showError={showError} showWarning={showWarning} syncAfterOp={syncAfterOp} />}
      {tab === "almacenes" && <AlmacenesTab almacenes={almacenes} showSuccess={showSuccess} showError={showError} showWarning={showWarning} syncAfterOp={syncAfterOp} />}
      {tab === "impuestos" && <ImpuestosTab impuestos={impuestos} showSuccess={showSuccess} showError={showError} showWarning={showWarning} syncAfterOp={syncAfterOp} />}
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
}

// ═══════════════════════════════════════════════════════════
// FAMILIAS TAB (with alert threshold configuration)
// ═══════════════════════════════════════════════════════════
function FamiliasTab({ familias, showSuccess, showError, showWarning, syncAfterOp }: { familias: FamiliaModel[] } & TabCallbacks) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Add form state
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [umbralVerde, setUmbralVerde] = useState("90");
  const [umbralAmarillo, setUmbralAmarillo] = useState("30");

  // Edit state
  const [editNombre, setEditNombre] = useState("");
  const [editCodigo, setEditCodigo] = useState("");
  const [editUmbralVerde, setEditUmbralVerde] = useState("");
  const [editUmbralAmarillo, setEditUmbralAmarillo] = useState("");

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
          f.codigoFamilia = codigo.trim();
          f.nombre = nombre.trim();
          f.estado = true;
          f.umbralVerdeDias = parseInt(umbralVerde) || 90;
          f.umbralAmarilloDias = parseInt(umbralAmarillo) || 30;
          f.umbralRojoDias = parseInt(umbralAmarillo) || 30;
        });
      });
      setCodigo("");
      setNombre("");
      setUmbralVerde("90");
      setUmbralAmarillo("30");
      setShowAdd(false);
      showSuccess("Familia creada", `La familia "${nombre}" se ha guardado correctamente.`);
      await syncAfterOp();
    } catch (e: any) {
      showError("Error al crear", e.message || "No se pudo crear la familia.");
    }
  };

  const startEdit = (f: FamiliaModel) => {
    setEditId(f.id);
    setEditNombre(f.nombre);
    setEditCodigo(f.codigoFamilia);
    setEditUmbralVerde(String(f.umbralVerdeDias || 90));
    setEditUmbralAmarillo(String(f.umbralAmarilloDias || 30));
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
          record.umbralVerdeDias = parseInt(editUmbralVerde) || 90;
          record.umbralAmarilloDias = parseInt(editUmbralAmarillo) || 30;
          record.umbralRojoDias = parseInt(editUmbralAmarillo) || 30;
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

  const handleDelete = (f: FamiliaModel) => {
    showWarning(
      "Eliminar familia",
      `¿Estás seguro de eliminar la familia "${f.nombre}"? Esta acción no se puede deshacer.`,
      async () => {
        try {
          await database.write(async () => {
            await f.markAsDeleted();
          });
          showSuccess("Familia eliminada", `"${f.nombre}" ha sido eliminada correctamente.`);
          await syncAfterOp();
        } catch (e: any) {
          showError("Error al eliminar", e.message || "No se pudo eliminar la familia.");
        }
      }
    );
  };

  return (
    <div>
      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Familia
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 mb-6 space-y-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-500" />
            Crear Nueva Familia
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Código *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej. 01"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej. Harinas"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                🟢 ¿Cuántos días antes es "seguro"?
              </label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="90"
                value={umbralVerde}
                onChange={(e) => setUmbralVerde(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1">Ej: 90 = más de 3 meses</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                🟡 ¿Cuándo empieza el riesgo?
              </label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="30"
                value={umbralAmarillo}
                onChange={(e) => setUmbralAmarillo(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1">Ej: 30 = menos de 1 mes</p>
            </div>
          </div>
          {/* ── Vista previa visual de avisos ── */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-4 py-2">
              <p className="text-xs font-bold text-slate-600">📋 Así se verán los avisos de esta familia:</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-slate-100">
              {/* Seguro */}
              <div className="bg-emerald-50 p-4 flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm font-extrabold text-emerald-700">Seguro</p>
                <p className="text-[11px] text-emerald-600 font-medium leading-tight">
                  Más de <strong>{umbralVerde || 90} días</strong>
                </p>
                <div className="w-full h-1.5 rounded-full bg-emerald-300 mt-1"></div>
              </div>
              {/* Atención */}
              <div className="bg-amber-50 p-4 flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-sm font-extrabold text-amber-700">Atención</p>
                <p className="text-[11px] text-amber-600 font-medium leading-tight">
                  De <strong>{umbralAmarillo || 30}</strong> a <strong>{umbralVerde || 90} días</strong>
                </p>
                <div className="w-full h-1.5 rounded-full bg-amber-300 mt-1"></div>
              </div>
              {/* Peligro */}
              <div className="bg-rose-50 p-4 flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <ShieldX className="w-5 h-5 text-rose-600" />
                </div>
                <p className="text-sm font-extrabold text-rose-700">Peligro</p>
                <p className="text-[11px] text-rose-600 font-medium leading-tight">
                  Menos de <strong>{umbralAmarillo || 30} días</strong>
                </p>
                <div className="w-full h-1.5 rounded-full bg-rose-300 mt-1"></div>
              </div>
              {/* Caducado */}
              <div className="bg-gray-900 p-4 flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <Skull className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm font-extrabold text-white">Caducado</p>
                <p className="text-[11px] text-gray-400 font-medium leading-tight">
                  Ya <strong>venció</strong> la fecha
                </p>
                <div className="w-full h-1.5 rounded-full bg-gray-600 mt-1"></div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-medium shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Avisos Caducidad</th>
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
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  {editId === f.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          className="px-2 py-1.5 border rounded-lg text-sm w-20"
                          value={editCodigo}
                          onChange={(e) => setEditCodigo(e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          className="px-2 py-1.5 border rounded-lg text-sm w-40"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <input
                              type="number"
                              className="px-2 py-1 border rounded-md text-xs w-14"
                              value={editUmbralVerde}
                              onChange={(e) =>
                                setEditUmbralVerde(e.target.value)
                              }
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <input
                              type="number"
                              className="px-2 py-1 border rounded-md text-xs w-14"
                              value={editUmbralAmarillo}
                              onChange={(e) =>
                                setEditUmbralAmarillo(e.target.value)
                              }
                            />
                          </div>
                        </div>
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
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold">
                          {f.codigoFamilia}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {f.nombre}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-700" title={`Seguro: más de ${f.umbralVerdeDias || 90} días`}>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Seguro &gt;{f.umbralVerdeDias || 90}d
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-700" title={`Atención: ${f.umbralAmarilloDias || 30} a ${f.umbralVerdeDias || 90} días`}>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Atención {f.umbralAmarilloDias || 30}d
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-bold text-rose-700" title={`Peligro: menos de ${f.umbralAmarilloDias || 30} días`}>
                            <ShieldX className="w-3.5 h-3.5" />
                            Peligro &lt;{f.umbralAmarilloDias || 30}d
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleEstado(f)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 ${
                            f.estado
                              ? "bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-50 border border-slate-200 hover:bg-slate-100"
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
                          <button
                            onClick={() => handleDelete(f)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
function AlmacenesTab({ almacenes, showSuccess, showError, showWarning, syncAfterOp }: { almacenes: AlmacenModel[] } & TabCallbacks) {
  const [showAdd, setShowAdd] = useState(false);
  const [nombre, setNombre] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");

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
          a.nombre = nombre;
          a.estado = true;
        });
      });
      showSuccess("Almacén creado", `El almacén "${nombre}" se ha guardado correctamente.`);
      setNombre("");
      setShowAdd(false);
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

  const handleDelete = (a: AlmacenModel) => {
    showWarning(
      "Eliminar almacén",
      `¿Estás seguro de eliminar el almacén "${a.nombre}"? Esta acción no se puede deshacer.`,
      async () => {
        try {
          await database.write(async () => {
            await a.markAsDeleted();
          });
          showSuccess("Almacén eliminado", `"${a.nombre}" ha sido eliminado correctamente.`);
          await syncAfterOp();
        } catch (e: any) {
          showError("Error al eliminar", e.message || "No se pudo eliminar el almacén.");
        }
      }
    );
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Almacén
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 mb-6 space-y-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-500" />
            Crear Nuevo Almacén
          </h3>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              className="w-full max-w-md px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ej. Bodega Central"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-medium shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
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
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  {editId === a.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          className="px-2 py-1.5 border rounded-lg text-sm w-60"
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
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
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
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Warehouse className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="font-medium text-slate-800">
                            {a.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleEstado(a)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 ${
                            a.estado
                              ? "bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-50 border border-slate-200 hover:bg-slate-100"
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
                          <button
                            onClick={() => handleDelete(a)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
function ImpuestosTab({ impuestos, showSuccess, showError, showWarning, syncAfterOp }: { impuestos: ImpuestoModel[] } & TabCallbacks) {
  const [showAdd, setShowAdd] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tasa, setTasa] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTasa, setEditTasa] = useState("");

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
          i.nombre = nombre;
          i.tasa = parseFloat(tasa);
          i.activo = true;
        });
      });
      showSuccess("Impuesto creado", `El impuesto "${nombre}" (${tasa}%) se ha guardado correctamente.`);
      setNombre("");
      setTasa("");
      setShowAdd(false);
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

  const handleDelete = (i: ImpuestoModel) => {
    showWarning(
      "Eliminar impuesto",
      `¿Estás seguro de eliminar el impuesto "${i.nombre}"? Esta acción no se puede deshacer.`,
      async () => {
        try {
          await database.write(async () => {
            await i.markAsDeleted();
          });
          showSuccess("Impuesto eliminado", `"${i.nombre}" ha sido eliminado correctamente.`);
          await syncAfterOp();
        } catch (e: any) {
          showError("Error al eliminar", e.message || "No se pudo eliminar el impuesto.");
        }
      }
    );
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Impuesto
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 mb-6 space-y-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-500" />
            Crear Nuevo Impuesto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej. IVA"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tasa (%) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej. 16"
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-medium shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
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
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  {editId === i.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          className="px-2 py-1.5 border rounded-lg text-sm w-40"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          step="0.01"
                          className="px-2 py-1.5 border rounded-lg text-sm w-20"
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
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
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
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <Receipt className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="font-medium text-slate-800">
                            {i.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                          {i.tasa}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActivo(i)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 ${
                            i.activo
                              ? "bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-50 border border-slate-200 hover:bg-slate-100"
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
                          <button
                            onClick={() => handleDelete(i)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
}))(CatalogsContent);
