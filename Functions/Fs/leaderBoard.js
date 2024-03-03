const fs = require('fs').promises;

const LEADERBOARD_FILE = "LEADERBOARD.json";

const leaderBoard = {
  async getData() {
    try {
      const data = await fs.readFile(LEADERBOARD_FILE);
      return JSON.parse(data);
    } catch (error) {
      return { users: {} }; // Utiliser un objet vide pour stocker les utilisateurs
    }
  },

  async writeData(data) {
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(data));
  },

  async createUser(userId) {
    const data = await this.getData();
    if (!data.users[userId]) {
      data.users[userId] = { wins: 0, losses: 0, gamesPlayed: 0 };
      await this.writeData(data);
    }
  },

  async userExists(userId) {
    const data = await this.getData();
    return !!data.users[userId];
  },

  async generateLeaderboard() {
    const data = await this.getData();
    const sortedUsers = Object.entries(data.users)
      .sort(([, userA], [, userB]) => userB.wins - userA.wins) // Trie les utilisateurs par nombre de victoires
      .slice(0, 10) // Sélectionne les 10 premiers utilisateurs
      .map(([userId, userData]) => ({ userId, ...userData })); // Inclut l'ID de chaque utilisateur dans les données
    return { sortedUsers };
  },

  async updateMultipleUsers(usersData) {
    const data = await this.getData();
    usersData.forEach(userData => {
      if (data.users[userData.userId]) {
        data.users[userData.userId] = { ...data.users[userData.userId], ...userData };
      }
    });
    await this.writeData(data);
  },

  async getUserPosition(userId) {
    const data = await this.getData();
    const sortedUsers = Object.entries(data.users)
      .sort(([, a], [, b]) => b.wins - a.wins);
    const userIndex = sortedUsers.findIndex(([id]) => id === userId);
    return userIndex !== -1 ? userIndex + 1 : null;
  },

  async updateTeamStats(usersTeam1, usersTeam2) {
    try {
      const allUsers = new Set([...usersTeam1, ...usersTeam2]);
      for (const userId of allUsers) {
        if (!await this.userExists(userId)) {
          await this.createUser(userId);
        }
        const winsToAdd = usersTeam1.includes(userId) ? 1 : 0;
        const lossesToAdd = usersTeam2.includes(userId) ? 1 : 0;
        await this.updateUserStats(userId, winsToAdd, lossesToAdd);
      }
    } catch (error) {
      console.error('Error updating team stats:', error);
    }
  },

  async updateUserStats(userId, winsToAdd = 0, lossesToAdd = 0) {
    try {
      const data = await this.getData();
      if (data.users[userId]) {
        data.users[userId].wins += winsToAdd;
        data.users[userId].losses += lossesToAdd;
        data.users[userId].gamesPlayed++;
        await this.writeData(data);
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  },

  async getUserStats(userId) {
    try {
      const data = await this.getData();
      if (data.users[userId]) {
        const { wins, losses, gamesPlayed } = data.users[userId];
        return { wins, losses, gamesPlayed };
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      throw error;
    }
  }
};

module.exports = { leaderBoard };
