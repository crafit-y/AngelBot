const { Colors } = require("discord.js");
const { createEmbed } = require("../../functions/all/Embeds");
const emojis = require("../../utils/emojis.json");
const MatchEmbed = require("../../functions/valorant/MatchEmbed");
const handleError = require("../../utils/handlers/ErrorHandler");

module.exports = {
  name: "display-the-matchid",
  permissions: [],
  async run(client, interaction) {
    await interaction.deferReply();
    const value = interaction.values[0];

    if (!value || value.endsWith("error")) {
      return handleError(interaction);
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
      handleError(interaction, error);
      return console.error(error);
    }
  },
};
