// Shared across i18n interpolation, MiniSearch query escaping and client-side
// highlight fragments; the String() wrap keeps non-string callers safe.
export function escapeRegExp(value) {
    return String(value).replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}
