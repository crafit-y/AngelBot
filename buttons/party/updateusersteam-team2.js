const { ActionRowBuilder, CommandInteraction, StringSelectMenuBuilder, UserSelectMenuBuilder, InteractionCollector, StringSelectMenuOptionBuilder, PermissionFlagsBits, Colors } = require('discord.js');
const { updateUsersTeam } = require('../../functions/party/updateUsersTeam.js');
const { getAllTheTeam } = require('../../functions/party/getAllTheTeam');
const { teamManager } = require('../../functions/fs/TeamManager.js');
const { createEmbed } = require('../../functions/all/Embeds');

const emojis = require('../../utils/emojis.json');

module.exports = {
  name: 'updateusersteam-team2',
  permissions: [PermissionFlagsBits.Administrator],
  async run(client, interaction) {
    try {

      await interaction.deferUpdate();

      let team = "2";

      await updateUsersTeam(client, interaction, team, true);

    } catch (error) {
      // Handle error
    }
  }
};
