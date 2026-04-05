import HotkeysModal from '@/components/ui/modals/HotkeysModal';
import SuccessModal from '@/components/ui/modals/SuccessModal';
import { Bell, Keyboard, Save, Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';

export default function Settings() {
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isHotkeysModalOpen, setIsHotkeysModalOpen] = useState(false);

    const handleSave = () => {
        setIsSuccessModalOpen(true);
    }
    return (
        <div className="p-4 sm:p-8 bg-slate-50 min-h-screen font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-mh-blue-dark tracking-tight">Configuraciones</h1>
                    <p className="text-slate-500 text-sm mt-1">Administra las preferencias generales y atajos del sistema.</p>
                </div>
                <button onClick={() => handleSave()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm">
                    <Save className="w-4 h-4" /><span>Guardar Cambios</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Hotkeys Cover / Featured Card */}
                <div className="lg:col-span-3">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 md:p-8 rounded-2xl shadow-md text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Decorative background vectors */}
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                        <div className="absolute bottom-0 left-10 -mb-10 w-32 h-32 bg-indigo-900/20 rounded-full blur-xl pointer-events-none"></div>

                        <div className="relative z-10 max-w-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                                    <Keyboard className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight">Atajos de Teclado (Hotkeys)</h2>
                            </div>
                            <p className="text-blue-100 text-sm md:text-base leading-relaxed">
                                Optimiza tu flujo de trabajo configurando accesos rápidos para las acciones más comunes del sistema. Genera combinaciones a tu medida.
                            </p>
                        </div>

                        <div className="relative z-10 w-full md:w-auto shrink-0 flex flex-col gap-3">
                            <div className="flex items-center gap-2 bg-black/20 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                                <span className="text-sm font-medium mr-2 text-blue-50">Ejemplo:</span>
                                <kbd className="px-2.5 py-1 bg-white/20 rounded text-sm font-mono font-bold shadow-sm border border-white/30 text-white tracking-widest">CTRL</kbd>
                                <span className="text-blue-200 font-bold px-1">+</span>
                                <kbd className="px-2.5 py-1 bg-white/20 rounded text-sm font-mono font-bold shadow-sm border border-white/30 text-white tracking-widest">N</kbd>
                            </div>
                            <button onClick={() => setIsHotkeysModalOpen(true)} className="w-full px-6 py-3 bg-white text-blue-700 hover:bg-slate-50 font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95 text-center flex items-center justify-center gap-2">
                                <Keyboard className="w-4 h-4" />
                                Configurar Atajos
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Settings Area */}
                <div className="lg:col-span-3 space-y-6">
                    {/* General Settings */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                                <SettingsIcon className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Preferencias Generales</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-slate-700 text-sm">Tema de la Interfaz</p>
                                    <p className="text-xs text-slate-500 mt-1">Selecciona el modo de color de la aplicación.</p>
                                </div>
                                <select className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium">
                                    <option>Modo Claro</option>
                                    <option>Modo Oscuro</option>
                                    <option>Automático</option>
                                </select>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-slate-700 text-sm">Idioma</p>
                                    <p className="text-xs text-slate-500 mt-1">Establece el idioma principal del sistema.</p>
                                </div>
                                <select className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium">
                                    <option>Español (México)</option>
                                    <option>English (US)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                <Bell className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Notificaciones</h2>
                        </div>

                        <div className="space-y-6">
                            {[
                                { title: 'Alertas de Inventario', desc: 'Recibir aviso cuando un producto esté por agotarse.', default: true },
                                { title: 'Resumen de Ventas', desc: 'Envío automático del corte de caja diario.', default: true },
                                { title: 'Actualizaciones del Sistema', desc: 'Notificar sobre nuevas funciones y mejoras.', default: false }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-semibold text-slate-700 text-sm">{item.title}</p>
                                        <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                                        <input type="checkbox" className="sr-only peer" defaultChecked={item.default} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info 
                    <div className="lg:col-span-1 space-y-6">
                        {/* User Profile Mini 
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                            <div className="w-20 h-20 bg-blue-50 rounded-full mx-auto mb-4 flex items-center justify-center text-blue-600 border-4 border-white shadow-sm">
                                <User className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-slate-800">Administrador</h3>
                            <p className="text-xs text-slate-500 mt-1">admin@distribuidoramh.com</p>
                            <button className="mt-6 w-full px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors">
                                Editar Perfil
                            </button>
                        </div>

                        /* Security 
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <h2 className="text-base font-bold text-slate-800">Seguridad</h2>
                            </div>
                            <div className="space-y-3">
                                <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl text-sm font-medium text-slate-700 border border-slate-200 flex items-center justify-between">
                                    Cambiar Contraseña
                                    <span className="text-slate-400">›</span>
                                </button>
                                <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl text-sm font-medium text-slate-700 border border-slate-200 flex items-center justify-between">
                                    Historial de Sesiones
                                    <span className="text-slate-400">›</span>
                                </button>
                            </div>
                        </div>
                    </div>
                */}

            </div>
            <SuccessModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title={'Cambios Guardados'} message={'Tus configuraciones han sido guardadas exitosamente.'} />
            <HotkeysModal isOpen={isHotkeysModalOpen} onClose={() => setIsHotkeysModalOpen(false)} />
        </div>
    );
}
