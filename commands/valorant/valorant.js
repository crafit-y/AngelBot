const {
  EmbedBuilder,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Colors,
} = require("discord.js");
const assets = require("../../utils/valorant/assets.json");

const { createEmbed } = require("../../functions/all/Embeds");
const ValorantAccount = require("../../schemas/AccountSchema");
const ValorantAPIClient = require("../../functions/api/valorant-api");
const valorantAPI = new ValorantAPIClient(process.env.HENRIK_API_KEY);
const MatchEmbed = require("../../functions/valorant/MatchEmbed");
const emojis = require("../../utils/emojis.json");
const Valorant = require("../../functions/valorant/Valorant");
const { getLatestNews } = require("../../functions/valorant/valorantNews");
const findAnAgent = require("../../functions/valorant/findAnAgent");
const findASkin = require("../../functions/valorant/findASkin");

const PERMISSION_ERROR_MESSAGE = `${emojis.error} You don't have permission to perform this action!`;
const commandId = `</valorant link:${process.env.VALORANT_COMMAND_ID}>`;
const commandViewMatch = `</valorant view-match:${process.env.VALORANT_COMMAND_ID}>`;

// Command execution
module.exports = {
  name: "valorant",
  description: "Manage your VALORANT account linkage and access game features",
  permissions: [],
  options: [
    {
      name: "link",
      description: "Link your VALORANT account to Discord",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "valorant-tag",
          description:
            "Enter your VALORANT username and tag (e.g., Player#NA1)",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "member",
          description: "Admin-only: Link another user's VALORANT account",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: "my-account",
      description: "Display linked VALORANT account information",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "member",
          description: "Specify a member to view their linked VALORANT account",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
        {
          name: "valorant-tag",
          description: "View account details for a specific VALORANT tag",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: "unlink",
      description: "Unlink your VALORANT account from Discord",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "member",
          description: "Admin-only: Unlink another user's VALORANT account",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: "last-match",
      description: "Retrieve details of your last VALORANT match",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "member",
          description: "Specify a member to view their last VALORANT match",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
        {
          name: "valorant-tag",
          description: "View last match details for a specific VALORANT tag",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: "view-match",
      description: "View details of a specific VALORANT match",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "match_id",
          description: "Enter the match ID to retrieve details",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "view-carrier",
      description: "View the match history of the linked VALORANT account",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "member",
          description: "Specify a member to view their match history",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
        {
          name: "valorant-tag",
          description: "View match history for a specific VALORANT tag",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: "view-lastnews",
      description: "View the last news of VALORANT",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "view-agent",
      description: "View the last news of VALORANT",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "agent",
          description: "Specify a agent to view infos",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
      ],
    },
    {
      name: "view-skins",
      description: "View the last news of VALORANT",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "skin-name",
          description: "Specify a agent to view infos",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
      ],
    },
    // {
    //   name: "view-shop",
    //   description: "View the current store offerings in VALORANT",
    //   type: ApplicationCommandOptionType.Subcommand,
    // },
  ],

  async run(client, interaction) {
    await interaction.deferReply();
    if (!checkPermissions(interaction)) {
      return await interaction.editReply({
        embeds: [await createEmbed.embed(PERMISSION_ERROR_MESSAGE, Colors.Red)],
      });
    }

    const subcommand = interaction.options.getSubcommand();
    let playerTag = interaction.options.getString("valorant-tag");
    const matchIdString = interaction.options.getString("match_id");
    const user = interaction.options.getUser("member") || interaction.user;
    const accounts = await ValorantAccount.find({ discordId: user.id });
    const agent = interaction.options.getString("agent");
    const skin = interaction.options.getString("skin-name");

    try {
      switch (subcommand) {
        case "link":
          await response(interaction, `${emojis.loading} Fetching User...`);
          await linkCommand(interaction, user, playerTag);
          break;
        case "my-account":
          await response(interaction, `${emojis.loading} Fetching User...`);
          await myAccountCommand(interaction, accounts, playerTag);
          break;
        case "last-match":
          await response(
            interaction,
            `${emojis.loading} Fetching last match...`
          );
          await lastMatchCommand(interaction, accounts, playerTag);
          break;
        case "view-match":
          await response(interaction, `${emojis.loading} Fetching match...`);
          await viewMatchCommand(interaction, matchIdString);
          break;
        case "view-carrier":
          await response(interaction, `${emojis.loading} Fetching carrier...`);
          await viewCarrierCommand(interaction, accounts, playerTag);
          break;
        case "view-shop":
          await response(interaction, `${emojis.loading} Fetching shop...`);
          await response(interaction, `${emojis.info} Comming soon (maybe)...`);
          break;
        case "unlink":
          await response(interaction, `${emojis.loading} Fetching User...`);
          await unLinkCommand(interaction, user);
          break;
        case "view-lastnews":
          await response(interaction, `${emojis.loading} Fetching news...`);
          await response(interaction, `${emojis.info} Comming soon (maybe)...`);
          //await lastNewsCommand(interaction);
          break;
        case "view-agent":
          await response(interaction, `${emojis.loading} Fetching infos...`);
          await getAgentInfosCommand(interaction, agent);
          break;
        case "view-skins":
          await response(interaction, `${emojis.loading} Fetching infos...`);
          await getSkinInfosCommand(interaction, skin);
          break;
      }
    } catch (error) {
      handleError(interaction, error);
    }
  },
};

// Helper functions
const checkPermissions = (interaction) => {
  const user = interaction.options.getUser("member") || interaction.user;
  return (
    user.id === interaction.user.id ||
    interaction.member.permissions.has(PermissionFlagsBits.Administrator)
  );
};

const validateValorantTag = (tag) => tag.includes("#");

const handleError = async (interaction, error) => {
  let errorMessage = `${emojis.error}`;
  if (error.response && error.response.data) {
    const apiError = error.response.data.message || error.response.data.details;
    errorMessage += ` ${apiError}`;
  } else {
    errorMessage += ` ${error.message}`;
  }
  console.error(error);
  await interaction.editReply({
    embeds: [await createEmbed.embed(errorMessage, Colors.Red)],
  });
};

async function response(interaction, message) {
  await interaction.editReply({
    embeds: [await createEmbed.embed(message, Colors.Orange)],
  });
}

async function fetchValorantAccountDetails(playerTag) {
  const [name, tag] = playerTag.replaceAll(" ", "").split("#");
  const accountResponse = await valorantAPI.getAccount({ name, tag });

  console.log(accountResponse);

  if (!accountResponse || accountResponse.status !== 200) {
    throw new Error(`The player ${playerTag} does not exist!`);
  }

  return accountResponse;
}

async function updateLinkedAccount(user, valorantData) {
  await ValorantAccount.deleteMany({ discordId: user.id });
  await ValorantAccount.create({
    username: user.username,
    discordId: user.id,
    valorantAccount: valorantData.puuid,
  });

  const mmrResponse = await valorantAPI.getMMRByPUUID({
    version: "v1",
    region: valorantData.region,
    puuid: valorantData.puuid,
  });

  if (!mmrResponse || mmrResponse.status !== 200) {
    throw new Error(
      `Could not fetch MMR details for ${valorantData.name}#${valorantData.tag}`
    );
  }

  return mmrResponse.data;
}

async function createLinkEmbed(
  user,
  valorantData,
  mmrData,
  interactionUser,
  linked = false
) {
  const isSelf = user.id ? user.id === interactionUser.id : false;
  const image =
    mmrData.images?.small ||
    "https://static.wikia.nocookie.net/valorant/images/b/b2/TX_CompetitiveTier_Large_0.png/revision/latest?cb=20200623203757";
  const embed = new EmbedBuilder()
    .setThumbnail(image)
    .setDescription(
      `${
        linked
          ? `${isSelf === true ? emojis.success : emojis.info} ${
              isSelf === true ? `Your are linked!` : `${user} are linked!`
            }`
          : `${isSelf === true ? emojis.success : emojis.info} ${
              isSelf === true
                ? "Successfully linked!"
                : `Successfully force-linked to ${user}!`
            }`
      }` +
        `\n> Account ${emojis.arrow} \`${valorantData.name}#${valorantData.tag}\`` +
        `\n> Region ${emojis.arrow} \`${valorantData.region}\`` +
        `\n> Account level ${emojis.arrow} \`${valorantData.account_level}\``
    )
    .setImage(valorantData.card.wide || "")
    .setColor(linked === false ? Colors.Green : Colors.Purple);

  return embed;
}

async function linkCommand(interaction, user, playerTag) {
  // Validate tag format
  if (!validateValorantTag(playerTag)) {
    throw new Error("You have entered an invalid Valorant username and tag!");
  }

  // Fetch and link account details
  const valorant = await fetchValorantAccountDetails(playerTag);
  const valorantData = valorant.data;
  const mmrData = await updateLinkedAccount(user, valorantData);

  // Create and send the embed
  const embed = createLinkEmbed(
    user,
    valorantData,
    mmrData,
    interaction.user,
    false
  );
  await interaction.editReply({ embeds: [await embed] });
}

async function unLinkCommand(interaction, user) {
  await ValorantAccount.deleteMany({ discordId: user.id });
  const message = `${emojis.success} Valorant account unlinked successfully.`;
  await interaction.editReply({
    embeds: [await createEmbed.embed(message, Colors.Green)],
  });
}

async function viewMatchCommand(interaction, matchIdString) {
  if (!matchIdString) {
    throw new Error("Match ID must be provided to view a match.");
  }
  const MatchUtil = new MatchEmbed(interaction);
  await MatchUtil.setMatchId(matchIdString);
  await MatchUtil.generate();
}

async function getPuuid(accounts, playerTag) {
  let puuid;
  let region;
  let declared = false;

  if (playerTag && playerTag !== undefined) {
    const player = await fetchValorantAccountDetails(playerTag);
    puuid = player.data.puuid;
    region = player.data.region;
    declared = true;
  } else {
    puuid = accounts[0].valorantAccount;
    region = accounts[0]?.region || "eu";
  }

  if (accounts.length === 0 && !declared) {
    throw new Error(
      `No Valorant account linked.\nUse the ${commandId} \`valorant-tag: YourValorantUserName#YourValorantTag\` to connect an account.`
    );
  }
  return { puuid: puuid, region: region };
}

async function myAccountCommand(interaction, accounts, playerTag) {
  const { puuid, region } = await getPuuid(accounts, playerTag);
  const valorant = new Valorant(interaction, puuid);
  await valorant.getValorantAccountInfos();
}

async function lastMatchCommand(interaction, accounts, playerTag) {
  const { puuid, region } = await getPuuid(accounts, playerTag);
  const MatchUtil = new MatchEmbed(interaction, puuid, region);
  await MatchUtil.getLastMatch();
  await MatchUtil.generate();
}

async function viewCarrierCommand(interaction, accounts, playerTag) {
  const { puuid, region } = await getPuuid(accounts, playerTag);
  const valorant = new Valorant(interaction, puuid);
  await valorant.displayLast10Matches();
}

async function lastNewsCommand(interaction) {
  try {
    const news = await getLatestNews();
    if (news.length > 0) {
      const latestNews = news[0];
      await interaction.editReply({
        embeds: [
          {
            title: latestNews.title,
            url: latestNews.link,
            description: latestNews.summary,
            image: {
              url: latestNews.image,
            },
          },
        ],
      });
    } else {
      await interaction.editReply("Aucun article récent trouvé.");
    }
  } catch (error) {
    console.error(error);
    await interaction.editReply("Erreur lors de la récupération des articles.");
  }
}

async function getAgentInfosCommand(interaction, agent) {
  await findAnAgent.getAgentOrAbilityInfo(interaction, agent);
}

async function getSkinInfosCommand(interaction, skin) {
  await findASkin.getSkinInfo(interaction, skin);
}
