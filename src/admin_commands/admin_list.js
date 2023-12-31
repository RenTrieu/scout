import { InteractionResponseType } from "discord-interactions";
import { 
  genPagedList,
  genSpiderEmbed,
} from "../spider_manager.js";

export default async function adminListCommand(
  req, res, pool, displayLimit=2
) {
  let sqlQuery = 'SELECT * FROM schedule';
  let sqlValues = [];
  let rawValues = {};

  // Building the SQL query based off of the passed arguments
  if ('options' in req.body.data) {
    let optionIndex = 0;
    sqlQuery += ' WHERE';
    const userArg = req.body.data.options.filter((arg) => {
      return arg.name == 'user-id';
    });
    if (userArg.length > 0) {
      optionIndex += 1;
      if (sqlValues.length > 0) {
        sqlQuery += ' AND';
      }
      const userId = userArg[0].value;
      sqlQuery += ` user_id = $${optionIndex}`;
      sqlValues.push(userId);
      Object.assign(rawValues, { user_id: userId });
    }
    const guildArg = req.body.data.options.filter((arg) => {
      return arg.name == 'guild-id';
    });
    if (guildArg.length > 0) {
      optionIndex += 1;
      if (sqlValues.length > 0) {
        sqlQuery += ' AND';
      }
      const guildId = guildArg[0].value;
      sqlQuery += ` guild_id = $${optionIndex}`;
      sqlValues.push(guildId);
      Object.assign(rawValues, { guild_id: guildId });
    }
    const spiderArg = req.body.data.options.filter((arg) => {
      return arg.name == 'spider-name';
    });
    if (spiderArg.length > 0) {
      optionIndex += 1;
      if (sqlValues.length > 0) {
        sqlQuery += ' AND';
      }
      const spiderName = spiderArg[0].value;
      sqlQuery += ` spider_name = $${optionIndex}`;
      sqlValues.push(spiderName);
      Object.assign(rawValues, { spider_name: spiderName });
    }
  }

  const getSpiderRows = new Promise((resolve, reject) => {
    pool.query(sqlQuery, sqlValues,
      function(_err, result) {
        resolve(result.rows);
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
      const pageTotal = Math.min(displayLimit, rows.length);
      let scheduleStr = '';
      const repeatInterval = row.repeat_interval;
      scheduleStr += `Repeats ${repeatInterval}\n`;
      Object.values(JSON.parse(row.schedule_str)).forEach((schedAttr) => {
        scheduleStr += `${schedAttr.name}: ${schedAttr.value}\n`;
      });
      row_embeds.push(
        {
          title: `Result [${resultNum}/${pageTotal}]`,
          type: 'rich',
          fields: [
            { name: 'UUID', 'value': row.uuid },
            { name: 'Spider', 'value': row.spider_name },
            { name: 'Guild', 'value': row.guild_id },
            { name: 'Channel', 'value': row.channel_id },
            { name: 'User', 'value': row.user_id },
            { name: 'Scheduled', 'value': scheduleStr }
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
                disabled: rows.length <= displayLimit ? true : false
              }
            ]
          }
        ]
      },
    });
  });
}

export async function adminListInteraction(
  req, res, pool, displayLimit=2
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
    pool.query(sqlQuery,
      function(_err, result) {
        resolve(result.rows);
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
        genSpiderEmbed(row, `Result [${resultNum}/${displayRows.length}]`)
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
