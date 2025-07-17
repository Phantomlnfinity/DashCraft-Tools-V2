let rmc = {
    active: false,
    ids: [],
    trackId: null,
    trackLb: {},
    trackStarted: false,
    pbTime: Infinity,
    pbPos: Infinity,
    timeNeeded: null,
    posNeeded: 0,
    gold: 0,
    paused: true,
    timer: {
        paused: true,
        startTime: null,
        pauseTime: 0,
        pauseStart: null,
        start: () => {
            rmc.timer.startTime = Date.now(); 
            rmc.timer.paused = false
            rmc.timer.pauseTime = 0;
        },
        pause: () => {
            rmc.timer.pauseStart = Date.now(); 
            rmc.timer.paused = true
        },
        resume: () => {
            if (rmc.timer.paused) {
                rmc.timer.pauseTime += Date.now() - rmc.timer.pauseStart;
                rmc.timer.paused = false;
            }
        },
        getTime: () => {
            if (rmc.timer.paused) {
                return rmc.timer.pauseStart - rmc.timer.startTime - rmc.timer.pauseTime;
            } else {
                return Date.now() - rmc.timer.startTime - rmc.timer.pauseTime;
            }
        }

    },
    fetchIds: async () => {
        let finished = false;
        let ids = [];
        const batchSize = 2500;
        for (let outer = 0; !finished; outer++) {
            let fetches = [];
            for (let inner = 0; inner < batchSize / 50; inner++) {
                const page = outer * (batchSize / 50) + inner;
                fetches.push(fetch(`https://api.dashcraft.io/trackv2/global3?sort=new&verifiedOnly=true&page=${page}&pageSize=50`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.tracks.length < 50) {
                            finished = true;
                        }
                        return data.tracks.map(track => track._id);
                    })
                );
            }
            ids = ids.concat((await Promise.all(fetches)).flat());
        }
        return ids;
    },
    start: async () => {
        rmc.ids = await rmc.fetchIds();
        rmc.active = true;
        rmc.timer.start();
        rmc.timer.pause();
        rmc.nextTrack();
    },
    nextTrack: async() => {
        rmc.trackId = rmc.ids[Math.floor(Math.random() * rmc.ids.length)];
        console.log(`Next track: ${rmc.trackId}`);
        rmc.trackLb = await fetch(`https://api.dashcraft.io/trackv2/${rmc.trackId}/leaderboard`)
            .then(response => response.json())
    }
}

let jsonEditor = {
    public: {
        reset: (button) => {
            jsonEditor.public.force = localStorage.getItem("forcePublic") === "true";
            button.classList.toggle("enabled", jsonEditor.public.force);
        },
        force: false,
        toggle: (button) => {
            jsonEditor.public.force = !jsonEditor.public.force;
            button.classList.toggle("enabled", jsonEditor.public.force);
            localStorage.setItem("forcePublic", jsonEditor.public.force);
        }
    },
    trackData: {
        resetToggle: (button) => {
            jsonEditor.trackData.override = localStorage.getItem("trackDataToggle") === "true";
            button.classList.toggle("enabled", jsonEditor.trackData.override);
        },
        resetInput: (input) => {
            jsonEditor.trackData.input = localStorage.getItem("trackDataInput");
            input.value = jsonEditor.trackData.input;
            jsonEditor.trackData.update(input);
        },

        override: false,
        toggle: (button) => {
            jsonEditor.trackData.override = !jsonEditor.trackData.override;
            button.classList.toggle("enabled", jsonEditor.trackData.override);
            localStorage.setItem("trackDataToggle", jsonEditor.trackData.override);
        },
        input: null,
        stored: null,
        update: (input) => {
            jsonEditor.trackData.input = input.value;
            localStorage.setItem("trackDataInput", input.value);
            const value = input.value.trim();
            if (/^https:\/\/dashcraft.io\/?\?t=[0-9a-f]{24}$/.test(input.value)) {
                let id = input.value.slice(-24);
                realFetch(`https://cdn.dashcraft.io/v2/prod/track/${id}.json?random=${Math.random()}`)
                    .then(response => response.json())
                    .catch(error => {
                        jsonEditor.trackData.stored = null;
                        return;
                    })
                    .then(data => {
                        if (!data) return;
                        jsonEditor.trackData.stored = data;
                        realFetch(`https://api.dashcraft.io/trackv2/${id}`)
                            .then(response => response.json())
                            .then(data => jsonEditor.trackData.stored.screenshotCameraPosition = data.screenshotCameraPosition);
                    });
            } else {
                try {
                    const inputJson = JSON.parse(value);
                    if (inputJson.hasOwnProperty("trackPieces")) {
                        jsonEditor.trackData.stored = inputJson;
                    } else {
                        jsonEditor.trackData.stored = {trackPieces: inputJson};
                    };
                } catch (e) {
                    jsonEditor.trackData.stored = null;
                }
            }
        },
    },
}

