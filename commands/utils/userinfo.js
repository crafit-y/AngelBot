const {
  EmbedBuilder,
  ApplicationCommandType,
  PermissionsBitField,
  PermissionFlagsBits,
} = require("discord.js");
const emojis = require("../../utils/emojis.json");

module.exports = {
  name: "User infos",
  type: ApplicationCommandType.User,
  OwnerOnly: false,
  permissions: ["MANAGE_MESSAGES"],
  async run(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const member = await interaction.guild.members.fetch(interaction.targetId);

    const memberRoles = await member.roles.cache
      .filter((r) => r.id !== interaction.guild.id)
      .map((r) => r);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `Infos about ${member.user.displayName}`,
        iconURL: member.user.displayAvatarURL(),
      })
      .setThumbnail(member.user.displayAvatarURL())
      .setColor("#8e48f7")
      .addFields(
        { name: `Mention`, value: `<@${member.user.id}>`, inline: true },
        {
          name: `Moderator`,
          value: `${
            member.permissions.has(PermissionFlagsBits.BanMembers) ||
            member.permissions.has(PermissionFlagsBits.KickMembers) ||
            member.permissions.has(PermissionFlagsBits.Administrator)
              ? "🟢"
              : "🔴"
          }`,
          inline: true,
        },
        { name: `Id`, value: `\`${member.user.id}\``, inline: true },
        {
          name: `Roles [${memberRoles.length}]`,
          value: `${
            memberRoles.length > 0 ? memberRoles.join(", ") : "No role found !"
          }`,
          inline: false,
        },
        {
          name: `Account created at`,
          value: `<t:${parseInt(member.user.createdTimestamp / 1000)}:f>\n${
            emojis.arrow
          } <t:${parseInt(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: `Join at`,
          value: `<t:${parseInt(member.joinedTimestamp / 1000)}:f>\n${
            emojis.arrow
          } <t:${parseInt(member.joinedTimestamp / 1000)}:R>`,
          inline: true,
        }
      );

    await interaction.editReply({ embeds: [embed], ephemeral: true });
  },
};
