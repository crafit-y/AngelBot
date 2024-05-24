const { PermissionFlagsBits } = require("discord.js");
const { CensoredLink } = require("../../functions/all/CensoredLink");

const adminPermission = [PermissionFlagsBits.Administrator];
const permissions = [PermissionFlagsBits.ManageMessages];

module.exports = {
  name: "messageUpdate",
  once: false,
  async execute(client, message) {
    const user = message.author;
    if (!message.guild || user.bot) return;

    const member = await message.guild.members.cache.get(user.id);
    const memberPermissions =
      (await member.permissions.has(permissions)) ||
      (await member.permissions.has(adminPermission));
    if (!memberPermissions) {
      CensoredLink.findAndReplace(client, message);
    }
    return;
  },
};
