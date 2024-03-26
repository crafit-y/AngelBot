const { PermissionFlagsBits } = require('discord.js');
const { CensoredLink } = require("../../functions/all/CensoredLink");
const { AntiSpam } = require("../../functions/all/AntiSpam");
const adminPermission = [PermissionFlagsBits.Administrator];
const permissions = [PermissionFlagsBits.ManageMessages];

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(client, message) {

    const user = message.author;
    if (!message.guild || user.bot) return;

    const member = message.guild.members.cache.get(user.id);
    if (member.permissions.has(permissions) || member.permissions.has(adminPermission)) return;

    CensoredLink.findAndReplace(client, message);

    AntiSpam.check(client, message);
  }
}
