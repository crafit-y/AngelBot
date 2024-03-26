const { ApplicationCommandOptionType } = require('discord.js');
const IDS = require('../../utils/ids.json');

module.exports = {
    name: 'emit',
    description: 'Send an event to the bot.',
    OwnerOnly: true,
    permissions: ["ADMINISTRATOR"],
    options: [
        {
            name: 'event',
            description: 'Choices an event to send to the bot.',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: 'guildMemberAdd',
                    value: 'guildMemberAdd'
                },
                {
                    name: 'guildMemberRemove',
                    value: 'guildMemberRemove'
                },
                {
                    name: 'guildCreate',
                    value: 'guildCreate'
                },
                {
                    name: 'guildRemove',
                    value: 'guildRemove'
                },
                {
                    name: 'guildBanAdd',
                    value: 'guildBanAdd'
                },
                {
                    name: 'guildBanRemove',
                    value: 'guildBanRemove'
                }
            ]
        },
        {
            name: 'parametre',
            description: 'Choices a parametre for send events to the bot.',
            type: ApplicationCommandOptionType.User,
            required: false,
        }
    ],
    
    async run(client, interaction) {
        const eventChoises = interaction.options.getString('event');
        const member = interaction.options.getUser('parametre') || interaction.member;

        function sendEvent(eventParameter) {
            
            try {
                
                client.emit(`${eventChoises}`, eventParameter);
                
                return interaction.reply({ content: `\`\`\`java\n> Result: true\n> Event : '${eventChoises}' was successfully sent with parameter '${eventParameter}'.\`\`\``});
                
            } catch (error) {

                console.error(`${eventChoises} > `, error);

                return interaction.reply({ content: `\`\`\`java\n> Result: false\n> Event : '${eventChoises}' was occured an error.\`\`\``});
            }

        }
        
        switch (eventChoises) {
            case 'guildMemberAdd':
                sendEvent(member);
            break;

            case 'guildMemberRemove':
                sendEvent(member);
            break;
            
            case 'guildCreate':
                sendEvent(interaction.guild);
            break;

            case 'guildRemove':
                sendEvent(interaction.guild);
            break;
            
            case 'guildBanAdd':
                sendEvent(member);
            break;

            case 'guildBanRemove':
                sendEvent(member);
            break;
        }
    }
}