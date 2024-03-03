const fs = require('fs').promises;

const teamManager = {
  async createFile() {
    const teams = { team1: [], team2: [] };
    try {
      await fs.writeFile('TEAMS.json', JSON.stringify(teams, null, 2));
    } catch (error) {
      console.error('Error creating TEAMS.json:', error);
    }
  },

  async fileExists() {
    try {
      await fs.access('TEAMS.json');
      return true;
    } catch (error) {
      return false;
    }
  },

  async updateTeam(teamName, newTeam) {
    try {
      const teams = JSON.parse(await fs.readFile('TEAMS.json'));
      teams[teamName] = newTeam;
      await fs.writeFile('TEAMS.json', JSON.stringify(teams, null, 2));
    } catch (error) {
      console.error('Error updating team:', error);
    }
  },

  async getTeamMembers(teamName) {
    try {
      const teams = JSON.parse(await fs.readFile('TEAMS.json'));
      return teams[teamName] || [];
    } catch (error) {
      console.error('Error getting team members:', error);
      return [];
    }
  }
};

module.exports = { teamManager };
