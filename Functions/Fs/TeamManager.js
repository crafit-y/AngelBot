const { readFile, writeFile, access } = require('fs').promises;

const TEAMS_FILE = "TEAMS.json";
const TEAM_NAMES = ["team1", "team2"];

const teamManager = {

  async getData() {
    try {
      const data = await readFile(TEAMS_FILE);
      return JSON.parse(data);
    } catch (error) {
      return { team1: [], team2: [] };
    }
  },

  async writeData(data) {
    await writeFile(TEAMS_FILE, JSON.stringify(data));
  },

  async createFile() {
    const data = { team1: [], team2: [] };
    try {
      await this.writeData(data);
    } catch (error) {
      console.error('Error creating TEAMS.json:', error);
    }
  },

  async fileExists() {
    try {
      await access(TEAMS_FILE);
      return true;
    } catch (error) {
      return false;
    }
  },

  async updateTeam(teamName, newTeam) {
    try {
      const data = await this.getData();
      data[teamName] = newTeam;
      await this.writeData(data);
    } catch (error) {
      console.error('Error updating team:', error);
    }
  },

  async getTeamMembers(teamName) {
    try {
      const data = await this.getData();
      return data[teamName] || [];
    } catch (error) {
      console.error('Error getting team members:', error);
      return [];
    }
  },

  async findAndUpdate(memberIdToFind, newMemberId, team) {
    try {
      const data = await this.getData();
      const teamIndex = TEAM_NAMES.indexOf("team" + team);
      if (teamIndex !== -1) {
        const indexInTeam = data[TEAM_NAMES[teamIndex]].findIndex(id => id === memberIdToFind);
        if (indexInTeam !== -1) {
          data[TEAM_NAMES[teamIndex]][indexInTeam] = newMemberId;
          await this.writeData(data);
        }
      }
    } catch (error) {
      console.error('An error occurred:', error);
    }
  }

};

module.exports = { teamManager };
