import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '../../src/context/AuthContext';

interface TableActionsMenuProps {
    onEdit?: () => void;
    onToggleStatus?: () => void;
    isActive?: boolean;
    onDelete?: () => void;
    deleteTitle?: string;
    statusTitleActive?: string;
    statusTitleInactive?: string;
    itemType?: string;
}

export default function TableActionsMenu({
    onEdit,
    onToggleStatus,
    isActive = true,
    onDelete,
    deleteTitle = "Borrar",
    statusTitleActive = "Activar",
    statusTitleInactive = "Desactivar",
}: TableActionsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { userRole } = useAuth();

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Acciones"
            >
                <MoreVertical className="w-5 h-5" />
            </button>
            
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1">
                        {onEdit && (
                            <button
                                onClick={() => { setIsOpen(false); onEdit(); }}
                                className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Edit2 className="w-4 h-4 mr-3 text-blue-500" />
                                Editar
                            </button>
                        )}
                        
                        {onToggleStatus && (
                            <button
                                onClick={() => { setIsOpen(false); onToggleStatus(); }}
                                className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                {isActive ? (
                                    <>
                                        <ToggleLeft className="w-4 h-4 mr-3 text-slate-400" />
                                        {statusTitleInactive}
                                    </>
                                ) : (
                                    <>
                                        <ToggleRight className="w-4 h-4 mr-3 text-emerald-500" />
                                        {statusTitleActive}
                                    </>
                                )}
                            </button>
                        )}

                        {onDelete && userRole === 'admin' && (
                            <>
                                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2" />
                                <button
                                    onClick={() => { setIsOpen(false); onDelete(); }}
                                    className="w-full flex items-center px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors font-medium"
                                >
                                    <Trash2 className="w-4 h-4 mr-3" />
                                    {deleteTitle}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
