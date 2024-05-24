const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
} = require("@discordjs/voice");
const { Colors } = require("discord.js");
const { Readable } = require("stream");
const { createEmbed } = require("../all/Embeds");
const axios = require("axios");
const emojis = require("../../utils/emojis.json");
const IDS = require("../../utils/ids.json");
const fs = require("fs");

const PlayASound = {
  async aDiscordLink(messageCallback, client, link, interaction) {
    try {
      // Get the audio URL from the link
      const audioUrl = getAudioUrlFromLink(link);

      // Join the voice channel and create a player
      const { voiceChannel, player, connection } =
        await joinVoiceAndCreatePlayer(client, interaction);

      // Fetch the audio stream from the URL
      const { data: stream } = await axios.get(audioUrl, {
        responseType: "stream",
      });

      // Create an audio resource from the stream
      const resource = createAudioResource(Readable.from(stream), {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });

      // Send a message indicating that the audio is playing
      messageCallback({
        embeds: [
          await createEmbed.embed(
            `${emojis.music} The audio file \`${getAttachmentName(
              link
            )}\` is playing now on <#${voiceChannel.id}>`
          ),
        ],
      });

      // Play the audio resource
      player.play(resource);

      // Subscribe the connection to the player
      connection.subscribe(player);
    } catch (error) {
      console.error(error);
      messageCallback({
        embeds: [
          await createEmbed.embed(
            `${emojis.error} An error occurred while fetching the audio file.`,
            Colors.Red
          ),
        ],
      });
      console.log("Error occurred:", error);
    }
  },

  async anExistingFile(client, fileName = "Error", interaction = null) {
    try {
      const audioPath = `${process.cwd()}/utils/voiceLines/AngelBot-TTSMessage_${fileName}.mp3`;
      await fs.promises.access(audioPath); // Check if file exists

      const audioStream = fs.createReadStream(audioPath);

      const { voiceChannel, player, connection } =
        await joinVoiceAndCreatePlayer(client, interaction);

      const resource = createAudioResource(audioStream, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });

      player.play(resource);
      connection.subscribe(player);
    } catch (error) {
      console.error(error);
    }
  },
};

async function joinVoiceAndCreatePlayer(client, interaction = null) {
  try {
    // Détermine le canal vocal en fonction de l'interaction ou du canal de fin prédéfini
    const voiceChannel =
      interaction?.member?.voice.channel ||
      client.guilds.cache
        .get(IDS.OTHER_IDS.GUILD)
        ?.channels.cache.get(IDS.CHANNELS.END);

    // Vérifie si le canal vocal est valide
    if (!voiceChannel) {
      throw new Error(
        "You must be connected to a voice channel to play an audio file."
      );
    }

    // Rejoint le canal vocal et crée un lecteur audio
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();

    return { voiceChannel, player, connection };
  } catch (error) {
    console.error("Error in joinVoiceAndCreatePlayer:", error);
    return null;
  }
}

function getAudioUrlFromLink(link) {
  const attachment = link.attachments.first();
  if (!attachment) return null; //throw new Error("The Discord interaction does not contain an audio file attachment.");
  return attachment.url;
}

function getAttachmentName(link) {
  const attachment = link.attachments.first();
  return attachment ? attachment.name : "Unknown";
}

module.exports = { PlayASound };
