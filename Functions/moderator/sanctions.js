// Utilisez la déstructuration pour importer seulement ce dont vous avez besoin, réduisant ainsi la charge mémoire.
const { EmbedBuilder, Colors } = require("discord.js");
const { error } = require("../../utils/emojis.json");
const emojis = require("../../utils/emojis.json");

class Sanction {
  constructor(mod, member, sanction, prefix, reason, guild, duration) {
    // Simplification de la chaîne de raison pour la rendre plus lisible
    this.mod = mod;
    this.member = member;
    this.sanction = sanction;
    this.reason = reason;
    this.formattedReason = `${mod.displayName} (@${
      mod.username
    }) | ${prefix} - ${this.formatActionString(sanction)} | ${reason}`;
    this.guild = guild;
    this.duration = duration;
  }

  // Cette méthode semble ne pas nécessiter d'être asynchrone
  checkPermissions(permission) {
    if (!this.mod.permissions.has(permission)) {
      return `${error} You don't have permission to perform this action!`;
    }
    return true;
  }

  // Méthode simplifiée pour formater le temps
  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "Invalid time";

    const units = [
      [60 * 60 * 24 * 7, "week"],
      [60 * 60 * 24, "day"],
      [60 * 60, "hour"],
      [60, "minute"],
    ];

    return units
      .reduce((acc, [unitSeconds, unitName]) => {
        const quantity = Math.floor(seconds / unitSeconds);
        seconds %= unitSeconds;
        return quantity
          ? `${acc}${quantity} ${unitName}${quantity > 1 ? "s" : ""}, `
          : acc;
      }, "")
      .replace(/,\s*$/, "");
  }

  // const formatted = string.match(/^un/) ? `Un-${string.slice(2)}` : string;
  // return (
  //   formatted.charAt(0).toUpperCase() +
  //   formatted
  //     .slice(1)
  //     .replace(/(ban|unban)$/, "$1ned")
  //     .replace(/kick$/, "ked")
  // );
  formatSanctionString(string) {
    return string
      .replaceAll(/\buntimeout\b/g, "un-timed-out")
      .replaceAll(/\btimeout\b/g, "timed-out")
      .replaceAll(/\bunban\b/g, "un-banned")
      .replaceAll(/\bban\b/g, "banned")
      .replaceAll(/\bkick\b/g, "kicked");
  }

  formatActionString(string) {
    return string
      .replaceAll(/\buntimeout\b/g, "Remove Time-out")
      .replaceAll(/\btimeout\b/g, "Apply Time-out")
      .replaceAll(/\bunban\b/g, "Unban User")
      .replaceAll(/\bban\b/g, "Ban User")
      .replaceAll(/\bkick\b/g, "Kick User");
  }

  async perform() {
    const { member, formattedReason, sanction, guild, duration, sendToUserDM } =
      this; // Déstructuration pour simplifier
    try {
      switch (sanction) {
        case "timeout":
          await member.timeout(
            duration * 1000,
            formattedReason +
              emojis.arrow +
              " Timed-out for " +
              this.formatTime(duration)
          );
          return true;
        case "untimeout":
          await member.timeout(
            1,
            formattedReason.replace(" | Not specified", "")
          );
          return true;
        case "kick":
          if (!member.kickable)
            return `${error} The member ${member} was not kickable with my current permissions!`;
          await member.kick(`${formattedReason} ${emojis.arrow} Kicked`);
          return true;
        case "ban":
          if (!member.bannable)
            return `${error} The member ${member} was not bannable with my current permissions!`;
          await guild.bans.create(member, {
            deleteMessageDays: 7,
            reason: `${formattedReason} ${emojis.arrow} Banned for a life`,
          });
          return true;
        case "unban":
          await guild.bans.remove(member);
          return true;
        default:
          throw new Error(`Sanction type "${sanction}" is not supported.`);
      }
    } catch (err) {
      console.error(err);
      return `${error} I can't perform the action ${sanction} on ${member}! Error: ${err.message}`;
    }
  }

  async sendEmbed(channel) {
    const { member, reason, guild, duration, sanction } = this;
    let actionDescription = [];
    // if (sanction === "timeout")
    //   actionDescription.push(`> **Time:** \`${formatTime(duration)}\``);
    if (sanction !== "kick" && sanction !== "unban" && sanction !== "untimeout")
      actionDescription.push(`> **Reason:** \`${reason}\``);
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `The member ${
              sanction !== "unban"
                ? `${member} \`(@${member.user.username})\``
                : `<@${member}>`
            } has been **${this.formatSanctionString(
              sanction
            )}!**\n${actionDescription.join("\n")}`
          )
          .setColor(Colors.Purple)
          .setAuthor({
            name: `Sanction ${emojis.arrow} ${this.formatActionString(
              sanction
            )}`,
            iconURL: guild.iconURL(),
          }),
      ],
    });
  }
}

module.exports = { Sanction };
