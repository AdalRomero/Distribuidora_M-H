export function getDeviceId(): string {
  if (typeof localStorage === "undefined") {
    return "unknown-device-env";
  }
  let deviceId = localStorage.getItem("dist_mh_device_id");
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem("dist_mh_device_id", deviceId);
  }
  return deviceId;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
