const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Colors,
} = require("discord.js");
const emojis = require("../../utils/emojis.json");
const { createEmbed } = require("../../functions/all/Embeds");
const ValorantAccount = require("../../schemas/AccountSchema");

const PERMISSION_ERROR_MESSAGE = `${emojis.error} You don't have permission to perform this action!`;

const checkPermissions = (interaction, user) => {
  return (
    user === interaction.user ||
    interaction.member.permissions.has(PermissionFlagsBits.Administrator)
  );
};

const validateValorantTag = (interaction, playerID) => {
  if (!playerID.includes("#")) {
    interaction.editReply(
      "You have entered an invalid Valorant username and tag!"
    );
    return false;
  }
  return true;
};

module.exports = {
  name: "valorant",
  description: "Link a VALORANT account to your Discord ID",
  permissions: [],
  options: [
    {
      name: "link",
      description: "Link your VALORANT account",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "valorant-tag",
          description: "Your VALORANT username with tag",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "member",
          description: "Force link the member (mod only)",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: "linked",
      description: "Show your linked VALORANT account",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "member",
          description: "The member to check (mod only)",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: "unlink",
      description: "Unlink your VALORANT account",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "member",
          description: "Force un-link the member (mod only)",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
  ],
  async run(client, interaction) {
    const options = interaction.options;
    const subcommand = options.getSubcommand();
    const args = options.getString("valorant-tag");
    const user = options.getUser("member") || interaction.user;

    await interaction.deferReply();
    const accounts = await ValorantAccount.find({ discordId: user.id });
    const playerID = encodeURI(args).toLowerCase() || "";

    const perm = await checkPermissions(interaction, user);

    if (!perm) {
      interaction.editReply({
        embeds: [await createEmbed.embed(PERMISSION_ERROR_MESSAGE, Colors.Red)],
      });
      return;
    }

    try {
      switch (subcommand) {
        case "link":
          if (!validateValorantTag(interaction, playerID)) return;

          await ValorantAccount.deleteMany({ discordId: user.id });
          await ValorantAccount.create({
            username: user.username,
            discordId: user.id,
            valorantAccount: playerID,
          });

          interaction.editReply({
            embeds: [
              await createEmbed.embed(
                !perm
                  ? `${emojis.info} Successfully force-linked account \`${args}\` to ${user}`
                  : `${emojis.success} Successfully linked account ${args} to your Discord ID`
              ),
            ],
          });
          break;

        case "linked":
          if (accounts.length > 0) {
            const linkedAccount = decodeURI(accounts[0].valorantAccount);

            interaction.editReply({
              embeds: [
                await createEmbed.embed(
                  !perm
                    ? `${emojis.info} ${user} are linked to account \`${linkedAccount}\``
                    : `${emojis.success} Your linked account is \`${linkedAccount}\``
                ),
              ],
            });
          } else {
            interaction.editReply({
              embeds: [
                await createEmbed.embed(
                  !perm
                    ? `${emojis.info} ${user} don't have an account connected to his Discord ID`
                    : `${emojis.error} You don't have an account linked!\nUse </valorant link:1224802493104521237> to link an account to your Discord ID`,
                  Colors.Red
                ),
              ],
            });
          }
          break;

        case "unlink":
          await ValorantAccount.deleteMany({ discordId: user.id });
          interaction.editReply({
            embeds: [
              await createEmbed.embed(
                interaction.user !== user
                  ? `${emojis.info} You have well force-unlinked ${user}`
                  : `${emojis.error} Successfuly unlinked any accounts connected to your Discord ID`
              ),
            ],
          });
          break;
      }
    } catch (error) {
      console.error(error);
      interaction.editReply({
        embeds: [
          await createEmbed.embed(
            `${emojis.error} An error occurred\n> \`${error.message}\``,
            Colors.Red
          ),
        ],
      });
    }
  },
};
