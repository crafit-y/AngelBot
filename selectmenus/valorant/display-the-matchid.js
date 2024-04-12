const { Colors } = require("discord.js");
const { createEmbed } = require("../../functions/all/Embeds");
const emojis = require("../../utils/emojis.json");
const MatchEmbed = require("../../functions/valorant/MatchEmbed");

async function handleError(interaction) {
  return await interaction.editReply({
    embeds: [
      await createEmbed.embed(
        `${emojis.error} This match cannot be loaded, because it is corrupted.`,
        Colors.Red
      ),
    ],
  });
}

module.exports = {
  name: "display-the-matchid",
  permissions: [],
  async run(client, interaction) {
    await interaction.deferReply();
    const value = interaction.values[0];

    if (!value || value.endsWith("error")) {
      return await handleError(interaction);
    }

    try {
      await interaction.editReply({
        embeds: [
          await createEmbed.embed(
            `${emojis.loading} Fetching match \`${value}\`...`,
            Colors.Orange
          ),
        ],
      });
      const MatchUtil = new MatchEmbed(interaction);
      await MatchUtil.setMatchId(value);
      await MatchUtil.generate();
    } catch (error) {
      await handleError(interaction);
      return console.error(error);
    }
  },
};
