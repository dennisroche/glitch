/* http://prismjs.com/download.html?themes=prism&languages=markup+css+clike+javascript+aspnet+csharp+ruby+diff+docker+fsharp+git+handlebars+haskell+json+kotlin+powershell+jsx+sass+scss+sql+swift+typescript+yaml&plugins=line-highlight+line-numbers+show-invisibles+command-line */
var _self = (typeof window !== 'undefined')
? window   // if in browser
: (
    (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
    ? self // if in worker
    : {}   // if in node js
);

/**
* Prism: Lightweight, robust, elegant syntax highlighting
* MIT license http://www.opensource.org/licenses/mit-license.php/
* @author Lea Verou http://lea.verou.me
*/

var Prism = (function(){

// Private helper vars
var lang = /\blang(?:uage)?-(\w+)\b/i;
var uniqueId = 0;

var _ = _self.Prism = {
manual: _self.Prism && _self.Prism.manual,
util: {
    encode: function (tokens) {
        if (tokens instanceof Token) {
            return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
        } else if (_.util.type(tokens) === 'Array') {
            return tokens.map(_.util.encode);
        } else {
            return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
        }
    },

    type: function (o) {
        return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
    },

    objId: function (obj) {
        if (!obj['__id']) {
            Object.defineProperty(obj, '__id', { value: ++uniqueId });
        }
        return obj['__id'];
    },

    // Deep clone a language definition (e.g. to extend it)
    clone: function (o) {
        var type = _.util.type(o);

        switch (type) {
            case 'Object':
                var clone = {};

                for (var key in o) {
                    if (o.hasOwnProperty(key)) {
                        clone[key] = _.util.clone(o[key]);
                    }
                }

                return clone;

            case 'Array':
                return o.map(function(v) { return _.util.clone(v); });
        }

        return o;
    }
},

languages: {
    extend: function (id, redef) {
        var lang = _.util.clone(_.languages[id]);

        for (var key in redef) {
            lang[key] = redef[key];
        }

        return lang;
    },

    /**
     * Insert a token before another token in a language literal
     * As this needs to recreate the object (we cannot actually insert before keys in object literals),
     * we cannot just provide an object, we need anobject and a key.
     * @param inside The key (or language id) of the parent
     * @param before The key to insert before. If not provided, the function appends instead.
     * @param insert Object with the key/value pairs to insert
     * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
     */
    insertBefore: function (inside, before, insert, root) {
        root = root || _.languages;
        var grammar = root[inside];

        if (arguments.length == 2) {
            insert = arguments[1];

            for (var newToken in insert) {
                if (insert.hasOwnProperty(newToken)) {
                    grammar[newToken] = insert[newToken];
                }
            }

            return grammar;
        }

        var ret = {};

        for (var token in grammar) {

            if (grammar.hasOwnProperty(token)) {

                if (token == before) {

                    for (var newToken in insert) {

                        if (insert.hasOwnProperty(newToken)) {
                            ret[newToken] = insert[newToken];
                        }
                    }
                }

                ret[token] = grammar[token];
            }
        }

        // Update references in other language definitions
        _.languages.DFS(_.languages, function(key, value) {
            if (value === root[inside] && key != inside) {
                this[key] = ret;
            }
        });

        return root[inside] = ret;
    },

    // Traverse a language definition with Depth First Search
    DFS: function(o, callback, type, visited) {
        visited = visited || {};
        for (var i in o) {
            if (o.hasOwnProperty(i)) {
                callback.call(o, i, o[i], type || i);

                if (_.util.type(o[i]) === 'Object' && !visited[_.util.objId(o[i])]) {
                    visited[_.util.objId(o[i])] = true;
                    _.languages.DFS(o[i], callback, null, visited);
                }
                else if (_.util.type(o[i]) === 'Array' && !visited[_.util.objId(o[i])]) {
                    visited[_.util.objId(o[i])] = true;
                    _.languages.DFS(o[i], callback, i, visited);
                }
            }
        }
    }
},
plugins: {},

highlightAll: function(async, callback) {
    var env = {
        callback: callback,
        selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
    };

    _.hooks.run("before-highlightall", env);

    var elements = env.elements || document.querySelectorAll(env.selector);

    for (var i=0, element; element = elements[i++];) {
        _.highlightElement(element, async === true, env.callback);
    }
},

highlightElement: function(element, async, callback) {
    // Find language
    var language, grammar, parent = element;

    while (parent && !lang.test(parent.className)) {
        parent = parent.parentNode;
    }

    if (parent) {
        language = (parent.className.match(lang) || [,''])[1].toLowerCase();
        grammar = _.languages[language];
    }

    // Set language on the element, if not present
    element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

    // Set language on the parent, for styling
    parent = element.parentNode;

    if (/pre/i.test(parent.nodeName)) {
        parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
    }

    var code = element.textContent;

    var env = {
        element: element,
        language: language,
        grammar: grammar,
        code: code
    };

    _.hooks.run('before-sanity-check', env);

    if (!env.code || !env.grammar) {
        if (env.code) {
            _.hooks.run('before-highlight', env);
            env.element.textContent = env.code;
            _.hooks.run('after-highlight', env);
        }
        _.hooks.run('complete', env);
        return;
    }

    _.hooks.run('before-highlight', env);

    if (async && _self.Worker) {
        var worker = new Worker(_.filename);

        worker.onmessage = function(evt) {
            env.highlightedCode = evt.data;

            _.hooks.run('before-insert', env);

            env.element.innerHTML = env.highlightedCode;

            callback && callback.call(env.element);
            _.hooks.run('after-highlight', env);
            _.hooks.run('complete', env);
        };

        worker.postMessage(JSON.stringify({
            language: env.language,
            code: env.code,
            immediateClose: true
        }));
    }
    else {
        env.highlightedCode = _.highlight(env.code, env.grammar, env.language);

        _.hooks.run('before-insert', env);

        env.element.innerHTML = env.highlightedCode;

        callback && callback.call(element);

        _.hooks.run('after-highlight', env);
        _.hooks.run('complete', env);
    }
},

highlight: function (text, grammar, language) {
    var tokens = _.tokenize(text, grammar);
    return Token.stringify(_.util.encode(tokens), language);
},

matchGrammar: function (text, strarr, grammar, index, startPos, oneshot, target) {
    var Token = _.Token;

    for (var token in grammar) {
        if(!grammar.hasOwnProperty(token) || !grammar[token]) {
            continue;
        }

        if (token == target) {
            return;
        }

        var patterns = grammar[token];
        patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];

        for (var j = 0; j < patterns.length; ++j) {
            var pattern = patterns[j],
                inside = pattern.inside,
                lookbehind = !!pattern.lookbehind,
                greedy = !!pattern.greedy,
                lookbehindLength = 0,
                alias = pattern.alias;

            if (greedy && !pattern.pattern.global) {
                // Without the global flag, lastIndex won't work
                var flags = pattern.pattern.toString().match(/[imuy]*$/)[0];
                pattern.pattern = RegExp(pattern.pattern.source, flags + "g");
            }

            pattern = pattern.pattern || pattern;

            // Don’t cache length as it changes during the loop
            for (var i = index, pos = startPos; i < strarr.length; pos += strarr[i].length, ++i) {

                var str = strarr[i];

                if (strarr.length > text.length) {
                    // Something went terribly wrong, ABORT, ABORT!
                    return;
                }

                if (str instanceof Token) {
                    continue;
                }

                pattern.lastIndex = 0;

                var match = pattern.exec(str),
                    delNum = 1;

                // Greedy patterns can override/remove up to two previously matched tokens
                if (!match && greedy && i != strarr.length - 1) {
                    pattern.lastIndex = pos;
                    match = pattern.exec(text);
                    if (!match) {
                        break;
                    }

                    var from = match.index + (lookbehind ? match[1].length : 0),
                        to = match.index + match[0].length,
                        k = i,
                        p = pos;

                    for (var len = strarr.length; k < len && (p < to || (!strarr[k].type && !strarr[k - 1].greedy)); ++k) {
                        p += strarr[k].length;
                        // Move the index i to the element in strarr that is closest to from
                        if (from >= p) {
                            ++i;
                            pos = p;
                        }
                    }

                    /*
                     * If strarr[i] is a Token, then the match starts inside another Token, which is invalid
                     * If strarr[k - 1] is greedy we are in conflict with another greedy pattern
                     */
                    if (strarr[i] instanceof Token || strarr[k - 1].greedy) {
                        continue;
                    }

                    // Number of tokens to delete and replace with the new match
                    delNum = k - i;
                    str = text.slice(pos, p);
                    match.index -= pos;
                }

                if (!match) {
                    if (oneshot) {
                        break;
                    }

                    continue;
                }

                if(lookbehind) {
                    lookbehindLength = match[1].length;
                }

                var from = match.index + lookbehindLength,
                    match = match[0].slice(lookbehindLength),
                    to = from + match.length,
                    before = str.slice(0, from),
                    after = str.slice(to);

                var args = [i, delNum];

                if (before) {
                    ++i;
                    pos += before.length;
                    args.push(before);
                }

                var wrapped = new Token(token, inside? _.tokenize(match, inside) : match, alias, match, greedy);

                args.push(wrapped);

                if (after) {
                    args.push(after);
                }

                Array.prototype.splice.apply(strarr, args);

                if (delNum != 1)
                    _.matchGrammar(text, strarr, grammar, i, pos, true, token);

                if (oneshot)
                    break;
            }
        }
    }
},

tokenize: function(text, grammar, language) {
    var strarr = [text];

    var rest = grammar.rest;

    if (rest) {
        for (var token in rest) {
            grammar[token] = rest[token];
        }

        delete grammar.rest;
    }

    _.matchGrammar(text, strarr, grammar, 0, 0, false);

    return strarr;
},

hooks: {
    all: {},

    add: function (name, callback) {
        var hooks = _.hooks.all;

        hooks[name] = hooks[name] || [];

        hooks[name].push(callback);
    },

    run: function (name, env) {
        var callbacks = _.hooks.all[name];

        if (!callbacks || !callbacks.length) {
            return;
        }

        for (var i=0, callback; callback = callbacks[i++];) {
            callback(env);
        }
    }
}
};

var Token = _.Token = function(type, content, alias, matchedStr, greedy) {
this.type = type;
this.content = content;
this.alias = alias;
// Copy of the full string this token was created from
this.length = (matchedStr || "").length|0;
this.greedy = !!greedy;
};

Token.stringify = function(o, language, parent) {
if (typeof o == 'string') {
    return o;
}

if (_.util.type(o) === 'Array') {
    return o.map(function(element) {
        return Token.stringify(element, language, o);
    }).join('');
}

var env = {
    type: o.type,
    content: Token.stringify(o.content, language, parent),
    tag: 'span',
    classes: ['token', o.type],
    attributes: {},
    language: language,
    parent: parent
};

if (o.alias) {
    var aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
    Array.prototype.push.apply(env.classes, aliases);
}

_.hooks.run('wrap', env);

var attributes = Object.keys(env.attributes).map(function(name) {
    return name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
}).join(' ');

return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + (attributes ? ' ' + attributes : '') + '>' + env.content + '</' + env.tag + '>';

};

if (!_self.document) {
if (!_self.addEventListener) {
    // in Node.js
    return _self.Prism;
}
 // In worker
_self.addEventListener('message', function(evt) {
    var message = JSON.parse(evt.data),
        lang = message.language,
        code = message.code,
        immediateClose = message.immediateClose;

    _self.postMessage(_.highlight(code, _.languages[lang], lang));
    if (immediateClose) {
        _self.close();
    }
}, false);

return _self.Prism;
}

//Get current script and highlight
var script = document.currentScript || [].slice.call(document.getElementsByTagName("script")).pop();

if (script) {
_.filename = script.src;

if (!_.manual && !script.hasAttribute('data-manual')) {
    if(document.readyState !== "loading") {
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(_.highlightAll);
        } else {
            window.setTimeout(_.highlightAll, 16);
        }
    }
    else {
        document.addEventListener('DOMContentLoaded', _.highlightAll);
    }
}
}

return _self.Prism;

})();

