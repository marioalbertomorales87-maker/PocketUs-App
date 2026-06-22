type ErrorMessageMap = Record<string, string>;

export function getErrorCode(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) {
    return String(error.message || "").trim().toUpperCase();
  }
  return String(error).trim().toUpperCase();
}

export function getErrorMessage(
  error: unknown,
  fallback: string,
  map: ErrorMessageMap = {}
): string {
  const code = getErrorCode(error);

  if (code && map[code]) {
    return map[code];
  }

  if (code === "NETWORK_REQUEST_FAILED") {
    return "No hay conexion a internet. Intenta nuevamente.";
  }

  if (code === "PERMISSION_DENIED") {
    return "No tienes permisos para realizar esta accion.";
  }

  if (code === "UNAVAILABLE") {
    return "El servicio no esta disponible temporalmente.";
  }

  return fallback;
}
