import { InteractionResponseType } from "discord-interactions";

export default async function adminListCommand(req, res, db) {
  let sqlQuery = 'SELECT * FROM schedule';
  let sqlValues = {};

  // Building the SQL query based off of the passed arguments
  if ('options' in req.body.data) {
    sqlQuery += ' WHERE';
    const userArg = req.body.data.options.filter((arg) => {
      return arg.name == 'user-id';
    });
    if (userArg.length > 0) {
      if (Object.keys(sqlValues).length > 0) {
        sqlQuery += ' AND';
      }
      const userId = userArg[0].value;
      sqlQuery += ' user_id = $userId';
      Object.assign(sqlValues, { $userId: userId });
    }
    const guildArg = req.body.data.options.filter((arg) => {
      return arg.name == 'guild-id';
    });
    if (guildArg.length > 0) {
      if (Object.keys(sqlValues).length > 0) {
        sqlQuery += ' AND';
      }
      const guildId = guildArg[0].value;
      sqlQuery += ' guild_id = $guildId';
      Object.assign(sqlValues, { $guildId: guildId });
    }
    const spiderArg = req.body.data.options.filter((arg) => {
      return arg.name == 'spider-name';
    });
    if (spiderArg.length > 0) {
      if (Object.keys(sqlValues).length > 0) {
        sqlQuery += ' AND';
      }
      const spiderName = spiderArg[0].value;
      sqlQuery += ' spider_name = $spiderName';
      Object.assign(sqlValues, { $spiderName: spiderName });
    }
  }

  const getSpiderRows = new Promise((resolve, reject) => {
    db.all(sqlQuery, sqlValues,
      function(_err, rows) {
        resolve(rows);
      }
    );
  });

  getSpiderRows.then((rows) => {
    if (rows.length <= 0) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'No results.',
        }
      });
    }
    else {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: JSON.stringify(rows),
        }
      });
    }
  });
}
