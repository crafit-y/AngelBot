const QueueEmbedManager = require("../../functions/music/queueListEmbed");

module.exports = {
  name: "queuelistembed-refresh",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    await interaction.deferUpdate();

    queueEmbedManager.refreshEmbed();
  },
};
