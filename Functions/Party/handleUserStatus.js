const { Colors } = require('discord.js');
const { createEmbed } = require('../All/Embeds.js');
const EMOJIS = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');
const { getTheTeamOfTheUser } = require('../../Functions/Party/getTheTeamOfTheUser.js');
const { partyManager } = require('../Fs/PartyManager.js');
const { liveManager } = require('../Fs/LiveManager.js');

async function handleUserStatus(client, member, action) {
  try {
    const guild = client.guilds.cache.get(IDS.OTHER_IDS.GUILD);
    const logChannel = guild.channels.cache.get(IDS.CHANNELS.LOG);
    const isOnLive = await liveManager.getStatus();
    const party = await partyManager.getStatus();
    const memberGuild = await guild.members.fetch(member.id);
    const memberTeam = await getTheTeamOfTheUser(memberGuild);

    if (isOnLive && party) {
      let channel;
      if (memberTeam === "1") {
        channel = guild.channels.cache.get(IDS.CHANNELS.TEAM1);
      } else if (memberTeam === "2") {
        channel = guild.channels.cache.get(IDS.CHANNELS.TEAM2);
      } else if (memberTeam === "0" && action === 'reconnect') {
        logChannel.send({
          embeds: [await createEmbed.log(client, `### ${EMOJIS.sagePeek} | LOGS - Systeme\n> User cannot be moved because the team is not clearly defined > ${member}`, Colors.Red)]
        });
      }
      if (channel && action === 'reconnect') {
        await member.voice.setChannel(channel);
        logChannel.send({
          embeds: [await createEmbed.log(client, `### ${EMOJIS.sagePeek} | LOGS - Systeme\n> User moved due to reconnection > ${member}\n> Channel > ${channel}`)]
        });
      } else if (channel && action === 'disconnect') {
        logChannel.send({
          embeds: [await createEmbed.log(client, `### ${EMOJIS.sagePeek} | LOGS - Systeme\n> User left on party > ${member}\n> Team > Team${memberTeam}`)]
        });
      }
    }
  } catch (error) {
    console.error('Error handling user status:', error);
  }
}

module.exports = { handleUserStatus };
