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

      const Title = `**What do you want to do with the sound** \`${track.title.slice(
        0,
        50
      )}\` **?**`;

      const action1 = new StringSelectMenuOptionBuilder()
        .setLabel(`Skip to the sound`)
        .setValue(`quikactionselectmenu-action-skipto`)
        .setEmoji(emojis["music-skip"]);
      const action2 = new StringSelectMenuOptionBuilder()
        .setLabel(`Don't play this sound`)
        .setValue(`quikactionselectmenu-action-noplay`)
        .setEmoji(emojis.trash);

      const actionSL = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder("Quick action for a sound")
          .setCustomId("quikactionselectmenu-action")
          .addOptions(action1, action2)
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
            case "quikactionselectmenu-action-skipto":
              queue.setRepeatMode(4);
              queue.node.skipTo(trackResolvable);
              actionDescription = `${emojis.success} The queue skipped to the sound\n> \`${name}\``;
              break;
            case "quikactionselectmenu-action-noplay":
              queue.node.remove(trackResolvable);
              actionDescription = `${emojis.success} The sound won't be played\n> \`${name}\``;
              break;
          }
          queueEmbedManager.refreshEmbed();
          interaction.followUp({
            embeds: [await createEmbed.embed(actionDescription)],
            ephemeral: true,
          });
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
