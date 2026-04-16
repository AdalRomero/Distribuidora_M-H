import React, { useEffect, useState } from 'react';
import { X, Calendar, DollarSign, Edit3 } from 'lucide-react';
import { database } from '../../../src/services/DB/indexBD';
import { syncApp } from '../../../src/sync';
import LoteModel from '../../../src/services/DB/models/catalogo/lote';

import * as Crypto from 'expo-crypto';

interface EditLoteProps {
    isOpen: boolean;
    onClose: () => void;
    lote: LoteModel | null;
}

export default function EditLote({ isOpen, onClose, lote }: EditLoteProps) {
    const [identificadorLote, setIdentificadorLote] = useState("");
    const [costoAdquisicion, setCostoAdquisicion] = useState("");
    const [cantidad, setCantidad] = useState("");
    const [fechaCaducidad, setFechaCaducidad] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && lote) {
            setIdentificadorLote(lote.identificadorLote);
            setCostoAdquisicion(lote.costoAdquisicion ? String(lote.costoAdquisicion) : "");
            setCantidad(lote.cantidad !== undefined && lote.cantidad !== null ? String(lote.cantidad) : "");
            if (lote.fechaCaducidad) {
                try {
                    const dateStr = new Date(lote.fechaCaducidad).toISOString().split("T")[0];
                    setFechaCaducidad(dateStr);
                } catch(e) {}
            } else {
                setFechaCaducidad("");
            }
        } else if (!isOpen) {
            setIdentificadorLote("");
            setCostoAdquisicion("");
            setCantidad("");
            setFechaCaducidad("");
        }
    }, [isOpen, lote]);

    if (!isOpen || !lote) return null;

    const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400";

    const handleSave = async () => {
        if (!identificadorLote || !costoAdquisicion) {
            alert("Identificador y Costo son obligatorios");
            return;
        }
        setIsSaving(true);
        try {
            await database.write(async () => {
                const oldCantidad = lote.cantidad;
                const newCantidad = parseInt(cantidad, 10) || 0;
                const oldCosto = lote.costoAdquisicion;
                const newCosto = parseFloat(costoAdquisicion) || 0;

                await lote.update((l) => {
                    l.identificadorLote = identificadorLote;
                    l.costoAdquisicion = newCosto;
                    l.cantidad = newCantidad;
                    if (fechaCaducidad) {
                        const parsed = new Date(fechaCaducidad).getTime();
                        if (!isNaN(parsed) && parsed > 0) {
                            l.fechaCaducidad = parsed;
                        } else {
                            (l as any)._raw.fecha_caducidad = null;
                        }
                    } else {
                        (l as any)._raw.fecha_caducidad = null;
                    }
                });

                // Si cambió la cantidad o el costo, siempre dejamos un rastro de edición
                if (oldCantidad !== newCantidad || oldCosto !== newCosto) {
                    const almacenes = await database.collections.get('almacenes').query().fetch();
                    const almacenId = almacenes.length > 0 ? almacenes[0].id : 'default';

                    await database.collections.get('movimientos_inventario').create((m: any) => {
                        m._raw.id = Crypto.randomUUID();
                        m.almacen.id = almacenId;
                        m.producto.id = lote.producto.id;
                        m.lote.id = lote.id;
                        m.tipo = oldCantidad !== newCantidad ? 'AJUSTE_ABSOLUTO' : 'AJUSTE_EDICION'; // AJUSTE_EDICION para trazar cambios de costo
                        m.cantidad = newCantidad;
                        m.usuarioId = 'Local-App'; 
                    });
                }

                // Si cambió el costo, recalculamos los precios del producto
                if (oldCosto !== newCosto) {
                    const producto = await lote.producto.fetch();
                    if (producto) {
                        const margen = await producto.margen.fetch();
                        if (margen) {
                            const multiplier = 1 + (margen.porcentaje / 100);
                            const nuevoPrecio = parseFloat((newCosto * multiplier).toFixed(2));
                            await producto.update((p: any) => {
                                p.precioLista = nuevoPrecio;
                                p.precioMayoreo = nuevoPrecio;
                                p.precioMenudeo = nuevoPrecio;
                            });
                        }
                    }
                }
            });
            syncApp().catch(console.error);
            setIsSaving(false);
            onClose();
        } catch (error: any) {
            console.error("Error editando lote:", error);
            alert("Error al guardar: " + error.message);
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative z-10 bg-white w-full max-w-md flex flex-col rounded-3xl shadow-2xl overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Edit3 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Editar Lote</h2>
                            <p className="text-xs text-slate-500">Actualiza la info del lote</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={isSaving} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Identificador de Lote *</label>
                        <input
                            type="text"
                            className={inputClass}
                            value={identificadorLote}
                            onChange={(e) => setIdentificadorLote(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                            Costo de Adquisición *
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={inputClass}
                            value={costoAdquisicion}
                            onChange={(e) => setCostoAdquisicion(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                            Cantidad Actual *
                        </label>
                        <input
                            type="number"
                            min="0"
                            className={inputClass}
                            value={cantidad}
                            onChange={(e) => setCantidad(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            Fecha de Caducidad
                        </label>
                        <input
                            type="date"
                            className={inputClass}
                            value={fechaCaducidad}
                            onChange={(e) => setFechaCaducidad(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-100 p-4 shrink-0 flex items-center justify-end gap-3 rounded-b-3xl">
                    <button type="button" onClick={onClose} disabled={isSaving} className="px-5 py-2 rounded-xl font-medium text-sm text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50">
                        {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}
