const {
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  InteractionCollector,
  InteractionType,
} = require("discord.js");
const emojis = require("../../utils/emojis.json");
const { useQueue } = require("discord-player");
const { createEmbed } = require("../all/Embeds");
const QueueEmbedManager = require("../../functions/music/queueListEmbed");

const ServerBetaId = 0;
const interactionLock = new Map();

class LoopSelectionHandler {
  constructor() {}

  async handleLoopSelection(client, interaction) {
    try {
      const theMap = await interactionLock.get(ServerBetaId);
      if (theMap && theMap !== undefined) {
        await interaction.reply({
          embeds: [
            await createEmbed.embed(
              "An interaction is already in progress. Please wait.",
              Colors.Orange
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      // Verrouiller les interactions
      interactionLock.set(ServerBetaId, true);

      const queueEmbedManager = new QueueEmbedManager(interaction);
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

      function getCurrentLoopMode(value) {
        switch (parseInt(value)) {
          case 1:
            return `**${emojis["music-loopTrack"]} The current track is currently on loop**`;
          case 2:
            return `**${emojis["music-loopQueue"]} The current queue is currently on loop**`;
          case 3:
            return `**${emojis["music-loopInfinitQueue"]} The queue is currently on __infinite__ loop**`;
          case 4:
          case 0:
            return `**${emojis.error} Loop mode is currently disabled**`;
          default:
            return ".";
        }
      }

      const embed = new EmbedBuilder()
        .setDescription(
          `## What loop mode do you want?\n${getCurrentLoopMode(
            queue.repeatMode
          )}`
        )
        .setFooter({ text: "You have 30 seconds to respond" })
        .setColor(Colors.Orange);

      let replyMethod = "editReply";
      if (interaction.isButton()) replyMethod = "reply";

      interaction[replyMethod]({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(loopSL)],
        ephemeral: true,
      });

      const filter = (i) =>
        i.customId === "loopselectmenu-loop" &&
        i.user.id === interaction.user.id;
      const collector = new InteractionCollector(client, {
        filter,
        time: 30000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id)
          return i.reply({ content: `This isn't for you!`, ephemeral: true });

        i.deferUpdate();
        collector.stop();

        const SUPRA_ID = i.values[0];
        const loopMode = SUPRA_ID.substring(20);
        const value = parseInt(loopMode);

        queue.setRepeatMode(value);

        const messageContent = this.getLoopMessageContent(value);

        await interaction.editReply({
          embeds: [await createEmbed.embed(messageContent)],
          components: [],
          ephemeral: true,
        });

        if (interaction.isButton()) {
          await queueEmbedManager.refreshEmbed(interaction.message.id);
        }
      });

      collector.on("end", async (collected) => {
        if (collected.size <= 0) {
          await interaction.editReply({
            embeds: [await createEmbed.embed("Time is up.", Colors.Red)],
            components: [],
            ephemeral: true,
          });
        }
      });
    } catch (error) {
      console.error(error);
    } finally {
      // Déverrouiller les interactions
      interactionLock.delete(ServerBetaId);
    }
  }

  getLoopMessageContent(value) {
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
        return ".";
    }
  }
}

module.exports = LoopSelectionHandler;
