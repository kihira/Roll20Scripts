/* tslint:disable:variable-name */

declare var state: any;

declare function Campaign(): Campaign;
declare function createObj(type: ObjTypes, attributes: object): Roll20Object;
declare function filterObjs(callback: (obj: Roll20Object) => void): Roll20Object[];
declare function findObjs(attributes: object, options?: { caseInsensitive: boolean }): Roll20Object[];
declare function getAllObjs(): Roll20Object[];
declare function getAttrByName(character_id: string, attribute_name: string, value_type?: "current"|"max"): string;
declare function getObj(type: ObjTypes, id: string): Roll20Object;
declare function log(message: any): void;
declare function on(event: "chat:message", callback: (msg: Message) => void): void;
declare function on(event: string, callback: (obj?: any, prev?: any) => void): void;
declare function onSheetWorkerCompleted(callback: () => void): void;
declare function playerIsGM(player_id: string): boolean;
declare function randomInteger(max: number): number;
declare function sendChat(speakingas: string, message: string, callback?: (msg: Message) => void,
                          options?: { noarchive: boolean, use3d: boolean }): void;
declare function sendPing(left: number, top: number, page_id: string, player_id?: string, moveall?: boolean): void;
declare function spawnFx(left: number, top: number, type: FX | string, page_id?: string | undefined): void;
declare function spawnFxBetweenPoints(start: {x: number, y: number}, end: {x: number, y: number}, type: FX | string,
                                      page_id?: string | undefined): void;
declare function spawnFxWithDefinition(left: number, top: number, definition: CustomFX,
                                       page_id?: string | undefined): void;
declare function stopJukeboxPlaylist(): void;
declare function toBack(obj: Roll20Object): void;
declare function toFront(obj: Roll20Object): void;

declare const enum ObjTypes {
    Character = "character",
    Graphic = "graphic",
    Player = "player",
    Path = "path",
    Text = "text",
    Page = "page",
    Campaign = "campaign",
    Macro = "macro",
    RollableTable = "rollabletable",
    TableItem = "tableitem",
    Attribute = "attribute",
    Ability = "ability",
    Handout = "handout",
    Deck = "deck",
    Card = "card",
    Hand = "hand",
    Track = "jukeboxtrack",
    CustomFX = "custfx",
}

