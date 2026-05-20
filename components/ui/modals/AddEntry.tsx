import { Q } from "@nozbe/watermelondb";
import withObservables from "@nozbe/with-observables";
import {
  AlertTriangle,
  Barcode,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  X,
} from "lucide-react";
import * as Crypto from "expo-crypto";
import React, { useEffect, useState } from "react";
import { database } from "../../../src/services/DB/indexBD";
import { syncApp } from "../../../src/sync";
import AlmacenModel from "../../../src/services/DB/models/bases/almacen";
import FamiliaModel from "../../../src/services/DB/models/bases/familia";
import ImpuestoModel from "../../../src/services/DB/models/bases/impuesto";
import MargenModel from "../../../src/services/DB/models/bases/margen";
import CodigoAlterno from "../../../src/services/DB/models/catalogo/codigoAlterno";
import Lote from "../../../src/services/DB/models/catalogo/lote";
import Producto from "../../../src/services/DB/models/catalogo/producto";
import ProductoImpuesto from "../../../src/services/DB/models/catalogo/productoImpuesto";
import MovimientoInventario from "../../../src/services/DB/models/registros/movimientoInventario";
import { useAuth } from "../../../src/context/AuthContext";
import { getDeviceId } from "../../../src/services/device";
import { logAudit } from "../../../src/utils/auditHelper";
import { recalcularStockLote } from "../../../src/services/inventoryService";

interface AddEntryInnerProps {
  isOpen: boolean;
  onClose: () => void;
  productos: Producto[];
  almacenes: AlmacenModel[];
  familias: FamiliaModel[];
  margenes: MargenModel[];
  impuestos: ImpuestoModel[];
  recoverData?: { tabla: string, data: any, errorId?: string } | null;
  onSaveSuccess?: () => void;
}

