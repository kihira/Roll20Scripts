declare var state: {TurnTracker: TurnTrackerState};

class TurnTracker {
    private chatName = "TurnTracker";
    private currentTokenId: string;
    private active: boolean;
    private activatedTokens: string[] = [];
    private markerInterval: number;

    public init() {
        if (state.TurnTracker === undefined) {
            state.TurnTracker = {
                tokenURL: "https://s3.amazonaws.com/files.d20.io/images/11920268/i0nMbVlxQLNMiO12gW9h3g/thumb.png",
                clearOnFinish: true,
                finishOnClose: false,
                trackerSizeRatio: 2,
                statusMarkerOnActed: "flying-flag",
                animationSpeed: 3,
            };
        }
    }

    public setupEventHandlers() {
        on("change:campaign:initiativepage", _.bind(this.handleInitiativePage, this));
        on("change:campaign:turnorder", _.bind(this.handleTurnOrderChange, this));
        on("change:graphic", _.bind(this.handleTokenUpdate, this));
        on("destroy:graphic", _.bind(this.handleDestroyGraphic, this));
        on("chat:message", _.bind(this.handleInput, this));
    }

    private handleInput(msg: Message) {
        if (msg.type !== "api" || !msg.content.startsWith("!turntracker")) return;

        const tokenized = msg.content.split(" ");
        const args = _.drop(tokenized, 2);
        switch (tokenized[1]) {
            case "start":
                this.active = true;
                this.startAnimation();
                this.turnOrderChange();
                break;
            case "finish":
                this.finish();
                break;
            case "claim":
                if (!this.active) this.whisperPlayer(msg.playerid, "TurnTracker not active yet, cannot claim slot");
                if (args.length === 0) this.whisperPlayer(msg.playerid, "Missing token id");
                else this.claimSlot(msg.playerid, args[0]);
                break;
            case "sort":
                this.sortTracker();
                break;
            case "config":
                if (tokenized.length === 2) {
                    this.whisperPlayer(msg.playerid, "Missing config option");
                    break;
                }
                if (tokenized.length === 3) {
                    this.whisperPlayer(msg.playerid, "Missing config parameter(s)");
                    break;
                }
                switch (tokenized[2]) {
                    case "tokenURL":
                        state.TurnTracker.tokenURL = tokenized[3];
                        this.whisperPlayer(msg.playerid, `Set tokenURL to "${state.TurnTracker.tokenURL}"`);
                        break;
                    case "clearOnFinish":
                        state.TurnTracker.clearOnFinish = tokenized[3] === "true";
                        this.whisperPlayer(msg.playerid, `Set clearOnFinish to "${state.TurnTracker.clearOnFinish}"`);
                        break;
                    case "finishOnClose":
                        state.TurnTracker.finishOnClose = tokenized[3] === "true";
                        this.whisperPlayer(msg.playerid, `Set finishOnClose to "${state.TurnTracker.finishOnClose}"`);
                        break;
                    case "trackerSizeRatio":
                        state.TurnTracker.trackerSizeRatio = parseFloat(tokenized[3]);
                        this.whisperPlayer(msg.playerid, `Set trackerSizeRatio to "${state.TurnTracker.trackerSizeRatio}"`);
                        break;
                    case "statusMarkerOnActed":
                        if (tokenized[3] === "false") state.TurnTracker.statusMarkerOnActed = false;
                        else state.TurnTracker.statusMarkerOnActed = tokenized[3];
                        this.whisperPlayer(msg.playerid, `Set statusMarkerOnActed to "${state.TurnTracker.statusMarkerOnActed}"`);
                        break;
                    case "animationSpeed":
                        state.TurnTracker.animationSpeed = parseInt(tokenized[3], 10);
                        this.whisperPlayer(msg.playerid, `Set animationSpeed to "${state.TurnTracker.animationSpeed}"`);
                        break;
                }
                break;
            default:
                this.whisperPlayer(msg.playerid, "Unknown command");
        }
    }

    private finish() {
        this.active = false;
        clearInterval(this.markerInterval);
        this.currentTokenId = "";
        if (state.TurnTracker.clearOnFinish) Campaign().set("turnorder", JSON.stringify([]));
    }

    private getMarker(): Roll20Object {
        let marker = findObjs({type: "graphic", imgsrc: state.TurnTracker.tokenURL})[0];
        if (marker === undefined) {
            marker = createObj(ObjTypes.Graphic, {
                name: "TurnTracker",
                pageid: Campaign().get("playerpageid"),
                layer: "gmlayer",
                imgsrc: state.TurnTracker.tokenURL,
                left: 0,
                right: 0,
                height: 70,
                width: 70,
            });
        }

        return marker;
    }

