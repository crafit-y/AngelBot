const { Colors } = require("discord.js");
const { createEmbed } = require("../all/Embeds");
const fs = require("fs");
const axios = require('axios');
const emojis = require("../../utils/emojis.json");

const TTSGenerator = {

  async generate(messageCallback, ttsText, options = "eleven_multilingual_v1", voice = "MF3mGyEYCl7XYWbV9V6O") {
    const site = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
    const headers = {
      //'accept': 'audio/mpeg',
      'xi-api-key': process.env.API_TTS_MESSAGE,
      'Content-Type': 'application/json'
    };

    const data = {
      "text": ttsText,
      "model_id": options
    };

    if (ttsText.length >= 1000) {
      throw new Error({ embeds: [await createEmbed.embed(`${emojis.loading} Text is more than 1000 characters! Please try a shorter sentence.`, Colors.Orange)] });
    }

    messageCallback({ embeds: [await createEmbed.embed(`${emojis.loading} Sending request...`, Colors.Orange)] });

    try {

      const response = await axios.post(site, data, { headers, responseType: 'stream' });

      if (response.status !== 200) {

        throw new Error(`Error traceback:\n${response.data}`);

      } else {
        messageCallback({ embeds: [await createEmbed.embed(`${emojis.loading} Successing if voice ID is valid...`, Colors.Orange)] });

        if (response.status === 400) {
          messageCallback({ embeds: [await createEmbed.embed(`${emojis.error} Entered voice ID does not exist! Did you enter the ID correctly?`, Colors.Red)] });
          throw new Error("Entered voice ID does not exist! Did you enter the ID correctly?");
        } else if (response.status === 401) {
          messageCallback({ embeds: [await createEmbed.embed(`${emojis.error} Quota exceeded!`, Colors.Red)] });
          throw new Error("Quota exceeded!");
        } else {

          messageCallback({ embeds: [await createEmbed.embed(`${emojis.loading} Voice ID is valid! Creating file...`, Colors.Orange)] });

          function formatDateWithTime(date) {
            const d = new Date(date);

            const day = d.getDate().toString().padStart(2, '0');
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const year = d.getFullYear();

            const hours = d.getHours().toString().padStart(2, '0');
            const minutes = d.getMinutes().toString().padStart(2, '0');
            const seconds = d.getSeconds().toString().padStart(2, '0');

            return `${day}-${month}-${year} at ${hours}-${minutes}-${seconds}`;
          }

          const currentDateTime = Date.now();
          const formattedDateTime = formatDateWithTime(currentDateTime);

          const audiofilename = "AngelBot-TTSMessage_" + formattedDateTime + ".mp3";

          const writer = fs.createWriteStream(audiofilename);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', () => {
              resolve();
            });

            writer.on('error', (error) => {
              reject(error);
            });
          });

          messageCallback({ embeds: [await createEmbed.embed(`${emojis.success} Message generated. You have used ${ttsText.length} characters.`, Colors.Green)] });

          return audiofilename;
        }
      }
    } catch (error) {
      messageCallback({ embeds: [await createEmbed.embed(`${emojis.error} Error traceback:\n\`${error}\``, Colors.Red)] });
      throw new Error(`Error traceback:\n${error}`);
    }
  },
};

module.exports = { TTSGenerator };
