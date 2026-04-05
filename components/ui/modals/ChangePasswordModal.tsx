import { Lock, X } from 'lucide-react';
import { useState } from 'react';

export interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newPassword: string) => void;
    targetUserName: string;
}

export default function ChangePasswordModal({ isOpen, onClose, onSave, targetUserName }: ChangePasswordModalProps) {
    const [password, setPassword] = useState("");

    if (!isOpen) return null;

    const handleSave = () => {
        if (password.length >= 6) {
            onSave(password);
            setPassword("");
        }
    };

    return (
        <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => {
                setPassword("");
                onClose();
            }} />
            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-xl flex flex-col items-center">
                        <button onClick={() => {
                            setPassword("");
                            onClose();
                        }} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                        
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
                            <Lock className="h-8 w-8 text-blue-600" />
                        </div>
                        
                        <h3 className="text-xl font-bold leading-6 text-slate-900 mb-2 text-center">Cambiar Contraseña</h3>
                        <div className="mt-2 mb-6 w-full text-center">
                            <p className="text-sm text-slate-500">Asigna una nueva clave secreta para el usuario <span className="font-bold text-slate-700">{targetUserName}</span>.</p>
                        </div>
                        
                        <div className="w-full text-left mb-6">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Nueva Contraseña <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium outline-none transition-all ${password.length > 0 && password.length < 6 ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20" : "border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500"}`}
                                placeholder="Mínimo 6 caracteres"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            {password.length > 0 && password.length < 6 && (
                                <p className="text-xs text-rose-500 mt-1.5 font-medium">La contraseña debe tener al menos 6 caracteres.</p>
                            )}
                        </div>

                        <div className="mt-4 w-full flex gap-3">
                            <button type="button" className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-colors" onClick={() => {
                                setPassword("");
                                onClose();
                            }}>Cancelar</button>
                            <button 
                                type="button" 
                                disabled={password.length < 6}
                                className={`w-full rounded-xl py-3 text-sm font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${password.length < 6 ? "bg-slate-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"}`} 
                                onClick={handleSave}
                            >
                                Guardar Contraseña
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