if (typeof module !== 'undefined' && module.exports) {
module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof global !== 'undefined') {
global.Prism = Prism;
}
;
Prism.languages.markup = {
'comment': /<!--[\s\S]*?-->/,
'prolog': /<\?[\s\S]+?\?>/,
'doctype': /<!DOCTYPE[\s\S]+?>/i,
'cdata': /<!\[CDATA\[[\s\S]*?]]>/i,
'tag': {
    pattern: /<\/?(?!\d)[^\s>\/=$<]+(?:\s+[^\s>\/=]+(?:=(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">=]+))?)*\s*\/?>/i,
    inside: {
        'tag': {
            pattern: /^<\/?[^\s>\/]+/i,
            inside: {
                'punctuation': /^<\/?/,
                'namespace': /^[^\s>\/:]+:/
            }
        },
        'attr-value': {
            pattern: /=(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">=]+)/i,
            inside: {
                'punctuation': [
                    /^=/,
                    {
                        pattern: /(^|[^\\])["']/,
                        lookbehind: true
                    }
                ]
            }
        },
        'punctuation': /\/?>/,
        'attr-name': {
            pattern: /[^\s>\/]+/,
            inside: {
                'namespace': /^[^\s>\/:]+:/
            }
        }

    }
},
'entity': /&#?[\da-z]{1,8};/i
};

Prism.languages.markup['tag'].inside['attr-value'].inside['entity'] =
Prism.languages.markup['entity'];

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function(env) {

if (env.type === 'entity') {
    env.attributes['title'] = env.content.replace(/&amp;/, '&');
}
});

Prism.languages.xml = Prism.languages.markup;
Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;

Prism.languages.css = {
'comment': /\/\*[\s\S]*?\*\//,
'atrule': {
    pattern: /@[\w-]+?.*?(?:;|(?=\s*\{))/i,
    inside: {
        'rule': /@[\w-]+/
        // See rest below
    }
},
'url': /url\((?:(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1|.*?)\)/i,
'selector': /[^{}\s][^{};]*?(?=\s*\{)/,
'string': {
    pattern: /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    greedy: true
},
'property': /[\w-]+(?=\s*:)/i,
'important': /\B!important\b/i,
'function': /[-a-z0-9]+(?=\()/i,
'punctuation': /[(){};:]/
};

Prism.languages.css['atrule'].inside.rest = Prism.util.clone(Prism.languages.css);

if (Prism.languages.markup) {
Prism.languages.insertBefore('markup', 'tag', {
    'style': {
        pattern: /(<style[\s\S]*?>)[\s\S]*?(?=<\/style>)/i,
        lookbehind: true,
        inside: Prism.languages.css,
        alias: 'language-css'
    }
});

Prism.languages.insertBefore('inside', 'attr-value', {
    'style-attr': {
        pattern: /\s*style=("|')(?:\\[\s\S]|(?!\1)[^\\])*\1/i,
        inside: {
            'attr-name': {
                pattern: /^\s*style/i,
                inside: Prism.languages.markup.tag.inside
            },
            'punctuation': /^\s*=\s*['"]|['"]\s*$/,
            'attr-value': {
                pattern: /.+/i,
                inside: Prism.languages.css
            }
        },
        alias: 'language-css'
    }
}, Prism.languages.markup.tag);
};
Prism.languages.clike = {
'comment': [
    {
        pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
        lookbehind: true
    },
    {
        pattern: /(^|[^\\:])\/\/.*/,
        lookbehind: true
    }
],
'string': {
    pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    greedy: true
},
'class-name': {
    pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[\w.\\]+/i,
    lookbehind: true,
    inside: {
        punctuation: /[.\\]/
    }
},
'keyword': /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
'boolean': /\b(?:true|false)\b/,
'function': /[a-z0-9_]+(?=\()/i,
'number': /\b-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)\b/i,
'operator': /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,
'punctuation': /[{}[\];(),.:]/
};

Prism.languages.javascript = Prism.languages.extend('clike', {
'keyword': /\b(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/,
'number': /\b-?(?:0[xX][\dA-Fa-f]+|0[bB][01]+|0[oO][0-7]+|\d*\.?\d+(?:[Ee][+-]?\d+)?|NaN|Infinity)\b/,
// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
'function': /[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*(?=\s*\()/i,
'operator': /-[-=]?|\+[+=]?|!=?=?|<<?=?|>>?>?=?|=(?:==?|>)?|&[&=]?|\|[|=]?|\*\*?=?|\/=?|~|\^=?|%=?|\?|\.{3}/
});

Prism.languages.insertBefore('javascript', 'keyword', {
'regex': {
    pattern: /(^|[^/])\/(?!\/)(\[[^\]\r\n]+]|\\.|[^/\\\[\r\n])+\/[gimyu]{0,5}(?=\s*($|[\r\n,.;})]))/,
    lookbehind: true,
    greedy: true
},
// This must be declared before keyword because we use "function" inside the look-forward
'function-variable': {
    pattern: /[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*(?=\s*=\s*(?:function\b|(?:\([^()]*\)|[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*)\s*=>))/i,
    alias: 'function'
}
});

Prism.languages.insertBefore('javascript', 'string', {
'template-string': {
    pattern: /`(?:\\[\s\S]|[^\\`])*`/,
    greedy: true,
    inside: {
        'interpolation': {
            pattern: /\$\{[^}]+\}/,
            inside: {
                'interpolation-punctuation': {
                    pattern: /^\$\{|\}$/,
                    alias: 'punctuation'
                },
                rest: Prism.languages.javascript
            }
        },
        'string': /[\s\S]+/
    }
}
});

if (Prism.languages.markup) {
Prism.languages.insertBefore('markup', 'tag', {
    'script': {
        pattern: /(<script[\s\S]*?>)[\s\S]*?(?=<\/script>)/i,
        lookbehind: true,
        inside: Prism.languages.javascript,
        alias: 'language-javascript'
    }
});
}

Prism.languages.js = Prism.languages.javascript;

Prism.languages.aspnet = Prism.languages.extend('markup', {
'page-directive tag': {
    pattern: /<%\s*@.*%>/i,
    inside: {
        'page-directive tag': /<%\s*@\s*(?:Assembly|Control|Implements|Import|Master(?:Type)?|OutputCache|Page|PreviousPageType|Reference|Register)?|%>/i,
        rest: Prism.languages.markup.tag.inside
    }
},
'directive tag': {
    pattern: /<%.*%>/i,
    inside: {
        'directive tag': /<%\s*?[$=%#:]{0,2}|%>/i,
        rest: Prism.languages.csharp
    }
}
});
// Regexp copied from prism-markup, with a negative look-ahead added
Prism.languages.aspnet.tag.pattern = /<(?!%)\/?[^\s>\/]+(?:\s+[^\s>\/=]+(?:=(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">=]+))?)*\s*\/?>/i;

// match directives of attribute value foo="<% Bar %>"
Prism.languages.insertBefore('inside', 'punctuation', {
'directive tag': Prism.languages.aspnet['directive tag']
}, Prism.languages.aspnet.tag.inside["attr-value"]);

Prism.languages.insertBefore('aspnet', 'comment', {
'asp comment': /<%--[\s\S]*?--%>/
});

// script runat="server" contains csharp, not javascript
Prism.languages.insertBefore('aspnet', Prism.languages.javascript ? 'script' : 'tag', {
'asp script': {
    pattern: /(<script(?=.*runat=['"]?server['"]?)[\s\S]*?>)[\s\S]*?(?=<\/script>)/i,
    lookbehind: true,
    inside: Prism.languages.csharp || {}
}
});
Prism.languages.csharp = Prism.languages.extend('clike', {
'keyword': /\b(abstract|as|async|await|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|virtual|void|volatile|while|add|alias|ascending|async|await|descending|dynamic|from|get|global|group|into|join|let|orderby|partial|remove|select|set|value|var|where|yield)\b/,
'string': [
    {
        pattern: /@("|')(?:\1\1|\\[\s\S]|(?!\1)[^\\])*\1/,
        greedy: true
    },
    {
        pattern: /("|')(?:\\.|(?!\1)[^\\\r\n])*?\1/,
        greedy: true
    }
],
'number': /\b-?(?:0x[\da-f]+|\d*\.?\d+f?)\b/i
});

Prism.languages.insertBefore('csharp', 'keyword', {
'generic-method': {
    pattern: /[a-z0-9_]+\s*<[^>\r\n]+?>\s*(?=\()/i,
    alias: 'function',
    inside: {
        keyword: Prism.languages.csharp.keyword,
        punctuation: /[<>(),.:]/
    }
},
'preprocessor': {
    pattern: /(^\s*)#.*/m,
    lookbehind: true,
    alias: 'property',
    inside: {
        // highlight preprocessor directives as keywords
        'directive': {
            pattern: /(\s*#)\b(?:define|elif|else|endif|endregion|error|if|line|pragma|region|undef|warning)\b/,
            lookbehind: true,
            alias: 'keyword'
        }
    }
}
});

/**
* Original by Samuel Flores
*
* Adds the following new token classes:
* 		constant, builtin, variable, symbol, regex
*/
(function(Prism) {
Prism.languages.ruby = Prism.languages.extend('clike', {
    'comment': [
        /#(?!\{[^\r\n]*?\}).*/,
        /^=begin(?:\r?\n|\r)(?:.*(?:\r?\n|\r))*?=end/m
    ],
    'keyword': /\b(?:alias|and|BEGIN|begin|break|case|class|def|define_method|defined|do|each|else|elsif|END|end|ensure|false|for|if|in|module|new|next|nil|not|or|raise|redo|require|rescue|retry|return|self|super|then|throw|true|undef|unless|until|when|while|yield)\b/
});

var interpolation = {
    pattern: /#\{[^}]+\}/,
    inside: {
        'delimiter': {
            pattern: /^#\{|\}$/,
            alias: 'tag'
        },
        rest: Prism.util.clone(Prism.languages.ruby)
    }
};

Prism.languages.insertBefore('ruby', 'keyword', {
    'regex': [
        {
            pattern: /%r([^a-zA-Z0-9\s{(\[<])(?:(?!\1)[^\\]|\\[\s\S])*\1[gim]{0,3}/,
            greedy: true,
            inside: {
                'interpolation': interpolation
            }
        },
        {
            pattern: /%r\((?:[^()\\]|\\[\s\S])*\)[gim]{0,3}/,
            greedy: true,
            inside: {
                'interpolation': interpolation
            }
        },
        {
            // Here we need to specifically allow interpolation
            pattern: /%r\{(?:[^#{}\\]|#(?:\{[^}]+\})?|\\[\s\S])*\}[gim]{0,3}/,
            greedy: true,
            inside: {
                'interpolation': interpolation
            }
        },
        {
            pattern: /%r\[(?:[^\[\]\\]|\\[\s\S])*\][gim]{0,3}/,
            greedy: true,
            inside: {
                'interpolation': interpolation
            }
        },
        {
            pattern: /%r<(?:[^<>\\]|\\[\s\S])*>[gim]{0,3}/,
            greedy: true,
            inside: {
                'interpolation': interpolation
            }
        },
        {
            pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\\\r\n])+\/[gim]{0,3}(?=\s*($|[\r\n,.;})]))/,
            lookbehind: true,
            greedy: true
        }
    ],
    'variable': /[@$]+[a-zA-Z_]\w*(?:[?!]|\b)/,
    'symbol': /:[a-zA-Z_]\w*(?:[?!]|\b)/
});

Prism.languages.insertBefore('ruby', 'number', {
    'builtin': /\b(?:Array|Bignum|Binding|Class|Continuation|Dir|Exception|FalseClass|File|Stat|Fixnum|Float|Hash|Integer|IO|MatchData|Method|Module|NilClass|Numeric|Object|Proc|Range|Regexp|String|Struct|TMS|Symbol|ThreadGroup|Thread|Time|TrueClass)\b/,
    'constant': /\b[A-Z]\w*(?:[?!]|\b)/
});

Prism.languages.ruby.string = [
    {
        pattern: /%[qQiIwWxs]?([^a-zA-Z0-9\s{(\[<])(?:(?!\1)[^\\]|\\[\s\S])*\1/,
        greedy: true,
        inside: {
            'interpolation': interpolation
        }
    },
    {
        pattern: /%[qQiIwWxs]?\((?:[^()\\]|\\[\s\S])*\)/,
        greedy: true,
        inside: {
            'interpolation': interpolation
        }
    },
    {
        // Here we need to specifically allow interpolation
        pattern: /%[qQiIwWxs]?\{(?:[^#{}\\]|#(?:\{[^}]+\})?|\\[\s\S])*\}/,
        greedy: true,
        inside: {
            'interpolation': interpolation
        }
    },
    {
        pattern: /%[qQiIwWxs]?\[(?:[^\[\]\\]|\\[\s\S])*\]/,
        greedy: true,
        inside: {
            'interpolation': interpolation
        }
    },
    {
        pattern: /%[qQiIwWxs]?<(?:[^<>\\]|\\[\s\S])*>/,
        greedy: true,
        inside: {
            'interpolation': interpolation
        }
    },
    {
        pattern: /("|')(?:#\{[^}]+\}|\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
        greedy: true,
        inside: {
            'interpolation': interpolation
        }
    }
];
}(Prism));
Prism.languages.diff = {
'coord': [
    // Match all kinds of coord lines (prefixed by "+++", "---" or "***").
    /^(?:\*{3}|-{3}|\+{3}).*$/m,
    // Match "@@ ... @@" coord lines in unified diff.
    /^@@.*@@$/m,
    // Match coord lines in normal diff (starts with a number).
    /^\d+.*$/m
],

// Match inserted and deleted lines. Support both +/- and >/< styles.
'deleted': /^[-<].*$/m,
'inserted': /^[+>].*$/m,

// Match "different" lines (prefixed with "!") in context diff.
'diff': {
    'pattern': /^!(?!!).+$/m,
    'alias': 'important'
}
};

Prism.languages.docker = {
'keyword': {
    pattern: /(^\s*)(?:ADD|ARG|CMD|COPY|ENTRYPOINT|ENV|EXPOSE|FROM|HEALTHCHECK|LABEL|MAINTAINER|ONBUILD|RUN|SHELL|STOPSIGNAL|USER|VOLUME|WORKDIR)(?=\s)/mi,
    lookbehind: true
},
'string': /("|')(?:(?!\1)[^\\\r\n]|\\(?:\r\n|[\s\S]))*\1/,
'comment': /#.*/,
'punctuation': /---|\.\.\.|[:[\]{}\-,|>?]/
};

Prism.languages.dockerfile = Prism.languages.docker;

Prism.languages.fsharp = Prism.languages.extend('clike', {
'comment': [
    {
        pattern: /(^|[^\\])\(\*[\s\S]*?\*\)/,
        lookbehind: true
    },
    {
        pattern: /(^|[^\\:])\/\/.*/,
        lookbehind: true
    }
],
'keyword': /\b(?:let|return|use|yield)(?:!\B|\b)|\b(abstract|and|as|assert|base|begin|class|default|delegate|do|done|downcast|downto|elif|else|end|exception|extern|false|finally|for|fun|function|global|if|in|inherit|inline|interface|internal|lazy|match|member|module|mutable|namespace|new|not|null|of|open|or|override|private|public|rec|select|static|struct|then|to|true|try|type|upcast|val|void|when|while|with|asr|land|lor|lsl|lsr|lxor|mod|sig|atomic|break|checked|component|const|constraint|constructor|continue|eager|event|external|fixed|functor|include|method|mixin|object|parallel|process|protected|pure|sealed|tailcall|trait|virtual|volatile)\b/,
'string': {
    pattern: /(?:"""[\s\S]*?"""|@"(?:""|[^"])*"|("|')(?:\\[\s\S]|(?!\1)[^\\])*\1)B?/,
    greedy: true
},
'number': [
    /\b-?0x[\da-fA-F]+(?:un|lf|LF)?\b/,
    /\b-?0b[01]+(?:y|uy)?\b/,
    /\b-?(?:\d*\.?\d+|\d+\.)(?:[fFmM]|[eE][+-]?\d+)?\b/,
    /\b-?\d+(?:y|uy|s|us|l|u|ul|L|UL|I)?\b/
]
});
Prism.languages.insertBefore('fsharp', 'keyword', {
'preprocessor': {
    pattern: /^[^\r\n\S]*#.*/m,
    alias: 'property',
    inside: {
        'directive': {
            pattern: /(\s*#)\b(?:else|endif|if|light|line|nowarn)\b/,
            lookbehind: true,
            alias: 'keyword'
        }
    }
}
});

Prism.languages.git = {
/*
 * A simple one line comment like in a git status command
 * For instance:
 * $ git status
 * # On branch infinite-scroll
 * # Your branch and 'origin/sharedBranches/frontendTeam/infinite-scroll' have diverged,
 * # and have 1 and 2 different commits each, respectively.
 * nothing to commit (working directory clean)
 */
'comment': /^#.*/m,

/*
 * Regexp to match the changed lines in a git diff output. Check the example below.
 */
'deleted': /^[-–].*/m,
'inserted': /^\+.*/m,

/*
 * a string (double and simple quote)
 */
'string': /("|')(?:\\.|(?!\1)[^\\\r\n])*\1/m,

/*
 * a git command. It starts with a random prompt finishing by a $, then "git" then some other parameters
 * For instance:
 * $ git add file.txt
 */
'command': {
    pattern: /^.*\$ git .*$/m,
    inside: {
        /*
         * A git command can contain a parameter starting by a single or a double dash followed by a string
         * For instance:
         * $ git diff --cached
         * $ git log -p
         */
        'parameter': /\s--?\w+/m
    }
},

/*
 * Coordinates displayed in a git diff command
 * For instance:
 * $ git diff
 * diff --git file.txt file.txt
 * index 6214953..1d54a52 100644
 * --- file.txt
 * +++ file.txt
 * @@ -1 +1,2 @@
 * -Here's my tetx file
 * +Here's my text file
 * +And this is the second line
 */
'coord': /^@@.*@@$/m,

/*
 * Match a "commit [SHA1]" line in a git log output.
 * For instance:
 * $ git log
 * commit a11a14ef7e26f2ca62d4b35eac455ce636d0dc09
 * Author: lgiraudel
 * Date:   Mon Feb 17 11:18:34 2014 +0100
 *
 *     Add of a new line
 */
'commit_sha1': /^commit \w{40}$/m
};

(function(Prism) {

var handlebars_pattern = /\{\{\{[\s\S]+?\}\}\}|\{\{[\s\S]+?\}\}/;

Prism.languages.handlebars = Prism.languages.extend('markup', {
    'handlebars': {
        pattern: handlebars_pattern,
        inside: {
            'delimiter': {
                pattern: /^\{\{\{?|\}\}\}?$/i,
                alias: 'punctuation'
            },
            'string': /(["'])(?:\\.|(?!\1)[^\\\r\n])*\1/,
            'number': /\b-?(?:0x[\dA-Fa-f]+|\d*\.?\d+(?:[Ee][+-]?\d+)?)\b/,
            'boolean': /\b(?:true|false)\b/,
            'block': {
                pattern: /^(\s*~?\s*)[#\/]\S+?(?=\s*~?\s*$|\s)/i,
                lookbehind: true,
                alias: 'keyword'
            },
            'brackets': {
                pattern: /\[[^\]]+\]/,
                inside: {
                    punctuation: /\[|\]/,
                    variable: /[\s\S]+/
                }
            },
            'punctuation': /[!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~]/,
            'variable': /[^!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~\s]+/
        }
    }
});

// Comments are inserted at top so that they can
// surround markup
Prism.languages.insertBefore('handlebars', 'tag', {
    'handlebars-comment': {
        pattern: /\{\{![\s\S]*?\}\}/,
        alias: ['handlebars','comment']
    }
});

// Tokenize all inline Handlebars expressions that are wrapped in {{ }} or {{{ }}}
// This allows for easy Handlebars + markup highlighting
Prism.hooks.add('before-highlight', function(env) {
    if (env.language !== 'handlebars') {
        return;
    }

    env.tokenStack = [];

    env.backupCode = env.code;
    env.code = env.code.replace(handlebars_pattern, function(match) {
        var i = env.tokenStack.length;
        // Check for existing strings
        while (env.backupCode.indexOf('___HANDLEBARS' + i + '___') !== -1)
            ++i;

        // Create a sparse array
        env.tokenStack[i] = match;

        return '___HANDLEBARS' + i + '___';
    });
});

// Restore env.code for other plugins (e.g. line-numbers)
Prism.hooks.add('before-insert', function(env) {
    if (env.language === 'handlebars') {
        env.code = env.backupCode;
        delete env.backupCode;
    }
});

// Re-insert the tokens after highlighting
// and highlight them with defined grammar
Prism.hooks.add('after-highlight', function(env) {
    if (env.language !== 'handlebars') {
        return;
    }

    for (var i = 0, keys = Object.keys(env.tokenStack); i < keys.length; ++i) {
        var k = keys[i];
        var t = env.tokenStack[k];

        // The replace prevents $$, $&, $`, $', $n, $nn from being interpreted as special patterns
        env.highlightedCode = env.highlightedCode.replace('___HANDLEBARS' + k + '___', Prism.highlight(t, env.grammar, 'handlebars').replace(/\$/g, '$$$$'));
    }

    env.element.innerHTML = env.highlightedCode;
});

}(Prism));

Prism.languages.haskell= {
'comment': {
    pattern: /(^|[^-!#$%*+=?&@|~.:<>^\\\/])(?:--[^-!#$%*+=?&@|~.:<>^\\\/].*|{-[\s\S]*?-})/m,
    lookbehind: true
},
'char': /'(?:[^\\']|\\(?:[abfnrtv\\"'&]|\^[A-Z@[\]^_]|NUL|SOH|STX|ETX|EOT|ENQ|ACK|BEL|BS|HT|LF|VT|FF|CR|SO|SI|DLE|DC1|DC2|DC3|DC4|NAK|SYN|ETB|CAN|EM|SUB|ESC|FS|GS|RS|US|SP|DEL|\d+|o[0-7]+|x[0-9a-fA-F]+))'/,
'string': {
    pattern: /"(?:[^\\"]|\\(?:[abfnrtv\\"'&]|\^[A-Z@[\]^_]|NUL|SOH|STX|ETX|EOT|ENQ|ACK|BEL|BS|HT|LF|VT|FF|CR|SO|SI|DLE|DC1|DC2|DC3|DC4|NAK|SYN|ETB|CAN|EM|SUB|ESC|FS|GS|RS|US|SP|DEL|\d+|o[0-7]+|x[0-9a-fA-F]+)|\\\s+\\)*"/,
    greedy: true
},
'keyword' : /\b(?:case|class|data|deriving|do|else|if|in|infixl|infixr|instance|let|module|newtype|of|primitive|then|type|where)\b/,
'import_statement' : {
    // The imported or hidden names are not included in this import
    // statement. This is because we want to highlight those exactly like
    // we do for the names in the program.
    pattern: /((?:\r?\n|\r|^)\s*)import\s+(?:qualified\s+)?(?:[A-Z][\w']*)(?:\.[A-Z][\w']*)*(?:\s+as\s+(?:[A-Z][_a-zA-Z0-9']*)(?:\.[A-Z][\w']*)*)?(?:\s+hiding\b)?/m,
    lookbehind: true,
    inside: {
        'keyword': /\b(?:import|qualified|as|hiding)\b/
    }
},
// These are builtin variables only. Constructors are highlighted later as a constant.
'builtin': /\b(?:abs|acos|acosh|all|and|any|appendFile|approxRational|asTypeOf|asin|asinh|atan|atan2|atanh|basicIORun|break|catch|ceiling|chr|compare|concat|concatMap|const|cos|cosh|curry|cycle|decodeFloat|denominator|digitToInt|div|divMod|drop|dropWhile|either|elem|encodeFloat|enumFrom|enumFromThen|enumFromThenTo|enumFromTo|error|even|exp|exponent|fail|filter|flip|floatDigits|floatRadix|floatRange|floor|fmap|foldl|foldl1|foldr|foldr1|fromDouble|fromEnum|fromInt|fromInteger|fromIntegral|fromRational|fst|gcd|getChar|getContents|getLine|group|head|id|inRange|index|init|intToDigit|interact|ioError|isAlpha|isAlphaNum|isAscii|isControl|isDenormalized|isDigit|isHexDigit|isIEEE|isInfinite|isLower|isNaN|isNegativeZero|isOctDigit|isPrint|isSpace|isUpper|iterate|last|lcm|length|lex|lexDigits|lexLitChar|lines|log|logBase|lookup|map|mapM|mapM_|max|maxBound|maximum|maybe|min|minBound|minimum|mod|negate|not|notElem|null|numerator|odd|or|ord|otherwise|pack|pi|pred|primExitWith|print|product|properFraction|putChar|putStr|putStrLn|quot|quotRem|range|rangeSize|read|readDec|readFile|readFloat|readHex|readIO|readInt|readList|readLitChar|readLn|readOct|readParen|readSigned|reads|readsPrec|realToFrac|recip|rem|repeat|replicate|return|reverse|round|scaleFloat|scanl|scanl1|scanr|scanr1|seq|sequence|sequence_|show|showChar|showInt|showList|showLitChar|showParen|showSigned|showString|shows|showsPrec|significand|signum|sin|sinh|snd|sort|span|splitAt|sqrt|subtract|succ|sum|tail|take|takeWhile|tan|tanh|threadToIOResult|toEnum|toInt|toInteger|toLower|toRational|toUpper|truncate|uncurry|undefined|unlines|until|unwords|unzip|unzip3|userError|words|writeFile|zip|zip3|zipWith|zipWith3)\b/,
// decimal integers and floating point numbers | octal integers | hexadecimal integers
'number' : /\b(?:\d+(?:\.\d+)?(?:e[+-]?\d+)?|0o[0-7]+|0x[0-9a-f]+)\b/i,
// Most of this is needed because of the meaning of a single '.'.
// If it stands alone freely, it is the function composition.
// It may also be a separator between a module name and an identifier => no
// operator. If it comes together with other special characters it is an
// operator too.
'operator' : /\s\.\s|[-!#$%*+=?&@|~.:<>^\\\/]*\.[-!#$%*+=?&@|~.:<>^\\\/]+|[-!#$%*+=?&@|~.:<>^\\\/]+\.[-!#$%*+=?&@|~.:<>^\\\/]*|[-!#$%*+=?&@|~:<>^\\\/]+|`([A-Z][\w']*\.)*[_a-z][\w']*`/,
// In Haskell, nearly everything is a variable, do not highlight these.
'hvariable': /\b(?:[A-Z][\w']*\.)*[_a-z][\w']*\b/,
'constant': /\b(?:[A-Z][\w']*\.)*[A-Z][\w']*\b/,
'punctuation' : /[{}[\];(),.:]/
};

Prism.languages.json = {
'property': /"(?:\\.|[^\\"\r\n])*"(?=\s*:)/i,
'string': {
    pattern: /"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    greedy: true
},
'number': /\b-?(?:0x[\dA-Fa-f]+|\d*\.?\d+(?:[Ee][+-]?\d+)?)\b/,
'punctuation': /[{}[\]);,]/,
'operator': /:/g,
'boolean': /\b(?:true|false)\b/i,
'null': /\bnull\b/i
};

Prism.languages.jsonp = Prism.languages.json;

(function (Prism) {
Prism.languages.kotlin = Prism.languages.extend('clike', {
    'keyword': {
        // The lookbehind prevents wrong highlighting of e.g. kotlin.properties.get
        pattern: /(^|[^.])\b(?:abstract|annotation|as|break|by|catch|class|companion|const|constructor|continue|crossinline|data|do|else|enum|final|finally|for|fun|get|if|import|in|init|inline|inner|interface|internal|is|lateinit|noinline|null|object|open|out|override|package|private|protected|public|reified|return|sealed|set|super|tailrec|this|throw|to|try|val|var|when|where|while)\b/,
        lookbehind: true
    },
    'function': [
        /\w+(?=\s*\()/,
        {
            pattern: /(\.)\w+(?=\s*\{)/,
            lookbehind: true
        }
    ],
    'number': /\b(?:0[bx][\da-fA-F]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?[fFL]?)\b/,
    'operator': /\+[+=]?|-[-=>]?|==?=?|!(?:!|==?)?|[\/*%<>]=?|[?:]:?|\.\.|&&|\|\||\b(?:and|inv|or|shl|shr|ushr|xor)\b/
});

delete Prism.languages.kotlin["class-name"];

Prism.languages.insertBefore('kotlin', 'string', {
    'raw-string': {
        pattern: /("""|''')[\s\S]*?\1/,
        alias: 'string'
        // See interpolation below
    }
});
Prism.languages.insertBefore('kotlin', 'keyword', {
    'annotation': {
        pattern: /\B@(?:\w+:)?(?:[A-Z]\w*|\[[^\]]+\])/,
        alias: 'builtin'
    }
});
Prism.languages.insertBefore('kotlin', 'function', {
    'label': {
        pattern: /\w+@|@\w+/,
        alias: 'symbol'
    }
});

var interpolation = [
    {
        pattern: /\$\{[^}]+\}/,
        inside: {
            delimiter: {
                pattern: /^\$\{|\}$/,
                alias: 'variable'
            },
            rest: Prism.util.clone(Prism.languages.kotlin)
        }
    },
    {
        pattern: /\$\w+/,
        alias: 'variable'
    }
];

Prism.languages.kotlin['string'].inside = Prism.languages.kotlin['raw-string'].inside = {
    interpolation: interpolation
};

}(Prism));
Prism.languages.powershell = {
'comment': [
    {
        pattern: /(^|[^`])<#[\s\S]*?#>/,
        lookbehind: true
    },
    {
        pattern: /(^|[^`])#.*/,
        lookbehind: true
    }
],
'string': [
    {
        pattern: /"(?:`[\s\S]|[^`"])*"/,
        greedy: true,
        inside: {
            'function': {
                pattern: /[^`]\$\(.*?\)/,
                // Populated at end of file
                inside: {}
            }
        }
    },
    {
        pattern: /'(?:[^']|'')*'/,
        greedy: true
    }
],
// Matches name spaces as well as casts, attribute decorators. Force starting with letter to avoid matching array indices
'namespace': /\[[a-z][\s\S]*?\]/i,
'boolean': /\$(?:true|false)\b/i,
'variable': /\$\w+\b/i,
// Cmdlets and aliases. Aliases should come last, otherwise "write" gets preferred over "write-host" for example
// Get-Command | ?{ $_.ModuleName -match "Microsoft.PowerShell.(Util|Core|Management)" }
// Get-Alias | ?{ $_.ReferencedCommand.Module.Name -match "Microsoft.PowerShell.(Util|Core|Management)" }
'function': [
    /\b(?:Add-(?:Computer|Content|History|Member|PSSnapin|Type)|Checkpoint-Computer|Clear-(?:Content|EventLog|History|Item|ItemProperty|Variable)|Compare-Object|Complete-Transaction|Connect-PSSession|ConvertFrom-(?:Csv|Json|StringData)|Convert-Path|ConvertTo-(?:Csv|Html|Json|Xml)|Copy-(?:Item|ItemProperty)|Debug-Process|Disable-(?:ComputerRestore|PSBreakpoint|PSRemoting|PSSessionConfiguration)|Disconnect-PSSession|Enable-(?:ComputerRestore|PSBreakpoint|PSRemoting|PSSessionConfiguration)|Enter-PSSession|Exit-PSSession|Export-(?:Alias|Clixml|Console|Csv|FormatData|ModuleMember|PSSession)|ForEach-Object|Format-(?:Custom|List|Table|Wide)|Get-(?:Alias|ChildItem|Command|ComputerRestorePoint|Content|ControlPanelItem|Culture|Date|Event|EventLog|EventSubscriber|FormatData|Help|History|Host|HotFix|Item|ItemProperty|Job|Location|Member|Module|Process|PSBreakpoint|PSCallStack|PSDrive|PSProvider|PSSession|PSSessionConfiguration|PSSnapin|Random|Service|TraceSource|Transaction|TypeData|UICulture|Unique|Variable|WmiObject)|Group-Object|Import-(?:Alias|Clixml|Csv|LocalizedData|Module|PSSession)|Invoke-(?:Command|Expression|History|Item|RestMethod|WebRequest|WmiMethod)|Join-Path|Limit-EventLog|Measure-(?:Command|Object)|Move-(?:Item|ItemProperty)|New-(?:Alias|Event|EventLog|Item|ItemProperty|Module|ModuleManifest|Object|PSDrive|PSSession|PSSessionConfigurationFile|PSSessionOption|PSTransportOption|Service|TimeSpan|Variable|WebServiceProxy)|Out-(?:Default|File|GridView|Host|Null|Printer|String)|Pop-Location|Push-Location|Read-Host|Receive-(?:Job|PSSession)|Register-(?:EngineEvent|ObjectEvent|PSSessionConfiguration|WmiEvent)|Remove-(?:Computer|Event|EventLog|Item|ItemProperty|Job|Module|PSBreakpoint|PSDrive|PSSession|PSSnapin|TypeData|Variable|WmiObject)|Rename-(?:Computer|Item|ItemProperty)|Reset-ComputerMachinePassword|Resolve-Path|Restart-(?:Computer|Service)|Restore-Computer|Resume-(?:Job|Service)|Save-Help|Select-(?:Object|String|Xml)|Send-MailMessage|Set-(?:Alias|Content|Date|Item|ItemProperty|Location|PSBreakpoint|PSDebug|PSSessionConfiguration|Service|StrictMode|TraceSource|Variable|WmiInstance)|Show-(?:Command|ControlPanelItem|EventLog)|Sort-Object|Split-Path|Start-(?:Job|Process|Service|Sleep|Transaction)|Stop-(?:Computer|Job|Process|Service)|Suspend-(?:Job|Service)|Tee-Object|Test-(?:ComputerSecureChannel|Connection|ModuleManifest|Path|PSSessionConfigurationFile)|Trace-Command|Unblock-File|Undo-Transaction|Unregister-(?:Event|PSSessionConfiguration)|Update-(?:FormatData|Help|List|TypeData)|Use-Transaction|Wait-(?:Event|Job|Process)|Where-Object|Write-(?:Debug|Error|EventLog|Host|Output|Progress|Verbose|Warning))\b/i,
    /\b(?:ac|cat|chdir|clc|cli|clp|clv|compare|copy|cp|cpi|cpp|cvpa|dbp|del|diff|dir|ebp|echo|epal|epcsv|epsn|erase|fc|fl|ft|fw|gal|gbp|gc|gci|gcs|gdr|gi|gl|gm|gp|gps|group|gsv|gu|gv|gwmi|iex|ii|ipal|ipcsv|ipsn|irm|iwmi|iwr|kill|lp|ls|measure|mi|mount|move|mp|mv|nal|ndr|ni|nv|ogv|popd|ps|pushd|pwd|rbp|rd|rdr|ren|ri|rm|rmdir|rni|rnp|rp|rv|rvpa|rwmi|sal|saps|sasv|sbp|sc|select|set|shcm|si|sl|sleep|sls|sort|sp|spps|spsv|start|sv|swmi|tee|trcm|type|write)\b/i
],
// per http://technet.microsoft.com/en-us/library/hh847744.aspx
'keyword': /\b(?:Begin|Break|Catch|Class|Continue|Data|Define|Do|DynamicParam|Else|ElseIf|End|Exit|Filter|Finally|For|ForEach|From|Function|If|InlineScript|Parallel|Param|Process|Return|Sequence|Switch|Throw|Trap|Try|Until|Using|Var|While|Workflow)\b/i,
'operator': {
    pattern: /(\W?)(?:!|-(eq|ne|gt|ge|lt|le|sh[lr]|not|b?(?:and|x?or)|(?:Not)?(?:Like|Match|Contains|In)|Replace|Join|is(?:Not)?|as)\b|-[-=]?|\+[+=]?|[*\/%]=?)/i,
    lookbehind: true
},
'punctuation': /[|{}[\];(),.]/
};

// Variable interpolation inside strings, and nested expressions
Prism.languages.powershell.string[0].inside.boolean = Prism.languages.powershell.boolean;
Prism.languages.powershell.string[0].inside.variable = Prism.languages.powershell.variable;
Prism.languages.powershell.string[0].inside.function.inside = Prism.util.clone(Prism.languages.powershell);

(function(Prism) {

var javascript = Prism.util.clone(Prism.languages.javascript);

Prism.languages.jsx = Prism.languages.extend('markup', javascript);
Prism.languages.jsx.tag.pattern= /<\/?[\w.:-]+\s*(?:\s+(?:[\w\.:-]+(?:=(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">=]+|(?:\{[^}]*\})))?|\{\.{3}\w+\}))*\s*\/?>/i;

Prism.languages.jsx.tag.inside['attr-value'].pattern = /=(?!\{)(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">]+)/i;

Prism.languages.insertBefore('inside', 'attr-name', {
'spread': {
    pattern: /\{\.{3}\w+\}/,
    inside: {
        'punctuation': /[{}]|\.{3}/,
        'attr-value': /\w+/
    }
}
}, Prism.languages.jsx.tag);

var jsxExpression = Prism.util.clone(Prism.languages.jsx);

delete jsxExpression.punctuation;

jsxExpression = Prism.languages.insertBefore('jsx', 'operator', {
'punctuation': /=(?={)|[{}[\];(),.:]/
}, { jsx: jsxExpression });

Prism.languages.insertBefore('inside', 'attr-value',{
'script': {
    // Allow for one level of nesting
    pattern: /=(\{(?:\{[^}]*\}|[^}])+\})/i,
    inside: jsxExpression,
    'alias': 'language-javascript'
}
}, Prism.languages.jsx.tag);

}(Prism));

(function(Prism) {
Prism.languages.sass = Prism.languages.extend('css', {
    // Sass comments don't need to be closed, only indented
    'comment': {
        pattern: /^([ \t]*)\/[\/*].*(?:(?:\r?\n|\r)\1[ \t]+.+)*/m,
        lookbehind: true
    }
});

Prism.languages.insertBefore('sass', 'atrule', {
    // We want to consume the whole line
    'atrule-line': {
        // Includes support for = and + shortcuts
        pattern: /^(?:[ \t]*)[@+=].+/m,
        inside: {
            'atrule': /(?:@[\w-]+|[+=])/m
        }
    }
});
delete Prism.languages.sass.atrule;


var variable = /\$[-\w]+|#\{\$[-\w]+\}/;
var operator = [
    /[+*\/%]|[=!]=|<=?|>=?|\b(?:and|or|not)\b/,
    {
        pattern: /(\s+)-(?=\s)/,
        lookbehind: true
    }
];

Prism.languages.insertBefore('sass', 'property', {
    // We want to consume the whole line
    'variable-line': {
        pattern: /^[ \t]*\$.+/m,
        inside: {
            'punctuation': /:/,
            'variable': variable,
            'operator': operator
        }
    },
    // We want to consume the whole line
    'property-line': {
        pattern: /^[ \t]*(?:[^:\s]+ *:.*|:[^:\s]+.*)/m,
        inside: {
            'property': [
                /[^:\s]+(?=\s*:)/,
                {
                    pattern: /(:)[^:\s]+/,
                    lookbehind: true
                }
            ],
            'punctuation': /:/,
            'variable': variable,
            'operator': operator,
            'important': Prism.languages.sass.important
        }
    }
});
delete Prism.languages.sass.property;
delete Prism.languages.sass.important;

// Now that whole lines for other patterns are consumed,
// what's left should be selectors
delete Prism.languages.sass.selector;
Prism.languages.insertBefore('sass', 'punctuation', {
    'selector': {
        pattern: /([ \t]*)\S(?:,?[^,\r\n]+)*(?:,(?:\r?\n|\r)\1[ \t]+\S(?:,?[^,\r\n]+)*)*/,
        lookbehind: true
    }
});

}(Prism));
Prism.languages.scss = Prism.languages.extend('css', {
'comment': {
    pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|\/\/.*)/,
    lookbehind: true
},
'atrule': {
    pattern: /@[\w-]+(?:\([^()]+\)|[^(])*?(?=\s+[{;])/,
    inside: {
        'rule': /@[\w-]+/
        // See rest below
    }
},
// url, compassified
'url': /(?:[-a-z]+-)*url(?=\()/i,
// CSS selector regex is not appropriate for Sass
// since there can be lot more things (var, @ directive, nesting..)
// a selector must start at the end of a property or after a brace (end of other rules or nesting)
// it can contain some characters that aren't used for defining rules or end of selector, & (parent selector), or interpolated variable
// the end of a selector is found when there is no rules in it ( {} or {\s}) or if there is a property (because an interpolated var
// can "pass" as a selector- e.g: proper#{$erty})
// this one was hard to do, so please be careful if you edit this one :)
'selector': {
    // Initial look-ahead is used to prevent matching of blank selectors
    pattern: /(?=\S)[^@;{}()]?(?:[^@;{}()]|&|#\{\$[-\w]+\})+(?=\s*\{(?:\}|\s|[^}]+[:{][^}]+))/m,
    inside: {
        'parent': {
            pattern: /&/,
            alias: 'important'
        },
        'placeholder': /%[-\w]+/,
        'variable': /\$[-\w]+|#\{\$[-\w]+\}/
    }
}
});

Prism.languages.insertBefore('scss', 'atrule', {
'keyword': [
    /@(?:if|else(?: if)?|for|each|while|import|extend|debug|warn|mixin|include|function|return|content)/i,
    {
        pattern: /( +)(?:from|through)(?= )/,
        lookbehind: true
    }
]
});

Prism.languages.scss.property = {
pattern: /(?:[\w-]|\$[-\w]+|#\{\$[-\w]+\})+(?=\s*:)/i,
inside: {
    'variable': /\$[-\w]+|#\{\$[-\w]+\}/
}
};

Prism.languages.insertBefore('scss', 'important', {
// var and interpolated vars
'variable': /\$[-\w]+|#\{\$[-\w]+\}/
});

Prism.languages.insertBefore('scss', 'function', {
'placeholder': {
    pattern: /%[-\w]+/,
    alias: 'selector'
},
'statement': {
    pattern: /\B!(?:default|optional)\b/i,
    alias: 'keyword'
},
'boolean': /\b(?:true|false)\b/,
'null': /\bnull\b/,
'operator': {
    pattern: /(\s)(?:[-+*\/%]|[=!]=|<=?|>=?|and|or|not)(?=\s)/,
    lookbehind: true
}
});

Prism.languages.scss['atrule'].inside.rest = Prism.util.clone(Prism.languages.scss);
Prism.languages.sql= {
'comment': {
    pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/,
    lookbehind: true
},
'string' : {
    pattern: /(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\])*\2/,
    greedy: true,
    lookbehind: true
},
'variable': /@[\w.$]+|@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/,
'function': /\b(?:COUNT|SUM|AVG|MIN|MAX|FIRST|LAST|UCASE|LCASE|MID|LEN|ROUND|NOW|FORMAT)(?=\s*\()/i, // Should we highlight user defined functions too?
'keyword': /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR VARYING|CHARACTER (?:SET|VARYING)|CHARSET|CHECK|CHECKPOINT|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMN|COLUMNS|COMMENT|COMMIT|COMMITTED|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS|CONTAINSTABLE|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|DATA(?:BASES?)?|DATE(?:TIME)?|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITER(?:S)?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE(?: PRECISION)?|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE KEY|ELSE|ENABLE|ENCLOSED BY|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPE(?:D BY)?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|IDENTITY(?:_INSERT|COL)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTO|INVOKER|ISOLATION LEVEL|JOIN|KEYS?|KILL|LANGUAGE SQL|LAST|LEFT|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MODIFIES SQL DATA|MODIFY|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL(?: CHAR VARYING| CHARACTER(?: VARYING)?| VARCHAR)?|NATURAL|NCHAR(?: VARCHAR)?|NEXT|NO(?: SQL|CHECK|CYCLE)?|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READ(?:S SQL DATA|TEXT)?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEATABLE|REPLICATION|REQUIRE|RESTORE|RESTRICT|RETURNS?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE MODE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|START(?:ING BY)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED BY|TEXT(?:SIZE)?|THEN|TIMESTAMP|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNPIVOT|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?)\b/i,
'boolean': /\b(?:TRUE|FALSE|NULL)\b/i,
'number': /\b-?(?:0x)?\d*\.?[\da-f]+\b/,
'operator': /[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|IN|LIKE|NOT|OR|IS|DIV|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,
'punctuation': /[;[\]()`,.]/
};
// issues: nested multiline comments
Prism.languages.swift = Prism.languages.extend('clike', {
'string': {
    pattern: /("|')(\\(?:\((?:[^()]|\([^)]+\))+\)|\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    greedy: true,
    inside: {
        'interpolation': {
            pattern: /\\\((?:[^()]|\([^)]+\))+\)/,
            inside: {
                delimiter: {
                    pattern: /^\\\(|\)$/,
                    alias: 'variable'
                }
                // See rest below
            }
        }
    }
},
'keyword': /\b(?:as|associativity|break|case|catch|class|continue|convenience|default|defer|deinit|didSet|do|dynamic(?:Type)?|else|enum|extension|fallthrough|final|for|func|get|guard|if|import|in|infix|init|inout|internal|is|lazy|left|let|mutating|new|none|nonmutating|operator|optional|override|postfix|precedence|prefix|private|Protocol|public|repeat|required|rethrows|return|right|safe|self|Self|set|static|struct|subscript|super|switch|throws?|try|Type|typealias|unowned|unsafe|var|weak|where|while|willSet|__(?:COLUMN__|FILE__|FUNCTION__|LINE__))\b/,
'number': /\b(?:[\d_]+(?:\.[\de_]+)?|0x[a-f0-9_]+(?:\.[a-f0-9p_]+)?|0b[01_]+|0o[0-7_]+)\b/i,
'constant': /\b(?:nil|[A-Z_]{2,}|k[A-Z][A-Za-z_]+)\b/,
'atrule': /@\b(?:IB(?:Outlet|Designable|Action|Inspectable)|class_protocol|exported|noreturn|NS(?:Copying|Managed)|objc|UIApplicationMain|auto_closure)\b/,
'builtin': /\b(?:[A-Z]\S+|abs|advance|alignof(?:Value)?|assert|contains|count(?:Elements)?|debugPrint(?:ln)?|distance|drop(?:First|Last)|dump|enumerate|equal|filter|find|first|getVaList|indices|isEmpty|join|last|lexicographicalCompare|map|max(?:Element)?|min(?:Element)?|numericCast|overlaps|partition|print(?:ln)?|reduce|reflect|reverse|sizeof(?:Value)?|sort(?:ed)?|split|startsWith|stride(?:of(?:Value)?)?|suffix|swap|toDebugString|toString|transcode|underestimateCount|unsafeBitCast|with(?:ExtendedLifetime|Unsafe(?:MutablePointers?|Pointers?)|VaList))\b/
});
Prism.languages.swift['string'].inside['interpolation'].inside.rest = Prism.util.clone(Prism.languages.swift);
Prism.languages.typescript = Prism.languages.extend('javascript', {
// From JavaScript Prism keyword list and TypeScript language spec: https://github.com/Microsoft/TypeScript/blob/master/doc/spec.md#221-reserved-words
'keyword': /\b(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|var|void|while|with|yield|false|true|module|declare|constructor|string|Function|any|number|boolean|Array|symbol|namespace|abstract|require|type)\b/
});

Prism.languages.ts = Prism.languages.typescript;
Prism.languages.yaml = {
'scalar': {
    pattern: /([\-:]\s*(?:![^\s]+)?[ \t]*[|>])[ \t]*(?:((?:\r?\n|\r)[ \t]+)[^\r\n]+(?:\2[^\r\n]+)*)/,
    lookbehind: true,
    alias: 'string'
},
'comment': /#.*/,
'key': {
    pattern: /(\s*(?:^|[:\-,[{\r\n?])[ \t]*(?:![^\s]+)?[ \t]*)[^\r\n{[\]},#\s]+?(?=\s*:\s)/,
    lookbehind: true,
    alias: 'atrule'
},
'directive': {
    pattern: /(^[ \t]*)%.+/m,
    lookbehind: true,
    alias: 'important'
},
'datetime': {
    pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)(?:\d{4}-\d\d?-\d\d?(?:[tT]|[ \t]+)\d\d?:\d{2}:\d{2}(?:\.\d*)?[ \t]*(?:Z|[-+]\d\d?(?::\d{2})?)?|\d{4}-\d{2}-\d{2}|\d\d?:\d{2}(?::\d{2}(?:\.\d*)?)?)(?=[ \t]*(?:$|,|]|}))/m,
    lookbehind: true,
    alias: 'number'
},
'boolean': {
    pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)(?:true|false)[ \t]*(?=$|,|]|})/im,
    lookbehind: true,
    alias: 'important'
},
'null': {
    pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)(?:null|~)[ \t]*(?=$|,|]|})/im,
    lookbehind: true,
    alias: 'important'
},
'string': {
    pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)("|')(?:(?!\2)[^\\\r\n]|\\.)*\2(?=[ \t]*(?:$|,|]|}))/m,
    lookbehind: true,
    greedy: true
},
'number': {
    pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)[+\-]?(?:0x[\da-f]+|0o[0-7]+|(?:\d+\.?\d*|\.?\d+)(?:e[+-]?\d+)?|\.inf|\.nan)[ \t]*(?=$|,|]|})/im,
    lookbehind: true
},
'tag': /![^\s]+/,
'important': /[&*][\w]+/,
'punctuation': /---|[:[\]{}\-,|>?]|\.\.\./
};

(function(){

if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
return;
}

function $$(expr, con) {
return Array.prototype.slice.call((con || document).querySelectorAll(expr));
}

function hasClass(element, className) {
className = " " + className + " ";
return (" " + element.className + " ").replace(/[\n\t]/g, " ").indexOf(className) > -1
}

// Some browsers round the line-height, others don't.
// We need to test for it to position the elements properly.
var isLineHeightRounded = (function() {
var res;
return function() {
    if(typeof res === 'undefined') {
        var d = document.createElement('div');
        d.style.fontSize = '13px';
        d.style.lineHeight = '1.5';
        d.style.padding = 0;
        d.style.border = 0;
        d.innerHTML = '&nbsp;<br />&nbsp;';
        document.body.appendChild(d);
        // Browsers that round the line-height should have offsetHeight === 38
        // The others should have 39.
        res = d.offsetHeight === 38;
        document.body.removeChild(d);
    }
    return res;
}
}());

function highlightLines(pre, lines, classes) {
var ranges = lines.replace(/\s+/g, '').split(','),
    offset = +pre.getAttribute('data-line-offset') || 0;

var parseMethod = isLineHeightRounded() ? parseInt : parseFloat;
var lineHeight = parseMethod(getComputedStyle(pre).lineHeight);

for (var i=0, range; range = ranges[i++];) {
    range = range.split('-');

    var start = +range[0],
        end = +range[1] || start;

    var line = document.createElement('div');

    line.textContent = Array(end - start + 2).join(' \n');
    line.setAttribute('aria-hidden', 'true');
    line.className = (classes || '') + ' line-highlight';

    //if the line-numbers plugin is enabled, then there is no reason for this plugin to display the line numbers
    if(!hasClass(pre, 'line-numbers')) {
        line.setAttribute('data-start', start);

        if(end > start) {
            line.setAttribute('data-end', end);
        }
    }

    line.style.top = (start - offset - 1) * lineHeight + 'px';

    //allow this to play nicely with the line-numbers plugin
    if(hasClass(pre, 'line-numbers')) {
        //need to attack to pre as when line-numbers is enabled, the code tag is relatively which screws up the positioning
        pre.appendChild(line);
    } else {
        (pre.querySelector('code') || pre).appendChild(line);
    }
}
}

function applyHash() {
var hash = location.hash.slice(1);

// Remove pre-existing temporary lines
$$('.temporary.line-highlight').forEach(function (line) {
    line.parentNode.removeChild(line);
});

var range = (hash.match(/\.([\d,-]+)$/) || [,''])[1];

if (!range || document.getElementById(hash)) {
    return;
}

var id = hash.slice(0, hash.lastIndexOf('.')),
    pre = document.getElementById(id);

if (!pre) {
    return;
}

if (!pre.hasAttribute('data-line')) {
    pre.setAttribute('data-line', '');
}

highlightLines(pre, range, 'temporary ');

document.querySelector('.temporary.line-highlight').scrollIntoView();
}

var fakeTimer = 0; // Hack to limit the number of times applyHash() runs

Prism.hooks.add('before-sanity-check', function(env) {
var pre = env.element.parentNode;
var lines = pre && pre.getAttribute('data-line');

if (!pre || !lines || !/pre/i.test(pre.nodeName)) {
    return;
}

/*
* Cleanup for other plugins (e.g. autoloader).
 *
 * Sometimes <code> blocks are highlighted multiple times. It is necessary
 * to cleanup any left-over tags, because the whitespace inside of the <div>
 * tags change the content of the <code> tag.
 */
var num = 0;
$$('.line-highlight', pre).forEach(function (line) {
    num += line.textContent.length;
    line.parentNode.removeChild(line);
});
// Remove extra whitespace
if (num && /^( \n)+$/.test(env.code.slice(-num))) {
    env.code = env.code.slice(0, -num);
}
});

Prism.hooks.add('complete', function(env) {
var pre = env.element.parentNode;
var lines = pre && pre.getAttribute('data-line');

if (!pre || !lines || !/pre/i.test(pre.nodeName)) {
    return;
}

clearTimeout(fakeTimer);
highlightLines(pre, lines);

fakeTimer = setTimeout(applyHash, 1);
});

window.addEventListener('hashchange', applyHash);

})();

(function () {

if (typeof self === 'undefined' || !self.Prism || !self.document) {
    return;
}

/**
 * Class name for <pre> which is activating the plugin
 * @type {String}
 */
var PLUGIN_CLASS = 'line-numbers';

/**
 * Resizes line numbers spans according to height of line of code
 * @param  {Element} element <pre> element
 */
var _resizeElement = function (element) {
    var codeStyles = getStyles(element);
    var whiteSpace = codeStyles['white-space'];

    if (whiteSpace === 'pre-wrap' || whiteSpace === 'pre-line') {
        var codeElement = element.querySelector('code');
        var lineNumbersWrapper = element.querySelector('.line-numbers-rows');
        var lineNumberSizer = element.querySelector('.line-numbers-sizer');
        var codeLines = element.textContent.split('\n');

        if (!lineNumberSizer) {
            lineNumberSizer = document.createElement('span');
            lineNumberSizer.className = 'line-numbers-sizer';

            codeElement.appendChild(lineNumberSizer);
        }

        lineNumberSizer.style.display = 'block';

        codeLines.forEach(function (line, lineNumber) {
            lineNumberSizer.textContent = line || '\n';
            var lineSize = lineNumberSizer.getBoundingClientRect().height;
            lineNumbersWrapper.children[lineNumber].style.height = lineSize + 'px';
        });

        lineNumberSizer.textContent = '';
        lineNumberSizer.style.display = 'none';
    }
};

/**
 * Returns style declarations for the element
 * @param {Element} element
 */
var getStyles = function (element) {
    if (!element) {
        return null;
    }

    return window.getComputedStyle ? getComputedStyle(element) : (element.currentStyle || null);
};

window.addEventListener('resize', function () {
    Array.prototype.forEach.call(document.querySelectorAll('pre.' + PLUGIN_CLASS), _resizeElement);
});

Prism.hooks.add('complete', function (env) {
    if (!env.code) {
        return;
    }

    // works only for <code> wrapped inside <pre> (not inline)
    var pre = env.element.parentNode;
    var clsReg = /\s*\bline-numbers\b\s*/;
    if (
        !pre || !/pre/i.test(pre.nodeName) ||
        // Abort only if nor the <pre> nor the <code> have the class
        (!clsReg.test(pre.className) && !clsReg.test(env.element.className))
    ) {
        return;
    }

    if (env.element.querySelector(".line-numbers-rows")) {
        // Abort if line numbers already exists
        return;
    }

    if (clsReg.test(env.element.className)) {
        // Remove the class "line-numbers" from the <code>
        env.element.className = env.element.className.replace(clsReg, ' ');
    }
    if (!clsReg.test(pre.className)) {
        // Add the class "line-numbers" to the <pre>
        pre.className += ' line-numbers';
    }

    var match = env.code.match(/\n(?!$)/g);
    var linesNum = match ? match.length + 1 : 1;
    var lineNumbersWrapper;

    var lines = new Array(linesNum + 1);
    lines = lines.join('<span></span>');

    lineNumbersWrapper = document.createElement('span');
    lineNumbersWrapper.setAttribute('aria-hidden', 'true');
    lineNumbersWrapper.className = 'line-numbers-rows';
    lineNumbersWrapper.innerHTML = lines;

    if (pre.hasAttribute('data-start')) {
        pre.style.counterReset = 'linenumber ' + (parseInt(pre.getAttribute('data-start'), 10) - 1);
    }

    env.element.appendChild(lineNumbersWrapper);

    _resizeElement(pre);
});

}());
(function(){

if (
typeof self !== 'undefined' && !self.Prism ||
typeof global !== 'undefined' && !global.Prism
) {
return;
}

Prism.hooks.add('before-highlight', function(env) {
var tokens = env.grammar;

if (!tokens) return;

tokens.tab = /\t/g;
tokens.crlf = /\r\n/g;
tokens.lf = /\n/g;
tokens.cr = /\r/g;
tokens.space = / /g;
});
})();

(function() {

if (typeof self === 'undefined' || !self.Prism || !self.document) {
return;
}

Prism.hooks.add('complete', function (env) {
if (!env.code) {
    return;
}

// Works only for <code> wrapped inside <pre> (not inline).
var pre = env.element.parentNode;
var clsReg = /\s*\bcommand-line\b\s*/;
if (
    !pre || !/pre/i.test(pre.nodeName) ||
        // Abort only if neither the <pre> nor the <code> have the class
    (!clsReg.test(pre.className) && !clsReg.test(env.element.className))
) {
    return;
}

if (env.element.querySelector('.command-line-prompt')) {
    // Abort if prompt already exists.
    return;
}

if (clsReg.test(env.element.className)) {
    // Remove the class "command-line" from the <code>
    env.element.className = env.element.className.replace(clsReg, '');
}
if (!clsReg.test(pre.className)) {
    // Add the class "command-line" to the <pre>
    pre.className += ' command-line';
}

var getAttribute = function(key, defaultValue) {
    return (pre.getAttribute(key) || defaultValue).replace(/"/g, '&quot');
};

// Create the "rows" that will become the command-line prompts. -- cwells
var lines = new Array(1 + env.code.split('\n').length);
var promptText = getAttribute('data-prompt', '');
if (promptText !== '') {
    lines = lines.join('<span data-prompt="' + promptText + '"></span>');
} else {
    var user = getAttribute('data-user', 'user');
    var host = getAttribute('data-host', 'localhost');
    lines = lines.join('<span data-user="' + user + '" data-host="' + host + '"></span>');
}

// Create the wrapper element. -- cwells
var prompt = document.createElement('span');
prompt.className = 'command-line-prompt';
prompt.innerHTML = lines;

// Mark the output lines so they can be styled differently (no prompt). -- cwells
var outputSections = pre.getAttribute('data-output') || '';
outputSections = outputSections.split(',');
for (var i = 0; i < outputSections.length; i++) {
    var outputRange = outputSections[i].split('-');
    var outputStart = parseInt(outputRange[0]);
    var outputEnd = outputStart; // Default: end at the first line when it's not an actual range. -- cwells
    if (outputRange.length === 2) {
        outputEnd = parseInt(outputRange[1]);
    }

    if (!isNaN(outputStart) && !isNaN(outputEnd)) {
        for (var j = outputStart; j <= outputEnd && j <= prompt.children.length; j++) {
            var node = prompt.children[j - 1];
            node.removeAttribute('data-user');
            node.removeAttribute('data-host');
            node.removeAttribute('data-prompt');
        }
    }
}

env.element.innerHTML = prompt.outerHTML + env.element.innerHTML;
});

}());
