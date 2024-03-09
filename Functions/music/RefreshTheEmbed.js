const { EmbedBuilder, Colors } = require('discord.js');
const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const { InitializeQueueListEmbed, QueueErrorCheck } = require("./queueListEmbed");

async function RefreshEmbed(interaction, ingremantation, newEmbedDescription, newEmbedFooter) {

  await interaction.deferUpdate().catch((e) => {});
  const queue = useQueue(interaction.guild.id);

  try {

    QueueErrorCheck(interaction, !queue);

    const EmbedToUpdate = interaction.message.embeds[0]
    const embedThumbnail = EmbedToUpdate.thumbnail.url;
    const embedTitle = EmbedToUpdate.title;
    const embedFooter = EmbedToUpdate.footer.text;

    const embed = new EmbedBuilder()
      .setThumbnail(embedThumbnail)
      .setTitle(embedTitle)
      .setDescription(newEmbedDescription)
      .setFooter({ text: newEmbedFooter != null ? newEmbedFooter : embedFooter })
      .setColor(Colors.Orange);

    await interaction.message.edit({ embeds: [embed] });

    await new Promise(resolve => setTimeout(resolve, 100)).catch(O_o => { console.log(O_o) });

    InitializeQueueListEmbed(interaction, ingremantation);

  } catch (error) {

    console.error(error)

    queue.delete().catch(O_o => { console.log(O_o) });

    const embed = new EmbedBuilder()
      .setDescription(`${emojis.error} Error on refreshing ! (Please try again, music stopped)\n\`\`\`${error}\`\`\``)
      .setColor(Colors.Red);

    if (interaction.isRepliable()) {
      //interaction.deferUpdate().catch(() => {});
      return interaction.message.edit({
        embeds: [embed]
      });
    } else {
      return interaction.reply({
        embeds: [embed]
      });
    }
  }
}

module.exports = { RefreshEmbed: RefreshEmbed };