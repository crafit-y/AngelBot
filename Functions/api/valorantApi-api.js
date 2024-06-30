const axios = require("axios");

const VALORANT_API_BASE_URL = "https://valorant-api.com/v1";
const validTypes = ["agents", "ranks", "maps", "weapons", "weapons/skins"];

class ValorantAPI {
  constructor() {
    this.baseURL = VALORANT_API_BASE_URL;
  }

  async getResource({ endpoint }) {
    try {
      const response = await axios.get(endpoint, {
        baseURL: this.baseURL,
      });

      if (response.status !== 200) {
        throw new Error(
          `Error fetching data from Valorant API: ${response.statusText}`
        );
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        // Erreurs retournées par le serveur (statut différent de 2xx)
        throw new Error(
          `HTTP Error: ${error.response.status} - ${error.response.statusText}`
        );
      } else if (error.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        throw new Error(
          `No response received from Valorant API: ${error.message}`
        );
      } else {
        // Erreurs liées à la mise en place de la requête
        throw new Error(`Error in request setup: ${error.message}`);
      }
    }
  }

  async getValorantData(type) {
    if (!validTypes.includes(type)) {
      throw new Error(
        `Invalid data type. Valid types: ${validTypes.join(", ")}`
      );
    }

    const endpoint = `/${type}?language=fr-FR`;

    try {
      const data = await this.getResource({ endpoint });
      return data;
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error);
      throw error;
    }
  }

  async getDataByUUID(type, uuid) {
    if (!validTypes.includes(type)) {
      throw new Error(
        `Invalid data type. Valid types: ${validTypes.join(", ")}`
      );
    }

    const endpoint = `/${type}/${uuid}?language=fr-FR`;

    try {
      const data = await this.getResource({ endpoint });
      return data;
    } catch (error) {
      console.error(`Error fetching ${type} data by UUID:`, error);
      throw error;
    }
  }

  async getAgents() {
    return this.getValorantData("agents");
  }

  async getAgentByUUID(uuid) {
    return this.getDataByUUID("agents", uuid);
  }

  async getRanks() {
    return this.getValorantData("ranks");
  }

  async getMaps() {
    return this.getValorantData("maps");
  }

  async getWeapons() {
    return this.getValorantData("weapons");
  }

  async getSkins() {
    return this.getValorantData("weapons/skins");
  }

  async getSkinByUUID(uuid) {
    return this.getDataByUUID("weapons/skins", uuid);
  }
}

module.exports = { ValorantAPI };
