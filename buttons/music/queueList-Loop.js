const {
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  InteractionType,
} = require("discord.js");
const emojis = require("../../utils/emojis.json");
const { useQueue } = require("discord-player");
const QueueEmbedManager = require("../../functions/music/queueListEmbed");
const { createEmbed } = require("../../functions/all/Embeds");

module.exports = {
  name: "queuelistembed-loop",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    try {
      const queue = useQueue(interaction.guild.id);

      const loopOptions = [
        {
          label: "Loop only the current track",
          value: 1,
          emoji: emojis["music-loopTrack"],
        },
        {
          label: "Loop the current queue",
          value: 2,
          emoji: emojis["music-loopQueue"],
        },
        {
          label: "INFINITE QUEUE",
          value: 3,
          emoji: emojis["music-loopInfinitQueue"],
        },
        { label: "Stop the loop mode", value: 4, emoji: emojis.error },
      ];

      const options = loopOptions.map((option) =>
        new StringSelectMenuOptionBuilder()
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

      const message = await interaction.reply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(loopSL)],
        ephemeral: true,
      });

      const filter = (i) => i.type === InteractionType.MessageComponent;
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 30 * 1000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id)
          return i.reply({ content: `This isn't for you!`, ephemeral: true });
        i.deferUpdate();

        if (i.customId === "loopselectmenu-loop") {
          const SUPRA_ID = i.values[0];
          const loopMode = SUPRA_ID.substring(20);
          const value = parseInt(loopMode);

          queue.setRepeatMode(value);
          queueEmbedManager.refreshEmbed();
          interaction.followUp({
            embeds: [await createEmbed.embed(getLoopMessageContent(value))],
            ephemeral: true,
          });
        }
      });

      collector.on("end", async () => {
        await message.delete();
      });
    } catch (error) {
      console.error(error);
      queueEmbedManager.refreshEmbed();
    }
  },
};

function getLoopMessageContent(value) {
  switch (parseInt(value)) {
    case 1:
      return `${emojis["music-loopTrack"]} **The current track is now on loop!**`;
    case 2:
      return `${emojis["music-loopQueue"]} **The current queue is now on loop!**`;
    case 3:
      return `${emojis["music-loopInfinitQueue"]} **The queue is now on __infinite__ loop!**`;
    case 4:
      return `${emojis.success} **Loop mode has been disabled!**`;
    default:
      return "";
  }
}
