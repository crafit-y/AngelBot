const { PermissionFlagsBits } = require("discord.js");
const { CensoredLink } = require("../../functions/all/CensoredLink");
const { AntiSpam } = require("../../functions/all/AntiSpam");
const adminPermission = [PermissionFlagsBits.Administrator];
const permissions = [PermissionFlagsBits.ManageMessages];

module.exports = {
  name: "messageCreate",
  once: false,
  async execute(client, message) {
    const user = message.author;
    if (!message.guild || user.bot) return;

    const member = await message.guild.members.cache.get(user.id);
    const memberPermissions =
      (await member.permissions.has(permissions)) ||
      (await member.permissions.has(adminPermission));
    const memberRoles = await member.roles.cache.get("1202769654733471754");

    if (!memberRoles) return;
    if ((!memberPermissions && memberRoles) || !memberRoles) return;

    CensoredLink.findAndReplace(client, message);

    AntiSpam.check(client, message);
  },
};
