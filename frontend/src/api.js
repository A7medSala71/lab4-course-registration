export async function api(path, method = "GET", body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error) throw new Error(data.error);
    if (res.status === 502 || res.status === 504)
      throw new Error("The backend is not responding. Check that it is running.");
    throw new Error("Request failed (" + res.status + ")");
  }
  return data;
}
