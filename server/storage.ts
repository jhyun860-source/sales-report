// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)

import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  
  // 재시도 로직: 최대 3회 시도
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000; // 1초
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: buildAuthHeaders(apiKey),
        body: formData,
        signal: AbortSignal.timeout(30000), // 30초 타임아웃
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        
        // 503 Service Unavailable는 재시도 가능
        if (response.status === 503 && attempt < MAX_RETRIES) {
          console.warn(`[Storage] Upload attempt ${attempt}/${MAX_RETRIES} failed with 503, retrying...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          continue;
        }
        
        throw new Error(
          `Storage upload failed (${response.status} ${response.statusText}): ${message}`
        );
      }
      
      const url = (await response.json()).url;
      return { key, url };
    } catch (err: any) {
      // 네트워크 오류나 타임아웃도 재시도
      if (attempt < MAX_RETRIES && (err.name === 'TimeoutError' || err.message?.includes('fetch'))) {
        console.warn(`[Storage] Upload attempt ${attempt}/${MAX_RETRIES} failed with ${err.message}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        continue;
      }
      
      // 마지막 시도 실패 시 에러 던지기
      throw err;
    }
  }
  
  throw new Error('Storage upload failed after maximum retries');
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
