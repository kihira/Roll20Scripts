enum LogLevel {
    DEBUG = 1,
    INFO = 2
}

interface Obligations {
    [key: string]: {
        amount: number,
        charID: string,
        lowerBound: number,
        upperBound: number,
        type: string,
        rowId: string,
        name: string
    };
}

interface State {
    swrpg: {
        groups: string[];
        activeColours: string[];
    };
}

class SWRPG {
    private settings = {
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

    private data = {
        data: {
            characters: [], // Array of player characters
            gmsheet: ""
        }
    };

    public init() {
        const characters = findObjs({type: "character"});
        _.each(characters, (char) => {
            // We know that it would be in someones journal so can use that to reduce calls. Ignore 'all'
            if (char.get("controlledby").length > 4 && parseInt(getAttrByName(char.get("id"), "pcgm"), 10) === 1) {
                this.data.characters.push(char.get("id"));
            }

            if (char.get("name") === this.settings.gmsheetname) {
                this.data.gmsheet = char.get("id");
                this.logger("init", "GM Sheet: " + this.data.gmsheet, LogLevel.DEBUG);
            }
        });
        this.logger("init", `Built player cache of ${this.data.characters.length}: ${this.data.characters}`, LogLevel.INFO);

        // Create state property if it does not exist
        if (!state.swrpg) {
            state.swrpg = {
                groups: [],
                activeColours: []
            };
        }
    }
    public setupEventHandlers() {
        on("change:graphic:" + this.settings.minion.woundBar + "_value", _.bind(this.handleChangeGraphic, this));
        on("chat:message", _.bind(this.handleInput, this));
    }
    private handleInput(msg: Message) {
        if (msg.type !== "api" || !msg.content.startsWith("!swrpg")) return;

        for (let i = 0; i < this.settings.functions.length; i++) {
            const key = this.settings.functions[i];
            if (msg.content.match(key.regex)) {
                // Find character player is speaking as
                let speaking = null;
                findObjs({_type: "character"}).forEach(function(chr) {
                    if (chr.get("name") === msg.who) {
                        speaking = chr;
                    }
                });

                msg.content = msg.content.replace(this.settings.command, "");
                msg.content = msg.content.replace(key.regex, "");
                msg.content = msg.content.substr(2);

                key.func(speaking, msg.content);
                break;
            }
        }
    }
    private handleChangeGraphic(obj: Roll20Object) {
        if (obj.get("_subtype") !== "token") return;

        for (const i in state.swrpg.groups) {
            const group = state.swrpg.groups[i];
            // Minion is part of the group
            if (group.indexOf(obj.get("_id")) !== -1) {
                const wounds = parseInt(obj.get(this.settings.minion.woundBar + "_value"));
                for (const tokenID in group) {
                    if (!group.hasOwnProperty(tokenID)) continue;

                    const token = getObj(ObjTypes.Graphic, group[tokenID]);
                    token.set(this.settings.minion.woundBar + "_value", wounds);
                }
                const count = Math.ceil(wounds / parseInt(getAttrByName(obj.get("represents"), "wounds", "max")));
                if (count < group.length) {
                    this.whisperGM("Remove " + (group.length - count) + " minion");
                }
            }
        }
    }
    private handleDestroyGraphic(obj: Roll20Object) {
        if (obj.get("_subtype") !== "token") return;
        for (const i in state.swrpg.groups) {
            let group = state.swrpg.groups[i];
            // Check if this token is part of the group
            if (group.indexOf(obj.get("_id")) !== -1) {
                if (group.length === 1) { // If last minion, remove group and free colour
                    const cols = obj.get("statusmarkers").split(",");
                    let col = "";
                    for (const c in this.settings.minion.groupColours) {
                        col = this.settings.minion.groupColours[c];
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
                    for (const j in group) {
                        if (!group.hasOwnProperty(j)) continue;

                        const tokenID = group[j];
                        const token = getObj(ObjTypes.Graphic, tokenID);
                        token.set(this.settings.minion.groupSizeBar + "_value", token.get(swrpg.settings.minion.groupSizeBar + "_value") - 1);
                    }
                }
                break;
            }
        }
    }
    private buildDutyObligationTable(title: string, pattern: string) {
        const obligations: Obligations = {};
        let template = "&{template:duty} {{title=" + title + "}} ";
        const valuePattern = new RegExp("repeating_" + pattern + "_.+_" + pattern + "-mag");
        const typePattern = new RegExp("repeating_" + pattern + "_.+_" + pattern + "-type");

        // Build table
        _.each(this.data.characters, (id: string) => {
            const attrs = findObjs({type: "attribute", characterid: id});
            const name = getAttrByName(id, "name");

            _.each(attrs, (attr) => {
                const rowId = attr.get("name").substr(("repeating_" + pattern + "_").length, 20);
                if (attr.get("name").match(valuePattern)) {
                    if (obligations[rowId] !== undefined) {
                        obligations[rowId].amount = parseInt(attr.get("current"), 10);
                    }
                    else {
                        obligations[rowId] = {
                            amount: parseInt(attr.get("current"), 10),
                            charID: id,
                            lowerBound: 0,
                            upperBound: 0,
                            type: "",
                            name,
                            rowId
                        };
                    }
                } // Value
                else if (attr.get("name").match(typePattern)) {
                    if (obligations[rowId] !== undefined) {
                        obligations[rowId].type = attr.get("current");
                    }
                    else {
                        obligations[rowId] = {
                            amount: 0,
                            charID: "",
                            lowerBound: 0,
                            upperBound: 0,
                            type: attr.get("current"),
                            rowId,
                            name
                        };
                    }
                } // Type
            });
        });

        // Roll
        const roll = randomInteger(100);
        template += "{{roll=" + roll + "}} ";

        if (roll >= 10 && roll < 100) {
            const rollStr = roll.toString();
            if (rollStr[0] === rollStr[1]) {
                template += "{{double=Yes!}} ";
            }
        }

        // Check if anyone has been activated
        _.each(obligations, (char) => {
            if (roll >= char.lowerBound && roll <= char.upperBound) {
                template += "{{Activated=<b>" + char.name + "</b>}}";
            }
        });

        // Output table into template
        let currValue = 1;
        _.each(obligations, (entry) => {
            let activated = false;
            entry.lowerBound = currValue;
            entry.upperBound = (currValue + entry.amount) - 1;

            // Check if activated
            if (roll >= entry.lowerBound && roll <= entry.upperBound) {
                activated = true;
                template += "{{Activated=<b>" + entry.name + "</b>}}";
            }

            template += `{{${entry.rowId}=<td>${entry.name}</td><td>${entry.type}</td><td>${entry.lowerBound}-${entry.upperBound}</td>}}`;
            currValue = entry.upperBound + 1;
        });

        return template;
    }
    private getColour() {
        for (const col in this.settings.minion.groupColours) {
            if (state.swrpg.activeColours.indexOf(col) === -1) {
                state.swrpg.activeColours.push(col);
                return this.settings.minion.groupColours[col];
            }
        }
    }
    private whisperGM(message: string) {
        sendChat(this.settings.chatname, "/w GM " + message, null, { noarchive: true });
    }
    private calcDamage(charID: string, message: string) {
        const damage = /damage:(\d*)\|?/.exec(message)[1];
        const pierce = /pierce:(\d*)\|?/.exec(message)[1];
        const parry = /parry/.exec(message) !== null;
        const redSoak = Math.max(0, parseInt(getAttrByName(charID, "soak")) - pierce);
        const valParry = 2 + parseInt(getAttrByName(charID, "talent-parry"));

        return "max(0,[[" + damage + "[Damage]-" + redSoak + "[Soak]" + (parry ? ("-" + valParry + "[Parry]") : "") + "+0d0]])";
    }
    private activate(tokenID: string) {
        const currToken = getObj(ObjTypes.Graphic, tokenID);
        const character = getObj(ObjTypes.Character, currToken.get("represents"));
        const size = currToken.get(this.settings.minion.groupSizeBar + "_value");
        const attribute = findObjs({
            type: "attribute",
            characterid: currToken.get("represents"),
            name: "npc-minion-group-size"
        }, {caseInsensitive: true})[0];
        attribute.set("current", size);
        this.whisperGM("Minion group size to " + size + " for " + character.get("name"));
    }
    private createGroup(tokenID: string, count: number, createMinions: boolean) {
        const currToken = getObj(ObjTypes.Graphic, tokenID);
        const charID = currToken.get("represents");
        const wounds = parseInt(getAttrByName(charID, "npc-wounds", "max"), 10) * (count + 1);

        if (getAttrByName(charID, "npc-type") === "minion") {
            currToken.set(this.settings.minion.groupSizeBar + "_value", count + 1);
            currToken.set(this.settings.minion.groupSizeBar + "_max", count + 1);
            currToken.set(this.settings.minion.woundBar + "_value", wounds);
            currToken.set(this.settings.minion.woundBar + "_max", wounds);
            if (createMinions) {
                const group = [ tokenID ];
                const col = this.getColour();
                currToken.set("status_" + col, true);

                for (let i = 0; i < count; i++) {
                    const obj = createObj(ObjTypes.Graphic, {
                        name: currToken.get("name"),
                        controlledby: currToken.get("controlledby"),
                        represents: charID,
                        left: currToken.get("left") + (i + 1) * -70,
                        top: currToken.get("top"),
                        width: currToken.get("width"),
                        height: currToken.get("height"),
                        showname: true,
                        imgsrc: currToken.get("imgsrc").replace("max", "thumb"),
                        pageid: currToken.get("pageid"),
                        layer: currToken.get("layer")
                    });
                    obj.set("status_" + col, true);
                    obj.set(this.settings.minion.groupSizeBar + "_value", count + 1);
                    obj.set(this.settings.minion.groupSizeBar + "_max", count + 1);
                    obj.set(this.settings.minion.woundBar + "_value", wounds);
                    obj.set(this.settings.minion.woundBar + "_max", wounds);
                    group.push(obj.get("_id"));
                }
                state.swrpg.groups.push(group);
            }
        }
    }
    private getGroup(tokenID: string) {
        for (const i in state.swrpg.groups) {
            const group = state.swrpg.groups[i];
            // Minion is part of the group
            if (group.indexOf(tokenID) !== -1) {
                return group;
            }
        }
        return false;
    }
    private reset() {
        state.swrpg.groups = [];
        state.swrpg.activeColours = [];
        this.whisperGM("Minion groups reset");
    }
    private logger(functionName: string, msg: string, level: LogLevel) {
        if (level === undefined) level = LogLevel.DEBUG;
        if (level === LogLevel.INFO || (level === LogLevel.DEBUG && this.settings.debug)) {
            log("(" + this.settings.name + ") " + functionName + ": " + msg);
        }
    }
    private duty() {
        sendChat(this.settings.chatname, this.buildDutyObligationTable("Duty Check", "duty"));
    }
    private obligation() {
        log("Obligation");
        sendChat(this.settings.chatname, this.buildDutyObligationTable("Obligation Check", "obligation"));
    }
    private chat(character: Roll20Object, message: string) {
        if (character === null) return;

        let result;
        result = /calcDamage\((.*?)\)/g.exec(message);
        if (result) {
            message = message.replace(/calcDamage\((.*?)\)/g, this.calcDamage(character.get("id"), result[1]));
        }
        sendChat("character|" + character.get("id"), message);
    }
}

let SWRPGInstance = new SWRPG();

on("ready", () => {
    SWRPGInstance.init();
    SWRPGInstance.setupEventHandlers();
});
