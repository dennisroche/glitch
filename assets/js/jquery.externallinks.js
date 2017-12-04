/*jshint browser:true */
/*!
* Change external links to open in a new window
*
*/

$.expr[':'].external = function(obj) {
    return !obj.href.match(/^mailto\:/) && (obj.hostname != location.hostname);
};

// only mark external links within content
var content = $('.post-full-content, .post-card-content, .author-card-content');
content.find('a:external').attr({
   target: "_blank",
   title: "Opens in a new window"
});
