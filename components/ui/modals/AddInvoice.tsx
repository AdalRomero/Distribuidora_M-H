import { Q } from "@nozbe/watermelondb";
import * as Crypto from "expo-crypto";
import {
    AlertCircle,
    Check,
    ChevronDown,
    FileText,
    Loader2,
    Plus,
    Printer,
    Search,
    ShoppingCart,
    Trash2,
    User,
    X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LOGO_MH_B64 } from "../../../constants/logo_base64";
import { useAuth } from "../../../src/context/AuthContext";
import { database } from "../../../src/services/DB/indexBD";
import {
    InvoiceLayoutFlow
} from "./InvoiceBlockRenderer";

interface AddInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  recoverData?: any;
  onSaveSuccess?: () => void;
  readonlyMode?: boolean;
  autoDownloadPDF?: boolean;
  autoDownloadXML?: boolean;
}
interface Concepto {
  id: string;
  cantidad: string;
  unidadSat: string;
  claveSat: string;
  concepto: string;
  valorUnitario: string;
  descuento: string;
  porcImpuesto: string;
  productoId: string;
}
interface InvoiceForm {
  serie: string;
  folio: string;
  fecha: string;
  hora: string;
  tipoComprobante: string;
  lugarExpedicion: string;
  metodoPago: string;
  formaPago: string;
  moneda: string;
  codigoCliente: string;
  nombre: string;
  rfc: string;
  domicilio: string;
  agente: string;
  usoCFDI: string;
  observaciones: string;
  tipoRelacion: string;
  cfdiRelacionado: string;
  conceptos: Concepto[];
  clienteId: string;
}

interface ClienteItem {
  id: string;
  nombre: string;
  rfc: string;
  categoria: string;
  listaPrecioBase: string;
  descuentoGlobal: number;
  contacto: string;
  calle: string;
  colonia: string;
  cp: string;
  ciudad: string;
  estado: boolean;
}
interface ProductoItem {
  id: string;
  codigoInterno: string;
  descripcion: string;
  claveSat: string;
  precioLista: number;
  precioMayoreo: number;
  precioMenudeo: number;
  estado: boolean;
  stock: number;
}
interface PrecioEspecial {
  id: string;
  clienteId: string;
  productoId: string;
  descuentoPorcentaje: number;
  precioFijo: number;
}

const newConcepto = (): Concepto => ({
  id: Math.random().toString(36).slice(2),
  cantidad: "",
  unidadSat: "H87",
  claveSat: "",
  concepto: "",
  valorUnitario: "",
  descuento: "",
  porcImpuesto: "16",
  productoId: "",
});
const initialForm: InvoiceForm = {
  serie: "A",
  folio: "1",
  fecha: new Date().toISOString().split("T")[0],
  hora: new Date().toTimeString().slice(0, 5),
  tipoComprobante: "I",
  lugarExpedicion: "83554",
  metodoPago: "PPD",
  formaPago: "99",
  moneda: "MXN",
  codigoCliente: "",
  nombre: "",
  rfc: "XAXX010101000",
  domicilio: "",
  agente: "",
  usoCFDI: "S01",
  observaciones: "",
  tipoRelacion: "",
  cfdiRelacionado: "",
  conceptos: [newConcepto()],
  clienteId: "",
};

const inputClass =
  "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";
const labelClass =
  "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5";

function calcConcepto(c: Concepto) {
  const cant = parseFloat(c.cantidad) || 0;
  const vu = parseFloat(c.valorUnitario) || 0;
  const descPorc = parseFloat(c.descuento) || 0;
  const porc = parseFloat(c.porcImpuesto) || 0;
  const subtotal = cant * vu;
  const descMonto = subtotal * (descPorc / 100);
  const baseGravable = subtotal - descMonto;
  const impuestos = baseGravable * (porc / 100);
  const total = baseGravable + impuestos;
  return { subtotal, descMonto, impuestos, total };
}
const fmt = (n: number) =>
  n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
function toLetras(num: number): string {
  if (num === 0) return "CERO PESOS 00/100 M.N.";
  const entero = Math.floor(num);
  const dec = Math.round((num - entero) * 100);
  return `${entero.toLocaleString()} PESOS ${dec.toString().padStart(2, "0")}/100 M.N.`;
}

