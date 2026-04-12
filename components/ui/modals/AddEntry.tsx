import { Q } from "@nozbe/watermelondb";
import withObservables from "@nozbe/with-observables";
import { AlertTriangle, Calendar, Info, Package, DollarSign, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { database } from "../../../src/services/DB/indexBD";
import AlmacenModel from "../../../src/services/DB/models/bases/almacen";
import FamiliaModel from "../../../src/services/DB/models/bases/familia";
import Lote from "../../../src/services/DB/models/catalogo/lote";
import Producto from "../../../src/services/DB/models/catalogo/producto";
import MovimientoInventario from "../../../src/services/DB/models/registros/movimientoInventario";

interface AddEntryInnerProps {
  isOpen: boolean;
  onClose: () => void;
  productos: Producto[];
  almacenes: AlmacenModel[];
  familias: FamiliaModel[];
}

function AddEntryInner({
  isOpen,
  onClose,
  productos,
  almacenes,
  familias,
}: AddEntryInnerProps) {
  const [productoId, setProductoId] = useState("");
  const [almacenId, setAlmacenId] = useState("");
  const [lote, setLote] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [costo, setCosto] = useState("");
  const [unidad, setUnidad] = useState("pzas");
  const [caducidad, setCaducidad] = useState("");

  const [ultimoCosto, setUltimoCosto] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cada que cambia el producto, calculamos el último costo de lote
  useEffect(() => {
    if (!productoId) {
      setUltimoCosto(null);
      return;
    }
    const fetchLatestCosto = async () => {
      try {
        const result = await database.collections
          .get<Lote>("lotes")
          .query(
            Q.where("producto_id", productoId),
            Q.sortBy("created_at", Q.desc),
            Q.take(1)
          )
          .fetch();
        if (result && result.length > 0) {
          setUltimoCosto(result[0].costoAdquisicion || 0);
        } else {
          setUltimoCosto(null);
        }
      } catch (error) {
        console.warn("No se pudo obtener el último lote", error);
      }
    };
    fetchLatestCosto();
  }, [productoId]);

  if (!isOpen) return null;

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400";
  const selectClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-600";

  const resetForm = () => {
    setProductoId("");
    setAlmacenId("");
    setLote("");
    setCantidad("");
    setCosto("");
    setUnidad("pzas");
    setCaducidad("");
    setUltimoCosto(null);
  };

  const handleSave = async () => {
    try {
      if (!productoId || !almacenId || !lote || !cantidad || !costo) {
        alert("Por favor llena los campos obligatorios.");
        return;
      }
      setIsSaving(true);

      await database.write(async () => {
        // 1. Create Lote
        const nuevoLote = await database.get<Lote>("lotes").create((l) => {
          (l as any)._raw.producto_id = productoId;
          l.identificadorLote = lote;
          l.unidadMedida = unidad;
          l.costoAdquisicion = parseFloat(costo) || 0;
          if (caducidad) {
            (l as any)._raw.fecha_caducidad = new Date(caducidad).getTime();
          }
        });

        // 2. Create MovimientoInventario
        await database
          .get<MovimientoInventario>("movimientos_inventario")
          .create((mi) => {
            (mi as any)._raw.almacen_id = almacenId;
            (mi as any)._raw.producto_id = productoId;
            (mi as any)._raw.lote_id = nuevoLote.id;
            mi.usuarioId = "system"; // TODO: Usar el rol de la sesión
            mi.tipo = "ENTRADA_COMPRA";
            mi.cantidad = parseInt(cantidad, 10);
          });
      });

      setIsSaving(false);
      resetForm();
      onClose();
    } catch (error: any) {
      console.error("Error Registrando Entrada:", error);
      alert("Error al guardar: " + error.message);
      setIsSaving(false);
    }
  };

  // Validación de advertencia de cambio de costo
  const calcularDiferenciaCosto = () => {
    if (!costo || ultimoCosto === null || ultimoCosto === 0) return null;
    const current = parseFloat(costo);
    const diff = current - ultimoCosto;
    const perc = (diff / ultimoCosto) * 100;
    return perc; // Puede ser negativo si bajó
  };

  const diffPerc = calcularDiferenciaCosto();
  const showCostoAlerta = diffPerc !== null && Math.abs(diffPerc) >= 10;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative z-10 bg-slate-50 w-full max-w-4xl max-h-[95vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-white px-8 py-5 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Registrar Entrada de Mercancía
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Ingresa un lote nuevo para un producto existente
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              
              {/* Sección Principal */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5 flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-700">Identificación</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Producto *
                  </label>
                  <select
                    className={selectClass}
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                  >
                    <option value="">Selecciona Producto...</option>
                    {productos
                      .filter((p) => p.estado)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.codigoInterno} - {p.descripcion}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Almacén Destino *
                  </label>
                  <select
                    className={selectClass}
                    value={almacenId}
                    onChange={(e) => setAlmacenId(e.target.value)}
                  >
                    <option value="">Selecciona Almacén...</option>
                    {almacenes
                      .filter((a) => a.estado)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Identificador de Lote *
                    </label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Ej. L-204"
                      value={lote}
                      onChange={(e) => setLote(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Caducidad
                    </label>
                    <input
                      type="date"
                      className={`${inputClass} text-slate-600`}
                      value={caducidad}
                      onChange={(e) => setCaducidad(e.target.value)}
                    />
                  </div>
                </div>

                {productoId && caducidad && (() => {
                  const prod = productos.find(p => p.id === productoId);
                  const fam = prod ? familias.find(f => f.id === (prod as any).familiaId) : null;
                  if (!fam) return null;
                  const today = new Date();
                  const expDate = new Date(caducidad);
                  const daysRemaining = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  let levelColor = "emerald";
                  let levelText = "OK — Verde";
                  if (daysRemaining <= 0) {
                    levelColor = "gray";
                    levelText = "VENCIDO — Negro";
                  } else if (daysRemaining <= fam.umbralAmarilloDias) {
                    levelColor = "rose";
                    levelText = `Urgente — Rojo (${daysRemaining} días)`;
                  } else if (daysRemaining <= fam.umbralVerdeDias) {
                    levelColor = "amber";
                    levelText = `Precaución — Amarillo (${daysRemaining} días)`;
                  } else {
                    levelText = `OK — Verde (${daysRemaining} días)`;
                  }

                  return (
                    <div className={`mt-2 px-4 py-3 rounded-xl border ${daysRemaining <= 0 ? "bg-gray-900 border-gray-700" : `bg-${levelColor}-50 border-${levelColor}-200`}`}>
                      <p className={`text-xs font-bold ${daysRemaining <= 0 ? "text-white" : `text-${levelColor}-700`}`}>
                        ⚡ Aviso Caducidad: {levelText}
                      </p>
                    </div>
                  );
                })()}

              </div>

              {/* Operación y Costo */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5 flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-slate-700">Cantidades y Costo</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Cantidad Entrante *
                    </label>
                    <input
                      type="number"
                      min="1"
                      className={inputClass}
                      placeholder="0"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Unidad de Medida
                    </label>
                    <select
                      className={selectClass}
                      value={unidad}
                      onChange={(e) => setUnidad(e.target.value)}
                    >
                      <option value="pzas">Piezas (pzas)</option>
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="litros">Litros (L)</option>
                      <option value="cajas">Cajas</option>
                      <option value="bultos">Bultos</option>
                      <option value="galones">Galones</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Costo de Adquisición Unitario *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-400 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                      placeholder="0.00"
                      value={costo}
                      onChange={(e) => setCosto(e.target.value)}
                    />
                  </div>
                  {ultimoCosto !== null && (
                    <p className="text-xs text-slate-500 mt-1">
                      Último costo registrado: <span className="font-semibold">${ultimoCosto.toFixed(2)}</span>
                    </p>
                  )}
                </div>

                {showCostoAlerta && (
                  <div className="mt-2 flex items-start gap-3 px-4 py-3 bg-amber-50 rounded-xl border border-amber-200">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-700">Alerta de Variación de Costo</p>
                      <p className="text-xs text-amber-600 mt-1">
                        El costo ingresado (${costo}) difiere en un <span className="font-semibold">{Math.abs(diffPerc).toFixed(2)}%</span> del último costo registrado (${ultimoCosto?.toFixed(2)}). Verifica tu información de precios.
                      </p>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-100 p-5 px-8 shrink-0 flex items-center justify-end gap-3 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl font-medium text-sm text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Registrar Entrada"}
          </button>
        </div>

      </div>
    </div>
  );
}

const enhance = withObservables([], () => ({
  productos: database.collections.get<Producto>("productos").query().observe(),
  almacenes: database.collections.get<AlmacenModel>("almacenes").query().observe(),
  familias: database.collections.get<FamiliaModel>("familias").query().observe(),
}));

const AddEntry = enhance(AddEntryInner);
export default AddEntry;
