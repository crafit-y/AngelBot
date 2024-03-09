const { EmbedBuilder, Colors } = require('discord.js');
const fs = require('fs').promises;
const { createEmbed } = require('../All/Embeds');
const emojis = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');

const teamManager = {
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

async function getAllTheTeam(whatTeam) {
  try {

    const usersTeam1 = await teamManager.getTeamMembers('team1');
    const usersTeam2 = await teamManager.getTeamMembers('team2');

    let usersTeam;
    

    if (whatTeam === 'all') {
      usersTeam = [...usersTeam1, ...usersTeam2];
    } else if (whatTeam === '1') {
      usersTeam = usersTeam1;
    } else if (whatTeam === '2') {
      usersTeam = usersTeam2;
    } else {
      return null;
    }

    const array = [];

    for (const userId of usersTeam) {
      array.push(userId);
    }

    return array;

  } catch (error) {
    console.error('Error to get user team:', error);
  }
}

module.exports = { getAllTheTeam };
