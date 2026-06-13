import { CapacitorHttp } from '@capacitor/core';

/**
 * Native HTTP Service - Provides cross-platform HTTP requests
 * Uses Capacitor's native HTTP on mobile, falls back to fetch on web
 */

export class NativeHttpService {
  constructor() {
    this.isNative = window.Capacitor?.isNativePlatform?.() || false;
    console.log(`[HTTP] Initialized ${this.isNative ? 'native' : 'web'} HTTP service`);
  }

  /**
   * Make an HTTP request using native networking
   * @param {Object} config - Request configuration
   * @param {string} config.url - The URL to request
   * @param {string} config.method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param {Object} config.headers - Request headers
   * @param {Object|string} config.data - Request body data
   * @param {Object} config.params - URL parameters
   * @returns {Promise} Response promise
   */
  async request(config) {
    const { url, method = 'GET', headers = {}, data, params } = config;
    
    console.log(`[HTTP] Starting request - Method: ${method}, URL: ${url}`);
    console.log(`[HTTP] Config:`, config);
    console.log(`[HTTP] isNative:`, this.isNative);
    
    try {
      // Build URL with parameters
      let fullUrl = url;
      if (params) {
        const urlParams = new URLSearchParams(params);
        fullUrl += `?${urlParams.toString()}`;
      }
      console.log(`[HTTP] Full URL:`, fullUrl);

      if (this.isNative) {
        console.log(`[NATIVE HTTP] Using native Capacitor HTTP`);
        console.log(`[NATIVE HTTP] ${method} ${fullUrl}`);
        console.log(`[NATIVE HTTP] Request headers:`, headers);
        console.log(`[NATIVE HTTP] Request data:`, data);
        
        // Use Capacitor's native HTTP
        const options = {
          url: fullUrl,
          method: method.toUpperCase(),
          headers: headers,
        };

        // Add data for non-GET requests
        if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
          if (typeof data === 'string') {
            options.data = data;
          } else {
            options.data = data;
            // Ensure we have proper content-type for JSON
            if (!headers['Content-Type'] && !headers['content-type']) {
              options.headers = { ...headers, 'Content-Type': 'application/json' };
            }
          }
        }

        console.log(`[NATIVE HTTP] Final request options:`, options);
        console.log(`[NATIVE HTTP] About to call CapacitorHttp.request...`);
        
        const response = await CapacitorHttp.request(options);
        console.log(`[NATIVE HTTP] CapacitorHttp.request completed`);
        console.log(`[NATIVE HTTP] Raw response:`, response);
        console.log(`[NATIVE HTTP] Response status:`, response.status);
        console.log(`[NATIVE HTTP] Response data:`, response.data);
        
        // Transform to match fetch API response format
        const transformedResponse = {
          status: response.status,
          statusText: response.status >= 200 && response.status < 300 ? 'OK' : 'Error',
          headers: response.headers,
          data: response.data,
          ok: response.status >= 200 && response.status < 300,
          json: () => Promise.resolve(response.data),
          text: () => Promise.resolve(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))
        };
        console.log(`[NATIVE HTTP] Returning transformed response:`, transformedResponse);
        return transformedResponse;
      } else {
        console.log(`[WEB HTTP] Using standard fetch`);
        console.log(`[WEB HTTP] ${method} ${fullUrl}`);
        
        // Use standard fetch for web
        const options = {
          method: method.toUpperCase(),
          headers: headers,
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
          if (typeof data === 'string') {
            options.body = data;
          } else {
            options.body = JSON.stringify(data);
            if (!headers['Content-Type'] && !headers['content-type']) {
              options.headers = { ...headers, 'Content-Type': 'application/json' };
            }
          }
        }

        console.log(`[WEB HTTP] Fetch options:`, options);
        console.log(`[WEB HTTP] About to call fetch...`);
        
        const response = await fetch(fullUrl, options);
        console.log(`[WEB HTTP] Fetch completed, status:`, response.status);
        
        const responseData = await response.text();
        console.log(`[WEB HTTP] Response text received:`, responseData);
        
        let parsedData;
        try {
          parsedData = JSON.parse(responseData);
          console.log(`[WEB HTTP] Successfully parsed JSON:`, parsedData);
        } catch {
          console.log(`[WEB HTTP] Could not parse as JSON, using raw text`);
          parsedData = responseData;
        }

        const transformedResponse = {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: parsedData,
          ok: response.ok,
          json: () => Promise.resolve(parsedData),
          text: () => Promise.resolve(responseData)
        };
        console.log(`[WEB HTTP] Returning transformed response:`, transformedResponse);
        return transformedResponse;
      }
    } catch (error) {
      console.error(`[HTTP ERROR] Request failed - ${method} ${url}:`, error);
      console.error(`[HTTP ERROR] Error type:`, typeof error);
      console.error(`[HTTP ERROR] Error name:`, error.name);
      console.error(`[HTTP ERROR] Error message:`, error.message);
      console.error(`[HTTP ERROR] Error stack:`, error.stack);
      throw error;
    }
  }

  // Convenience methods
  async get(url, config = {}) {
    return this.request({ ...config, url, method: 'GET' });
  }

  async post(url, data, config = {}) {
    console.log(`[HTTP] POST request to: ${url}`);
    console.log(`[HTTP] Data:`, data);
    console.log(`[HTTP] Config:`, config);
    
    try {
      console.log(`[HTTP] About to call this.request...`);
      const response = await this.request({ ...config, url, method: 'POST', data });
      
      console.log(`[HTTP] POST response received:`, response);
      console.log(`[HTTP] Response status:`, response.status);
      console.log(`[HTTP] Response ok:`, response.ok);
      return response;
    } catch (error) {
      console.error(`[HTTP] POST error caught:`, error);
      console.error(`[HTTP] Error type:`, typeof error);
      console.error(`[HTTP] Error name:`, error.name);
      console.error(`[HTTP] Error message:`, error.message);
      console.error(`[HTTP] Error stack:`, error.stack);
      throw error;
    }
  }

  async put(url, data, config = {}) {
    return this.request({ ...config, url, method: 'PUT', data });
  }

  async delete(url, config = {}) {
    return this.request({ ...config, url, method: 'DELETE' });
  }

  async patch(url, data, config = {}) {
    return this.request({ ...config, url, method: 'PATCH', data });
  }
}

// Create singleton instance
export const nativeHttp = new NativeHttpService();

// Export as default for easy importing
export default nativeHttp;