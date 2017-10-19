const statusMarkers = {
    burn: "half-haze",
    disorient: "screaming",
    prone: "",
    staggered: "back-pain",
    immobilized: "cobweb",
    setback: "",
    advantage: "",
    "guarded-stance": "bolt-shield",
    cover: "white-tower"
};

on("chat:message", function(msg) {
    if (msg.type === "api" && msg.content.startsWith("!sm")) {
        let data = msg.content.split(" ");
        if (data.length !== 3) {
            whisperPlayer(msg.playerid, "Invalid amount of arguments");
            return;
        }
        if (!_.has(statusMarkers, data[1])) {
            sendChat("StatusMarkers", "/w "+msg.playerid+" Invalid status marker");
            return;
        }
        if (msg.selected == null || msg.length === 0) {
            sendChat("StatusMarkers", "/w "+msg.playerid+" Please select a token");
            return;
        }

        let statusMarker = statusMarkers[data[1]];
        let amount = data[2];
        _.each(msg.selected, function (value) {
            if (value._type !== "graphic") {
                whisperPlayer("Can only set status on tokens");
                return;
            }
            let token = getObj("graphic", value._id);
            token.set("status_"+statusMarker, amount);
        });
    }
});

function whisperPlayer(playerId, message) {
    sendChat("StatusMarkers", "/w player|"+playerId+" "+message, null, {noarchive: true});
}