// ==========================================
// DROPDOWN BUSCABLE REUTILIZABLE
// ==========================================
function SearchableDropdown<T extends { id: string }>({
  items,
  value,
  onChange,
  renderItem,
  renderSelected,
  placeholder,
  searchPlaceholder,
  disabled,
}: {
  items: T[];
  value: string;
  onChange: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  renderSelected: (item: T) => string;
  placeholder: string;
  searchPlaceholder: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const selected = items.find((i) => i.id === value);
  const filtered = items.filter((i) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return JSON.stringify(i).toLowerCase().includes(s);
  });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`${inputClass} flex items-center justify-between gap-2 text-left ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={
            selected ? "text-slate-700 dark:text-slate-200" : "text-slate-400"
          }
        >
          {selected ? renderSelected(selected) : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border-none rounded-lg outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">
                Sin resultados
              </div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${item.id === value ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}
                >
                  {renderItem(item)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddInvoice({
  isOpen,
  onClose,
  recoverData,
  onSaveSuccess,
  readonlyMode,
  autoDownloadPDF,
  autoDownloadXML,
}: AddInvoiceProps) {
  const { userId } = useAuth();
  const [form, setForm] = useState<InvoiceForm>(initialForm);
  const [viewMode, setViewMode] = useState<"simultaneous" | "tabular">(
    "simultaneous",
  );
  const [step, setStep] = useState<"capture" | "preview">("capture");
  const previewRef = useRef<HTMLDivElement>(null);

  // Data from DB
  const [clientes, setClientes] = useState<ClienteItem[]>([]);
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [preciosEspeciales, setPreciosEspeciales] = useState<PrecioEspecial[]>(
    [],
  );
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [invoiceLayout, setInvoiceLayout] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ==========================================
  // CARGAR DATOS AL ABRIR
  // ==========================================
  useEffect(() => {
    if (isOpen) {
      loadData();
      if (readonlyMode) {
        setViewMode("tabular");
        setStep("preview");
      }
    } else {
      setViewMode("simultaneous");
      setStep("capture");
    }
  }, [isOpen, readonlyMode]);

  // ==========================================
  // AUTO DOWNLOAD (PDF / XML)
  // ==========================================
  useEffect(() => {
    if (isOpen && readonlyMode && !isLoadingData) {
      if (autoDownloadPDF) {
        const timer = setTimeout(() => {
          handleDownloadPDF().then(() => onClose());
        }, 800);
        return () => clearTimeout(timer);
      }
      if (autoDownloadXML) {
        const timer = setTimeout(() => {
          handleDownloadXML();
          onClose();
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, readonlyMode, autoDownloadPDF, autoDownloadXML, isLoadingData]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const clientesDb = database.collections.get("clientes");
      const productosDb = database.collections.get("productos");
      const preciosDb = database.collections.get("precios_especiales_clientes");

      const lotesDb = database.collections.get("lotes");
      const [allC, allP, allPE, allL] = await Promise.all([
        clientesDb.query().fetch(),
        productosDb.query().fetch(),
        preciosDb.query().fetch(),
        lotesDb.query(Q.where("estado", true)).fetch(),
      ]);

      const stockMap: Record<string, number> = {};
      allL.forEach((lote: any) => {
        const pid = lote._raw.producto_id;
        stockMap[pid] = (stockMap[pid] || 0) + (lote.cantidad || 0);
      });

      setClientes(
        allC.map((c: any) => ({
          id: c.id,
          nombre: c.nombre || "",
          rfc: c.rfc || "",
          categoria: c.categoria || "General",
          listaPrecioBase: c.listaPrecioBase || "lista",
          descuentoGlobal: c.descuentoGlobal || 0,
          contacto: c.contacto || "",
          calle: c.calle || "",
          colonia: c.colonia || "",
          cp: c.cp || "",
          ciudad: c.ciudad || "",
          estado: c.estado,
        })),
      );

      setProductos(
        allP
          .filter((p: any) => p.estado)
          .map((p: any) => ({
            id: p.id,
            codigoInterno: p.codigoInterno || "",
            descripcion: p.descripcion || "",
            claveSat: p.claveSat || "",
            precioLista: p.precioLista || 0,
            precioMayoreo: p.precioMayoreo || 0,
            precioMenudeo: p.precioMenudeo || 0,
            estado: p.estado,
            stock: stockMap[p.id] || 0,
          })),
      );

      setPreciosEspeciales(
        allPE.map((pe: any) => ({
          id: pe.id,
          clienteId: pe._raw.cliente_id || "",
          productoId: pe._raw.producto_id || "",
          descuentoPorcentaje: pe.descuentoPorcentaje || 0,
          precioFijo: pe.precioFijo || 0,
        })),
      );

      // Auto-generar folio si es nueva factura (no recovery)
      if (!recoverData) {
        try {
          const docsDb = database.collections.get("documentos");
          const allDocs = await docsDb.query().fetch();
          const nextFolio = String(allDocs.length + 1).padStart(3, "0");
          setForm((prev) => ({ ...prev, folio: nextFolio }));
        } catch {
          /* keep default folio */
        }
      }

      // Cargar plantilla activa de factura
      try {
        const templatesDb = database.collections.get("invoice_templates");
        const allTemplates = (await templatesDb.query().fetch()) as any[];
        const defaultT = allTemplates.find((t: any) => t.isDefault);
        if (defaultT && defaultT.layoutJson) {
          setInvoiceLayout(JSON.parse(defaultT.layoutJson));
        } else if (allTemplates.length > 0 && allTemplates[0].layoutJson) {
          setInvoiceLayout(JSON.parse(allTemplates[0].layoutJson));
        }
      } catch (err) {
        console.error("Error cargando plantilla de factura:", err);
      }
    } catch (err) {
      console.error("Error cargando datos para factura:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Recover data on edit
  useEffect(() => {
    if (recoverData) {
      setForm({
        serie: recoverData.serie || "A",
        folio: recoverData.folio || "1",
        fecha: recoverData.fecha
          ? new Date(recoverData.fecha).toISOString().split("T")[0]
          : initialForm.fecha,
        hora: initialForm.hora,
        tipoComprobante: recoverData.tipoComprobante || "I",
        lugarExpedicion: recoverData.lugarExpedicion || "83554",
        metodoPago: recoverData.metodoPago || "PPD",
        formaPago: recoverData.formaPago || "99",
        moneda: recoverData.moneda || "MXN",
        codigoCliente: recoverData.codigoCliente || "",
        nombre: recoverData.nombre || "",
        rfc: recoverData.rfc || "XAXX010101000",
        domicilio: recoverData.domicilio || "",
        agente: recoverData.agente || "",
        usoCFDI: recoverData.usoCFDI || "S01",
        observaciones: recoverData.observaciones || "",
        tipoRelacion: recoverData.tipoRelacion || "",
        cfdiRelacionado: recoverData.cfdiRelacionado || "",
        clienteId: recoverData.clienteId || "",
        conceptos: recoverData.conceptos?.length
          ? recoverData.conceptos.map((c: any) => ({
              id: Math.random().toString(36).slice(2),
              cantidad: c.cantidad ? String(c.cantidad) : "",
              unidadSat: c.unidadSat || "H87",
              claveSat: c.claveSat || "",
              concepto: c.concepto || "",
              valorUnitario: c.valorUnitario ? String(c.valorUnitario) : "",
              descuento: c.descuento ? String(c.descuento) : "",
              porcImpuesto: c.porcImpuesto ? String(c.porcImpuesto) : "16",
              productoId: c.productoId || "",
            }))
          : [newConcepto()],
      });
    }
  }, [recoverData]);

  // ==========================================
  // SELECCIÓN DE CLIENTE → AUTO-FILL
  // ==========================================
  const handleSelectCliente = (cliente: ClienteItem) => {
    const direccion = [
      cliente.calle,
      cliente.colonia,
      cliente.cp,
      cliente.ciudad,
    ]
      .filter(Boolean)
      .join(", ");
    setForm((prev) => ({
      ...prev,
      clienteId: cliente.id,
      codigoCliente: cliente.id.slice(0, 6).toUpperCase(),
      nombre: cliente.nombre,
      rfc: cliente.rfc || "XAXX010101000",
      domicilio: direccion,
    }));
  };

  // ==========================================
  // SELECCIÓN DE PRODUCTO → AUTO-FILL CONCEPTO
  // ==========================================
  const handleSelectProducto = (conceptoId: string, producto: ProductoItem) => {
    const selectedCliente = clientes.find((c) => c.id === form.clienteId);

    // Buscar precio especial para este cliente+producto
    const precioEsp = preciosEspeciales.find(
      (pe) => pe.clienteId === form.clienteId && pe.productoId === producto.id,
    );

    let precio = producto.precioLista; // default
    let descuento = "";

    let descuentoTotal = 0;

    if (selectedCliente) {
      // Determinar precio según lista del cliente
      switch (selectedCliente.listaPrecioBase) {
        case "mayoreo":
          precio = producto.precioMayoreo || producto.precioLista;
          break;
        case "menudeo":
          precio = producto.precioMenudeo || producto.precioLista;
          break;
        default:
          precio = producto.precioLista;
          break;
      }

      // Acumular descuento global del cliente si existe
      if (selectedCliente.descuentoGlobal > 0) {
        descuentoTotal += selectedCliente.descuentoGlobal;
      }
    }

    // Agregar precio especial / descuento especial acumulado
    if (precioEsp) {
      if (precioEsp.precioFijo > 0) {
        precio = precioEsp.precioFijo;
      } else if (precioEsp.descuentoPorcentaje > 0) {
        descuentoTotal += precioEsp.descuentoPorcentaje;
      }
    }

    if (descuentoTotal > 0) {
      descuento = String(descuentoTotal);
    }

    setForm((prev) => ({
      ...prev,
      conceptos: prev.conceptos.map((c) =>
        c.id === conceptoId
          ? {
              ...c,
              productoId: producto.id,
              concepto: producto.descripcion,
              claveSat: producto.claveSat,
              valorUnitario: String(precio),
              descuento: descuento,
            }
          : c,
      ),
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleClose = () => {
    setForm(initialForm);
    setSaveError(null);
    setSaveSuccess(false);
    onClose();
  };
  const updateConcepto = (id: string, field: keyof Concepto, value: string) => {
    setForm((prev) => ({
      ...prev,
      conceptos: prev.conceptos.map((c) =>
        c.id === id ? { ...c, [field]: value } : c,
      ),
    }));
  };
  const addConcepto = () =>
    setForm((prev) => ({
      ...prev,
      conceptos: [...prev.conceptos, newConcepto()],
    }));

  // ==========================================
  // GENERAR FACTURA: Guardar en DB + PDF
  // ==========================================
  const handleGenerateInvoice = async () => {
    setSaveError(null);
    setSaveSuccess(false);

    // Validaciones
    const conceptosValidos = form.conceptos.filter(
      (c) =>
        c.concepto.trim() &&
        parseFloat(c.cantidad) > 0 &&
        parseFloat(c.valorUnitario) > 0,
    );
    if (conceptosValidos.length === 0) {
      setSaveError(
        "Agrega al menos un concepto con cantidad y valor unitario.",
      );
      return;
    }
    if (!form.nombre.trim()) {
      setSaveError("Selecciona o escribe el nombre del cliente.");
      return;
    }

    // Validación de inventario agrupando cantidades por producto
    const cantidadesPorProducto: Record<string, number> = {};
    for (const c of conceptosValidos) {
      if (c.productoId && c.productoId !== "manual") {
        cantidadesPorProducto[c.productoId] =
          (cantidadesPorProducto[c.productoId] || 0) + parseFloat(c.cantidad);
      }
    }

    for (const [prodId, cant] of Object.entries(cantidadesPorProducto)) {
      const prod = productos.find((p) => p.id === prodId);
      if (prod && cant > prod.stock) {
        setSaveError(
          `Inventario insuficiente para el producto "${prod.descripcion}". Stock disponible: ${prod.stock}, Cantidad solicitada en total: ${cant}`,
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const folioCompleto = `${form.serie}-${form.folio}`;

      await database.write(async () => {
        const docId = Crypto.randomUUID();

        // 1. Crear documento principal
        const docsCollection = database.collections.get("documentos");
        await docsCollection.create((doc: any) => {
          doc._raw.id = docId;
          doc._raw.cliente_id = form.clienteId || "publico_general";
          doc._raw.usuario_id = userId || "unknown";
          doc.tipo = "factura";
          doc._raw.tipo = "factura";
          doc.folio = folioCompleto;
          doc._raw.folio = folioCompleto;
          doc.estado = "generada";
          doc._raw.estado = "generada";
          doc.subtotal = totalSubtotal;
          doc._raw.subtotal = totalSubtotal;
          doc.total_impuestos = totalImpuestos;
          doc._raw.total_impuestos = totalImpuestos;
          doc.total = totalFinal;
          doc._raw.total = totalFinal;
        });

        // 2. Crear detalles por cada concepto válido y procesar inventario
        const detallesCollection = database.collections.get(
          "documentos_detalles",
        );
        const lotesCollection = database.collections.get("lotes");
        const movsCollection = database.collections.get(
          "movimientos_inventario",
        );

        for (const concepto of conceptosValidos) {
          const detalleId = Crypto.randomUUID();
          const calc = calcConcepto(concepto);
          await detallesCollection.create((det: any) => {
            det._raw.id = detalleId;
            det._raw.documento_id = docId;
            det._raw.producto_id = concepto.productoId || "manual";
            det.cantidad = parseFloat(concepto.cantidad);
            det._raw.cantidad = parseFloat(concepto.cantidad);
            det.descripcion_aplicada = concepto.concepto;
            det._raw.descripcion_aplicada = concepto.concepto;
            det.precio_unitario_aplicado = parseFloat(concepto.valorUnitario);
            det._raw.precio_unitario_aplicado = parseFloat(
              concepto.valorUnitario,
            );
            det.descuento_aplicado = calc.descMonto;
            det._raw.descuento_aplicado = calc.descMonto;
            const impJson = JSON.stringify({
              iva: parseFloat(concepto.porcImpuesto) || 0,
              montoIva: calc.impuestos,
            });
            det.json_impuestos_aplicados = impJson;
            det._raw.json_impuestos_aplicados = impJson;
          });

          // 3. Deducción de inventario (FIFO) si no es concepto manual
          if (concepto.productoId && concepto.productoId !== "manual") {
            let cantDeducir = parseFloat(concepto.cantidad);

            // Obtener lotes activos del producto
            const lotesProducto = await lotesCollection
              .query(
                Q.where("producto_id", concepto.productoId),
                Q.where("estado", true),
              )
              .fetch();

            // Ordenar por fecha de caducidad (FIFO)
            const lotesOrdenados = lotesProducto.sort((a: any, b: any) => {
              const dateA = a.fecha_caducidad || Number.MAX_SAFE_INTEGER;
              const dateB = b.fecha_caducidad || Number.MAX_SAFE_INTEGER;
              return dateA - dateB;
            });

            for (const lote of lotesOrdenados as any[]) {
              if (cantDeducir <= 0) break;
              if (lote.cantidad <= 0) continue;

              const descuentoActual = Math.min(lote.cantidad, cantDeducir);
              const nuevaCantidadLote = lote.cantidad - descuentoActual;

              // Actualizar lote
              await lote.update((l: any) => {
                l.cantidad = nuevaCantidadLote;
                l._raw.cantidad = nuevaCantidadLote;
              });

              // Registrar movimiento
              await movsCollection.create((mov: any) => {
                mov._raw.id = Crypto.randomUUID();
                mov._raw.almacen_id = "default";
                mov._raw.producto_id = concepto.productoId;
                mov._raw.lote_id = lote.id;
                mov._raw.usuario_id = userId || "unknown";
                mov.tipo = "SALIDA_VENTA";
                mov._raw.tipo = "SALIDA_VENTA";
                mov.cantidad = descuentoActual;
                mov._raw.cantidad = descuentoActual;
              });

              cantDeducir -= descuentoActual;
            }

            if (cantDeducir > 0) {
              throw new Error(
                `Inconsistencia en lotes para ${concepto.concepto}`,
              );
            }
          }
        }
      });

      setSaveSuccess(true);
      if (onSaveSuccess) onSaveSuccess();

      // Generar y descargar PDF
      await handleDownloadPDF();
    } catch (err: any) {
      console.error("Error al guardar factura:", err);
      setSaveError("Error al guardar: " + (err.message || "Error desconocido"));
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // DESCARGAR PDF
  // ==========================================
  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;

    try {
      // @ts-ignore — html2pdf.js no tiene types oficiales
      const html2pdf = (await import("html2pdf.js")).default;

      const element = previewRef.current;
      const folioName = `Factura_${form.serie}-${form.folio}_${form.nombre.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}`;

      const opt = {
        margin: [4, 4, 4, 4] as [number, number, number, number],
        filename: `${folioName}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          logging: false,
          windowWidth: 800,
        },
        jsPDF: {
          unit: "mm",
          format: "letter",
          orientation: "portrait" as const,
        },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Error al generar PDF:", err);
      // Fallback: abrir ventana de impresión
      const printWindow = window.open("", "_blank", "width=800,height=1000");
      if (printWindow && previewRef.current) {
        printWindow.document.write(
          `<html><head><title>Factura ${form.serie}-${form.folio}</title><style>body{margin:0;padding:16px;font-family:Arial,sans-serif;}</style></head><body>${previewRef.current.innerHTML}</body></html>`,
        );
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };
  // ==========================================
  // DESCARGAR XML
  // ==========================================
  const handleDownloadXML = () => {
    const xmlString = `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="${form.serie}" Folio="${form.folio}" Fecha="${form.fecha}T${form.hora}:00" FormaPago="${form.formaPago}" SubTotal="${totalSubtotal.toFixed(2)}" Moneda="${form.moneda}" Total="${totalFinal.toFixed(2)}" TipoDeComprobante="${form.tipoComprobante}" MetodoPago="${form.metodoPago}" LugarExpedicion="${form.lugarExpedicion}">
  <cfdi:Emisor Rfc="MICV9209288D2" Nombre="VIANEY OMARA MIRANDA CASTRO" RegimenFiscal="612" />
  <cfdi:Receptor Rfc="${form.rfc || "XAXX010101000"}" Nombre="${form.nombre}" DomicilioFiscalReceptor="${form.domicilio}" UsoCFDI="${form.usoCFDI}" />
  <cfdi:Conceptos>
    ${form.conceptos
      .map((c) => {
        const { subtotal, descMonto, impuestos } = calcConcepto(c);
        return `<cfdi:Concepto ClaveProdServ="${c.claveSat}" Cantidad="${c.cantidad}" ClaveUnidad="${c.unidadSat}" Descripcion="${c.concepto}" ValorUnitario="${parseFloat(c.valorUnitario).toFixed(2)}" Importe="${subtotal.toFixed(2)}" Descuento="${descMonto.toFixed(2)}">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${(subtotal - descMonto).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${(parseFloat(c.porcImpuesto) / 100).toFixed(6)}" Importe="${impuestos.toFixed(2)}" />
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
      })
      .join("\n    ")}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${totalImpuestos.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${(totalSubtotal - totalDesc).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${totalImpuestos.toFixed(2)}" />
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;

    const blob = new Blob([xmlString], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const folioName = `Factura_${form.serie}-${form.folio}_${form.nombre.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}`;
    a.download = `${folioName}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeConcepto = (id: string) =>
    setForm((prev) => ({
      ...prev,
      conceptos: prev.conceptos.filter((c) => c.id !== id),
    }));

  const totalSubtotal = form.conceptos.reduce(
    (s, c) => s + calcConcepto(c).subtotal,
    0,
  );
  const totalDesc = form.conceptos.reduce(
    (s, c) => s + calcConcepto(c).descMonto,
    0,
  );
  const totalImpuestos = form.conceptos.reduce(
    (s, c) => s + calcConcepto(c).impuestos,
    0,
  );
  const totalFinal = form.conceptos.reduce(
    (s, c) => s + calcConcepto(c).total,
    0,
  );

  // Clientes activos solamente
  const clientesActivos = clientes.filter((c) => c.estado);

  // Badge del precio aplicado
  const getPriceBadge = (conceptoProductoId: string) => {
    if (!form.clienteId || !conceptoProductoId) return null;
    const pe = preciosEspeciales.find(
      (p) =>
        p.clienteId === form.clienteId && p.productoId === conceptoProductoId,
    );
    const cliente = clientes.find((c) => c.id === form.clienteId);

    if (pe && pe.precioFijo > 0)
      return (
        <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-[9px] font-bold">
          Precio Especial
        </span>
      );
    if (pe && pe.descuentoPorcentaje > 0)
      return (
        <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[9px] font-bold">
          Desc. Especial {pe.descuentoPorcentaje}%
        </span>
      );
    if (cliente && cliente.descuentoGlobal > 0)
      return (
        <span className="ml-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[9px] font-bold">
          Desc. Global {cliente.descuentoGlobal}%
        </span>
      );
    if (cliente) {
      const lbl =
        cliente.listaPrecioBase === "mayoreo"
          ? "Mayoreo"
          : cliente.listaPrecioBase === "menudeo"
            ? "Menudeo"
            : "Lista";
      return (
        <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded text-[9px] font-bold">
          {lbl}
        </span>
      );
    }
    return null;
  };

  const renderFormCards = (isTabular: boolean) => (
    <>
      {/* Card 1: Datos del Comprobante */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
            Datos del Comprobante
          </h4>
        </div>
        <div
          className={`grid gap-3 ${isTabular ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-2"}`}
        >
          <div>
            <label className={labelClass}>Serie</label>
            <input
              type="text"
              name="serie"
              value={form.serie}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Folio</label>
            <input
              type="text"
              name="folio"
              value={form.folio}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fecha</label>
            <input
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Hora</label>
            <input
              type="time"
              name="hora"
              value={form.hora}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tipo de Comprobante</label>
            <select
              name="tipoComprobante"
              value={form.tipoComprobante}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="I">I — Ingreso</option>
              <option value="E">E — Egreso</option>
              <option value="T">T — Traslado</option>
              <option value="N">N — Nómina</option>
              <option value="P">P — Pago</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Lugar de Expedición (CP)</label>
            <input
              type="text"
              name="lugarExpedicion"
              value={form.lugarExpedicion}
              onChange={handleChange}
              className={inputClass}
              placeholder="83554"
            />
          </div>
          <div>
            <label className={labelClass}>Método de Pago</label>
            <select
              name="metodoPago"
              value={form.metodoPago}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="PPD">
                PPD — Pago en Parcialidades o Diferido
              </option>
              <option value="PUE">PUE — Pago en Una Sola Exhibición</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Forma de Pago</label>
            <select
              name="formaPago"
              value={form.formaPago}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="99">99 — Por Definir</option>
              <option value="01">01 — Efectivo</option>
              <option value="02">02 — Cheque nominativo</option>
              <option value="03">03 — Transferencia electrónica</option>
              <option value="04">04 — Tarjeta de crédito</option>
              <option value="28">28 — Tarjeta de débito</option>
            </select>
          </div>
          <div
            className={isTabular ? "col-span-2 lg:col-span-2" : "col-span-2"}
          >
            <label className={labelClass}>Moneda</label>
            <select
              name="moneda"
              value={form.moneda}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="MXN">MXN — Peso Mexicano</option>
              <option value="USD">USD — Dólar Americano</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Card 2: Datos del Receptor */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
            Datos del Cliente (Receptor)
          </h4>
        </div>

        <div className="mb-3">
          <label className={labelClass}>Seleccionar Cliente Registrado</label>
          <SearchableDropdown<ClienteItem>
            items={clientesActivos}
            value={form.clienteId}
            onChange={handleSelectCliente}
            renderItem={(c) => (
              <div>
                <span className="font-semibold">{c.nombre}</span>
                <span className="text-slate-400 ml-2">
                  RFC: {c.rfc || "N/A"}
                </span>
                <span className="text-slate-400 ml-2">— {c.categoria}</span>
              </div>
            )}
            renderSelected={(c) => `${c.nombre} (${c.rfc || "Sin RFC"})`}
            placeholder="— Seleccionar cliente —"
            searchPlaceholder="Buscar por nombre o RFC..."
            disabled={isLoadingData}
          />
          {form.clienteId && (
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {(() => {
                const cl = clientes.find((c) => c.id === form.clienteId);
                if (!cl) return null;
                const lbl =
                  cl.listaPrecioBase === "mayoreo"
                    ? "Mayoreo"
                    : cl.listaPrecioBase === "menudeo"
                      ? "Menudeo"
                      : "Lista";
                return (
                  <>
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded text-[10px] font-bold border border-blue-100 dark:border-blue-800">
                      Lista: {lbl}
                    </span>
                    {cl.descuentoGlobal > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-bold border border-emerald-100 dark:border-emerald-800">
                        Desc. Global: {cl.descuentoGlobal}%
                      </span>
                    )}
                    {preciosEspeciales.filter((pe) => pe.clienteId === cl.id)
                      .length > 0 && (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded text-[10px] font-bold border border-amber-100 dark:border-amber-800">
                        {
                          preciosEspeciales.filter(
                            (pe) => pe.clienteId === cl.id,
                          ).length
                        }{" "}
                        precio(s) especial(es)
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div
          className={`grid gap-3 ${isTabular ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2"}`}
        >
          <div>
            <label className={labelClass}>Código de Cliente</label>
            <input
              type="text"
              name="codigoCliente"
              value={form.codigoCliente}
              onChange={handleChange}
              className={inputClass}
              placeholder="000001"
            />
          </div>
          <div>
            <label className={labelClass}>Nombre / Razón Social</label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              className={inputClass}
              placeholder="Ej: Panadería La Esperanza"
            />
          </div>
          <div>
            <label className={labelClass}>RFC</label>
            <input
              type="text"
              name="rfc"
              value={form.rfc}
              onChange={handleChange}
              className={inputClass}
              placeholder="XAXX010101000"
            />
          </div>
          <div>
            <label className={labelClass}>Agente</label>
            <input
              type="text"
              name="agente"
              value={form.agente}
              onChange={handleChange}
              className={inputClass}
              placeholder="Nombre del agente"
            />
          </div>
          <div className={isTabular ? "col-span-2" : "col-span-2"}>
            <label className={labelClass}>Domicilio Completo</label>
            <input
              type="text"
              name="domicilio"
              value={form.domicilio}
              onChange={handleChange}
              className={inputClass}
              placeholder="Calle, Número, Colonia, Ciudad, Estado, CP"
            />
          </div>
          <div>
            <label className={labelClass}>Uso CFDI</label>
            <select
              name="usoCFDI"
              value={form.usoCFDI}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="S01">S01 — Sin efectos fiscales</option>
              <option value="G01">G01 — Adquisición de mercancias</option>
              <option value="G03">G03 — Gastos en general</option>
              <option value="P01">P01 — Por definir</option>
              <option value="CP01">CP01 — Pagos</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Observaciones</label>
            <input
              type="text"
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              className={inputClass}
              placeholder="Notas adicionales"
            />
          </div>
          <div>
            <label className={labelClass}>Tipo Relación</label>
            <select
              name="tipoRelacion"
              value={form.tipoRelacion}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">— Ninguna —</option>
              <option value="01">01 — Nota de crédito</option>
              <option value="04">04 — Sustitución</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>CFDI Relacionado</label>
            <input
              type="text"
              name="cfdiRelacionado"
              value={form.cfdiRelacionado}
              onChange={handleChange}
              className={inputClass}
              placeholder="UUID del comprobante"
            />
          </div>
        </div>
      </div>

      {/* Card 3: Conceptos */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
              Conceptos (Items)
            </h4>
          </div>
          <button
            type="button"
            onClick={addConcepto}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" /> Agregar
          </button>
        </div>
        {isTabular ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-slate-700">
                  <th className="p-2 font-medium min-w-[200px]">Producto</th>
                  <th className="p-2 font-medium w-24">Cantidad</th>
                  <th className="p-2 font-medium w-24">U. SAT</th>
                  <th className="p-2 font-medium w-28">C. SAT</th>
                  <th className="p-2 font-medium min-w-[200px]">Concepto</th>
                  <th className="p-2 font-medium w-32">V. Unitario</th>
                  <th className="p-2 font-medium w-28">Descuento</th>
                  <th className="p-2 font-medium w-24">% Imp.</th>
                  <th className="p-2 font-medium w-12 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {form.conceptos.map((c, idx) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-2 align-top">
                      <SearchableDropdown<ProductoItem>
                        items={productos}
                        value={c.productoId}
                        onChange={(prod) => handleSelectProducto(c.id, prod)}
                        renderItem={(p) => (
                          <div className="flex justify-between items-center gap-4">
                            <span>
                              <span className="font-mono text-[10px] text-slate-400 mr-1.5">
                                {p.codigoInterno}
                              </span>
                              {p.descripcion}
                            </span>
                            <span className="text-slate-400 shrink-0">
                              ${p.precioLista.toFixed(2)}
                            </span>
                          </div>
                        )}
                        renderSelected={(p) =>
                          `${p.codigoInterno} — ${p.descripcion}`
                        }
                        placeholder="— Buscar —"
                        searchPlaceholder="Código o descripción..."
                        disabled={isLoadingData}
                      />
                      {getPriceBadge(c.productoId) && (
                        <div className="mt-1">
                          {getPriceBadge(c.productoId)}
                        </div>
                      )}
                    </td>
                    <td className="p-2 align-top">
                      <input
                        type="number"
                        value={c.cantidad}
                        onChange={(e) =>
                          updateConcepto(c.id, "cantidad", e.target.value)
                        }
                        className={inputClass}
                        placeholder="1"
                      />
                    </td>
                    <td className="p-2 align-top">
                      <input
                        type="text"
                        value={c.unidadSat}
                        onChange={(e) =>
                          updateConcepto(c.id, "unidadSat", e.target.value)
                        }
                        className={inputClass}
                        placeholder="H87"
                      />
                    </td>
                    <td className="p-2 align-top">
                      <input
                        type="text"
                        value={c.claveSat}
                        onChange={(e) =>
                          updateConcepto(c.id, "claveSat", e.target.value)
                        }
                        className={inputClass}
                        placeholder="50171529"
                      />
                    </td>
                    <td className="p-2 align-top">
                      <input
                        type="text"
                        value={c.concepto}
                        onChange={(e) =>
                          updateConcepto(c.id, "concepto", e.target.value)
                        }
                        className={inputClass}
                        placeholder="Concepto"
                      />
                    </td>
                    <td className="p-2 align-top">
                      <input
                        type="number"
                        value={c.valorUnitario}
                        onChange={(e) =>
                          updateConcepto(c.id, "valorUnitario", e.target.value)
                        }
                        className={inputClass}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2 align-top">
                      <input
                        type="number"
                        value={c.descuento}
                        onChange={(e) =>
                          updateConcepto(c.id, "descuento", e.target.value)
                        }
                        className={inputClass}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2 align-top">
                      <select
                        value={c.porcImpuesto}
                        onChange={(e) =>
                          updateConcepto(c.id, "porcImpuesto", e.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="16">16%</option>
                        <option value="8">8%</option>
                        <option value="0">0%</option>
                      </select>
                    </td>
                    <td className="p-2 text-center align-top">
                      {form.conceptos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeConcepto(c.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors mt-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4">
            {form.conceptos.map((c, idx) => (
              <div
                key={c.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Artículo #{idx + 1}
                    </span>
                    {getPriceBadge(c.productoId)}
                  </div>
                  {form.conceptos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeConcepto(c.id)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Selector de producto */}
                <div className="mb-2">
                  <label className={labelClass}>Seleccionar Producto</label>
                  <SearchableDropdown<ProductoItem>
                    items={productos}
                    value={c.productoId}
                    onChange={(prod) => handleSelectProducto(c.id, prod)}
                    renderItem={(p) => (
                      <div className="flex justify-between items-center gap-4">
                        <span>
                          <span className="font-mono text-[10px] text-slate-400 mr-1.5">
                            {p.codigoInterno}
                          </span>
                          {p.descripcion}
                        </span>
                        <span className="text-slate-400 shrink-0">
                          ${p.precioLista.toFixed(2)}
                        </span>
                      </div>
                    )}
                    renderSelected={(p) =>
                      `${p.codigoInterno} — ${p.descripcion}`
                    }
                    placeholder="— Buscar producto —"
                    searchPlaceholder="Código o descripción..."
                    disabled={isLoadingData}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelClass}>Cantidad</label>
                    <input
                      type="number"
                      value={c.cantidad}
                      onChange={(e) =>
                        updateConcepto(c.id, "cantidad", e.target.value)
                      }
                      className={inputClass}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Unidad SAT</label>
                    <input
                      type="text"
                      value={c.unidadSat}
                      onChange={(e) =>
                        updateConcepto(c.id, "unidadSat", e.target.value)
                      }
                      className={inputClass}
                      placeholder="H87"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Clave SAT</label>
                    <input
                      type="text"
                      value={c.claveSat}
                      onChange={(e) =>
                        updateConcepto(c.id, "claveSat", e.target.value)
                      }
                      className={inputClass}
                      placeholder="50171529"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className={labelClass}>Concepto (Descripción)</label>
                    <input
                      type="text"
                      value={c.concepto}
                      onChange={(e) =>
                        updateConcepto(c.id, "concepto", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Describe el producto o servicio"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Valor Unitario</label>
                    <input
                      type="number"
                      value={c.valorUnitario}
                      onChange={(e) =>
                        updateConcepto(c.id, "valorUnitario", e.target.value)
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Descuento</label>
                    <input
                      type="number"
                      value={c.descuento}
                      onChange={(e) =>
                        updateConcepto(c.id, "descuento", e.target.value)
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>% Impuesto</label>
                    <select
                      value={c.porcImpuesto}
                      onChange={(e) =>
                        updateConcepto(c.id, "porcImpuesto", e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="16">16% IVA</option>
                      <option value="8">8% IVA</option>
                      <option value="0">0% Exento</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderPDFPreview = () => {
    if (invoiceLayout && invoiceLayout.length > 0) {
      return (
        <div
          ref={previewRef}
          className="bg-white shadow-lg mx-auto relative text-slate-950"
          style={{
            width: 680,
            minHeight: 880,
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: "24px 20px",
            boxSizing: "border-box",
          }}
        >
          <InvoiceLayoutFlow
            layout={invoiceLayout}
            form={form}
            calcConcepto={calcConcepto}
            totals={{ totalSubtotal, totalDesc, totalImpuestos, totalFinal }}
            pageSize="letter"
          />
        </div>
      );
    }
    return (
      <div
        ref={previewRef}
        className="bg-white shadow-lg mx-auto"
        style={{
          width: 680,
          minHeight: 880,
          fontFamily: "Arial, sans-serif",
          fontSize: 8,
          lineHeight: 1.4,
          color: "#000",
          padding: "12px 16px 20px",
        }}
      >
        {/* =============== HEADER: Logo + Emisor + Factura =============== */}
        <div style={{ display: "flex", marginBottom: 8 }}>
          {/* Logo */}
          <div
            style={{
              width: 110,
              flexShrink: 0,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingTop: 6,
            }}
          >
            <img
              src={`data:image/svg+xml;base64,${LOGO_MH_B64}`}
              alt="Logo MH"
              style={{ width: 72, height: 72, objectFit: "contain" }}
            />
          </div>
          {/* Emisor Info */}
          <div style={{ flex: 1, textAlign: "center", paddingTop: 4 }}>
            <p
              style={{
                fontWeight: "bold",
                fontSize: 12,
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              VIANEY OMARA MIRANDA CASTRO
            </p>
            <p style={{ marginBottom: 1 }}>MICV9209288D2</p>
            <p style={{ marginBottom: 1 }}>
              612 Personas Físicas con Actividades Empresariales y Profesionales
            </p>
            <p style={{ marginBottom: 1 }}>
              Blvd. Samuel Ocaña entre Puerto de Ensenada y Vicente
            </p>
            <p style={{ marginBottom: 1 }}>
              Suarez 400&apos;2 Col Lopez Portillo CP. 83556
            </p>
            <p style={{ marginBottom: 3 }}>Puerto Peñasco, Sonora, Mexico</p>
            <p style={{ marginBottom: 0 }}>Tel: 638 102 1180</p>
          </div>
          {/* Factura Info */}
          <div
            style={{
              width: 175,
              flexShrink: 0,
              textAlign: "left",
              paddingTop: 2,
              fontSize: 8,
            }}
          >
            <p style={{ fontWeight: "bold", fontSize: 11, marginBottom: 6 }}>
              Factura
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "1px 0", whiteSpace: "nowrap" }}>
                    Serie: {form.serie || "MH"}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "1px 0" }}>
                    Folio: {form.folio || "—"}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "1px 0" }}>Fecha: {form.fecha}</td>
                </tr>
                <tr>
                  <td style={{ padding: "1px 0" }}>Hora: {form.hora}</td>
                </tr>
                <tr>
                  <td style={{ padding: "1px 0", lineHeight: 1.2 }}>
                    Tipo de compro-
                    <br />
                    bante: &nbsp;&nbsp;{form.tipoComprobante || "I"}- Ingreso
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "1px 0", lineHeight: 1.2 }}>
                    Lugar de
                    <br />
                    expedición CP: {form.lugarExpedicion || "83556"}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "1px 0" }}>
                    Versión del comprobante: 4.0
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* =============== DATOS DEL CLIENTE =============== */}
        <div
          style={{
            border: "1px solid #000",
            padding: "4px 8px",
            marginBottom: 8,
            fontSize: 8,
          }}
        >
          <p style={{ marginBottom: 4 }}>
            <b>Datos del cliente:</b>
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 2,
            }}
          >
            <span>Codigo Cliente: {form.codigoCliente || "01023"}</span>
            <span>Agente: {form.agente || "1"}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 2,
            }}
          >
            <span>Cliente: {form.nombre || "Publico en General"}</span>
            <span>Uso CFDI: {form.usoCFDI || "S01"} Sin efectos fiscales</span>
          </div>
          <div style={{ marginBottom: 2 }}>
            RFC: {form.rfc || "XAXX010101000"}
          </div>
          <div style={{ marginBottom: 3 }}>
            Domicilio:{" "}
            {form.domicilio ||
              "AVE. PUERTO DE ENSENADA S/N LOPEZ PORTILLO  C.P. 83556 PTO. PEÑASCO, SONORA, MEXICO"}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 2,
            }}
          >
            <span>
              Método de pago: {form.metodoPago || "PPD"}-Pago en parcialidades o
              diferido
            </span>
            <span>Forma de pago: {form.formaPago || "99"} - Por definir</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Moneda: {form.moneda || "MXN"} - Peso Mexicano</span>
            <span>Observaciones: {form.observaciones || ""}</span>
          </div>
        </div>

        {/* =============== TABLA DE CONCEPTOS =============== */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #000",
            fontSize: 7,
            marginBottom: 8,
          }}
        >
          <thead>
            <tr style={{ background: "#e0e0e0" }}>
              {[
                { h: "CANT", w: 30 },
                { h: "UNIDAD\nSAT", w: 40 },
                { h: "CLAVE\nSAT", w: 45 },
                { h: "CONCEPTO" },
                { h: "V.U.", w: 48 },
                { h: "DESC", w: 30 },
                { h: "SUBTOT\nAL", w: 52 },
                { h: "PORC.\nIMP", w: 32 },
                { h: "IMPUESTOS", w: 65 },
                { h: "TOTAL", w: 55 },
              ].map(({ h, w }) => (
                <th
                  key={h}
                  style={{
                    border: "1px solid #000",
                    padding: "2px 3px",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    fontWeight: "bold",
                    width: w,
                    verticalAlign: "bottom",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {form.conceptos.map((c: any) => {
              const { subtotal, impuestos, total } = calcConcepto(c);
              return (
                <tr key={c.id}>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "2px 3px",
                      textAlign: "center",
                    }}
                  >
                    {c.cantidad || ""}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "2px 3px",
                      textAlign: "center",
                    }}
                  >
                    {c.unidadSat || ""} - Pieza
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "2px 3px",
                      textAlign: "center",
                      fontSize: 7,
                    }}
                  >
                    {c.claveSat || ""}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "2px 3px",
                      fontSize: 7,
                    }}
                  >
                    {c.claveSat || ""} {c.concepto || "—"}
                    <br />
                    <span style={{ fontSize: 7, color: "#555" }}>
                      Pedimento: Aduana: Fecha:
                    </span>
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "2px 3px",
                      textAlign: "right",
                    }}
                  >
                    {c.valorUnitario
                      ? `$${fmt(parseFloat(c.valorUnitario))}`
                      : ""}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "2px 3px",
                      textAlign: "center",
                    }}
                  >
                    {c.descuento ? `${c.descuento}%` : "0%"}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "2px 3px",
                      textAlign: "right",
                    }}
                  >
                    ${fmt(subtotal)}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "2px 3px",
                      textAlign: "center",
                    }}
                  >
                    {c.porcImpuesto} %
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "2px 3px",
                      textAlign: "left",
                      fontSize: 7,
                    }}
                  >
                    IVA - Importe: {fmt(impuestos)}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "2px 3px",
                      textAlign: "right",
                    }}
                  >
                    ${fmt(total)}
                  </td>
                </tr>
              );
            })}
            {form.conceptos.length < 4 &&
              Array.from({ length: 4 - form.conceptos.length }).map((_, i) => (
                <tr key={`e${i}`} style={{ height: 18 }}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <td
                      key={j}
                      style={{ border: "1px solid #000", padding: "2px 3px" }}
                    >
                      &nbsp;
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>

        {/* =============== TOTALES: Importe con letra + QR | Montos =============== */}
        <div style={{ display: "flex", marginBottom: 10, fontSize: 8 }}>
          {/* Lado izquierdo: Importe con letra, tipo relación, QR */}
          <div style={{ flex: 1, paddingRight: 16 }}>
            <p style={{ marginBottom: 6, textDecoration: "underline" }}>
              IMPORTE CON LETRA:{" "}
              <span style={{ textTransform: "uppercase" }}>
                {toLetras(totalFinal)}
              </span>
            </p>
            <div style={{ marginTop: 8 }}>
              <p style={{ marginBottom: 3 }}>
                TIPO DE RELACION: {form.tipoRelacion || "-"}
              </p>
              <p style={{ marginBottom: 8 }}>
                CFDI RELACIONADO: {form.cfdiRelacionado || ""}
              </p>
            </div>
            {/* QR Code placeholder */}
            <div
              style={{
                width: 100,
                height: 100,
                border: "2px solid #000",
                background:
                  "repeating-conic-gradient(#333 0% 25%, #fff 0% 50%) 0 0 / 5px 5px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "15%",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ width: 20, height: 20, background: "#000" }} />
              </div>
            </div>
          </div>
          {/* Lado derecho: Tabla de montos */}
          <div style={{ width: 200, flexShrink: 0, paddingTop: 2 }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 8 }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: "2px 6px", textAlign: "right" }}>
                    Subtotal:
                  </td>
                  <td
                    style={{
                      padding: "2px 6px",
                      textAlign: "right",
                      width: 80,
                    }}
                  >
                    ${fmt(totalSubtotal)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "2px 6px", textAlign: "right" }}>
                    IEPS:
                  </td>
                  <td style={{ padding: "2px 6px", textAlign: "right" }}>
                    $0.00
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "2px 6px", textAlign: "right" }}>
                    IEPS C.:
                  </td>
                  <td style={{ padding: "2px 6px", textAlign: "right" }}>
                    $0.00
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "2px 6px", textAlign: "right" }}>
                    IVA:
                  </td>
                  <td style={{ padding: "2px 6px", textAlign: "right" }}>
                    ${fmt(totalImpuestos)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "2px 6px", textAlign: "right" }}>
                    Descuento:
                  </td>
                  <td style={{ padding: "2px 6px", textAlign: "right" }}>
                    ${fmt(totalDesc)}
                  </td>
                </tr>
                <tr style={{ borderTop: "1px solid #000" }}>
                  <td
                    style={{
                      padding: "2px 6px",
                      textAlign: "right",
                      fontWeight: "bold",
                    }}
                  >
                    Total:
                  </td>
                  <td
                    style={{
                      padding: "2px 6px",
                      textAlign: "right",
                      fontWeight: "bold",
                    }}
                  >
                    ${fmt(totalFinal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* =============== INFO FISCAL =============== */}
        <div style={{ marginBottom: 6, fontSize: 7 }}>
          <p
            style={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 8,
              marginBottom: 6,
            }}
          >
            Este documento es una representación impresa de un CFDI
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #000", padding: "2px 8px" }}>
                  Serie del Certificado del emisor: 00001000000508225085
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    border: "1px solid #000",
                    borderTop: "none",
                    padding: "2px 8px",
                  }}
                >
                  Folio Fiscal: FA476ECB-C78D-42F9-A9EB-D8A9322FB87C
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    border: "1px solid #000",
                    borderTop: "none",
                    padding: "2px 8px",
                  }}
                >
                  No. de serie del Certificado del SAT: 00001000000505142236
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    border: "1px solid #000",
                    borderTop: "none",
                    padding: "2px 8px",
                  }}
                >
                  Fecha y hora de certificación: {form.fecha}T{form.hora}:05
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ textAlign: "right", fontSize: 7, marginTop: 3 }}>
            *Efectos fiscales al pago
          </p>
        </div>

        {/* =============== SELLOS =============== */}
        <div style={{ marginBottom: 6 }}>
          {/* Sello digital del CFDI */}
          <div style={{ border: "1px solid #000", marginBottom: 4 }}>
            <div
              style={{
                background: "#d0d0d0",
                padding: "2px 8px",
                textAlign: "center",
                fontSize: 7,
                fontWeight: "bold",
              }}
            >
              Sello digital del CFDI
            </div>
            <div
              style={{
                padding: "3px 8px",
                fontSize: 6,
                wordBreak: "break-all",
                fontFamily: "monospace",
                lineHeight: 1.3,
              }}
            >
              g1hVudoRwyMP3ogrEiA5orgGaWAN5WCgttza5rdFDhK5yWHssWUqqqAX+KMUwGW64dS0or9twwpBSx1eZ+MKJV7J2PmfADKv6e0fnML3prAN5EDA54uMEFDJgDAhdroFDWz0gTjG4+Qog6ZznNF1FtUfROXo20HPl9GlKjMtaOvP0v51NLUFER0mWOPHsg
            </div>
          </div>
          {/* Sello del SAT */}
          <div style={{ border: "1px solid #000", marginBottom: 4 }}>
            <div
              style={{
                background: "#d0d0d0",
                padding: "2px 8px",
                textAlign: "center",
                fontSize: 7,
                fontWeight: "bold",
              }}
            >
              Sello del SAT
            </div>
            <div
              style={{
                padding: "3px 8px",
                fontSize: 6,
                wordBreak: "break-all",
                fontFamily: "monospace",
                lineHeight: 1.3,
              }}
            >
              fkzxgXrcvfXlP6apKG1sFu5tXAxLGc0xi0rp0w/R2K5BOYrD5Sc65vbRnTn1zV0vozmkMhPs58ejEcfaJ1my1xJu6ty7bWfYDBkrtpR8IuOB34Kkn7gPC5z/XfNKd6uzGj3mjyeNm0En
            </div>
          </div>
          {/* Cadena original */}
          <div style={{ border: "1px solid #000" }}>
            <div
              style={{
                background: "#d0d0d0",
                padding: "2px 8px",
                textAlign: "center",
                fontSize: 7,
                fontWeight: "bold",
              }}
            >
              Cadena original del complemento de la certificación digital del
              SAT
            </div>
            <div
              style={{
                padding: "3px 8px",
                fontSize: 6,
                wordBreak: "break-all",
                fontFamily: "monospace",
                lineHeight: 1.3,
              }}
            >
              ||1.1|FA476ECB-C78D-42F9-A9EB-D8A9322FB87C|{form.fecha}T
              {form.hora}
              :05|INT021024I62|mnattocprdxyMAdoScrdLj6TqgrpsfM8tiSW+MuczeoegfzINIQcMovJP+Sv64Q0qqAxHKMUwGW64dS0or9twwpBSx1eZ+MKJV7J2PmfADKv6e0fnML3prAN5EDA54uMEFDJgDAhdroF||
            </div>
          </div>
        </div>

        {/* =============== PAGARÉ =============== */}
        <div
          style={{
            border: "1px solid #000",
            padding: "5px 10px",
            marginTop: 6,
            fontSize: 7,
          }}
        >
          <p
            style={{
              textAlign: "center",
              fontWeight: "bold",
              textTransform: "uppercase",
              textDecoration: "underline",
              marginBottom: 4,
              fontSize: 8,
            }}
          >
            PAGARE
          </p>
          <p style={{ textAlign: "justify", marginBottom: 8, lineHeight: 1.5 }}>
            DEBO(EMOS) Y PAGARE(MOS) INCONDICIONALMENTE Y SIN PRETEXTO POR ESTE
            PAGARE A LA ORDEN DE VIANEY OMARA MIRANDA CASTRO LA CANTIDAD DE{" "}
            <span style={{ textTransform: "uppercase" }}>
              {toLetras(totalFinal)}
            </span>{" "}
            ({form.moneda} ${fmt(totalFinal)}) EN LA CIUDAD DE __ EL DIA DE SU
            VENCIMIENTO, PAGAREMOS ADEMAS INTERESES MORATORIOS HASTA SU
            LIQUIDACION TOTAL A RAZON DEL 3% MENSUAL SIN QUE ESTO SE CONSIDERE
            EL PLAZO FIJADO PARA EL CUMPLIMIENTO DE ESTA OBLIGACION.
          </p>
          <p style={{ fontSize: 8, marginTop: 8 }}>
            ACEPTO Y PAGARE: _______________________
          </p>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="fixed inset-0 flex items-center justify-center p-3">
        <div className="w-[95vw] max-w-7xl h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative z-10">
          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Generar Factura — CFDI 4.0
                </h3>
                {isLoadingData && (
                  <span className="flex items-center gap-1 text-xs text-blue-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Cargando datos...
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {!readonlyMode && (
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode("simultaneous")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === "simultaneous" ? "bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    Vista Dividida
                  </button>
                  <button
                    onClick={() => {
                      setViewMode("tabular");
                      setStep("capture");
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === "tabular" ? "bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    Modo Tabular
                  </button>
                </div>
              )}
              <button
                onClick={handleClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* BODY */}
          {viewMode === "simultaneous" ? (
            <div className="flex-1 grid grid-cols-2 overflow-hidden">
              {/* LEFT - Form */}
              <div className="overflow-y-auto p-5 pr-3 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 space-y-4">
                {renderFormCards(false)}
              </div>

              {/* RIGHT - PDF Preview (Plantilla CFDI Inline) */}
              <div
                className="w-full h-full bg-gray-200 overflow-auto"
                style={{ padding: 16 }}
              >
                {renderPDFPreview()}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              {step === "capture" ? (
                <div className="flex-1 overflow-y-auto p-5 bg-slate-50 dark:bg-slate-900 space-y-4">
                  {renderFormCards(true)}
                </div>
              ) : (
                <div className="flex-1 w-full h-full bg-gray-200 overflow-auto flex justify-center items-start py-5">
                  {renderPDFPreview()}
                </div>
              )}
            </div>
          )}

          {/* FOOTER */}
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 rounded-xl text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 transition-colors"
              >
                {readonlyMode ? "Cerrar" : "Cancelar"}
              </button>
              {saveError && (
                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {saveError}
                </span>
              )}
              {saveSuccess && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3.5 h-3.5" />
                  Factura guardada y PDF generado
                </span>
              )}
            </div>

            <div className="flex gap-3">
              {readonlyMode ? (
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  Descargar PDF
                </button>
              ) : (
                <>
                  {viewMode === "tabular" && step === "preview" && (
                    <button
                      type="button"
                      onClick={() => setStep("capture")}
                      className="px-6 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                      Atrás a Captura
                    </button>
                  )}

                  {viewMode === "tabular" && step === "capture" ? (
                    <button
                      type="button"
                      onClick={() => setStep("preview")}
                      className="px-6 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-sm font-bold transition-all shadow-md"
                    >
                      Siguiente (Vista Previa)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateInvoice}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold transition-all active:scale-95 shadow-md shadow-blue-500/20 ${isSaving ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                      {isSaving ? "Guardando..." : "Generar Factura"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
