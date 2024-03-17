const { EmbedBuilder, Colors } = require('discord.js');
const fs = require('fs').promises;
const { createEmbed } = require('../all/Embeds');
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

async function getTheTeamOfTheUser(member) {
  try {

    const usersTeam1 = await teamManager.getTeamMembers('team1');
    const usersTeam2 = await teamManager.getTeamMembers('team2');

    const team1 = usersTeam1.includes(member.id);
    const team2 = usersTeam2.includes(member.id);

    if (team1 && team2) {
      return "0"
    } else if (team1) {
      return "1"
    } else if (team2) {
      return "2"
    } else {
      return null;
    }

  } catch (error) {
    console.error('Error to get user team:', error);
  }
}

module.exports = { getTheTeamOfTheUser };
