const LOG = {
    DEBUG: 1,
    INFO: 2
};

function create_duty_obligation(title, pattern) {
    var obligations = {};
    var template = "&{template:duty} {{title="+title+"}} ";
    var valuePattern = new RegExp("repeating_"+pattern+"_.+_"+pattern+"-mag");
    var typePattern = new RegExp("repeating_"+pattern+"_.+_"+pattern+"-type");

    // Build table
    _.each(swrpg.data.characters, function(id) {
        var attrs = findObjs({type: "attribute", characterid: id});
        var name = getAttrByName(id, "name");

        _.each(attrs, function(attr) {
            var row_id = attr.get("name").substr(("repeating_"+pattern+"_").length, 20);
            if (attr.get("name").match(valuePattern)) {
                if (obligations[row_id] !== undefined) {
                    obligations[row_id].amount = parseInt(attr.get("current"));
                }
                else {
                    obligations[row_id] = {
                        amount: parseInt(attr.get("current")),
                        charID: id,
                        name: name,
                        row_id: row_id
                    };
                }
            } // Value
            else if (attr.get("name").match(typePattern)) {
                if (obligations[row_id] !== undefined) {
                    obligations[row_id].type = attr.get("current");
                }
                else {
                    obligations[row_id] = {
                        type: attr.get("current"),
                        row_id: row_id,
                        name: name
                    };
                }
            } // Type
        });
    });

    // Roll
    var roll = randomInteger(100);
    template += "{{roll="+roll+"}} ";

    if (roll >= 10 && roll < 100)
    {
        var rollStr = roll.toString();
        if (rollStr[0] === rollStr[1]) {
            template += "{{double=Yes!}} ";
        }
    }

    // Check if anyone has been activated
    _.each(obligations, function(char) {
        if (roll >= char.lowerBound && roll <= char.upperBound) {
            template += "{{Activated=<b>"+char.name+"</b>}}";
        }
    });

    // Output table into template
    var currValue = 1;
    _.each(obligations, function (entry) {
        var activated = false;
        entry.lowerBound = currValue;
        entry.upperBound = (currValue+entry.amount)-1;

        // Check if activated
        if (roll >= entry.lowerBound && roll <= entry.upperBound) {
            activated = true;
            template += "{{Activated=<b>"+entry.name+"</b>}}";
        }

        template += "{{"+entry.row_id+"=<td>"+entry.name+"</td><td>"+entry.type+"</td><td>"+entry.lowerBound+"-"+entry.upperBound+"</td>}} ";
        currValue = entry.upperBound+1;
    });

    return template;
}

function getColour() {
    for (var col in swrpg.settings.minion.groupColours) {
        if (state.swrpg.activeColours.indexOf(col) === -1) {
            state.swrpg.activeColours.push(col);
            return swrpg.settings.minion.groupColours[col];
        }
    }
}

function whisperGM(message) {
    sendChat(swrpg.settings.chatname, "/w GM " + message, null, { noarchive:true });
}