let misc = {
    pageSize: {
        value: null,
        resetButton: (toggle) => {
            misc.pageSize.override = localStorage.getItem("pageSizeToggle") === "true";
            toggle.classList.toggle("enabled", misc.pageSize.override);
        },
        resetInput: (input) => {
            misc.pageSize.value = parseInt(localStorage.getItem("pageSize"));
            input.value = misc.pageSize.value;
        },
        set: (input) => {
            try {
                misc.pageSize.value = parseInt(input.value);
                misc.pageSize.value = Math.min(Math.max(input.value, 15), 50);
            } catch {
                misc.pageSize.value = null;
            }
            localStorage.setItem("pageSize", misc.pageSize.value);
        },
        blur: (input) => {
            input.value = misc.pageSize.value;
        },
        override: false,
        toggle: (button) => {
            misc.pageSize.override = !misc.pageSize.override;
            button.classList.toggle("enabled", misc.pageSize.override);
            localStorage.setItem("pageSizeToggle", misc.pageSize.override);
        }
    },
    thumbnailData: {
        position: {
            reset: (button) => {
                misc.thumbnailData.position.enabled = localStorage.getItem("thumbnailPosition") === "true";
                button.classList.toggle("enabled", misc.thumbnailData.position.enabled);
            },
            enabled: false,
            toggle: (button) => {
                misc.thumbnailData.position.enabled = !misc.thumbnailData.position.enabled;
                button.classList.toggle("enabled", misc.thumbnailData.position.enabled);
                localStorage.setItem("thumbnailPosition", misc.thumbnailData.position.enabled);
            }
        },
    }
}


let accountSwitcher = {
    autoAdd: {
        reset: (button) => {
            accountSwitcher.autoAdd.value = localStorage.getItem("autoAdd") === "true";
            button.classList.toggle("enabled", accountSwitcher.autoAdd.value);
        },
        value: false,
        toggle: (button) => {
            accountSwitcher.autoAdd.value = !accountSwitcher.autoAdd.value;
            button.classList.toggle("enabled", accountSwitcher.autoAdd.value);
            localStorage.setItem("autoAdd", accountSwitcher.autoAdd.value);
        }
    },
    menu: null,
    options: [],
    mode: 0,
    resetTokens: (hoverButton, menu) => {
        accountSwitcher.menu = menu;
        accountSwitcher.options = [];
        const tempTokens = JSON.parse(localStorage.getItem("tokens"));
        if (!tempTokens) return;
        tokens = [];
        for (let i = 0; i < tempTokens.length; i++) {
            accountSwitcher.addToken(tempTokens[i]);
        }
    },
    cycleMode: (button) => {
        accountSwitcher.mode = (accountSwitcher.mode + 1) % 2;

        button.innerText = ["Sign In", "Remove"][accountSwitcher.mode];
    },
    addToken: (token) => {
        if (!tokens.includes(token)) {
            tokens.push(token);
            localStorage.setItem("tokens", JSON.stringify(tokens));
            fetch("https://api.dashcraft.io/auth/account", {headers: {Authorization: token}})
                .then(response => response.json())
                .then(data => {
                    if (data.username) {
                        let button = createButton(data.username);
                        button.addEventListener("click", () => {
                            if (accountSwitcher.mode == 0) {
                                var request = indexedDB.open("/idbfs");
                                request.onsuccess = function(event) {
                                    var db = event.target.result;
                                    var transaction = db.transaction("FILE_DATA", "readwrite");
                                    var objectStore = transaction.objectStore("FILE_DATA");
                                    var storeName = "/idbfs/a4cde6f7db08abc1da0fa04a69529237/PlayerPrefs";
                                    objectStore.get(storeName).onsuccess = function(event) {
                                        var textEncoder = new TextEncoder("utf-8");
                                        var oldContent = event.target.result;
                                        var text = Array.from(oldContent.contents);
                                        var updatedBytes = textEncoder.encode(token);
                                        var DECODED = (new TextDecoder("utf-8")).decode(new Uint8Array(text));
                                        var startIndex = DECODED.indexOf("eyJ");
                                        var endIndex = startIndex + 172;
                                        text.splice(startIndex, 172, ...updatedBytes);
                                        var modifiedText = new Uint8Array(text);
                                        oldContent.contents = modifiedText;
                                        var RQ = objectStore.put(oldContent, storeName);
                                        RQ.onsuccess = (event) => {
                                            location.reload()
                                        };
                                    };
                                };
                            } else {
                                button.remove();
                                tokens = tokens.filter(t => t != token);
                                localStorage.setItem("tokens", JSON.stringify(tokens));
                            }
                        });
                        accountSwitcher.menu.appendChild(button);
                    }
                })
        }
    },
}


