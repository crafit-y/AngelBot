const WebHookBuilder = {
  async create(client, channel, reason = "not specified") {
    try {
      return await channel.createWebhook({
        name: client.user.displayName,
        avatar: client.user.displayAvatarURL(),
        reason: reason
      });
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  async edit(webhook, name, avatar, channel) {
    try {
      return await webhook.edit({
        name: name,
        avatar: avatar,
        channel: channel.id
      });
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  async reset(webhook, client, channel) {
    try {
      return await webhook.edit({
        name: client.user.displayName,
        avatar: client.user.displayAvatarURL(),
        channel: channel.id
      });
    } catch (error) {
      console.error(error);
      return null;
    }
  }
};

module.exports = { WebHookBuilder };