function AddEntryInner({
  isOpen,
  onClose,
  productos,
  almacenes,
  familias,
  margenes,
  impuestos,
  recoverData,
  onSaveSuccess,
}: AddEntryInnerProps) {
  const { userId } = useAuth();
  const [productoId, setProductoId] = useState("");
  const [almacenId, setAlmacenId] = useState("");
  const [lote, setLote] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [costo, setCosto] = useState("");
  const [unidad, setUnidad] = useState("pzas");
  const [caducidad, setCaducidad] = useState("");
  const [codigosAlternos, setCodigosAlternos] = useState<string[]>([]);
  const [currentBarcode, setCurrentBarcode] = useState("");

  const [ultimoCosto, setUltimoCosto] = useState<number | null>(null);
  const [productoMargen, setProductoMargen] = useState<MargenModel | null>(
    null,
  );
  const [productoImpuestosTasas, setProductoImpuestosTasas] = useState<
    ImpuestoModel[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill from recoverData
  useEffect(() => {
    if (isOpen && recoverData?.data) {
      const data = recoverData.data;
      if (recoverData.tabla === 'lotes') {
        setProductoId(data.producto_id || "");
        setLote(data.identificador_lote || "");
        setUnidad(data.unidad_medida || "pzas");
        if (data.costo_adquisicion !== undefined) setCosto(String(data.costo_adquisicion));
        if (data.fecha_caducidad) {
          try {
            const dateStr = new Date(Number(data.fecha_caducidad)).toISOString().split("T")[0];
            setCaducidad(dateStr || "");
          } catch(e) {}
        }
      } else if (recoverData.tabla === 'movimientos_inventario') {
         setProductoId(data.producto_id || "");
         setAlmacenId(data.almacen_id || "");
         if (data.cantidad) setCantidad(String(data.cantidad));
      }
    } else if (!isOpen) {
      resetForm();
    }
  }, [isOpen, recoverData]);

  // Cada que cambia el producto, calculamos el último costo + margen + impuestos
  useEffect(() => {
    if (!productoId) {
      setUltimoCosto(null);
      setProductoMargen(null);
      setProductoImpuestosTasas([]);
      return;
    }

    const fetchProductoData = async () => {
      try {
        // 1. Fetch last lote cost
        const result = await database.collections
          .get<Lote>("lotes")
          .query(
            Q.where("producto_id", productoId),
            Q.sortBy("created_at", Q.desc),
            Q.take(1),
          )
          .fetch();
        if (result && result.length > 0) {
          setUltimoCosto(result[0].costoAdquisicion || 0);
        } else {
          setUltimoCosto(null);
        }

        // 2. Fetch margen assigned to product
        const producto = productos.find((p) => p.id === productoId);
        if (producto) {
          const rawMargenId = (producto as any)._raw?.margen_id;
          if (rawMargenId) {
            const margenObj = margenes.find((m) => m.id === rawMargenId);
            setProductoMargen(margenObj || null);
          } else {
            setProductoMargen(null);
          }
        }

        // 3. Fetch impuestos assigned to product
        const piRecords = await database.collections
          .get<ProductoImpuesto>("producto_impuestos")
          .query(Q.where("producto_id", productoId))
          .fetch();
        const impIds = piRecords.map(
          (pi) => (pi as any)._raw.impuesto_id as string,
        );
        const impuestosDelProducto = impuestos.filter((imp) =>
          impIds.includes(imp.id),
        );
        setProductoImpuestosTasas(impuestosDelProducto);
      } catch (error) {
        console.warn("No se pudo obtener datos del producto", error);
      }
    };
    fetchProductoData();
  }, [productoId, margenes, impuestos, productos]);

  if (!isOpen) return null;

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400";
  const selectClass =
    "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-600 dark:text-slate-300";

  function resetForm() {
    setProductoId("");
    setAlmacenId("");
    setLote("");
    setCantidad("");
    setCosto("");
    setUnidad("pzas");
    setCaducidad("");
    setCodigosAlternos([]);
    setCurrentBarcode("");
    setUltimoCosto(null);
    setProductoMargen(null);
    setProductoImpuestosTasas([]);
    setError(null);
  }

  const handleSave = async () => {
    try {
      setError(null);
      if (!productoId || !almacenId || !lote || !cantidad || !costo) {
        setError("Por favor llena los campos obligatorios.");
        return;
      }
      setIsSaving(true);

      const uId = userId || "system";
      const devId = getDeviceId();
      const qtyNum = parseInt(cantidad, 10) || 0;
      const costoNum = parseFloat(costo) || 0;

      let nuevoLoteId = "";
      let nuevoMovimientoId = "";

      await database.write(async () => {
        // 1. Create Lote
        const nuevoLote = await database.get<Lote>("lotes").create((l: any) => {
          l._raw.id = Crypto.randomUUID();
          l._raw.producto_id = productoId;
          l.identificadorLote = lote;
          l.unidadMedida = unidad;
          l.costoAdquisicion = costoNum;
          l.cantidad = qtyNum;
          l.estado = true;
          l.version = 1;
          l.updatedBy = uId;
          l.updatedDevice = devId;
          if (caducidad) {
            const parsed = new Date(caducidad).getTime();
            if (!isNaN(parsed) && parsed > 0) {
              l._raw.fecha_caducidad = parsed;
            }
          }
        });
        nuevoLoteId = nuevoLote.id;

        // 2. Create MovimientoInventario
        const nuevoMovimiento = await database
          .get<MovimientoInventario>("movimientos_inventario")
          .create((mi: any) => {
            mi._raw.id = Crypto.randomUUID();
            mi._raw.almacen_id = almacenId;
            mi._raw.producto_id = productoId;
            mi._raw.lote_id = nuevoLoteId;
            mi.usuarioId = uId;
            mi.tipo = "ENTRADA_COMPRA";
            mi.cantidad = qtyNum;
            mi.cantidadAnterior = 0;
            mi.cantidadPosterior = qtyNum;
            mi.referencia = `Entrada de mercancía - Lote ${lote}`;
            mi.deviceId = devId;
          });
        nuevoMovimientoId = nuevoMovimiento.id;

        // 3. Create CodigoAlterno records if provided
        for (const code of codigosAlternos) {
          await database
            .get<CodigoAlterno>("codigos_alternos")
            .create((ca) => {
              (ca as any)._raw.id = Crypto.randomUUID();
              (ca as any)._raw.producto_id = productoId;
              ca.codigoBarras = code.trim();
            });
        }
      });

      // 4. Log audit trails
      await logAudit({
        tabla: "lotes",
        registroId: nuevoLoteId,
        accion: "create",
        userId: uId,
        deviceId: devId,
        valoresNuevos: {
          producto_id: productoId,
          identificador_lote: lote,
          unidad_medida: unidad,
          costo_adquisicion: costoNum,
          cantidad: qtyNum,
          estado: true,
        },
      });

      await logAudit({
        tabla: "movimientos_inventario",
        registroId: nuevoMovimientoId,
        accion: "create",
        userId: uId,
        deviceId: devId,
        valoresNuevos: {
          almacen_id: almacenId,
          producto_id: productoId,
          lote_id: nuevoLoteId,
          usuario_id: uId,
          tipo: "ENTRADA_COMPRA",
          cantidad: qtyNum,
          cantidad_anterior: 0,
          cantidad_posterior: qtyNum,
          referencia: `Entrada de mercancía - Lote ${lote}`,
          device_id: devId,
        },
      });

      // 5. Final stock recalculation to ensure parity
      await recalcularStockLote(nuevoLoteId);

      // Sync to Supabase
      syncApp().catch(console.error);

      if (onSaveSuccess) onSaveSuccess();

      setIsSaving(false);
      resetForm();
      onClose();
    } catch (error: any) {
      console.error("Error Registrando Entrada:", error);
      setError("Error al guardar: " + error.message);
      setIsSaving(false);
    }
  };

  // ── Validación de advertencia de cambio de costo ──
  const calcularDiferenciaCosto = () => {
    if (!costo || ultimoCosto === null || ultimoCosto === 0) return null;
    const current = parseFloat(costo);
    const diff = current - ultimoCosto;
    const perc = (diff / ultimoCosto) * 100;
    return perc;
  };

  const diffPerc = calcularDiferenciaCosto();
  const showCostoAlerta = diffPerc !== null && Math.abs(diffPerc) >= 10;

  // ── Calculadora de Lote ──
  const costoNum = parseFloat(costo) || 0;
  const cantidadNum = parseInt(cantidad, 10) || 0;
  const margenPorcentaje = productoMargen?.porcentaje || 0;
  const totalImpuestoPorcentaje = productoImpuestosTasas.reduce(
    (sum, imp) => sum + imp.tasa,
    0,
  );

  const precioBaseConMargen =
    costoNum > 0 ? costoNum * (1 + margenPorcentaje / 100) : 0;
  const precioFinalUnitario =
    precioBaseConMargen > 0
      ? precioBaseConMargen * (1 + totalImpuestoPorcentaje / 100)
      : 0;
  const utilidadPorUnidad = precioBaseConMargen - costoNum;
  const utilidadTotalLote = utilidadPorUnidad * cantidadNum;
  const inversionTotalLote = costoNum * cantidadNum;

  const showCalculadoraLote =
    costoNum > 0 && margenPorcentaje > 0 && cantidadNum > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative z-10 bg-slate-50 dark:bg-slate-900 w-full max-w-4xl max-h-[95vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 px-8 py-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              Registrar Entrada de Mercancía
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ingresa un lote nuevo para un producto existente
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mx-8 mt-4 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-100 dark:border-rose-800 font-medium animate-in fade-in slide-in-from-top-1">
            ⚠️ {error}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              {/* Sección Principal */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-5 flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                    Identificación
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Caducidad
                    </label>
                    <input
                      type="date"
                      className={`${inputClass} text-slate-600 dark:text-slate-300`}
                      value={caducidad}
                      onChange={(e) => setCaducidad(e.target.value)}
                    />
                  </div>
                </div>

                {/* Código Alterno */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-indigo-500" />
                    Códigos Alternos (Escanear + Enter)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Escanea o escribe y pulsa Enter..."
                      value={currentBarcode}
                      onChange={(e) => setCurrentBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const code = currentBarcode.trim();
                          if (code && !codigosAlternos.includes(code)) {
                            setCodigosAlternos([...codigosAlternos, code]);
                            setCurrentBarcode("");
                          }
                        }
                      }}
                    />
                    
                    {/* Tags Display */}
                    <div className="flex flex-wrap gap-2">
                      {codigosAlternos.map((code, idx) => (
                        <div 
                          key={`${code}-${idx}`}
                          className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-in zoom-in-95 duration-200"
                        >
                          <span className="text-xs font-bold tracking-tight">{code}</span>
                          <button
                            type="button"
                            onClick={() => setCodigosAlternos(prev => prev.filter(c => c !== code))}
                            className="hover:text-indigo-900 dark:hover:text-white transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {codigosAlternos.length === 0 && (
                        <p className="text-[10px] text-slate-400 font-medium italic">
                          No hay códigos adicionales registrados
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {productoId &&
                  caducidad &&
                  (() => {
                    const prod = productos.find((p) => p.id === productoId);
                    if (!prod) return null;

                    const umbralVerde = prod.umbralVerdeDias ?? 90;
                    const umbralAmarillo = prod.umbralAmarilloDias ?? 30;

                    const today = new Date();
                    const expDate = new Date(caducidad);
                    const daysRemaining = Math.ceil(
                      (expDate.getTime() - today.getTime()) /
                        (1000 * 60 * 60 * 24),
                    );
                    let levelColor = "emerald";
                    let levelText = "OK — Verde";
                    if (daysRemaining <= 0) {
                      levelColor = "slate";
                      levelText = "VENCIDO — Negro";
                    } else if (daysRemaining <= umbralAmarillo) {
                      levelColor = "rose";
                      levelText = `RIESGO — Rojo (${daysRemaining} días)`;
                    } else if (daysRemaining <= umbralVerde) {
                      levelColor = "amber";
                      levelText = `PRECAUCIÓN — Amarillo (${daysRemaining} días)`;
                    } else {
                      levelText = `SEGURO — Verde (${daysRemaining} días)`;
                    }

                    return (
                      <div
                        className={`mt-2 px-4 py-3 rounded-xl border ${daysRemaining <= 0 ? "bg-slate-900 border-black" : `bg-${levelColor}-50 border-${levelColor}-200`}`}
                      >
                        <p
                          className={`text-xs font-bold ${daysRemaining <= 0 ? "text-white" : `text-${levelColor}-700`}`}
                        >
                          ⚡ Aviso Caducidad: {levelText}
                        </p>
                      </div>
                    );
                  })()}
              </div>

              {/* Operación y Costo */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-5 flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                    Cantidades y Costo
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                      placeholder="0.00"
                      value={costo}
                      onChange={(e) => setCosto(e.target.value)}
                    />
                  </div>
                  {ultimoCosto !== null && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Último costo registrado:{" "}
                      <span className="font-semibold">
                        ${ultimoCosto.toFixed(2)}
                      </span>
                    </p>
                  )}
                </div>

                {showCostoAlerta && (
                  <div className="mt-2 flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-700">
                        Alerta de Variación de Costo
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                        El costo ingresado (${costo}) difiere en un{" "}
                        <span className="font-semibold">
                          {Math.abs(diffPerc!).toFixed(2)}%
                        </span>{" "}
                        del último costo registrado ($
                        {ultimoCosto?.toFixed(2)}). Verifica tu información.
                      </p>
                    </div>
                  </div>
                )}

                {/* Info del Margen asignado al producto */}
                {productoId && (
                  <div className="mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Margen asignado:{" "}
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {productoMargen
                          ? `${productoMargen.nombre} (${productoMargen.porcentaje}%)`
                          : "Sin margen"}
                      </span>
                    </p>
                    {productoImpuestosTasas.length > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Impuestos:{" "}
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {productoImpuestosTasas
                            .map((imp) => `${imp.nombre} (${imp.tasa}%)`)
                            .join(", ")}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Calculadora de Lote (full width, below both columns) */}
            {showCalculadoraLote && (
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm font-bold text-indigo-800">
                    Proyección Financiera del Lote
                  </h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Inversión Total
                    </p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">
                      ${inversionTotalLote.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {cantidadNum} × ${costoNum.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Utilidad x Unidad
                    </p>
                    <p className="text-lg font-bold text-emerald-700">
                      ${utilidadPorUnidad.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Margen {margenPorcentaje}%
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Precio Público
                    </p>
                    <p className="text-lg font-bold text-blue-700">
                      ${precioFinalUnitario.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      c/impuestos ({totalImpuestoPorcentaje}%)
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Utilidad del Lote
                    </p>
                    <p className="text-lg font-bold text-emerald-700">
                      ${utilidadTotalLote.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {cantidadNum} × ${utilidadPorUnidad.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-indigo-600 rounded-xl p-4 text-center">
                    <p className="text-xs text-indigo-100 mb-1">
                      Ingreso Esperado
                    </p>
                    <p className="text-xl font-extrabold text-white">
                      ${(precioFinalUnitario * cantidadNum).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-indigo-200">
                      Total del lote
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 p-5 px-8 shrink-0 flex items-center justify-end gap-3 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl font-medium text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 transition-colors disabled:opacity-50"
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
  productos: database.collections
    .get<Producto>("productos")
    .query()
    .observe(),
  almacenes: database.collections
    .get<AlmacenModel>("almacenes")
    .query()
    .observe(),
  familias: database.collections
    .get<FamiliaModel>("familias")
    .query()
    .observe(),
  margenes: database.collections
    .get<MargenModel>("margenes")
    .query()
    .observe(),
  impuestos: database.collections
    .get<ImpuestoModel>("impuestos")
    .query()
    .observe(),
}));

const AddEntry = enhance(AddEntryInner);
export default AddEntry;
