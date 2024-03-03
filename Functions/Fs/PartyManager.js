const fs = require('fs').promises;

const partyManager = {
  async setCreated(status) {
    const data = { created: status };
    try {
      await fs.writeFile('PARTY.json', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error setting party created status:', error);
    }
  },

  async getStatus() {
    try {
      const data = JSON.parse(await fs.readFile('PARTY.json'));
      return data.created;
    } catch (error) {
      console.error('Error getting party created status:', error);
      return false;
    }
  }
};

module.exports = { partyManager };
