export type SearchEntryType = 'blog' | 'works' | 'tools' | 'updates' | 'article' | 'work' | 'tool' | 'update-log';

export interface SearchEntry {
    id: string;
    type: SearchEntryType;
    title: string;
    excerpt: string;
    category: string;
    tags: string[];
    date: string;
    filePath: string;
    typeLabel: string;
    readingStats?: {
        wordCountDisplay: string;
        readTimeDisplay: string;
    };
}
