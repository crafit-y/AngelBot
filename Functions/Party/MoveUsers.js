const { EmbedBuilder, Colors } = require('discord.js');
const { createEmbed } = require('../All/Embeds');
const emojis = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');

async function moveUsersToTheVoiceChannel(client, interaction, users, channelId, team) {
  try {
    const guild = client.guilds.cache.get(IDS.OTHER_IDS.GUILD);
    const channel = guild.channels.cache.get(`${channelId}`);
    let actions = [];

    for (const userId of users) {

      const member = await guild.members.fetch(`${userId}`);

      if (member.voice.channel !== null) {
        await member.voice.setChannel(channel);
        actions.push(`${emojis.success} - User moved ➔ ${member}`);
      } else {
        actions.push(`${emojis.error} - User not connected on a voice channel ➔ ${member}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100)).catch(O_o => { console.log(O_o) });
    }

    guild.channels.cache.get(IDS.CHANNELS.LOG).send({ embeds: [await createEmbed.log(interaction.member, `### ${emojis.info} | LOGS - Team${team} is moving to > ${channel}\n> ${actions.join("\n> ")}`)] });

  } catch (error) {
    console.error('Error moving users to voice channel:', error);
  }
}


module.exports = { moveUsersToTheVoiceChannel };
