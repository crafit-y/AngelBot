// Utilisez la déstructuration pour importer seulement ce dont vous avez besoin, réduisant ainsi la charge mémoire.
const { EmbedBuilder, Colors } = require("discord.js");
const { error } = require("../../utils/emojis.json");

class Sanction {
  constructor(mod, member, sanction, prefix, reason, guild, duration) {
    // Simplification de la chaîne de raison pour la rendre plus lisible
    this.mod = mod;
    this.member = member;
    this.sanction = sanction;
    this.reason = reason;
    this.formattedReason = `${mod.displayName} (@${
      mod.username
    }) | ${prefix} - ${this.formatSanctionString(sanction)} | ${reason}`;
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

  formatSanctionString(string) {
    const formatted = string.match(/^un/) ? `Un-${string.slice(2)}` : string;
    return (
      formatted.charAt(0).toUpperCase() +
      formatted
        .slice(1)
        .replace(/(ban|unban)$/, "$1ned")
        .replace(/kick$/, "ked")
    );
  }

  async perform() {
    const { member, formattedReason, sanction, guild, duration } = this; // Déstructuration pour simplifier
    try {
      switch (sanction) {
        case "timeout":
          await member.timeout(
            duration * 1000,
            formattedReason + " ➔ Timed-out for " + this.formatTime(duration)
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
          await member.kick(`${formattedReason} ➔ Kicked`);
          return true;
        case "ban":
          if (!member.bannable)
            return `${error} The member ${member} was not bannable with my current permissions!`;
          await guild.bans.create(member, {
            deleteMessageDays: 7,
            reason: `${formattedReason} ➔ Banned for a life`,
          });
          return true;
        case "unban":
          await guild.bans.remove(member);
          return true;
        default:
          throw new Error(`Sanction type "${sanction}" is not supported.`);
      }
    } catch (err) {
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
            } has been **${
              sanction != "timeout" && sanction != "untimeout"
                ? this.formatSanctionString(sanction)
                : sanction != "untimeout"
                ? "Timed-out"
                : "Un-timed-out"
            }!**\n${actionDescription.join("\n")}`
          )
          .setColor(Colors.Purple)
          .setAuthor({
            name: `Sanction ➔ ${this.formatSanctionString(sanction)
              .replace("ned", "")
              .replace("ed", "")}`,
            iconURL: guild.iconURL(),
          }),
      ],
    });
  }
}

module.exports = { Sanction };