    // Gets remaining player tokens
    private getPlayerTokens() {
        const currPage = Campaign().get("playerpageid");
        return filterObjs((value) => {
            if (value.get("type") !== "graphic" || value.get("subtype") !== "token") return false;
            if (!value.get("represents") || !value.get("controlledby")) return false;
            return !_.contains(value.get("controlledby").split(","), "all") &&
                !_.contains(this.activatedTokens, value.get("id")) && value.get("pageid") === currPage;
        });
    }

    // Gets remaining npc tokens
    private getNpcTokens() {
        const currPage = Campaign().get("playerpageid");
        return filterObjs((value) => {
            if (value.get("type") !== "graphic" || value.get("subtype") !== "token") return false;
            if (!value.get("represents") || value.get("controlledby")) return false;
            return !_.contains(this.activatedTokens, value.get("id")) && value.get("pageid") === currPage;
        });
    }

    private sortTracker() {
        const turnOrder = this.getTurnOrder();

        turnOrder.sort((a: TurnOrderEntry, b: TurnOrderEntry) => {
            if (a.custom.startsWith("ROUND")) return 100;

            const aValues: number[] = [];
            const bValues: number[] = [];
            _.each(a.pr.split(":"), (value) => {
                aValues.push(parseInt(value, 10));
            });
            _.each(b.pr.split(":"), (value) => {
                bValues.push(parseInt(value, 10));
            });

            if (aValues.length !== 2 || bValues.length !== 2) {
                log("Not valid data");
                return 0; // Don't sort if not valid data
            }

            // Sort by successes
            if (aValues[0] > bValues[0]) return -1;
            if (aValues[0] < bValues[0]) return 1;
            // Sort by advantage
            if (aValues[1] > bValues[1]) return -1;
            if (aValues[1] < bValues[1]) return 1;
            // Sort by type (NPCs always go last)
            if (a.custom === "PC") return -1;
            return 1;
        });

        Campaign().set("turnorder", JSON.stringify(turnOrder));
    }

    private claimSlot(playerId: string, tokenId: string) {
        if (_.contains(this.activatedTokens, tokenId)) {
            this.whisperPlayer(playerId, "Cannot claim slot for this token, has already acted");
            return;
        }
        this.activatedTokens.push(tokenId);

        // Get and update current token
        this.currentTokenId = tokenId;
        const currentToken = getObj(ObjTypes.Graphic, this.currentTokenId);
        this.handleTokenUpdate(currentToken);
        if (state.TurnTracker.statusMarkerOnActed) {
            currentToken.set("status_" + state.TurnTracker.statusMarkerOnActed, true);
        }

        const cImage = currentToken.get("imgsrc");
        const cRatio = parseInt(currentToken.get("width"), 10) / parseInt(currentToken.get("height"), 10);

        const cNameString = "The next turn has begun!";

        let PlayerAnnounceExtra = '<a style="position:relative;z-index:10000; top:-1em;float: right;font-size: .6em; color: white; border: 1px solid #cccccc; border-radius: 1em; margin: 0 .1em; font-weight: bold; padding: .1em .4em;" href="!eot">EOT &' + "#x21e8;</a>";
        const characterId = currentToken.get("represents");
        if (characterId) {
            const Char = getObj(ObjTypes.Character, characterId);
            if (Char && _.isFunction(Char.get)) {
                const Controllers = Char.get("controlledby").split(",");
                _.each(Controllers, (c) => {
                    switch (c) {
                        case "all":
                            PlayerAnnounceExtra += '<div style="' +
                                "padding: 0px 5px;" +
                                "font-weight: bold;" +
                                "text-align: center;" +
                                "font-size: 100%;" +
                                "border: 5px solid black;" +
                                "background-color: white;" +
                                "color: black;" +
                                "letter-spacing: 3px;" +
                                "line-height: 130%;" +
                                '">' +
                                "All" +
                                "</div>";
                            break;

                        default:
                            const player = getObj(ObjTypes.Player, c);
                            if (player) {
                                const PlayerColor = player.get("color");
                                const PlayerName = player.get("displayname");
                                PlayerAnnounceExtra += '<div style="' +
                                    "padding: 5px;" +
                                    "text-align: center;" +
                                    "font-size: 100%;" +
                                    "background-color: " + PlayerColor + ";" +
                                    "text-shadow: " +
                                    "-1px -1px 1px #000," +
                                    " 1px -1px 1px #000," +
                                    "-1px  1px 1px #000," +
                                    " 1px  1px 1px #000;" +
                                    "letter-spacing: 3px;" +
                                    "line-height: 130%;" +
                                    '">' +
                                    PlayerName +
                                    "</div>";
                            }
                            break;
                    }
                });
            }
        }

        const tokenSize = 70;
        sendChat(
            "",
            "/direct " +
            "<div style='border: 3px solid #808080; background-color: #4B0082; color: white; padding: 1px 1px;'>" +
            '<div style="text-align: right; margin: 5px 5px; position: relative; vertical-align: text-bottom;">' +
            `<a style="position:relative;z-index:1000;float:right; background-color:transparent;border:0;padding:0;` +
            `margin:0;display:block;" href="!tm ping-target ${this.currentTokenId}">` +
            `<img src="${cImage}" style='width:${Math.round(tokenSize * cRatio)}px;height:${tokenSize}px;padding:0px 2px;' />` +
            "</a>" +
            '<span style="position:absolute; bottom: 0;right:' + Math.round((tokenSize * cRatio) + 6) + 'px;">' +
            cNameString +
            "</span>" +
            '<div style="clear:both;"></div>' +
            "</div>" +
            PlayerAnnounceExtra +
            '<div style="clear:both;"></div>' +
            "</div>");
    }

