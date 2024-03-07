const fs = require('fs').promises;

const PARTY_FILE = "PARTY.json";

const partyManager = {
  async setCreated(status) {
    const data = { created: status };
    try {
      await fs.writeFile(PARTY_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error setting party created status:', error);
    }
  },

  async getStatus() {
    try {
      const data = JSON.parse(await fs.readFile(PARTY_FILE));
      return data.created;
    } catch (error) {
      console.error('Error getting party created status:', error);
      return false;
    }
  }
};

module.exports = { partyManager };
