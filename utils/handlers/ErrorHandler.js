const { EmbedBuilder } = require("discord.js");
const { inspect } = require("util");

/**
 * Function to handle errors and send a response to the Discord channel
 * @param {Object} interaction - The Discord interaction object
 * @param {Error} error - The error object
 */
async function handleError(interaction, error = "error") {
  // Extracting the error details
  const errorMessage = error.message || "Unknown error occurred";
  const errorStack = error.stack
    ? inspect(error.stack)
    : "No stack trace available";
  const errorLine = error.stack
    ? error.stack.split("\n")[1].trim()
    : "No line number available";

  // Creating an embed message for better formatting
  const errorEmbed = new EmbedBuilder()
    .setTitle("An Error Occurred")
    .setColor("#FF0000")
    .addFields(
      { name: "Error Message", value: `\`\`\`${errorMessage}\`\`\`` },
      { name: "Line", value: `\`\`\`${errorLine}\`\`\`` },
      { name: "Stack Trace", value: `\`\`\`${errorStack}\`\`\`` }
    )
    .setTimestamp();

  // Sequentially try each method of replying
  try {
    if (interaction.isRepliable()) {
      if (interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed] });
        return;
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
      }
    }
  } catch (err) {
    console.error("reply or editReply failed:", err);
  }

  try {
    if (interaction.editable) {
      await interaction.edit({ embeds: [errorEmbed] });
      return;
    }
  } catch (err) {
    console.error("edit failed:", err);
  }

  try {
    if (interaction.isMessageComponent()) {
      await interaction.update({ embeds: [errorEmbed] });
      return;
    }
  } catch (err) {
    console.error("update failed:", err);
  }

  try {
    await interaction.channel.send({ embeds: [errorEmbed] });
  } catch (err) {
    console.error("send failed:", err);
  }
}

module.exports = handleError;
