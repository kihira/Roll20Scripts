/* tslint:disable:variable-name */

declare function on(event: string, callback: (eventInfo: EventInfo) => {}): void;
declare function getAttrs(attributeNameArray: string[], callback: (values: string) => {}): void;
declare function setAttrs(values: object, options?: {silent: boolean}, callback?: () => {}): void;
declare function getSectionIDs(section_name: string, callback: (ids: string[]) => {}): void;
declare function generateRowID(): string;
declare function removeRepeatingRow(rowId: string): void;
declare function getTranslationByKey(key: string): false | string;
declare function getTranslationLanguage(): string;
declare function setDefaultToken(values: string[]): void;

interface EventInfo {
    sourceAttribute: string;
    sourceType: "player" | "scriptworker";
    previousValue?: any;
    newValue?: any;
    removedInfo?: object;
}