let currentToken;
let tokens = [];





// stop unity from eating keyboard events
const originalAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, listener, options) {
    if ((type === 'keydown' || type === 'keypress' || type === 'keyup') && typeof listener === 'function') {
        const wrapped = function (event) {
            const active = document.activeElement;
            if (active.tagName === "INPUT") {
                return;
            }
            return listener.call(this, event);
        };
        return originalAddEventListener.call(this, type, wrapped, options);
    }
    return originalAddEventListener.call(this, type, listener, options);
};




function editThumbnail(image, id) {   
    return new Promise(resolve => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const canvasImage = new Image();
        const imageURL = URL.createObjectURL(image);
        canvasImage.src = imageURL;
        canvasImage.onload = () => {
            // dimensions: 500px x 281px
            // distance from edge: 6px vertically, 8px horizontally
            // height: 58px
            // opacity: 0.6
            canvas.width = canvasImage.width;
            canvas.height = canvasImage.height;
            ctx.drawImage(canvasImage, 0, 0);
            URL.revokeObjectURL(imageURL);

            const right = 183;
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.roundRect(8, 218, right-8, 56, 19);
            ctx.fill();

            ctx.fillStyle = "rgb(255, 255, 255)";
            ctx.fillRect(right-44-15, 241, 10, 20);
            ctx.fillRect(right-29-15, 231, 10, 30);
            ctx.fillRect(right-14-15, 246, 10, 15);


            realFetch(`https://api.dashcraft.io/trackv2/${id}/leaderboard`, {headers: {Authorization: currentToken}})
                .then(response => response.json())
                .then(data => {
                    ctx.scale(1.4, 1)
                    ctx.font = "bold 32px Trebuchet MS";
                    ctx.textAlign = "right"
                    
                    if (data.hasOwnProperty("myBest")) {
                        ctx.fillText(data.myBest.place + 1, (right-69)/1.4, 257);
                    } else {
                        ctx.fillText("N/A", (right-69)/1.4, 257);
                    }

                    canvas.toBlob((blob) => {
                        canvas.remove();
                        resolve(blob);
                    }, "image/jpeg", 0.9)
                })
        }
    });
}



// toggle ui
let menus = document.getElementsByClassName("modMenu");
let active = false;
document.addEventListener("keydown", function(event) {
    if (event.key === "Tab") {
        event.preventDefault();
        active = !active;
        for (let menu of menus) {
            menu.classList.toggle("inactive", !active);
        }
    }
});


function createMenu(title, index = 0) {
    let menu = document.createElement("div");
    
    menu.style.left = `${index * 11 + 1}vw`;
    menu.classList.add("modMenu", "inactive");

    let label = document.createElement("div");
    label.innerText = title;
    label.classList.add("label");
    menu.appendChild(label);

    return menu;
}


function createSplitRow(a, b) {
    a.classList.add("leftSide");
    let ac = document.createElement("div");
    ac.classList.add("halfWidth", "container", "leftSide");
    ac.appendChild(a);

    let bc = document.createElement("div");
    bc.classList.add("halfWidth", "container");
    bc.appendChild(b);

    let container = document.createElement("div");
    container.classList.add("container");
    container.appendChild(ac);
    container.appendChild(bc);


    return container;
}


