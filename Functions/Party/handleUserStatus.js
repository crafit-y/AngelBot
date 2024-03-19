const { Colors } = require('discord.js');
const { createEmbed } = require('../all/Embeds.js');
const emojis = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');
const { getTheTeamOfTheUser } = require('../../functions/party/getTheTeamOfTheUser.js');
const { partyManager } = require('../fs/PartyManager.js');
const { liveManager } = require('../fs/LiveManager.js');
const { PlayASound } = require('../all/PlayASound.js');

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
          embeds: [await createEmbed.log(client, `### ${emojis.info} | LOGS - Systeme\n> User cannot be moved because the team is not clearly defined > ${member}`, Colors.Red)]
        });
        await new Promise(resolve => setTimeout(resolve, 3000)).catch(O_o => { console.log(O_o) });
        await PlayASound.anExistingFile(client).catch(err => { console.log(err) });
      }
      if (channel && action === 'reconnect') {
        await member.voice.setChannel(channel);
        logChannel.send({
          embeds: [await createEmbed.log(client, `### ${emojis.info} | LOGS - Systeme\n> User moved due to reconnection ➔ ${member}\n> Channel ➔ ${channel}`)]
        });
        await new Promise(resolve => setTimeout(resolve, 3000)).catch(O_o => { console.log(O_o) });
        await PlayASound.anExistingFile(client, "MoveAfterReconnection").catch(err => { console.log(err) });
      } else if (channel && action === 'disconnect') {
        logChannel.send({
          embeds: [await createEmbed.log(client, `### ${emojis.info} | LOGS - Systeme\n> User left on party ➔ ${member}\n> Team ➔ **Team${memberTeam}**`)]
        });
        await new Promise(resolve => setTimeout(resolve, 3000)).catch(O_o => { console.log(O_o) });
        await PlayASound.anExistingFile(client, "UserDisconnection").catch(err => { console.log(err) });
      }
    }
  } catch (error) {
    console.error('Error handling user status:', error);
    await PlayASound.anExistingFile(client).catch(err => { console.log(err) });
  }
}

module.exports = { handleUserStatus };