    private announceEndTurn() {
        const previousToken = getObj(ObjTypes.Graphic, this.currentTokenId);
        const img = previousToken.get("imgsrc");
        const imgAspect = parseInt(previousToken.get("width"), 10) / parseInt(previousToken.get("height"), 10);
        let pNameString = "The Previous turn is done.";
        if (previousToken && previousToken.get("showplayers_name")) {
            pNameString = "<span style='" +
                'font-family: Baskerville,"Baskerville Old Face","Goudy Old Style",Garamond,"Times New Roman",serif;' +
                "text-decoration: underline;" +
                "font-size: 130%;" +
                "'>" +
                previousToken.get("name") +
                "</span>'s turn is done.";
        }
        const tokenSize = 70;
        sendChat("",
            "/direct " +
            '<div style="text-align: left;  margin: 5px 5px;">' +
            '<a style="position:relative;z-index:1000;float:left; background-color:transparent;border:0;padding:0;margin:0;display:block;" href="!tm ping-target ' + previousToken.id + '">' +
            "<img src='" + img + "' style='width:" + Math.round(tokenSize * imgAspect) + "px; height:" + tokenSize + "px; padding: 0px 2px;' />" +
            "</a>" +
            pNameString +
            "</div>");
    }

    private announceTurn(who: string, tokens: Roll20Object[]) {
        let tokenContent = "";
        let hiddenTokenContent = "";
        _.each(tokens, ((value) => {
            const stuff =
                `<a style='width:39px;height:39px;margin:1px;background:none;padding:0;border:none;' href='!turntracker claim ${value.id}'>` +
                `<img src="${value.get("imgsrc")}"/></a>`;
            if (value.get("layer") === "gmlayer") hiddenTokenContent += stuff;
            else tokenContent += stuff;
        }));

        sendChat("",
            "/direct " +
            `<div style='padding: 1px;color:white;border:10px solid transparent;` +
            // todo border-image seems to be stripped by roll20 unfortunately
            `border-image:url(http://imgsrv.roll20.net/?src=i.imgur.com/NjP3JsT.png) 15 fill;` +
            `background:#284666;` +
            `font-family:"teuton mager","helvetica neue","helvetica","arial",sans-serif;font-weight:bold;'>` +
            `<div style='text-align:center;font-size:20px;padding:5px 0 5px 5px;vertical-align:text-top'>${who} Turn</div>` +
            "<hr style='border-top:none;margin-top:15px;'>" +
            "<span style='position:absolute;top:54px;font-size:10px'>Remaining tokens</span>" +
            tokenContent +
            "</div>");

        if (hiddenTokenContent) {
            sendChat("",
                "/w gm" + hiddenTokenContent);
        }
    }

    private announceClaimTurn() {
        // todo make sure the name/icon is hidden if not visible to players?
    }

