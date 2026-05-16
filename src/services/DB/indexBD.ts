import { Database } from "@nozbe/watermelondb";

import { getAdapter } from "./databaseAdapter";

import Almacen from "./models/bases/almacen";
import Cliente from "./models/bases/cliente";
import CategoriaCliente from "./models/bases/categoriaCliente";
import Familia from "./models/bases/familia";
import Impuesto from "./models/bases/impuesto";
import Margen from "./models/bases/margen";
import Proveedor from "./models/bases/proveedor";
import ProveedorContacto from "./models/bases/proveedorContacto";
import Contacto from "./models/bases/contacto";

import CodigoAlterno from "./models/catalogo/codigoAlterno";
import Lote from "./models/catalogo/lote";
import PrecioEspecialCliente from "./models/catalogo/precioEspecialCliente";
import PrecioEspecialFamiliaCliente from "./models/catalogo/precioEspecialFamiliaCliente";
import Producto from "./models/catalogo/producto";
import ProductoImpuesto from "./models/catalogo/productoImpuesto";
import ProveedorProducto from "./models/catalogo/proveedorProducto";
import PlantillaPrecio from "./models/catalogo/plantillaPrecio";
import ReglaPlantilla from "./models/catalogo/reglaPlantilla";
import ClientePlantilla from "./models/catalogo/clientePlantilla";

import BitacoraError from "./models/registros/bitacoraError";
import Documento from "./models/registros/documento";
import DocumentoDetalle from "./models/registros/documentoDetalle";
import MovimientoInventario from "./models/registros/movimientoInventario";
import InformacionPerfil from "./models/users/informacionPerfil";
import Perfil from "./models/users/perfil";
import Permiso from "./models/users/permiso";
import InvoiceTemplate from "./models/configuracion/invoiceTemplate";

const adapter = getAdapter();

export const database = new Database({
  adapter,
  modelClasses: [
    Perfil,
    InformacionPerfil,
    Permiso,

    Familia,
    Impuesto,
    Almacen,
    Proveedor,
    Margen,
    Cliente,
    CategoriaCliente,
    Contacto,
    ProveedorContacto,

    Producto,
    CodigoAlterno,
    Lote,
    ProductoImpuesto,
    ProveedorProducto,
    PrecioEspecialCliente,
    PrecioEspecialFamiliaCliente,
    PlantillaPrecio,
    ReglaPlantilla,
    ClientePlantilla,

    MovimientoInventario,
    Documento,
    DocumentoDetalle,
    BitacoraError,
    InvoiceTemplate,
  ],
});
