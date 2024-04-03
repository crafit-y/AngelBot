const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Colors,
} = require("discord.js");

const msgsError = [
  "Aïe...",
  "Oups...",
  "Oh, une erreur...",
  "Oh non...",
  "Zut alors...",
  "Désolé, une erreur est survenue...",
  "Oops, quelque chose s'est mal passé...",
  "Euh oh...",
  "Hou la la...",
  "Mince alors...",
  "Euh oh, une erreur...",
  "Ah zut...",
  "Désolé, ça n'a pas fonctionné...",
  "Oopsie...",
];

const idToTypeMap = {
  1: "SUB_COMMAND",
  2: "SUB_COMMAND_GROUP",
  3: "STRING",
  4: "INTEGER",
  5: "BOOLEAN",
  6: "USER",
  7: "CHANNEL",
  8: "ROLE",
  9: "MENTIONABLE",
  10: "NUMBER",
  11: "ATTACHMENT",
};

function getTypeFromId(id) {
  return idToTypeMap[id] || "Unknown Type";
}

const interactionError = {
  async send(client, interaction, error) {
    const msgMath = Math.floor(Math.random() * msgsError.length);
    const msg = msgsError[msgMath];

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Support server")
        .setStyle(ButtonStyle.Link)
        .setURL("http://google.com")
        .setDisabled(true)
    );

    const date = new Date();
    const timeTimestamp = Math.round(date.getTime() / 1000);

    let interactionType = "";
    const data = [];

    if (interaction.isCommand()) {
      const options = interaction.options;
      const subcommand = options._subcommand;
      const hoistedOptions = options._hoistedOptions;

      interactionType = `Mentioned command: </${interaction.command.name}${
        subcommand ? ` ${subcommand}` : ""
      }:${interaction.command.id}>`;

      if (subcommand) {
        data.push(`\x1b[45mCommand Informations ---\x1b[0m`);
        data.push(
          `\x1b[33mCommand Name :    \x1b[34m${interaction.command.name}`
        );
        data.push(
          `\x1b[33mCommand ID   :    \x1b[34m${interaction.command.id}`
        );
        data.push(
          `\x1b[33mSubcommand   :    \x1b[34m${options._subcommand}\x1b[0m`
        );
      }

      // Itérer sur l'array pour accéder à chaque objet
      i = 1;
      hoistedOptions.forEach((option) => {
        if (i === 1) data.push(`\n\x1b[45mCommand Options --------\x1b[0m`);
        data.push(`\x1b[33m- Option[${i}]  :    \x1b[34m${option.name}`);
        data.push(`\x1b[33m> Type       :    \x1b[34m${option.type} - ${getTypeFromId(option.type)}`);
        data.push(`\x1b[33m> Value      :    \x1b[34m${option.value}\x1b[0m`);
        i++;
      });
      data.push(``);
      data.push(`---`);
    } else if (interaction.isButton()) {
      interactionType = `Button ID: \`${interaction.customId}\``;
    } else if (interaction.isModalSubmit()) {
      interactionType = `Modal ID: \`${interaction.customId}\``;
    } else if (interaction.isUserSelectMenu()) {
      interactionType = `User selectMenu ID: \`${interaction.customId}\``;
    } else if (interaction.isStringSelectMenu()) {
      interactionType = `String selectMenu ID: \`${interaction.customId}\``;
    } else {
      interactionType = `*Origin not found*`;
    }

    const message = [];

    message.push(`## Une erreur est survenue !`);
    message.push(`*Vous ne devriez jamais recevoir ce message...*`);
    message.push(`${interactionType}`);
    message.push(``);
    message.push(`\`\`\`ansi`);
    message.push(`${data.join("\n")}`);
    message.push(``);
    message.push(`\x1b[41m\x1b[37mError code --------------\x1b[0m`);
    message.push(`${error}`);
    message.push(`\`\`\``);
    message.push(`Date: <t:${timeTimestamp}:f> (<t:${timeTimestamp}:R>)`);
    message.push(
      `*Vous pouvez nous le signaler en appuiyant sur le boutton en bas là ↓*`
    );

    const embed = new EmbedBuilder()
      .setAuthor({ name: msg, iconURL: client.user.avatarURL() })
      .setDescription(message.join("\n"))
      .setColor(Colors.Red);

    return await interaction.channel
      .send({ embeds: [embed], components: [btn] })
      .catch(() => {});
  },
};

module.exports = { interactionError };
