const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  identity: (address: string) => request(`/identity/${address}`),
  saveFinancial: (body: any) =>
    request("/financial/save", { method: "POST", body: JSON.stringify(body) }),
  validatorUpdate: (body: any) =>
    request("/validator/update-profile", { method: "POST", body: JSON.stringify(body) }),
  integrityCheck: (address: string) => request(`/integrity/${address}`),
  grantConsent: (body: any) => request("/consent/grant", { method: "POST", body: JSON.stringify(body) }),
  revokeConsent: (body: any) => request("/consent/revoke", { method: "POST", body: JSON.stringify(body) }),
  consentStatus: (user: string, requester: string) =>
    request(`/consent/status?user_address=${user}&requester_address=${requester}`),
  brokerCreditTier: (body: any) =>
    request("/broker/credit-tier", { method: "POST", body: JSON.stringify(body) }),
  brokerIncomeBand: (body: any) =>
    request("/broker/income-band", { method: "POST", body: JSON.stringify(body) }),
  fetchFinancial: (body: any) =>
    request("/financial/fetch", { method: "POST", body: JSON.stringify(body) }),
  ownershipSign: (body: any) =>
    request("/ownership/sign", { method: "POST", body: JSON.stringify(body) }),
  ownershipVerify: (body: any) =>
    request("/ownership/verify", { method: "POST", body: JSON.stringify(body) }),
  registerUsername: (body: any) =>
    request("/user-directory/register", { method: "POST", body: JSON.stringify(body) }),
};

export type Api = typeof api;
