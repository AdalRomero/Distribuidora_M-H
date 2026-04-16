import { Q } from "@nozbe/watermelondb";
import withObservables from "@nozbe/with-observables";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import {
    Camera,
    DollarSign,
    ImagesIcon,
    Info,
    Tag,
    TrendingUp,
    X,
} from "lucide-react";
import React, { useState } from "react";
import { Alert, Platform } from "react-native";
import { supabase } from "../../../src/services/api/supabaseClient";
import { syncApp } from "../../../src/sync";
import { database } from "../../../src/services/DB/indexBD";
import FamiliaModel from "../../../src/services/DB/models/bases/familia";
import ImpuestoModel from "../../../src/services/DB/models/bases/impuesto";
import MargenModel from "../../../src/services/DB/models/bases/margen";
import Producto from "../../../src/services/DB/models/catalogo/producto";
import ProductoImpuesto from "../../../src/services/DB/models/catalogo/productoImpuesto";

interface AddInventoryInnerProps {
  isOpen: boolean;
  onClose: () => void;
  familias: FamiliaModel[];
  margenes: MargenModel[];
  impuestos: ImpuestoModel[];
  recoverData?: { tabla: string, data: any, errorId?: string } | null;
  editProduct?: Producto | null;
  onSaveSuccess?: () => void;
}