var swrpg = swrpg || {

    logger: function(functionName, msg, level) {
        if (level === undefined) level = LOG.DEBUG;
        if (level === LOG.INFO || (level === LOG.DEBUG && swrpg.settings.debug)) {
            log("("+swrpg.settings.name+") "+functionName+": "+msg);
        }
    },

    init: function() {
        var characters = findObjs({type: "character"});
        _.each(characters, function(char) {
            // We know that it would be in someones journal so can use that to reduce calls. Ignore 'all'
            if (char.get("controlledby").length > 4 && parseInt(getAttrByName(char.get("id"), "pcgm")) === 1) {
                swrpg.data.characters.push(char.get("id"));
            }

            if (char.get("name") === swrpg.settings.gmsheetname) {
                swrpg.data.gmsheet = char.get("id");
                swrpg.logger("init", "GM Sheet: " + swrpg.data.gmsheet, LOG.DEBUG);
            }
        });
        swrpg.logger("init", "Built player cache of "+swrpg.data.characters.length+": "+swrpg.data.characters, LOG.INFO);

        // Create state property if it does not exist
        if (!state.swrpg) state.swrpg = {};
        if (!state.swrpg.groups) {
            state.swrpg.groups = [];
        }
        if (!state.swrpg.activeColours) {
            state.swrpg.activeColours = [];
        }

        //Register events
        swrpg.events();

        sendChat(swrpg.settings.chatname, "Reset Destiny Pool? [Reset](!eed characterID&#40;" + swrpg.data.gmsheet + "&#41; destiny clearPool)", null)
    },

    duty: function() {
        sendChat(swrpg.settings.chatname, create_duty_obligation("Duty Check", "duty"));
    },

    obligation: function() {
        log("Obligation");
        sendChat(swrpg.settings.chatname, create_duty_obligation("Obligation Check", "obligation"));
    },

    chat: function(character, message) {
        if (character === null) return;

        var result;
        result = /calcDamage\((.*?)\)/g.exec(message);
        if (result) {
            message = message.replace(/calcDamage\((.*?)\)/g, calcDamage(character.get("id"), result[1]));
        }
        sendChat("character|"+character.get("id"), message);
    },

    roll: function() {
        // todo
        sendChat("Dice System", "/roll 3d6", function(results) {
            sendChat(swrpg.settings.chatname, results[0].content);
        });
    },

    events: function() {
        on("chat:message", function(msg) {
            if (msg.type !== "api") return;
            if (msg.content.match(swrpg.settings.command)) {
                for (var i = 0; i < swrpg.settings.functions.length; i++) {
                    var key = swrpg.settings.functions[i];
                    if (msg.content.match(key.regex)) {
                        // Find character player is speaking as
                        var speaking = null;
                        findObjs({_type: 'character'}).forEach(function(chr) {
                            if (chr.get('name') === msg.who) {
                                speaking = chr;
                            }
                        });

                        msg.content = msg.content.replace(swrpg.settings.command, "");
                        msg.content = msg.content.replace(key.regex, "");
                        msg.content = msg.content.substr(2);

                        key['func'](speaking, msg.content);
                        break;
                    }
                }
            }
        });

        on("change:graphic:"+swrpg.settings.minion.woundBar+"_value", function(obj, prev) {
            if (obj.get("_subtype") !== "token") return;

            for (var i in state.swrpg.groups) {
                var group = state.swrpg.groups[i];
                // Minion is part of the group
                if (group.indexOf(obj.get("_id")) !== -1) {
                    var wounds = parseInt(obj.get(swrpg.settings.minion.woundBar+"_value"));
                    for (var tokenID in group) {
                        if (!group.hasOwnProperty(tokenID)) continue;

                        var token = getObj("graphic", group[tokenID]);
                        token.set(swrpg.settings.minion.woundBar+"_value", wounds);
                    }
                    var count = Math.ceil(wounds/parseInt(getAttrByName(obj.get("represents"), "wounds", "max")));
                    if (count < group.length) {
                        whisperGM("Remove "+(group.length-count)+" minion");
                    }
                }
            }
        });

        on("destroy:graphic", function(obj) {
            if (obj.get("_subtype") !== "token") return;
            for (var i in state.swrpg.groups) {
                var group = state.swrpg.groups[i];
                // Check if this token is part of the group
                if (group.indexOf(obj.get("_id")) !== -1) {
                    if (group.length === 1) { // If last minion, remove group and free colour
                        var cols = obj.get("statusmarkers").split(",");
                        var col = "";
                        for (var c in swrpg.settings.minion.groupColours) {
                            col = swrpg.settings.minion.groupColours[c];
                            if (cols.indexOf(col) !== -1) {
                                break;
                            }
                        }
                        state.swrpg.activeColours.splice(state.swrpg.activeColours.indexOf(col), 1);
                        state.swrpg.groups.splice(state.swrpg.groups.indexOf(group), 1);
                        group = null;
                    }
                    else {
                        group.splice(group.indexOf(obj.get("_id")), 1); // Remove from array
                        for (var j in group) {
                            if (!group.hasOwnProperty(j)) continue;

                            var tokenID = group[j];
                            var token = getObj("graphic", tokenID);
                            token.set(swrpg.settings.minion.groupSizeBar+"_value", token.get(swrpg.settings.minion.groupSizeBar+"_value")-1);
                        }
                    }
                    break;
                }
            }
        });
    }
};