function createButton(text, startCallback = () => {}, callback = () => {}) {
    let button = document.createElement("button");
    button.innerText = text;
    startCallback(button);
    button.addEventListener("click", callback.bind(null, button));
    return button;
}

function createInput(placeholder, type, startCallback = () => {}, callback = () => {}, blurCallback = () => {}) {
    let input = document.createElement("input");
    input.placeholder = placeholder;
    input.type = type;
    input.classList.add("modInput");

    startCallback(input);
    input.addEventListener("input", callback.bind(null, input));
    input.addEventListener("blur", blurCallback.bind(null, input));
    return input;
}

function createSideMenu(text, callback = () => {}, startCallback = () => {}) {
    let hoverButton = document.createElement("button");
    hoverButton.classList.add("hoverButton");
    let textContainer = document.createElement("div");
    textContainer.innerText = text;
    hoverButton.appendChild(textContainer);
    let menu = document.createElement("div");
    menu.classList.add("sideMenu");
    menu.hidden = true;
    hoverButton.appendChild(menu);
    let onPopup = false;
    menu.addEventListener("mouseenter", () => {onPopup = true});
    menu.addEventListener("mouseleave", () => {onPopup = false});
    hoverButton.addEventListener("click", () => {
        if (!onPopup) {
            callback(textContainer);
        }
    });
    hoverButton.addEventListener("mouseenter", () => {menu.hidden = false});
    hoverButton.addEventListener("mouseleave", () => {menu.hidden = true});
    startCallback(hoverButton, menu);
    return hoverButton;
}

function createFileInput(text, type, callback) {
    let input = document.createElement("input");
    input.type = "file";
    input.accept = type;                        

    input.addEventListener("change", (event) => {
        if (event.target.files.length > 0) {
            callback(event.target.files[0]);
        }
    });
    
    let button = createButton(text, () => input.click());
    button.appendChild(input);
    
    return button;
}

function createLabel(text) {
    let div = document.createElement("div");
    div.classList.add("smallLabel")
    div.innerText = text;
    return div;
}


