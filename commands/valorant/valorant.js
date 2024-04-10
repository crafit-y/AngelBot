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
const valorantAPI = new ValorantAPIClient("");
const MatchEmbed = require("../../functions/valorant/MatchEmbed");
const emojis = require("../../utils/emojis.json");

const PERMISSION_ERROR_MESSAGE = `${emojis.error} You don't have permission to perform this action!`;
const commandId = "</valorant link:1226146245517639801>";

// Command execution
module.exports = {
  name: "valorant",
  description: "Manage your VALORANT account linkage",
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
      name: "account",
      description: "Show your VALORANT account",
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
    {
      name: "lastmatch",
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
    {
      name: "view-match",
      description: "Unlink your VALORANT account",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "match_id",
          description: "Force un-link the member (mod only)",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "view-account",
      description: "Unlink your VALORANT account",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "valorant-tag",
          description: "Your VALORANT username with tag",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "view-shop",
      description: "Unlink your VALORANT account",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "valorant-tag",
          description: "Your VALORANT username with tag",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
  ],
  async run(client, interaction) {
    await interaction.deferReply();
    if (!checkPermissions(interaction)) {
      return await interaction.editReply({
        embeds: [await createEmbed.embed(PERMISSION_ERROR_MESSAGE, Colors.Red)],
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const playerTag = interaction.options.getString("valorant-tag");
    const matchIdString = interaction.options.getString("match_id");
    const user = interaction.options.getUser("member") || interaction.user;
    const accounts = await ValorantAccount.find({ discordId: user.id });

    try {
      switch (subcommand) {
        case "link":
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.loading} Fetching User...`,
                Colors.Orange
              ),
            ],
          });
          await linkValorantAccount(interaction, user, playerTag);
          break;
        case "account":
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.loading} Fetching User...`,
                Colors.Orange
              ),
            ],
          });
          await displayLinkedAccount(interaction, user, accounts);
          break;
        case "unlink":
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.loading} Fetching User...`,
                Colors.Orange
              ),
            ],
          });
          await unlinkValorantAccount(interaction, user);
          break;
        case "lastmatch":
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.loading} Fetching last match...`,
                Colors.Orange
              ),
            ],
          });
          await getLastMatchDetails(interaction, accounts);
          break;
        case "view-match":
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.loading} Fetching match...`,
                Colors.Orange
              ),
            ],
          });
          await viewMatchDetails(interaction, matchIdString);
          break;
        case "view-account":
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.loading} Fetching user account...`,
                Colors.Orange
              ),
            ],
          });
          await viewUserDetails(interaction, playerTag);
          break;
        case "view-shop":
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.loading} Fetching shop...`,
                Colors.Orange
              ),
            ],
          });
          break;
      }
    } catch (error) {
      await handleError(interaction, error);
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
  let errorMessage = `${emojis.error} An error occurred`;
  if (error.response && error.response.data) {
    const apiError = error.response.data.message || error.response.data.details;
    errorMessage += `: ${apiError}`;
  } else {
    errorMessage += `: ${error.message}`;
  }
  console.error(error);
  await interaction.editReply({
    embeds: [await createEmbed.embed(errorMessage, Colors.Red)],
  });
};

async function linkValorantAccount(interaction, user, playerTag) {
  // Validate tag format
  if (!validateValorantTag(playerTag)) {
    throw new Error("You have entered an invalid Valorant username and tag!");
  }

  // Fetch and link account details
  const valorantData = await fetchValorantAccountDetails(playerTag);
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

async function unlinkValorantAccount(interaction, user) {
  await ValorantAccount.deleteMany({ discordId: user.id });
  const message = `${emojis.success} Valorant account unlinked successfully.`;
  await interaction.editReply({
    embeds: [await createEmbed.embed(message, Colors.Green)],
  });
}

async function displayLinkedAccount(interaction, user, accounts) {
  if (accounts.length === 0) {
    throw new Error(
      `No Valorant account linked.\nUse the ${commandId} \`valorant-tag: YourValorantUserName#YourValorantTag\` to connect an account.`
    );
  }
  let valorant = await valorantAPI.getAccountByPUUID({
    puuid: accounts[0].valorantAccount,
  });
  if (!valorant || valorant.status !== 200) {
    valorant = null;
  }
  const valorantData = valorant.data;
  const { embed, matchsMmrData } = createAccountEmbed(valorantData);

  await interaction.editReply({ embeds: [await embed] });

  const carrierList =
    (await CarrierStringGenerator(matchsMmrData, valorantData.puuid).join(
      ""
    )) || "No mmr data available";

  embed.fields.find((field) => field.name === "Carrier").value = carrierList;

  await interaction.editReply({ embeds: [embed] });
}

