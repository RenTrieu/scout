import { InteractionResponseType } from "discord-interactions";
import { cancelSpider } from '../spider_manager.js';

export default async function adminRemoveCommand(req, res, pool, jobMap) {
  const uuid = req.body.data.options[0].value;
  let getRow = new Promise((resolve, reject) => {
    pool.query(
      'SELECT * FROM schedule WHERE uuid=$1',
      [uuid],
      function(err, result) {
        resolve(result.rows[0]);
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
  const client = await pool.connect();
  client.query(
    'DELETE FROM schedule WHERE uuid=$1',
    [uuid],
    function(result) {
      /* Canceling the spider */
      cancelSpider(jobMap, uuid);

      /* Sending response on success */
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Deleted Spider ${row.spider_name} with uuid ${uuid} `
                   + `for user ${row.user_id} in server ${row.guild_id}`,
        }
      });
    }
  );
  await client.end();
}
