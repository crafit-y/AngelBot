const GenericAPIClient = require("../client/GenericAPIClient");

module.exports = class ValorantAPIClient extends GenericAPIClient {
  constructor(token) {
    super("https://api.henrikdev.xyz", {
      Authorization: token ? token : undefined,
      "User-Agent": "unofficial-valorant-api/node.js",
    });
  }

  async getAccount({ name, tag, force } = {}) {
    this._validateParams({ name, tag, force }, ["name", "tag"]);
    const endpoint = `/valorant/v1/account/${encodeURI(name)}/${encodeURI(
      tag
    )}`;
    return await this.getResource({ endpoint, params: { force } });
  }

  async getAccountByPUUID({ puuid, force } = {}) {
    this._validateParams({ puuid });
    const endpoint = `/valorant/v1/by-puuid/account/${puuid}`;
    return await this.getResource({ endpoint, params: { force } });
  }

  async getMMRByPUUID({ version, region, puuid, filter } = {}) {
    this._validateParams({ version, region, puuid });
    const query = this._buildQuery({ filter });
    const endpoint = `/valorant/${version}/by-puuid/mmr/${region}/${puuid}${
      query ? `?${query}` : ""
    }`;
    return await this.getResource({ endpoint });
  }

  async getMMRHistoryByPUUID({ region, puuid } = {}) {
    this._validateParams({ region, puuid });
    const endpoint = `/valorant/v1/by-puuid/mmr-history/${region}/${puuid}`;
    return await this.getResource({ endpoint });
  }

  async getMatch(match_id) {
    // Remplacer '/match/details' par le bon endpoint pour obtenir les détails d'un match
    const endpoint = `/valorant/v2/match/${match_id}`;
    return await this.getResource({ endpoint });
  }

  async getMatches({ region, name, tag, filter, map, size } = {}) {
    this._validateParams({ region, name, tag }, ["region", "name", "tag"]);
    const query = this._buildQuery({ filter, map, size });
    const endpoint = `/valorant/v3/matches/${region}/${encodeURI(
      name
    )}/${encodeURI(tag)}${query ? `?${query}` : ""}`;
    return await this.getResource({ endpoint });
  }

  async getMatchesByPUUID({ region, puuid, filter, map, size } = {}) {
    this._validateParams({ region, puuid });
    const endpoint = `/valorant/v3/by-puuid/matches/${region}/${puuid}`;
    return await this.getResource({ endpoint, params: { filter, map, size } });
  }

  async getContent({ locale } = {}) {
    const endpoint = `/valorant/v1/content`;
    return await this.getResource({ endpoint, params: { locale } });
  }

  // Ajoutez ici d'autres méthodes en suivant le même modèle pour couvrir toutes les fonctionnalités de l'API

  // Exemple d'implémentation pour une méthode générique supplémentaire
  async getLeaderboard({
    version,
    region,
    start,
    end,
    name,
    tag,
    puuid,
    season,
  } = {}) {
    if (name && tag && puuid) {
      throw new Error(
        "Too many parameters: You can't search for name/tag and puuid at the same time, please decide between name/tag and puuid"
      );
    }
    this._validateParams({ version, region });
    const endpoint = `/valorant/${version}/leaderboard/${region}`;
    const params = {
      start,
      end,
      name: encodeURI(name),
      tag: encodeURI(tag),
      puuid,
      season,
    };
    return await this.getResource({ endpoint, params });
  }
};
