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

// noinspection JSUnusedGlobalSymbols
interface State {
    swrpg: {
        minionGroups: {
            groups: string[][];
            woundBar: string;
            sizeBar: string;
            colours: string[];
            activeColours: string[];
        }
    };
}

class SWRPG {
    private chatName = "Dice System";
    private gmSheetName = "-DicePool";
    private debug = true;

    private characters: string[] = []; // Array of player characters
    private gmsheet: string;

    public init() {
        const characters = findObjs({type: "character"});
        _.each(characters, (char) => {
            // We know that it would be in someones journal so can use that to reduce calls. Ignore 'all'
            if (char.get("controlledby").length > 4 && parseInt(getAttrByName(char.get("id"), "pcgm"), 10) === 1) {
                this.characters.push(char.get("id"));
            }

            if (char.get("name") === this.gmSheetName) {
                this.gmsheet = char.get("id");
                this.logger("init", "GM Sheet: " + this.gmsheet, LogLevel.DEBUG);
            }
        });
        this.logger("init", `Built player cache of ${this.characters.length}: ${this.characters}`, LogLevel.INFO);

        // Create state property if it does not exist
        if (!state.swrpg) {
            state.swrpg = {
                minionGroups: {
                    groups: [],
                    woundBar: "bar1",
                    sizeBar: "bar3",
                    colours: ["red", "blue", "green", "brown", "purple", "pink", "yellow"],
                    activeColours: []
                },
            };
        }
    }
    public setupEventHandlers() {
        on("change:graphic:" + state.swrpg.minionGroups.woundBar + "_value", _.bind(this.handleChangeGraphic, this));
        on("chat:message", _.bind(this.handleInput, this));
    }
    private handleInput(msg: Message) {
        if (msg.type !== "api" || !msg.content.startsWith("!swrpg")) return;

        const tokenized = msg.content.split(" ");
        const args = _.drop(tokenized, 2);
        switch (tokenized[1]) {
            case "duty":
                sendChat(this.chatName, this.buildDutyObligationTable("Duty Check", "duty"));
                break;
            case "obligation":
                sendChat(this.chatName, this.buildDutyObligationTable("Obligation Check", "obligation"));
                break;
            case "minion":
                break;
        }
    }
    private handleChangeGraphic(obj: Roll20Object) {
        if (obj.get("_subtype") !== "token") return;

        for (const group of state.swrpg.minionGroups.groups) {
            if (!_.contains(group, obj.id)) continue;

            // Loop through and update wounds on all other tokens
            const wounds = parseInt(obj.get(state.swrpg.minionGroups.woundBar + "_value"), 10);
            for (const tokenID of group) {
                const token = getObj(ObjTypes.Graphic, tokenID);
                token.set(state.swrpg.minionGroups.woundBar + "_value", wounds);
            }
            // Check if we're below threshold and if so, tell GM
            const count = Math.ceil(wounds / parseInt(getAttrByName(obj.get("represents"), "wounds", "max"), 10));
            if (count < group.length) {
                this.whisperGM("Remove " + (group.length - count) + " minion");
            }
            break;
        }
    }
    private handleDestroyGraphic(obj: Roll20Object) {
        if (obj.get("_subtype") !== "token") return;
        for (const group of state.swrpg.minionGroups.groups) {
            if (!_.contains(group, obj.id)) continue;

            if (group.length === 1) { // If last minion, remove group and free colour
                const statusMarkers = obj.get("statusmarkers").split(",");
                const marker = _.find(statusMarkers, (value) => {
                    return _.contains(state.swrpg.minionGroups.colours, value);
                });

                if (marker !== undefined) {
                    state.swrpg.minionGroups.activeColours = _.reject(state.swrpg.minionGroups.activeColours, (value) => value === marker);
                    state.swrpg.minionGroups.groups.splice(state.swrpg.minionGroups.groups.indexOf(group), 1);
                }
            }
            else {
                group.splice(group.indexOf(obj.id), 1); // Remove from array
                for (const tokenID of group) {
                    const token = getObj(ObjTypes.Graphic, tokenID);
                    token.set(state.swrpg.minionGroups.sizeBar + "_value", group.length);
                }
            }
            break;
        }
    }
    private buildDutyObligationTable(title: string, pattern: string) {
        const obligations: Obligations = {};
        let template = "&{template:duty} {{title=" + title + "}} ";
        const valuePattern = new RegExp("repeating_" + pattern + "_.+_" + pattern + "-mag");
        const typePattern = new RegExp("repeating_" + pattern + "_.+_" + pattern + "-type");

        // Build table
        _.each(this.characters, (id: string) => {
            const attrs = findObjs({type: "attribute", characterid: id});
            const name = getAttrByName(id, "name");

            _.each(attrs, (attr) => {
                const rowId = attr.get("name").substr(("repeating_" + pattern + "_").length, 20);
                if (attr.get("name").match(valuePattern)) { // Value
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
                }
                else if (attr.get("name").match(typePattern)) { // Type
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
                }
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

        // Output table into template
        let currValue = 1;
        _.each(obligations, (entry) => {
            entry.lowerBound = currValue;
            entry.upperBound = (currValue + entry.amount) - 1;

            if (roll >= entry.lowerBound && roll <= entry.upperBound) {
                template += `{{Activated=<b>${entry.name}</b>}}`;
            }

            template += `{{${entry.rowId}=<td>${entry.name}</td><td>${entry.type}</td>` +
                        `<td>${entry.lowerBound}-${entry.upperBound}</td>}}`;
            currValue = entry.upperBound + 1;
        });

        return template;
    }
    private getColour() {
        for (const col in state.swrpg.minionGroups.colours) {
            if (state.swrpg.minionGroups.activeColours.indexOf(col) === -1) {
                state.swrpg.minionGroups.activeColours.push(col);
                return state.swrpg.minionGroups.colours[col];
            }
        }
    }

    private whisperGM(message: string) {
        sendChat(this.chatName, "/w GM " + message, null, { noarchive: true });
    }

    private calcDamage(charID: string, message: string): string {
        const damageRegex = /damage:(\d*)\|?/.exec(message);
        const pierceRegex = /pierce:(\d*)\|?/.exec(message);

        if (damageRegex == null || pierceRegex == null) return "";

        const damage = parseInt(damageRegex[1], 10);
        const pierce = parseInt(pierceRegex[1], 10);
        const parry = /parry/.exec(message) !== null;
        const redSoak = Math.max(0, parseInt(getAttrByName(charID, "soak"), 10) - pierce);
        const valParry = 2 + parseInt(getAttrByName(charID, "talent-parry"), 10);

        return `max(0,[[${damage}[Damage]-${redSoak}[Soak]" ${(parry ? (`-${valParry}[Parry]`) : "")} +0d0]])`;
    }

    private activate(tokenID: string) {
        const currToken = getObj(ObjTypes.Graphic, tokenID);
        const character = getObj(ObjTypes.Character, currToken.get("represents"));
        const size = currToken.get(state.swrpg.minionGroups.sizeBar + "_value");
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
            currToken.set(state.swrpg.minionGroups.sizeBar + "_value", count + 1);
            currToken.set(state.swrpg.minionGroups.sizeBar + "_max", count + 1);
            currToken.set(state.swrpg.minionGroups.woundBar + "_value", wounds);
            currToken.set(state.swrpg.minionGroups.woundBar + "_max", wounds);
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
                    obj.set(state.swrpg.minionGroups.sizeBar + "_value", count + 1);
                    obj.set(state.swrpg.minionGroups.sizeBar + "_max", count + 1);
                    obj.set(state.swrpg.minionGroups.woundBar + "_value", wounds);
                    obj.set(state.swrpg.minionGroups.woundBar + "_max", wounds);
                    group.push(obj.get("_id"));
                }
                state.swrpg.minionGroups.groups.push(group);
            }
        }
    }

    private getGroup(tokenID: string): string[] | false {
        for (const group of state.swrpg.minionGroups.groups) {
            if (_.contains(group, tokenID)) {
                return group;
            }
        }
        return false;
    }

    private reset() {
        state.swrpg.minionGroups.groups = [];
        state.swrpg.minionGroups.activeColours = [];
        this.whisperGM("Minion groups reset");
    }

    private logger(functionName: string, msg: string, level: LogLevel) {
        if (level === undefined) level = LogLevel.DEBUG;
        if (level === LogLevel.INFO || (level === LogLevel.DEBUG && this.debug)) {
            log(`[SWRPG] ${functionName}: ${msg}`);
        }
    }

    private chat(character: Roll20Object, message: string) {
        if (character === null) return;

        const result = /calcDamage\((.*?)\)/g.exec(message);
        if (result != null) {
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
