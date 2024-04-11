const { EmbedBuilder, Colors, AttachmentBuilder } = require("discord.js");
const path = require("path");

const ValorantAPIClient = require("../api/valorant-api");
const valorantAPI = new ValorantAPIClient("");

const { createEmbed } = require("../all/Embeds");
const assets = require("../../utils/valorant/assets.json");
const emojis = require("../../utils/emojis.json");

const commandId = `</valorant view-match:${process.env.VALORANT_COMMAND_ID}>`;
const commandViewMatch = `</valorant view-match:${process.env.VALORANT_COMMAND_ID}>`;

async function CarrierStringGenerator(matchsMmrData, puuid) {
  let carrierStr = [];
  let wins = 0;
  let totalMatches = 0;
  for (let index = 0; index < matchsMmrData.length && index <= 9; index++) {
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
      `## ${emojis.info} Fetching User carrier of \`${valorant.name}#${valorant.tag}\`...\nPlease wait.`
    );
  for (let i = 0; i < matchCount; i++) {
    embed.addFields({
      name: `Match ${i + 1}`,
      value: `${emojis.loading} Fetching match data...`,
      inline: true,
    });
  }
  return embed;
}

function winEmojis(status, draw) {
  return status
    ? status === "win"
      ? "win"
      : status === "loose"
      ? "loose"
      : draw
      ? "draw"
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

function calculateKDA(kills, deaths, assists) {
  let effectiveDeaths = deaths === 0 ? 1 : deaths;
  let kda = (kills + assists) / effectiveDeaths;
  return kda.toFixed(3);
}

function carrierMatchField(player, status, matchData, matchScore) {
  const agentEmoji =
    assets.agentEmojis[player.character]?.emoji || ":white_small_square:";

  const { kills, deaths, assists, headshots, score } = player.stats;

  const colorLetter = status === "win" ? "\u001b[32m" : "\u001b[31m"; // ANSI colors for red and blue
  const colorStats = "\u001b[33m"; // ANSI color for stats
  const separator = `\u001b[36m|`;

  const name = `${assets.rounds.status[status]}${agentEmoji} ${emojis.arrow} ${matchScore}\n${matchData.metadata.map}\n<t:${matchData.metadata.game_start}:F>\n<t:${matchData.metadata.game_start}:R>`;

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
    )}${separator}${formatStatLine(
      colorLetter,
      "A",
      assists
    )}${separator}${formatStatLine(colorLetter, "CS", score)}\n` +
    `${colorStats}${kills}${separator}${colorStats}${deaths}${separator}${colorStats}${assists}${separator}${colorStats}${score}` +
    "```" +
    `\`\`\`${matchData.metadata.matchid}\`\`\``;
  return { nameStr: name, valueStr: value };
}

