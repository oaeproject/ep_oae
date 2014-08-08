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
    // Replace the bold icon with a font awesome icon
    $('.buttonicon-bold').html('<i class="icon-bold"></i>');
    // Replace the italic icon with a font awesome icon
    $('.buttonicon-italic').html('<i class="icon-italic"></i>');
    // Replace the underline icon with a font awesome icon
    $('.buttonicon-underline').html('<i class="icon-underline"></i>');
    // Replace the strikethrough icon with a font awesome icon
    $('.buttonicon-strikethrough').html('<i class="icon-strikethrough"></i>');
    // Replace the insertorderedlist icon with a font awesome icon
    $('.buttonicon-insertorderedlist').html('<i class="icon-list-ol"></i>');
    // Replace the insertunorderedlist icon with a font awesome icon
    $('.buttonicon-insertunorderedlist').html('<i class="icon-list-ul"></i>');
    // Replace the indent icon with a font awesome icon
    $('.buttonicon-indent').html('<i class="icon-indent-right"></i>');
    // Replace the outdent icon with a font awesome icon
    $('.buttonicon-outdent').html('<i class="icon-indent-left"></i>');
    // Replace the showusers icon with a font awesome icon
    $('.buttonicon-showusers').html('<i class="icon-user"></i>');
    // Add the custom authorship colour toggle button
    $('#headings').after('<li data-type="button" data-key="strikethrough"><label for="options-colorscheck" data-l10n-id="pad.settings.colorcheck"><a class="grouped-right"><span class="buttonicon buttonicon-strikethrough" data-l10n-id="pad.settings.colorcheck" title="Authorship colors"><i class="icon-adjust"></i></span></a></label></li>');
    // Show the toolbar
    $('.toolbar').animate({
        'height': '32px',
        'opacity': '1'
    }, 500);
    $('#editorcontainerbox').animate({
        'top': '49px',
    }, 500);
};
