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

var _ = require('ep_etherpad-lite/node_modules/underscore');

var PadMessageHandler = require('ep_etherpad-lite/node/handler/PadMessageHandler');

var MQ = require('./MQ');

/*
 * Map an object containing the recent authors (and the last time they made an edit) to a pad ID
 *
 * ```
 * {
 *     "pad:foo": {
 *         "a.kfjsklf": {"time": 123, "edit": false, "user": "u:cam:simong", "contentId": "c:cam:abc"},
 *         "a.nnmxcc": {"time": 756, "edit": true, "user": "u:cam:nico", "contentId": "c:cam:abc"}
 *     },
 *     "pad:bar": {
 *         "a.nnmxcc": {"time": 1456, "edit": false, "user": "u:cam:nico", "contentId": "c:cam:def"}
 *     }
 * }
 * ```
 */
var recentAuthors = {};

// The interval (in ms) when we should check if a user left the pad and notify OAE of any edits that were made
var INTERVAL = 60 * 1000;

// The amount of time (in ms) after which we consider a user to have left the pad. This timespan
// should only be used in extra-ordinary situations to prevent memory leaks
var TTL = 24 * 60 * 60 * 1000;

/**
 * Add a user to the recent authors list for a pad
 *
 * @param  {String}     padId       The Etherpad pad ID of the pad that was joined
 * @param  {String}     authorId    The Etherpad author ID of the author joining
 * @param  {String}     userId      The OAE user ID of the user joining
 * @param  {String}     contentId   The OAE content ID of the pad the user joined
 * @param  {String}     contentId   The OAE display name of the pad the user joined
 */
var join = module.exports.join = function(padId, authorId, userId, contentId, displayName) {
    // Create an entry for this pad if necessary
    recentAuthors[padId] = recentAuthors[padId] || {};

    // Create an entry for this author in this pad if necessary
    recentAuthors[padId][authorId] = recentAuthors[padId][authorId] || {
        'edit': false,
        'time': Date.now(),
        'userId': userId,
        'contentId': contentId,
        'displayName': displayName
    };
};

/**
 * Mark a user as an editor of a pad
 *
 * @param  {String}     padId       The Etherpad pad ID
 * @param  {String}     authorId    The Etherpad author id
 */
var madeEdit = module.exports.madeEdit = function(padId, authorId) {
    if (recentAuthors[padId] && recentAuthors[padId][authorId]) {
        recentAuthors[padId][authorId].edit = true;
        recentAuthors[padId][authorId].time = Date.now();
    }
};

/**
 * Remove a user from a pad. If this user made any edits,
 * a RabbitMQ message will be sent to OAE indicating this change
 *
 * @param  {String}     padId       The Etherpad pad ID
 * @param  {String}     authorId    The Etherpad author id
 */
var leave = module.exports.leave = function(padId, authorId) {
    if (recentAuthors[padId] && recentAuthors[padId][authorId]) {
        // If the author made an actual edit, we'll trigger a publish event
        if (recentAuthors[padId][authorId].edit &&
            recentAuthors[padId][authorId].userId &&
            recentAuthors[padId][authorId].contentId) {
            MQ.publish(recentAuthors[padId][authorId].contentId, recentAuthors[padId][authorId].userId);
        }

        // Remove the author's entry
        delete recentAuthors[padId][authorId];
    }

    // If the last author just left the pad, clean up the entry for this pad
    if (_.isEmpty(recentAuthors[padId])) {
        delete recentAuthors[padId];
    }
};

/**
 * Get the OAE display name of an Etherpad pad by pad ID.
 *
 * @param  {String}      padId                   The Etherpad pad ID
 * @param  {String}      authorId                The Etherpad author id
 *
 * @return {String}                              The OAE display name of the Etherpad pad
 */
var getPadDisplayName = module.exports.getPadDisplayName = function(padId, authorId, callback) {
    return recentAuthors[padId][authorId].displayName;
};

/**
 * Check which users have left any of the pads since the last check. If the user is no longer
 * in the pad, we will remove his user info object. When the user made any changes to the pad,
 * OAE will be notified of the change through a RabbitMQ message. That allows an appropriate
 * activity to be published in the activity stream and a revision can be created.
 *
 * In case the users for a pad can't be determined, we'll allow for a certain TTL
 * after which the users will be removed.
 *
 * @api private
 */
var _checkForLeftUsers = function() {
    var now = Date.now();
    _.each(recentAuthors, function(pad, padId) {
        PadMessageHandler.padUsers(padId, function(err, data) {
            if (err) {
                console.error('Could not determine pad users for %s. This could lead to a memory leak!', padId, err);
            }

            _.each(pad, function(authorInfo, authorId) {
                // Check if the user has left the pad
                var padUser = _.find(data.padUsers, function(user) { return (user.id === authorId); });
                var hasLeft = !padUser;

                // Calculate how long ago a user made an edit. If it's been longer
                // than the `TTL`, the user is removed to avoid memory leaks
                var timeSinceEdit = now - authorInfo.time;

                if (hasLeft || (timeSinceEdit > TTL)) {
                    leave(padId, authorId);
                }
            });
        });
    });
};

// Clean up the authors periodically
setInterval(_checkForLeftUsers, INTERVAL);