async function createAccountEmbed(valorant, matchsMmrData) {
  const puuid = valorant.puuid;
  let userMmr = await valorantAPI.getMMRByPUUID({
    version: "v2",
    region: valorant.region,
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

  const rankKey = rank ? rank.replaceAll(" ", "") : "";
  let rankEmoji =
    rankKey && assets.ranks[rankKey]
      ? assets.ranks[rankKey][rankKey != "Radiant" ? String(level) : 1]?.emoji
      : assets.ranks.Unrated[1].emoji;
  rankEmoji =
    highestRank?.patched_tier === "Radiant"
      ? assets.ranks.Radiant[1].emoji
      : rankEmoji;

  const wideBanner =
    valorant.card?.wide ||
    "https://static.wikia.nocookie.net/valorant/images/f/f3/Code_Red_Card_Wide.png/revision/latest?cb=20230711192605";

  const HRStr =
    rankEmoji != assets.ranks.Unrated[1].emoji
      ? `${rankEmoji} ${highestRank?.patched_tier}\n\`\`\`ansi\n\u001b[33m${
          highestRank?.season
            ? highestRank?.season
                .replaceAll("e", "Episode ")
                .replaceAll("a", "\n- Act ")
            : "No data"
        }\`\`\``
      : `${rankEmoji} ${highestRank?.patched_tier}`;

  const match = await valorantAPI.getMatch(matchsMmrData[0]?.match_id);
  const matchData = match?.data;
  const { red = {}, blue = {} } = matchData.teams || {};
  const playersData = matchData?.players;
  const player = playersData?.all_players?.find((p) => p.puuid === puuid);

  let status = null;
  let playerTeam = player?.team === "Blue" ? "blue" : "red";
  let opponentTeam = player?.team === "Blue" ? "red" : "blue";
  let matchScore;

  if (player) {
    status = matchData?.teams[playerTeam]?.has_won ? "win" : "loose";

    const playerTeamScore = matchData?.teams[playerTeam]?.rounds_won;
    const opponentTeamScore = matchData?.teams[opponentTeam]?.rounds_won;

    matchScore = `${playerTeamScore} - ${opponentTeamScore}`;
  }

  const draw = red.has_won === false && blue.has_won === false;
  status = winEmojis(status, draw);

  const agentEmoji =
    assets.agentEmojis[player?.character]?.emoji || ":white_small_square:";

  const RRchange = matchsMmrData[0]
    ? `${assets.rounds.status[status]}${agentEmoji} ${emojis.arrow} ${matchScore}\n` +
      //`${matchsMmrData[0]?.map?.name || "No data"}\n` +
      `${
        matchsMmrData[0] ? `<t:${matchsMmrData[0]?.date_raw}:R>` : "No data"
      }\n` +
      `\`\`\`ansi\n${
        mmrChange >= 0 ? `\u001b[32m+` : `\u001b[31m`
      }${mmrChange}RR\`\`\``
    : "No data";

  let embed = new EmbedBuilder()
    .setThumbnail(image)
    .setDescription(
      `## ${emojis.info} Fetched User \`${valorant.name}#${valorant.tag}\`` +
        `\n> Region ${emojis.arrow} \`${valorant.region}\`` +
        `\n> Account level ${emojis.arrow} \`${valorant.account_level}\``
    )
    .addFields([
      {
        name: `Highest Rank`,
        value: HRStr,
        inline: true,
      },
      {
        name: `Last MRR game`,
        value: RRchange,
        inline: true,
      },
      {
        name: `\u200B`,
        value: `\u200B`,
        inline: true,
      },
      {
        name: `Carrier`,
        value: `${emojis.loading} Loading MMR data...`,
        inline: true,
      },
      {
        name: `\u200B`,
        value: `\u200B`,
        inline: true,
      },
      {
        name: `\u200B`,
        value: `\u200B`,
        inline: true,
      },
    ])
    .setImage(wideBanner)
    .setColor(Colors.Purple);

  return embed;
}

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

class Valorant {
  constructor(interaction, puuid) {
    this.interaction = interaction;
    this.puuid = puuid;
    this.valorant = null;
  }

  async getValorantAccountSYSF() {
    let valorant = await valorantAPI.getAccountByPUUID({
      puuid: this.puuid,
    });

    if (!valorant || valorant.status !== 200) {
      valorant = null;
      throw new Error("Invalid response from API");
    }

    this.valorant = valorant;
  }

  async displayLast10Matches() {
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

      const matchsMmrData = matchsMmr.data.slice(0, 10); // Limitez à 10 matchs
      const embed = createInitialEmbed(valorant.data, matchsMmrData.length); // Créez l'embed initial avec les champs de chargement
      const message = await interaction.editReply({ embeds: [embed] }); // Envoyez l'embed initial

      let wins = 0;
      for (let i = 0; i < matchsMmrData.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 750));
        const match = matchsMmrData[i];
        let getMatch = await valorantAPI.getMatch(match.match_id);
        if (!getMatch || getMatch.status !== 200) {
          continue; // Si la récupération du match échoue, passez au suivant
        }

        const matchData = getMatch.data;
        const playersData = matchData.players;
        const { red = {}, blue = {} } = matchData.teams || {};
        const puuid = valorantData.puuid;
        const player = playersData.all_players.find((p) => p.puuid === puuid);
        let status = null;
        let playerTeam = player.team === "Blue" ? "blue" : "red";
        let opponentTeam = player.team === "Blue" ? "red" : "blue";
        let matchScore;

        if (player) {
          playerTeam = player.team === "Blue" ? "blue" : "red";
          opponentTeam = player.team === "Blue" ? "red" : "blue";
          status = matchData.teams[playerTeam].has_won ? "win" : "loose";

          const playerTeamScore = matchData.teams[playerTeam].rounds_won;
          const opponentTeamScore = matchData.teams[opponentTeam].rounds_won;

          matchScore = `${playerTeamScore} - ${opponentTeamScore}`;
        }

        const draw = red.has_won === false && blue.has_won === false;
        status = winEmojis(status, draw);

        if (status === "win") {
          wins++;
        }

        let name;
        let value;

        try {
          const { nameStr, valueStr } = carrierMatchField(
            player,
            status,
            matchData,
            matchScore
          );
          name = nameStr;
          value = valueStr;
        } catch (error) {
          const oldEmbed = message?.embeds[0];
          name =
            oldEmbed?.fields[i]?.name ||
            "Error occurred during match retrieval";
          value = `\`\`\`ansi\n\u001b[31mError occurred during match retrieval\`\`\``;
          console.error(error);
        }

        embed.data.fields[i].name = name;
        embed.data.fields[i].value = value;

        let winPercentage = i + 1 > 0 ? Math.round((wins / (i + 1)) * 100) : 0;
        embed.setDescription(
          `## ${emojis.info} Fetched User carrier of \`${valorant.data.name}#${valorant.data.tag}\`\nWinrate: ${winPercentage}%\n` +
            `You can use the match ID in this command\n` +
            `${commandViewMatch} \`match_id: theMatchId\``
        );
        await interaction.editReply({ embeds: [embed] }).catch();
      }
    } catch (e) {
      await handleError(interaction, e);
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

      // Crée un embed basé sur les données récupérées
      const embed = await createAccountEmbed(valorantData, matchsMmrData);
      const message = await interaction.editReply({ embeds: [embed] });

      // Calcule la chaîne de caractères du porteur et le pourcentage de victoire
      const { carrierStr, winPercentage } = await CarrierStringGenerator(
        matchsMmrData,
        valorantData.puuid
      );
      const carrierList = carrierStr || "No mmr data available";

      const carrierEmbedStr =
        carrierList === "No mmr data available"
          ? carrierList
          : `${carrierList}\n\`\`\`ansi\n\u001b[33m${winPercentage}% of winrate\`\`\``;

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
          {
            name: oldEmbed.fields[2].name,
            value: oldEmbed.fields[2].value,
            inline: oldEmbed.fields[2].inline,
          },
          {
            name: oldEmbed.fields[3].name,
            value: carrierEmbedStr,
            inline: oldEmbed.fields[3].inline,
          },
          {
            name: oldEmbed.fields[4].name,
            value: oldEmbed.fields[4].value,
            inline: oldEmbed.fields[4].inline,
          },
          {
            name: oldEmbed.fields[5].name,
            value: oldEmbed.fields[5].value,
            inline: oldEmbed.fields[5].inline,
          },
        ])
        .setColor(oldEmbed.color);

      // Met à jour le message avec le nouvel embed
      await interaction.editReply({ embeds: [newEmbed] });
    } catch (e) {
      await handleError(interaction, e);
    }
  }
}

module.exports = Valorant;