swrpg.settings = {
    command: /!swrpg/,
    functions: [
        {
            func: swrpg.duty,
            regex: /duty/
        },
        {
            func: swrpg.obligation,
            regex: /obligation/
        },
        {
            func: swrpg.minion,
            regex: /minion/
        },
        {
            func: swrpg.chat,
            regex: /chat/
        }
    ],
    minion: {
        woundBar: "bar1",
        groupSizeBar: "bar3",
        groupColours: ["red", "blue", "green", "brown", "purple", "pink", "yellow"]
    },
    name: "SWRPG",
    chatname: "Dice System",
    gmsheetname: "-DicePool",
    debug: true
};

swrpg.data = {
    characters: [], // Array of player characters
    gmsheet: ""
};

on("ready", function() {
    swrpg.init();
});

function reset() {
    state.swrpg.groups = [];
    state.swrpg.activeColours = [];
    whisperGM("Minion groups reset");
}

function getGroup(tokenID) {
    for (var i in state.swrpg.groups) {
        var group = state.swrpg.groups[i];
        // Minion is part of the group
        if (group.indexOf(tokenID) !== -1) {
            return group;
        }
    }
    return false;
}

function createGroup(tokenID, count, createMinions) {
    const currToken = getObj("graphic", tokenID);
    const charID = currToken.get("represents");
    const wounds = parseInt(getAttrByName(charID, "npc-wounds", "max")) * (count+1);

    if (getAttrByName(charID, "npc-type") === "minion") {
        currToken.set(swrpg.settings.minion.groupSizeBar+"_value", count+1);
        currToken.set(swrpg.settings.minion.groupSizeBar+"_max", count+1);
        currToken.set(swrpg.settings.minion.woundBar+"_value", wounds);
        currToken.set(swrpg.settings.minion.woundBar+"_max", wounds);
        if (createMinions) {
            var group = [ tokenID ];
            var col = getColour();
            currToken.set("status_"+col, true);

            for (var i = 0; i < count; i++) {
                var obj = createObj("graphic", {
                    name: currToken.get("name"),
                    controlledby: currToken.get("controlledby"),
                    represents: charID,
                    left: currToken.get("left")+(i+1)*-70,
                    top: currToken.get("top"),
                    width: currToken.get("width"),
                    height: currToken.get("height"),
                    showname: true,
                    imgsrc: currToken.get("imgsrc").replace("max", "thumb"),
                    pageid: currToken.get("pageid"),
                    layer: currToken.get("layer")
                });
                obj.set("status_"+col, true);
                obj.set(swrpg.settings.minion.groupSizeBar+"_value", count+1);
                obj.set(swrpg.settings.minion.groupSizeBar+"_max", count+1);
                obj.set(swrpg.settings.minion.woundBar+"_value", wounds);
                obj.set(swrpg.settings.minion.woundBar+"_max", wounds);
                group.push(obj.get("_id"));
            }
            state.swrpg.groups.push(group);
        }
    }
}

function activate(tokenID) {
    var currToken = getObj("graphic", tokenID);
    var character = getObj("character", currToken.get("represents"));
    var size = currToken.get(swrpg.settings.minion.groupSizeBar+"_value");
    var attribute = findObjs({
        type: 'attribute',
        characterid: currToken.get("represents"),
        name: "npc-minion-group-size"
    }, {caseInsensitive: true})[0];
    attribute.set("current", size);
    whisperGM("Minion group size to "+size+" for "+character.get("name"));
}

function calcDamage(charID, message) {
    var damage = /damage:(\d*)\|?/.exec(message)[1];
    var pierce = /pierce:(\d*)\|?/.exec(message)[1];
    var parry = /parry/.exec(message) !== null;
    var redSoak = Math.max(0, parseInt(getAttrByName(charID, "soak"))-pierce);
    var valParry = 2+parseInt(getAttrByName(charID, "talent-parry"));


    return "max(0,[["+damage+"[Damage]-"+redSoak+"[Soak]"+(parry?("-"+valParry+"[Parry]"):"")+"+0d0]])";
}