// ui
document.addEventListener('DOMContentLoaded', () => {

    const menuWidth = "10vw";
    const menuHeight = "20vw";
    let css = document.createElement("style");

    css.innerHTML = `


        /* Chrome, Safari, Edge, Opera */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }

        /* Firefox */
            input[type=number] {
            -moz-appearance: textfield;
        }




        #modLayer {
            position: absolute;
            top: 0;
            left: 0;
            z-index: 100000;
            width: 100%;
            height: 100%;
            pointer-events: none;
            font-size: 0.75vw;
        }
        .modMenu {
            position: absolute;
            top: 1vw;
            width: ${menuWidth};
            height: ${menuHeight};
            border-radius: 0.5vw;
            background: rgb(43, 43, 43);
            pointer-events: auto;
            transition: transform 0.1s ease-in-out;
        }
        .label {
            background-color: rgb(216, 84, 84);
            width: 100%;
            height: 2vw;
            border-radius: 0.5vw 0.5vw 0 0;
            text-align: center;
            align-content: center;
            font-size: 1vw;
            margin-bottom: 0.25vw
        }
        .inactive {
            transform: translateY(calc(-100% - 1vw));
        }

        .container {
            margin: 0;
            padding: 0;
        }

        .halfWidth {
            width: 50%;
            float: left;
        }

        .smallLabel {
            width: calc(100% - 0.5vw);
            height: 1vw;
            color: white;
            font-size: 0.75vw;
            text-align: left;
            padding: 0.25vw;
        }
        
        .modMenu button {
            width: 100%;
            height: 1.5vw;
            background-color: rgba(0, 0, 0, 0);
            border-width: 0;
            color: white;
            font-size: 0.75vw;
            text-align: left;
        }
        .hoverButton {
            position: relative;
        }
        .hoverButton::after {
            content: "";
            position: absolute;
            right: 0.5vw;
            top: 50%;
            transform: translateY(-50%);
            border-width: 0.7vw 0.7vw 0 0;
            border-style: solid;
            border-color: transparent rgba(255, 255, 255, 0.2) transparent transparent;
            display: inline-block;
            pointer-events: none;   
        }

        .modMenu button.enabled {
            color: rgb(216, 84, 84);
        }
        .modMenu button:hover {
            background-color: rgba(0, 0, 0, 0.2);
        }
        .modMenu *:focus {
            outline: none;
        }
        .modMenu input {
            width: calc(100% - 0.5vw);
            height: 1vw;
            margin: 0.125vw;
            padding: 0.125vw;
            background-color: rgba(0, 0, 0, 0.2);
            border: none;
            color: white;
            font-size: 0.75vw;
        }

        .hoverButton {
            position: relative;
        }

        .sideMenu {
            position: absolute;
            min-height: 1.5vw;
            top: 0;
            left: 100%;
            width: ${menuWidth};
            background-color: rgb(43, 43, 43);
        }

        .leftSide {
            text-align: right;
        }
    `
    document.head.appendChild(css);


    

    let modLayer = document.createElement("div");
    modLayer.id = "modLayer";
    modLayer.appendChild(document.createTextNode("DashCraft Modded v2.0"));
    
    let miscMenu = createMenu("Miscellaneous", 0);

    miscMenu.appendChild(createSplitRow(
        createButton("Page Size", misc.pageSize.resetButton, misc.pageSize.toggle),
        createInput("", "number", misc.pageSize.resetInput, misc.pageSize.set, misc.pageSize.blur)
    ));
    

    miscMenu.appendChild(createButton("Position in Thumbnail", misc.thumbnailData.position.reset, misc.thumbnailData.position.toggle));
    

    let jsonMenu = createMenu("Track Editor", 1);

    jsonMenu.appendChild(createButton("Force Public", jsonEditor.public.reset, jsonEditor.public.toggle));

    jsonMenu.appendChild(createButton("Override Pieces", jsonEditor.trackData.resetToggle, jsonEditor.trackData.toggle));
    jsonMenu.appendChild(createInput("Link or JSON", "text", jsonEditor.trackData.resetInput, jsonEditor.trackData.update));


    let accountMenu = createMenu("Accounts", 2);

    accountMenu.appendChild(createButton("Auto Add Accounts", accountSwitcher.autoAdd.reset, accountSwitcher.autoAdd.toggle));
    accountMenu.appendChild(createSideMenu("Sign in", accountSwitcher.cycleMode, accountSwitcher.resetTokens));


    modLayer.appendChild(miscMenu);
    modLayer.appendChild(jsonMenu);
    modLayer.appendChild(accountMenu);
    document.body.appendChild(modLayer);
});



function fixData(data, original) {
    data = structuredClone(data);
    let totals = {p: [0, 0, 0], r: 0};
    for (let i = 0; i < original.length; i++) {
        totals.p = totals.p.map((p, index) => p + original[i].p[index]);
        totals.r += original[i].r;
    }
    for (let i = 0; i < data.length; i++) {
        totals.p = totals.p.map((p, index) => p - data[i].p[index]);
        totals.r -= data[i].r;
    }
    if (totals.p[0] != 0 || totals.p[1] != 0 || totals.p[2] != 0 || totals.r != 0) {
        data.push({id: 29, uid: 1000000, p: totals.p, r: totals.r, a: []});
    }
    if (data.length > original.length) {
        return null;
    }
    while (data.length < original.length) {
        data.push({id: 29, uid: 1000001, p: [0, 0, 0], r: 0, a: []});
    }
    return data;
}



// rmc.start();

// override fetch


// ai generated because i don't even know what a blob is
async function splitBlobByTextRange(blob, textStartMarker, textEndMarker) {
    
    const buffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    const encoder = new TextEncoder();
    const startMarkerBytes = encoder.encode(textStartMarker);
    const endMarkerBytes = encoder.encode(textEndMarker);

    function findMarkerIndex(data, marker, fromIndex = 0) {
        outer: for (let i = fromIndex; i <= data.length - marker.length; i++) {
            for (let j = 0; j < marker.length; j++) {
                if (data[i + j] !== marker[j]) {
                    continue outer;
                }
            }
            return i;
        }
        return -1;
    }

    const startIndex = findMarkerIndex(uint8, startMarkerBytes);
    if (startIndex === -1) throw new Error("Start marker not found in blob");

    const endIndex = findMarkerIndex(uint8, endMarkerBytes, startIndex);
    if (endIndex === -1) throw new Error("End marker not found in blob");

    const textEndIndex = endIndex + endMarkerBytes.length;

    // Preserve all parts
    const beforeTextBuffer = buffer.slice(0, startIndex);
    const textPartBuffer = buffer.slice(startIndex, textEndIndex);
    const afterTextBuffer = buffer.slice(textEndIndex);

    const decodedText = new TextDecoder("utf-8").decode(textPartBuffer);

    return [beforeTextBuffer, decodedText, afterTextBuffer];
}

