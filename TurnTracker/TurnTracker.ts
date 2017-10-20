let TurnTracker = (() => { // todo need to check this works as an arrow function
    "use strict";

    let currentTokenId: string;
    let active: boolean;
    let activatedTokens: string[];

    function init() {
        if (state.TurnTracker === undefined) {
            state.TurnTracker = {
                tokenURL: "https://s3.amazonaws.com/files.d20.io/images/4095816/086YSl3v0Kz3SlDAu245Vg/thumb.png?1400535580",
            };
            state.TurnTracker.tokenURL = "https://s3.amazonaws.com/files.d20.io/images/4095816/086YSl3v0Kz3SlDAu245Vg/thumb.png?1400535580";
            state.TurnTracker.tokenName = "Name";
        }

    }

    function handleInput(msg: Message) {
        if (msg.type !== "api" || !msg.content.startsWith("!turntracker")) return;

        const tokenized = msg.content.split(" ");
        const args = _.drop(tokenized, 2);
        switch (tokenized[1]) {
            case "start":
                break;
            case "finish":
                break;
            case "claim":
                if (args.length === 0) sendChat("", "/w player|" + msg.playerid + " Missing token id");
                else claimSlot(msg.playerid, args[0]);
                break;
        }
    }

    function getMarker() {
        let marker = findObjs({type: "graphic", imgsrc: state.TurnTracker.tokenURL})[0];
        if (marker === undefined) {
            marker = createObj(ObjTypes.Graphic, {
                name: state.TurnTracker.tokenName,
                pageid: Campaign().get("playerpageid"),
                layer: "gmlayer",
                imgsrc: state.TurnTracker.tokenURL,
                left: 0,
                right: 0,
                height: 70,
                width: 70,
                bar2_value: 0,
                showplayers_name: true,
                showplayers_aura1: true,
                showplayers_aura2: true,
            });
        }

        return marker;
    }

    // Gets remaining player tokens
    function getPlayerTokens() {
        const currPage = Campaign().get("playerpageid"); // need to use playerpageid as initiativepage returns true or false
        return filterObjs((value) => {
            if (value.get("type") !== "graphic" || value.get("subtype") !== "token") return false;
            if (!value.get("represents") || !value.get("controlledby")) return false;
            return !_.contains(value.get("controlledby").split(","), "all") && !_.contains(activatedTokens, value.get("id")) && value.get("pageid") === currPage;
        });
    }

    // Gets remaining npc tokens
    function getNpcTokens() {
        const currPage = Campaign().get("playerpageid");
        return filterObjs((value) => {
            if (value.get("type") !== "graphic" || value.get("subtype") !== "token") return false;
            if (!value.get("represents") || value.get("controlledby")) return false;
            return !_.contains(activatedTokens, value.get("id")) && value.get("pageid") === currPage;
        });
    }

    function claimSlot(playerId: string, tokenId: string) {
        if (_.contains(activatedTokens, tokenId)) {
            sendChat("", `/w player|${playerId} Cannot claim slot for this token, has already acted`);
            return;
        }
        activatedTokens.push(tokenId);

        // Get tokens and update current token
        const previousToken = getObj(ObjTypes.Graphic, currentTokenId);
        const currentToken = getObj(ObjTypes.Graphic, tokenId);
        currentTokenId = tokenId;

        const pImage = previousToken.get("imgsrc");
        const cImage = currentToken.get("imgsrc");
        const pRatio = parseInt(previousToken.get("width"), 10) / parseInt(previousToken.get("height"), 10);
        const cRatio = parseInt(currentToken.get("width"), 10) / parseInt(currentToken.get("height"), 10);

        let pNameString = "The Previous turn is done.";
        if (previousToken && previousToken.get("showplayers_name")) {
            pNameString = "<span style='" +
                'font-family: Baskerville, "Baskerville Old Face", "Goudy Old Style", Garamond, "Times New Roman", serif;' +
                "text-decoration: underline;" +
                "font-size: 130%;" +
                "'>" +
                previousToken.get("name") +
                "</span>'s turn is done.";
        }

        let cNameString = "The next turn has begun!";
        if (currentToken && currentToken.get("showplayers_name")) {
            cNameString = "<span style='" +
                'font-family: Baskerville, "Baskerville Old Face", "Goudy Old Style", Garamond, "Times New Roman", serif;' +
                "text-decoration: underline;" +
                "font-size: 130%;" +
                "'>" +
                currentToken.get("name") +
                "</span>, it's now your turn!";
        }

        let PlayerAnnounceExtra = '<a style="position:relative;z-index:10000; top:-1em;float: right;font-size: .6em; color: white; border: 1px solid #cccccc; border-radius: 1em; margin: 0 .1em; font-weight: bold; padding: .1em .4em;" href="!eot">EOT &' + "#x21e8;</a>";
        if (state.TurnMarker.announcePlayerInTurnAnnounce) {
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
                                    "font-size: " + state.TurnMarker.announcePlayerInTurnAnnounceSize + ";" +
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
                                        "font-size: " + state.TurnMarker.announcePlayerInTurnAnnounceSize + ";" +
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
        }

        const tokenSize = 70;
        sendChat(
            "",
            "/direct " +
            "<div style='border: 3px solid #808080; background-color: #4B0082; color: white; padding: 1px 1px;'>" +
            '<div style="text-align: left;  margin: 5px 5px;">' +
            '<a style="position:relative;z-index:1000;float:left; background-color:transparent;border:0;padding:0;margin:0;display:block;" href="!tm ping-target ' + previousToken.id + '">' +
            "<img src='" + pImage + "' style='width:" + Math.round(tokenSize * pRatio) + "px; height:" + tokenSize + "px; padding: 0px 2px;' />" +
            "</a>" +
            pNameString +
            "</div>" +
            '<div style="text-align: right; margin: 5px 5px; position: relative; vertical-align: text-bottom;">' +
            '<a style="position:relative;z-index:1000;float:right; background-color:transparent;border:0;padding:0;margin:0;display:block;" href="!tm ping-target ' + currentTokenId + '">' +
            "<img src='" + cImage + "' style='width:" + Math.round(tokenSize * cRatio) + "px; height:" + tokenSize + "px; padding: 0px 2px;' />" +
            "</a>" +
            '<span style="position:absolute; bottom: 0;right:' + Math.round((tokenSize * cRatio) + 6) + 'px;">' +
            cNameString +
            "</span>" +
            '<div style="clear:both;"></div>' +
            "</div>" +
            PlayerAnnounceExtra +
            '<div style="clear:both;"></div>' +
            "</div>",
        );
    }

    function turnOrderChange() {
        if (!Campaign().get("initiativepage")) return;

        const turnOrder: TurnOrderEntry[] = JSON.parse(Campaign().get("turnorder"));
        if (turnOrder.length === 0) return;

        const current: TurnOrderEntry = (_.first(turnOrder) as TurnOrderEntry);

        switch (current.custom) {
            case "PC":
                _.each(getPlayerTokens(), (value) => {
                    sendChat("",
                        `/w player|${value.get("controlledby")} [Claim Slot](!turntracker claim ${value.get("id")})`);
                });
                break;
            case "NPC":
                let message = "";
                _.each(getNpcTokens(), (value) => {
                    message += "[Claim Slot](!turntracker claim " + value.get("id") + ")\n";
                });
                sendChat("", "/w gm " + message);
                break;
            case "ROUND":
                activatedTokens = [];
                current.pr = (parseInt(current.pr, 10) + 1).toString();

                sendChat("", current.pr);

                advanceTurnOrder();
                break;
        }
    }

    function advanceTurnOrder() {
        const turnOrder = JSON.parse(Campaign().get("turnorder"));
        Campaign().set("turnorder", JSON.stringify(_.rest(turnOrder).push((_.first(turnOrder) as TurnOrderEntry))));
        turnOrderChange();
    }

    function checkTokenMove(obj: Roll20Object) {
        if (active && currentTokenId) {
            const marker = getMarker();
            marker.set({
                layer: obj.get("layer"),
                top: obj.get("top"),
                left: obj.get("left"),
            });
        }
    }

    function handleTurnOrderChange(obj: Campaign, prev: {turnorder: string}) {
        const prevOrder = JSON.parse(prev.turnorder);
        const objOrder = JSON.parse(obj.get("turnorder"));

        turnOrderChange();

        if (_.isArray(prevOrder) && _.isArray(objOrder) && prevOrder.length && objOrder.length && objOrder[0].id !== prevOrder[0].id) {
            // turnOrderChange(true);
        }
    }

    function handleDestroyGraphic(obj: Roll20Object) {

    }

    function setupEventHandlers() {
        on("change:campaign:turnorder", handleTurnOrderChange);
        on("destroy:graphic", handleDestroyGraphic);
        on("chat:message", handleInput);
    }

    return {
        Init: init,
        SetupEventHandlers: setupEventHandlers,
    };
})();

on("ready", () => {
    TurnTracker.Init();
    TurnTracker.SetupEventHandlers();
});

on("chat:message", (msg) => {
    if (msg.type === "api" && msg.content === "!tracker sort") {
        sortTracker();
    }
});

function sortTracker() {
    const turnOrder = JSON.parse(Campaign().get("turnorder") || "[]");

    // var roundIndex = _.findIndex(turnOrder, function (value) { return value["custom"].startsWith("ROUND"); });
    // log("Round index: " + roundIndex);

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

interface TurnOrderEntry {
    pr: string;
    id: string;
    custom: string;
}
