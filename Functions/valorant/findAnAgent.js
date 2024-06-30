const { EmbedBuilder, ButtonStyle } = require("discord.js");
const { ValorantAPI } = require("../api/valorantApi-api");
const { createButton } = require("../all/Buttons");
const { htmlToHex } = require("../all/ColorConverter");
const axios = require("axios");

const valorantAPI = new ValorantAPI();

let agentList = []; // Variable globale pour stocker la liste des agents

async function fetchAgentList() {
  try {
    const response = await axios.get("https://valorant-api.com/v1/agents");

    if (response.status !== 200) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const agents = response.data.data;
    agentList = agents.map((agent) => ({
      name: agent.displayName,
      uuid: agent.uuid,
    }));

    return agentList;
  } catch (error) {
    console.error("Error fetching agent list:", error.message);
    return [];
  }
}

function findElement(identifier) {
  const lowerCaseIdentifier = identifier.toLowerCase();
  return agentList.find(
    (element) =>
      element.uuid === identifier ||
      element.name.toLowerCase() === lowerCaseIdentifier
  );
}

async function getAgentOrAbilityInfo(interaction, agentName, abilityNumber) {
  try {
    let agentUUID = agentName;

    // Vérifie si agentName correspond à un UUID valide
    if (
      !agentName.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
      )
    ) {
      await fetchAgentList(); // Assure que la liste des agents est à jour
      const foundAgent = findElement(agentName);

      if (!foundAgent) {
        throw new Error(`Agent not found with name ${agentName}`);
      }
      agentUUID = foundAgent.uuid;
    }

    const agentResponse = await valorantAPI.getAgentByUUID(agentUUID);

    if (!agentResponse || !agentResponse.data || agentResponse.status !== 200) {
      throw new Error(`No valid data received for agent UUID ${agentUUID}`);
    }

    const agentData = agentResponse?.data;
    const role = agentData?.role;
    const abilities = agentData?.abilities;
    const color = "#" + agentData?.backgroundGradientColors[0];

    const embed = new EmbedBuilder()
      .setColor(await htmlToHex(color))
      .setAuthor({
        name: agentData?.displayName,
        iconURL: agentData?.displayIcon,
      })
      .setThumbnail(role?.displayIcon)
      .setFooter({
        text: `${agentData?.displayName} was developed by ${agentData?.developerName}`,
      });

    if (
      abilityNumber !== undefined &&
      abilityNumber >= 0 &&
      abilityNumber <= 3
    ) {
      const ability = abilities[abilityNumber];
      embed.setThumbnail(ability?.displayIcon);
      embed.setImage(agentData?.killfeedPortrait);
      embed.setDescription(
        `Ability: **${ability.displayName}**\n` +
          `Default KeyBind: **${
            abilityNumber === 0
              ? "A"
              : abilityNumber === 1
              ? "E"
              : abilityNumber === 2
              ? "C"
              : "X"
          }**\n` +
          `*${ability.description}*`
      );
    } else {
      embed.setImage(agentData?.fullPortrait);
      embed.setDescription(
        `Role: **${role?.displayName}**\n*${agentData?.description}*`
      );
    }

    const actionRow = await createButton.create([
      [
        "getagent-infos",
        "Infos",
        null,
        abilityNumber > 3 || abilityNumber === undefined
          ? ButtonStyle.Success
          : ButtonStyle.Secondary,
        false,
        null,
      ],
      ...abilities
        .slice(0, 4)
        .map((ability, index) => [
          `getagent-ability${index}`,
          `Ability ${index + 1} > ${ability?.displayName}`,
          null,
          abilityNumber === index ? ButtonStyle.Success : ButtonStyle.Secondary,
          false,
          null,
        ]),
    ]);

    await interaction.editReply({ embeds: [embed], components: [actionRow] });
  } catch (error) {
    console.error(`Error in getAgentOrAbilityInfo:`, error);
    // Gérer l'erreur ici, par exemple envoyer un message d'erreur à l'utilisateur
  }
}

module.exports = { getAgentOrAbilityInfo, findElement, fetchAgentList };
