const { createEmbed } = require("./Embeds");
const { Webhook } = require("./WebHooks");
const { Colors } = require("discord.js");
const emojis = require("../../utils/emojis.json");
const IDS = require("../../utils/ids.json");
const { Sanction } = require("../moderator/sanctions");

const config = {
  spamThreshold: 5, // Nombre de messages maximum autorisé en période de temps
  spamInterval: 10000, // Intervalle de temps en millisecondes
  muteTime: 60, // Durée du mute en secondes (ici, 1 minute)
};

const spamMap = new Map();

async function deleteRecentMessages(channel, userId) {
  const messagesToDelete = await channel.messages.fetch({ limit: 5 });
  const userMessages = messagesToDelete.filter(
    (msg) => msg.author.id === userId
  );
  if (userMessages.size > 0) {
    await channel.bulkDelete(userMessages);
  }
}

const AntiSpam = {
  async check(client, message) {
    const now = Date.now();
    const { author, guild, channel } = message;
    const userId = author.id;

    const userData = spamMap.get(userId) || { count: 0, lastMessage: 0 };
    const diff = now - userData.lastMessage;

    if (diff < config.spamInterval) {
      userData.count++;
      if (userData.count >= config.spamThreshold) {
        const member = guild.members.cache.get(userId);
        if (member) {
          //member.timeout(5 * 60 * 1000, "They deserved it");
          const sanctionResult = new Sanction(
            client.user,
            member,
            "timeout",
            "AUTO-MOD",
            "Spam",
            guild,
            config.muteTime
          );
          await sanctionResult.perform();
          if (typeof sanctionResult === "string") {
            message.channel.send({
              embeds: [await createEmbed.embed(sanctionResult, Colors.Red)],
            });
            throw new Error(sanctionResult);
          }
          await sanctionResult.sendEmbed(message.channel);
          await deleteRecentMessages(channel, userId);
          await Webhook.send(
            guild.channels.cache.get(IDS.CHANNELS.LOG),
            "Auto-Moderation",
            client.user.displayAvatarURL(),
            null,
            [
              (
                await createEmbed.embed(
                  `${member} has spam in ${message.channel}\n> ${
                    emojis.arrow
                  } Timed out for \`${sanctionResult.formatTime(
                    config.muteTime
                  )}\``,
                  Colors.Purple
                )
              )
                .setAuthor({
                  name: `Spaming - ${member.user.displayName} (@${member.user.username})`,
                  iconURL: member.user.displayAvatarURL(),
                })
                .setFooter({ text: `${guild.name}`, iconURL: guild.iconURL() })
                .setTimestamp(),
            ]
          );
        }
      }
    } else {
      userData.count = 1;
    }

    userData.lastMessage = now;
    spamMap.set(userId, userData);
  },
};

module.exports = { AntiSpam };
