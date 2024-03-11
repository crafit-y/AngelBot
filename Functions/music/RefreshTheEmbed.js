const { EmbedBuilder, Colors } = require('discord.js');
const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const { createEmbed } = require('../All/Embeds');
const { InitializeQueueListEmbed, QueueErrorCheck } = require("./queueListEmbed");

async function RefreshEmbed(interaction, ingremantation, newEmbedDescription, newEmbedFooter) {
  try {
    await interaction.deferUpdate().catch(() => { });
    const queue = useQueue(interaction.guild.id);
    QueueErrorCheck(interaction, !queue);

    const EmbedToUpdate = interaction.message.embeds[0];
    const { thumbnail, title, footer } = EmbedToUpdate;

    const embed = new EmbedBuilder()
      .setThumbnail(thumbnail.url)
      .setTitle(title)
      .setDescription(newEmbedDescription)
      .setFooter({ text: newEmbedFooter || footer.text })
      .setColor(Colors.Orange);

    await interaction.message.edit({ embeds: [embed] });
    await new Promise(resolve => setTimeout(resolve, 1000));

    InitializeQueueListEmbed(interaction, ingremantation);

  } catch (error) {
    console.error(error);
    const queue = useQueue(interaction.guild.id);
    if (queue) return queue.delete().catch(() => { });

    const replyMethod = interaction.isRepliable() ? interaction.message.edit : interaction.reply;
    replyMethod.call(interaction, { embeds: [await createEmbed.embed(`${emojis.error} Error on refreshing ! (Please try again, music stopped)\n\`${error}\``, Colors.Red)] }).catch(() => { });
  }
}

module.exports = { RefreshEmbed };
