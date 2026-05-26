import { useRouter } from "expo-router";
import { ArrowLeft, Database, Edit3, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { database } from "../../../src/services/DB/indexBD";
import { mySchema } from "../../../src/services/DB/schema";
import WarningModal from "../../../components/ui/modals/WarningModal";
import ErrorModal from "../../../components/ui/modals/ErrorModal";

export default function DevDatabase() {
  const router = useRouter();
  const [activeTable, setActiveTable] = useState<string>("perfiles");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // States for custom modals
  const [warningConfig, setWarningConfig] = useState<{
    isOpen: boolean;
    onConfirm: () => void;
    title: string;
    message: string;
  }>({
    isOpen: false,
    onConfirm: () => {},
    title: "",
    message: "",
  });

  const [errorConfig, setErrorConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  // Lista de todas las tablas en tu base de datos
  const tables = Object.keys(mySchema.tables);

  // Cargar registros cuando se cambia de tabla
  useEffect(() => {
    fetchRecords();
  }, [activeTable]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const collection = database.collections.get(activeTable);
      // Obtenemos todos los registros de la tabla seleccionada
      const allRecords = await collection.query().fetch();
      if (!collection) {
        console.warn(
          `La tabla ${activeTable} no existe en la base de datos local.`,
        );
        return;
      }
      // Mapeamos para obtener la data cruda (_raw) para poder visualizarla
      setRecords(allRecords.map((record) => record._raw));
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para borrar un registro específico
  const handleDelete = (id: string) => {
    setWarningConfig({
      isOpen: true,
      title: "¿Borrar Registro?",
      message: "¿Estás seguro de borrar este registro permanentemente?",
      onConfirm: () => doDelete(id)
    });
  };

  const doDelete = async (id: string) => {
    setWarningConfig(prev => ({ ...prev, isOpen: false }));
    try {
      const collection = database.collections.get(activeTable);
      const record = await collection.find(id);

      await database.write(async () => {
        await record.destroyPermanently();
      });

      fetchRecords();
    } catch (error: any) {
      setErrorConfig({
        isOpen: true,
        title: "Error al Borrar",
        message: "Error al borrar: " + error.message
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8 text-white">
      {/* Botón de Regreso */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group w-fit"
      >
        <ArrowLeft
          size={20}
          className="group-hover:-translate-x-1 transition-transform"
        />
        <span className="font-medium">Volver al Panel</span>
      </button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Database className="text-emerald-500" size={32} />
          <h1 className="text-3xl font-bold">Explorador Local</h1>
        </div>
        <button
          onClick={fetchRecords}
          className="p-2 bg-gray-800 rounded hover:bg-gray-700"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Selector de Tablas */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tables.map((table) => (
          <button
            key={table}
            onClick={() => setActiveTable(table)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTable === table
                ? "bg-emerald-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {table}
          </button>
        ))}
      </div>

      {/* Visor de Registros (Tabla Dinámica) */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-950 text-gray-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Acciones</th>
                <th className="px-4 py-3">ID</th>
                {/* Generamos columnas dinámicas basadas en el primer registro */}
                {records.length > 0 &&
                  Object.keys(records[0])
                    .filter((key) => key !== "id") // Ocultamos el ID porque ya lo pusimos primero
                    .map((key) => (
                      <th key={key} className="px-4 py-3">
                        {key}
                      </th>
                    ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No hay registros en {activeTable}
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr
                    key={record.id}
                    className="border-t border-gray-800 hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        className="text-blue-400 hover:text-blue-300"
                        title="Editar (En desarrollo)"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Borrar registro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-400">
                      {record.id}
                    </td>
                    {/* Renderizamos las celdas dinámicas */}
                    {Object.entries(record)
                      .filter(([key]) => key !== "id")
                      .map(([key, value]) => (
                        <td
                          key={key}
                          className="px-4 py-3 truncate max-w-[150px]"
                          title={String(value)}
                        >
                          {String(value)}
                        </td>
                      ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <WarningModal
        isOpen={warningConfig.isOpen}
        onClose={() => setWarningConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={warningConfig.onConfirm}
        title={warningConfig.title}
        message={warningConfig.message}
      />
      <ErrorModal
        isOpen={errorConfig.isOpen}
        onClose={() => setErrorConfig(prev => ({ ...prev, isOpen: false }))}
        title={errorConfig.title}
        message={errorConfig.message}
      />
    </div>
  );
}