declare const enum FX {
    BeamAcid = "beam-acid",
    BeamBlood = "beam-blood",
    BeamCharm = "beam-charm",
    BeamDeath = "beam-death",
    BeamFire = "beam-fire",
    BeamFrost = "beam-frost",
    BeamHoly = "beam-holy",
    BeamMagic = "beam-magic",
    BeamSlime = "beam-slime",
    BeamSmoke = "beam-smoke",
    BeamWater = "beam-water",
    BombAcid = "bomb-acid",
    BombBlood = "bomb-blood",
    BombCharm = "bomb-charm",
    BombDeath = "bomb-death",
    BombFire = "bomb-fire",
    BombFrost = "bomb-frost",
    BombHoly = "bomb-holy",
    BombMagic = "bomb-magic",
    BombSlime = "bomb-slime",
    BombSmoke = "bomb-smoke",
    BombWater = "bomb-water",
    BreathAcid = "breath-acid",
    BreathBlood = "breath-blood",
    BreathCharm = "breath-charm",
    BreathDeath = "breath-death",
    BreathFire = "breath-fire",
    BreathFrost = "breath-frost",
    BreathHoly = "breath-holy",
    BreathMagic = "breath-magic",
    BreathSlime = "breath-slime",
    BreathSmoke = "breath-smoke",
    BreathWater = "breath-water",
    BubblingAcid = "bubbling-acid",
    BubblingBlood = "bubbling-blood",
    BubblingCharm = "bubbling-charm",
    BubblingDeath = "bubbling-death",
    BubblingFire = "bubbling-fire",
    BubblingFrost = "bubbling-frost",
    BubblingHoly = "bubbling-holy",
    BubblingMagic = "bubbling-magic",
    BubblingSlime = "bubbling-slime",
    BubblingSmoke = "bubbling-smoke",
    BubblingWater = "bubbling-water",
    BurnAcid = "burn-acid",
    BurnBlood = "burn-blood",
    BurnCharm = "burn-charm",
    BurnDeath = "burn-death",
    BurnFire = "burn-fire",
    BurnFrost = "burn-frost",
    BurnHoly = "burn-holy",
    BurnMagic = "burn-magic",
    BurnSlime = "burn-slime",
    BurnSmoke = "burn-smoke",
    BurnWater = "burn-water",
    BurstAcid = "burst-acid",
    BurstBlood = "burst-blood",
    BurstCharm = "burst-charm",
    BurstDeath = "burst-death",
    BurstFire = "burst-fire",
    BurstFrost = "burst-frost",
    BurstHoly = "burst-holy",
    BurstMagic = "burst-magic",
    BurstSlime = "burst-slime",
    BurstSmoke = "burst-smoke",
    BurstWater = "burst-water",
    ExplodeAcid = "explode-acid",
    ExplodeBlood = "explode-blood",
    ExplodeCharm = "explode-charm",
    ExplodeDeath = "explode-death",
    ExplodeFire = "explode-fire",
    ExplodeFrost = "explode-frost",
    ExplodeHoly = "explode-holy",
    ExplodeMagic = "explode-magic",
    ExplodeSlime = "explode-slime",
    ExplodeSmoke = "explode-smoke",
    ExplodeWater = "explode-water",
    GlowAcid = "glow-acid",
    GlowBlood = "glow-blood",
    GlowCharm = "glow-charm",
    GlowDeath = "glow-death",
    GlowFire = "glow-fire",
    GlowFrost = "glow-frost",
    GlowHoly = "glow-holy",
    GlowMagic = "glow-magic",
    GlowSlime = "glow-slime",
    GlowSmoke = "glow-smoke",
    GlowWater = "glow-water",
    MissileAcid = "missile-acid",
    MissileBlood = "missile-blood",
    MissileCharm = "missile-charm",
    MissileDeath = "missile-death",
    MissileFire = "missile-fire",
    MissileFrost = "missile-frost",
    MissileHoly = "missile-holy",
    MissileMagic = "missile-magic",
    MissileSlime = "missile-slime",
    MissileSmoke = "missile-smoke",
    MissileWater = "missile-water",
    NovaAcid = "nova-acid",
    NovaBlood = "nova-blood",
    NovaCharm = "nova-charm",
    NovaDeath = "nova-death",
    NovaFire = "nova-fire",
    NovaFrost = "nova-frost",
    NovaHoly = "nova-holy",
    NovaMagic = "nova-magic",
    NovaSlime = "nova-slime",
    NovaSmoke = "nova-smoke",
    NovaWater = "nova-water",
    SplatterAcid = "splatter-acid",
    SplatterBlood = "splatter-blood",
    SplatterCharm = "splatter-charm",
    SplatterDeath = "splatter-death",
    SplatterFire = "splatter-fire",
    SplatterFrost = "splatter-frost",
    SplatterHoly = "splatter-holy",
    SplatterMagic = "splatter-magic",
    SplatterSlime = "splatter-slime",
    SplatterSmoke = "splatter-smoke",
    SplatterWater = "splatter-water",
}

interface Roll20Object {
    id: string;

    /**
     * Asynchronous
     * @param {string} parameter
     * @param callback
     */
    get(parameter: string, callback: (value: string) => void): void;
    get(parameter: string): string;
    remove(): void;
    set(property: string, value: string | number | boolean): void;
    set(attributes: object): void;
}

interface Campaign extends Roll20Object {
    get(parameter: "_id"): "root";
    get(parameter: "_type"): "campaign";
    get(parameter: "initiativepage"): boolean; // Only returns true or false, not what the roll20 wiki says
    get(parameter: "playerpageid"): false | string;
    get(parameter: "playerspecificpages"): false | object;
    get(parameter: "turnorder" | "_journalfolder" | "jukeboxfolder"): string;
}

interface Message {
    who: string;
    playerid: string;
    type: string;
    content: string;
    origRoll?: string;
    inlinerolls?: object[];
    rolltemplate?: string;
    target?: string;
    target_name?: string;
    selected?: Array<{_id: string, _type: string}>;
}

interface CustomFX {
    angle: number;
    duration?: number;
    emissionRate: number;
    gravity: {x: number, y: number};
    lifeSpan: number;
    maxParticles: number;
    size: number;
    speed: number;
    startColour: number[];
    endColour: number[];
    onDeath: string;
    // todo [effect]Random
}
