const { ApplicationCommandOptionType, Colors } = require('discord.js');
const { disconnectAllUsers } = require('../../functions/Party/disconnectAllUsers');
const { createEmbed } = require('../../functions/All/Embeds.js');
const { teamManager } = require('../../functions/Fs/TeamManager.js');
const { liveManager } = require('../../functions/Fs/LiveManager.js');
const { partyManager } = require('../../functions/Fs/PartyManager.js');

const emojis = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');

module.exports = {
  name: 'force_reset',
  description: 'Force reset all informations of the party (can\'t be undone)',
  permissions: ['ADMINISTRATOR'],
  options: [],
  OwnerOnly: "true",
  async run(client, interaction) {

    await interaction.deferReply();

    await partyManager.setCreated(false);
    await liveManager.setStatus(false);

    const ARRAY = [];
    for (let i = 1; i <= 5; i++) {
      ARRAY.push("0000000000000000000");
    }
    
    await teamManager.updateTeam(`team1`, ARRAY);
    await teamManager.updateTeam(`team2`, ARRAY);
    
    await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.info} System\n > FORCE RESET`)] });
  }
};
