const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
const { Colors } = require("discord.js");
const { Readable } = require('stream');
const { createEmbed } = require("../all/Embeds");
const axios = require('axios');
const emojis = require("../../utils/emojis.json");
const IDS = require("../../utils/ids.json");
const fs = require("fs");

const PlayASound = {
  async aDiscordLink(messageCallback, link, interaction) {
    try {
      const audioUrl = getAudioUrlFromLink(link);

      const { voiceChannel, player, connection } = await joinVoiceAndCreatePlayer(interaction);

      const { data: stream } = await axios.get(audioUrl, { responseType: 'stream' });
      const resource = createAudioResource(Readable.from(stream), { inputType: StreamType.Arbitrary, inlineVolume: true });

      messageCallback({ embeds: [await createEmbed.embed(`${emojis.music} The audio file \`${getAttachmentName(link)}\` is playing now on <#${voiceChannel.id}>`)] });

      player.play(resource);
      connection.subscribe(player);
    } catch (error) {
      console.error(error);
      messageCallback({ embeds: [await createEmbed.embed(`${emojis.error} An error occurred while fetching the audio file.`, Colors.Red)] });
    }
  },

  async anExistingFile(client, fileName = "Error") {
    try {
      const audioPath = `${process.cwd()}/utils/voiceLines/AngelBot-TTSMessage_${fileName}.mp3`;
      await fs.access(audioPath); // Check if file exists
      const audioStream = fs.createReadStream(audioPath);

      const { voiceChannel, player, connection } = await joinVoiceAndCreatePlayer(client);

      const resource = createAudioResource(audioStream, { inputType: StreamType.Arbitrary, inlineVolume: true });

      player.play(resource);
      connection.subscribe(player);
    } catch (error) {
      console.error(error);
    }
  },
};

async function joinVoiceAndCreatePlayer(client, interaction = null) {
  let voiceChannel = interaction ? interaction.member.voice.channel : client.guilds.cache.get(IDS.OTHER_IDS.GUILD)?.channels.cache.get(IDS.CHANNELS.END);

  if (!voiceChannel) throw new Error("You must be connected to a voice channel to play an audio file.");

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer();
  return { voiceChannel, player, connection };
}

function getAudioUrlFromLink(link) {
  const attachment = link.attachments.first();
  if (!attachment) throw new Error("The Discord interaction does not contain an audio file attachment.");
  return attachment.url;
}

function getAttachmentName(link) {
  const attachment = link.attachments.first();
  return attachment ? attachment.name : "Unknown";
}

module.exports = { PlayASound };
