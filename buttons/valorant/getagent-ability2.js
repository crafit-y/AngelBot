const { PermissionFlagsBits } = require("discord.js");
const findAnAgent = require("../../functions/valorant/findAnAgent");

module.exports = {
  name: "getagent-ability2",
  permissions: [PermissionFlagsBits.SendMessages],
  async run(client, interaction) {
    await interaction.deferUpdate();

    const Embed = await interaction.message.embeds[0];
    const EmbedAuthorName = await Embed.author.name;

    await findAnAgent.getAgentOrAbilityInfo(interaction, EmbedAuthorName, 2);
  },
};
