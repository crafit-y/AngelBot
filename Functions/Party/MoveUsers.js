const { GuildMember } = require('discord.js');
const emojis = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');

async function moveUsersToTheVoiceChannel(client, users, channelId, team) {
  try {
    const guild = client.guilds.cache.get(IDS.OTHER_IDS.GUILD);
    const channel = guild.channels.cache.get(channelId);
    const actions = [];

    actions.push(`\n**${emojis.teams} - Team${team} is moving to > ${channel.name}**`);

    for (const userId of users) {
      const member = await guild.members.fetch(userId);

      if (member instanceof GuildMember && member.voice.channel && userId !== IDS.OTHER_IDS.BOT) {
        await member.voice.setChannel(channel);
        actions.push(`\n> ${emojis.connection} - User moved ${emojis.arrow} ${member}`);
      } else {
        actions.push(`\n> ${emojis['connection-failed']} - User not connected on a voice channel ${emojis.arrow} ${member}`);
      }
    }

    return actions;
  } catch (error) {
    console.error('Error moving users to voice channel:', error);
    return []; // Return empty array to signify failure
  }
}

module.exports = { moveUsersToTheVoiceChannel };
