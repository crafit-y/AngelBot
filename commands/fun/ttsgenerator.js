const { ApplicationCommandOptionType } = require("discord.js");
const { TTSGenerator } = require('../../functions/api/ElevenLabsAPI');
const fs = require("fs");
const { PlayASound } = require("../../functions/all/PlayASound");

module.exports = {
    name: 'ttsgenerator',
    category: 'fun',
    description: 'Say a tts message on voice channel',
    OwnerOnly: false,
    permissions: [],
    options: [
        {
            name: 'tts-text',
            description: 'The message to say',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: 'lingual-option',
            description: 'Select a voice',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: 'Eleven monolingual V1 (English)',
                    value: 'eleven_monolingual_v1'
                },
                {
                    name: 'Eleven multilingual V1 (English, German, Polish, Spanish, Italian, French, Portuguese, Hindi)',
                    value: 'eleven_multilingual_v1'
                },
            ]
        },
        {
            name: 'voice',
            description: 'Select a voice',
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                {
                    name: '♂ Adam (default)',
                    value: 'pNInz6obpgDQGcFmaJgB'
                },
                {
                    name: '♂ Josh',
                    value: 'TxGEqnHWrfWFTfGW9XjX'
                },
                {
                    name: '♀ Elit',
                    value: 'MF3mGyEYCl7XYWbV9V6O'
                },
                {
                    name: '♀ Rachel',
                    value: '21m00Tcm4TlvDq8ikWAM'
                },
                {
                    name: '♀ Domi',
                    value: 'AZnzlk1XvdvUeBnXmlld'
                },
                {
                    name: '♀ Bella',
                    value: 'EXAVITQu4vr4xnSDxMaL'
                },
            ]
        },
        {
            name: 'action_after_generate',
            description: 'Select a voice',
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                {
                    name: 'Play on a voice channel',
                    value: 'play-channel'
                },
            ]
        },
    ],
    async run(client, interaction) {
        const ttsText = interaction.options.getString('tts-text');
        const options = interaction.options.getString('lingual-option');
        const voice = interaction.options.getString('voice');
        const action = interaction.options.getString('action_after_generate');

        await interaction.deferReply();

        // Définir une fonction de rappel pour traiter les messages
        async function handleMessage(message) {
            await interaction.editReply(message);
        }

        // Appeler la fonction generate avec la fonction de rappel
        const file = await TTSGenerator.generate(handleMessage, ttsText, options, voice);

        const message = await interaction.followUp({ files: [file], ephemeral: true });

        fs.unlink(file, (error) => {
            if (error) {
                throw new Error(`Error traceback:\n\n${error}`);
            }
        });

        if (action === 'play-channel') {

            // Définir une fonction de rappel pour traiter les messages
            async function handleMessage(message) {
                await interaction.followUp(message);
            }

            // Appeler la fonction generate avec la fonction de rappel
            await PlayASound.aDiscordLink(handleMessage, client, message, interaction);
        }
    }
}