import React, { useState, useEffect, useRef } from "react";
import { X, Download, FileText, FileSpreadsheet, Loader2, Filter, Columns, FileType, Check, AlertTriangle, Clock, LayoutTemplate } from "lucide-react";
import * as XLSX from "xlsx";
import { database } from "../../../src/services/DB/indexBD";
import { Q } from "@nozbe/watermelondb";

interface ExportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = "excel" | "pdf";
type PageOrientation = "portrait" | "landscape";
type PageSize = "letter" | "a4";

type Preset = "general" | "stock_bajo" | "caducidades" | "activos" | "inactivos";

interface ExportConfig {
  format: ExportFormat;
  pdfOrientation: PageOrientation;
  pdfSize: PageSize;
  estado: "activos" | "inactivos" | "ambos";
  alertaStock: "todos" | "bajo" | "vencidos";
  separarHojas: boolean; // para Excel
  columnas: {
    codigo: boolean;
    nombre: boolean;
    familia: boolean;
    stock: boolean;
    costo: boolean;
    precio: boolean;
    margen: boolean;
    estado: boolean;
  };
}

export default function ExportInventoryModal({ isOpen, onClose }: ExportInventoryModalProps) {
  const [config, setConfig] = useState<ExportConfig>({
    format: "excel",
    pdfOrientation: "landscape",
    pdfSize: "letter",
    estado: "activos",
    alertaStock: "todos",
    separarHojas: false,
    columnas: {
      codigo: true,
      nombre: true,
      familia: true,
      stock: true,
      costo: true,
      precio: true,
      margen: false,
      estado: true,
    }
  });

  const [preset, setPreset] = useState<Preset>("general");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load saved config if any
    const saved = localStorage.getItem("inventoryExportConfig");
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveConfig = (newConfig: ExportConfig) => {
    setConfig(newConfig);
    localStorage.setItem("inventoryExportConfig", JSON.stringify(newConfig));
  };

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const newConfig = { ...config };
    switch (p) {
      case "general":
        newConfig.estado = "ambos";
        newConfig.alertaStock = "todos";
        newConfig.separarHojas = true;
        break;
      case "stock_bajo":
        newConfig.estado = "activos";
        newConfig.alertaStock = "bajo";
        newConfig.separarHojas = false;
        break;
      case "caducidades":
        newConfig.estado = "activos";
        newConfig.alertaStock = "vencidos";
        newConfig.separarHojas = false;
        break;
      case "activos":
        newConfig.estado = "activos";
        newConfig.alertaStock = "todos";
        newConfig.separarHojas = false;
        break;
      case "inactivos":
        newConfig.estado = "inactivos";
        newConfig.alertaStock = "todos";
        newConfig.separarHojas = false;
        break;
    }
    saveConfig(newConfig);
  };

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(10);
    try {
      // 1. Fetch data
      let queryArgs: any[] = [];
      if (config.estado === "activos") queryArgs.push(Q.where("estado", true));
      if (config.estado === "inactivos") queryArgs.push(Q.where("estado", false));
      
      const productos = await database.collections.get("productos").query(...queryArgs).fetch();
      setExportProgress(30);

      // fetch related data
      const familias = await database.collections.get("familias").query().fetch();
      const familiaMap = new Map(familias.map((f: any) => [f.id, f.nombre]));

      // Fetch lotes to calculate stock synchronously
      const allLotes = await database.collections.get("lotes").query(Q.where("estado", true)).fetch();
      
      setExportProgress(50);

      // Map to export format
      const data = productos.map((p: any) => {
        const lotesDelProducto = allLotes
          .filter((l: any) => l._raw.producto_id === p.id)
          .map((l: any) => ({
            lote: l.identificadorLote || "S/N",
            cantidad: l.cantidad,
            caducidad: l.fechaCaducidad ? new Date(l.fechaCaducidad).toLocaleDateString() : 'N/A'
          }));

        const stock = lotesDelProducto.reduce((sum: number, l: any) => sum + l.cantidad, 0);

        return {
          id: p.id,
          codigo: p.codigoInterno,
          claveSat: p.claveSat || "N/A",
          nombre: p.descripcion,
          familia: familiaMap.get(p._raw.familia_id) || "Sin Familia",
          stock: stock,
          costo: p.costoBase || 0,
          precio: p.precioLista,
          precioMayoreo: p.precioMayoreo || 0,
          margen: p.costoBase ? (((p.precioLista - p.costoBase) / p.costoBase) * 100).toFixed(2) + "%" : "0%",
          estado: p.estado,
          estadoLabel: p.estado ? "ACTIVO" : "INACTIVO",
          lotes: lotesDelProducto
        };
      });

      setExportProgress(70);

      if (config.format === "excel") {
        await exportExcel(data);
      } else {
        await exportPDF(data);
      }
      setExportProgress(100);
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        onClose();
      }, 500);
    } catch (e) {
      console.error("Export error", e);
      setIsExporting(false);
      setExportProgress(0);
      alert("Error al exportar");
    }
  };

  const exportExcel = async (data: any[]) => {
    const wb = XLSX.utils.book_new();

    const generateSheet = (items: any[]) => {
      const rows = items.map(p => {
        const row: any = {};
        if (config.columnas.codigo) {
          row["Código Interno"] = p.codigo;
          row["Clave SAT"] = p.claveSat;
        }
        if (config.columnas.nombre) row["Descripción"] = p.nombre;
        if (config.columnas.familia) row["Familia"] = p.familia;
        if (config.columnas.stock) {
          row["Stock Actual"] = p.stock;
          row["Cant. Lotes"] = p.lotes ? p.lotes.length : 0;
        }
        if (config.columnas.costo) row["Costo Base"] = p.costo;
        if (config.columnas.precio) {
          row["Precio Lista"] = p.precio;
          row["Precio Mayoreo"] = p.precioMayoreo;
        }
        if (config.columnas.margen) row["Margen %"] = p.margen;
        if (config.columnas.estado) row["Estado"] = p.estadoLabel;
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      // set column widths
      ws["!cols"] = [
        { wch: 15 }, // codigo
        { wch: 12 }, // clave SAT
        { wch: 45 }, // nombre
        { wch: 20 }, // familia
        { wch: 15 }, // stock
        { wch: 12 }, // cant lotes (new)
        { wch: 15 }, // costo
        { wch: 15 }, // precio lista
        { wch: 15 }, // precio mayoreo
        { wch: 12 }, // margen
        { wch: 12 }, // estado
      ];
      return ws;
    };

    if (config.separarHojas && config.estado === "ambos") {
      const activos = data.filter(d => d.estado);
      const inactivos = data.filter(d => !d.estado);
      XLSX.utils.book_append_sheet(wb, generateSheet(activos), "Activos");
      XLSX.utils.book_append_sheet(wb, generateSheet(inactivos), "Inactivos");
    } else {
      XLSX.utils.book_append_sheet(wb, generateSheet(data), "Inventario General");
    }

    // Hoja adicional exclusiva para desglose de Lotes
    if (config.columnas.stock) {
      const lotRows: any[] = [];
      data.forEach(p => {
        if (p.lotes && p.lotes.length > 0) {
          p.lotes.forEach((l: any) => {
            lotRows.push({
              "Código Prod.": p.codigo,
              "Descripción Producto": p.nombre,
              "Número de Lote": l.lote,
              "Fecha Caducidad": l.caducidad,
              "Cantidad en Lote": l.cantidad,
              "Estado Producto": p.estadoLabel
            });
          });
        }
      });

      if (lotRows.length > 0) {
        const wsLotes = XLSX.utils.json_to_sheet(lotRows);
        wsLotes["!cols"] = [
          { wch: 15 }, // codigo
          { wch: 45 }, // nombre
          { wch: 25 }, // num lote
          { wch: 15 }, // caducidad
          { wch: 15 }, // cantidad
          { wch: 15 }, // estado
        ];
        XLSX.utils.book_append_sheet(wb, wsLotes, "Desglose de Lotes");
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
    XLSX.writeFile(wb, `Inventario_${timestamp}.xlsx`);
  };

  const exportPDF = async (data: any[]) => {
    // @ts-ignore
    const html2pdf = require("html2pdf.js");

    const html = `
      <div style="padding: 20px; font-family: Helvetica, Arial, sans-serif; width: 100%;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 5px;">Reporte de Inventario Físico (Por Lotes)</h2>
        <p style="color: #64748b; font-size: 11px; margin-bottom: 20px;">Generado el: ${new Date().toLocaleString()}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #f8fafc; text-align: left;">
              ${config.columnas.codigo ? '<th style="padding: 8px; border: 1px solid #cbd5e1; color: #334155;">Código</th>' : ''}
              ${config.columnas.nombre ? '<th style="padding: 8px; border: 1px solid #cbd5e1; color: #334155;">Descripción y Lotes (Sistema)</th>' : ''}
              ${config.columnas.familia ? '<th style="padding: 8px; border: 1px solid #cbd5e1; color: #334155;">Familia</th>' : ''}
              ${config.columnas.stock ? '<th style="padding: 8px; border: 1px solid #cbd5e1; color: #334155; text-align: center;">Stock</th>' : ''}
              ${config.columnas.precio ? '<th style="padding: 8px; border: 1px solid #cbd5e1; color: #334155; text-align: right;">Precio</th>' : ''}
              ${config.columnas.estado ? '<th style="padding: 8px; border: 1px solid #cbd5e1; color: #334155; text-align: center;">Estado</th>' : ''}
              <th style="padding: 8px; border: 1px solid #cbd5e1; color: #334155; text-align: center; width: 120px;">Conteo Físico</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(p => `
              <tr>
                ${config.columnas.codigo ? `<td style="padding: 8px; border: 1px solid #e2e8f0; vertical-align: top;">${p.codigo}</td>` : ''}
                ${config.columnas.nombre ? `
                  <td style="padding: 8px; border: 1px solid #e2e8f0; vertical-align: top;">
                    <div style="font-weight: bold; margin-bottom: 4px;">${p.nombre}</div>
                    ${p.lotes && p.lotes.length > 0 ? `
                      <div style="font-size: 9px; color: #475569;">
                        <ul style="margin: 0 0 0 12px; padding: 0;">
                          ${p.lotes.map((l:any) => `<li>Lote <strong>${l.lote}</strong> | Cad: ${l.caducidad} | Sist: <strong>${l.cantidad}</strong></li>`).join('')}
                        </ul>
                      </div>
                    ` : '<div style="font-size: 9px; color: #ef4444;">Sin lotes activos</div>'}
                  </td>
                ` : ''}
                ${config.columnas.familia ? `<td style="padding: 8px; border: 1px solid #e2e8f0; vertical-align: top;">${p.familia}</td>` : ''}
                ${config.columnas.stock ? `<td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; text-align: center; vertical-align: top; color: ${p.stock <= 0 ? '#ef4444' : '#0f172a'};">${p.stock}</td>` : ''}
                ${config.columnas.precio ? `<td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; vertical-align: top;">$${p.precio.toFixed(2)}</td>` : ''}
                ${config.columnas.estado ? `<td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; vertical-align: top;">
                  <span style="color: ${p.estado ? '#16a34a' : '#dc2626'}; font-weight: bold;">${p.estadoLabel}</span>
                </td>` : ''}
                <td style="padding: 8px; border: 1px solid #e2e8f0; vertical-align: top;">
                   ${p.lotes && p.lotes.length > 0 
                     ? p.lotes.map((l:any) => `
                        <div style="height: 14px; margin-bottom: 4px; border-bottom: 1px solid #cbd5e1; font-size: 8px; color: #94a3b8; display: flex; align-items: flex-end;">
                          <span>${l.lote}:</span>
                        </div>
                       `).join('') 
                     : `<div style="height: 14px; border-bottom: 1px solid #cbd5e1; font-size: 8px; color: #94a3b8; display: flex; align-items: flex-end;"><span>Cant:</span></div>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `Conteo_Lotes_Inventario_${new Date().getTime()}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: config.pdfSize, orientation: config.pdfOrientation }
    };

    // Al pasar el string directamente evitamos problemas de renderizado en divs ocultos
    await html2pdf().set(opt).from(html).save();
  };

  const toggleCol = (col: keyof ExportConfig["columnas"]) => {
    saveConfig({
      ...config,
      columnas: {
        ...config.columnas,
        [col]: !config.columnas[col]
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Exportación Empresarial</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configura y descarga reportes de inventario</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          {/* Left Column: Presets & Format */}
          <div className="w-full lg:w-1/3 space-y-6">
            
            {/* Presets */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4" /> Presets Rápidos
              </h3>
              <div className="flex flex-wrap gap-2">
                {(["general", "activos", "inactivos", "stock_bajo", "caducidades"] as Preset[]).map(p => (
                  <button
                    key={p}
                    onClick={() => applyPreset(p)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      preset === p 
                        ? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {p === "general" && "General"}
                    {p === "activos" && "Sólo Activos"}
                    {p === "inactivos" && "Inactivos"}
                    {p === "stock_bajo" && "Stock Bajo"}
                    {p === "caducidades" && "Caducidades"}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <FileType className="w-4 h-4" /> Formato de Exportación
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => saveConfig({ ...config, format: "excel" })}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    config.format === "excel" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  }`}
                >
                  <FileSpreadsheet className={`w-8 h-8 ${config.format === "excel" ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className={`text-sm font-bold ${config.format === "excel" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => saveConfig({ ...config, format: "pdf" })}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    config.format === "pdf" ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  }`}
                >
                  <FileText className={`w-8 h-8 ${config.format === "pdf" ? "text-rose-600" : "text-slate-400"}`} />
                  <span className={`text-sm font-bold ${config.format === "pdf" ? "text-rose-700 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"}`}>Documento PDF</span>
                </button>
              </div>
            </div>

            {/* PDF Options (only if PDF is selected) */}
            {config.format === "pdf" && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Orientación PDF</label>
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                  <button onClick={() => saveConfig({...config, pdfOrientation: "portrait"})} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${config.pdfOrientation === "portrait" ? "bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white" : "text-slate-500"}`}>Vertical</button>
                  <button onClick={() => saveConfig({...config, pdfOrientation: "landscape"})} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${config.pdfOrientation === "landscape" ? "bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white" : "text-slate-500"}`}>Horizontal</button>
                </div>
              </div>
            )}
            
          </div>

          {/* Right Column: Columns & Filters */}
          <div className="w-full lg:w-2/3 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columns Selector */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Columns className="w-4 h-4" /> Columnas a Incluir
                </h3>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                    {Object.keys(config.columnas).map((col) => (
                      <label key={col} className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          config.columnas[col as keyof ExportConfig["columnas"]] ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600"
                        }`}>
                          {config.columnas[col as keyof ExportConfig["columnas"]] && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 capitalize group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{col}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Filtros Avanzados
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Estado del Producto</label>
                    <select 
                      value={config.estado} 
                      onChange={(e) => saveConfig({...config, estado: e.target.value as any})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="activos">Sólo Activos (Recomendado)</option>
                      <option value="inactivos">Sólo Inactivos</option>
                      <option value="ambos">Ambos (Histórico)</option>
                    </select>
                  </div>
                  
                  {config.estado === "ambos" && config.format === "excel" && (
                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="checkbox" 
                        id="separar" 
                        checked={config.separarHojas}
                        onChange={(e) => saveConfig({...config, separarHojas: e.target.checked})}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="separar" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Separar activos/inactivos en hojas distintas
                      </label>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 mt-4">Alerta de Stock / Caducidad</label>
                    <select 
                      value={config.alertaStock} 
                      onChange={(e) => saveConfig({...config, alertaStock: e.target.value as any})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="todos">Todos los productos</option>
                      <option value="bajo">Stock Bajo o Cero</option>
                      <option value="vencidos">Próximos a Vencer / Vencidos</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isExporting && (
              <span className="flex items-center gap-2 text-blue-600 font-bold">
                <Loader2 className="w-4 h-4 animate-spin" /> Procesando: {exportProgress}%
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-6 py-2 rounded-xl text-slate-500 dark:text-slate-400 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-8 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:active:scale-100"
            >
              {isExporting ? (
                <>Generando...</>
              ) : (
                <><Download className="w-4 h-4" /> Generar Exportación</>
              )}
            </button>
          </div>
        </div>
      </div>
      <div ref={pdfContainerRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}></div>
    </div>
  );
}
