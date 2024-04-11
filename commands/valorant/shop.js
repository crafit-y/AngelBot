const {
  EmbedBuilder,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Colors,
} = require("discord.js");


// Command execution
module.exports = {
  name: "shop",
  description: "Manage your VALORANT account linkage",
  permissions: [],
  options: [
    {
      name: "login",
      description: "Log in with your Riot username/password!",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: "username",
          description: "Your Riot username",
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: "password",
          description: "Your Riot password",
          required: true,
        },
      ],
    },
    {
      name: "logout",
      description:
        "Delete your credentials from the bot, but keep your alerts..",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: "account",
          description:
            "The account you want to logout from. Leave blank to logout of your current account.",
          required: false,
          autocomplete: true,
        },
      ],
    },
    {
      name: "2fa",
      description: "Enter your 2FA code if needed",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          type: ApplicationCommandOptionType.Integer,
          name: "code",
          description: "The 2FA Code",
          required: true,
          minValue: 0,
          maxValue: 999999,
        },
      ],
    },
    {
      name: "cookies",
      description:
        "Log in with your cookies. Useful if you have 2FA or if you use Google/Facebook to log in.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: "cookies",
          description: "Your auth.riotgames.com cookie header",
          required: true,
        },
      ],
    },
    {
      name: "view",
      description: "Show your current daily shop!",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: "user",
          description: "Optional: see the daily shop of someone else!",
          required: false,
        },
      ],
    },
    {
      name: "bundles",
      description: "Show the current featured bundle(s).",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "nightmarket",
      description: "Show your Night Market if there is one.",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  async run(client, interaction) {
    //const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({
      ephemeral: true
    });

    try {

      IntegrationApplication.editReply("Comming soon...")

    } catch (error) {
      console.error(error);
    }
  },
};
