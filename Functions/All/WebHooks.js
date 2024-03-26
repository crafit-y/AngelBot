const WebHookBuilder = {
  createOrUpdate: async (client, channel, reason = "not specified") => {
    try {
      let webhook = (await channel.fetchWebhooks()).find(wh => wh.owner.id === client.user.id);

      if (!webhook) {
        webhook = await channel.createWebhook({
          name: client.user.username,
          avatar: client.user.displayAvatarURL(),
          reason: reason
        });
      } else {
        await webhook.edit({
          name: client.user.username,
          avatar: client.user.displayAvatarURL(),
          reason: reason
        });
      }

      return webhook;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
};

const Webhook = {
  send: async (channel, name, avatarURL, content = null, embeds = null, files = null) => {
    const webhook = await WebHookBuilder.createOrUpdate(channel.guild.client, channel);
    if (!webhook) {
      console.error("Failed to create or update webhook.");
      return;
    }

    const webhookData = {
      username: name,
      avatarURL: avatarURL
    };

    if (content) webhookData.content = content;
    if (embeds) webhookData.embeds = embeds;
    if (files) webhookData.files = files;

    await webhook.send(webhookData);
  }
};

module.exports = { WebHookBuilder, Webhook };
