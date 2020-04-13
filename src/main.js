(function(document, location, history) { /* jshint maxdepth:8, boss:true */
    "use strict";

    // do not enable the plugin for old browsers
    if (!window.fetch || !window.Request || !window.Response) return;

    const parser = new DOMParser();
    const identity = (s) => s;
    const states = []; // in-memory storage for states
    let lastState = {};

    function attachNonPreventedListener(eventType, callback) {
        document.addEventListener(eventType, function(e) {
            if (!e.defaultPrevented) {
                callback(e);
            }
        }, false);
    }

    function dispatchAjaxifyEvent(el, type, detail) {
        const e = document.createEvent("CustomEvent");
        e.initCustomEvent("ajaxify:" + type, true, true, detail || null);
        return el.dispatchEvent(e);
    }

    attachNonPreventedListener("click", (e) => {
        const body = document.body;

        for (var el = e.target; el && el !== body; el = el.parentNode) {
            if (el.nodeName.toLowerCase() === "a") {
                if (!el.target) {
                    const targetUrl = el.href;

                    if (targetUrl && targetUrl.indexOf("http") === 0) {
                        const currentUrl = location.href;

                        if (targetUrl === currentUrl || targetUrl.split("#")[0] !== currentUrl.split("#")[0]) {
                            dispatchAjaxifyEvent(el, "fetch", new Request(targetUrl));
                        } else {
                            location.hash = el.hash;
                        }
                        // always prevent default bahavior for anchors and links
                        e.preventDefault();
                    }
                }

                break;
            }
        }
    });

    attachNonPreventedListener("submit", (e) => {
        const el = e.target;

        if (!el.target) {
            const formEnctype = el.getAttribute("enctype");

            let data;

            if (formEnctype === "multipart/form-data") {
                data = new FormData(el);
            } else {
                data = {};

                for (var i = 0, field; field = el.elements[i]; ++i) {
                    const fieldType = field.type;

                    if (fieldType && field.name && !field.disabled) {
                        const fieldName = field.name;

                        if (fieldType === "select-multiple") {
                            for (var j = 0, option; option = field.options[j]; ++j) {
                                if (option.selected) {
                                    (data[fieldName] = data[fieldName] || []).push(option.value);
                                }
                            }
                        } else if ((fieldType !== "checkbox" && fieldType !== "radio") || field.checked) {
                            data[fieldName] = field.value;
                        }
                    }
                }
            }

            if (dispatchAjaxifyEvent(el, "serialize", data)) {
                if (!(data instanceof FormData)) {
                    const encode = formEnctype === "text/plain" ? identity : encodeURIComponent;
                    const reSpace = encode === identity ? / /g : /%20/g;

                    data = Object.keys(data).map((key) => {
                        const name = encode(key);
                        let value = data[key];

                        if (Array.isArray(value)) {
                            value = value.map(encode).join("&" + name + "=");
                        }

                        return name + "=" + encode(value);
                    }).join("&").replace(reSpace, "+");
                }

                const options = {method: el.method.toUpperCase() || "GET"};
                let url = el.action;
                if (options.method === "GET") {
                    url += (~url.indexOf("?") ? "&" : "?") + data;
                } else {
                    options.body = data;
                }
                options.headers = {"Content-Type": formEnctype || el.enctype};

                dispatchAjaxifyEvent(el, "fetch", new Request(url, options));
                // always prevent default behavior for forms
                e.preventDefault();
            }
        }
    });

    attachNonPreventedListener("ajaxify:fetch", (e) => {
        const domElement = e.target;
        const req = e.detail;

        fetch(req).then(res => {
            dispatchAjaxifyEvent(domElement, "load", res);
        }).catch(err => {
            if (dispatchAjaxifyEvent(domElement, "error", err)) {
                throw err;
            }
        });
    });

    attachNonPreventedListener("ajaxify:load", (e) => {
        const domElement = e.target;
        const res = e.detail;

        res.text().then(html => {
            const doc = parser.parseFromString(html, "text/html");

            if (dispatchAjaxifyEvent(domElement, "render", doc)) {
                if (res.url !== location.href) {
                    // update URL in address bar
                    history.pushState(states.length, doc.title, res.url);
                }
            }
        }).catch(err => {
            if (dispatchAjaxifyEvent(domElement, "error", err)) {
                throw err;
            }
        });
    });

    attachNonPreventedListener("ajaxify:render", (e) => {
        const domElement = e.target;
        const currentState = e.detail;

        lastState.body = document.body;
        lastState.title = document.title;
        if (states.indexOf(lastState) >= 0) {
            lastState = currentState;
        } else {
            states.push(lastState);
            // make sure that next state will be a new object
            lastState = {};
        }
        // update HTML
        if (dispatchAjaxifyEvent(domElement, "show", currentState.body)) {
            // by default just swap elements
            document.documentElement.replaceChild(currentState.body, document.body);
        }
        // update page title
        document.title = currentState.title;
    });

    window.addEventListener("popstate", (e) => {
        // numeric value indicates better-ajaxify state
        if (!e.defaultPrevented && e.state >= 0) {
            const state = states[e.state];
            if (state) {
                dispatchAjaxifyEvent(document, "render", state);
            }
        }
    });

    // update initial state address url
    history.replaceState(0, document.title);

}(window.document, window.location, window.history));
