const { EmbedBuilder, ButtonStyle, Colors } = require("discord.js");
const { ValorantAPI } = require("../api/valorantApi-api");
const { createButton } = require("../all/Buttons");
const { htmlToHex } = require("../all/ColorConverter");
const emojis = require("../../utils/emojis.json");
const axios = require("axios");
const handleError = require("../../utils/handlers/ErrorHandler");

const valorantAPI = new ValorantAPI();

let skinList = []; // Variable globale pour stocker la liste des skins

async function fetchSkinList() {
  try {
    const response = await axios.get(
      "https://valorant-api.com/v1/weapons/skins"
    );

    if (response.status !== 200) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const skins = response.data.data;
    skinList = skins.map((skin) => ({
      name: skin.displayName,
      uuid: skin.uuid,
    }));

    return skinList;
  } catch (error) {
    console.error("Error fetching skin list:", error.message);
    return [];
  }
}

function findElement(identifier) {
  const lowerCaseIdentifier = identifier.toLowerCase();
  return skinList.find(
    (element) =>
      element.uuid === identifier ||
      element.name.toLowerCase() === lowerCaseIdentifier
  );
}

function converteName(skinName) {
  // Find the index of the opening and closing parentheses
  const start = skinName.indexOf("(");
  const end = skinName.indexOf(")", start);

  let name;
  let base;

  if (start !== -1 && end !== -1) {
    // Extract the part inside the parentheses and trim any leading/trailing spaces
    name = skinName.substring(start + 1, end).trim();
    // Extract the part before the parentheses and trim any leading/trailing spaces
    base = skinName.substring(0, start).trim();
  } else {
    throw new Error("Le mot n'est pas présent.");
  }

  return { name, base };
}

async function getSkinInfo(interaction, skinName, levelNumber, chromaNumber) {
  try {
    let skinUUID = skinName;
    let skinLevel = levelNumber ? levelNumber : 0;
    let skinChroma = chromaNumber ? chromaNumber : 0;

    // Vérifie si skinName correspond à un UUID valide
    if (
      !skinName.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
      )
    ) {
      await fetchSkinList(); // Assure que la liste des skins est à jour
      const foundSkin = findElement(skinName);

      if (!foundSkin) {
        console.error(`Skin not found with name ${skinName}`);
        throw new Error(`Skin not found with name ${skinName}`);
      }
      skinUUID = foundSkin.uuid;
    } else {
    }

    const skinResponse = await valorantAPI.getSkinByUUID(skinUUID);

    if (!skinResponse || !skinResponse.data) {
      console.error(`No valid data received for skin UUID ${skinUUID}`);
      throw new Error(`No valid data received for skin UUID ${skinUUID}`);
    }

    const skinData = skinResponse.data;
    const levels = skinData.levels;
    const chromas = skinData.chromas;
    const skinDisplayName = skinData.displayName;
    let skinAbsoluteName;
    let skinBase;

    if (skinChroma > 0) skinLevel = levels.length - 1;
    if (skinLevel > levels.length - 1) skinLevel = 0;

    try {
      const { name, base } = converteName(skinDisplayName);
      skinAbsoluteName = name;
      skinBase = base;
    } catch (error) {
      console.error("Error in getSkinInfo:", error);
      handleError(interaction, error);;
    }

    const description = [];
    description.push(`## ${skinAbsoluteName} - ${skinBase}`);
    // description.push(`Level ${skinLevel} | Chroma ${skinChroma}`);

    const embed = new EmbedBuilder()
      .setColor(Colors.Purple)
      .setThumbnail(chromas[skinChroma]?.swatch || null)
      .setTimestamp()
      .setFooter({ text: `${skinUUID}` });

    if (skinChroma > 0) {
      embed.setImage(chromas[skinChroma]?.fullRender);
      description.push(
        chromas[skinChroma]?.streamedVideo &&
          chromas[skinChroma]?.streamedVideo !== null
          ? `See the skin [video here](${chromas[skinChroma]?.streamedVideo})`
          : ""
      );
    } else {
      description.push(
        levels[skinLevel]?.streamedVideo &&
          levels[skinLevel]?.streamedVideo !== null
          ? `See the skin [video here](${levels[skinLevel]?.streamedVideo})`
          : ""
      );
      embed.setImage(
        levels[skinLevel]?.displayIcon
          ? levels[skinLevel]?.displayIcon
          : levels[skinLevel - 1]?.displayIcon
          ? levels[skinLevel - 1]?.displayIcon
          : levels[skinLevel - 2]?.displayIcon
          ? levels[skinLevel - 2]?.displayIcon
          : skinData.displayIcon
      );
    }

    embed.setDescription(description.join("\n"));

    const actionRow = await createButton.create([
      // [
      //   "getskin-infos",
      //   "Infos",
      //   null,
      //   skinLevel > 8 || skinLevel === undefined
      //     ? ButtonStyle.Success
      //     : ButtonStyle.Secondary,
      //   false,
      //   null,
      // ],
      ...Array.from({ length: 4 }, (_, index) => [
        `getskin-level${index}`,
        `Level ${index + 1}`,
        null,
        skinLevel === index ? ButtonStyle.Success : ButtonStyle.Secondary,
        levels[index] ? false : true,
        null,
      ]),
    ]);

    const actionRow2 = await createButton.create([
      // ["empty", null, emojis.empty, ButtonStyle.Secondary, true, null],
      ...Array.from({ length: 4 }, (_, index) => [
        `getskin-chroma${index}`,
        `Chroma ${index + 1}`,
        null,
        skinChroma === index ? ButtonStyle.Success : ButtonStyle.Secondary,
        chromas[index] ? false : true,
        null,
      ]),
    ]);

    await interaction.editReply({
      embeds: [embed],
      components: [actionRow, actionRow2],
    });
  } catch (error) {
    console.error(`Error in getSkinInfo:`, error);
    // Gérer l'erreur ici, par exemple envoyer un message d'erreur à l'utilisateur
    handleError(interaction, error);
  }
}

module.exports = { getSkinInfo, findElement, fetchSkinList };
