const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
} = require("discord.js");
const emojis = require("../../utils/emojis.json");
const { Sanction } = require("../../functions/moderator/sanctions");
const { createEmbed } = require("../../functions/all/Embeds");

module.exports = {
  name: "sanction",
  OwnerOnly: false,
  description: "Manage member sanctions like timeout, kick, and ban.",
  permissions: [],
  options: [
    {
      name: "timeout",
      description:
        "Timeout a member by deleting a specified number of their messages.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "member",
          description: "The member to be sanctioned.",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: "time",
          description: "The duration of the timeout.",
          type: ApplicationCommandOptionType.Number,
          required: true,
          choices: [
            { name: "Timeout for 1 minute", value: 60 },
            { name: "Timeout for 5 minutes", value: 300 },
            { name: "Timeout for 10 minutes", value: 600 },
            { name: "Timeout for 30 minutes", value: 1800 },
            { name: "Timeout for 1 hour", value: 3600 },
            { name: "Timeout for 5 hours", value: 18000 },
            { name: "Timeout for 10 hours", value: 36000 },
            { name: "Timeout for 1 day", value: 86400 },
            { name: "Timeout for 7 days", value: 604800 },
          ],
        },
        {
          name: "reason",
          description: "Reason for the timeout (optional).",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "kick",
      description: "Kick a member from the server.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "member",
          description: "The member to be kicked.",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: "reason",
          description: "Reason for the kick (optional).",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: "ban",
      description: "Ban a member from the server.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "member",
          description: "The member to be banned.",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: "reason",
          description: "Reason for the ban.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "untimeout",
      description: "Remove a timeout from a member.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "member",
          description: "The member to be untimeouted.",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
    {
      name: "unban",
      description: "Unban a previously banned member.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "member",
          description: "The member to be unbanned.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],
  async run(client, interaction) {
    const options = interaction.options;
    const subcommand = options.getSubcommand();
    const reason = options.getString("reason") || "Not specified";
    const time = options.getNumber("time") || 1; // Only relevant for timeouts

    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;

    let member;
    try {
      member =
        subcommand === "unban"
          ? options.getString("member")
          : await guild.members
              .fetch(options.getUser("member").id)
              .catch(() => null);
    } catch (error) {
      console.error(error);
      return interaction.editReply({
        embeds: [
          await createEmbed.embed(
            `${emojis.error} Unable to find the specified member or ban information.`,
            Colors.Red
          ),
        ],
      });
    }

    if (!member && !RolesChecker.comparePosition(interaction.member, member)) {
      return interaction.editReply({
        embeds: [
          await createEmbed.embed(
            `${emojis.error} The member ${member} was not bannable with your current role position`,
            Colors.Red
          ),
        ],
      });
    }

    // Vérifie les permissions nécessaires pour la sous-commande
    const permissionNeeded =
      PermissionFlagsBits[sanctionPermissionsMap[subcommand]];
    if (!interaction.member.permissions.has(permissionNeeded)) {
      return interaction.editReply({
        embeds: [
          await createEmbed.embed(
            `${emojis.error} You do not have permission to perform this action.`,
            Colors.Red
          ),
        ],
      });
    }

    // Exécution de l'action de sanction
    try {
      const sanctionResult = new Sanction(
        interaction.member.user,
        member,
        subcommand,
        "Sanction",
        reason,
        guild,
        time
      );
      await sanctionResult.perform();
      if (typeof sanctionResult === "string") {
        interaction.editReply({
          embeds: [await createEmbed.embed(sanctionResult, Colors.Red)],
        });
        throw new Error(sanctionResult);
      }
      await interaction.editReply({
        embeds: [
          await createEmbed.embed(
            `${emojis.success} Member ${
              subcommand === "unban"
                ? `<@${options.getString("member")}>`
                : member
            } has been ${subcommand}.`
          ),
        ],
      });
      await sanctionResult.sendEmbed(interaction.channel);
    } catch (error) {
      interaction.editReply({
        embeds: [
          await createEmbed.embed(
            `${emojis.error} Failed to execute the sanction. Error: ${error.message}`,
            Colors.Red
          ),
        ],
      });
      console.log(error);
    }
  },
};

const sanctionPermissionsMap = {
  timeout: "MuteMembers",
  kick: "KickMembers",
  ban: "BanMembers",
  untimeout: "MuteMembers",
  unban: "BanMembers",
};
