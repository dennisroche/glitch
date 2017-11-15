/*jshint browser:true */
/*!
* Change external links to open in a new window
*
*/

$.expr[':'].external = function(obj) {
    return !obj.href.match(/^mailto\:/) && (obj.hostname != location.hostname);
};

$('a:external').attr({
   target: "_blank",
   title: "Opens in a new window"
});
