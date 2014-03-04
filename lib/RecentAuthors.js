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

/*
 * Maps an object containing the recent authors (and the last time they made an edit) to a pad ID
 * {
 *     "pad:foo": {
 *         "simong": <timestamp>
 *         "mrvisser": <timestamp>
 *     },
 *     "pad:bar": {
 *         "nico": <timestamp>
 *     }
 * }
 */
var recentAuthors = {};

// The amount of time after an edit an author is considered to be "recent"
var TTL = 15 * 60 * 1000;

/**
 * Add or update a recent author
 *
 * @param  {String}     padId       The identifier of the pad where an edit was made
 * @param  {String}     authorId    The author who made the edit
 */
var addRecentAuthor = module.exports.addRecentAuthor = function(padId, authorId) {
    recentAuthors[padId] = recentAuthors[padId] || {}
    recentAuthors[padId][authorId] = Date.now();
};

/**
 * Checks if an author has made a change in a pad recently.
 * If he has, he will be removed from the set of recent authors.
 *
 * @param  {String}     padId       The identifier of the pad to check
 * @param  {String}     authorId    The author to check
 * @return {Boolean}                `true` if the author made a change recently, `false` otherwise
 */
var checkAndClearRecentAuthor = module.exports.checkAndClearRecentAuthor = function(padId, authorId) {
    var isRecent = _isRecentAuthor(padId, authorId);

    // Clear out the recent author
    if (isRecent) {
        delete recentAuthors[padId][authorId];
    }

    return isRecent;
};

/**
 * Checks if an author has made a change in a pad recently.
 *
 * @param  {String}     padId       The identifier of the pad to check
 * @param  {String}     authorId    The author to check
 * @return {Boolean}                `true` if the author made a change recently, `false` otherwise
 * @api private
 */
var _isRecentAuthor = function(padId, authorId) {
    if (!recentAuthors[padId] || !recentAuthors[padId][authorId]) {
        return false;
    }

    return (recentAuthors[padId][authorId] > (Date.now() - TTL));
};

/**
 * In order to not exposes ourselves to a memory leak, we drop all those authors
 * who haven't made an edit in a while as they are not considered to be "recent"
 * anymore.
 *
 * @api private
 */
var expireOldAuthors = function() {
    var now = Date.now();

    Object.keys(recentAuthors).forEach(function(padId) {
        var padAuthors = Object.keys(recentAuthors[padId]);
        padAuthors.forEach(function(padAuthor) {
            // If the author's change was longer than `TTL` milliseconds ago, we remove him from the recent authors object
            if (now > (padAuthors[padAuthor] + TTL)) {
                delete padAuthors[padAuthor];
            }
        });

        // In case all recent authors left the pad, we clean up the empty object
        if (Object.keys(recentAuthors[padId]).length === 0) {
            delete recentAuthors[padId];
        }
    });
};

// Clean up the authors periodically
setInterval(expireOldAuthors, TTL);
