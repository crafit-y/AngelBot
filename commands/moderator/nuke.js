const { ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionType, Colors } = require("discord.js");
const { createEmbed } = require("../../functions/all/Embeds");
const emojis = require("../../utils/emojis.json");
const { DTBM } = require("../../functions/all/DTBM");

module.exports = {
  name: 'nuke',
  OwnerOnly: false,
  description: 'Delete a specific number of messages from a given channel',
  permissions: ["MANAGE_MESSAGES"],
  async run(client, interaction) {
    await interaction.deferReply();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Yes')
          .setStyle(ButtonStyle.Success)
          .setCustomId('nuke-button-yes')
      )
      .addComponents(
        new ButtonBuilder()
          .setLabel('No')
          .setStyle(ButtonStyle.Danger)
          .setCustomId('nuke-button-no')
      );

    const filter = i => i.type === InteractionType.MessageComponent;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 10000 });

    await interaction.editReply({
      embeds: [await createEmbed.embed(`${emojis.info} **Are you sure you want to delete all messages in this channel ?**\n*You have 10s to respond*`, Colors.Orange)],
      components: [row]
    });

    const PenndingActionButton = new ButtonBuilder()
      .setLabel('Pending action')
      .setEmoji(emojis.loading)
      .setStyle(ButtonStyle.Success)
      .setDisabled(true)
      .setCustomId('nuke-pendingaction');

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: `This action isn't for you!`, ephemeral: true });
      }
      i.deferUpdate();

      if (i.customId === 'nuke-button-yes') {
        await collector.stop();
        await interaction.editReply({
          embeds: [await createEmbed.embed(`${emojis.success} Pending action...`)],
          components: [new ActionRowBuilder().addComponents(PenndingActionButton)],
        });

        const newChannel = await interaction.channel.clone();
        await newChannel.setPosition(interaction.channel.position);
        await interaction.channel.delete();
        await newChannel.send({ content: `${interaction.member}`, embeds: [await createEmbed.embed(`${emojis.success} You have cleared the channel.`)] }).catch(console.error);
      } else if (i.customId === 'nuke-button-no') {
        await collector.stop();
      }
    });

    collector.on('end', async collected => {
      if (collected.size === 0) {
        await interaction.editReply({
          embeds: [await createEmbed.embed(`${emojis.error} Time is up. Please try again.`, Colors.Red)],
          components: [DTBM.createButton()],
        });
      } else {
        await interaction.editReply({
          embeds: [await createEmbed.embed(`${emojis.info} Command canceled`, Colors.Red)],
          components: [DTBM.createButton()],
        });
      }
    });
  }
};
