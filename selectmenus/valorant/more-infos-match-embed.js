const { Colors } = require("discord.js");
const { createEmbed } = require("../../functions/all/Embeds");
const emojis = require("../../utils/emojis.json");
const MatchEmbed = require("../../functions/valorant/MatchEmbed");
const Valorant = require("../../functions/valorant/Valorant");

const ValorantAPIClient = require("../../functions/api/valorant-api");
const handleError = require("../../utils/handlers/ErrorHandler");
const valorantAPI = new ValorantAPIClient(process.env.HENRIK_API_KEY);

async function fetchValorantAccountDetails(playerTag) {
  const [name, tag] = playerTag.replaceAll(" ", "").split("#");
  const accountResponse = await valorantAPI.getAccount({ name, tag });

  if (!accountResponse || accountResponse.status !== 200) {
    throw new Error(`The player ${playerTag} does not exist!`);
  }

  return accountResponse;
}

function removeIndexFromString(str) {
  // Utilisation d'une expression régulière pour trouver le motif `${i}-`
  // L'expression régulière recherche tout jusqu'au premier tiret '-'
  return str.replace(/^[^-]+-/, "");
}

module.exports = {
  name: "more-infos-match-embed",
  permissions: [],
  async run(client, interaction) {
    await interaction.deferReply();
    const value = interaction.values[0];

    if (!value) {
      return handleError(interaction);
    }

    try {
      const convertToPlayer = removeIndexFromString(value);
      await interaction.editReply({
        embeds: [
          await createEmbed.embed(
            `${emojis.loading} Fetching player \`${convertToPlayer}\`...`,
            Colors.Orange
          ),
        ],
      });
      const player = await fetchValorantAccountDetails(convertToPlayer);
      const puuid = player.data.puuid;
      const valorant = new Valorant(interaction, puuid);
      await valorant.getValorantAccountInfos();
    } catch (error) {
      handleError(interaction, error);
      return console.error(error);
    }
  },
};
