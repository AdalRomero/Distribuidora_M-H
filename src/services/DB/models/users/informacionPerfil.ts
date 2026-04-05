import { Model } from "@nozbe/watermelondb";
import { date, readonly, text } from "@nozbe/watermelondb/decorators";

export default class InformacionPerfil extends Model {
  static table = "informacion_perfil";

  @text("nombres") nombres?: string;
  @text("ape_paterno") apePaterno?: string;
  @text("ape_materno") apeMaterno?: string;
  @text("correo") correo!: string;
  @text("rol") rol!: string;
  @readonly @date("updated_at") updatedAt!: number;
}
