declare var state: any;

declare function Campaign(): Campaign;
declare function createObj(type: string, attributes: object): Roll20Object;
declare function filterObjs(callback: (obj: Roll20Object) => {}): Roll20Object[];
declare function findObjs(attributes: object, options?: { caseInsensitive: boolean }): Roll20Object[];
declare function getAllObjs(): Roll20Object[];
declare function getAttrByName(character_id: string, attribute_name: string, value_type: "current"): string;
declare function getObj(type: string, id: string): Roll20Object;
declare function log(message: any): void;
declare function on(event: string, callback: Function): void;
declare function on(event: "chat:message", callback: (msg: Message) => {}): void;
declare function onSheetWorkerCompleted(callback: Function): void;
declare function playerIsGM(player_id: string): boolean;
declare function randomInteger(max: number): number;
declare function sendChat(speakingas: string, message: string, callback?: (msg) => {}, options?: { noarchive: boolean, use3d: boolean }): void;
declare function sendPing(left: number, top: number, page_id: string, player_id?: string, moveall?: boolean): void;
declare function spawnFx(left: number, top: number, type: string, page_id?: string): void;
declare function spawnFxBetweenPoints(start: {x: number, y: number}, end: {x: number, y: number}, type: string, page_id?: string): void;
declare function spawnFxWithDefinition(left: number, top: number, definition: object, page_id?: string): void;
declare function stopJukeboxPlaylist(): void;
declare function toBack(obj: Roll20Object): void;
declare function toFront(obj: Roll20Object): void;

interface Roll20Object {
    id: string;

    get(parameter: string): string;

    /**
     * Asynchronous
     * @param {string} parameter
     * @param {(value: string) => {}} callback
     */
    get(parameter: string, callback: (value: string) => {}): void;
    remove(): void;
    set(property: string, value: string | number | boolean): void;
    set(attributes: object): void;
}

interface Campaign extends Roll20Object {
    get(parameter: "_id"): "root";
    get(parameter: "_type"): "campaign";
    get(parameter: "turnorder"): string;
    get(parameter: "initiativepage"): false | string;
    get(parameter: "playerpageid"): false | string;
    get(parameter: "playerspecificpages"): false | object;
    get(parameter: "_journalfolder"): string;
    get(parameter: "jukeboxfolder"): string;
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
    selected?: {_id: string, _type: string}[];
}

