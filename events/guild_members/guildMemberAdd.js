const { AttachmentBuilder } = require("discord.js");
const Welcome = require('../../functions/api/canvas-AngelBot/Welcome');
const { Normalizer } = require('../../functions/all/Normalize');
const IDS = require("../../utils/ids.json");
const sharp = require('sharp');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(client, member) {
    try {
      const { guild } = member;

      // Récupérer l'URL de l'avatar de l'utilisateur
      const avatarURL = await member.user.displayAvatarURL();

      // Télécharger et convertir l'image de l'avatar
      const imageBuffer = await fetchAndConvertAvatar(avatarURL);

      const canvas = await new Welcome()
        .setUsername(member.user.username)
        .setGuildName(Normalizer.normalizeSpecialCharacters(guild.name))
        .setAvatar(imageBuffer)
        .setMemberCount(guild.memberCount)
        .setColor("border", "#8015EA")
        .setColor("username-box", "#8015EA")
        .setColor("message-box", "#8015EA")
        .setColor("title", "#8015EA")
        .setColor("avatar", "#8015EA")
        //.setBackgroundColor("../../utils/images/background.gif")
        .toAttachment();

      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome-image.png' });
      const channel = await member.guild.channels.cache.get(IDS.CHANNELS.WELCOME);
      if (channel) {
        channel.send({ files: [attachment] });
      }
    } catch (error) {
      console.error("Error loading avatar:", error);
    }
  }
}

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

