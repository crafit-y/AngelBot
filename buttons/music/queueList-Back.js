const { EmbedBuilder, Colors } = require("discord.js");
const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const QueueEmbedManager = require("../../functions/music/queueListEmbed");
const { createEmbed } = require("../../functions/all/Embeds");

module.exports = {
  name: "queuelistembed-back",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    await interaction.deferUpdate();
    try {
      const queue = useQueue(interaction.guild.id);
      if (!queue) return;

      queue.setRepeatMode(4);

      let embed;

      await queue.history
        .back()
        .then(async () => {
          embed = await createEmbed.embed(`${emojis.success} Queue going back`);
        })
        .catch(async () => {
          embed = await createEmbed.embed(
            `${emojis.error} No previous track!`,
            Colors.Red
          );
        });
      await interaction.followUp({
        embeds: [embed],
        ephemeral: true,
      });

      queueEmbedManager.refreshEmbed();
    } catch (error) {
      console.error(error);
      queueEmbedManager.handleError(error.message);
    }
  },
};
