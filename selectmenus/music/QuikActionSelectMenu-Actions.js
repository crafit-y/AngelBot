const {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Colors,
  InteractionType,
} = require("discord.js");
const { useQueue } = require("discord-player");
const { createEmbed } = require("../../functions/all/Embeds");
const emojis = require("../../utils/emojis.json");
const QueueEmbedManager = require("../../functions/music/queueListEmbed");
const handleQuickActionSelectMenu = require("../../functions/music/quickAction");

module.exports = {
  name: "quikactionselectmenu",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    try {
      const queue = useQueue(interaction.guild.id);
      if (!queue) return;
      const trackNum = parseInt(interaction.values[0]) - 1;
      handleQuickActionSelectMenu(client, interaction, trackNum);
    } catch (error) {
      console.error(error);
    }
  },
};
