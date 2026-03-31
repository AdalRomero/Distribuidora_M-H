import { useState, useEffect, useMemo } from 'react';
import {
    Search, Edit2, Trash2, Shield, User as UserIcon, Mail, Lock, Unlock,
    Check, X, AlertCircle, RotateCcw, Loader2
} from 'lucide-react';

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
    'Administrador': ['Inventario', 'Clientes', 'Facturas', 'Precios', 'Usuarios', 'Configuraciones'],
    'Ventas': ['Inventario', 'Clientes', 'Facturas'],
    'Cobranza': ['Clientes', 'Facturas'],
    'Empleado': ['Inventario', 'Clientes'],
    'Personalizado': []
};

type RoleType = 'Administrador' | 'Empleado' | 'Ventas' | 'Cobranza' | 'Personalizado' | 'DEV';

interface UserItem {
    id: string; username: string; nombres: string; apellidos: string;
    email: string; role: RoleType; status: boolean; permissions: string[]; empresas: string[];
}

const initialUsers: UserItem[] = [
    { id: '1', username: 'admin.mh', nombres: 'Administrador', apellidos: 'Principal', email: 'admin@distribuidoramh.com', role: 'Administrador', status: true, permissions: DEFAULT_PERMISSIONS['Administrador'], empresas: ['MH'] },
    { id: '2', username: 'vendedor.1', nombres: 'Juan', apellidos: 'Pérez', email: 'juan@distribuidoramh.com', role: 'Ventas', status: true, permissions: DEFAULT_PERMISSIONS['Ventas'], empresas: ['MH'] },
];

