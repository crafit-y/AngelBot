const {
  SlashCommandBuilder,
  EmbedBuilder,
  CommandInteraction,
  Client,
} = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "test",
  description: "Get the last VALORANT match for a Riot ID",
  permissions: [],
  options: [],
  async run(client, interaction) {
    try {
      // Obtenir le PUUID du joueur
      let accountResponse = await axios.get(
        "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/Crafity/007",
        {
          headers: {
            "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
            "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
            Origin: "AngelBot",
            "X-Riot-Token": process.env.RIOT_VALORANT_API_KEY,
          },
        }
      );

      const puuid = accountResponse.data.puuid;

      // // Obtenir les détails du dernier match
      // let matchResponse = await axios.get(
      //   `https://europe.api.riotgames.com/val/match/v1/matches/by-puuid/${puuid}`, // Assurez-vous que l'URL est correcte selon la documentation de l'API
      //   {
      //     headers: {
      //       "X-Riot-Token": process.env.RIOT_VALORANT_API_KEY,
      //     },
      //   }
      // );

      // const lastMatchId = matchResponse.data[0]; // ID du dernier match

      if (puuid) {
        // Répondre avec l'ID du dernier match
        await interaction.reply({
          content: `Last VALORANT match ID: \`${puuid}\``,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `No recent matches found.`,
          ephemeral: true,
        });
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      await interaction.reply({
        content: "An error occurred while fetching the data.",
        ephemeral: true,
      });
    }
  },
};