    private turnOrderChange() {
        if (!Campaign().get("initiativepage")) return;

        const turnOrder: TurnOrderEntry[] = this.getTurnOrder();
        const current: TurnOrderEntry | undefined = _.first(turnOrder);
        if (current === undefined) return;

        // Announce end of turn if there was a previous one
        if (this.currentTokenId) {
            this.announceEndTurn();
            this.getMarker().set({
                layer: "gmlayer",
                left: "0",
                top: "0",
            });
        }

        switch (current.custom) {
            case "PC":
                this.announceTurn("PC", this.getPlayerTokens());
                // _.each(getPlayerTokens(), (value) => {
                //     whisperPlayer(value.get("controlledby"), `[Claim Slot](!turntracker claim ${value.get("id")})`);
                // });
                break;
            case "NPC":
                this.announceTurn("NPC", this.getNpcTokens());
                // let message = "";
                // _.each(getNpcTokens(), (value) => {
                //     message += `[${value.get("name")}](!turntracker claim ${value.get("id")})`;
                // });
                // sendChat("", "/w gm " + message);
                break;
            case "ROUND":
                this.activatedTokens = [];
                current.pr = (parseInt(current.pr, 10) + 1).toString();

                if (state.TurnTracker.statusMarkerOnActed) {
                    // todo not most efficent as its O(n^2) on all tokens
                    _.each(_.union(this.getPlayerTokens(), this.getNpcTokens()), (value) => {
                        value.set("status_" + state.TurnTracker.statusMarkerOnActed, false);
                    });
                }

                sendChat("",
                    "/direct " +
                    "<div style='" +
                    `background: url("http://imgsrv.roll20.net/?src=i.imgur.com/NjP3JsT.png") no-repeat center;` +
                    `font-family: "Teuton Mager","Helvetica Neue",Helvetica,Arial,sans-serif;` +
                    "background-size: contain;" +
                    "font-size: 20px;" +
                    "text-align: center;" +
                    "vertical-align: top;" +
                    "color: white;" +
                    "font-weight: bold;" +
                    "padding: 10px;" +
                    "'>" +
                    "Round " + current.pr +
                    "</div>");

                this.advanceTurnOrder(turnOrder);
                break;
        }
    }

    private startAnimation() {
        this.markerInterval = setInterval(_.bind(this.stepAnimation, this), 100);
    }

    private stepAnimation() {
        if (state.TurnTracker.animationSpeed === 0 || !this.active) {
            return;
        }
        const marker = this.getMarker();
        const rotation = (parseInt(marker.get("rotation"), 10) + state.TurnTracker.animationSpeed) % 360;
        marker.set("rotation", rotation);
    }

    /**
     * Handy function to always return an array when getting the turn order
     * @returns {TurnOrderEntry[]}
     */
    private getTurnOrder(): TurnOrderEntry[] {
        return JSON.parse(Campaign().get("turnorder") || "[]");
    }

    private advanceTurnOrder(turnOrder: TurnOrderEntry[]) {
        Campaign().set("turnorder", JSON.stringify(_.chain(turnOrder).rest().push(turnOrder[0]).value()));
        this.turnOrderChange();
    }

    private whisperPlayer(playerId: string, msg: string) {
        if (playerIsGM(playerId)) sendChat(this.chatName, `/w gm ${msg}`);
        else sendChat(this.chatName, `/w player|${playerId} ${msg}`);
    }

    /* Function Handlers */

    private handleTokenUpdate(obj: Roll20Object) {
        if (this.active && this.currentTokenId === obj.id) {
            const marker = this.getMarker();
            const objTop = parseInt(obj.get("top"), 10);
            const objLeft = parseInt(obj.get("left"), 10);
            const markerTop = parseInt(marker.get("top"), 10);
            const markerLeft = parseInt(marker.get("left"), 10);

            if (objLeft === markerLeft && objTop === markerTop) return;

            clearInterval(this.markerInterval);
            setTimeout(_.bind(this.startAnimation, this), 300); // Add animation delay to prevent visual issues
            const size = Math.max(parseInt(obj.get("height"), 10), parseInt(obj.get("width"), 10));
            marker.set({
                layer: obj.get("layer"),
                top: objTop,
                left: objLeft,
                height: size * state.TurnTracker.trackerSizeRatio,
                width: size * state.TurnTracker.trackerSizeRatio,
            });
        }
    }

    private handleTurnOrderChange(obj: Campaign, prev: {turnorder: string}) {
        const prevOrder = JSON.parse(prev.turnorder);
        const objOrder = JSON.parse(obj.get("turnorder"));

        if (_.isArray(prevOrder) && _.isArray(objOrder) && prevOrder.length && objOrder.length) {
            this.turnOrderChange();
        }
    }

    private handleDestroyGraphic(obj: Roll20Object) {
        if (obj) return;
    }

    private handleInitiativePage(obj: Campaign) {
        if (this.active && obj.get("initiativepage") === false && state.TurnTracker.finishOnClose) {
            this.finish();
        }
    }
}

let TurnTrackerInstance = new TurnTracker();

on("ready", () => {
    TurnTrackerInstance.init();
    TurnTrackerInstance.setupEventHandlers();
});

interface TurnOrderEntry {
    pr: string;
    id: string;
    custom: string;
}

interface TurnTrackerState {
    tokenURL: string;
    clearOnFinish: boolean;
    finishOnClose: boolean;
    trackerSizeRatio: number;
    statusMarkerOnActed: string | boolean;
    animationSpeed: number;
}
