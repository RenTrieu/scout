import { InteractionResponseType } from "discord-interactions";

export default async function adminRemoveCommand(req, res, db) {
  const uuid = req.body.data.options[0].value;
  let getRow = new Promise((resolve, reject) => {
      db.get(
      'SELECT * FROM schedule WHERE uuid=$uuid',
      { $uuid: uuid },
      function(err, row) {
        resolve(row);
      }
    );
  });
  const row = await getRow;
  if (typeof row === 'undefined') {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `No Spider with uuid ${uuid} found.`
      }
    });
  }
  db.run(
    'DELETE FROM schedule WHERE uuid=$uuid',
    { $uuid: uuid },
    function() {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Deleted Spider ${row.spider_name} with uuid ${uuid} `
                   + `for user ${row.user_id} in server ${row.guild_id}`,
          allowed_mentions: {
            "users": [userId]
          }
        }
      });
    }
  );
}
