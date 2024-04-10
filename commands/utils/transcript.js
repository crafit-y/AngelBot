const {
  ApplicationCommandOptionType,
  Colors,
  PermissionFlagsBits,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const { Normalizer } = require("../../functions/all/Normalize");
const { createEmbed } = require("../../functions/all/Embeds");
const emojis = require("../../utils/emojis.json");

module.exports = {
  name: "transcript",
  description: "Generate a transcript of the messages in a channel.",
  permissions: [
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ManageChannels,
  ],
  options: [
    {
      name: "limit",
      description:
        "The maximum number of messages to include in the transcript.",
      type: ApplicationCommandOptionType.Number,
      required: true,
      choices: [
        { name: "Normal conversation ➔ 5 messages", value: 5 },
        { name: "Large conversation ➔ 10 messages", value: 10 },
        { name: "Very Large conversation ➔ 20 messages", value: 20 },
        { name: "Big conversation ➔ 50 messages", value: 50 },
        { name: "HugeEnormous conversation ➔ 100 messages", value: 100 },
        { name: "Super Hug conversation ➔ 250 messages", value: 250 },
        { name: "Enormous conversation ➔ 500 messages", value: 500 },
        { name: "Gigantic conversation ➔ 750 messages", value: 750 },
        {
          name: "Colossal conversation (may cause lag) ➔ 1000 messages",
          value: 1000,
        },
        {
          name: "Immense conversation (may cause lag) ➔ 5000 messages",
          value: 5000,
        },
        { name: "Entire channel (may cause lag)", value: 0 },
      ],
    },
    {
      name: "channel",
      description: "Select a channel",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
  ],
  async run(client, interaction) {
    const channel =
      interaction.options.getChannel("channel") || interaction.channel;
    let limit = interaction.options.getNumber("limit") || -1;

    const transcribingMessage =
      limit <= -1
        ? "\n> *(transcribing an entire channel can be very time-consuming)*"
        : "";
    const timeConsumingWarning =
      limit >= 1000
        ? "\n> *(transcribing a lot of messages in channel can be very time-consuming)*"
        : "";

    const statusMessage = `${emojis.loading} Generating transcript for ${channel}...${transcribingMessage}${timeConsumingWarning}`;

    const errorMessage = `${emojis.error} An error occurred while generating the transcript.`;
    const successMessage = `${emojis.success} Transcript for ${channel} generated successfully!`;

    await interaction.deferReply({ ephemeral: true });

    try {
      await interaction.editReply({
        embeds: [await createEmbed.embed(statusMessage, Colors.Orange)],
      });

      const transcriptFile = await createTranscript(channel, {
        limit,
        returnBuffer: false,
        filename: `${Normalizer.normalizeSpecialCharacters(
          channel.name
        )}-transcript.html`,
        poweredBy: false,
        hydrate: true,
      });

      await interaction.editReply({
        embeds: [await createEmbed.embed(successMessage)],
        files: [transcriptFile],
      });
    } catch (error) {
      console.error("Error executing the command:", error);
      await interaction.editReply({
        embeds: [await createEmbed.embed(errorMessage, Colors.Red)],
      });
    }
  },
};