export default function Users() {
    const [searchTerm, setSearchTerm] = useState('');
    const [usersList, setUsersList] = useState<UserItem[]>(initialUsers);
    const [isLoadingTable, setIsLoadingTable] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const [username, setUsername] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<RoleType>('Empleado');
    const [isActive, setIsActive] = useState(true);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(DEFAULT_PERMISSIONS['Empleado']);

    const currentEmpresa = 'MH';
    const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([currentEmpresa]);

    const permissionOptions = ['Inventario', 'Clientes', 'Facturas', 'Precios', 'Usuarios', 'Configuraciones'];

    useEffect(() => { if (message?.type === 'success') { const timer = setTimeout(() => setMessage(null), 3000); return () => clearTimeout(timer); } }, [message]);

    const resetForm = () => { setEditingUserId(null); setUsername(''); setLastName(''); setEmail(''); setPassword(''); setRole('Empleado'); setIsActive(true); setSelectedPermissions(DEFAULT_PERMISSIONS['Empleado']); setSelectedEmpresas([currentEmpresa]); };

    const handleEditClick = (user: UserItem) => { setEditingUserId(user.id); setUsername(user.nombres); setLastName(user.apellidos); setEmail(user.email); setRole(user.role); setIsActive(user.status); setSelectedPermissions(user.permissions); setSelectedEmpresas(user.empresas); setPassword(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    const handleToggleStatus = async (userId: string, userName: string, currentStatus: boolean) => {
        const accion = currentStatus ? 'desactivar' : 'reactivar';
        if (!window.confirm(`¿Estás seguro de ${accion} a ${userName}?`)) return;
        setIsLoadingTable(true);
        setTimeout(() => {
            setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: !currentStatus } : u));
            setMessage({ type: 'success', text: `Usuario ${currentStatus ? 'inactivado' : 'activado'} correctamente.` });
            if (editingUserId === userId) resetForm();
            setIsLoadingTable(false);
        }, 500);
    };

    const handleSubmit = async () => {
        if (!username || (!email && !editingUserId)) { setMessage({ type: 'error', text: 'Por favor, completa los campos obligatorios.' }); return; }
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        if (editingUserId) {
            setUsersList(prev => prev.map(u => u.id === editingUserId ? { ...u, nombres: username, apellidos: lastName, role, permissions: selectedPermissions, status: isActive } : u));
            setMessage({ type: 'success', text: 'Usuario actualizado exitosamente.' }); resetForm();
        } else {
            if (!password || password.length < 6) { setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' }); setIsLoading(false); return; }
            const newUser: UserItem = { id: Math.random().toString(36).substr(2, 9), username: email.split('@')[0], nombres: username, apellidos: lastName, email, role, status: isActive, permissions: selectedPermissions, empresas: selectedEmpresas };
            setUsersList(prev => [...prev, newUser]); setMessage({ type: 'success', text: 'Usuario creado exitosamente.' }); resetForm();
        }
        setIsLoading(false);
    };

    const togglePermission = (perm: string) => { setSelectedPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]); };

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return usersList;
        const s = searchTerm.toLowerCase();
        return usersList.filter(u => u.username?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.nombres?.toLowerCase().includes(s) || u.apellidos?.toLowerCase().includes(s));
    }, [usersList, searchTerm]);

    const StatusBadge = ({ active }: { active: boolean }) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${active ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/50' : 'bg-rose-100/80 text-rose-700 border border-rose-200/50'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            {active ? 'Activo' : 'Inactivo'}
        </span>
    );

    const RoleBadge = ({ roleName }: { roleName: string }) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider shadow-sm ${roleName === 'Administrador' ? 'bg-gradient-to-r from-purple-50 to-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 border-blue-200'}`}>
            <Shield className="w-3 h-3" />{roleName}
        </span>
    );

    return (
        <div className="p-4 sm:p-8 bg-slate-50 min-h-screen font-sans relative">

            {/* POP-UP MODAL FLOTANTE */}
            {message && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px]">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 relative border border-slate-100">
                        <button onClick={() => setMessage(null)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-inner ${message.type === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                            {message.type === 'error' ? <AlertCircle className="w-10 h-10 animate-pulse" strokeWidth={2.5} /> : <Check className="w-10 h-10 animate-bounce" strokeWidth={3} />}
                        </div>
                        <h3 className={`text-xl font-extrabold text-center mb-2 ${message.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {message.type === 'error' ? 'Ocurrió un problema' : '¡Éxito!'}
                        </h3>
                        <p className="text-slate-600 text-center text-sm font-medium leading-relaxed">{message.text}</p>
                        <button onClick={() => setMessage(null)} className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Entendido</button>
                    </div>
                </div>
            )}

            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Usuarios</h1>
                    <p className="text-slate-500 text-sm mt-1">Administra los accesos y roles de tu equipo de trabajo (Modo Demostrativo).</p>
                </div>
                {editingUserId && (
                    <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold rounded-lg transition-colors text-sm shadow-sm">
                        <RotateCcw className="w-4 h-4" /> Cancelar Edición
                    </button>
                )}
            </div>

            <div className="flex flex-col xl:flex-row gap-6">

                {/* Panel Izquierdo: Lista de Usuarios */}
                <div className="w-full xl:w-2/3 flex flex-col gap-4">
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-5 h-5 text-slate-400" /></div>
                            <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Buscar usuarios por nombre, correo o rol..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="px-4 py-3 xl:px-3">Usuario</th>
                                        <th className="px-4 py-3 xl:px-3">Rol</th>
                                        <th className="px-4 py-3 xl:px-3">Permisos</th>
                                        <th className="px-4 py-3 xl:px-3">Estado</th>
                                        <th className="px-4 py-3 xl:px-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 relative">
                                    {isLoadingTable ? (
                                        <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></td></tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr><td colSpan={5} className="py-10 text-center text-slate-500">No hay usuarios que coincidan con la búsqueda.</td></tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user.id} className={`transition-colors group ${editingUserId === user.id ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}>
                                                <td className="px-4 py-3 xl:px-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border text-slate-700 font-bold text-sm shadow-sm">
                                                            {user.nombres[0].toUpperCase()}{user.apellidos[0]?.toUpperCase() || ''}
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-900 font-bold">{user.nombres} {user.apellidos}</p>
                                                            <p className="text-slate-500 text-xs mt-0.5">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 xl:px-3"><RoleBadge roleName={user.role} /></td>
                                                <td className="px-4 py-3 xl:px-3">
                                                    {user.role === 'Administrador' || user.role === 'DEV' ? (
                                                        <span className="text-xs font-bold text-slate-500 italic">Acceso Total</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1 max-w-[140px] whitespace-normal">
                                                            {user.permissions && user.permissions.length > 0 ? user.permissions.map((p: string) => (
                                                                <span key={p} className="px-2 py-0.5 bg-slate-100 border text-slate-600 rounded-md text-[10px] font-bold uppercase">{p}</span>
                                                            )) : (<span className="text-xs font-medium text-slate-400 italic">Sin permisos</span>)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 xl:px-3"><StatusBadge active={user.status} /></td>
                                                <td className="px-4 py-3 xl:px-3 text-center text-slate-400">
                                                    <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditClick(user)} className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                                        <button onClick={() => handleToggleStatus(user.id, user.nombres, user.status)} className={`p-2 rounded-lg shadow-sm ${user.status ? 'hover:text-rose-600 hover:bg-rose-50' : 'hover:text-emerald-600 hover:bg-emerald-50'}`} title={user.status ? "Desactivar" : "Reactivar"}>
                                                            {user.status ? <Trash2 className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Panel Derecho: Formulario de Captura */}
                <div className="w-full xl:w-1/3">
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
                        <h2 className="text-lg font-bold text-slate-800">{editingUserId ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Nombre</label>
                                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><UserIcon className="w-4 h-4 text-slate-400" /></div><input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Ej: Ana" value={username} onChange={(e) => setUsername(e.target.value)} disabled={isLoading} /></div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Apellido</label>
                                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><UserIcon className="w-4 h-4 text-slate-400" /></div><input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Ej: Martinez" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isLoading} /></div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Correo Electrónico</label>
                                <div className="relative"><div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Mail className="w-4 h-4 text-slate-400" /></div><input type="email" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="ana@distribuidoramh.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading || !!editingUserId} /></div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Contraseña</label>
                                <div className="relative">
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-blue-500 transition-colors z-10">
                                        {showPassword ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                    </button>
                                    <input type={showPassword ? "text" : "password"} className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium outline-none transition-all ${password.length > 0 && password.length < 6 ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500'}`} placeholder={editingUserId ? "Dejar en blanco para no cambiar" : "••••••••"} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Rol</label>
                                    <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer" value={role} onChange={(e) => setRole(e.target.value as any)} disabled={isLoading}>
                                        <option value="Empleado">Empleado</option><option value="Administrador">Administrador</option><option value="Ventas">Ventas</option><option value="Cobranza">Cobranza</option><option value="Personalizado">Personalizado</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Estado</label>
                                    <div className="flex flex-col justify-center h-[42px] px-1">
                                        <label className="flex items-center cursor-pointer relative">
                                            <input type="checkbox" className="sr-only peer" checked={isActive} onChange={() => setIsActive(!isActive)} disabled={isLoading} />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                                            <span className={`ml-3 text-sm font-bold ${isActive ? 'text-blue-700' : 'text-slate-400'}`}>{isActive ? 'Activo' : 'Inactivo'}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Permisos de Acceso</label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {permissionOptions.map((perm) => {
                                        const isSelected = selectedPermissions.includes(perm);
                                        return (
                                            <button key={perm} type="button" onClick={() => togglePermission(perm)} disabled={role === 'Administrador' || isLoading}
                                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left ${isSelected ? 'bg-blue-50/50 border-blue-300 shadow-sm shadow-blue-500/10' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'} ${(role === 'Administrador') ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-blue-600 text-white scale-110' : 'bg-white border-2 border-slate-300'}`}>
                                                    {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                                                </div>
                                                <span className={`text-xs font-bold tracking-wide truncate ${isSelected ? 'text-blue-800' : 'text-slate-600'}`}>{perm}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-2">
                                <button type="submit" disabled={isLoading} className={`w-full py-3.5 text-white rounded-xl font-bold transition-all shadow-md flex justify-center items-center gap-2 active:scale-[0.98] ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                    {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Procesando...</span></> : (
                                        editingUserId ? <><Edit2 className="w-5 h-5" /><span>Guardar Cambios</span></> : <><Shield className="w-5 h-5" /><span>Registrar Usuario</span></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <br />
        </div>
    );
}
