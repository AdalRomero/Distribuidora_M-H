import { Database } from "@nozbe/watermelondb";

import { getAdapter } from "./databaseAdapter";

// --- TUS MODELOS ---
import Almacen from "./models/bases/almacen";
import Cliente from "./models/bases/cliente";
import Familia from "./models/bases/familia";
import Impuesto from "./models/bases/impuesto";
import Proveedor from "./models/bases/proveedor";

import CodigoAlterno from "./models/catalogo/codigoAlterno";
import Lote from "./models/catalogo/lote";
import PrecioEspecialCliente from "./models/catalogo/precioEspecialCliente";
import Producto from "./models/catalogo/producto";
import ProductoImpuesto from "./models/catalogo/productoImpuesto";
import ProveedorProducto from "./models/catalogo/proveedorProducto";

import Documento from "./models/registros/documento";
import DocumentoDetalle from "./models/registros/documentoDetalle";
import MovimientoInventario from "./models/registros/movimientoInventario";

import Empresa from "./models/users/empresa";
import InformacionPerfil from "./models/users/informacionPerfil";
import Perfil from "./models/users/perfil";
import Permiso from "./models/users/permiso";

// Obtenemos el adaptador correcto (LokiJS para Web, SQLite para Celular)
const adapter = getAdapter();

export const database = new Database({
  adapter,
  modelClasses: [
    Perfil,
    InformacionPerfil,
    Permiso,
    Empresa,

    Familia,
    Impuesto,
    Almacen,
    Proveedor,
    Cliente,

    Producto,
    CodigoAlterno,
    Lote,
    ProductoImpuesto,
    ProveedorProducto,
    PrecioEspecialCliente,

    MovimientoInventario,
    Documento,
    DocumentoDetalle,
  ],
});
