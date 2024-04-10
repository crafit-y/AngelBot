const {
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getAllTheTeam } = require("./getAllTheTeam");
const { createEmbed } = require("../all/Embeds");
const emojis = require("../../utils/emojis.json");

async function updateUsersTeam(
  client,
  interaction,
  team,
  replyed = false,
  updated = 0
) {
  const usersInTeam = await getAllTheTeam(team);
  const userObjects = await Promise.all(
    usersInTeam.map((userId) => client.users.fetch(userId))
  );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("selecttheusertoreplace")
    .setMinValues(1)
    .setMaxValues(1)
    .setPlaceholder("Select the user you want to update");

  const options = userObjects.map((user, index) => {
    const userName = user.displayName.substring(0, 30);
    return new StringSelectMenuOptionBuilder()
      .setLabel(`User ${emojis.arrow} ${userName}`)
      .setValue(`${index + 1}-${user.id}`);
  });

  selectMenu.addOptions(...options);

  const refreshButton = new ButtonBuilder()
    .setCustomId("updateusersteam-refresh")
    .setEmoji("🔁")
    .setStyle(ButtonStyle.Success);
  const team1Button = new ButtonBuilder()
    .setCustomId("updateusersteam-team1")
    .setEmoji(emojis.teams)
    .setLabel("Team 1")
    .setStyle(ButtonStyle.Secondary);
  const team2Button = new ButtonBuilder()
    .setCustomId("updateusersteam-team2")
    .setEmoji(emojis.teams)
    .setLabel("Team 2")
    .setStyle(ButtonStyle.Secondary);

  const rowButtons = new ActionRowBuilder()
    .addComponents(refreshButton)
    .addComponents(team1Button)
    .addComponents(team2Button);

  const rowSelectMenu = new ActionRowBuilder().addComponents(selectMenu);

  const userList = usersInTeam
    .map((user, index) => {
      return `<@${user}>${index + 1 === updated ? " *(✏️ updated)*" : ""}`;
    })
    .join(`\n> User ${emojis.arrow}`);

  const embedContent = `### ${emojis.teams} The list of participants in Team ${team}\n> User ${emojis.arrow}${userList}`;

  if (replyed) {
    await interaction.message.edit({
      embeds: [await createEmbed.embed(embedContent)],
      components: [rowButtons, rowSelectMenu],
    });
  } else {
    await interaction.editReply({
      embeds: [await createEmbed.embed(embedContent)],
      components: [rowButtons, rowSelectMenu],
    });
  }
}

module.exports = { updateUsersTeam };
