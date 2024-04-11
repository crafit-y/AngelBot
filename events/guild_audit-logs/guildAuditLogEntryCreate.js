const { AuditLogEvent, Colors, EmbedBuilder } = require('discord.js');
const { createEmbed } = require('../../functions/all/Embeds.js');
const { Webhook } = require('../../functions/all/WebHooks');
const emojis = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');

module.exports = {
  name: "guildAuditLogEntryCreate",
  once: false,
  async execute(client, auditLog) {
    try {
      const { action, executor, target, reason } = auditLog;

      if (!executor || !target) return;

      const actionInfo = {
        [AuditLogEvent.MemberKick]: { name: 'Kick', description: 'was kicked from the server!', extra: `> **Reason:**\n\`${reason ?? "Not defined"}\`` },
        [AuditLogEvent.MemberBanAdd]: { name: 'Ban', description: 'was banned from the server!', extra: `> **Reason:**\n\`${reason ?? "Not defined"}\`` },
        [AuditLogEvent.MemberBanRemove]: { name: 'Un-ban', description: 'was unbanned from the server!' },
      };

      const actionDetails = actionInfo[action];

      if (!actionDetails) return;

      const { name, description, extra } = actionDetails;
      const guild = client.guilds.cache.get(IDS.OTHER_IDS.GUILD);
      const logChannel = guild.channels.cache.get(IDS.CHANNELS.LOG);

      const author = `${name} ${emojis.arrow} ${target.displayName} (@${target.username})`;
      const message = `${target} ${description}`;


      const embed = new EmbedBuilder()
        .setColor(Colors.Purple)
        .setDescription(`${message}${extra ? `\n${extra}` : ""}`)
        .setAuthor({ name: author, iconURL: target.displayAvatarURL() })
        .setFooter({ text: `${guild.name}`, iconURL: guild.iconURL() })
        .setTimestamp();

      await Webhook.send(logChannel, "Auto-Mod", client.user.displayAvatarURL(), null, [embed]);

    } catch (error) {
      console.error(error);
    }
  }
};
