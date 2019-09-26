/*!
 * Copyright 2013 Apereo Foundation (AF) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://www.osedu.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/* eslint-disable import/no-unresolved */
const Redis = require('ioredis');

const SettingsUtil = require('ep_etherpad-lite/node/utils/Settings');

let redisClient = null;
const ETHERPAD_QUEUE = 'oae-content/etherpad-publish';
const retryTimeout = 5;

let redisConfig = {};
if (SettingsUtil.ep_oae && SettingsUtil.ep_oae.mq) {
  redisConfig = SettingsUtil.ep_oae.mq;
}

const createClient = function(_config, callback) {
  // The connection options are defaulted to localhost, but they are configurable
  // from etherpad's root settings.json file
  const connectionOptions = {
    port: _config.port,
    host: _config.host,
    db: _config.dbIndex || 0,
    password: _config.pass,
    // By default, ioredis will try to reconnect when the connection to Redis is lost except when the connection is closed
    // Check https://github.com/luin/ioredis#auto-reconnect
    retryStrategy: () => {
      console.log('Error connecting to redis, retrying in ' + retryTimeout + 's...');
      return retryTimeout * 1000;
    },
    reconnectOnError: () => {
      // Besides auto-reconnect when the connection is closed, ioredis supports reconnecting on the specified errors by the reconnectOnError option
      return true;
    }
  };

  const redisClient = Redis.createClient(connectionOptions);

  // Register an error handler.
  redisClient.on('error', () => {
    console.log('Error connecting to redis...');
  });

  redisClient.on('ready', () => {
    console.log('Connected to the default OAE task queue via redis');
  });
  return callback(null, redisClient);
};

// Open a connection to Redis
createClient(redisConfig, (err, _client) => {
  if (err) {
    console.log('Unable to establish a redis connection...');
  }

  redisClient = _client;
});

/**
 * Publish an event to the default task exchange queue indicating that a pad has been published
 *
 * @param  {String}     contentId   The OAE content ID of the pad that was published
 * @param  {String}     userId      The OAE user ID of the user that made the edit
 */
const publish = (contentId, userId) => {
  const data = {
    contentId,
    userId
  };

  redisClient.lpush(ETHERPAD_QUEUE, data, err => {
    if (err) {
      console.error('Failed to publish for %s and %s', contentId, userId);
      return;
    }

    console.log('Successfully submitted data to ' + ETHERPAD_QUEUE + '...');
  });
};

module.exports = { publish };
