const QueueEmbedManager = require("../../functions/music/queueListEmbed");

module.exports = {
  name: "queuelistembed-previouspage",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    try {
      let page = await queueEmbedManager.getCurrentPage();
      queueEmbedManager.setIncrementation(-1);
      queueEmbedManager.refreshEmbed();
    } catch (error) {
      queueEmbedManager.refreshEmbed();
    }
  },
};
