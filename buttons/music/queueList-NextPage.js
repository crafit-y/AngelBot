const QueueEmbedManager = require("../../functions/music/queueListEmbed");

module.exports = {
  name: "queuelistembed-nextpage",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    try {
      queueEmbedManager.setIncrementation(1);
      queueEmbedManager.refreshEmbed();
    } catch (error) {
      console.error(error);
      queueEmbedManager.refreshEmbed();
    }
  },
};
