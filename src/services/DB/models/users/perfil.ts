import { Model } from "@nozbe/watermelondb";
import {
  date,
  field,
  lazy,
  readonly,
  text,
} from "@nozbe/watermelondb/decorators";

// Importamos los modelos hermanos
import InformacionPerfil from "./informacionPerfil";
import Permiso from "./permiso";

export default class Perfil extends Model {
  static table = "perfiles";

  @text("usuario") usuario!: string;
  @field("estado") estado!: boolean;
  @text("hash_local") hashLocal?: string;
  @readonly @date("updated_at") updatedAt!: number;

  // ==========================================
  // VÍNCULOS 1:1 MEDIANTE EL MISMO UUID
  // ==========================================

  // Observa la tabla 'informacion_perfil' buscando el mismo ID de este perfil
  @lazy informacion = this.collections
    .get<InformacionPerfil>("informacion_perfil")
    .findAndObserve(this.id);

  // Observa la tabla 'permisos' buscando el mismo ID
  @lazy permisos = this.collections
    .get<Permiso>("permisos")
    .findAndObserve(this.id);
}
