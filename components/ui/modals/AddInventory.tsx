import { Q } from "@nozbe/watermelondb";
import withObservables from "@nozbe/with-observables";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import {
    Calendar,
    Camera,
    DollarSign,
    ImagesIcon,
    Info,
    Package,
    X,
} from "lucide-react";
import React, { useState } from "react";
import { Alert, Platform } from "react-native";
import { supabase } from "../../../src/services/api/supabaseClient";
import { database } from "../../../src/services/DB/indexBD";
import AlmacenModel from "../../../src/services/DB/models/bases/almacen";
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
}

function AddInventoryInner({
  isOpen,
  onClose,
  familias,
  margenes,
  impuestos,
}: AddInventoryInnerProps) {
  const [nombre, setNombre] = useState("");
  const [familiaId, setFamiliaId] = useState("");
  const [codigoInterno, setCodigoInterno] = useState("");
  const [codigoAlterno, setCodigoAlterno] = useState("");
  const [margen, setMargen] = useState("");
  const [costoPromedio, setCostoPromedio] = useState("");
  const [sat, setSat] = useState("");
  const [selectedImpuestos, setSelectedImpuestos] = useState<string[]>([]);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageExt, setImageExt] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400";
  const selectClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-600";

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
      // Count existing products in this family
      const productosEnFamilia = await database.collections
        .get<Producto>("productos")
        .query(Q.where("familia_id", selectedFamiliaId))
        .fetchCount();
      // Format: 2-digit family code + 3-digit sequential (e.g., 01021)
      const codigoFam = familia.codigoFamilia.padStart(2, "0");
      const siguiente = String(productosEnFamilia + 1).padStart(3, "0");
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

  const resetForm = () => {
    setNombre("");
    setFamiliaId("");
    setCodigoInterno("");
    setCodigoAlterno("");
    setMargen("");
    setCostoPromedio("");
    setSat("");
    setSelectedImpuestos([]);
    setImageUri(null);
    setImageBase64(null);
  };

  const handleSave = async () => {
    try {
      if (!nombre || !codigoInterno) {
        alert(
          "Por favor llena los campos obligatorios (Nombre y Código Interno).",
        );
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

      // Create all records in a single batch
      await database.write(async () => {
        const precio = parseFloat(costoPromedio) || 0;

        // 1. Create Producto
        const nuevoProducto = await database
          .get<Producto>("productos")
          .create((p) => {
            p.descripcion = nombre;
            p.codigoInterno = codigoInterno;
            if (familiaId) {
              (p as any)._raw.familia_id = familiaId;
            }
            p.estado = true;
            if (publicUrl) p.imagen = publicUrl;
            p.precioLista = precio;
            p.precioMayoreo = precio;
            p.precioMenudeo = precio;
          });

        // 2. Create ProductoImpuesto junction records
        for (const impId of selectedImpuestos) {
          await database
            .get<ProductoImpuesto>("producto_impuestos")
            .create((pi) => {
              (pi as any)._raw.producto_id = nuevoProducto.id;
              (pi as any)._raw.impuesto_id = impId;
            });
        }
      });

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
      <div className="relative z-10 bg-slate-50 w-full max-w-5xl max-h-[95vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-white px-8 py-5 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Agregar Nuevo Producto
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Completa los datos para registrar un elemento en el stock
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form className="flex flex-col gap-8">
            {/* ROW 1: Información General + Inventario y Lotes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              {/* Información General */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5 flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-700">
                    Información General
                  </h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Código Alterno *
                    </label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Ej. Codigo de Barras"
                      value={codigoAlterno}
                      onChange={(e) => setCodigoAlterno(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Categoría de Margen
                  </label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {margenes.filter(m => m.estado).map((m) => (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${margen === m.id ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"}`}
                      >
                        <input
                          type="radio"
                          name="margen"
                          value={m.id}
                          checked={margen === m.id}
                          onChange={(e) => setMargen(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-600 font-medium">
                          {m.nombre} ({m.porcentaje}%)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>


            </div>

            {/* ROW 2: Fotografía + Fiscal y Finanzas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              {/* Fotografía */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                  <ImagesIcon className="w-5 h-5 text-teal-400" />
                  <h3 className="text-base font-bold text-slate-700">
                    Fotografía del Producto
                  </h3>
                </div>
                <div
                  onClick={chooseImageSource}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-blue-400 transition-all cursor-pointer group relative overflow-hidden flex-1"
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
                      <p className="text-sm font-medium text-slate-700">
                        Haz clic para tomar o subir imagen
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

              {/* Fiscal y Finanzas */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5 flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-slate-700">
                    Fiscal y Finanzas
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Costo Inicial *
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
                        value={costoPromedio}
                        onChange={(e) => setCostoPromedio(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Impuestos Aplicables
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {impuestos
                      .filter((imp) => imp.activo)
                      .map((imp) => (
                        <label
                          key={imp.id}
                          className={`flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border cursor-pointer hover:border-blue-400 transition-colors ${selectedImpuestos.includes(imp.id) ? "border-blue-500 bg-blue-50/50" : "border-slate-200"}`}
                        >
                          <input
                            type="checkbox"
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                            checked={selectedImpuestos.includes(imp.id)}
                            onChange={() => toggleImpuesto(imp.id)}
                          />
                          <span className="text-sm font-medium text-slate-700">
                            {imp.nombre} ({imp.tasa}%)
                          </span>
                        </label>
                      ))}
                    {impuestos.filter((imp) => imp.activo).length === 0 && (
                      <p className="text-xs text-slate-400 col-span-2">
                        No hay impuestos registrados. Créalos en Catálogos.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-100 p-5 px-8 shrink-0 flex items-center justify-end gap-3 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-6 py-2.5 rounded-xl font-medium text-sm text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
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
