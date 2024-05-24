const {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Colors,
  InteractionType,
} = require("discord.js");
const { useQueue } = require("discord-player");
const { createEmbed } = require("../../functions/all/Embeds");
const emojis = require("../../utils/emojis.json");
const QueueEmbedManager = require("../../functions/music/queueListEmbed");

module.exports = {
  name: "quikactionselectmenu",
  permissions: [],
  async run(client, interaction) {
    const queueEmbedManager = new QueueEmbedManager(interaction);
    try {
      const queue = useQueue(interaction.guild.id);
      if (!queue) return;

      const i = interaction;
      const trackNum = i.values[0];
      const track = queue.tracks.data[trackNum - 1];

      const Title = `**What do you want to do with the sound:**\n> \`#${trackNum}\` - ${track.title} **?**`;

      const quikActionOptions = [
        {
          label: "Play next",
          value: "music-nextplay",
          emoji: emojis["music-skip"],
        },
        {
          label: "Skip to the sound",
          value: "music-skipto",
          emoji: emojis["music-resume"],
        },
        {
          label: "Don't play this sound",
          value: "music-noplay",
          emoji: emojis.trash,
        },
      ];

      const options = quikActionOptions.map((option) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(option.label)
          .setValue(option.value)
          .setEmoji(option.emoji)
      );

      const actionSL = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder("Quick action for a sound")
          .setCustomId("quikactionselectmenu-action")
          .addOptions(options)
          .setMinValues(1)
          .setMaxValues(1)
      );

      const embed = new EmbedBuilder()
        .setDescription(Title)
        .setFooter({ text: "You have 30 seconds to respond" })
        .setColor(Colors.Orange);

      const message = await interaction.reply({
        embeds: [embed],
        components: [actionSL],
        ephemeral: true,
      }); //.catch(() => {});

      const filter = (i) => i.type === InteractionType.MessageComponent;
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 30 * 1000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id)
          return i.reply({ content: `This isn't for you!`, ephemeral: true });
        i.deferUpdate();

        if (i.customId === "quikactionselectmenu-action") {
          await collector.stop();

          const trackResolvable = queue.tracks.at(trackNum - 1);

          if (!trackResolvable) {
            const errorEmbed = new EmbedBuilder()
              .setColor(Colors.Red)
              .setDescription(`${emojis.error} The track doesn't exist`);

            return message.editReply({ embeds: [errorEmbed], ephemeral: true });
          }

          const name = trackResolvable.title;
          let actionDescription = "";

          switch (i.values[0]) {
            case "music-nextplay":
              queue.insertTrack(trackResolvable, 0);
              actionDescription = `${emojis.success} The queue play to the sound on the next\n> \`${name}\``;
              break;
            case "music-skipto":
              queue.setRepeatMode(4);
              queue.node.skipTo(trackResolvable);
              actionDescription = `${emojis.success} The queue skipped to the sound\n> \`${name}\``;
              break;
            case "music-noplay":
              queue.node.remove(trackResolvable);
              actionDescription = `${emojis.success} The sound won't be played\n> \`${name}\``;
              break;
          }

          await message.delete().catch(() => {});
          await interaction.followUp({
            embeds: [await createEmbed.embed(actionDescription)],
            ephemeral: true,
          });
          await queueEmbedManager.refreshEmbed(interaction.message.id);
        }
      });

      collector.on("end", async () => {
        //await message.delete().catch(() => {});
      });
    } catch (error) {
      console.error(error);
    }
  },
};
