const {
  ActionRowBuilder,
  CommandInteraction,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  InteractionCollector,
  StringSelectMenuOptionBuilder,
  PermissionFlagsBits,
  Colors,
} = require("discord.js");
const { createEmbed } = require("../../functions/all/Embeds");

const emojis = require("../../utils/emojis.json");
const MatchEmbed = require("../../functions/valorant/MatchEmbed");
const ValorantAPIClient = require("../../functions/api/valorant-api");
const handleError = require("../../utils/handlers/ErrorHandler");
const valorantAPI = new ValorantAPIClient(process.env.HENRIK_API_KEY);

async function fetchValorantAccountDetails(playerTag) {
  const [name, tag] = playerTag
    .replaceAll("`", "")
    .replaceAll(" ", "")
    .split("#");
  const accountResponse = await valorantAPI.getAccount({ name, tag });

  if (!accountResponse || accountResponse.status !== 200) {
    throw new Error(`The player ${playerTag} does not exist!`);
  }

  return accountResponse;
}

module.exports = {
  name: "playeractionbutton-lastmatch",
  permissions: [PermissionFlagsBits.SendMessages],
  async run(client, interaction) {
    try {
      await interaction.deferReply();

      const Embed = await interaction.message.embeds[0];
      const EmbedDescription = await Embed.description;

      // Récupérer le tag du joueur entre "player" et ">"
      const start = EmbedDescription.indexOf("Player") + "player".length;
      const end = EmbedDescription.indexOf("`\n>", start);
      let playerTag = "";

      if (start !== -1 && end !== -1) {
        playerTag = EmbedDescription.substring(start, end).trim();
      } else {
        throw new Error(
          "Le mot 'player' ou '>' n'est pas présent dans la description de l'embed."
        );
      }

      const player = await fetchValorantAccountDetails(playerTag);
      const playerData = player?.data;

      const MatchUtil = new MatchEmbed(
        interaction,
        playerData.puuid,
        playerData.region
      );
      await MatchUtil.getLastMatch();
      await MatchUtil.generate();
    } catch (error) {
      console.log(error);
      handleError(interaction, error);
    }
  },
};
