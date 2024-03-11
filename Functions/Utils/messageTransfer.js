const { ChannelSelectMenuBuilder, ActionRowBuilder, InteractionCollector } = require('discord.js');
const { createEmbed } = require('../All/Embeds');
const { WebHookBuilder } = require('../All/WebHooks');
const emojis = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');

const MessageTransfer = {
  async transfer(client, interaction, message, channel = null) {
    const channelSelecterID = "move_a_message-channel";
    const channelNotFoundEmbed = await createEmbed.embed(`⚠️ Selected channel not found. Please try again.`);

    try {
      if (!channel) {
        const channelSelect = new ChannelSelectMenuBuilder()
          .setCustomId(channelSelecterID)
          .setPlaceholder('Select a channel.')
          .setMinValues(1)
          .setMaxValues(1);

        const row = new ActionRowBuilder()
          .addComponents(channelSelect);

        await interaction.editReply({ embeds: [await createEmbed.embed(`### To which salon would you like to transfer the [message](${message.url}) ?\n*You have 1 minute*`)], components: [row], ephemeral: true });

        const filter = i => i.user.id === interaction.user.id && i.customId === channelSelecterID;
        const collector = new InteractionCollector(client, { filter, time: 60000 });

        collector.on('collect', async i => {
          const selectedChannel = client.guilds.cache.get(IDS.OTHER_IDS.GUILD)?.channels.cache.get(i.values[0]);
          await i.deferUpdate();
          collector.stop();
          channelSelect.setDisabled(true);

          if (!selectedChannel) {
            await interaction.editReply({ embeds: [channelNotFoundEmbed], components: [row], ephemeral: true });
            return;
          }

          channel = selectedChannel;
          await transferMessage(client, message, channel, interaction, row);
        });

        collector.on('end', async collected => {
          if (collected.size === 0) {
            channelSelect.setDisabled(true);
            interaction.editReply({ embeds: [await createEmbed.embed('Time is up. Please try again.', Colors.Red)], components: [row], ephemeral: true });
          }
        });
      } else {
        await transferMessage(client, message, channel, interaction);
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} Error : \`${error.message}\``, Colors.Red)], ephemeral: true });
    }
  },
};

async function transferMessage(client, message, channel, interaction, row) {
  try {
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find(wh => wh.token);

    if (!webhook) {
      webhook = await WebHookBuilder.create(client, channel);
    }

    let content = message.content;
    if (!content.startsWith("*\(transfered message\)*")) {
      content = "*\(transfered message\)*\n\n" + content;
    }

    const newMessage = await webhook.send({
      content: content,
      username: message.author.displayName,
      avatarURL: message.author.displayAvatarURL(),
      files: message.attachments.map(attachment => attachment.url)
    });

    await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.success} The [message](${message.url}) of ${message.author} has been transfered to ${channel}.`)], components: [row], ephemeral: true });

    await message.reply({ content: `${message.author}`, embeds: [await createEmbed.embed(`${emojis.success} Your [message](${message.url}) has been transfered to ${channel}.`)] })

    return newMessage;
  } catch (error) {
    console.error(error);
    await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} Error : \`${error.message}\``, Colors.Red)], ephemeral: true });
    throw error;
  }
}

module.exports = { MessageTransfer };
