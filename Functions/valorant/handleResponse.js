const { maintenanceEmbed, errorEmbed, noStatsEmbed } = require('../../components/embeds');
const { ErrorType } = require('../../constants/types');

async function handleResponse(interaction, dataSources) {
  const noDataResponse = {
    embeds: [noStatsEmbed],
    ephemeral: true,
  };

  if (dataSources.includes(ErrorType.FORBIDDEN)) {
    await interaction.editReply({
      embeds: [maintenanceEmbed],
      ephemeral: true,
    });
    return false;
  }

  if (dataSources.includes(ErrorType.DEFAULT)) {
    await interaction.editReply({
      embeds: [errorEmbed],
      ephemeral: true,
    });
    return false;
  }

  if (
    dataSources.some((source) => {
      return source.data && source.data.data && source.data.data.length === 0;
    })
  ) {
    await interaction.editReply(noDataResponse);
    return false;
  }
  return true;
}

module.exports = { handleResponse };
