const { ActionRowBuilder, CommandInteraction, StringSelectMenuBuilder, UserSelectMenuBuilder, InteractionCollector, StringSelectMenuOptionBuilder, PermissionFlagsBits, Colors } = require('discord.js');
const { updateUsersTeam } = require('../../Functions/Party/updateUsersTeam.js');
const { getAllTheTeam } = require('../../Functions/Party/getAllTheTeam');
const { teamManager } = require('../../Functions/Fs/TeamManager.js');
const { createEmbed } = require('../../Functions/All/Embeds');

const EMOJIS = require('../../utils/emojis.json');

module.exports = {
  name: 'updateusersteam-team1',
  permissions: [PermissionFlagsBits.Administrator],
  async runInteraction(client, interaction) {
    try {

      await interaction.deferUpdate();

      let team = "1";

      await updateUsersTeam(client, interaction, team, true);

    } catch (error) {
      // Handle error
    }
  }
};
