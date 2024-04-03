const { useQueue } = require("discord-player");
const QueueEmbedManager = require("../../functions/music/queueListEmbed");
const emojis = require("../../utils/emojis.json");
const { createEmbed } = require("../../functions/all/Embeds");

module.exports = {
  name: "queuelistembed-pauseresume",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    await interaction.deferUpdate();
    try {
      const queue = useQueue(interaction.guild.id);
      if (!queue) return;

      let message;
      if (queue.node.isPlaying()) {
        queue.node.pause();
        message = `${emojis.success} Music has been paused`;
      } else {
        queue.node.resume();
        message = `${emojis.success} Music has been resumed`;
      }

      queueEmbedManager.refreshEmbed();
      interaction.followUp({
        embeds: [await createEmbed.embed(message)],
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      queueEmbedManager.handleError(error);
    }
  },
};
