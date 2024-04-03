const QueueEmbedManager = require("../../functions/music/queueListEmbed");

module.exports = {
  name: "queuelistembed-firstpage",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    try {
      queueEmbedManager.resetCurrentPage();
      queueEmbedManager.refreshEmbed();
    } catch (error) {
      console.error(error);
      queueEmbedManager.refreshEmbed();
    }
  },
};
