"use client";

/**
 * Typed client-side fetch service.
 *
 * All client components MUST use these helpers instead of raw `fetch()`
 * so every call/response follows the same `{ ok, data?, error? }` shape.
 */

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  total?: number;
  error?: any;
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, options);
    const json = (await res.json()) as ApiResponse<T>;
    return json;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export const api = {
  get<T>(url: string): Promise<ApiResponse<T>> {
    return request<T>(url);
  },

  post<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  put<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  delete<T>(url: string): Promise<ApiResponse<T>> {
    return request<T>(url, { method: "DELETE" });
  },

  /**
   * Multipart upload. The server answers with the Totalum file-name ids that
   * are then linked to a record's file field.
   */
  upload<T>(url: string, files: File[] | FileList): Promise<ApiResponse<T>> {
    const form = new FormData();
    for (const file of Array.from(files)) form.append("file", file, file.name);
    return request<T>(url, { method: "POST", body: form });
  },
};
