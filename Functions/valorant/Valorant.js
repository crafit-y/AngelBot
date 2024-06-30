const {
  EmbedBuilder,
  Colors,
  AttachmentBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const path = require("path");

const ValorantAPIClient = require("../api/valorant-api");
const valorantAPI = new ValorantAPIClient(process.env.HENRIK_API_KEY);

const { createEmbed } = require("../all/Embeds");
const assets = require("../../utils/valorant/assets.json");
const emojis = require("../../utils/emojis.json");
const { createButton } = require("../all/Buttons");
const handleError = require("../../utils/handlers/ErrorHandler");

// const commandId = `</valorant view-match:${process.env.VALORANT_COMMAND_ID}>`;
// const commandViewMatch = `</valorant view-match:${process.env.VALORANT_COMMAND_ID}>`;

async function CarrierStringGenerator(matchsMmrData, puuid) {
  let carrierStr = [];
  let wins = 0;
  let totalMatches = 0;
  for (let index = 0; index < matchsMmrData.length && index <= 4; index++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const match = matchsMmrData[index];
    const matchId = match.match_id;
    let getMatch = await valorantAPI.getMatch(matchId);
    if (!getMatch || getMatch.status !== 200) {
      getMatch = null;
    }
    const matchData = getMatch?.data;
    const playersData = matchData?.players;
    const { red = {}, blue = {} } = matchData?.teams || {};

    let status = null;

    const player = playersData?.all_players?.find((p) => p.puuid === puuid);

    if (player) {
      const playerTeam = player?.team === "Blue" ? "blue" : "red";
      status = (await matchData?.teams[playerTeam]?.has_won) ? "win" : "loose";
    }

    const draw = (await red?.has_won) === false && blue?.has_won === false;

    status = status
      ? status === "win"
        ? "win"
        : status === "loose"
        ? "loose"
        : draw
        ? "draw"
        : "undefined"
      : "undefined";

    if (status === "win" || status === "draw") {
      wins++;
    }

    totalMatches++;
    carrierStr.push(assets.rounds.status[status]);
  }

  let winPercentage =
    totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  return { carrierStr: carrierStr.join(""), winPercentage };
}

function createInitialEmbed(valorant, matchCount) {
  const embed = new EmbedBuilder()
    .setColor(Colors.Purple)
    .setDescription(
      `## ${emojis.info} Fetching User carrier of \`${valorant.name}#${valorant.tag}\`...\n${emojis.loading} Please wait...`
    );
  let fields = 0;
  for (let i = 0; i < matchCount; i++) {
    embed.addFields({
      name: `Match ${i + 1}`,
      value: `${emojis.loading} Fetching match data...`,
      inline: true,
    });
    fields++;
  }

  const additionalFields = addInlineFields(fields);
  if (additionalFields.length > 0) {
    embed.addFields(additionalFields);
  }

  return embed;
}

function winEmojis(status, draw) {
  return status
    ? draw
      ? "draw"
      : status === "win"
      ? "win"
      : status === "loose"
      ? "loose"
      : "undefined"
    : "undefined";
}

function formatStatLine(color, label, stat) {
  let formattedString = `${color}${label}`;
  const padding = stat.toString().length - label.length;

  for (let i = 0; i < padding; i++) {
    formattedString += " ";
  }

  return formattedString;
}

// function calculateKDA(kills, deaths, assists) {
//   let effectiveDeaths = deaths === 0 ? 1 : deaths;
//   let kda = (kills + assists) / effectiveDeaths;
//   return kda.toFixed(3);
// }

function carrierMatchField(player, status, matchData, matchScore) {
  const agentEmoji =
    assets.agentEmojis[player.character]?.emoji || ":white_small_square:";

  const { kills, deaths, assists, headshots, score } = player.stats;

  const colorLetter = status === "win" ? "\u001b[32m" : "\u001b[31m"; // ANSI colors for red and blue
  const colorStats = "\u001b[35m"; // ANSI color for stats
  const separator = `\u001b[36m|`;

  const name = `${assets.rounds.status[status]}${agentEmoji} ${emojis.arrow} ${matchScore}\n${matchData.metadata.map}\n<t:${matchData.metadata.game_start}:R>`;

  const value =
    // "```ansi\n" +
    // `${formatStatLine(colorLetter, "K", kills)}${separator}${formatStatLine(
    //   colorLetter,
    //   "D",
    //   deaths
    // )}${separator}${formatStatLine(
    //   colorLetter,
    //   "A",
    //   assists
    // )}${separator}${formatStatLine(colorLetter, "CS", score)}${separator}` +
    // `${formatStatLine(
    //   colorLetter,
    //   "Ratio",
    //   calculateKDA(kills, deaths, assists)
    // )}${separator}${formatStatLine(colorLetter, "HS", headshots)}\n` +
    // `${colorStats}${kills}${separator}${colorStats}${deaths}${separator}${colorStats}${assists}${separator}${colorStats}${score}${separator}` +
    // `${colorStats}${calculateKDA(
    //   kills,
    //   deaths,
    //   assists
    // )}${separator}${colorStats}${headshots}%` +
    // "```" +
    "```ansi\n" +
    `${formatStatLine(colorLetter, "K", kills)}${separator}${formatStatLine(
      colorLetter,
      "D",
      deaths
    )}${separator}${formatStatLine(colorLetter, "A", assists)}\n` +
    `${colorStats}${kills}${separator}${colorStats}${deaths}${separator}${colorStats}${assists}` +
    "```";
  //`\`\`\`${matchData.metadata.matchid}\`\`\``;

  const option = new StringSelectMenuOptionBuilder()
    .setLabel(`${matchData.metadata.map} ${emojis.arrow} ${matchScore}`)
    .setEmoji(assets.rounds.status[status])
    .setValue(matchData.metadata.matchid);
  return {
    nameStr: name,
    valueStr: value,
    option: option,
  };
}

function createProgressBar(
  value,
  total = 100,
  barSize = 15,
  emojiFilled = assets.ranks.line.blue.emoji,
  emojiEmpty = assets.ranks.line.none.emoji
) {
  // Calcul du nombre d'emojis remplis
  const filledSize = Math.round((value / total) * barSize);
  // Création de la barre de progression
  const bar =
    emojiFilled.repeat(filledSize) + emojiEmpty.repeat(barSize - filledSize);
  return bar;
}

async function createAccountEmbed(valorant, matchsMmrData) {
  const puuid = valorant.puuid;
  const region = valorant.region;

  // Function to fetch user MMR and handle errors
  async function fetchUserMMR(puuid, region) {
    try {
      const response = await valorantAPI.getMMRByPUUID({
        version: "v2",
        region: region,
        puuid: puuid,
      });
      if (!response || response.status !== 200)
        throw new Error("Failed to fetch MMR.");
      return response.data;
    } catch (error) {
      console.error("Error fetching MMR:", error);
      return null;
    }
  }

  const userMmrData = await fetchUserMMR(puuid, region);

  // const match = await valorantAPI.getMatch(matchsMmrData[0]?.match_id);
  // const matchData = match?.data;
  // const { red = {}, blue = {} } = matchData.teams || {};
  // const playersData = matchData?.players;
  // const player = playersData?.all_players?.find((p) => p.puuid === puuid);

  // let status = null;
  // let playerTeam = player?.team === "Blue" ? "blue" : "red";
  // let opponentTeam = player?.team === "Blue" ? "red" : "blue";
  // let matchScore;

  // if (player) {
  //   status = matchData?.teams[playerTeam]?.has_won ? "win" : "loose";

  //   const playerTeamScore = matchData?.teams[playerTeam]?.rounds_won;
  //   const opponentTeamScore = matchData?.teams[opponentTeam]?.rounds_won;

  //   matchScore = `${playerTeamScore} - ${opponentTeamScore}`;
  // }

  // const draw = red.has_won === false && blue.has_won === false ? true : false;
  // status = winEmojis(status, draw);

  // const agentEmoji =
  //   assets.agentEmojis[player?.character]?.emoji || ":white_small_square:";

  // Processing retrieved data and assigning defaults
  const image =
    userMmrData?.current_data?.images?.small ||
    "https://static.wikia.nocookie.net/valorant/images/b/b2/TX_CompetitiveTier_Large_0.png/revision/latest?cb=20200623203757";
  const mmrChange = userMmrData?.current_data?.mmr_change_to_last_game || 0;
  const currentMrr = userMmrData?.current_data?.ranking_in_tier || 0;
  const highestRank = userMmrData?.highest_rank;

  // Extracting rank and level using regex from highestRank
  const [rank, level] =
    highestRank?.patched_tier
      .match(/^(\D+)(\d+)$/)
      ?.slice(1)
      .map((s, i) => (i === 1 ? parseInt(s) : s)) || [];
  const rankKey = rank ? rank.replaceAll(" ", "") : "";
  const rankEmoji =
    highestRank?.patched_tier === "Radiant"
      ? assets.ranks.Radiant[1].emoji
      : assets.ranks[rankKey]?.[rankKey !== "Radiant" ? String(level) : 1]
          ?.emoji || assets.ranks.Unrated[1].emoji;

  const wideBanner =
    valorant.card?.wide ||
    "https://static.wikia.nocookie.net/valorant/images/f/f3/Code_Red_Card_Wide.png/revision/latest?cb=20230711192605";

  // Building the highest rank string
  const HRStr =
    rankEmoji != assets.ranks.Unrated[1].emoji
      ? `${rankEmoji} ${highestRank?.patched_tier}\n\`\`\`ansi\n\u001b[35m${
          highestRank?.season
            ? highestRank?.season
                .replaceAll("e", "Episode ")
                .replaceAll("a", "\n- Act ")
            : "No data"
        }\`\`\``
      : `${rankEmoji} ${highestRank?.patched_tier}`;

  // Determining the change in Ranked Rating (RR)
  const RRchange = matchsMmrData[0]
    ? `${createProgressBar(currentMrr)}` +
      `\`\`\`ansi\n` +
      `\u001b[35m${currentMrr}/100 RR ${
        mmrChange >= 0 ? `\u001b[32m` : `\u001b[31m`
      }(${mmrChange >= 0 ? `+${mmrChange}` : mmrChange} RR Last game)\`\`\``
    : userMmrData?.current_data?.games_needed_for_rating > 0
    ? `Need ${userMmrData.current_data?.games_needed_for_rating} more game${
        userMmrData.current_data?.games_needed_for_rating > 1 ? "s" : ""
      } to be ranked.`
    : "No data";

  // Creating the embed message
  let embed = new EmbedBuilder()
    .setThumbnail(image)
    .setDescription(
      `## ${emojis.info} Player \`${valorant.name}#${valorant.tag}\`` +
        `\n> Region ${emojis.arrow} \`${valorant.region}\`` +
        `\n> Account level ${emojis.arrow} \`${valorant.account_level}\``
    )
    .addFields([
      {
        name: `MRR`,
        value: RRchange,
        inline: false,
      },
      {
        name: `Highest Rank`,
        value: HRStr,
        inline: true,
      },
      {
        name: `Carrier *(Last 5 matches)*`,
        value: `${emojis.loading} Loading MMR data...`,
        inline: true,
      },
    ])
    .setImage(wideBanner)
    .setColor(Colors.Purple);

  return embed;
}

function timeout(ms, message = "Timed out") {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

function addInlineFields(fieldsCount) {
  // Cette fonction ajoute des champs vides pour faire en sorte que le nombre total de champs soit un multiple de trois.
  const fieldsArray = [];
  let missingFields = 3 - (fieldsCount % 3);
  if (fieldsCount % 3 !== 0) {
    for (let i = 0; i < missingFields; i++) {
      fieldsArray.push({ name: "\u200B", value: "\u200B", inline: true });
    }
  }
  return fieldsArray;
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const handleCarrierMatchError = async (
  interaction,
  embed,
  message,
  selectMenu,
  error,
  errorStr,
  i
) => {
  console.error(error);
  // Gérez ici le cas où le timeout est dépassé ou une autre erreur survient
  const oldEmbed = message?.embeds[0];
  const name = oldEmbed?.fields[i]?.name || `Match ${i + 1}`;
  const value = `\`\`\`ansi\n\u001b[31m${errorStr}\`\`\``;

  const option = new StringSelectMenuOptionBuilder()
    .setLabel(errorStr)
    .setEmoji(assets.rounds.status.undefined) // Assurez-vous que `assets.rounds.status.undefined` est défini
    .setValue(`${i}-error`);
  selectMenu.addOptions(option);

  embed.data.fields[i] = { name, value, inline: true };
  await interaction
    .editReply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(selectMenu)],
    })
    .catch();
};

const activeSearches = new Set();

class Valorant {
  constructor(interaction, puuid, region) {
    this.interaction = interaction;
    this.puuid = puuid;
    this.region = region || "eu";
    this.valorant = null;
  }

  async getValorantAccountSYSF() {
    let valorant = await valorantAPI.getAccountByPUUID({
      puuid: this.puuid,
    });

    if (!valorant || valorant.status !== 200) {
      valorant = null;
      console.log(this.puuid);
      handleError(interaction, "Invalid response from API");
      throw new Error("Invalid response from API");
    }

    this.valorant = valorant;
  }

  async displayLast10Matches() {
    const serverId = this.interaction.guildId;

    // Tentative de début de recherche
    const canSearch = this.startSearch(serverId);
    if (!canSearch) {
      const error = {
        message:
          "A search is already in progress on this server. Please wait until it is finished.",
        code: 1,
        type: "Throwed error",
      };
      handleError(interaction, error);
      return;
    }

    try {
      // Votre méthode de recherche
      await this._performSearch(this.interaction);
    } catch (error) {
      console.error("Error during the search:", error);
      handleError(interaction, error);
    } finally {
      // Nettoyage
      this.endSearch(serverId);
    }
  }

  startSearch(serverId) {
    if (activeSearches.has(serverId)) {
      return false;
    }
    activeSearches.add(serverId);
    return true;
  }

  endSearch(serverId) {
    activeSearches.delete(serverId);
  }

  async _performSearch() {
    await this.getValorantAccountSYSF(this.puuid);
    const { interaction, valorant } = this;

    try {
      const valorantData = valorant?.data;
      let matchsMmr = await valorantAPI.getMMRHistoryByPUUID({
        region: valorantData.region,
        puuid: valorantData.puuid,
      });

      if (!matchsMmr || matchsMmr.status !== 200) {
        throw new Error("Invalid response from API");
      }

      const matchsMmrData = matchsMmr.data.slice(0, 9); // Limitez à 10 matchs
      if (matchsMmrData.length === 0) throw new Error("No match to display");
      const embed = createInitialEmbed(valorant.data, matchsMmrData.length); // Créez l'embed initial avec les champs de chargement
      const message = await interaction.editReply({ embeds: [embed] }); // Envoyez l'embed initial
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("display-the-matchid")
        .setMinValues(1)
        .setMaxValues(1)
        .setPlaceholder("Select the match you want to display");

      const errorStr = "Error occurred during match retrieval";

      let wins = 0;
      for (const [i, match] of matchsMmrData.entries()) {
        await new Promise((resolve) =>
          setTimeout(resolve, getRandomNumber(600, 1200))
        );

        let winPercentage;

        try {
          const getMatch = await Promise.race([
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout reached")), 5000)
            ),
            valorantAPI.getMatch(match.match_id),
          ]);

          if (!getMatch || getMatch.status !== 200) {
            throw new Error("Failed to fetch match data");
          }

          const matchData = getMatch.data;
          const player = matchData.players.all_players.find(
            (p) => p.puuid === valorantData.puuid
          );

          if (!player) throw new Error("Player not found in match data");

          const playerTeam = player.team === "Blue" ? "blue" : "red";
          const opponentTeam = player.team === "Blue" ? "red" : "blue";
          const matchScore = `${matchData.teams[playerTeam].rounds_won} - ${matchData.teams[opponentTeam].rounds_won}`;
          const draw =
            !matchData.teams.red.has_won && !matchData.teams.blue.has_won;
          let status = matchData.teams[playerTeam].has_won ? "win" : "loose";
          status = winEmojis(status, draw);

          if (status === "win") wins++;

          const { nameStr, valueStr, option } = carrierMatchField(
            player,
            status,
            matchData,
            matchScore
          );

          embed.data.fields[i] = {
            name: nameStr,
            value: valueStr,
            inline: true,
          };

          selectMenu.addOptions(option);
          winPercentage = Math.round((wins / (i + 1)) * 100);
        } catch (error) {
          await handleCarrierMatchError(
            interaction,
            embed,
            message,
            selectMenu,
            error,
            errorStr,
            i
          );
          winPercentage = -999;
        }
        embed.setDescription(
          `## ${emojis.info} Player carrier of \`${valorant.data.name}#${
            valorant.data.tag
          }\`\n\`\`\`ansi\n\u001b[35mWinrate: ${
            winPercentage >= 0
              ? `${winPercentage}%`
              : "The win rate cannot be calculated!"
          }\`\`\``
        );

        await interaction
          .editReply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(selectMenu)],
          })
          .catch(() => {});
      }
    } catch (error) {
      console.error("Error handling the displayLast10Matches function:", error);
      handleError(interaction, error);
    }
  }

  async getValorantAccountInfos() {
    await this.getValorantAccountSYSF(this.puuid);

    const { interaction, valorant } = this;

    try {
      const valorantData = valorant?.data;

      // Récupère l'historique des MMR si valorant est valide
      let matchsMmr = await valorantAPI.getMMRHistoryByPUUID({
        region: valorantData.region,
        puuid: valorantData.puuid,
      });

      // Vérifie l'état de l'objet matchsMmr
      if (!matchsMmr || matchsMmr.status !== 200) {
        matchsMmr = null;
      }

      const matchsMmrData = matchsMmr.data;

      const playerActionButtons = await createButton.create([
        [
          "playeractionbutton-carrier",
          "View full carrier",
          emojis.carrier,
          ButtonStyle.Secondary,
          false,
          null,
        ],
        [
          "playeractionbutton-lastmatch",
          "Display last match",
          emojis.time,
          ButtonStyle.Secondary,
          false,
          null,
        ],
      ]);

      // Crée un embed basé sur les données récupérées
      const embed = await createAccountEmbed(valorantData, matchsMmrData);
      const message = await interaction.editReply({
        embeds: [embed],
        components: [playerActionButtons],
      });

      // Calcule la chaîne de caractères du porteur et le pourcentage de victoire
      const { carrierStr, winPercentage } = await CarrierStringGenerator(
        matchsMmrData,
        valorantData.puuid
      );
      const carrierList = carrierStr || "No mmr data available";

      const carrierEmbedStr =
        carrierList === "No mmr data available"
          ? carrierList
          : `${carrierList}\n\`\`\`ansi\n\u001b[35m${winPercentage}% of winrate\`\`\``;

      // Crée un nouveau Embed en utilisant les données de l'ancien embed et en ajoutant les nouvelles informations
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
          // {
          //   name: oldEmbed.fields[2].name,
          //   value: oldEmbed.fields[2].value,
          //   inline: oldEmbed.fields[2].inline,
          // },
          {
            name: oldEmbed.fields[2].name,
            value: carrierEmbedStr,
            inline: oldEmbed.fields[2].inline,
          },
          // {
          //   name: oldEmbed.fields[4].name,
          //   value: oldEmbed.fields[4].value,
          //   inline: oldEmbed.fields[4].inline,
          // },
          // {
          //   name: oldEmbed.fields[5].name,
          //   value: oldEmbed.fields[5].value,
          //   inline: oldEmbed.fields[5].inline,
          // },
        ])
        .setColor(oldEmbed.color);

      // Met à jour le message avec le nouvel embed
      await interaction.editReply({ embeds: [newEmbed] });
    } catch (error) {
      handleError(interaction, error);
    }
  }
}

module.exports = Valorant;
