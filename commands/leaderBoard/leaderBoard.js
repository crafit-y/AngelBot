const { ApplicationCommandOptionType, Colors, AttachmentBuilder } = require('discord.js');
const { getTheTeamOfTheUser } = require('../../functions/party/getTheTeamOfTheUser');
const { getAllTheTeam } = require('../../functions/party/getAllTheTeam');
const { createEmbed } = require('../../functions/all/Embeds.js');
const { liveManager } = require('../../functions/fs/LiveManager.js');
const { partyManager } = require('../../functions/fs/PartyManager.js');
const { leaderBoard } = require('../../functions/fs/leaderBoard.js');

const emojis = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');

module.exports = {
  name: 'leaderboard',
  description: 'leaderboard command',
  permissions: [],
  options: [{
    name: 'get_user',
    description: 'To find the user placement',
    type: ApplicationCommandOptionType.Subcommand,
    options: [{
      name: 'user',
      description: 'Select the user to check your team',
      type: ApplicationCommandOptionType.User,
      required: true,
    },]
  },
  {
    name: 'get_leaderboard',
    description: 'Give the leaderboard',
    type: ApplicationCommandOptionType.Subcommand,
  }
  ],
  async run(client, interaction) {
    const action = interaction.options.getSubcommand();
    const member = interaction.options.getMember('user');
    const memberId = member ? member.id : null;
    const isOnLive = await liveManager.getStatus();
    const party = await partyManager.getStatus();
    const allTeam = await getAllTheTeam("all");
    await interaction.deferReply();

    switch (action.toLowerCase()) {
      case 'get_user':
        await leaderBoard.createUser(memberId);
        const stats = await leaderBoard.getUserStats(memberId);
        const position = await leaderBoard.getUserPosition(memberId);
        const isOnLiveTeam = allTeam.includes(`${memberId}`);
        const winLossRatio = stats.losses !== 0 ? stats.wins / stats.losses : stats.wins;
        const array = [];
        array.push(`### ℹ️ Informations about ${member}:`);
        array.push(`*Wins ➔ \`${stats.wins ? stats.wins : "0"}\` | Looses ➔ \`${stats.losses ? stats.losses : "0"}\` | Games played ➔ \`${stats.gamesPlayed ? stats.gamesPlayed : "0"}\`*`)
        array.push(`*Ratio ➔ \`${winLossRatio.toString().substring(0, 4)}\`*`)
        array.push(`### Party:`)
        array.push(`> Position in leaderboard ➔ \`#${position !== -1 ? position : "<Not found>"}\``)
        array.push(`> Curently in the team ➔ ${await getTheTeamOfTheUser(member) != null ? `**Team${await getTheTeamOfTheUser(member)}**` : "*Not in any teams*"}`)
        array.push(`> Curently on live? ➔ ${party && isOnLive && isOnLiveTeam ? "On live 🟢" : "Not on live 🔴"}`)

        interaction.editReply({
          embeds: [(await createEmbed.embed(array.join("\n"), Colors.Yellow))],
        })
        break;

      case 'get_leaderboard':
        try {
          const topUsers = await leaderBoard.generateLeaderboard();
          const embedArray = [];
          embedArray.push(`# ${emojis.leaderboard} Leaderboard`);

          for (const [index, userData] of topUsers.sortedUsers.entries()) {
            const userId = userData.userId;
            const position = index + 1;
            let user = await client.users.fetch(userId);
            let emoji = `\`#${position}\``;
            if (position <= 3) {
              if (position === 1) emoji = emojis.top1;
              else if (position === 2) emoji = emojis.top2;
              else if (position === 3) emoji = emojis.top3;
            }
            const userString = `${emoji} - ${user} (\`${userData.wins} wins\`)`;
            embedArray.push(userString);
          }

          const embed = await createEmbed.embed(embedArray.join("\n"), Colors.Yellow);
          interaction.editReply({
            embeds: [embed],
          });
        } catch (error) {
          console.error('Error getting top win users:', error);
          interaction.editReply({
            content: 'Error getting top win users.'
          });
        }
        break;
    }
  }
};

async function fetchAndConvertAvatar(avatarURL) {
  try {
    const response = await fetch(avatarURL);
    if (!response.ok) {
      throw new Error(`Failed to fetch avatar. Status: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return await sharp(buffer).jpeg().toBuffer();
  } catch (error) {
    throw new Error(`Error fetching or converting avatar: ${error.message}`);
  }
}