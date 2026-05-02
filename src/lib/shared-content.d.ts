export type SharedContentType = 'article' | 'work' | 'tool' | 'update-log';

export interface SharedContentItem {
    type: SharedContentType;
    date: string;
    title: string;
}

export const CONTENT_TYPES: Readonly<Record<SharedContentType, { label: string; action: string }>>;
export const TYPE_PRIORITY: Readonly<Record<SharedContentType, number>>;
export function parseDateValue(value: string): number;
export function compareContentItems<T extends SharedContentItem>(left: T, right: T): number;
export function isFreshDate(date: string, now?: Date): boolean;