function rejoinBlob(parts) {
    return new Blob([
        parts[0],
        new TextEncoder().encode(parts[1]),
        parts[2]
    ]);
}




const realFetch = window.fetch;
window.fetch = (url, options) => {

    if (options && options.headers && options.headers.Authorization) {
        currentToken = options.headers.Authorization;
        if (accountSwitcher.autoAdd.value) {
            accountSwitcher.addToken(currentToken);
        }
    }


    // rmc
    if (rmc.active) {
        // get finish times
        if (/^https:\/\/api\.dashcraft\.io\/trackv2\/[0-9a-f]{24}\/finish$/.test(url)) {
            const response = realFetch(url, options);

            response
                .then(response => response.clone().json())
                .then(data => {
                    if (data.currentTime < rmc.pbTime) {
                        rmc.pbTime = data.currentTime;
                        rmc.pbPos = data.currentPos;
                        if (rmc.pbPos <= rmc.posNeeded) {
                            rmc.timer.pause();
                        }
                    }
                });

            return response;
        }
        // override random fetch
        if (url == "https://api.dashcraft.io/trackv2/random?lean=true") {
            if (rmc.trackStarted || Object.keys(rmc.trackLb).length == 0) return null;
            rmc.trackStarted = true;

            return new Promise(resolve => {
                realFetch(url, options)
                    .then(response => Promise.all([response, response.json()]))
                    .then(([response, data]) => {
                        data._id = rmc.trackId;
                        resolve(new Response(JSON.stringify(data)), response);
                    });
            });
        }
    }

    // add data to thumbnail
    if (misc.thumbnailData.position.enabled && /^https:\/\/cdn\.dashcraft\.io\/v2\/prod\/track-thumbnail\/sm\/[0-9a-f]{24}\.jpg\?v=\d+$/.test(url)) {
        return new Promise(resolve => {
            realFetch(url, options)
                .then(response => Promise.all([response, response.blob()]))
                .then(([response, blob]) => {
                    const id = url.match(/[0-9a-f]{24}/)[0];
                    const newImage = editThumbnail(blob, id);
                    return Promise.all([response, newImage]);
                })
                .then(([response, image]) => resolve(new Response(image, response)));
        });
    }

    // change page size
    if (misc.pageSize.override && url.length) {
        url = url.replace("pageSize=15", `pageSize=${misc.pageSize.value}`)
    }

    // json editor
    if (/^https:\/\/api\.dashcraft\.io\/trackv2\/update\/[0-9a-f]{24}$/.test(url) || url == "https://api.dashcraft.io/trackv2") {
        return new Promise(resolve => {
            testing = options.body;
            splitBlobByTextRange(options.body, '{', '"computedDifficulty":null}')
                .then(data => {
                    let json = JSON.parse(data[1]);

                    json.daytimeId = 1;
                    json.autoVerify = true;
                    json.verified = true;

                    if (jsonEditor.public.force) {
                        json.isPublic = true;
                    }

                    const storedData = jsonEditor.trackData.stored;
                    if (jsonEditor.trackData.override && storedData) {
                        let newPieces = fixData(storedData.trackPieces, json.trackPieces);
                        if (newPieces) {
                            json.trackPieces = newPieces;
                            if (storedData.hasOwnProperty("environmentId")) {
                                json.environmentId = storedData.environmentId;
                            }
                            if (storedData.hasOwnProperty("computedLinkedCheckpoints")) {
                                json.computedLinkedCheckpoints = storedData.computedLinkedCheckpoints;
                            }
                            if (storedData.hasOwnProperty("screenshotCameraPosition")) {
                                json.screenshotCameraPosition = storedData.screenshotCameraPosition;
                            }
                        } else {
                            console.warn("too few pieces");
                        }
                    }

                    data[1] = JSON.stringify(json);
                    options.body = rejoinBlob(data);


                    return realFetch(url, options);
                })
                .then(response => resolve(response))
            })
    }
    return realFetch(url, options);
}