/*!
 * Copyright 2012 Sakai Foundation (SF) Licensed under the
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

var Crypto = require('crypto');

var settings = require('ep_etherpad-lite/node/utils/Settings.js');

exports.expressCreateServer = function(hook, args, callback) {
    args.app.use(function(req, res, next) {
        if (req.query.sessionID && verifySignature(req.query.tenantAlias, req.query.expires, req.query.sessionID, req.query.signature)) {
            req.cookies.sessionID = req.query.sessionID;
            res.cookie('sessionID', req.query.sessionID);
        }
        next();
    });
    callback();
};

/**
 * Verifies a signature.
 *
 * @param  {String}     tenantAlias     The alias of the tenant for which we're verifying a message.
 * @param  {Number}     expires         When this signature expires.
 * @param  {String}     body            The string on which the signature is generated.
 * @param  {String}     signature       The signature for the body.
 * @return {Boolean}                    Whether or not the passed in signature is correct.
 */
var verifySignature = function(tenantAlias, expires, body, signature) {
    expires = parseInt(expires, 10);

    // Check the expiry date.
    if (Date.now() > expires) {
        return false;
    }

    // Check the signature.
    var msg = tenantAlias + '#' + expires + '#' + body;
    var signKey = settings.ep_oae.signKey;
    var hmac = Crypto.createHmac('sha1', signKey);
    hmac.update(msg);
    var generatedSig = hmac.digest('hex');
    return generatedSig === signature;
};
