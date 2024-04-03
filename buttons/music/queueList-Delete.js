const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const QueueEmbedManager = require("../../functions/music/queueListEmbed");
const { createEmbed } = require("../../functions/all/Embeds");

module.exports = {
  name: "queuelistembed-delete",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    await interaction.deferUpdate();
    try {
      const queue = useQueue(interaction.guild.id);
      if (!queue) return;

      if (queue) return queue.delete();
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
