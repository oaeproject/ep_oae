/**
 * A hook that gets called when the edit has been initialized.
 *
 * @param  {String}   hook_name The name of the hook (postAceInit in this case).
 * @param  {Object}   args      A set of arguments
 * @param  {Function} cb        Standard etherpad callback function
 */
exports.postAceInit = function (hook_name, args, cb) {
    // Disable the input field where the user can change his or her name.
    $('#myusernameedit').prop('disabled', true);
};
