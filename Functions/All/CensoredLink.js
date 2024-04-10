const { createEmbed } = require("../../functions/all/Embeds");
const { Webhook } = require("../../functions/all/WebHooks");
const { URL } = require("url");
const { Colors } = require("discord.js");
const emojis = require("../../utils/emojis.json");
const IDS = require("../../utils/ids.json");

const domainWhitelist = new Set(["youtube.com", "youtu.be", "tenor.com"]);
const specialChars =
  "!@#$%^&*()_+{}[]:\";'?><,./\\|~`ÀÁÂÆÇÈÉÊËÌÍÎÏÑÒÓÔŒÙÚÛÜÝŸæçìíîïñòóôœùúûüýÿß·’“”«»•–—±×÷²³€†‡";
const linkRegex =
  /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})|(discord\.gg\/[^\s]+)|(gg\/[^\s]+)/g;

const CensoredLink = {
  async findAndReplace(client, message) {
    try {
      const guild = message.guild;
      const user = message.author;

      let content = message.content;
      if (content.match(linkRegex)) {
        let domainOrigin;

        content = content.replace(linkRegex, (match) => {
          const { domain, crypted } = extractDomain(match);
          domainOrigin = domain;
          return isDomainAllowed(domain)
            ? match
            : `\`${crypted}\` *(censored link)*`;
        });

        if (content !== message.content) {
          const embed = await createEmbed.embed(
            `${emojis.error} Your [message](${message.url}) has a link, and can't be sent !`,
            Colors.Red
          );

          await Webhook.send(
            message.channel,
            user.displayName,
            user.displayAvatarURL(),
            content,
            null,
            message.attachments.map((attachment) => attachment.url)
          );
          await message.reply({ embeds: [embed], ephemeral: true });
          await message.delete();

          await Webhook.send(
            guild.channels.cache.get(IDS.CHANNELS.LOG),
            "Auto-Moderation",
            client.user.displayAvatarURL(),
            null,
            [
              (
                await createEmbed.embed(
                  `${user} has send a link in ${message.channel}\n> ${emojis.arrow} Link dommain \`${domainOrigin}\``,
                  Colors.Orange
                )
              )
                .setAuthor({
                  name: `Lien - ${user.displayName} (@${user.username})`,
                  iconURL: user.displayAvatarURL(),
                })
                .setFooter({ text: `${guild.name}`, iconURL: guild.iconURL() })
                .setTimestamp(),
            ]
          );
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      throw error;
    }
  },
};

function extractDomain(url) {
  try {
    let domain;
    let crypted;

    const discordGGRegex =
      /(discord\.(gg|io|me|li)\/.+|discordapp\.com\/invite\/.+)/i;
    const match = url.match(discordGGRegex);

    if (match) {
      domain = "discord.gg";
      crypted = domain + "/" + generateRandomSpecialChars(15);
    } else {
      const myURL = new URL(url);
      domain = myURL.hostname.replace(/^www\./, "");
      crypted = domain;

      if (myURL.pathname !== "/") {
        const randomString = generateRandomSpecialChars(myURL.pathname.length);
        crypted += "/" + randomString;
      }
    }

    return { domain, crypted };
  } catch (error) {
    console.error("Error extracting domain:", error);
    return { domain: "Unknown", crypted: "Unknown" };
  }
}

function generateRandomSpecialChars(length) {
  let result = "";
  const charsLength = specialChars.length;
  for (let i = 0; i < length; i++) {
    result += specialChars.charAt(Math.floor(Math.random() * charsLength));
  }
  return result;
}

function isDomainAllowed(domain) {
  return domainWhitelist.has(domain);
}

module.exports = { CensoredLink };
