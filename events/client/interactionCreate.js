const { useQueue } = require("discord-player");
const { interactionError } = require("../../functions/errors/interactionError");
const { fetchAgentList } = require("../../functions/valorant/findAnAgent");
const { fetchSkinList } = require("../../functions/valorant/findASkin");

const Pattern =
  /(track\.author|,|\/|\(|\)|ft\.?|feat|remix|video|music|lyric(s)?|&|explicit|official|video|clip|version|extended|radio|edit|deluxe|album|single|acoustic|cover|live|demo|seeb|feat\.?&|mit|feat|remix|video|musica|letra(s)?|explicito|oficial|avec|video|clip|versione|estendere|radio|modificare|deluxe|album|singolo|acustico|copertina|vivo|demo|seeb|versão|estender|rádio|editar|álbum|solteiro|acústico|capa|ao vivo|demo|ремикс|видео|музыка|тексты|официальный|сингл|акустический|живой|демо|リミックス|ビデオ|音楽|歌詞|公式|シングル|アコースティック|ライブ|デモ|리믹스|비디오|음악|가사|공식|싱글|어쿠스틱|라이브|데모|خليط|فيديو|موسيقى|كلمات|رسمي|ألبوم|فردي|صوتي|حي|عرض|instrumental|оркестровка|インストゥルメンタル|인스트루멘탈|موسيقي|karaoke|караоке|カラオケ|노래방|كاريوكي|bonus|бонус|ボーナス|보너스|بونص|deluxe|делюкс|デラックス|디럭스|ديلوكس|edition|издание|エディション|판|طبعة)/gi;

function formatTitle(track) {
  let title = track.title;

  // Utilisation de la méthode map pour remplacer la boucle for
  track.author.split(",").map((author) => {
    const authorRegex = new RegExp(author.trim(), "gi");
    title = title.replace(authorRegex, "");
  });

  // Utilisation de la méthode replaceAll pour remplacer plusieurs occurrences en une seule opération
  title = title
    .replaceAll(Pattern, "")
    .replaceAll("'", "")
    .replaceAll("`", "")
    .replaceAll('"', "")
    .replaceAll(".", "")
    .trim()
    .slice(0, 40);

  return title;
}

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isAutocomplete()) {
        const focusedOption = interaction.options.getFocused(true);
        let result;

        switch (interaction.commandName) {
          case "valorant":
            if (focusedOption.name === "agent") {
              await fetchAgentList()
                .then((agentList) => {
                  const formattedAgents = agentList.map((agent) => ({
                    name: agent.name,
                    value: agent.uuid, // Ensure the value is assigned correctly
                  }));

                  const filteredChoices = formattedAgents.filter((agent) =>
                    agent.name
                      .toLowerCase()
                      .startsWith(focusedOption.value.toLowerCase())
                  );

                  result = filteredChoices.map((agent) => ({
                    name: agent.name,
                    value: agent.value, // Ensure the value is passed correctly
                  }));
                })
                .catch((error) => {
                  console.error("Error fetching agent list:", error.message);
                });
            } else if (focusedOption.name === "skin-name") {
              await fetchSkinList()
                .then((skinList) => {
                  const formattedSkins = skinList.map((skin) => ({
                    name: skin.name,
                    value: skin.uuid, // Ensure the value is assigned correctly
                  }));

                  const filteredChoices = formattedSkins.filter((skin) =>
                    skin.name
                      .toLowerCase()
                      .startsWith(focusedOption.value.toLowerCase())
                  );

                  result = filteredChoices.map((skin) => ({
                    name: skin.name,
                    value: skin.value, // Ensure the value is passed correctly
                  }));
                })
                .catch((error) => {
                  console.error("Error fetching skin list:", error.message);
                });
            }
            break;

          case "music":
            const queue = useQueue(interaction.guild.id);
            if (queue || queue?.node?.isPlaying()) {
              const allTracks = queue?.tracks?.data;

              if (focusedOption.name === "track") {
                const formattedTracks = allTracks.map((track, i) => ({
                  name: `${formatTitle(track)} - ${track.author}`,
                  value: i.toString(), // Convert the index to a string
                }));

                const filteredChoices = formattedTracks.filter((track) =>
                  track.name
                    .toLowerCase()
                    .startsWith(focusedOption.value.toLowerCase())
                );

                result = filteredChoices.map((track) => ({
                  name: track.name,
                  value: track.value,
                }));
              }
            } else {
              result = [
                {
                  name: `No more tracks (not a track name)`,
                  value: "no-more-tracks",
                },
              ];
            }
            break;

          default:
            break;
        }
        interaction.respond(result.slice(0, 25)).catch((error) => {
          console.error("Error fetching agent list:", error.message);
          interaction.respond([]); // Respond with an empty list in case of error
        });
      } else if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return interaction.reply("Cette commande n'existe pas !");

        if (command.OwnerOnly && interaction.member.id != "391233346996535306")
          return interaction.reply({
            content: `Vous n'avez pas la permission d'executer cette commande !`,
            ephemeral: true,
          });

        if (!interaction.member.permissions.has([command.permissions]))
          return interaction.reply({
            content: `Vous n'avez pas la permission d'executer cette commande !`,
            ephemeral: true,
          });

        command.run(client, interaction);

        // BUTTONS -----------------------------------
      } else if (
        interaction.isButton() &&
        client.buttons.get(interaction.customId)
      ) {
        const button = client.buttons.get(interaction.customId);

        if (!button) return interaction.reply("This button is not work...");

        if (!interaction.member.permissions.has([button.permissions]))
          return interaction.reply({
            content: `Vous n'avez pas la permission d'executer ce boutton !`,
            ephemeral: true,
          });

        button.run(client, interaction);

        // MODALS -----------------------------------
      } else if (
        interaction.isModalSubmit() &&
        client.modals.get(interaction.customId)
      ) {
        const modal = client.modals.get(interaction.customId);

        if (!modal) return interaction.reply("This modal is not work...");

        modal.run(client, interaction);

        // SELECTMENUS -----------------------------------
      } else if (
        interaction.isUserSelectMenu() &&
        client.selectMenus.get(interaction.customId)
      ) {
        const selectMenu = client.selectMenus.get(interaction.customId);

        if (!selectMenu)
          return interaction.reply("This selectmenu is not work...");

        if (!interaction.member.permissions.has([selectMenu.permissions]))
          return interaction.reply({
            content: `Vous n'avez pas la permission d'executer ce select menu !`,
            ephemeral: true,
          });

        selectMenu.run(client, interaction);
      } else if (
        interaction.isStringSelectMenu() &&
        client.selectMenus.get(interaction.customId)
      ) {
        const selectMenu = client.selectMenus.get(interaction.customId);

        if (!selectMenu)
          return interaction.reply("This selectmenu is not work...");

        if (!interaction.member.permissions.has([selectMenu.permissions]))
          return interaction.reply({
            content: `Vous n'avez pas la permission d'utiliser ce select menu !`,
            ephemeral: true,
          });

        selectMenu.run(client, interaction);
      }
    } catch (error) {
      interactionError.send(client, interaction, error);
    }
  },
};
