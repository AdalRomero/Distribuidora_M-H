import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { X, UploadCloud, Info, DollarSign, Package, Calendar, ImagesIcon, Camera } from 'lucide-react';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../src/services/api/supabaseClient';
import { database } from '../../../src/services/DB/indexBD';
import Producto from '../../../src/services/DB/models/catalogo/producto';

interface AddInventoryProps { isOpen: boolean; onClose: () => void; }

export default function AddInventory({ isOpen, onClose }: AddInventoryProps) {
    const [nombre, setNombre] = useState('');
    const [familia, setFamilia] = useState('');
    const [codigoInterno, setCodigoInterno] = useState('');
    const [codigoAlterno, setCodigoAlterno] = useState('');
    const [margen, setMargen] = useState('');
    const [almacen, setAlmacen] = useState('');
    const [lote, setLote] = useState('');
    const [existencia, setExistencia] = useState('');
    const [margenMinimo, setMargenMinimo] = useState('');
    const [unidad, setUnidad] = useState('pzas');
    const [caducidad, setCaducidad] = useState('');
    const [costoPromedio, setCostoPromedio] = useState('');
    const [sat, setSat] = useState('');
    const [iva, setIva] = useState(false);
    const [ieps, setIeps] = useState(false);

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imageExt, setImageExt] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    if (!isOpen) return null;

    const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400";
    const selectClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-600";

    const chooseImageSource = () => {
        if (Platform.OS === 'web') {
            pickImage('gallery');
            return;
        }
        Alert.alert(
            "Seleccionar Imagen",
            "Elige de dónde quieres obtener la imagen",
            [
                { text: "Cámara", onPress: () => pickImage('camera') },
                { text: "Galería", onPress: () => pickImage('gallery') },
                { text: "Cancelar", style: "cancel" }
            ]
        );
    };

    const pickImage = async (source: 'camera' | 'gallery') => {
        let result;
        const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: true,
        };

        if (source === 'camera') {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                alert("Se requieren permisos de cámara");
                return;
            }
            result = await ImagePicker.launchCameraAsync(options);
        } else {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                alert("Se requieren permisos de galería");
                return;
            }
            result = await ImagePicker.launchImageLibraryAsync(options);
        }

        if (!result.canceled && result.assets[0].base64) {
            setImageUri(result.assets[0].uri);
            setImageBase64(result.assets[0].base64);
            const uriParts = result.assets[0].uri.split('.');
            setImageExt(uriParts[uriParts.length - 1] || 'jpeg');
        }
    };

    const handleSave = async () => {
        try {
            if (!nombre || !codigoInterno) {
                alert("Por favor llena los campos obligatorios (Nombre y Código Interno).");
                return;
            }
            setIsUploading(true);
            let publicUrl = null;

            if (imageBase64) {
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${imageExt || 'jpeg'}`;
                const { error: uploadError } = await supabase.storage
                    .from('productos')
                    .upload(`public/${fileName}`, decode(imageBase64), {
                        contentType: `image/${imageExt || 'jpeg'}`,
                    });
                
                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('productos').getPublicUrl(`public/${fileName}`);
                publicUrl = data.publicUrl;
            }

            await database.write(async () => {
                await database.get<Producto>('productos').create(p => {
                    p.descripcion = nombre;
                    p.codigoInterno = codigoInterno;
                    // TODO: Ligar familia real si existe
                    // p.familia.id = familia || ''; 
                    p.estado = true;
                    if (publicUrl) p.imagen = publicUrl;
                    p.precioLista = parseFloat(costoPromedio) || 0;
                    p.precioMayoreo = parseFloat(costoPromedio) || 0;
                    p.precioMenudeo = parseFloat(costoPromedio) || 0;
                });
            });

            setIsUploading(false);
            onClose();
        } catch (error: any) {
            console.error("Error saving product:", error);
            alert("Error al guardar: " + error.message);
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative z-10 bg-slate-50 w-full max-w-5xl max-h-[95vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-white px-8 py-5 flex items-center justify-between border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Agregar Nuevo Producto</h2>
                        <p className="text-sm text-slate-500 mt-1">Completa los datos para registrar un elemento en el stock</p>
                    </div>
                    <button onClick={onClose} disabled={isUploading} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <form className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            {/* Información General */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                                    <Info className="w-5 h-5 text-blue-600" /><h3 className="text-base font-bold text-slate-700">Información General</h3>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del Producto *</label>
                                    <input type="text" className={inputClass} placeholder="Ej. Harina Selecta Alta Proteína 25kg" value={nombre} onChange={e => setNombre(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Familia *</label>
                                        <select className={selectClass} value={familia} onChange={e => setFamilia(e.target.value)}><option value="">Selecciona...</option><option value="harinas">Harinas</option><option value="colorantes">Colorantes</option><option value="saborizantes">Saborizantes</option><option value="chocolates">Chocolates</option><option value="levaduras">Levaduras</option></select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Código Interno *</label>
                                        <input type="text" className={inputClass} placeholder="Ej. 14-001" value={codigoInterno} onChange={e => setCodigoInterno(e.target.value)} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Código Alterno *</label>
                                        <input type="text" className={inputClass} placeholder="Ej. Codigo de Barras" value={codigoAlterno} onChange={e => setCodigoAlterno(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría de Margen</label>
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        {['Margen Ideal', 'De Servicio', 'Margen Alto', 'Margen Bajo'].map((m) => (
                                            <label key={m} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${margen === m ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                                                <input type="radio" name="margen" value={m} checked={margen === m} onChange={e => setMargen(e.target.value)} className="text-blue-600 focus:ring-blue-500" /><span className="text-sm text-slate-600 font-medium">{m}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Fotografía */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                                    <ImagesIcon className="w-5 h-5 text-teal-400" /><h3 className="text-base font-bold text-slate-700">Fotografía del Producto</h3>
                                </div>
                                <div onClick={chooseImageSource} className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-blue-400 transition-all cursor-pointer group relative overflow-hidden">
                                    {imageUri ? (
                                        <img src={imageUri} alt="Producto" className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Camera className="w-6 h-6" /></div>
                                            <p className="text-sm font-medium text-slate-700">Haz clic para tomar o subir imagen</p>
                                            <p className="text-xs text-slate-400 mt-1">PNG, JPG o WEBP (Max. 2MB)</p>
                                        </>
                                    )}
                                </div>
                                {imageUri && (
                                    <button type="button" onClick={() => { setImageUri(null); setImageBase64(null); }} className="mt-3 text-sm text-red-500 font-medium hover:text-red-700 w-full text-center">
                                        Eliminar Imagen
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            {/* Inventario y Lotes */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                                    <Package className="w-5 h-5 text-rose-500" /><h3 className="text-base font-bold text-slate-700">Inventario y Control de Lotes</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Almacén de Entrada *</label>
                                        <select className={selectClass} value={almacen} onChange={e => setAlmacen(e.target.value)}><option value="">Selecciona...</option><option value="central">Bodega Central</option><option value="estante-a">Estante A (Mostrador)</option><option value="estante-b">Estante B (Mostrador)</option><option value="fria">Bodega Fría</option></select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Lote *</label>
                                        <input type="text" className={inputClass} placeholder="Identificador de lote" value={lote} onChange={e => setLote(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Existencia Inicial *</label>
                                        <input type="number" min="0" className={inputClass} placeholder="0" value={existencia} onChange={e => setExistencia(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Margen mínimo *</label>
                                        <input type="number" min="0" className={inputClass} placeholder="Ej. 8" value={margenMinimo} onChange={e => setMargenMinimo(e.target.value)} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Unidad de Medida *</label>
                                        <select className={selectClass} value={unidad} onChange={e => setUnidad(e.target.value)}><option value="pzas">Piezas (pzas)</option><option value="kg">Kilogramos (kg)</option><option value="litros">Litros (L)</option><option value="cajas">Cajas</option><option value="bultos">Bultos</option><option value="galones">Galones</option></select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" />Fecha de Caducidad</label>
                                    <input type="date" className={`${inputClass} text-slate-600`} value={caducidad} onChange={e => setCaducidad(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button type="button" className="w-full px-3 py-2.5 rounded-xl font-medium text-sm text-white bg-yellow-400 hover:bg-yellow-500 shadow-md shadow-yellow-500/20 active:scale-95 transition-all">Avisame 3 meses antes</button>
                                    <button type="button" className="w-full px-3 py-2.5 rounded-xl font-medium text-sm text-white bg-red-700 hover:bg-red-800 shadow-md shadow-red-500/20 active:scale-95 transition-all">Avisame 1 mes antes</button>
                                </div>
                            </div>

                            {/* Fiscal y Finanzas */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                                    <DollarSign className="w-5 h-5 text-emerald-500" /><h3 className="text-base font-bold text-slate-700">Fiscal y Finanzas</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Costo Promedio *</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-400 sm:text-sm">$</span></div>
                                            <input type="number" step="0.01" min="0" className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400" placeholder="0.00" value={costoPromedio} onChange={e => setCostoPromedio(e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Clave SAT</label>
                                        <input type="text" className={inputClass} placeholder="Ej. 50121500" value={sat} onChange={e => setSat(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Impuestos Aplicables</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className={`flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border cursor-pointer hover:border-blue-400 transition-colors ${iva ? 'border-blue-500' : 'border-slate-200'}`}>
                                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" checked={iva} onChange={e => setIva(e.target.checked)} /><span className="text-sm font-medium text-slate-700">Aplica IVA (16%)</span>
                                        </label>
                                        <label className={`flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border cursor-pointer hover:border-blue-400 transition-colors ${ieps ? 'border-blue-500' : 'border-slate-200'}`}>
                                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" checked={ieps} onChange={e => setIeps(e.target.checked)} /><span className="text-sm font-medium text-slate-700">Aplica IEPS (8%)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="bg-white border-t border-slate-100 p-5 px-8 shrink-0 flex items-center justify-end gap-3 rounded-b-3xl">
                    <button type="button" onClick={onClose} disabled={isUploading} className="px-6 py-2.5 rounded-xl font-medium text-sm text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50">Cancelar</button>
                    <button type="button" onClick={handleSave} disabled={isUploading} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50">
                        {isUploading ? 'Guardando...' : 'Guardar Producto'}
                    </button>
                </div>
            </div>
        </div>
    );
}
