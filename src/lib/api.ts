/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const getApiBaseUrl = (): string => {
  try {
    const metaUrl = (import.meta as any).env?.VITE_API_URL;
    if (metaUrl && typeof metaUrl === 'string' && metaUrl.trim() !== '') {
      return metaUrl.trim().replace(/\/+$/, '');
    }
  } catch (e) {}
  try {
    const procUrl = process.env.VITE_API_URL;
    if (procUrl && typeof procUrl === 'string' && procUrl.trim() !== '') {
      return procUrl.trim().replace(/\/+$/, '');
    }
  } catch (e) {}
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
