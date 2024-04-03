const QueueEmbedManager = require("../../functions/music/queueListEmbed");

module.exports = {
  name: "queuelistembed-lastpage",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    try {
      const page = await queueEmbedManager.getTotalPages();
      queueEmbedManager.resetCurrentPage();
      queueEmbedManager.setIncrementation(page);
      queueEmbedManager.refreshEmbed();
    } catch (error) {
      console.error(error);
      queueEmbedManager.refreshEmbed();
    }
  },
};
