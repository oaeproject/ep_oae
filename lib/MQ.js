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

var amqp = require('amqp');

var SettingsUtil = require('ep_etherpad-lite/node/utils/Settings');

// Whether or not the RabbitMQ connection has been setup
var initialized = null;

// Once the connection is set up, this will hold the default OAE task exchange
var taskExchange = null;

// We default the connection options to localhost, but they are configurable
// from etherpad's root settings.json file
var connectionOptions = {
    'host': 'localhost',
    'port': 5672
};
if (SettingsUtil.ep_oae && SettingsUtil.ep_oae.mq) {
    connectionOptions = SettingsUtil.ep_oae.mq;
}

// Open a connection to RabbitMQ
var connection = amqp.createConnection(connectionOptions);

// When the connection drops away, we try to reconnect every second
connection.setImplOptions({'reconnect': true, 'reconnectBackoffTime': 1000});

// Keeps track of whether or not the connection errored just before it closed. If so,
// we let amqp do it's "backoff" retry thing as a result of the error. If it didn't
// error (e.g., the server was killed), then we need to kick off a reconnect manually.
var connectionError = false;

connection.on('error', function(err) {
    connectionError = true;
    console.error(err, 'Error in the RabbitMQ connection. Reconnecting');
});

connection.on('close', function() {
    if (connectionError) {
        // The connection closed because it had an error, since it's already retrying, just
        // set the error flag back to false so we can catch this again when if reconnect
        connectionError = false;
    } else {
        // The connection "closed" without an error. Since an AMQP connection inherits a stream
        // and not a connection, an unexpected closure (network issue) of an AMQP connection will
        // result in a simple "close". So if we did not get an explicit error above, then we'll
        // want to manually reconnect since AMQP won't do that for us in this scenario.
        console.warn('Closed connection to RabbitMQ. Reconnecting');
        connection.reconnect();
    }
});

// Wait till the connection is available
connection.on('ready', function() {
    console.log('Connection to RabbitMQ established');

    // Connect to the Task Exchange
    var exchangeOptions = {
        'type': 'direct',
        'durable': true,
        'autoDelete': false
    };
    connection.exchange('oae-taskexchange', exchangeOptions, function (exchange) {
        console.log('Connected to the default OAE task exchange');

        taskExchange = exchange;
    });
});

/**
 * Publish an event to the default task exchange queue indicating a pad has been published
 *
 * @param  {String}     contentId   The OAE content ID of the pad that was published
 * @param  {String}     userId      The user ID that made the edit
 */
var publish = module.exports.publish = function(contentId, userId) {
    if (!taskExchange) {
        console.error('Tried to publish an event before we were connected to the task exchange');
        return;
    }

    var data = {
        'contentId': contentId,
        'userId': userId
    };
    taskExchange.publish('oae-content/etherpad-publish', data, null, function(err) {
        if (err) {
            console.error('Failed to publish for %s and %s', contentId, userId);
            return;
        }
    });
};
