import { useState, KeyboardEvent } from 'react';
import { Keyboard, X, Save, Command } from 'lucide-react';

export interface HotkeysModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface HotkeyOption {
    id: string;
    label: string;
    description: string;
    defaultKey: string;
}

const PAGE_HOTKEYS: HotkeyOption[] = [
    { id: 'nav_home', label: 'Inicio', description: 'Ir al panel de inicio', defaultKey: 'Ctrl + H' },
    { id: 'nav_inventory', label: 'Inventario', description: 'Abrir gestión de inventario', defaultKey: 'Ctrl + I' },
    { id: 'nav_clients', label: 'Clientes', description: 'Ver directorio de clientes', defaultKey: 'Ctrl + C' },
    { id: 'nav_prices', label: 'Precios', description: 'Administrar listas de precios', defaultKey: 'Ctrl + P' },
    { id: 'nav_invoices', label: 'Facturas', description: 'Ir a facturación e informes', defaultKey: 'Ctrl + F' },
    { id: 'nav_settings', label: 'Configuraciones', description: 'Abrir esta página', defaultKey: 'Ctrl + S' },
];

export default function HotkeysModal({ isOpen, onClose }: HotkeysModalProps) {
    const [hotkeys, setHotkeys] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        PAGE_HOTKEYS.forEach(k => initial[k.id] = k.defaultKey);
        return initial;
    });

    const [recordingId, setRecordingId] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
        e.preventDefault();
        
        if (e.key === 'Escape') {
            setRecordingId(null);
            return;
        }

        const keys = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');
        if (e.metaKey) keys.push('Cmd');
        
        // Evitamos registrar solo teclas modificadoras
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
            keys.push(e.key.toUpperCase());
            const combination = keys.join(' + ');
            setHotkeys(prev => ({ ...prev, [id]: combination }));
            setRecordingId(null);
        }
    };

    const handleSave = () => {
        // Aquí se guardarían los atajos en un Contexto o Estado global
        console.log('Saved Hotkeys:', hotkeys);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                                    <Keyboard className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">Atajos de Navegación</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">Configura combinaciones de teclas para abrir secciones rápidamente</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <div className="space-y-4">
                                {PAGE_HOTKEYS.map((item) => {
                                    const isRecording = recordingId === item.id;
                                    const currentKey = hotkeys[item.id];

                                    return (
                                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                            <div>
                                                <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                                                <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                                            </div>
                                            
                                            <button 
                                                onClick={() => setRecordingId(isRecording ? null : item.id)}
                                                onKeyDown={(e) => isRecording && handleKeyDown(e, item.id)}
                                                className={`relative w-full sm:w-48 px-4 py-2.5 rounded-lg text-sm font-mono flex items-center justify-center overflow-hidden transition-all outline-none
                                                    ${isRecording 
                                                        ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-700 shadow-inner' 
                                                        : 'bg-white border text-slate-600 border-slate-200 hover:border-indigo-300 focus:border-indigo-500 shadow-sm'
                                                    }`}
                                            >
                                                {isRecording ? (
                                                    <span className="flex items-center gap-2 animate-pulse">
                                                        <Command className="w-4 h-4" /> Presiona teclas...
                                                    </span>
                                                ) : (
                                                    <span className="tracking-widest font-bold">
                                                        {currentKey || 'Asignar atajo'}
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/80">
                            <button 
                                onClick={onClose} 
                                className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 font-medium text-sm rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSave} 
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
                            >
                                <Save className="w-4 h-4" />
                                Guardar Atajos
                            </button>
                        </div>
                        
                    </div>
                </div>
            </div>
        </div>
    );
}
