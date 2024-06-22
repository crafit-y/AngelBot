const { Colors } = require("discord.js");
const { createEmbed } = require("../../functions/all/Embeds");
const emojis = require("../../utils/emojis.json");
const MatchEmbed = require("../../functions/valorant/MatchEmbed");
const Valorant = require("../../functions/valorant/Valorant");

const ValorantAPIClient = require("../../functions/api/valorant-api");
const valorantAPI = new ValorantAPIClient(process.env.HENRIK_API_KEY);

async function handleError(interaction) {
  return await interaction.editReply({
    embeds: [
      await createEmbed.embed(
        `${emojis.error} This player cannot be loaded.`,
        Colors.Red
      ),
    ],
  });
}

async function fetchValorantAccountDetails(playerTag) {
  const [name, tag] = playerTag.replaceAll(" ", "").split("#");
  const accountResponse = await valorantAPI.getAccount({ name, tag });

  if (!accountResponse || accountResponse.status !== 200) {
    throw new Error(`The player ${playerTag} does not exist!`);
  }

  return accountResponse;
}

module.exports = {
  name: "more-infos-match-embed",
  permissions: [],
  async run(client, interaction) {
    await interaction.deferReply();
    const value = interaction.values[0];

    if (!value) {
      return await handleError(interaction);
    }

    try {
      await interaction.editReply({
        embeds: [
          await createEmbed.embed(
            `${emojis.loading} Fetching player \`${value}\`...`,
            Colors.Orange
          ),
        ],
      });
      const player = await fetchValorantAccountDetails(value);
      const puuid = player.data.puuid;
      const valorant = new Valorant(interaction, puuid);
      await valorant.getValorantAccountInfos();
    } catch (error) {
      await handleError(interaction);
      return console.error(error);
    }
  },
};
