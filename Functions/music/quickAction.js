const {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Colors,
  InteractionType,
  InteractionCollector,
} = require("discord.js");

const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const QueueEmbedManager = require("./queueListEmbed");

/**
 * Handles the Quick Action Select Menu for various actions
 * @param {Object} interaction - The Discord interaction object
 * @param {Array} actionOptions - The array of action options for the select menu
 * @param {Function} performAction - The function to perform the action based on selected value
 */

const actionOptions = [
  { label: "Play next", value: "nextplay", emoji: emojis["music-skip"] },
  {
    label: "Skip to the sound",
    value: "skipto",
    emoji: emojis["music-resume"],
  },
  { label: "Don't play this sound", value: "noplay", emoji: emojis.trash },
];
async function handleQuickActionSelectMenu(client, interaction, trackNum) {
  try {
    const queue = useQueue(interaction.guild.id);
    const track = queue.tracks.data[trackNum];
    const Title = [];
    trackNum = parseInt(trackNum) + 1;

    Title.push(`**What do you want to do with the sound:**`);
    Title.push(`> **\`#${trackNum}\` - ${track.title}**`);
    Title.push(`- Author [${track.author}](${track.url})`);
    Title.push(`- Added by \`@${track.requestedBy.username}\``);

    const options = actionOptions.map((option) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(option.label)
        .setValue(option.value)
        .setEmoji(option.emoji)
    );

    const actionRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setPlaceholder("Choose an action")
        .setCustomId("quickactionselectmenu-action")
        .addOptions(options)
        .setMinValues(1)
        .setMaxValues(1)
    );

    const embed = new EmbedBuilder()
      .setDescription(Title.join("\n"))
      .setThumbnail(track.thumbnail || "")
      .setFooter({ text: "You have 30 seconds to respond" })
      .setColor(Colors.Orange);

    let refreshAtTheEnd = false;

    await interaction
      .editReply({
        embeds: [embed],
        components: [actionRow],
        ephemeral: true,
      })
      .catch(async () => {
        refreshAtTheEnd = true;
        await interaction.reply({
          embeds: [embed],
          components: [actionRow],
          ephemeral: true,
        });
      });

    const filter = (i) =>
      i.customId === "quickactionselectmenu-action" &&
      i.user.id === interaction.user.id;
    const collector = new InteractionCollector(client, {
      filter,
      time: 30000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: `This isn't for you!`, ephemeral: true });
      }
      i.deferUpdate();

      if (i.customId === "quickactionselectmenu-action") {
        collector.stop();

        const trackResolvable = track;
        const name = trackResolvable.title;

        if (!trackResolvable) {
          return { success: false, message: "The track doesn't exist" };
        }

        let message = "";

        switch (i.values[0]) {
          case "nextplay":
            queue.insertTrack(trackResolvable, 0);
            message = `${emojis.success} The queue will play the sound next\n> \`${name}\``;
            break;
          case "skipto":
            queue.setRepeatMode(4);
            queue.node.skipTo(trackResolvable);
            message = `${emojis.success} The queue skipped to the sound\n> \`${name}\``;
            break;
          case "noplay":
            queue.node.remove(trackResolvable);
            message = `${emojis.success} The sound won't be played\n> \`${name}\``;
            break;
          default:
            message = "Unknown action";
            break;
        }

        await interaction.editReply({
          embeds: [
            new EmbedBuilder().setDescription(message).setColor(Colors.Green),
          ],
          components: [],
          ephemeral: true,
        });

        if (refreshAtTheEnd) {
          const queueEmbedManager = new QueueEmbedManager(interaction);
          await queueEmbedManager.refreshEmbed(interaction.message.id);
        }
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size <= 0) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder().setDescription("Canceled!").setColor(Colors.Red),
          ],
          components: [],
          ephemeral: true,
        });
      }
    });
  } catch (error) {
    console.error(error);
  }
}

module.exports = handleQuickActionSelectMenu;
