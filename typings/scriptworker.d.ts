/* tslint:disable:variable-name */

declare function on(event: string, callback: (eventInfo: EventInfo) => {}): void;
declare function getAttrs(attributeNameArray: string[], callback: (values: string) => void): void;
declare function setAttrs(values: object, options?: {silent: boolean}, callback?: () => void): void;
declare function getSectionIDs(section_name: string, callback: (ids: string[]) => void): void;
declare function generateRowID(): string;
declare function removeRepeatingRow(rowId: string): void;
declare function getTranslationByKey(key: string): false | string;
declare function getTranslationLanguage(): string;
declare function setDefaultToken(values: TokenAttributes): void;

interface EventInfo {
    sourceAttribute: string;
    sourceType: "player" | "scriptworker";
    previousValue?: any;
    newValue?: any;
    removedInfo?: object;
}

interface TokenAttributes {
    bar1_value?: number | string;
    bar1_max?: number | string;
    bar2_value?: number | string;
    bar2_max?: number | string;
    bar3_value?: number | string;
    bar3_max?: number | string;
    aura1_square?: boolean;
    aura1_radius?: number | "";
    aura1_color?: string;
    aura2_square?: boolean;
    aura2_radius?: number | "";
    aura2_color?: string;
    tint_color?: string | "transparent";
    showname?: boolean;
    showplayers_name?: boolean;
    playersedit_name?: boolean;
    showplayers_bar1?: boolean;
    playersedit_bar1?: boolean;
    showplayers_bar2?: boolean;
    playersedit_bar2?: boolean;
    showplayers_bar3?: boolean;
    playersedit_bar3?: boolean;
    showplayers_aura1?: boolean;
    playersedit_aura1?: boolean;
    showplayers_aura2?: boolean;
    playersedit_aura2?: boolean;
    light_radius?: number | "";
    light_dimradius?: number | "";
    light_angle?: number;
    light_otherplayers?: boolean;
    light_haslight?: boolean;
    light_losangle?: boolean;
    light_multiplier?: number;
}
