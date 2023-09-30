import { InteractionResponseType } from "discord-interactions";
import { genPagedList } from "../spider_manager.js";

export default async function adminListCommand(
  req, res, db, displayLimit=2
) {
  let sqlQuery = 'SELECT * FROM schedule';
  let sqlValues = {};
  let rawValues = {};

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
      Object.assign(rawValues, { user_id: userId });
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
      Object.assign(rawValues, { guild_id: guildId });
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
      Object.assign(rawValues, { spider_name: spiderName });
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
    const displayRows = rows.slice(0, displayLimit);

    let row_embeds = [];
    row_embeds.push(
      {
        title: `Result Page [1/${Math.ceil(rows.length/displayLimit)}]`,
        type: 'rich',
        description: `Query Options:\n${JSON.stringify(rawValues)}`,
      }
    )
    let resultNum = 1;
    displayRows.forEach((row) => {
      row_embeds.push(
        {
          title: `Result [${resultNum}/${displayLimit}]`,
          type: 'rich',
          fields: [
            { name: 'UUID', 'value': row.uuid },
            { name: 'Spider', 'value': row.spider_name },
            { name: 'Guild', 'value': row.guild_id },
            { name: 'Channel', 'value': row.channel_id },
            { name: 'User', 'value': row.user_id }
          ]
        }
      );
      resultNum += 1;
    });
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: row_embeds, 
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                label: 'PREV',
                style: 1,
                custom_id: 'admin_list_prev',
                disabled: true
              },
              {
                type: 2,
                label: 'NEXT',
                style: 1,
                custom_id: 'admin_list_next',
                disabled: false
              }
            ]
          }
        ]
      },
    });
  });
}

export async function adminListInteraction(
  req, res, db, displayLimit=2
) {
  const headerEmbed = req.body.message.embeds[0];
  const queryOptions = JSON.parse(headerEmbed.description.split('\n')[1]);

  let sqlQuery = 'SELECT * FROM schedule';
  const initial_len = sqlQuery.length;
  Object.keys(queryOptions).forEach((option) => {
    if (sqlQuery.length === initial_len) {
      sqlQuery += ` WHERE ${option} = ${queryOptions[option]}`;
    }
    else {
      sqlQuery += ` AND ${option} = ${queryOptions[option]}`;
    }
  });

  const getSpiderRows = new Promise((resolve, reject) => {
    db.all(sqlQuery,
      function(_err, rows) {
        resolve(rows);
      }
    );
  });

  getSpiderRows.then((rows) => {
    let rowEmbeds = [];
    const {curPage, buttons, displayRows} = genPagedList(
      req, rows, displayLimit, 'admin_list_prev', 'admin_list_next'
    );
    headerEmbed.title = 'Result Page '
      + `[${curPage}/${Math.ceil(rows.length/displayLimit)}]`;
    rowEmbeds.push(headerEmbed);

    let resultNum = 1;
    displayRows.forEach((row) => {
      rowEmbeds.push(
        {
          title: `Result [${resultNum}/${displayRows.length}]`,
          type: 'rich',
          fields: [
            { name: 'UUID', 'value': row.uuid },
            { name: 'Spider', 'value': row.spider_name },
            { name: 'Guild', 'value': row.guild_id },
            { name: 'Channel', 'value': row.channel_id },
            { name: 'User', 'value': row.user_id }
          ]
        }
      );
      resultNum += 1;
    });

    return res.send({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: `update: ${sqlQuery}`,
        embeds: rowEmbeds,
        components: [
          {
            type: 1,
            components: buttons 
          }
        ],
      }
    });
  });
}
