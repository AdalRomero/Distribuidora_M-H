import { Model } from "@nozbe/watermelondb";
import { date, field, readonly, text } from "@nozbe/watermelondb/decorators";

export default class SesionDispositivo extends Model {
  static table = "sesiones_dispositivo";

  @text("perfil_id") perfilId!: string;
  @text("device_id") deviceId!: string;
  @text("device_name") deviceName?: string;
  @field("last_online_at") lastOnlineAt!: number;
  @field("offline_ttl_hours") offlineTtlHours!: number;
  @field("is_active") isActive!: boolean;
  @field("revoked_at") revokedAt?: number;
  @readonly @date("created_at") createdAt!: number;
  @readonly @date("updated_at") updatedAt!: number;
}
