const { EmbedBuilder, Colors, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, InteractionCollector } = require('discord.js');
const emojis = require("../../utils/emojis.json");
const { useQueue } = require("discord-player");
const { createEmbed } = require("../all/Embeds");
const { QueueErrorCheck } = require("../../functions/music/queueListEmbed");

async function loopSelection(client, interaction) {
  try {
    const queue = useQueue(interaction.guild.id);
    QueueErrorCheck(interaction, !queue);

    const loopOptions = [
      { label: "Loop only the current track", value: 1, emoji: emojis['music-loopTrack'] },
      { label: "Loop the current queue", value: 2, emoji: emojis['music-loopQueue'] },
      { label: "INFINITE QUEUE", value: 3, emoji: emojis['music-loopInfinitQueue'] },
      { label: "Stop the loop mode", value: 4, emoji: emojis.error }
    ];

    const options = loopOptions.map(option => new StringSelectMenuOptionBuilder()
      .setLabel(option.label)
      .setValue(`loopselectmenu-loop-${option.value}`)
      .setEmoji(option.emoji)
    );

    const loopSL = new StringSelectMenuBuilder()
      .setPlaceholder("Loop mode selection")
      .setCustomId("loopselectmenu-loop")
      .addOptions(...options)
      .setMinValues(1)
      .setMaxValues(1);

    const embed = new EmbedBuilder()
      .setDescription("**What loop mode do you want?**")
      .setFooter({ text: "You have 30 seconds to respond" })
      .setColor(Colors.Orange);

    await interaction.editReply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(loopSL)],
      ephemeral: true
    });

    const filter = i => i.user.id === interaction.user.id;
    const collector = new InteractionCollector(client, { filter, time: 30000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: `This isn't for you!`, ephemeral: true });

      i.deferUpdate();

      if (i.customId === 'loopselectmenu-loop') {

        collector.stop();

        const SUPRA_ID = i.values[0];
        const loopMode = SUPRA_ID.substring(20);
        const value = parseInt(loopMode);

        queue.setRepeatMode(value)

        const messageContent = getLoopMessageContent(value);

        function getLoopMessageContent(value) {
          switch (parseInt(value)) {
            case 1:
              return `${emojis['music-loopTrack']} **The current track is now on loop!**`;
            case 2:
              return `${emojis['music-loopQueue']} **The current queue is now on loop!**`;
            case 3:
              return `${emojis['music-loopInfinitQueue']} **The queue is now on __infinite__ loop!**`;
            case 4:
              return `${emojis.success} **Loop mode has been disabled!**`;
            default:
              return '.';
          }
        }

        await interaction.editReply({ embeds: [await createEmbed.embed(messageContent)], components: [new ActionRowBuilder().addComponents(loopSL.setDisabled(true))], ephemeral: true });
        await interaction.channel.send({ embeds: [await createEmbed.embed(messageContent)] })
      }
    });

    collector.on('end', async collected => {
      if (collected.size === 0) {
        await interaction.editReply({ embeds: [await createEmbed.embed('Time is up. Please try again.', Colors.Red)], components: [new ActionRowBuilder().addComponents(loopSL.setDisabled(true))], ephemeral: true });
      }
    });

  } catch (error) {
    console.error(error);
  }
}

module.exports = { loopSelection };
