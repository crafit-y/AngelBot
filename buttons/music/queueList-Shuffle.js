const {
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  InteractionType,
} = require("discord.js");
const emojis = require("../../utils/emojis.json");
const { useQueue } = require("discord-player");
const QueueEmbedManager = require("../../functions/music/queueListEmbed");
const { createEmbed } = require("../../functions/all/Embeds");

module.exports = {
  name: "queuelistembed-shuffle",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    await interaction.deferUpdate();
    try {
      const queue = useQueue(interaction.guild.id);
      if (!queue) return;

      queue.shuffle();

      queueEmbedManager.refreshEmbed();
      interaction.followUp({
        embeds: [await createEmbed.embed(`${emojis.success} Queue shuffled`)],
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      queueEmbedManager.handleError(error);
    }
  },
};