function AddInventoryInner({
  isOpen,
  onClose,
  familias,
  margenes,
  impuestos,
  recoverData,
  editProduct,
  onSaveSuccess,
}: AddInventoryInnerProps) {
  const [nombre, setNombre] = useState("");
  const [familiaId, setFamiliaId] = useState("");
  const [codigoInterno, setCodigoInterno] = useState("");
  const [margenId, setMargenId] = useState("");
  const [costoPromedio, setCostoPromedio] = useState("");
  const [sat, setSat] = useState("");
  const [selectedImpuestos, setSelectedImpuestos] = useState<string[]>([]);

  // Precios editables — inicialmente vacíos hasta que el usuario los defina
  const [precioListaManual, setPrecioListaManual] = useState("");
  const [precioMayoreoManual, setPrecioMayoreoManual] = useState("");
  const [precioMenudeoManual, setPrecioMenudeoManual] = useState("");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageExt, setImageExt] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    if (isOpen && recoverData?.data) {
      const data = recoverData.data;
      setNombre(data.descripcion || "");
      setFamiliaId(data.familia_id || "");
      setCodigoInterno(data.codigo_interno || "");
      setMargenId(data.margen_id || "");
      if (data.precio_lista !== undefined) setPrecioListaManual(String(data.precio_lista));
      if (data.precio_mayoreo !== undefined) setPrecioMayoreoManual(String(data.precio_mayoreo));
      if (data.precio_menudeo !== undefined) setPrecioMenudeoManual(String(data.precio_menudeo));
      if (data.imagen) setImageUri(data.imagen);
    } else if (isOpen && editProduct) {
      const pRaw: any = editProduct._raw;
      setNombre(editProduct.descripcion || "");
      setFamiliaId(pRaw.familia_id || "");
      setCodigoInterno(editProduct.codigoInterno || "");
      setSat((editProduct as any).claveSat || "");
      setMargenId(pRaw.margen_id || "");
      setPrecioListaManual(String(editProduct.precioLista || ""));
      setPrecioMayoreoManual(String(editProduct.precioMayoreo || ""));
      setPrecioMenudeoManual(String(editProduct.precioMenudeo || ""));
      if (editProduct.imagen) setImageUri(editProduct.imagen);
      
      const loadImpuestos = async () => {
          const links = await editProduct.impuestosMultiples.fetch();
          setSelectedImpuestos(links.map((link: any) => link._raw.impuesto_id));
      };
      loadImpuestos();
    } else if (!isOpen) {
      resetForm();
    }
  }, [isOpen, recoverData, editProduct]);

  if (!isOpen) return null;

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400";
  const selectClass =
    "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-600 dark:text-slate-300";

  // Auto-generate 5-digit internal code when family is selected
  const handleFamiliaChange = async (selectedFamiliaId: string) => {
    setFamiliaId(selectedFamiliaId);
    if (!selectedFamiliaId) {
      setCodigoInterno("");
      return;
    }
    try {
      const familia = familias.find((f) => f.id === selectedFamiliaId);
      if (!familia) return;

      const codigoFam = familia.codigoFamilia.padStart(2, "0");

      const productosFamilia = await database.collections
        .get<Producto>("productos")
        .query(Q.where("familia_id", selectedFamiliaId))
        .fetch();

      let maxSuffix = 0;
      productosFamilia.forEach((p) => {
        const cod = p.codigoInterno || "";
        // Si el código actual empieza con el código de la familia, revisamos su sufijo
        if (cod.startsWith(codigoFam)) {
          const suffixStr = cod.substring(codigoFam.length);
          const suffixNum = parseInt(suffixStr, 10);
          if (!isNaN(suffixNum) && suffixNum > maxSuffix) {
            maxSuffix = suffixNum;
          }
        }
      });

      // Aseguramos que siempre el sufijo sea de al menos 3 dígitos (ej: 001, 002... 010... 100)
      const siguiente = String(maxSuffix + 1).padStart(3, "0");
      setCodigoInterno(`${codigoFam}${siguiente}`);
    } catch (e) {
      console.warn("Error auto-generating code:", e);
    }
  };

  const toggleImpuesto = (id: string) => {
    setSelectedImpuestos((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // ── Calculadora Fiscal (solo referencia) ──
  const selectedMargenObj = margenes.find((m) => m.id === margenId);
  const costoNum = parseFloat(costoPromedio) || 0;
  const margenPorcentaje = selectedMargenObj?.porcentaje || 0;
  const impuestosTasas = selectedImpuestos
    .map((id) => impuestos.find((i) => i.id === id))
    .filter(Boolean) as ImpuestoModel[];
  const totalImpuestoPorcentaje = impuestosTasas.reduce(
    (sum, imp) => sum + imp.tasa, 0,
  );
  const precioBaseConMargen = costoNum > 0 ? costoNum * (1 + margenPorcentaje / 100) : 0;
  const precioSugerido = precioBaseConMargen > 0
    ? precioBaseConMargen * (1 + totalImpuestoPorcentaje / 100) : 0;
  const utilidadBruta = precioBaseConMargen - costoNum;
  const showCalculadora = costoNum > 0 && margenPorcentaje > 0;

  // Botón para aplicar precio sugerido a los 3 campos
  const aplicarPrecioSugerido = () => {
    const sugerido = precioSugerido.toFixed(2);
    setPrecioListaManual(sugerido);
    setPrecioMayoreoManual(sugerido);
    setPrecioMenudeoManual(sugerido);
  };

  const chooseImageSource = () => {
    if (Platform.OS === "web") {
      pickImage("gallery");
      return;
    }
    Alert.alert(
      "Seleccionar Imagen",
      "Elige de dónde quieres obtener la imagen",
      [
        { text: "Cámara", onPress: () => pickImage("camera") },
        { text: "Galería", onPress: () => pickImage("gallery") },
        { text: "Cancelar", style: "cancel" },
      ],
    );
  };

  const pickImage = async (source: "camera" | "gallery") => {
    let result;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    };

    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        alert("Se requieren permisos de cámara");
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        alert("Se requieren permisos de galería");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
      const uriParts = result.assets[0].uri.split(".");
      setImageExt(uriParts[uriParts.length - 1] || "jpeg");
    }
  };

  function resetForm() {
    setNombre("");
    setFamiliaId("");
    setCodigoInterno("");
    setMargenId("");
    setCostoPromedio("");
    setSat("");
    setSelectedImpuestos([]);
    setPrecioListaManual("");
    setPrecioMayoreoManual("");
    setPrecioMenudeoManual("");
    setImageUri(null);
    setImageBase64(null);
  }

  const handleSave = async () => {
    try {
      if (!nombre || !codigoInterno) {
        alert(
          "Por favor llena los campos obligatorios (Nombre y Código Interno).",
        );
        return;
      }

      // Usar los precios manuales que definió el usuario
      const pLista = parseFloat(precioListaManual) || 0;
      const pMayoreo = parseFloat(precioMayoreoManual) || 0;
      const pMenudeo = parseFloat(precioMenudeoManual) || 0;

      if (pLista <= 0) {
        alert("Define al menos el Precio de Lista.");
        return;
      }

      setIsUploading(true);
      let publicUrl = null;

      // Upload image if exists
      if (imageBase64) {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${imageExt || "jpeg"}`;
        const { error: uploadError } = await supabase.storage
          .from("productos")
          .upload(`public/${fileName}`, decode(imageBase64), {
            contentType: `image/${imageExt || "jpeg"}`,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("productos")
          .getPublicUrl(`public/${fileName}`);
        publicUrl = data.publicUrl;
      }

      // Create or update all records in a single batch
      await database.write(async () => {
        let savedProductoId: string;
        
        if (editProduct) {
            await editProduct.update((p) => {
              p.descripcion = nombre;
              p.codigoInterno = codigoInterno;
              if (familiaId) {
                (p as any)._raw.familia_id = familiaId;
              }
              if (margenId) {
                (p as any)._raw.margen_id = margenId;
              }
              if (publicUrl) p.imagen = publicUrl;
              (p as any).claveSat = sat;
              p.precioLista = pLista;
              p.precioMayoreo = pMayoreo || pLista;
              p.precioMenudeo = pMenudeo || pLista;
            });
            savedProductoId = editProduct.id;
            
            // Re-create impuestos: first delete old ones, then create new ones
            const existingImpuestos = await editProduct.impuestosMultiples.fetch();
            for (const imp of existingImpuestos) {
                await imp.markAsDeleted();
            }
        } else {
            const nuevoProducto = await database
              .get<Producto>("productos")
              .create((p) => {
                (p as any)._raw.id = Crypto.randomUUID();
                p.descripcion = nombre;
                p.codigoInterno = codigoInterno;
                if (familiaId) {
                  (p as any)._raw.familia_id = familiaId;
                }
                if (margenId) {
                  (p as any)._raw.margen_id = margenId;
                }
                p.estado = true;
                if (publicUrl) p.imagen = publicUrl;
                (p as any).claveSat = sat;
                p.precioLista = pLista;
                p.precioMayoreo = pMayoreo || pLista;
                p.precioMenudeo = pMenudeo || pLista;
              });
            savedProductoId = nuevoProducto.id;
        }

        // Create ProductoImpuesto junction records
        for (const impId of selectedImpuestos) {
          await database
            .get<ProductoImpuesto>("producto_impuestos")
            .create((pi) => {
              (pi as any)._raw.id = Crypto.randomUUID();
              (pi as any)._raw.producto_id = savedProductoId;
              (pi as any)._raw.impuesto_id = impId;
            });
        }
      });

      // Sync to Supabase
      syncApp().catch(console.error);

      if (onSaveSuccess) onSaveSuccess();

      setIsUploading(false);
      resetForm();
      onClose();
    } catch (error: any) {
      console.error("Error saving product:", error);
      alert("Error al guardar: " + error.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative z-10 bg-slate-50 dark:bg-slate-900 w-full max-w-5xl max-h-[95vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 px-8 py-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {editProduct ? "Editar Producto" : "Agregar Nuevo Producto"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Define la identidad del producto en el catálogo
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form className="flex flex-col gap-8">
            {/* ROW 1: Información General + Fotografía */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">
              {/* Información General — 3 columns */}
              <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-5 flex flex-col">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-3">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                    Información General
                  </h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Ej. Harina Selecta Alta Proteína 25kg"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Familia *
                    </label>
                    <select
                      className={selectClass}
                      value={familiaId}
                      onChange={(e) => handleFamiliaChange(e.target.value)}
                    >
                      <option value="">Selecciona...</option>
                      {familias
                        .filter((f) => f.estado)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.codigoFamilia}-{f.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Código Interno *
                    </label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Ej. 14-001"
                      value={codigoInterno}
                      onChange={(e) => setCodigoInterno(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Categoría de Margen
                  </label>
                  <select
                    className={selectClass}
                    value={margenId}
                    onChange={(e) => setMargenId(e.target.value)}
                  >
                    <option value="">Sin margen asignado</option>
                    {margenes.filter(m => m.estado).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} ({m.porcentaje}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fotografía — 2 columns */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                  <ImagesIcon className="w-5 h-5 text-teal-400" />
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                    Fotografía
                  </h3>
                </div>
                <div
                  onClick={chooseImageSource}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 hover:border-blue-400 transition-all cursor-pointer group relative overflow-hidden flex-1 min-h-[180px]"
                >
                  {imageUri ? (
                    <img
                      src={imageUri}
                      alt="Producto"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Haz clic para subir imagen
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        PNG, JPG o WEBP (Max. 2MB)
                      </p>
                    </>
                  )}
                </div>
                {imageUri && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageUri(null);
                      setImageBase64(null);
                    }}
                    className="mt-3 text-sm text-red-500 font-medium hover:text-red-700 w-full text-center"
                  >
                    Eliminar Imagen
                  </button>
                )}
              </div>
            </div>

            {/* ROW 2: Fiscal y Finanzas + Precios de Venta */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              {/* Fiscal y Finanzas */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-5 flex flex-col">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-3">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                    Fiscal y Finanzas
                  </h3>
                </div>

                {/* Costo + SAT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Costo Base (Referencia) *
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
                        value={costoPromedio}
                        onChange={(e) => setCostoPromedio(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Costo unitario del producto para calcular márgenes</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Clave SAT
                    </label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Ej. 50121500"
                      value={sat}
                      onChange={(e) => setSat(e.target.value)}
                    />
                  </div>
                </div>

                {/* Impuestos */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Impuestos Aplicables
                  </label>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {impuestos
                      .filter((imp) => imp.activo)
                      .map((imp) => (
                        <label
                          key={imp.id}
                          className={`flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 rounded-xl border cursor-pointer hover:border-blue-400 transition-colors ${selectedImpuestos.includes(imp.id) ? "border-blue-500 bg-blue-50/50" : "border-slate-200 dark:border-slate-700"}`}
                        >
                          <input
                            type="checkbox"
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                            checked={selectedImpuestos.includes(imp.id)}
                            onChange={() => toggleImpuesto(imp.id)}
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {imp.nombre} ({imp.tasa}%)
                          </span>
                        </label>
                      ))}
                    {impuestos.filter((imp) => imp.activo).length === 0 && (
                      <p className="text-xs text-slate-400">
                        No hay impuestos registrados. Créalos en Catálogos.
                      </p>
                    )}
                  </div>
                </div>

                {/* Calculadora Fiscal - SOLO REFERENCIA */}
                {showCalculadora && (
                  <div className="mt-auto pt-4">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                          <h4 className="text-sm font-bold text-emerald-800">
                            Vista Previa de Precio (Referencia)
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={aplicarPrecioSugerido}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          Aplicar como Precio →
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-800/70 rounded-lg p-3 text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Costo Base</p>
                          <p className="text-lg font-bold text-slate-800 dark:text-white">
                            ${costoNum.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-slate-800/70 rounded-lg p-3 text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            + Margen ({margenPorcentaje}%)
                          </p>
                          <p className="text-lg font-bold text-emerald-700">
                            ${utilidadBruta.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-slate-800/70 rounded-lg p-3 text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            + Impuestos ({totalImpuestoPorcentaje}%)
                          </p>
                          <p className="text-lg font-bold text-amber-700">
                            ${(precioSugerido - precioBaseConMargen).toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-emerald-600 rounded-lg p-3 text-center">
                          <p className="text-xs text-emerald-100 mb-1">
                            Precio Sugerido
                          </p>
                          <p className="text-xl font-extrabold text-white">
                            ${precioSugerido.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Precios de Venta (editables por el usuario) */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-5 flex flex-col">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-3">
                  <Tag className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                    Precios de Venta
                  </h3>
                  <span className="text-xs text-slate-400 ml-auto">Definidos por ti — precios reales</span>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Precio de Lista *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                        placeholder="0.00"
                        value={precioListaManual}
                        onChange={(e) => setPrecioListaManual(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Precio Mayoreo
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                        placeholder="Igual que Lista si vacío"
                        value={precioMayoreoManual}
                        onChange={(e) => setPrecioMayoreoManual(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Precio Menudeo
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                        placeholder="Igual que Lista si vacío"
                        value={precioMenudeoManual}
                        onChange={(e) => setPrecioMenudeoManual(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 p-5 px-8 shrink-0 flex items-center justify-end gap-3 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-6 py-2.5 rounded-xl font-medium text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isUploading ? "Guardando..." : "Guardar Producto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── withObservables Wrapper ────────────────────────────────
const enhance = withObservables([], () => ({
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

const AddInventory = enhance(AddInventoryInner);
export default AddInventory;