async function createAccountEmbed(valorantData) {
  const puuid = valorantData.puuid;
  let userMmr = await valorantAPI.getMMRByPUUID({
    version: "v2",
    region: valorantData.region,
    puuid: puuid,
  });
  if (!userMmr || userMmr.status !== 200) {
    userMmr = null;
  }
  const userMmrData = userMmr.data;
  const image =
    userMmrData.current_data?.images?.small ||
    "https://static.wikia.nocookie.net/valorant/images/b/b2/TX_CompetitiveTier_Large_0.png/revision/latest?cb=20200623203757";
  const mmrChange = userMmrData.current_data?.mmr_change_to_last_game || 0;
  const highestRank = userMmrData?.highest_rank;
  const [rank, level] =
    highestRank?.patched_tier
      .match(/^(\D+)(\d+)$/)
      ?.slice(1)

      .map((s, i) => (i === 1 ? parseInt(s) : s)) || [];
  const rankEmoji = rank
    ? assets.ranks[rank.replaceAll(" ", "")][
        rank.replaceAll(" ", "") === "Radiant" ? 1 : level
      ].emoji
    : "";
  const wideBanner =
    valorantData.card?.wide ||
    "https://static.wikia.nocookie.net/valorant/images/f/f3/Code_Red_Card_Wide.png/revision/latest?cb=20230711192605";

  const RRchange = `\`\`\`ansi\n${
    mmrChange >= 0 ? `\u001b[32m+` : `\u001b[31m`
  }${mmrChange}RR\`\`\``;

  const HRStr = `${rankEmoji} ${
    highestRank?.patched_tier
  }\n\`\`\`ansi\n\u001b[33m${
    highestRank?.season
      ? highestRank?.season
          .replaceAll("e", "Episode ")
          .replaceAll("a", "\n- Act ")
      : "Not defined"
  }\`\`\``;

  let embed = new EmbedBuilder()
    .setThumbnail(image)
    .setDescription(
      `## ${emojis.info} Fetched User \`${valorantData.name}#${valorantData.tag}\`` +
        `\n> Region ${emojis.arrow} \`${valorantData.region}\`` +
        `\n> Account level ${emojis.arrow} \`${valorantData.account_level}\``
    )
    .addFields([
      {
        name: `Highest Rank`,
        value: HRStr,
        inline: true,
      },
      {
        name: `Last RR change`,
        value: RRchange,
        inline: true,
      },
      {
        name: `Carrier`,
        value: `${emojis.loading} Loading MMR data...`,
        inline: false,
      },
    ])
    .setImage(wideBanner)
    .setColor(Colors.Purple);

  return embed;
}

async function CarrierStringGenerator(matchsMmrData, puuid) {
  let carrierStr = [];
  for (let index = 0; index < matchsMmrData.length && index <= 10; index++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const match = matchsMmrData[index];
    const matchId = match.match_id;
    console.log(matchId);
    let getMatch = await valorantAPI.getMatch({
      match_id: matchId,
    });
    console.log(getMatch);
    if (!getMatch || getMatch.status !== 200) {
      getMatch = null;
    }
    const matchData = getMatch?.data;
    const playersData = matchData?.players;
    const { red = {}, blue = {} } = matchData?.teams || {};

    let status = null;

    const player = playersData.all_players?.find((p) => p.puuid === puuid);

    if (player) {
      const playerTeam = player?.team === "Blue" ? "blue" : "red";
      status = (await matchData?.teams[playerTeam]?.has_won) ? "win" : "lost";
    }
    console.log(status);

    const draw = (await red?.has_won) === false && blue?.has_won === false;

    carrierStr.push(
      status != null ? (status === "win" ? "W" : "L") : draw ? "D" : "?"
    );
  }
  return carrierStr;
}

async function getLastMatchDetails(interaction, accounts) {
  if (accounts.length === 0) {
    throw new Error(
      `No Valorant account linked.\nUse the ${commandId} \`valorant-tag: YourValorantUserName#YourValorantTag\` to connect an account.`
    );
  }
  const linkedAccount = accounts[0].valorantAccount;
  const MatchUtil = new MatchEmbed(interaction, linkedAccount);
  await MatchUtil.getLastMatch(linkedAccount);
  await MatchUtil.generate();
}

async function viewMatchDetails(interaction, matchIdString) {
  if (!matchIdString) {
    throw new Error("Match ID must be provided to view a match.");
  }
  const MatchUtil = new MatchEmbed(interaction);
  await MatchUtil.setMatchId(matchIdString);
  await MatchUtil.generate();
}

async function fetchValorantAccountDetails(playerTag) {
  const [name, tag] = playerTag.split("#");
  const accountResponse = await valorantAPI.getAccount({ name, tag });

  if (!accountResponse || accountResponse.status !== 200) {
    throw new Error(`The player ${playerTag} does not exist!`);
  }

  return accountResponse.data;
}

async function fetchMMRDetails(valorantData) {
  const mmrResponse = await valorantAPI.getMMRByPUUID({
    version: "v1",
    region: valorantData.region,
    puuid: valorantData.puuid,
  });

  if (!mmrResponse || mmrResponse.status !== 200) {
    throw new Error(`Could not fetch MMR details`);
  }

  return mmrResponse.data;
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

async function viewUserDetails(interaction, playerTag) {
  // Validate tag format
  if (!validateValorantTag(playerTag)) {
    throw new Error("You have entered an invalid Valorant username and tag!");
  }

  // Fetch and link account details
  const valorant = await fetchValorantAccountDetails(playerTag);

  let matchsMmr = await valorantAPI.getMMRHistoryByPUUID({
    region: valorant.region,
    puuid: valorant.puuid,
  });
  if (!matchsMmr || matchsMmr.status !== 200) {
    matchsMmr = null;
  }
  const matchsMmrData = matchsMmr.data;

  const embed = await createAccountEmbed(valorant);

  const message = await interaction.editReply({ embeds: [embed] });

  const carrierListArray = await CarrierStringGenerator(
    matchsMmrData,
    valorant.puuid
  );
  const carrierList = carrierListArray.join("") || "No mmr data available";

  const oldEmbed = message.embeds[0];
  const newEmbed = new EmbedBuilder()
    .setDescription(oldEmbed.description)
    .setImage(oldEmbed.image.url)
    .setThumbnail(oldEmbed.thumbnail.url)
    .addFields([
      {
        name: oldEmbed.fields[0].name,
        value: oldEmbed.fields[0].value,
        inline: oldEmbed.fields[0].inline,
      },
      {
        name: oldEmbed.fields[1].name,
        value: oldEmbed.fields[1].value,
        inline: oldEmbed.fields[1].inline,
      },
      {
        name: oldEmbed.fields[2].name,
        value: carrierList,
        inline: oldEmbed.fields[2].inline,
      },
    ])
    .setColor(oldEmbed.color);
  //await new Promise((resolve) => setTimeout(resolve, 30000));
  await interaction.editReply({ embeds: [newEmbed] });
}
