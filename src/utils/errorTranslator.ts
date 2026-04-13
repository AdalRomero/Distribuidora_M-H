export const errorTranslator = (msgOriginal: string, tablaContexto?: string): string => {
  const msg = msgOriginal.toLowerCase();

  // 1. UNIQUE CONSTRAINT (Duplicados)
  if (msg.includes("unique constraint") || msg.includes("duplicate key")) {
    if (tablaContexto === 'productos') return "Ya existe un producto con el mismo código. Verifica y usa uno diferente.";
    if (tablaContexto === 'clientes' || tablaContexto === 'proveedores') return "Ese RFC o identificador ya está registrado para otra persona/empresa.";
    if (tablaContexto === 'perfiles' || tablaContexto === 'informacion_perfil') return "El correo electrónico o nombre de usuario ya está ocupado.";
    if (tablaContexto === 'familias' || tablaContexto === 'almacenes') return "Ya existe un registro con este código o nombre exacto.";
    if (tablaContexto === 'documentos') return "Ya existe una factura registrada con el mismo folio.";
    return "Esa información ya fue registrada previamente y no se puede duplicar.";
  }

  // 2. FOREIGN KEY (Dependencias faltantes o mala vinculación)
  if (msg.includes("foreign key") || msg.includes("auth.users")) {
    if (tablaContexto === 'productos') return "El margen o la familia asignada a este producto ya no existe o hay un problema de vinculación.";
    if (tablaContexto === 'documentos_detalles' || tablaContexto === 'documentos') return "El cliente o algún producto de esta factura fue eliminado o no se encuentra en el sistema.";
    if (tablaContexto === 'movimientos_inventario') return "No se encontró el almacén o el producto para registrar el movimiento de inventario.";
    return "Hubo un problema de vinculación. Parece que un dato relacionado ya no existe en el servidor.";
  }

  // 3. NULL VIOLATION (Datos incompletos)
  if (msg.includes("null value in column") || msg.includes("violates not-null")) {
    return "Faltó información obligatoria antes de guardarse en la nube. Revisa que todos los campos requeridos tengan datos.";
  }

  // 4. CHECK CONSTRAINT (Valores fuera de rango)
  if (msg.includes("check constraint") || msg.includes("violates check")) {
    if (tablaContexto === 'productos' || tablaContexto === 'precios_especiales_clientes') return "El precio o descuento no cumple con los mínimos/máximos permitidos.";
    if (tablaContexto === 'lotes') return "La cantidad o fecha introducida no es válida.";
    return "Algún valor introducido (números o fechas) sobrepasa los límites permitidos.";
  }

  // 5. ROW LEVEL SECURITY (Permisos)
  if (msg.includes("row-level security") || msg.includes("rls") || msg.includes("permission denied")) {
    return "No tienes permiso suficiente en la nube para registrar o modificar esta información.";
  }

  // General Error / Error no mapeado
  return "La nube rechazó la información. Dale en recuperar para verificar los datos guardados o contacta soporte si el problema persiste.";
};
