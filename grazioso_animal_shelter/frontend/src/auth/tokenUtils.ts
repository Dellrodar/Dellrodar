// Reads the exp claim from a JWT without verifying the signature; the backend
// remains the authority and any tampered token still fails there with a 401.
export const getTokenExpiryMs = (token: string): number | null => {
  try {
    const segments = token.split(".");
    if (segments.length !== 3) {
      return null;
    }

    const base64Payload = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64Payload.padEnd(
      base64Payload.length + ((4 - (base64Payload.length % 4)) % 4),
      "=",
    );
    const payload: unknown = JSON.parse(atob(padded));

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("exp" in payload) ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp)
    ) {
      return null;
    }

    return payload.exp * 1000;
  } catch {
    return null;
  }
};
