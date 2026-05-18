/**
 * migrationGuard.ts
 * 
 * Utilidad crítica de seguridad para proteger la base de datos contra reseteos
 * automáticos y silenciosos de WatermelonDB en cambios de esquema.
 */

export function validateMigrations(schemaVersion: number, migrationsObj: any) {
  // En entornos donde localStorage no esté disponible, evitamos romper el flujo,
  // pero lo ideal es usar la persistencia local.
  if (typeof localStorage === 'undefined') {
    console.warn("[Guardia de Migración] localStorage no está disponible en este entorno.");
    return;
  }

  // Si la versión del esquema es 1, no hay migraciones previas que validar
  if (schemaVersion <= 1) return;

  const lastKnownStr = localStorage.getItem("wdb_last_known_schema_version");
  if (!lastKnownStr) {
    // Instalación limpia o primera ejecución con esta versión del guard, registramos la actual
    localStorage.setItem("wdb_last_known_schema_version", String(schemaVersion));
    return;
  }

  const lastKnown = parseInt(lastKnownStr, 10);
  if (isNaN(lastKnown)) {
    localStorage.setItem("wdb_last_known_schema_version", String(schemaVersion));
    return;
  }

  // Si el esquema local no ha cambiado o es menor (en desarrollo), actualizamos y continuamos
  if (schemaVersion <= lastKnown) {
    if (schemaVersion < lastKnown) {
      localStorage.setItem("wdb_last_known_schema_version", String(schemaVersion));
    }
    return;
  }

  // Si la versión del esquema aumentó, validamos la existencia de un paso para cada incremento
  const migrationSteps = migrationsObj?.migrations || [];
  const definedVersions = new Set(migrationSteps.map((m: any) => m.toVersion));

  for (let v = lastKnown + 1; v <= schemaVersion; v++) {
    if (!definedVersions.has(v)) {
      const errorMsg = `
🔴 ERROR CRÍTICO DE SEGURIDAD (BD) 🔴
Se detectó un cambio de esquema de la versión ${lastKnown} a la ${schemaVersion}.
FALTA EL PASO DE MIGRACIÓN PARA LA VERSIÓN ${v} en "src/services/DB/migrations.ts".

Para prevenir que WatermelonDB realice un reseteo local (TRUNCAMIENTO AUTOMÁTICO) 
que destruiría los datos locales y propagaría las eliminaciones a Supabase (vaciando la nube),
SE HA BLOQUEADO LA INICIALIZACIÓN DE LA BASE DE DATOS.

Acción requerida:
1. Abre "src/services/DB/migrations.ts".
2. Agrega la migración correspondiente para la versión ${v} usando addColumns o las herramientas de WatermelonDB.
`;
      console.error(errorMsg);
      
      // Intentamos lanzar un alert de bloqueo visual si estamos en hilo principal UI
      try {
        alert(errorMsg);
      } catch (e) {}

      throw new Error(errorMsg);
    }
  }

  // Si la validación es exitosa, guardamos la versión del esquema actual
  localStorage.setItem("wdb_last_known_schema_version", String(schemaVersion));
}
