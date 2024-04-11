const axios = require("axios");

class GenericAPIClient {
  constructor(baseURL, defaultHeaders = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = defaultHeaders;
  }

  _parseBody(body) {
    if (body.errors) return body.errors;
    return body.status ? body.data : body;
  }

  _parseResponse(response) {
    return {
      status: response.status,
      data: this._parseBody(response.data),
      headers: response.headers,
      error: response.status >= 400 ? this._parseBody(response.data) : null,
    };
  }

  _validateParams(params, requiredParams = []) {
    requiredParams.forEach((key) => {
      if (params[key] == null) throw new Error(`Missing parameter: ${key}`);
    });
  }

  _buildQuery(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "undefined") query.append(key, value);
    });
    return query.toString() ? `?${query}` : "";
  }

  async _fetch({
    endpoint,
    method = "GET",
    params = {},
    data = null,
    responseType = "json",
    headers = {},
  }) {
    try {
      const response = await axios({
        url: `${this.baseURL}${endpoint}${this._buildQuery(params)}`,
        method,
        data,
        responseType,
        headers: { ...this.defaultHeaders, ...headers },
      });
      return this._parseResponse(response);
    } catch (error) {
      if (error.response) {
        return this._parseResponse(error.response);
      }
      throw error;
    }
  }

  // Define your generic API methods here, using _fetch
  // Example:
  async getResource({
    endpoint,
    params = {},
    method = "GET",
    data = null,
    headers = {},
    responseType = "json",
  }) {
    this._validateParams(params);
    return await this._fetch({
      endpoint,
      method,
      params,
      data,
      responseType,
      headers,
    });
  }
}

module.exports = GenericAPIClient;
