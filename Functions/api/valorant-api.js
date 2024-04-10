const axios = require("axios").default;
const { ErrorType, DataType } = require("../../constants/types");

async function getData(playerID, dataType, matchID = null) {
  let data;

  try {
    const options = {
      headers: {
        "TRN-Api-Key": process.env.TRACKER_API,
      },
    };

    if (dataType === DataType.PROFILE) {
      data = await axios.get(process.env.TRACKER_PROFILE + playerID, options);
    } else if (dataType === DataType.RANK) {
      data = await axios.get(
        process.env.TRACKER_PROFILE + playerID + process.env.RANK_HEADER,
        options
      );
    } else if (dataType === DataType.COMP_OVERVIEW) {
      // prettier-ignore
      data = await axios.get(process.env.TRACKER_PROFILE + playerID + process.env.OVERVIEW_HEADER + 'competitive' + process.env.SOURCE_HEADER, options);
    } else if (dataType === DataType.UNRATED_OVERVIEW) {
      data = await axios.get(
        process.env.TRACKER_PROFILE +
          playerID +
          process.env.OVERVIEW_HEADER +
          "unrated",
        options
      );
    } else if (dataType === DataType.SPIKE_RUSH_OVERVIEW) {
      data = await axios.get(
        process.env.TRACKER_PROFILE +
          playerID +
          process.env.OVERVIEW_HEADER +
          "spikerush",
        options
      );
    } else if (dataType === DataType.DEATHMATCH_OVERVIEW) {
      data = await axios.get(
        process.env.TRACKER_PROFILE +
          playerID +
          process.env.OVERVIEW_HEADER +
          "deathmatch",
        options
      );
    } else if (dataType === DataType.REPLICATION_OVERVIEW) {
      data = await axios.get(
        process.env.TRACKER_PROFILE +
          playerID +
          process.env.OVERVIEW_HEADER +
          "replication",
        options
      );
    } else if (dataType === DataType.ESCALATION_OVERVIEW) {
      data = await axios.get(
        process.env.TRACKER_PROFILE +
          playerID +
          process.env.OVERVIEW_HEADER +
          "escalation",
        options
      );
    } else if (dataType === DataType.SWIFTPLAY_OVERVIEW) {
      data = await axios.get(
        process.env.TRACKER_PROFILE +
          playerID +
          process.env.OVERVIEW_HEADER +
          "swiftplay",
        options
      );
    } else if (dataType === DataType.SNOWBALL_OVERVIEW) {
      data = await axios.get(
        process.env.TRACKER_PROFILE +
          playerID +
          process.env.OVERVIEW_HEADER +
          "snowball",
        options
      );
    } else if (dataType === DataType.WEAPON) {
      data = await axios.get(
        process.env.TRACKER_PROFILE + playerID + process.env.WEAPON_HEADER,
        options
      );
    } else if (dataType === DataType.SEASON_REPORT) {
      data = await axios.get(
        process.env.TRACKER_PROFILE + playerID + process.env.SEASON_REPORT,
        options
      );
    } else if (dataType === DataType.MATCH) {
      data = await axios.get(
        process.env.TRACKER_MATCH + `riot/${playerID}`,
        options
      );
    } else if (dataType === DataType.MATCH_INFO) {
      data = await axios.get(process.env.TRACKER_MATCH + matchID, options);
    } else {
      console.error(
        "You should not reach here. There is a typo in the code :|"
      );
    }
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.error(error);
      return ErrorType.FORBIDDEN;
    }
    console.error(error);
    return ErrorType.DEFAULT;
  }

  return data;
}

module.exports = { getData };
