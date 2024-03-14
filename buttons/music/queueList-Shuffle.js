const { EmbedBuilder, Colors, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, InteractionType } = require('discord.js');
const emojis = require("../../utils/emojis.json");
const { useQueue } = require("discord-player");
const { QueueErrorCheck, InitializeQueueListEmbed } = require("../../functions/music/queueListEmbed");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
  name: 'queuelistembed-shuffle',
  permissions: [],
  async run(client, interaction) {
    try {
      const queue = useQueue(interaction.guild.id);
      QueueErrorCheck(interaction, !queue);
    
      queue.shuffle();

      RefreshEmbed(interaction, 0, `${emojis["music-shuffle"]} Shuffling...`, null);
    
    } catch (error) {
      console.error(error);

      RefreshEmbed(interaction, 0, `${emojis.error} ${error.message}`, null);
    }
  }
}
