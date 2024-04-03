const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const QueueEmbedManager = require("../../functions/music/queueListEmbed");
const { createEmbed } = require("../../functions/all/Embeds");

module.exports = {
  name: "queuelistembed-skip",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    try {
      const queue = useQueue(interaction.guild.id);
      if (!queue) return;

      await interaction.deferUpdate().catch(() => {});
      queue.setRepeatMode(4);
      queue.node.skip();

      queueEmbedManager.refreshEmbed();
      interaction.followUp({
        embeds: [await createEmbed.embed(`${emojis.success} Sound skipped`)],
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      queueEmbedManager.handleError(error);
    }
  },
};
