import { Q } from "@nozbe/watermelondb";
import * as Crypto from "expo-crypto";
import {
    Building2,
    ChevronDown,
    Contact,
    Loader2,
    MapPin,
    Plus,
    Search,
    Tags,
    Trash2,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { database } from "../../../src/services/DB/indexBD";
import ErrorModal from "./ErrorModal";

export interface DiscountRule {
  id: string;
  type: "global" | "familia" | "producto";
  targetId: string;
  targetName: string;
  percentage: string;
}

export interface ClientData {
  nombre: string;
  rfc: string;
  categoria: string;
  listaPrecios: string;
  descuentoGlobal: string; // kept for legacy if needed, or we can just use rules
  discountRules: DiscountRule[];
  contactos: string[];
  estado: string;
  calle: string;
  colonia: string;
  cp: string;
  ciudad: string;
}

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  dropUp = false,
}: {
  options: { id: string; label: string; subLabel?: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  dropUp?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedOption = options.find((o) => o.id === value);

  const filteredOptions = options.filter(
    (o) =>
      o.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.subLabel &&
        o.subLabel.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`absolute ${dropUp ? "bottom-full mb-1" : "top-full mt-1"} left-0 right-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[70] overflow-hidden animate-in fade-in ${dropUp ? "slide-in-from-bottom-1" : "slide-in-from-top-1"} duration-200`}
          >
            <div className="p-2 border-b border-slate-100 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-[10px] text-slate-400">
                  No se encontraron resultados
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors mb-0.5 ${value === opt.id ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}
                  >
                    <div className="flex flex-col">
                      {opt.subLabel && (
                        <span className="text-[10px] opacity-60 font-bold">
                          {opt.subLabel}
                        </span>
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface AddClientProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: ClientData) => Promise<void>;
  isLoading?: boolean;
  /** If provided, the modal opens in edit mode with pre-filled fields */
  editData?: ClientData | null;
}

interface Categoria {
  id: string;
  nombre: string;
}

const initialState: ClientData = {
  nombre: "",
  rfc: "",
  categoria: "",
  listaPrecios: "",
  descuentoGlobal: "0",
  discountRules: [],
  contactos: [""],
  estado: "Activo",
  calle: "",
  colonia: "",
  cp: "",
  ciudad: "",
};

const inputClass =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";

export default function AddClient({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  editData,
}: AddClientProps) {
  const [form, setForm] = useState<ClientData>(initialState);
  const isEditMode = !!editData;

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Price list state
  const [isAddingPriceList, setIsAddingPriceList] = useState(false);
  const [newPriceListName, setNewPriceListName] = useState("");
  const [customPriceLists, setCustomPriceLists] = useState<string[]>([]);
  const [templateRules, setTemplateRules] = useState<DiscountRule[]>([]);
  
  // Custom list (fork) states
  const [isCustomList, setIsCustomList] = useState(false);
  const [baseTemplateName, setBaseTemplateName] = useState("");

  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const [familias, setFamilias] = useState<{ id: string; nombre: string; codigo: string }[]>([]);
  const [productos, setProductos] = useState<{ id: string; nombre: string; codigo: string }[]>([]);

  // Sync form when editData changes or modal opens
  useEffect(() => {
    if (isOpen && editData) {
      setForm(editData);
    } else if (isOpen && !editData) {
      setForm(initialState);
    }
    if (isOpen) {
      loadCategorias();
    }
  }, [isOpen, editData]);

  const loadCategorias = async () => {
    setIsLoadingCategories(true);
    try {
      const catDb = database.collections.get("categorias_clientes");
      const allCats = await catDb.query().fetch();
      setCategorias(allCats.map((c: any) => ({ id: c.id, nombre: c.nombre })));

      const plantillasDb = database.collections.get("plantillas_precios");
      const allPlantillas = await plantillasDb.query().fetch();
      setCustomPriceLists(allPlantillas.map((p: any) => p.nombre));

      const famDb = database.collections.get("familias");
      const allFams = await famDb.query().fetch();
      setFamilias(allFams.map((f: any) => ({ id: f.id, nombre: f.nombre, codigo: f.codigoFamilia })));

      const prodDb = database.collections.get("productos");
      const allProds = await prodDb.query().fetch();
      setProductos(allProds.map((p: any) => ({ id: p.id, nombre: p.descripcion, codigo: p.codigoInterno })));
    } catch (error) {
      console.error("Error al cargar categorías o plantillas:", error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const catDb = database.collections.get("categorias_clientes");
      let newId = "";
      await database.write(async () => {
        const newCat = await catDb.create((record: any) => {
          record._raw.id = Crypto.randomUUID();
          record.nombre = newCategoryName.trim();
          record.estado = true;
        });
        newId = newCat.id;
      });
      setCategorias((prev) => [
        ...prev,
        { id: newId, nombre: newCategoryName.trim() },
      ]);
      setForm((prev) => ({ ...prev, categoria: newCategoryName.trim() }));
      setIsAddingCategory(false);
      setNewCategoryName("");
    } catch (error) {
      console.error("Error al crear categoría:", error);
    }
  };

  const handleAddPriceList = async () => {
    if (!newPriceListName.trim()) return;
    const name = newPriceListName.trim();

    try {
      const plantillasDb = database.collections.get("plantillas_precios");
      await database.write(async () => {
        await plantillasDb.create((p: any) => {
          p._raw.id = Crypto.randomUUID();
          p.nombre = name;
        });
      });
      setCustomPriceLists((prev) => [...prev, name]);
      setForm((prev) => ({ ...prev, listaPrecios: name }));
      setIsAddingPriceList(false);
      setNewPriceListName("");
    } catch (error) {
      console.error("Error al crear lista de precios:", error);
    }
  };

  const handlePriceListChange = async (name: string) => {
    setForm((prev) => ({ ...prev, listaPrecios: name, discountRules: [] }));
    setTemplateRules([]);
    setIsCustomList(false);
    setBaseTemplateName("");

    try {
      const plantillasDb = database.collections.get("plantillas_precios");
      const reglasDb = database.collections.get("reglas_plantilla");
      const pArr = await plantillasDb.query(Q.where("nombre", name)).fetch();
      if (pArr.length > 0) {
        const rulesArr = await reglasDb
          .query(Q.where("plantilla_id", pArr[0].id))
          .fetch();
        setTemplateRules(
          rulesArr.map((r: any) => ({
            id: r.id,
            type: r.tipo as any,
            targetId: r.targetId,
            targetName:
              r.tipo === "familia"
                ? familias.find((f) => f.id === r.targetId)?.nombre ||
                  r.targetId
                : r.tipo === "producto"
                  ? productos.find((p) => p.id === r.targetId)?.nombre ||
                    r.targetId
                  : "",
            percentage: String(r.descuentoPorcentaje),
          })),
        );
      }
    } catch (error) {
      console.error("Error cargando reglas:", error);
    }
  };

  const handleStartCustomizing = () => {
    setIsCustomList(true);
    setBaseTemplateName(form.listaPrecios);
    // Inicializar discountRules con las reglas actuales de la plantilla
    setForm(prev => ({
      ...prev,
      discountRules: templateRules.map(r => ({ ...r, id: Math.random().toString() }))
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (index: number, value: string) => {
    setForm((prev) => {
      const newContactos = [...prev.contactos];
      newContactos[index] = value;
      return { ...prev, contactos: newContactos };
    });
  };

  const addContact = () => {
    if (form.contactos.length < 4) {
      setForm((prev) => ({ ...prev, contactos: [...prev.contactos, ""] }));
    }
  };


  const addDiscountRule = () => {
    setForm((prev) => ({
      ...prev,
      discountRules: [
        ...(prev.discountRules || []),
        {
          id: Math.random().toString(),
          type: "global",
          targetId: "",
          targetName: "",
          percentage: "0",
        },
      ],
    }));
  };

  const removeDiscountRule = (id: string) => {
    setForm((prev) => ({
      ...prev,
      discountRules: (prev.discountRules || []).filter((r) => r.id !== id),
    }));
  };

  const updateDiscountRule = (id: string, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      discountRules: (prev.discountRules || []).map((r) => {
        if (r.id === id) {
          const newRule = { ...r, [field]: value };
          if (field === "type") {
            newRule.targetId = "";
            newRule.targetName = "";
          }
          if (field === "targetId") {
            if (newRule.type === "familia") {
              newRule.targetName =
                familias.find((f) => f.id === value)?.nombre || "";
            } else if (newRule.type === "producto") {
              newRule.targetName =
                productos.find((p) => p.id === value)?.nombre || "";
            }
          }
          return newRule as typeof r;
        }
        return r;
      }),
    }));
  };

  const removeContact = (index: number) => {
    setForm((prev) => ({
      ...prev,
      contactos: prev.contactos.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      alert("El nombre o razón social es obligatorio.");
      return;
    }

    let currentForm = { ...form };

    if (isCustomList) {
        const autoName = `${baseTemplateName}-${form.nombre.trim()}`;
        try {
            const plantillasDb = database.get('plantillas_precios');
            const reglasDb = database.get('reglas_plantilla');

            await database.write(async () => {
                // Si ya existe una lista con este nombre (por ejemplo de un intento previo fallido o edición), la buscamos
                const existing = await plantillasDb.query(Q.where('nombre', autoName)).fetch();
                let plantillaRecord;

                if (existing.length > 0) {
                    plantillaRecord = existing[0];
                    // Limpiar reglas anteriores para reemplazarlas
                    const oldRules = await reglasDb.query(Q.where('plantilla_id', plantillaRecord.id)).fetch();
                    for (const or of oldRules) await or.markAsDeleted();
                } else {
                    plantillaRecord = await plantillasDb.create((p: any) => {
                        p._raw.id = Crypto.randomUUID();
                        p.nombre = autoName;
                    });
                }

                // Crear sus reglas
                for (const rule of form.discountRules) {
                    await reglasDb.create((r: any) => {
                        r._raw.id = Crypto.randomUUID();
                        r.plantillaId = plantillaRecord.id;
                        r.tipo = rule.type;
                        r.targetId = rule.targetId;
                        r.descuentoPorcentaje = parseFloat(rule.percentage) || 0;
                        r.precioFijo = 0;
                    });
                }
            });
            
            currentForm.listaPrecios = autoName;
        } catch (error) {
            console.error('Error al crear plantilla personalizada:', error);
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: "No se pudo crear la lista de precios personalizada. Intente de nuevo."
            });
            return;
        }
    }

    if (onSave) {
      await onSave(currentForm);
    }
    setForm(initialState);
    setIsCustomList(false);
    onClose();
  };

  const handleClose = () => {
    if (isLoading) return;
    setForm(initialState);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-3xl flex flex-col max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {isEditMode ? "Editar Cliente" : "Agregar Nuevo Cliente"}
              </h3>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1: Información General */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-blue-800" />
                    <h4 className="font-semibold text-blue-900 text-sm">
                      Información General
                    </h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nombre / Razón Social *
                      </label>
                      <input
                        type="text"
                        name="nombre"
                        value={form.nombre}
                        onChange={handleChange}
                        placeholder="Ej: Panadería La Esperanza"
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        RFC o Identificador
                      </label>
                      <input
                        type="text"
                        name="rfc"
                        value={form.rfc}
                        onChange={handleChange}
                        placeholder="Ej: XAXX010101000"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Dirección (Moved up) */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-blue-800" />
                    <h4 className="font-semibold text-blue-900 text-sm">
                      Dirección
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Calle
                      </label>
                      <input
                        type="text"
                        name="calle"
                        value={form.calle}
                        onChange={handleChange}
                        placeholder="Calle y número"
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Colonia
                      </label>
                      <input
                        type="text"
                        name="colonia"
                        value={form.colonia}
                        onChange={handleChange}
                        placeholder="Colonia"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        C.P.
                      </label>
                      <input
                        type="text"
                        name="cp"
                        value={form.cp}
                        onChange={handleChange}
                        placeholder="CP"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        name="ciudad"
                        value={form.ciudad}
                        onChange={handleChange}
                        placeholder="Ciudad"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 3: Contacto y Estado */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Contact className="w-5 h-5 text-blue-800" />
                    <h4 className="font-semibold text-blue-900 text-sm">
                      Contacto y Estado
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Teléfono / Correo de contacto (Max 4)
                        </label>
                        {form.contactos.length < 4 && (
                          <button
                            type="button"
                            onClick={addContact}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs font-medium flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Agregar
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {form.contactos.map((contacto, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={contacto}
                              onChange={(e) =>
                                handleContactChange(idx, e.target.value)
                              }
                              placeholder="Ej: 555-123-4567 o cliente@email.com"
                              className={inputClass}
                            />
                            {form.contactos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeContact(idx)}
                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Estado
                      </label>
                      <select
                        name="estado"
                        value={form.estado}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Los clientes inactivos no aparecerán en las ventas
                        nuevas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 4: Clasificación Comercial y Precios (Moved to end) */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Tags className="w-5 h-5 text-blue-800" />
                    <h4 className="font-semibold text-blue-900 text-sm">
                      Clasificación Comercial y Precios
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Categoría de Cliente
                        </label>
                        {!isAddingCategory ? (
                          <select
                            name="categoria"
                            value={form.categoria}
                            onChange={(e) => {
                              if (e.target.value === "NEW") {
                                setIsAddingCategory(true);
                              } else {
                                setForm((prev) => ({
                                  ...prev,
                                  categoria: e.target.value,
                                }));
                              }
                            }}
                            className={inputClass}
                          >
                            <option value="" disabled hidden>
                              Selecciona categoría
                            </option>
                            <option
                              value="NEW"
                              className="text-blue-600 font-bold"
                            >
                              + Nuevo
                            </option>
                            {categorias.map((cat) => (
                              <option key={cat.id} value={cat.nombre}>
                                {cat.nombre}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={newCategoryName}
                              onChange={(e) =>
                                setNewCategoryName(e.target.value)
                              }
                              className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-white focus:outline-none focus:border-blue-500"
                              placeholder="Nueva categoría..."
                            />
                            <button
                              type="button"
                              onClick={handleAddCategory}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsAddingCategory(false)}
                              className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold"
                            >
                              X
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Lista de Precios Asignada
                        </label>
                        {!isAddingPriceList ? (
                          <select
                            name="listaPrecios"
                            value={form.listaPrecios}
                            onChange={(e) => {
                              if (e.target.value === "NEW") {
                                setIsAddingPriceList(true);
                                setForm((prev) => ({
                                  ...prev,
                                  discountRules: [],
                                }));
                              } else {
                                handlePriceListChange(e.target.value);
                              }
                            }}
                            className={inputClass}
                          >
                            <option value="" disabled hidden>
                              Selecciona lista de precios
                            </option>
                            <option
                              value="NEW"
                              className="text-blue-600 font-bold"
                            >
                              + Nuevo
                            </option>
                            {customPriceLists.map((list) => (
                              <option key={list} value={list}>
                                {list}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex flex-col gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-bold text-blue-800 dark:text-blue-400">
                                Crear Nueva Lista de Precios
                              </p>
                              <button
                                type="button"
                                onClick={() => setIsAddingPriceList(false)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex gap-2">
                              <input
                                type="text"
                                autoFocus
                                value={newPriceListName}
                                onChange={(e) =>
                                  setNewPriceListName(e.target.value)
                                }
                                className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-white focus:outline-none focus:border-blue-500"
                                placeholder="Nombre de la lista (ej. VIP)"
                              />
                              <button
                                type="button"
                                onClick={handleAddPriceList}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm"
                              >
                                Guardar Lista
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {form.listaPrecios !== "" ? (
                        <div className="flex flex-col h-full gap-3">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {isCustomList ? `Lista Personalizada: ${baseTemplateName}-${form.nombre.trim() || 'Cliente'}` : 'Reglas de la Plantilla'}
                              </label>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {isCustomList 
                                    ? "Modificando reglas exclusivas para este cliente." 
                                    : "Compartidas con todos los clientes de esta lista."}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons (Top) */}
                          {!isCustomList ? (
                            <button
                              type="button"
                              onClick={handleStartCustomizing}
                              className="w-full py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-dashed border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
                            >
                              <Plus className="w-3 h-3" /> Modificar (Crear copia personalizada)
                            </button>
                          ) : (
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Modo Edición Activo</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomList(false);
                                        setBaseTemplateName("");
                                        setForm(prev => ({ ...prev, discountRules: [] }));
                                    }}
                                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Cancelar
                                </button>
                            </div>
                          )}

                          {/* Rules preview / Editor */}
                          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                            {isCustomList ? (
                                // Editor de reglas cuando es personalizada
                                <>
                                    {form.discountRules.length === 0 ? (
                                        <div className="text-center p-4 border border-dashed border-slate-200 rounded-xl">
                                            <p className="text-xs text-slate-400">No hay reglas definidas.</p>
                                        </div>
                                    ) : (
                                        form.discountRules.map((rule, idx) => (
                                            <div key={rule.id} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2 relative">
                                                <button type="button" onClick={() => removeDiscountRule(rule.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                
                                                <div className="flex gap-2">
                                                    <select 
                                                        value={rule.type} 
                                                        onChange={(e) => updateDiscountRule(rule.id, 'type', e.target.value)}
                                                        className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 rounded px-2 py-1 outline-none font-medium"
                                                    >
                                                        <option value="global">Global</option>
                                                        <option value="familia">Familia</option>
                                                        <option value="producto">Producto</option>
                                                    </select>
                                                    
                                                    <div className="flex-1">
                                                        {rule.type === 'familia' ? (
                                                            <SearchableSelect 
                                                                options={familias.map(f => ({ id: f.id, label: f.nombre, subLabel: f.codigo }))}
                                                                value={rule.targetId}
                                                                onChange={(val) => updateDiscountRule(rule.id, 'targetId', val)}
                                                                placeholder="Fam..."
                                                                searchPlaceholder="Buscar familia..."
                                                                dropUp={idx > 1}
                                                            />
                                                        ) : rule.type === 'producto' ? (
                                                            <SearchableSelect 
                                                                options={productos.map(p => ({ id: p.id, label: p.nombre, subLabel: p.codigo }))}
                                                                value={rule.targetId}
                                                                onChange={(val) => updateDiscountRule(rule.id, 'targetId', val)}
                                                                placeholder="Prod..."
                                                                searchPlaceholder="Buscar producto..."
                                                                dropUp={idx > 1}
                                                            />
                                                        ) : (
                                                            <div className="px-2 py-1.5 text-[10px] text-slate-400 italic">Todo el catálogo</div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="w-16 relative">
                                                        <input 
                                                            type="number" 
                                                            value={rule.percentage} 
                                                            onChange={(e) => updateDiscountRule(rule.id, 'percentage', e.target.value)}
                                                            className="w-full text-[10px] bg-white dark:bg-slate-800 border border-slate-200 rounded px-2 py-1.5 pr-4 outline-none font-bold text-blue-600"
                                                        />
                                                        <span className="absolute right-1.5 top-1.5 text-[8px] text-slate-400 font-bold">%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <button
                                        type="button"
                                        onClick={addDiscountRule}
                                        className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 border border-dashed border-blue-200 dark:border-blue-800 rounded-lg text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Agregar Nueva Regla
                                    </button>
                                </>
                            ) : (
                                // Vista previa de reglas de plantilla (Lectura)
                                <>
                                    {!templateRules || templateRules.length === 0 ? (
                                      <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                                        <p className="text-xs text-slate-400 text-center">
                                          Sin reglas configuradas.
                                          <br />
                                          Precio base aplica a todos los productos.
                                        </p>
                                      </div>
                                    ) : (
                                      templateRules.map((rule) => (
                                        <div
                                          key={rule.id}
                                          className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                                        >
                                          <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rule.type === "global" ? "bg-blue-100 text-blue-700" : rule.type === "familia" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}`}
                                          >
                                            {rule.type === "global"
                                              ? "Global"
                                              : rule.type === "familia"
                                                ? "Familia"
                                                : "Producto"}
                                          </span>
                                          {rule.targetName && (
                                            <span className="text-xs text-slate-600 dark:text-slate-300 flex-1 truncate">
                                              {rule.targetName}
                                            </span>
                                          )}
                                          <span className="text-xs font-bold text-emerald-600">
                                            -{rule.percentage}%
                                          </span>
                                        </div>
                                      ))
                                    )}
                                </>
                            )}
                          </div>

                          {isCustomList && (
                             <p className="text-[10px] text-slate-400 text-center italic mt-1">Se guardará automáticamente al finalizar el registro del cliente.</p>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center bg-slate-50/50 dark:bg-slate-900/20">
                          <Tags className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Reglas de Plantilla
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Selecciona una lista para ver sus reglas
                            compartidas.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-6 py-2 rounded-xl text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all active:scale-95 shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading
                  ? "Guardando..."
                  : isEditMode
                    ? "Actualizar Cliente"
                    : "Guardar Cliente"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        message={errorModal.message}
      />
    </div>
  );
}
