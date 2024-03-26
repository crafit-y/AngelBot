const { ApplicationCommandOptionType, Colors } = require("discord.js");
const { createEmbed } = require("../../functions/all/Embeds");
const emojis = require("../../utils/emojis.json");

module.exports = {
  name: "transcript",
  description: "Generate a transcript of the messages in a channel.",
  OwnerOnly: true,
  permissions: [],
  options: [],
  async run(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
    } catch (error) {
      console.error("Error executing the command:", error);
      await interaction.editReply({
        embeds: [
          await createEmbed.embed("Error executing the command", Colors.Red),
        ],
      });
    }
  },
};

async function verifyValorantAccount(username, tagline) {
  const API_KEY = "VOTRE_CLÉ_API";
  const region = "eu"; // La région doit être définie en fonction du compte
  const url = `https://valorant-api.com/v1/account/${username}/${tagline}?api_key=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erreur de réponse de l'API");

    const data = await response.json();
    // Logique pour vérifier si le compte est valide, basée sur la réponse
    return true; // ou false, selon votre logique de vérification
  } catch (error) {
    console.error("Erreur lors de la vérification du compte VALORANT:", error);
    return false;
  }
}
