const { PermissionFlagsBits } = require("discord.js");
const findASkin = require("../../functions/valorant/findASkin");

module.exports = {
  name: "getskin-chroma3",
  permissions: [PermissionFlagsBits.SendMessages],
  async run(client, interaction) {
    await interaction.deferUpdate();

    const Embed = await interaction.message.embeds[0];
    const EmbedFooter = await Embed.footer.text;

    await findASkin.getSkinInfo(interaction, EmbedFooter, 3, 3);
  },
};
